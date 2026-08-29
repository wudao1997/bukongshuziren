"use strict";

// 视频号账号测试模块：
// 1. 统一维护“测试”按钮对视频号 Cookie 可用性的验证逻辑。
// 2. 优先读取 auth_data 响应中的 finderUser 信息，不再只按 Cookie 名称粗判。

const shipinhaoManage = require("./zhanghaoguanli.js");

function cleanText(v) {
  return String(v == null ? "" : v).trim();
}

function toSafeNumber(v) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function buildCookieHeader(cookies) {
  const list = Array.isArray(cookies) ? cookies : [];
  return list
    .map((c) => {
      const name = cleanText(c?.name);
      const value = cleanText(c?.value);
      return name ? `${name}=${value}` : "";
    })
    .filter(Boolean)
    .join("; ");
}

function shapeShipinhaoTestResult(info) {
  const profile = info?.profile && typeof info.profile === "object" ? info.profile : shipinhaoManage.extractShipinhaoProfileFromAuthDataJson(null);
  return {
    valid: !!profile?.ok,
    info: {
      ok: !!info?.ok,
      statusCode: Number(info?.statusCode || 0) || 0,
      raw: String(info?.raw || ""),
      message: cleanText(info?.message),
      url: cleanText(info?.url),
      profile
    },
    extractedNick: cleanText(profile?.nickname),
    extractedUid: cleanText(profile?.uniqId),
    extractedAvatarUrl: cleanText(profile?.headImgUrl),
    extractedFollowerCount: toSafeNumber(profile?.fansCount),
    extractedVideoCount: toSafeNumber(profile?.feedsCount)
  };
}

async function testShipinhaoAccountByCookieHeader(ctx) {
  const info = await shipinhaoManage.fetchShipinhaoAuthDataByCookieHeader({
    cookieHeader: cleanText(ctx?.cookieHeader),
    timeoutMs: Math.max(2000, Number(ctx?.timeoutMs || 0) || 0) || 12000,
    chromeUserAgent: ctx?.chromeUserAgent
  });
  return shapeShipinhaoTestResult(info);
}

async function testShipinhaoAccountByChrome(ctx) {
  const cdp = ctx?.cdp;
  const delay = typeof ctx?.delay === "function" ? ctx.delay : (ms) => new Promise((r) => setTimeout(r, Number(ms || 0) || 0));
  let info = await shipinhaoManage.waitShipinhaoAuthDataByCdp({
    cdp,
    timeoutMs: 1200,
    triggerNavigate: false,
    homeUrl: ctx?.homeUrl || shipinhaoManage.SHIPINHAO_HOME_URL
  });
  if (!info?.ok) {
    info = await shipinhaoManage.waitShipinhaoAuthDataByCdp({
      cdp,
      timeoutMs: 4200,
      triggerNavigate: true,
      homeUrl: ctx?.homeUrl || shipinhaoManage.SHIPINHAO_HOME_URL
    });
  }
  if (!info?.ok && typeof delay === "function") await delay(500);
  if (!info?.ok) {
    info = await shipinhaoManage.fetchShipinhaoAuthDataByCookieHeader({
      cookieHeader: cleanText(ctx?.cookieHeader),
      timeoutMs: 12000,
      chromeUserAgent: ctx?.chromeUserAgent
    });
  }
  return shapeShipinhaoTestResult(info);
}

async function testShipinhaoAccountByPartition(ctx) {
  const deps = ctx?.deps && typeof ctx.deps === "object" ? ctx.deps : {};
  const partition = cleanText(ctx?.partition);
  if (!partition || !deps.session) {
    return shapeShipinhaoTestResult({ ok: false, message: "missing deps or partition" });
  }
  try {
    const s = deps.session.fromPartition(partition);
    const cookies = await s.cookies.get({ url: shipinhaoManage.SHIPINHAO_HOME_URL });
    const cookieHeader = buildCookieHeader(cookies);
    return await testShipinhaoAccountByCookieHeader({
      cookieHeader,
      chromeUserAgent: typeof deps.chromeUserAgent === "function" ? deps.chromeUserAgent() : "",
      timeoutMs: 12000
    });
  } catch (e) {
    return shapeShipinhaoTestResult({ ok: false, message: String(e?.message || e) });
  }
}

module.exports = {
  testShipinhaoAccountByCookieHeader,
  testShipinhaoAccountByChrome,
  testShipinhaoAccountByPartition
};
