const REGISTER_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const REGISTER_LIMIT_MAX = 5;
const REGISTER_LIMIT_STORE_KEY = "ipfactory.register.limit.v1";
const REGISTER_IP_CACHE_KEY = "ipfactory.register.ip.v1";
const REGISTER_IP_CACHE_MS = 5 * 60 * 1000;

function normalizeText(v) {
  return String(v || "").trim();
}

function readJsonStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function writeJsonStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value || {}, null, 2));
  } catch {}
}

function buildLimitKey(deviceId, ip) {
  const device = normalizeText(deviceId);
  const clientIp = normalizeText(ip) || "unknown";
  return device && clientIp ? `${device}::${clientIp}` : "";
}

function pruneAttempts(list, now) {
  const baseNow = Number(now || Date.now()) || Date.now();
  return (Array.isArray(list) ? list : [])
    .map((x) => Number(x || 0))
    .filter((ts) => Number.isFinite(ts) && ts > 0 && baseNow - ts < REGISTER_LIMIT_WINDOW_MS);
}

function readLimiterStore(now = Date.now()) {
  const store = readJsonStorage(REGISTER_LIMIT_STORE_KEY, {});
  const cleaned = {};
  Object.entries(store || {}).forEach(([key, value]) => {
    const next = pruneAttempts(value, now);
    if (next.length) cleaned[key] = next;
  });
  if (JSON.stringify(cleaned) !== JSON.stringify(store || {})) writeJsonStorage(REGISTER_LIMIT_STORE_KEY, cleaned);
  return cleaned;
}

function writeLimiterStore(store) {
  writeJsonStorage(REGISTER_LIMIT_STORE_KEY, store || {});
}

async function requestPublicIp(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`ip http ${res.status}`);
  const data = await res.json();
  return normalizeText(data?.ip || data?.query || "");
}

export async function getRegisterLimiterIp() {
  const now = Date.now();
  const cached = readJsonStorage(REGISTER_IP_CACHE_KEY, {});
  const cachedIp = normalizeText(cached?.ip);
  const cachedAt = Number(cached?.cachedAt || 0) || 0;
  if (cachedIp && now - cachedAt < REGISTER_IP_CACHE_MS) return cachedIp;

  const candidates = [
    "https://api64.ipify.org?format=json",
    "https://api.ipify.org?format=json",
    "https://ipv4.jsonip.com"
  ];

  for (const url of candidates) {
    try {
      const ip = await requestPublicIp(url);
      if (!ip) continue;
      writeJsonStorage(REGISTER_IP_CACHE_KEY, { ip, cachedAt: now });
      return ip;
    } catch {}
  }
  return "";
}

export function checkRegisterLimit({ deviceId, ip, now = Date.now() } = {}) {
  const key = buildLimitKey(deviceId, ip);
  if (!key) {
    return { ok: false, errMsg: "无法获取注册限制标识" };
  }
  const store = readLimiterStore(now);
  const attempts = pruneAttempts(store[key], now);
  const remaining = Math.max(0, REGISTER_LIMIT_MAX - attempts.length);
  if (attempts.length >= REGISTER_LIMIT_MAX) {
    const oldest = attempts[0] || now;
    const retryAfterMs = Math.max(0, REGISTER_LIMIT_WINDOW_MS - (Number(now) - oldest));
    return {
      ok: false,
      errCode: "REGISTER_TOO_FREQUENT",
      errMsg: "操作过于频繁，请稍后再试",
      retryAfterMs,
      attempts: attempts.length,
      remaining: 0
    };
  }
  return {
    ok: true,
    attempts: attempts.length,
    remaining
  };
}

export function recordRegisterAttempt({ deviceId, ip, now = Date.now() } = {}) {
  const key = buildLimitKey(deviceId, ip);
  if (!key) return { ok: false, errMsg: "无法记录注册次数" };
  const store = readLimiterStore(now);
  const attempts = pruneAttempts(store[key], now);
  attempts.push(Number(now) || Date.now());
  store[key] = attempts;
  writeLimiterStore(store);
  return {
    ok: true,
    attempts: attempts.length,
    remaining: Math.max(0, REGISTER_LIMIT_MAX - attempts.length)
  };
}
