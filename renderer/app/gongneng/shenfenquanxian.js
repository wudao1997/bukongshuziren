// 身份权限工具：统一负责身份权限云对象调用、权限结构标准化与前端权限判断。
function normalizeText(v) {
  return String(v || "").trim();
}

function normalizeBool(v, fallback = true) {
  return typeof v === "boolean" ? v : fallback;
}

export function isSuperAdminIdentity(identity) {
  const normalized = normalizeText(identity).toLowerCase();
  return normalized === "超级管理员" || normalized === "super_admin" || normalized === "super-admin" || normalized === "superadmin" || normalized.includes("超级管理员");
}

export function normalizeCloudBaseDomain(domain) {
  const raw = normalizeText(domain).replace(/\/+$/, "");
  if (!raw) return "";
  let input = raw;
  if (!/^https?:\/\//i.test(input)) input = `https://${input.replace(/^\/+/, "")}`;
  try {
    const u = new URL(input);
    if (u.protocol === "http:" && /bspapp\.com$/i.test(u.hostname)) u.protocol = "https:";
    return `${u.protocol}//${u.host}`;
  } catch {
    return "";
  }
}

export function buildCloudMethodUrl(baseUrl, methodName) {
  const baseRaw = normalizeText(baseUrl);
  const method = normalizeText(methodName).replace(/^\/+/, "");
  if (!baseRaw || !method) return "";
  try {
    const u = new URL(baseRaw);
    const p = String(u.pathname || "").replace(/\/+$/, "");
    if (!p || p === "/") return "";
    const want = `/${method}`;
    if (p.toLowerCase().endsWith(want.toLowerCase())) return u.toString();
    u.pathname = `${p}${want}`;
    return u.toString();
  } catch {
    const base = baseRaw.replace(/\/+$/, "");
    if (!base) return "";
    return base.toLowerCase().endsWith(`/${method}`.toLowerCase()) ? base : `${base}/${method}`;
  }
}

function normalizePermissionList(items = []) {
  const list = Array.isArray(items) ? items : [];
  return list
    .map((item) => ({
      key: normalizeText(item?.key),
      label: normalizeText(item?.label),
      enabled: normalizeBool(item?.enabled, true)
    }))
    .filter((item) => item.key);
}

function permissionListToMap(items = []) {
  return normalizePermissionList(items).reduce((acc, item) => {
    acc[item.key] = item.enabled !== false;
    return acc;
  }, {});
}

function normalizeMenuItemsFromSource(input) {
  if (Array.isArray(input)) {
    return input
      .map((item) => {
        if (typeof item === "string") {
          const key = normalizeText(item);
          return key ? { key, label: key, enabled: true } : null;
        }
        const key = normalizeText(item?.key || item?.name || item?.path);
        if (!key) return null;
        return {
          key,
          label: normalizeText(item?.label || item?.title || key),
          enabled: normalizeBool(item?.enabled, true)
        };
      })
      .filter(Boolean);
  }
  if (input && typeof input === "object") {
    return Object.entries(input)
      .map(([key, value]) => {
        const normalizedKey = normalizeText(key);
        if (!normalizedKey) return null;
        return {
          key: normalizedKey,
          label: normalizedKey,
          enabled: normalizeBool(value, true)
        };
      })
      .filter(Boolean);
  }
  return [];
}

export function normalizeIdentityAccessDoc(doc = {}, fallbackIdentity = "普通用户") {
  const src = doc && typeof doc === "object" ? doc : {};
  const identityName = normalizeText(src.identityName) || normalizeText(fallbackIdentity) || "普通用户";
  const identityKey = normalizeText(src.identityKey) || identityName;
  const menus = normalizePermissionList(src.menus);
  const areas = normalizePermissionList(src.areas);
  const features = normalizePermissionList(src.features);
  const dataScopes = normalizePermissionList(src.dataScopes);
  const operations = normalizePermissionList(src.operations);
  return {
    scene: normalizeText(src.scene) || "desktop",
    identityKey,
    identityName,
    identityDesc: normalizeText(src.identityDesc),
    enabled: normalizeBool(src.enabled, true),
    sort: Number(src.sort || 0) || 0,
    menus,
    areas,
    features,
    dataScopes,
    operations,
    menusMap: permissionListToMap(menus),
    areasMap: permissionListToMap(areas),
    featuresMap: permissionListToMap(features),
    dataScopesMap: permissionListToMap(dataScopes),
    operationsMap: permissionListToMap(operations),
    limits: src?.limits && typeof src.limits === "object" ? src.limits : {},
    updatedAt: src?.updatedAt || null,
    raw: src
  };
}

export function buildIdentityAccessFromProfile(profile = {}, fallbackIdentity = "普通用户") {
  const src = profile && typeof profile === "object" ? profile : {};
  const menus =
    normalizeMenuItemsFromSource(src.effectiveMenus).length
      ? normalizeMenuItemsFromSource(src.effectiveMenus)
      : normalizeMenuItemsFromSource(src.roleMenus).length
        ? normalizeMenuItemsFromSource(src.roleMenus)
        : normalizeMenuItemsFromSource(src.globalMenus);
  return normalizeIdentityAccessDoc(
    {
      scene: "desktop",
      identityKey: normalizeText(src.rolePermissionId) || normalizeText(src.identity) || normalizeText(fallbackIdentity),
      identityName: normalizeText(src.identity) || normalizeText(fallbackIdentity) || "普通用户",
      menus,
      updatedAt: new Date().toISOString(),
      source: "profile-fallback"
    },
    fallbackIdentity
  );
}

export function getIdentityPermissionValue(access, category, key) {
  const accessObj = access && typeof access === "object" ? access : {};
  const map = accessObj?.[`${normalizeText(category)}Map`];
  const permKey = normalizeText(key);
  if (!permKey || !map || typeof map !== "object") return undefined;
  if (!Object.prototype.hasOwnProperty.call(map, permKey)) return undefined;
  return map[permKey] !== false;
}

export function isIdentityKeyAllowed(access, key, categories = []) {
  const accessObj = access && typeof access === "object" ? access : {};
  const normalizedKey = normalizeText(key);
  const list = Array.isArray(categories) ? categories : [categories];
  if (!normalizedKey || !list.length) return true;
  for (const category of list) {
    const value = getIdentityPermissionValue(accessObj, category, normalizedKey);
    if (value === false) return false;
  }
  return true;
}

export async function fetchIdentityAccess({ account, userId, deviceId, identity, scene = "desktop" } = {}) {
  try {
    const domainRes = await window.api?.domain?.read?.();
    const baseDomain = normalizeCloudBaseDomain(domainRes?.domain);
    const url = buildCloudMethodUrl(`${baseDomain}/qd-shenfenguanli`, "getIdentityAccess");
    if (!url) return { ok: false, errMsg: "未配置身份管理云对象URL" };
    const res = await window.api?.cloudAuth?.getIdentityConfig?.({
      url,
      token: "",
      body: {
        scene: normalizeText(scene) || "desktop",
        account: normalizeText(account),
        userId: normalizeText(userId),
        deviceId: normalizeText(deviceId),
        identity: normalizeText(identity) || "普通用户"
      }
    });
    if (!res || res.ok !== true) return { ok: false, errMsg: normalizeText(res?.errMsg || res?.message || "身份权限同步失败"), raw: res };
    const access = normalizeIdentityAccessDoc(res?.access || {}, normalizeText(identity) || "普通用户");
    return {
      ok: true,
      scene: normalizeText(res?.scene) || normalizeText(scene) || "desktop",
      matched: res?.matched !== false,
      access,
      raw: res
    };
  } catch (e) {
    return { ok: false, errMsg: normalizeText(e?.message || e) || "身份权限同步失败" };
  }
}
