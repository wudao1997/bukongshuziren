// 模板云同步工具：统一负责字幕模板/封面模板的云端读取、上传、缓存与本地合并。

import { buildCloudMethodUrl, isSuperAdminIdentity, normalizeCloudBaseDomain } from "./shenfenquanxian.js";

const TEMPLATE_CLOUD_TYPES = {
  subtitle: {
    objectName: "qd-zimumuban",
    cacheKey: "ipfactory.template.cloud.subtitle.v1",
    eventName: "ipfactory:subtitleTemplatesChanged"
  },
  cover: {
    objectName: "qd-fengmianmuban",
    cacheKey: "ipfactory.template.cloud.cover.v1",
    eventName: "ipfactory:coverTemplatesChanged"
  }
};

function normalizeText(value) {
  return String(value || "").trim();
}

function pickBestIdentity(...values) {
  const candidates = values.map((item) => normalizeText(item)).filter(Boolean);
  return candidates.find((item) => isSuperAdminIdentity(item)) || candidates[0] || "";
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeNameKey(value) {
  return normalizeText(value).replace(/\s+/g, " ").toLowerCase();
}

function buildFallbackTemplateId(type, template = {}) {
  const prefix = normalizeText(type) || "template";
  const baseName = normalizeText(template?.name || template?.templateName)
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return `${prefix}_${baseName || Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
}

function isReservedSystemTemplateId(type, value) {
  const normalized = normalizeText(value);
  if (!normalized) return false;
  return normalized === "system" || normalized === `${normalizeText(type)}_system`;
}

function getStableTemplateId(template = {}) {
  const source = normalizeText(template?.templateSource || template?.source);
  const rawId = normalizeText(template?.id);
  if (source === "cloud" && rawId.startsWith("cloud:")) {
    return normalizeText(template?.cloudTemplateId || template?.templateId);
  }
  return normalizeText(template?.cloudTemplateId || template?.templateId || rawId);
}

function buildCloudViewId(template = {}) {
  const stableId = getStableTemplateId(template);
  return stableId ? `cloud:${stableId}` : `cloud:${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
}

export function ensureTemplateCloudIdentity(type, template = {}) {
  const normalized = normalizeTemplateRecord(template, normalizeText(template?.id) === "system" ? "system" : "local");
  const stableId = getStableTemplateId(normalized);
  const ensuredId =
    stableId && !isReservedSystemTemplateId(type, stableId)
      ? stableId
      : buildFallbackTemplateId(type, {
          ...normalized,
          id: "",
          templateId: "",
          cloudTemplateId: ""
        });
  return {
    ...normalized,
    id: ensuredId,
    templateId: ensuredId,
    cloudTemplateId: ensuredId,
    updatedAt: Number(normalized.updatedAt || Date.now()) || Date.now()
  };
}

export function findCloudTemplateNameConflict(templates = [], template = {}, excludeTemplateId = "") {
  const wantedName = normalizeNameKey(template?.name || template?.templateName);
  if (!wantedName) return null;
  const excludeId = normalizeText(excludeTemplateId || template?.cloudTemplateId || template?.templateId || template?.id);
  return (Array.isArray(templates) ? templates : []).find((item) => {
    const itemId = normalizeText(item?.cloudTemplateId || item?.templateId || item?.id);
    if (excludeId && itemId && itemId === excludeId) return false;
    return normalizeNameKey(item?.name || item?.templateName) === wantedName;
  }) || null;
}

export function buildUniqueCloudTemplateName(templates = [], preferredName = "", fallbackPrefix = "模板") {
  const base = normalizeText(preferredName) || `${normalizeText(fallbackPrefix) || "模板"}_${new Date().toISOString().slice(0, 19).replace(/[-:T]/g, "")}`;
  const exists = new Set((Array.isArray(templates) ? templates : []).map((item) => normalizeNameKey(item?.name || item?.templateName)).filter(Boolean));
  if (!exists.has(normalizeNameKey(base))) return base;
  let idx = 2;
  while (idx < 9999) {
    const next = `${base}（${idx}）`;
    if (!exists.has(normalizeNameKey(next))) return next;
    idx += 1;
  }
  return `${base}_${Date.now()}`;
}

function readAuthUser() {
  try {
    const raw = localStorage.getItem("auth.user");
    const parsed = JSON.parse(raw || "{}");
    const auth = parsed && typeof parsed === "object" ? parsed : {};
    const identityFromAccess = pickBestIdentity(
      auth?.identityAccess?.identityName,
      auth?.identityAccess?.identityKey,
      auth?.identityName,
      auth?.identityKey,
      auth?.roleName,
      auth?.identity
    );
    return {
      ...auth,
      identity: identityFromAccess || "",
      identityName: pickBestIdentity(auth?.identityName, auth?.identityAccess?.identityName, auth?.identityAccess?.identityKey, auth?.identityKey, auth?.roleName, auth?.identity),
      identityKey: normalizeText(auth?.identityAccess?.identityKey) || normalizeText(auth?.identityKey) || "",
      roleName: normalizeText(auth?.roleName) || ""
    };
  } catch {
    return {};
  }
}

function getTemplateTypeMeta(type) {
  const key = normalizeText(type);
  return TEMPLATE_CLOUD_TYPES[key] || null;
}

function normalizeTemplateRecord(template = {}, fallbackSource = "local") {
  const src = template && typeof template === "object" ? template : {};
  const templateSource = normalizeText(src.templateSource) || normalizeText(src.source) || fallbackSource;
  return {
    ...src,
    id: normalizeText(src.id || src.templateId),
    name: normalizeText(src.name || src.templateName) || "未命名模板",
    templateSource: templateSource || "local",
    cloudId: normalizeText(src.cloudId || src._id),
    cloudTemplateId: normalizeText(src.cloudTemplateId || src.templateId || src.id),
    cloudUpdatedAt: src.cloudUpdatedAt || src.updatedAt || null,
    updatedAt: Number(src.updatedAt || 0) || Date.now()
  };
}

function normalizeCloudTemplateDoc(doc = {}) {
  const src = doc && typeof doc === "object" ? doc : {};
  const templateData = src.templateData && typeof src.templateData === "object" ? src.templateData : {};
  return normalizeTemplateRecord(
    {
      ...templateData,
      id: normalizeText(src.templateId || templateData.id || src._id),
      name: normalizeText(src.templateName || templateData.name),
      templateSource: "cloud",
      cloudId: normalizeText(src._id),
      cloudTemplateId: normalizeText(src.templateId || templateData.id || src._id),
      cloudUpdatedAt: src.updatedAt || templateData.updatedAt || null,
      updatedAt: Number(templateData.updatedAt || Date.now()) || Date.now()
    },
    "cloud"
  );
}

export function getTemplateCloudCache(type) {
  const meta = getTemplateTypeMeta(type);
  if (!meta) return { templates: [], updatedAt: "" };
  try {
    const raw = localStorage.getItem(meta.cacheKey);
    const parsed = JSON.parse(raw || "{}");
    const templates = Array.isArray(parsed?.templates) ? parsed.templates.map((item) => normalizeTemplateRecord(item, "cloud")).filter((item) => item.id) : [];
    return {
      templates,
      updatedAt: normalizeText(parsed?.updatedAt)
    };
  } catch {
    return { templates: [], updatedAt: "" };
  }
}

export function setTemplateCloudCache(type, templates = [], updatedAt = "") {
  const meta = getTemplateTypeMeta(type);
  if (!meta) return { ok: false, message: "unknown template type" };
  try {
    const next = {
      templates: (Array.isArray(templates) ? templates : []).map((item) => normalizeTemplateRecord(item, "cloud")).filter((item) => item.id),
      updatedAt: normalizeText(updatedAt) || nowIso()
    };
    localStorage.setItem(meta.cacheKey, JSON.stringify(next, null, 2));
    try {
      window.dispatchEvent(new CustomEvent(meta.eventName));
    } catch {}
    return { ok: true, ...next };
  } catch (e) {
    return { ok: false, message: String(e?.message || e) };
  }
}

export function mergeTemplateCollections(localTemplates = [], cloudTemplates = []) {
  const localList = (Array.isArray(localTemplates) ? localTemplates : []).map((item) =>
    normalizeTemplateRecord(item, normalizeText(item?.id) === "system" ? "system" : "local")
  );
  const cloudList = (Array.isArray(cloudTemplates) ? cloudTemplates : []).map((item) => normalizeTemplateRecord(item, "cloud"));

  const system = localList.find((item) => item.id === "system") || null;
  const localNonSystem = localList.filter((item) => item.id && item.id !== "system");
  const seenCloud = new Set();
  const mergedCloud = cloudList
    .filter((item) => {
      const stableId = getStableTemplateId(item);
      if (!stableId || stableId === "system" || seenCloud.has(stableId)) return false;
      seenCloud.add(stableId);
      return true;
    })
    .map((item) => ({
      ...item,
      id: buildCloudViewId(item),
      templateSource: "cloud",
      source: "cloud"
    }));

  const templates = [];
  if (system) templates.push(system);
  templates.push(...mergedCloud, ...localNonSystem);
  return templates;
}

export function splitTemplatesBySource(templates = []) {
  const localTemplates = [];
  const cloudTemplates = [];
  const systemTemplates = [];
  (Array.isArray(templates) ? templates : []).forEach((item) => {
    const source = normalizeText(item?.templateSource || item?.source || (item?.id === "system" ? "system" : "local"));
    if (source === "cloud") cloudTemplates.push(item);
    else if (source === "system") systemTemplates.push(item);
    else localTemplates.push(item);
  });
  return { systemTemplates, cloudTemplates, localTemplates };
}

async function resolveCloudMethodUrl(type, methodName) {
  const meta = getTemplateTypeMeta(type);
  if (!meta) return "";
  const domainRes = await window.api?.domain?.read?.();
  const baseDomain = normalizeCloudBaseDomain(domainRes?.domain);
  if (!baseDomain) return "";
  return buildCloudMethodUrl(`${baseDomain}/${meta.objectName}`, methodName);
}

export async function fetchCloudTemplates(type) {
  const url = await resolveCloudMethodUrl(type, "listLatest");
  if (!url) return { ok: false, errMsg: "未配置模板云对象域名" };
  const res = await window.api?.cloudTemplate?.list?.({
    url,
    body: { scene: "desktop", templateType: normalizeText(type) }
  });
  if (!res?.ok) return { ok: false, errMsg: normalizeText(res?.errMsg || res?.message || "模板云端同步失败") };
  const templates = Array.isArray(res?.templates) ? res.templates.map((item) => normalizeCloudTemplateDoc(item)).filter((item) => item.id) : [];
  const cacheRes = setTemplateCloudCache(type, templates, normalizeText(res?.updatedAt));
  return {
    ok: true,
    templates,
    updatedAt: cacheRes?.updatedAt || normalizeText(res?.updatedAt),
    cacheUpdated: cacheRes?.ok === true
  };
}

export async function uploadTemplateToCloud(type, template, options = {}) {
  const auth = readAuthUser();
  if (!isSuperAdminIdentity(auth?.identity)) {
    return { ok: false, errMsg: "只有超级管理员可以上传模板到云端" };
  }
  const url = await resolveCloudMethodUrl(type, "upsertTemplate");
  if (!url) return { ok: false, errMsg: "未配置模板云对象域名" };
  const normalized = ensureTemplateCloudIdentity(type, template);
  const forcedName = normalizeText(options?.templateName);
  const forcedCloudId = normalizeText(options?.cloudTemplateId);
  const overwriteByName = options?.overwriteByName === true;
  const ensuredId = forcedCloudId || normalizeText(normalized.cloudTemplateId || normalized.templateId || normalized.id) || buildFallbackTemplateId(type, normalized);
  const payload = {
    scene: "desktop",
    templateType: normalizeText(type),
    account: normalizeText(auth?.account),
    userId: normalizeText(auth?.userId),
    identity: normalizeText(auth?.identity),
    identityName: normalizeText(auth?.identityName || auth?.identity),
    identityKey: normalizeText(auth?.identityKey),
    roleName: normalizeText(auth?.roleName),
    operatorIdentity: normalizeText(auth?.identityName || auth?.identity || auth?.identityKey),
    overwriteByName,
    identityAccess: auth?.identityAccess && typeof auth.identityAccess === "object" ? auth.identityAccess : undefined,
    template: {
      ...normalized,
      id: ensuredId,
      name: forcedName || normalizeText(normalized.name) || "未命名模板",
      templateName: forcedName || normalizeText(normalized.name) || "未命名模板",
      templateId: ensuredId,
      templateSource: normalizeText(normalized.templateSource) || "local",
      cloudId: normalizeText(normalized.cloudId),
      cloudTemplateId: ensuredId,
      identity: normalizeText(auth?.identity),
      identityName: normalizeText(auth?.identityName || auth?.identity),
      identityKey: normalizeText(auth?.identityKey),
      roleName: normalizeText(auth?.roleName),
      identityAccess: auth?.identityAccess && typeof auth.identityAccess === "object" ? auth.identityAccess : undefined,
      updatedAt: Number(normalized.updatedAt || Date.now()) || Date.now()
    }
  };
  const res = await window.api?.cloudTemplate?.upsert?.({ url, body: payload });
  if (!res?.ok) {
    return {
      ok: false,
      errCode: normalizeText(res?.errCode),
      errMsg: normalizeText(res?.errMsg || res?.message || "模板上传失败"),
      existingTemplate: res?.existingTemplate || null
    };
  }
  await fetchCloudTemplates(type);
  const serverTemplateId = normalizeText(res?.templateId || ensuredId) || ensuredId;
  return {
    ...res,
    template: {
      ...normalized,
      id: serverTemplateId,
      name: forcedName || normalizeText(normalized.name) || "未命名模板",
      templateId: serverTemplateId,
      cloudTemplateId: serverTemplateId
    },
    templateId: serverTemplateId
  };
}

export async function deleteTemplateFromCloud(type, template = {}) {
  const auth = readAuthUser();
  if (!isSuperAdminIdentity(auth?.identity)) {
    return { ok: false, errMsg: "只有超级管理员可以删除云端模板" };
  }
  const url = await resolveCloudMethodUrl(type, "deleteTemplate");
  if (!url) return { ok: false, errMsg: "未配置模板云对象域名" };
  const normalized = normalizeTemplateRecord(template, "cloud");
  const payload = {
    scene: "desktop",
    templateType: normalizeText(type),
    account: normalizeText(auth?.account),
    userId: normalizeText(auth?.userId),
    identity: normalizeText(auth?.identity),
    identityName: normalizeText(auth?.identityName || auth?.identity),
    identityKey: normalizeText(auth?.identityKey),
    roleName: normalizeText(auth?.roleName),
    operatorIdentity: normalizeText(auth?.identityName || auth?.identity || auth?.identityKey),
    identityAccess: auth?.identityAccess && typeof auth.identityAccess === "object" ? auth.identityAccess : undefined,
    templateId: getStableTemplateId(normalized),
    cloudTemplateId: normalizeText(normalized.cloudTemplateId),
    cloudId: normalizeText(normalized.cloudId)
  };
  if (!payload.templateId && !payload.cloudId) {
    return { ok: false, errMsg: "缺少云端模板ID，无法删除。" };
  }
  const res = await window.api?.cloudTemplate?.delete?.({ url, body: payload });
  if (!res?.ok) {
    return {
      ok: false,
      errCode: normalizeText(res?.errCode),
      errMsg: normalizeText(res?.errMsg || res?.message || "删除云端模板失败")
    };
  }
  await fetchCloudTemplates(type);
  return res;
}

export function canUploadTemplateByIdentity() {
  const auth = readAuthUser();
  return isSuperAdminIdentity(auth?.identity);
}
