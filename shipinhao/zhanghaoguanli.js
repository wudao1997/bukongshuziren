"use strict";

// 视频号账号管理模块：
// 1. 统一维护视频号 auth_data 响应解析逻辑。
// 2. 统一维护扫码登录成功后的账号资料提取逻辑。
// 3. 对外提供基于 CDP 监听和 Cookie 请求的登录成功判断能力。

const http = require("http");
const https = require("https");

const SHIPINHAO_HOME_URL = "https://channels.weixin.qq.com/";
const SHIPINHAO_AUTH_DATA_URL_PREFIX = "https://channels.weixin.qq.com/cgi-bin/mmfinderassistant-bin/auth/auth_data";

function cleanText(v) {
  return String(v == null ? "" : v).trim();
}

function toSafeNumber(v) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function normalizeRemoteImageUrl(raw) {
  try {
    let s = cleanText(raw);
    if (!s) return "";
    s = s.replace(/^["'`]+|["'`]+$/g, "").trim();
    s = s.replace(/&amp;/gi, "&");
    if (!s) return "";
    if (s.startsWith("//")) s = `https:${s}`;
    if (/^https?:\/\//i.test(s)) return s;
    const m = s.match(/https?:\/\/[^\s"'`<>]+/i);
    return m ? cleanText(m[0]) : "";
  } catch {
    return "";
  }
}

function parseJsonLoose(raw) {
  const text = cleanText(raw);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {}
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

function walkFindObject(root, predicate, depth = 0, seen = new Set()) {
  if (!root || typeof root !== "object" || depth > 8 || seen.has(root)) return null;
  seen.add(root);
  try {
    if (predicate(root)) return root;
  } catch {}
  if (Array.isArray(root)) {
    for (const item of root) {
      const hit = walkFindObject(item, predicate, depth + 1, seen);
      if (hit) return hit;
    }
    return null;
  }
  for (const key of Object.keys(root)) {
    const hit = walkFindObject(root[key], predicate, depth + 1, seen);
    if (hit) return hit;
  }
  return null;
}

function extractShipinhaoProfileFromAuthDataJson(parsed) {
  const root = parsed && typeof parsed === "object" ? parsed : null;
  const holder =
    walkFindObject(root, (obj) => obj && typeof obj === "object" && obj.finderUser && typeof obj.finderUser === "object") || null;
  const finderUser = holder && holder.finderUser && typeof holder.finderUser === "object" ? holder.finderUser : null;
  const nickname = cleanText(finderUser?.nickname);
  const uniqId = cleanText(finderUser?.uniqId);
  const headImgUrl = normalizeRemoteImageUrl(finderUser?.headImgUrl);
  const fansCount = toSafeNumber(finderUser?.fansCount);
  const feedsCount = toSafeNumber(finderUser?.feedsCount);
  return {
    ok: !!(nickname && uniqId),
    nickname,
    uniqId,
    headImgUrl,
    fansCount,
    feedsCount,
    finderUser: finderUser || null
  };
}

function createFormBody() {
  const form = new URLSearchParams();
  form.set("timestamp", String(Date.now()));
  form.set("_log_finder_id", "null");
  form.set("rawKeyBuff", "null");
  return form.toString();
}

function requestWithBody(url, { method = "POST", headers = {}, body = "", timeoutMs = 15000 } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(String(url || ""));
    const client = u.protocol === "http:" ? http : https;
    const req = client.request(
      {
        protocol: u.protocol,
        hostname: u.hostname,
        port: u.port || (u.protocol === "http:" ? 80 : 443),
        path: `${u.pathname || "/"}${u.search || ""}`,
        method: String(method || "POST").toUpperCase(),
        headers
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        res.on("end", () => resolve({ statusCode: Number(res.statusCode || 0) || 0, headers: res.headers || {}, body: Buffer.concat(chunks) }));
      }
    );
    req.on("error", reject);
    req.setTimeout(Number(timeoutMs || 0) || 15000, () => req.destroy(new Error(`Request timeout: ${url}`)));
    if (body) req.write(body);
    req.end();
  });
}

async function fetchShipinhaoAuthDataByCookieHeader(opts) {
  const cookieHeader = cleanText(opts?.cookieHeader);
  if (!cookieHeader) return { ok: false, message: "missing cookie header", statusCode: 0, raw: "" };
  const timeoutMs = Math.max(2000, Number(opts?.timeoutMs || 0) || 0) || 12000;
  const userAgent = cleanText(opts?.userAgent || opts?.chromeUserAgent || "") ||
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36";
  const url = `${SHIPINHAO_AUTH_DATA_URL_PREFIX}?timestamp=${Date.now()}`;
  const body = createFormBody();
  try {
    const res = await requestWithBody(url, {
      method: "POST",
      timeoutMs,
      body,
      headers: {
        Accept: "application/json, text/plain, */*",
        "Accept-Encoding": "identity",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Origin: SHIPINHAO_HOME_URL.replace(/\/$/, ""),
        Referer: SHIPINHAO_HOME_URL,
        "User-Agent": userAgent,
        Cookie: cookieHeader,
        "Content-Length": Buffer.byteLength(body)
      }
    });
    const raw = Buffer.from(res?.body || "").toString("utf-8");
    const parsed = parseJsonLoose(raw);
    const profile = extractShipinhaoProfileFromAuthDataJson(parsed);
    return {
      ok: res.statusCode >= 200 && res.statusCode < 300 && profile.ok,
      statusCode: Number(res.statusCode || 0) || 0,
      url,
      raw,
      parsed,
      profile,
      message: profile.ok ? "" : "finderUser.nickname 或 finderUser.uniqId 不存在"
    };
  } catch (e) {
    return { ok: false, statusCode: 0, url, raw: "", parsed: null, profile: extractShipinhaoProfileFromAuthDataJson(null), message: String(e?.message || e) };
  }
}

async function waitShipinhaoAuthDataByCdp(opts) {
  const cdp = opts?.cdp;
  if (!cdp || typeof cdp.waitForEvent !== "function" || typeof cdp.send !== "function") {
    return { ok: false, statusCode: 0, raw: "", parsed: null, profile: extractShipinhaoProfileFromAuthDataJson(null), message: "cdp unavailable" };
  }
  const timeoutMs = Math.max(800, Number(opts?.timeoutMs || 0) || 0) || 1800;
  const triggerNavigate = opts?.triggerNavigate === true;
  try {
    const waiter = cdp.waitForEvent("Network.responseReceived", timeoutMs, (params) => {
      const url = cleanText(params?.response?.url);
      return url.startsWith(SHIPINHAO_AUTH_DATA_URL_PREFIX);
    });
    if (triggerNavigate) {
      const targetUrl = cleanText(opts?.homeUrl) || SHIPINHAO_HOME_URL;
      await cdp.send("Page.navigate", { url: targetUrl }).catch(() => cdp.send("Page.reload", { ignoreCache: false }).catch(() => null));
    }
    const hit = await waiter;
    const requestId = cleanText(hit?.params?.requestId);
    const statusCode = Number(hit?.params?.response?.status || 0) || 0;
    const url = cleanText(hit?.params?.response?.url);
    if (!requestId) {
      return { ok: false, statusCode, url, raw: "", parsed: null, profile: extractShipinhaoProfileFromAuthDataJson(null), message: "missing requestId" };
    }
    await cdp.waitForEvent("Network.loadingFinished", 5000, (params) => cleanText(params?.requestId) === requestId).catch(() => null);
    const bodyRes = await cdp.send("Network.getResponseBody", { requestId }).catch(() => null);
    const raw = bodyRes?.base64Encoded
      ? Buffer.from(String(bodyRes?.body || ""), "base64").toString("utf-8")
      : String(bodyRes?.body || "");
    const parsed = parseJsonLoose(raw);
    const profile = extractShipinhaoProfileFromAuthDataJson(parsed);
    return {
      ok: statusCode >= 200 && statusCode < 300 && profile.ok,
      statusCode,
      url,
      raw,
      parsed,
      profile,
      message: profile.ok ? "" : "finderUser.nickname 或 finderUser.uniqId 不存在"
    };
  } catch (e) {
    return { ok: false, statusCode: 0, raw: "", parsed: null, profile: extractShipinhaoProfileFromAuthDataJson(null), message: String(e?.message || e) };
  }
}

async function handleShipinhaoExternalLoginTick(ctx) {
  const cookieOk = !!ctx?.cookieOk;
  if (!cookieOk) return { wait: true, detail: "cookie not ready" };
  let info = await waitShipinhaoAuthDataByCdp({
    cdp: ctx?.cdp,
    timeoutMs: 1200,
    triggerNavigate: false,
    homeUrl: ctx?.homeUrl || SHIPINHAO_HOME_URL
  });
  if (!info?.ok) {
    info = await waitShipinhaoAuthDataByCdp({
      cdp: ctx?.cdp,
      timeoutMs: 4200,
      triggerNavigate: true,
      homeUrl: ctx?.homeUrl || SHIPINHAO_HOME_URL
    });
  }
  if (!info?.ok) {
    info = await fetchShipinhaoAuthDataByCookieHeader({
      cookieHeader: cleanText(ctx?.cookieHeader),
      timeoutMs: 12000,
      chromeUserAgent: ctx?.chromeUserAgent
    });
  }
  if (!info?.ok || !info?.profile?.ok) {
    return { wait: true, detail: cleanText(info?.message) || "auth_data not ready", info };
  }
  return {
    wait: false,
    info,
    profile: {
      nickName: cleanText(info.profile.nickname),
      shipinhaoId: cleanText(info.profile.uniqId),
      followerCount: toSafeNumber(info.profile.fansCount),
      videoCount: toSafeNumber(info.profile.feedsCount),
      avatarUrl: normalizeRemoteImageUrl(info.profile.headImgUrl)
    }
  };
}

module.exports = {
  SHIPINHAO_HOME_URL,
  SHIPINHAO_AUTH_DATA_URL_PREFIX,
  extractShipinhaoProfileFromAuthDataJson,
  fetchShipinhaoAuthDataByCookieHeader,
  waitShipinhaoAuthDataByCdp,
  handleShipinhaoExternalLoginTick
};
