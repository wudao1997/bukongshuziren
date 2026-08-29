const QUEUE_KEY = "ipfactory.user.analytics.queue";
const SESSION_KEY = "ipfactory.user.analytics.sessionId";

let flushingPromise = null;

function normalizeText(v) {
  return String(v || "").trim();
}

function normalizeNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function buildCloudMethodUrl(baseUrl, methodName) {
  const baseRaw = normalizeText(baseUrl);
  const method = normalizeText(methodName).replace(/^\/+/, "");
  if (!baseRaw || !method) return "";
  try {
    const u = new URL(baseRaw);
    const p = String(u.pathname || "")
      .replace(/\/+$/, "")
      .replace(/^\/+/, "/");
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

function readAuth() {
  try {
    const raw = localStorage.getItem("auth.user");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function getSessionId() {
  try {
    const cached = normalizeText(sessionStorage.getItem(SESSION_KEY));
    if (cached) return cached;
    const created = `analytics_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
    sessionStorage.setItem(SESSION_KEY, created);
    return created;
  } catch {
    return `analytics_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
  }
}

function readQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(list) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(Array.isArray(list) ? list : []));
  } catch {}
}

function cloneSafeObject(obj) {
  try {
    return JSON.parse(JSON.stringify(obj && typeof obj === "object" ? obj : {}));
  } catch {
    return {};
  }
}

function normalizeUsage(usage = {}) {
  const source = usage && typeof usage === "object" ? usage : {};
  return {
    totalTokens: normalizeNumber(source.totalTokens, 0),
    promptTokens: normalizeNumber(source.promptTokens, 0),
    completionTokens: normalizeNumber(source.completionTokens, 0),
    cachedTokens: normalizeNumber(source.cachedTokens, 0),
    reasoningTokens: normalizeNumber(source.reasoningTokens, 0),
    characters: normalizeNumber(source.characters, 0)
  };
}

function normalizeEventPayload(event = {}) {
  const auth = readAuth() || {};
  const createdAt = normalizeText(event.createdAt) || new Date().toISOString();
  return {
    scene: normalizeText(event.scene) || "desktop",
    eventType: normalizeText(event.eventType) || "unknown",
    featureName: normalizeText(event.featureName),
    moduleKey: normalizeText(event.moduleKey),
    moduleLabel: normalizeText(event.moduleLabel),
    source: normalizeText(event.source),
    providerId: normalizeText(event.providerId),
    providerLabel: normalizeText(event.providerLabel),
    modelId: normalizeText(event.modelId),
    modelLabel: normalizeText(event.modelLabel),
    endpoint: normalizeText(event.endpoint),
    success: event.success !== false,
    elapsedMs: normalizeNumber(event.elapsedMs, 0),
    requestId: normalizeText(event.requestId),
    errorMessage: normalizeText(event.errorMessage),
    account: normalizeText(event.account || auth?.account),
    userId: normalizeText(event.userId || auth?.userId),
    deviceId: normalizeText(event.deviceId || auth?.deviceId),
    sessionId: normalizeText(event.sessionId) || getSessionId(),
    abilities: Array.from(new Set((Array.isArray(event.abilities) ? event.abilities : []).map((item) => normalizeText(item)).filter(Boolean))),
    usage: normalizeUsage(event.usage),
    client: {
      productName: "IP数字人内容生成",
      runtime: "electron-desktop",
      language: normalizeText(navigator?.language),
      userAgent: normalizeText(navigator?.userAgent)
    },
    extra: cloneSafeObject(event.extra),
    createdAt
  };
}

async function resolveReportUrl() {
  try {
    const domainRes = await window.api?.domain?.read?.();
    const baseDomain = normalizeText(domainRes?.domain).replace(/\/+$/, "");
    if (!baseDomain) return "";
    return buildCloudMethodUrl(`${baseDomain}/qd-yonghushujutongji`, "report");
  } catch {
    return "";
  }
}

export async function flushUserUsageQueue() {
  if (flushingPromise) return flushingPromise;
  flushingPromise = (async () => {
    const url = await resolveReportUrl();
    if (!url) return { ok: false, message: "未配置统计云对象地址" };
    let queue = readQueue();
    if (!queue.length) return { ok: true, count: 0 };
    let sent = 0;
    while (queue.length) {
      const batch = queue.slice(0, 20);
      const res = await window.api?.cloudAuth?.getMenuConfig?.({
        url,
        token: "",
        body: { events: batch }
      });
      if (!res?.ok) return { ok: false, count: sent, message: normalizeText(res?.errMsg || res?.message || "统计上报失败") };
      queue = queue.slice(batch.length);
      writeQueue(queue);
      sent += batch.length;
    }
    return { ok: true, count: sent };
  })().finally(() => {
    flushingPromise = null;
  });
  return flushingPromise;
}

export async function reportUserUsage(event = {}) {
  const normalized = normalizeEventPayload(event);
  const next = [normalized, ...readQueue()].slice(0, 500);
  writeQueue(next);
  return await flushUserUsageQueue();
}
