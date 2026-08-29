"use strict";

// 抖音账号管理模块：
// 1. 统一维护抖音登录页/主页识别逻辑。
// 2. 统一维护抖音账号信息抓取与解析逻辑。
// 3. 统一维护账号管理里“重新登入/测试账号”相关的抖音专属流程。

// 判断当前 URL 是否仍然处于抖音登录页或扫码页。
function isDouyinLoginPageUrl(rawUrl) {
  const url = String(rawUrl || "").trim();
  if (!url) return false;
  if (/passport\.douyin\.com/i.test(url)) return true;
  if (!/creator\.douyin\.com/i.test(url)) return false;
  if (url.includes("/creator-micro/home")) return false;
  if (url.includes("/creator-micro/content")) return false;
  if (url.includes("/creator-micro/publish")) return false;
  if (/login|passport|scan/i.test(url)) return true;
  return /^https:\/\/creator\.douyin\.com\/?$/.test(url);
}

// 判断当前 URL 是否已经进入抖音创作者主页。
function isDouyinHomePageUrl(rawUrl) {
  const url = String(rawUrl || "").trim();
  return url.includes("/creator-micro/home");
}

// 解析抖音创作者 user/info 接口返回结构，提取统一账号字段。
function extractDouyinProfileFromUserInfoJson(parsed) {
  try {
    const data = parsed?.data && typeof parsed.data === "object" ? parsed.data : parsed;
    const verifyInfo = data?.douyin_user_verify_info || data?.douyinUserVerifyInfo || {};
    const userProfile = data?.user_profile || data?.userProfile || {};
    const dashboardOpendDate = String(
      data?.dashboard_opend_date ||
        data?.dashboardOpendDate ||
        data?.user_dashboard_time ||
        data?.userDashboardTime ||
        ""
    ).trim();
    return {
      avatarUrl: String(verifyInfo.avatar_url || userProfile.avatar_url || "").trim(),
      douyinId: String(verifyInfo.douyin_unique_id || userProfile.unique_id || "").trim(),
      userProfileUniqueId: String(userProfile.unique_id || "").trim(),
      userProfileNickName: String(userProfile.nick_name || "").trim(),
      followerCount: Number(verifyInfo.follower_count ?? userProfile.follower_count ?? 0) || 0,
      followingCount: Number(verifyInfo.following_count ?? userProfile.following_count ?? 0) || 0,
      nickName: String(verifyInfo.nick_name || userProfile.nick_name || "").trim(),
      totalFavorited: Number(verifyInfo.total_favorited ?? userProfile.total_favorited ?? 0) || 0,
      signature: String(userProfile.signature || "").trim(),
      dashboardOpendDate
    };
  } catch {
    return {
      avatarUrl: "",
      douyinId: "",
      userProfileUniqueId: "",
      userProfileNickName: "",
      followerCount: 0,
      followingCount: 0,
      nickName: "",
      totalFavorited: 0,
      signature: "",
      dashboardOpendDate: ""
    };
  }
}

// 通过 Electron partition 中的实时 Cookie 请求抖音 creator user/info 接口。
async function fetchDouyinCreatorUserInfo(deps, partition) {
  const ctx = deps && typeof deps === "object" ? deps : {};
  const p = String(partition || "").trim();
  if (!p) return { ok: false, message: "missing partition" };
  if (!ctx.session || typeof ctx.requestUrl !== "function" || typeof ctx.readResponseBody !== "function") {
    return { ok: false, message: "missing deps" };
  }
  try {
    const s = ctx.session.fromPartition(p);
    const cookies = await s.cookies.get({ url: "https://creator.douyin.com/" });
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");
    const csrf = cookies.find((c) => String(c?.name || "") === "passport_csrf_token")?.value || "";
    const res = await ctx.requestUrl("https://creator.douyin.com/aweme/v1/creator/user/info/", {
      method: "GET",
      timeoutMs: 12000,
      headers: {
        Accept: "application/json, text/plain, */*",
        Origin: "https://creator.douyin.com",
        Referer: "https://creator.douyin.com/creator-micro/home",
        "User-Agent": typeof ctx.chromeUserAgent === "function" ? ctx.chromeUserAgent() : "",
        ...(csrf ? { "x-secsdk-csrf-token": String(csrf) } : {}),
        ...(cookieHeader ? { Cookie: cookieHeader } : {})
      }
    });
    const buf = await ctx.readResponseBody(res);
    const raw = Buffer.from(buf || "").toString("utf-8");
    if ((res.statusCode || 0) !== 200) return { ok: false, message: `http ${res.statusCode || 0}`, raw };
    const parsed = raw ? JSON.parse(raw) : null;
    const data = parsed?.data && typeof parsed.data === "object" ? parsed.data : parsed;
    const profile = extractDouyinProfileFromUserInfoJson(data);
    return { ok: true, data, raw, profile };
  } catch (e) {
    return { ok: false, message: String(e?.message || e) };
  }
}

// 通过已保存的 Cookie Header 直接请求抖音 creator user/info 接口，适用于后台静默检测。
async function fetchDouyinCreatorUserInfoByCookieHeader(deps, cookieHeader) {
  const ctx = deps && typeof deps === "object" ? deps : {};
  const ck = String(cookieHeader || "").trim();
  if (!ck) return { ok: false, message: "missing cookie header" };
  if (typeof ctx.requestUrl !== "function" || typeof ctx.readResponseBody !== "function") {
    return { ok: false, message: "missing deps" };
  }
  try {
    const csrfMatch = ck.match(/(?:^|;\s*)passport_csrf_token=([^;]+)/);
    const csrf = csrfMatch && csrfMatch[1] ? String(csrfMatch[1]) : "";
    const res = await ctx.requestUrl("https://creator.douyin.com/aweme/v1/creator/user/info/", {
      method: "GET",
      timeoutMs: 12000,
      headers: {
        Accept: "application/json, text/plain, */*",
        Origin: "https://creator.douyin.com",
        Referer: "https://creator.douyin.com/creator-micro/home",
        "User-Agent": typeof ctx.chromeUserAgent === "function" ? ctx.chromeUserAgent() : "",
        ...(csrf ? { "x-secsdk-csrf-token": String(csrf) } : {}),
        Cookie: ck
      }
    });
    const buf = await ctx.readResponseBody(res);
    const raw = Buffer.from(buf || "").toString("utf-8");
    if ((res.statusCode || 0) !== 200) return { ok: false, message: `http ${res.statusCode || 0}`, raw };
    const parsed = raw ? JSON.parse(raw) : null;
    const data = parsed?.data && typeof parsed.data === "object" ? parsed.data : parsed;
    const profile = extractDouyinProfileFromUserInfoJson(data);
    return { ok: true, data, raw, profile };
  } catch (e) {
    return { ok: false, message: String(e?.message || e) };
  }
}

// 修复抖音偶发返回 illegal app JSON 页面的问题，强制跳回正常登录入口。
async function tryFixDouyinIllegalAppPage(win) {
  if (!win || win.isDestroyed()) return false;
  try {
    const raw = await win.webContents.executeJavaScript("document.body && (document.body.innerText || '')", true);
    const txt = String(raw || "").trim();
    if (!txt || txt.length > 5000) return false;
    if (!txt.startsWith("{") || !txt.includes("error_code")) return false;
    const obj = JSON.parse(txt);
    const code = Number(obj?.data?.error_code || obj?.error_code || 0) || 0;
    if (code !== 22) return false;
    await win.loadURL("https://www.douyin.com/").catch(() => {});
    return true;
  } catch {
    return false;
  }
}

// 在抖音网页里自动尝试点开登录/扫码入口，减少用户手动寻找入口。
async function tryOpenDouyinLogin(win) {
  if (!win || win.isDestroyed()) return;
  const js = `(() => {
  const clean = (s) => String(s || "").replace(/\\s+/g, " ").trim();
  const textOf = (el) => clean(el && (el.textContent || el.innerText) || "");
  const click = (el) => { try { el && el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window })); } catch {} };
  const findByText = (sel, re) => Array.from(document.querySelectorAll(sel)).find((el) => re.test(textOf(el)));
  const loginBtn = findByText("a,button,div,span", /登录|Log\\s*in/i);
  if (loginBtn) click(loginBtn.closest("a,button") || loginBtn);
  const qr = findByText("a,button,div,span", /扫码登录|二维码登录|QR\\s*Code/i);
  if (qr) click(qr.closest("a,button") || qr);
  return true;
})()`;
  try {
    await win.webContents.executeJavaScript(js, true);
  } catch {}
}

// 账号管理内嵌窗口登录时，轮询检测抖音账号是否已经扫码成功并保存。
async function handleDouyinLoginWindowPoll(ctx) {
  const opt = ctx && typeof ctx === "object" ? ctx : {};
  const info = await fetchDouyinCreatorUserInfo(opt.deps, opt.partition);
  const uid = String(info?.profile?.userProfileUniqueId || "").trim();
  const nick = String(info?.profile?.userProfileNickName || "").trim();
  if (!info?.ok || (!uid && !nick)) return { done: false };
  if (typeof opt.tryEnableSaveLoginInfo === "function") {
    await opt.tryEnableSaveLoginInfo(opt.win, "douyin");
    await opt.delay(700);
    await opt.tryEnableSaveLoginInfo(opt.win, "douyin");
  }
  const saved = await opt.saveAccountMeta({
    id: opt.id,
    platform: "douyin",
    partition: opt.partition,
    name: String(info.profile.nickName || "").trim(),
    avatarUrl: String(info.profile.avatarUrl || "").trim()
  });
  const merged = {
    ...saved,
    status: "normal",
    douyinId: uid || String(info.profile.douyinId || "").trim(),
    followerCount: Number(info.profile.followerCount ?? saved.followerCount ?? 0) || 0,
    followingCount: Number(info.profile.followingCount ?? saved.followingCount ?? 0) || 0,
    totalFavorited: Number(info.profile.totalFavorited ?? saved.totalFavorited ?? 0) || 0,
    signature: String(info.profile.signature || saved.signature || "").trim(),
    dashboardOpendDate: String(info.profile.dashboardOpendDate || saved.dashboardOpendDate || "").trim()
  };
  opt.writeJsonSafe(opt.getAccountMetaPath(opt.id), merged);
  return { done: true, item: merged };
}

// 通过当前已登录页面上下文 fetch 抖音 user/info，避免只看 Cookie 名称造成误判。
async function fetchDouyinProfileByPageEval(evalJs) {
  try {
    const res = await evalJs(
      `(async () => {
  try {
    const r = await fetch("https://creator.douyin.com/aweme/v1/creator/user/info/", { credentials: "include" });
    const text = await r.text();
    return { status: r.status, text };
  } catch (e) {
    return { status: 0, error: String(e && (e.message || e) || "") };
  }
})()`,
      true
    );
    const status = Number(res?.status || 0) || 0;
    const text = String(res?.text || "");
    const userInfoMsg = status >= 200 && status < 300 ? "" : String(res?.error || "");
    if (!(status >= 200 && status < 300) || !text) {
      return { ok: false, status, raw: text, message: userInfoMsg };
    }
    let parsed = null;
    try {
      parsed = JSON.parse(text);
    } catch {}
    const profile = extractDouyinProfileFromUserInfoJson(parsed);
    const ok = !!(String(profile?.nickName || "").trim() || String(profile?.douyinId || "").trim());
    return {
      ok,
      status,
      raw: text,
      profile,
      message: ok ? "" : "empty extracted fields"
    };
  } catch (e) {
    return { ok: false, status: 0, raw: "", message: String(e?.message || e) };
  }
}

// 外部 Chrome 登录模式下，确保抖音先稳定停留在扫码页，扫码完成后再进入主页取号。
async function handleDouyinExternalLoginTick(ctx) {
  const opt = ctx && typeof ctx === "object" ? ctx : {};
  let href = "";
  try {
    href = String((await opt.evalJs("location.href")) || "");
  } catch {}
  if (!isDouyinHomePageUrl(href)) {
    const pages0 = await opt.listChromePages().catch(() => []);
    const pagesNow = Array.isArray(pages0) ? pages0 : [];
    const hasLoginPage = pagesNow.some((x) => isDouyinLoginPageUrl(String(x?.url || "")));
    if (!opt.cookieOk || hasLoginPage) return { wait: true, href };
    try {
      await opt.cdp.send("Page.navigate", { url: String(opt.homeUrl || "") }).catch(() => null);
      for (let i = 0; i < 40; i += 1) {
        const rs = String((await opt.evalJs("document.readyState").catch(() => "")) || "");
        if (rs === "complete") break;
        await opt.delay(250);
      }
      href = String((await opt.evalJs("location.href").catch(() => "")) || "");
    } catch {}
    if (!isDouyinHomePageUrl(href)) return { wait: true, href };
  }
  await opt.delay(2000);
  const info = await fetchDouyinProfileByPageEval(opt.evalJs);
  if (!info?.ok) return { wait: true, href, detail: String(info?.message || "") };
  return { wait: false, href, profile: info.profile, userInfoStatus: info.status, userInfoRaw: info.raw };
}

// 账号测试：针对 Chrome 调试会话里的当前抖音登录态做实时校验。
async function testDouyinAccountByChrome(ctx) {
  const opt = ctx && typeof ctx === "object" ? ctx : {};
  let userInfoMsg = "";
  let userInfoStatus = 0;
  let userInfoRaw = "";
  let profile = null;
  try {
    await opt.cdp.send("Page.navigate", { url: String(opt.homeUrl || "https://creator.douyin.com/creator-micro/home") }).catch(() => null);
    for (let i = 0; i < 50; i += 1) {
      const rs = String((await opt.evalJs("document.readyState").catch(() => "")) || "");
      if (rs === "complete") break;
      await opt.delay(250);
    }
    await opt.delay(600);
    const info = await fetchDouyinProfileByPageEval(opt.evalJs);
    userInfoStatus = Number(info?.status || 0) || 0;
    userInfoRaw = String(info?.raw || "");
    userInfoMsg = String(info?.message || "");
    profile = info?.profile || null;
  } catch (e) {
    userInfoMsg = String(e?.message || e);
  }
  const extractedNick = String(profile?.nickName || "").trim();
  const extractedUid = String(profile?.douyinId || "").trim();
  return {
    userInfoOk: !!(extractedNick || extractedUid),
    userInfoStatus,
    userInfoRaw,
    userInfoMsg,
    extractedNick,
    extractedUid,
    extractedAvatarUrl: String(profile?.avatarUrl || "").trim(),
    extractedFollowerCount: Number(profile?.followerCount ?? 0) || 0,
    extractedFollowingCount: Number(profile?.followingCount ?? 0) || 0,
    extractedTotalFavorited: Number(profile?.totalFavorited ?? 0) || 0,
    extractedSignature: String(profile?.signature || "").trim(),
    extractedDashboardOpendDate: String(profile?.dashboardOpendDate || "").trim()
  };
}

// 账号测试：针对 partition 模式保存的抖音账号做实时接口校验。
async function testDouyinAccountByPartition(ctx) {
  const opt = ctx && typeof ctx === "object" ? ctx : {};
  const info = await fetchDouyinCreatorUserInfo(opt.deps, opt.partition);
  const profile = info?.profile || null;
  const extractedNick = String(profile?.nickName || profile?.userProfileNickName || "").trim();
  const extractedUid = String(profile?.douyinId || profile?.userProfileUniqueId || "").trim();
  return {
    valid: !!(info?.ok && (extractedNick || extractedUid)),
    info,
    extractedNick,
    extractedUid,
    extractedAvatarUrl: String(profile?.avatarUrl || "").trim(),
    extractedFollowerCount: Number(profile?.followerCount ?? 0) || 0,
    extractedFollowingCount: Number(profile?.followingCount ?? 0) || 0,
    extractedTotalFavorited: Number(profile?.totalFavorited ?? 0) || 0,
    extractedSignature: String(profile?.signature || "").trim(),
    extractedDashboardOpendDate: String(profile?.dashboardOpendDate || "").trim()
  };
}

module.exports = {
  isDouyinLoginPageUrl,
  isDouyinHomePageUrl,
  extractDouyinProfileFromUserInfoJson,
  fetchDouyinCreatorUserInfo,
  fetchDouyinCreatorUserInfoByCookieHeader,
  tryFixDouyinIllegalAppPage,
  tryOpenDouyinLogin,
  handleDouyinLoginWindowPoll,
  handleDouyinExternalLoginTick,
  testDouyinAccountByChrome,
  testDouyinAccountByPartition
};
