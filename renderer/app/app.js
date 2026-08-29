import { createRouter } from "./router.js";
import { routes, navItems, menuKeyByPath } from "./routes.js";
import { icons } from "./icons.js";
import { getTheme, setTheme, getOutputDir, setOutputDir, setPublicCloudLlm } from "./store.js";
import { fetchIdentityAccess } from "./gongneng/shenfenquanxian.js";
import { confirmDialog, topToast } from "./ui.js";

const CLOUD_LOGIN_URL_KEY = "ipfactory.cloud.loginUrl";
const CLOUD_REGISTER_URL_KEY = "ipfactory.cloud.registerUrl";
const CLOUD_PROFILE_URL_KEY = "ipfactory.cloud.profileUrl";
const CLOUD_KAMI_URL_KEY = "ipfactory.cloud.kamiUrl";
const CLOUD_SESSION_TOKEN_URL_KEY = "ipfactory.cloud.sessionTokenUrl";
const CLOUD_MACHINE_URL_KEY = "ipfactory.cloud.machineUrl";
const CLOUD_MENU_URL_KEY = "ipfactory.cloud.menuUrl";
const CLOUD_TOKEN_KEY = "ipfactory.cloud.tokenEnc";
const CLOUD_OBJECTS = {
  login: "qd-mimayanzheng",
  register: "dengluyanzheng",
  profile: "qd-shezhiyonghuxinxi",
  kami: "qd-kamiguanli",
  sessionToken: "qd-token",
  machine: "qd-jiqimaguanli",
  menu: "qd-caidan",
  publicCloudLlm: "gongyongyunduandamoxing"
};

const FOOTER_ITEMS = [
  { path: "/account", title: "账号", icon: icons.accounts },
  { path: "/settings", title: "设置", icon: icons.settings },
  { path: "/help", title: "帮助", icon: icons.help }
];

const MENU_KEY_BY_PATH = {
  ...menuKeyByPath
};

let menuVisibility = Object.values(MENU_KEY_BY_PATH).reduce((acc, key) => {
  acc[key] = true;
  return acc;
}, {});
let menuUpdatedAt = "";
let menuPollTimer = 0;
let identityAccessPollTimer = 0;
let detectionConfig = {
  enabled: true,
  scene: "desktop",
  intervalMs: 10000,
  lastSyncAt: null,
  lastMenuUpdatedAt: null
};
let _menuSyncErrorShown = false;
let _appUpdateCheckedThisBoot = false;
let _appUpdateStateUnsubscribe = null;
let _lastAppUpdateToastKey = "";
let _startupBackgroundSyncStarted = false;
const BOOT_MIN_DURATION_MS = 260;
const IDENTITY_ACCESS_POLL_MS = 5000;
const NO_ACCESS_PATH = "/no-access";

function bindWindowControlEvents(host) {
  if (!host) return;
  host.querySelector('[data-win-act="minimize"]')?.addEventListener("click", () => {
    window.api?.window?.minimize?.();
  });
  host.querySelector('[data-win-act="maximize"]')?.addEventListener("click", () => {
    window.api?.window?.toggleMaximize?.();
  });
  host.querySelector('[data-win-act="close"]')?.addEventListener("click", () => {
    window.api?.window?.close?.();
  });
}

function renderBootScreen() {
  const root = document.getElementById("app");
  if (!root) throw new Error("Missing #app");
  root.innerHTML = `
    <div class="boot-screen">
      <div class="boot-win-controls">
        <button class="win-btn" data-win-act="minimize" title="最小化">${icons.minimize}</button>
        <button class="win-btn" data-win-act="maximize" title="最大化/还原">${icons.maximize}</button>
        <button class="win-btn win-close" data-win-act="close" title="关闭">${icons.close}</button>
      </div>
      <div class="boot-screen-inner">
        <div class="boot-brand">
          <div class="boot-brand-mark"><img src="./assets/bukong-logo.ico" alt="不空LOGO" /></div>
          <div class="boot-brand-meta">
            <div class="boot-title">不空IP智能体</div>
            <div class="boot-subtitle">正在加载工作台与页面配置</div>
          </div>
        </div>
        <div class="boot-orbit">
          <span class="boot-orbit-ring is-a"></span>
          <span class="boot-orbit-ring is-b"></span>
          <span class="boot-orbit-core"></span>
        </div>
        <div class="boot-status-card">
          <div class="boot-status-title">启动检查中</div>
          <div class="boot-status-text" id="boot-status-text">正在准备基础环境...</div>
          <div class="boot-progress-track">
            <span class="boot-progress-bar"></span>
          </div>
        </div>
      </div>
    </div>
  `;
  bindWindowControlEvents(root);
  document.body.classList.toggle("screen-display-mode", isDataScreenPopoutMode());
}

function updateBootStatus(text) {
  const el = document.getElementById("boot-status-text");
  if (el) el.textContent = String(text || "").trim() || "正在准备基础环境...";
}

async function leaveBootScreen() {
  const screen = document.querySelector(".boot-screen");
  if (!screen) return;
  screen.classList.add("is-leaving");
  await wait(220);
}

async function runStartupBackgroundSync() {
  if (_startupBackgroundSyncStarted) return;
  _startupBackgroundSyncStarted = true;
  try {
    const synced = await window.api?.domain?.syncFromCloud?.({ scene: "desktop" }).catch(() => null);
    if (synced?.ok && synced.domain) applyCloudDomainToLocalStorage(synced.domain);
  } catch {}
  await Promise.allSettled([
    window.api?.appUpdate?.syncFromCloud?.({ scene: "desktop" }).catch(() => null),
    syncPublicCloudLlmFromCloud({ silent: true }).catch(() => null),
    ensurePageModuleCloudDefaults().catch(() => null),
    loadMenuVisibilityFromCloud({ silent: true }).catch(() => null),
    refreshAuthProfile().catch(() => null),
    refreshIdentityAccess({ dispatch: false }).catch(() => null)
  ]);
  renderSidebarMenus();
  renderBadge();
  renderLicenseBadge();
}

function normalizeDomain(domain) {
  const raw = String(domain || "").trim();
  if (!raw) return "";
  let d = raw.replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(d)) d = `https://${d.replace(/^\/+/, "")}`;
  try {
    const u = new URL(d);
    if (u.protocol === "http:" && /bspapp\.com$/i.test(u.hostname)) u.protocol = "https:";
    return `${u.protocol}//${u.host}`;
  } catch {
    return "";
  }
}

function applyCloudDomainToLocalStorage(domain) {
  const d = normalizeDomain(domain);
  if (!d) return false;
  try {
    localStorage.setItem(CLOUD_LOGIN_URL_KEY, `${d}/${CLOUD_OBJECTS.login}`);
    localStorage.setItem(CLOUD_REGISTER_URL_KEY, `${d}/${CLOUD_OBJECTS.register}`);
    localStorage.setItem(CLOUD_PROFILE_URL_KEY, `${d}/${CLOUD_OBJECTS.profile}`);
    localStorage.setItem(CLOUD_KAMI_URL_KEY, `${d}/${CLOUD_OBJECTS.kami}`);
    localStorage.setItem(CLOUD_SESSION_TOKEN_URL_KEY, `${d}/${CLOUD_OBJECTS.sessionToken}`);
    localStorage.setItem(CLOUD_MACHINE_URL_KEY, `${d}/${CLOUD_OBJECTS.machine}`);
    localStorage.setItem(CLOUD_MENU_URL_KEY, `${d}/${CLOUD_OBJECTS.menu}`);
    return true;
  } catch {
    return false;
  }
}

function createAppShell(options = {}) {
  const root = document.getElementById("app");
  if (!root) throw new Error("Missing #app");
  const entering = options.entering !== false;
  const isDisplayScreenMode = isDataScreenPopoutMode();

  root.innerHTML = `
    <div class="app ${entering ? "is-app-entering" : ""} ${isDisplayScreenMode ? "is-display-screen" : ""}">
      <div class="global-win-controls is-floating" id="global-win-controls">
        <button class="win-btn" id="gbtn-minimize" data-win-act="minimize" title="最小化">${icons.minimize}</button>
        <button class="win-btn" id="gbtn-maximize" data-win-act="maximize" title="最大化/还原">${icons.maximize}</button>
        <button class="win-btn win-close" id="gbtn-close" data-win-act="close" title="关闭">${icons.close}</button>
      </div>
      <aside class="sidebar">
        <div class="brand" title="不空IP智能体"><img src="./assets/bukong-logo.ico" alt="不空LOGO" /></div>
        <nav class="nav" id="nav"></nav>
        <div class="sidebar-footer" id="sidebar-footer"></div>
      </aside>
      <section class="main">
        <header class="topbar">
          <div class="topbar-left">
            <div class="app-title" id="app-title">不空IP智能体</div>
            <div class="badge" id="app-badge">桌面端</div>
            <div class="topbar-license" id="topbar-license" hidden>
              <div class="badge mono" id="license-badge"></div>
              <button class="btn btn-primary btn-compact" id="btn-license-redeem">卡密激活</button>
            </div>
          </div>
          <div class="topbar-right">
            <button class="btn" id="btn-theme" title="切换主题">主题</button>
            <div class="win-controls-anchor" id="win-controls-anchor"></div>
          </div>
        </header>
        <div class="global-live-status" id="global-live-status" hidden></div>
        <main class="content">
          <div id="route-outlet"></div>
        </main>
      </section>
    </div>
    <div class="app-update-install-overlay" id="app-update-install-overlay" hidden>
      <div class="app-update-install-dialog">
        <div class="app-update-install-badge">自动安装中</div>
        <div class="app-update-install-title" id="app-update-install-title">正在准备安装更新</div>
        <div class="app-update-install-subtitle" id="app-update-install-subtitle">更新包下载完成后会自动进入安装流程。</div>
        <div class="app-update-install-progress-head">
          <div class="app-update-install-progress-label" id="app-update-install-progress-label">安装进度</div>
          <div class="app-update-install-progress-value" id="app-update-install-progress-value">0%</div>
        </div>
        <div class="app-update-install-track">
          <span class="app-update-install-fill" id="app-update-install-fill"></span>
        </div>
        <div class="app-update-install-steps" id="app-update-install-steps"></div>
        <div class="app-update-install-detail" id="app-update-install-detail">请保持当前窗口不动，软件会自动完成安装并重新启动。</div>
      </div>
    </div>
    <div class="modal-overlay" id="topbar-kami-overlay" hidden></div>
    <div class="modal topbar-kami-modal" id="topbar-kami-modal" hidden>
      <div class="modal-head">
        <div class="modal-title">卡密激活</div>
        <button class="modal-close" id="topbar-kami-close" title="关闭">×</button>
      </div>
      <div class="modal-body">
        <div class="form">
          <div class="field">
            <div class="label">当前账号</div>
            <input type="text" id="topbar-kami-account" readonly />
          </div>
          <div class="field">
            <div class="label">卡密</div>
            <input type="text" id="topbar-kami-code" placeholder="请输入卡密" />
          </div>
          <div class="modal-tip">激活成功后会自动校验卡密并为当前账号增加使用时长。</div>
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn" id="topbar-kami-cancel">取消</button>
        <button class="btn btn-primary" id="topbar-kami-submit">立即激活</button>
      </div>
    </div>
  `;

  bindWindowControlEvents(root);

  root.querySelector("#btn-theme").addEventListener("click", () => {
    const next = getTheme() === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme();
  });

  root.querySelector("#btn-license-redeem").addEventListener("click", openTopbarKamiModal);
  root.querySelector("#topbar-kami-close").addEventListener("click", closeTopbarKamiModal);
  root.querySelector("#topbar-kami-cancel").addEventListener("click", closeTopbarKamiModal);
  root.querySelector("#topbar-kami-submit").addEventListener("click", submitTopbarKamiRedeem);
  root.querySelector("#topbar-kami-overlay").addEventListener("click", closeTopbarKamiModal);
  root.querySelector("#topbar-kami-code").addEventListener("keydown", (e) => {
    if (e.key === "Enter") submitTopbarKamiRedeem();
  });
  if (entering) {
    window.requestAnimationFrame(() => {
      root.querySelector(".app")?.classList.add("is-app-entered");
    });
  }
}

function isMenuVisible(path) {
  const auth = readAuth();
  if (isSuperAdminIdentity(auth?.identity)) return true;
  const explicit = getIdentityMenuExplicitValue(path);
  if (explicit === false) return false;
  const key = MENU_KEY_BY_PATH[String(path || "").trim()];
  if (!key) return true;
  if (explicit === true) return true;
  return menuVisibility[key] !== false;
}

function getFirstVisibleMenuPath() {
  const firstNav = navItems.find((it) => isMenuVisible(it.path));
  if (firstNav) return firstNav.path;
  const firstFooter = FOOTER_ITEMS.find((it) => isMenuVisible(it.path));
  return firstFooter ? firstFooter.path : "/login";
}

function getBlockedRoutePath(path) {
  const requested = String(path || "").trim();
  if (!requested || requested === "/login" || requested === NO_ACCESS_PATH) return getFirstVisibleMenuPath();
  return NO_ACCESS_PATH;
}

function renderSidebarMenus() {
  const nav = document.getElementById("nav");
  const footer = document.getElementById("sidebar-footer");
  if (!nav || !footer) return;

  nav.innerHTML = navItems
    .filter((it) => isMenuVisible(it.path))
    .map(
      (it) =>
        `<a class="nav-item" data-route="${it.path}" href="#${it.path}" title="${it.title}">
          <div class="nav-icon">${it.icon}</div>
          <div class="nav-label">${it.title}</div>
        </a>`
    )
    .join("");

  footer.innerHTML = FOOTER_ITEMS
    .filter((it) => isMenuVisible(it.path))
    .map(
      (it) =>
        `<a class="nav-item" data-route="${it.path}" href="#${it.path}" title="${it.title}">
          <div class="nav-icon">${it.icon}</div>
          <div class="nav-label">${it.title}</div>
        </a>`
    )
    .join("");
}

function updateWindowControlsLayout(path) {
  const appEl = document.querySelector(".app");
  const controls = document.getElementById("global-win-controls");
  const anchor = document.getElementById("win-controls-anchor");
  if (!appEl || !controls) return;
  const isLogin = path === "/login";
  appEl.classList.toggle("is-login", isLogin);
  if (isLogin) {
    appEl.appendChild(controls);
    controls.classList.remove("is-embedded");
    controls.classList.add("is-floating");
    return;
  }
  if (anchor) anchor.appendChild(controls);
  controls.classList.remove("is-floating");
  controls.classList.add("is-embedded");
}

function applyTheme() {
  document.documentElement.dataset.theme = getTheme();
}

function renderBadge() {
  const badge = document.getElementById("app-badge");
  const outputDir = getOutputDir();
  badge.textContent = outputDir ? `保存：${outputDir}` : "桌面端";
  badge.title = outputDir || "未设置保存目录";
}

function readAuth() {
  try {
    const raw = localStorage.getItem("auth.user");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.userId) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function syncRuntimeAuthUser() {
  try {
    const auth = readAuth();
    await window.api?.auth?.setRuntimeUser?.({ userId: String(auth?.userId || "").trim() });
  } catch {}
}

function writeAuth(patch) {
  const current = readAuth() || {};
  const next = { ...current, ...(patch && typeof patch === "object" ? patch : {}) };
  if (!next.userId) return null;
  localStorage.setItem("auth.user", JSON.stringify(next));
  syncRuntimeAuthUser().catch(() => {});
  return next;
}

function normalizeIdentity(value) {
  return String(value || "").trim();
}

function isSuperAdminIdentity(identity) {
  const normalized = normalizeIdentity(identity).toLowerCase();
  return normalized === "超级管理员" || normalized === "super_admin" || normalized === "superadmin";
}

function getIdentityMenuMap() {
  const auth = readAuth();
  const map = auth?.identityAccess?.menusMap;
  return map && typeof map === "object" ? map : {};
}

function getIdentityMenuExplicitValue(path) {
  const key = MENU_KEY_BY_PATH[String(path || "").trim()];
  if (!key) return true;
  const menusMap = getIdentityMenuMap();
  if (!Object.prototype.hasOwnProperty.call(menusMap, key)) return undefined;
  return menusMap[key] !== false;
}

function readCloudRuntimeConfig() {
  return {
    profileUrl: String(localStorage.getItem(CLOUD_PROFILE_URL_KEY) || "").trim(),
    kamiUrl: String(localStorage.getItem(CLOUD_KAMI_URL_KEY) || "").trim(),
    tokenEnc: String(localStorage.getItem(CLOUD_TOKEN_KEY) || "").trim()
  };
}

async function ensureDefaultOutputDir() {
  const current = String(getOutputDir() || "").trim();
  if (current) return current;
  const res = await window.api?.app?.getWritableDefaultOutputDir?.();
  const directoryPath = String(res?.directoryPath || "").trim();
  if (!directoryPath) return "";
  setOutputDir(directoryPath);
  return directoryPath;
}

function toMs(d) {
  if (!d) return 0;
  const t = new Date(d).getTime();
  return Number.isFinite(t) ? t : 0;
}

function buildCloudMethodUrl(baseUrl, methodName) {
  const baseRaw = String(baseUrl || "").trim();
  const method = String(methodName || "").trim().replace(/^\/+/, "");
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
    if (base.toLowerCase().endsWith(`/${method}`.toLowerCase())) return base;
    return `${base}/${method}`;
  }
}

async function readCloudToken() {
  const enc = String(localStorage.getItem(CLOUD_TOKEN_KEY) || "").trim();
  if (!enc) return "";
  try {
    const dec = await window.api?.auth?.safeDecrypt?.({ data: enc });
    if (dec?.ok && typeof dec.text === "string") return dec.text;
  } catch {}
  return "";
}

function openTopbarKamiModal() {
  const auth = readAuth();
  if (!auth || !auth.account) {
    topToast("请先登录后再激活卡密。", { type: "warn" });
    return;
  }
  const overlay = document.getElementById("topbar-kami-overlay");
  const modal = document.getElementById("topbar-kami-modal");
  const accountEl = document.getElementById("topbar-kami-account");
  const codeEl = document.getElementById("topbar-kami-code");
  if (!overlay || !modal || !accountEl || !codeEl) return;
  accountEl.value = String(auth.account || "");
  codeEl.value = "";
  overlay.hidden = false;
  modal.hidden = false;
  window.setTimeout(() => codeEl.focus(), 0);
}

function closeTopbarKamiModal() {
  const overlay = document.getElementById("topbar-kami-overlay");
  const modal = document.getElementById("topbar-kami-modal");
  if (overlay) overlay.hidden = true;
  if (modal) modal.hidden = true;
}

async function refreshAuthProfile() {
  const auth = readAuth();
  if (!auth || !auth.account) return null;
  const cfg = readCloudRuntimeConfig();
  const url = buildCloudMethodUrl(cfg.profileUrl, "getProfile");
  if (!url) return null;
  const token = await readCloudToken();
  const deviceIdRes = await window.api?.device?.getId?.();
  const deviceId = String(deviceIdRes?.deviceId || auth.deviceId || "").trim();
  if (!deviceId) return null;
  const res = await window.api?.cloudAuth?.getProfile?.({
    url,
    token,
    body: {
      account: String(auth.account || ""),
      deviceId
    }
  });
  if (!res || res.errCode || res.ok !== true) return null;
  const prevIdentity = normalizeIdentity(auth.identity);
  const next = writeAuth({
    account: res.account || auth.account,
    identity: normalizeIdentity(res.identity) || "普通用户",
    phone: res.phone || "",
    deviceId: res.deviceId || deviceId,
    ip: res.ip || "",
    kamiCode: res.kamiCode || "",
    kamiStartAt: res.kamiStartAt || null,
    kamiEndAt: res.kamiEndAt || null,
    trialEndAt: res.trialEndAt || null,
    licenseSource: res.licenseSource || "",
    licenseEndAt: res.licenseEndAt || null,
    licenseRemainingMs: Number(res.licenseRemainingMs || 0) || 0
  });
  const nextIdentity = normalizeIdentity(next?.identity);
  if (next && prevIdentity !== nextIdentity) {
    try {
      window.dispatchEvent(new CustomEvent("ipfactory:authChanged", { detail: { type: "identity-refresh" } }));
    } catch {}
  }
  renderLicenseBadge();
  return next;
}

async function refreshIdentityAccess(options = {}) {
  const auth = readAuth();
  if (!auth || !auth.account) return null;
  const deviceIdRes = await window.api?.device?.getId?.();
  const deviceId = String(deviceIdRes?.deviceId || auth.deviceId || "").trim();
  const res = await fetchIdentityAccess({
    account: String(auth.account || "").trim(),
    userId: String(auth.userId || "").trim(),
    deviceId,
    identity: normalizeIdentity(auth.identity) || "普通用户",
    scene: String(detectionConfig.scene || "desktop") || "desktop"
  });
  if (!res?.ok || !res.access) return null;
  const previousAccess = JSON.stringify(auth.identityAccess || {});
  const next = writeAuth({
    identity: normalizeIdentity(res.access.identityName) || normalizeIdentity(auth.identity) || "普通用户",
    identityAccess: res.access,
    identityPermissionsUpdatedAt: res.access.updatedAt || null
  });
  const changed = previousAccess !== JSON.stringify(next?.identityAccess || {});
  if (changed && options.dispatch !== false) {
    try {
      window.dispatchEvent(new CustomEvent("ipfactory:authChanged", { detail: { type: "identity-access-refresh" } }));
    } catch {}
  }
  return next;
}

async function pollIdentityAccessTick() {
  const auth = readAuth();
  if (!auth || document.visibilityState === "hidden") return null;
  return refreshIdentityAccess({ dispatch: true }).catch(() => null);
}

async function redeemKamiForCurrentUser(code) {
  const auth = readAuth();
  if (!auth || !auth.account) return { ok: false, errMsg: "请先登录" };
  const cleanCode = String(code || "").trim();
  if (!cleanCode) return { ok: false, errMsg: "卡密必填" };
  const cfg = readCloudRuntimeConfig();
  const baseUrl = String(cfg.kamiUrl || "").trim();
  const url = buildCloudMethodUrl(baseUrl, "redeem");
  if (!url) return { ok: false, errMsg: "未配置云端卡密接口URL" };
  const deviceIdRes = await window.api?.device?.getId?.();
  const deviceId = String(deviceIdRes?.deviceId || auth.deviceId || "").trim();
  if (!deviceId) return { ok: false, errMsg: "无法获取机器码" };
  const token = await readCloudToken();
  const body = {
    account: String(auth.account || ""),
    deviceId,
    code: cleanCode
  };
  const first = await window.api?.cloudAuth?.redeemKami?.({
    url,
    token,
    body
  });
  const firstMsg = String(first?.errMsg || first?.message || "");
  if (first && first.ok === true) {
    await refreshAuthProfile();
    try {
      window.dispatchEvent(new CustomEvent("ipfactory:authChanged", { detail: { type: "kami-redeem" } }));
    } catch {}
    return first;
  }
  if (firstMsg.includes("http 404") || firstMsg.includes("HTTP 404") || firstMsg.includes("404")) {
    try {
      const u = new URL(baseUrl);
      const origin = `${u.protocol}//${u.host}`;
      const altName = baseUrl.includes("/qd-kamiguanli") ? "hd-kamiguanli" : "qd-kamiguanli";
      const altBase = `${origin}/${altName}`;
      const altUrl = buildCloudMethodUrl(altBase, "redeem");
      const second = await window.api?.cloudAuth?.redeemKami?.({
        url: altUrl,
        token,
        body
      });
      if (second && second.ok === true) {
        try {
          localStorage.setItem(CLOUD_KAMI_URL_KEY, altBase);
        } catch {}
        await refreshAuthProfile();
        try {
          window.dispatchEvent(new CustomEvent("ipfactory:authChanged", { detail: { type: "kami-redeem" } }));
        } catch {}
        return second;
      }
      return second || first || { ok: false, errMsg: "卡密激活失败" };
    } catch {}
  }
  return first || { ok: false, errMsg: "卡密激活失败" };
}

async function submitTopbarKamiRedeem() {
  const btn = document.getElementById("topbar-kami-submit");
  const codeEl = document.getElementById("topbar-kami-code");
  const code = String(codeEl?.value || "").trim();
  if (!code) {
    topToast("请输入卡密。", { type: "warn" });
    codeEl?.focus();
    return;
  }
  if (btn) {
    btn.disabled = true;
    btn.textContent = "激活中...";
  }
  try {
    const res = await redeemKamiForCurrentUser(code);
    if (!res || res.errCode || res.ok !== true) {
      topToast(String(res?.errMsg || "卡密激活失败"), { type: "error" });
      return;
    }
    closeTopbarKamiModal();
    topToast("卡密激活成功，已增加使用时长。", { type: "success" });
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "立即激活";
    }
  }
}

function getCurrentRoutePath() {
  const raw = String(window.location.hash || "").replace(/^#/, "").trim();
  if (!raw) return "/home";
  const pure = raw.split("?")[0].trim();
  return pure || "/home";
}

function readCurrentRouteQuery() {
  const raw = String(window.location.hash || "").replace(/^#/, "").trim();
  const [, queryPart] = raw.split("?");
  return new URLSearchParams(queryPart || "");
}

function isDataScreenPopoutMode(path = getCurrentRoutePath()) {
  const query = readCurrentRouteQuery();
  const display = String(query.get("display") || "").trim();
  const popout = String(query.get("popout") || "").trim();
  return String(path || "").trim() === "/data-screen" && (display === "popout" || popout === "1");
}

function updateAppShellDisplayMode(path = getCurrentRoutePath()) {
  const appEl = document.querySelector(".app");
  const enabled = isDataScreenPopoutMode(path);
  if (appEl) appEl.classList.toggle("is-display-screen", enabled);
  document.body.classList.toggle("screen-display-mode", enabled);
}

async function readDetectionConfig() {
  const res = await window.api?.detection?.read?.();
  if (res?.ok && res.config && typeof res.config === "object") {
    detectionConfig = { ...detectionConfig, ...res.config };
  }
  return detectionConfig;
}

async function writeDetectionConfig(patch = {}) {
  const next = { ...detectionConfig, ...patch };
  const res = await window.api?.detection?.write?.({ config: next });
  if (res?.ok && res.config && typeof res.config === "object") {
    detectionConfig = { ...detectionConfig, ...res.config };
  } else {
    detectionConfig = next;
  }
  return detectionConfig;
}

function getMenuConfigSummary(menus) {
  const data = menus && typeof menus === "object" ? menus : {};
  return Object.entries(data)
    .map(([key, value]) => `${key}:${value === false ? "false" : "true"}`)
    .join(", ");
}

async function appendMenuLog(level, message) {
  try {
    await window.api?.testLog?.append?.({
      source: "菜单云控",
      level,
      message
    });
  } catch {}
}

async function applyMenuVisibilityResult(res, options = {}) {
  const currentPath = getCurrentRoutePath();
  const previous = JSON.stringify(menuVisibility);
  if (res?.ok && res.menus && typeof res.menus === "object") {
    menuVisibility = { ...menuVisibility, ...res.menus };
    menuUpdatedAt = String(res.updatedAt || "").trim();
  }
  renderSidebarMenus();
  const changed = previous !== JSON.stringify(menuVisibility);
  const hiddenCurrent = currentPath !== "/login" && !isMenuVisible(currentPath);
  if (changed || hiddenCurrent) {
    const nextPath = hiddenCurrent ? getBlockedRoutePath(currentPath) : currentPath;
    if (window.location.hash !== `#${nextPath}`) window.location.hash = `#${nextPath}`;
  }
  if (options.persist !== false) {
    await writeDetectionConfig({
      lastSyncAt: new Date().toISOString(),
      lastMenuUpdatedAt: menuUpdatedAt || detectionConfig.lastMenuUpdatedAt || null
    });
  }
  return { changed, hiddenCurrent };
}

async function loadMenuVisibilityFromCloud(options = {}) {
  const baseUrl = String(localStorage.getItem(CLOUD_MENU_URL_KEY) || "").trim();
  const url = buildCloudMethodUrl(baseUrl, "getLatest");
  if (!url) {
    menuVisibility = { ...menuVisibility };
    renderSidebarMenus();
    await appendMenuLog("warn", "未配置云端菜单接口URL，已保持当前菜单显示状态。");
    if (options.silent !== true && !_menuSyncErrorShown) {
      _menuSyncErrorShown = true;
      topToast("未配置云端菜单接口URL，菜单云控未生效。", { type: "warn" });
    }
    return { ok: false, errMsg: "未配置云端菜单接口URL" };
  }
  const res = await window.api?.cloudAuth?.getMenuConfig?.({
    url,
    token: "",
    body: { scene: String(detectionConfig.scene || "desktop") || "desktop" }
  });
  if (res?.ok && res.menus && typeof res.menus === "object") {
    _menuSyncErrorShown = false;
    await applyMenuVisibilityResult(res, options);
    if (options.persist !== false) {
      await appendMenuLog(
        "info",
        `菜单同步成功 scene=${String(detectionConfig.scene || "desktop")} updatedAt=${String(res.updatedAt || "")} menus=${getMenuConfigSummary(res.menus)}`
      );
    }
  } else if (options.persist !== false) {
    await writeDetectionConfig({ lastSyncAt: new Date().toISOString() });
    await appendMenuLog("error", `菜单同步失败 url=${url} reason=${String(res?.errMsg || res?.message || "未知错误")}`);
    if (options.silent !== true && !_menuSyncErrorShown) {
      _menuSyncErrorShown = true;
      topToast(String(res?.errMsg || res?.message || "菜单配置同步失败"), { type: "warn" });
    }
  }
  return res;
}

async function ensurePageModuleCloudDefaults() {
  const baseDomain = String((await window.api?.domain?.read?.())?.domain || "").trim().replace(/\/+$/, "");
  if (!baseDomain) return { ok: false, message: "未配置云端域名" };
  const targets = [
    "qd-shouyecaidanjiemian",
    "fabuguanlicaidanyemian",
    "zhanghaoguanlicaidanyemian"
  ];
  const results = [];
  for (const cloudObjectName of targets) {
    const url = buildCloudMethodUrl(`${baseDomain}/${cloudObjectName}`, "getLatest");
    if (!url) {
      results.push({ ok: false, cloudObjectName, message: "地址无效" });
      continue;
    }
    try {
      const res = await window.api?.cloudAuth?.getMenuConfig?.({
        url,
        token: "",
        body: { scene: String(detectionConfig.scene || "desktop") || "desktop" }
      });
      results.push({
        ok: !!res?.ok,
        cloudObjectName,
        seeded: res?.seeded === true,
        updatedAt: String(res?.updatedAt || "").trim(),
        message: String(res?.errMsg || res?.message || "")
      });
    } catch (e) {
      results.push({ ok: false, cloudObjectName, message: String(e?.message || e) });
    }
  }
  return { ok: results.every((item) => item.ok), results };
}

async function syncPublicCloudLlmFromCloud({ silent = true } = {}) {
  const baseDomain = String((await window.api?.domain?.read?.())?.domain || "").trim().replace(/\/+$/, "");
  if (!baseDomain) return { ok: false, message: "未配置云端域名" };
  const url = buildCloudMethodUrl(`${baseDomain}/${CLOUD_OBJECTS.publicCloudLlm}`, "getLatest");
  if (!url) return { ok: false, message: "公用云端大模型地址无效" };
  try {
    const res = await window.api?.cloudAuth?.getMenuConfig?.({
      url,
      token: "",
      body: { scene: "desktop" }
    });
    const item =
      (res?.item && typeof res.item === "object" ? res.item : null) ||
      (res?.data?.item && typeof res.data.item === "object" ? res.data.item : null) ||
      (res?.result?.item && typeof res.result.item === "object" ? res.result.item : null) ||
      ((res?.providerId || res?.modelId || res?.model || res?.endpoint) ? res : null);
    if (!res?.ok || !item) {
      if (silent !== true && (res?.errMsg || res?.message)) {
        topToast(String(res?.errMsg || res?.message || "公用云端大模型同步失败"), { type: "warn" });
      }
      return { ok: false, message: String(res?.errMsg || res?.message || "公用云端大模型同步失败") };
    }
    const providerId = String(item.providerId || "").trim();
    const providerDefaults = {
      "aliyun-bailian": { label: "阿里云百炼", endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions" },
      "zhipu-bigmodel": { label: "智谱开放平台", endpoint: "https://open.bigmodel.cn/api/paas/v4/chat/completions" },
      "deepseek-open-platform": { label: "DeepSeek 深度求索", endpoint: "https://api.deepseek.com/chat/completions" },
      "moonshot-kimi": { label: "Moonshot 月之暗面（Kimi）", endpoint: "https://api.moonshot.ai/v1/chat/completions" },
      "tencent-tokenhub": { label: "腾讯云 TokenHub", endpoint: "https://tokenhub.tencentmaas.com/v1/chat/completions" },
      "baidu-qianfan": { label: "百度千帆", endpoint: "https://qianfan.baidubce.com/v2/chat/completions" },
      "volcengine-ark": { label: "火山引擎方舟", endpoint: "https://ark.cn-beijing.volces.com/api/v3/chat/completions" },
      "siliconflow": { label: "硅基流动", endpoint: "https://api.siliconflow.cn/v1/chat/completions" },
      openrouter: { label: "OpenRouter", endpoint: "https://openrouter.ai/api/v1/chat/completions" }
    };
    const endpoint = String(item.endpoint || providerDefaults?.[providerId]?.endpoint || "").trim();
    const providerLabel = String(item.providerLabel || providerDefaults?.[providerId]?.label || providerId || "云端平台").trim();
    setPublicCloudLlm({
      id: "public-cloud-llm",
      isPublicShared: true,
      enabled: true,
      name: String(item.name || item.modelLabel || item.modelId || "公用云端大模型").trim() || "公用云端大模型",
      providerId,
      providerLabel,
      model: String(item.modelId || item.model || "").trim(),
      endpoint,
      apiKey: String(item.apiKey || "").trim(),
      abilities: Array.isArray(item.abilities) ? item.abilities : [],
      moduleKeys: Array.isArray(item.moduleKeys) ? item.moduleKeys : ["copy", "hotcopy", "meta", "ipbrain"],
      summary: String(item.summary || "").trim(),
      badge: String(item.badge || "公用").trim(),
      catalogModelLabel: String(item.modelLabel || item.modelId || item.model || "").trim(),
      systemPrompt: String(item.systemPrompt || "").trim(),
      updatedAt: String(item.updatedAt || res?.updatedAt || "").trim()
    });
    return { ok: true, item };
  } catch (e) {
    if (silent !== true) topToast(String(e?.message || e || "公用云端大模型同步失败"), { type: "warn" });
    return { ok: false, message: String(e?.message || e) };
  }
}

async function pollMenuVisibilityTick() {
  if (!detectionConfig.enabled) return;
  const res = await loadMenuVisibilityFromCloud({ persist: false });
  const cloudUpdatedAt = String(res?.updatedAt || "").trim();
  const localUpdatedAt = String(detectionConfig.lastMenuUpdatedAt || menuUpdatedAt || "").trim();
  const changed = !!cloudUpdatedAt && cloudUpdatedAt !== localUpdatedAt;
  if (changed && res?.ok) {
    await applyMenuVisibilityResult(res, { persist: true });
    topToast("菜单配置已同步更新。", { type: "success" });
    return;
  }
  await writeDetectionConfig({
    lastSyncAt: new Date().toISOString(),
    lastMenuUpdatedAt: cloudUpdatedAt || localUpdatedAt || null
  });
}

function startMenuDetectionTimer() {
  try {
    if (menuPollTimer) window.clearInterval(menuPollTimer);
  } catch {}
  menuPollTimer = 0;
  if (!detectionConfig.enabled) return;
  const intervalMs = Math.max(3000, Number(detectionConfig.intervalMs || 10000) || 10000);
  menuPollTimer = window.setInterval(() => {
    pollMenuVisibilityTick().catch(() => {});
  }, intervalMs);
}

function startIdentityAccessDetectionTimer() {
  try {
    if (identityAccessPollTimer) window.clearInterval(identityAccessPollTimer);
  } catch {}
  identityAccessPollTimer = 0;
  identityAccessPollTimer = window.setInterval(() => {
    pollIdentityAccessTick().catch(() => {});
  }, IDENTITY_ACCESS_POLL_MS);
}

function formatRemaining(ms) {
  if (!ms || ms <= 0) return "0分钟";
  const minutes = Math.ceil(ms / 60000);
  if (minutes < 60) return `${minutes}分钟`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}小时${m}分钟` : `${h}小时`;
}

function renderLicenseBadge() {
  const wrap = document.getElementById("topbar-license");
  const el = document.getElementById("license-badge");
  if (!el || !wrap) return;
  const auth = readAuth();
  if (!auth) {
    wrap.hidden = true;
    return;
  }
  const endAt = auth.trialEndAt || null;
  const endMs = toMs(endAt);
  const remainingMs = endMs ? Math.max(0, endMs - Date.now()) : 0;
  el.textContent = remainingMs > 0 ? `剩余使用时间：${formatRemaining(remainingMs)}` : "剩余使用时间：已到期";
  el.title = endAt ? `到期时间：${String(endAt)}` : "";
  wrap.hidden = false;
}

function clearAuthAndBackToLogin(reason) {
  try {
    localStorage.removeItem("auth.user");
  } catch {}
  window.api?.openClaw?.setSessionAuth?.({ ready: false }).catch?.(() => {});
  syncRuntimeAuthUser().catch(() => {});
  try {
    sessionStorage.setItem("auth.logoutReason", String(reason || "").trim());
  } catch {}
  if (window.location.hash !== "#/login") window.location.hash = "#/login";
}

let _lastSessionTokenVerifyAt = 0;

async function verifySessionTokenTick(auth) {
  const a = auth && typeof auth === "object" ? auth : readAuth();
  if (!a) return true;
  if (!a.sessionToken || !a.account || !a.deviceId) return true;
  if (Date.now() - _lastSessionTokenVerifyAt < 60 * 1000) return true;
  const baseUrl = String(localStorage.getItem(CLOUD_SESSION_TOKEN_URL_KEY) || "").trim();
  const url = buildCloudMethodUrl(baseUrl, "verify");
  if (!url) return true;
  _lastSessionTokenVerifyAt = Date.now();
  const res = await window.api?.cloudAuth?.verifySessionToken?.({
    url,
    token: "",
    body: { account: String(a.account || ""), deviceId: String(a.deviceId || ""), token: String(a.sessionToken || "") }
  });
  if (!res || res.errCode || res.ok !== true) {
    clearAuthAndBackToLogin(String(res?.errMsg || "登录已失效，请重新登录。"));
    topToast("登录已失效，已退出登录。", { type: "warn" });
    return false;
  }
  return true;
}

function checkAuthExpiryTick() {
  const auth = readAuth();
  if (!auth) return;
  const licenseEndAt = auth.trialEndAt || null;
  const licenseEndMs = toMs(licenseEndAt);
  if (licenseEndMs && Date.now() > licenseEndMs) {
    clearAuthAndBackToLogin("使用时间已到期，请重新登录后再使用。");
    topToast("使用时间已到期，已退出登录。", { type: "warn" });
    return;
  }
  const tokenEndMs = toMs(auth.sessionTokenEndAt);
  if (tokenEndMs && Date.now() > tokenEndMs) {
    clearAuthAndBackToLogin("登录凭证已过期，请重新登录。");
    topToast("登录凭证已过期，已退出登录。", { type: "warn" });
    return;
  }
  verifySessionTokenTick(auth).catch(() => {});
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, Math.max(0, Number(ms || 0) || 0)));
}

function formatAppUpdateBytes(value) {
  const bytes = Math.max(0, Number(value || 0) || 0);
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const idx = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const size = bytes / 1024 ** idx;
  return `${size >= 100 || idx === 0 ? size.toFixed(0) : size.toFixed(1)} ${units[idx]}`;
}

function getAppUpdateInstallViewModel(state = {}) {
  const updateMode = String(state?.updateMode || "").trim();
  const phase = String(state?.installPhase || "").trim();
  const latestVersion = String(state?.latestVersion || "").trim();
  const progress = Math.max(0, Math.min(100, Number(state?.progress || 0) || 0));
  const phaseDefs =
    updateMode === "binary-diff"
      ? [
          { key: "merge", label: "合并新安装包", desc: "正在基于差分包生成完整安装器" },
          { key: "prepare-installer", label: "准备安装助手", desc: "正在启动静默安装助手" },
          { key: "spawn-helper", label: "接管自动安装", desc: "安装助手已经接管后续流程" },
          { key: "handoff", label: "退出旧版本", desc: "旧版本退出后继续自动覆盖安装" }
        ]
      : [
          { key: "prepare", label: "校验安装包", desc: "正在确认安装包可直接执行" },
          { key: "spawn-helper", label: "准备安装助手", desc: "正在启动静默安装助手" },
          { key: "handoff", label: "退出旧版本", desc: "旧版本退出后继续自动覆盖安装" }
        ];
  let activeIndex = phaseDefs.findIndex((item) => item.key === phase);
  if (activeIndex < 0) {
    if (progress >= 90) activeIndex = Math.max(phaseDefs.length - 1, 0);
    else if (progress >= 55) activeIndex = Math.max(phaseDefs.length - 2, 0);
    else activeIndex = 0;
  }
  const steps = phaseDefs.map((item, idx) => ({
    ...item,
    state: idx < activeIndex ? "done" : idx === activeIndex ? "active" : "pending"
  }));
  const currentStep = steps[activeIndex] || steps[0] || { label: "自动安装", desc: "" };
  return {
    title: latestVersion ? `正在自动安装 v${latestVersion}` : "正在自动安装更新",
    subtitle: currentStep.desc || "安装器已接管后续流程，软件会在完成后自动重启。",
    detail:
      String(state?.installDetail || state?.message || "").trim() ||
      "请保持当前窗口不动，软件会自动完成安装并重新启动。",
    progress,
    progressText: `${Math.max(1, Math.round(progress))}%`,
    steps
  };
}

function renderAppUpdateInstallOverlay(state = {}) {
  const overlay = document.getElementById("app-update-install-overlay");
  const titleEl = document.getElementById("app-update-install-title");
  const subtitleEl = document.getElementById("app-update-install-subtitle");
  const progressLabelEl = document.getElementById("app-update-install-progress-label");
  const progressValueEl = document.getElementById("app-update-install-progress-value");
  const fillEl = document.getElementById("app-update-install-fill");
  const stepsEl = document.getElementById("app-update-install-steps");
  const detailEl = document.getElementById("app-update-install-detail");
  if (!overlay || !titleEl || !subtitleEl || !progressLabelEl || !progressValueEl || !fillEl || !stepsEl || !detailEl) return;
  const stage = String(state?.stage || "idle").trim() || "idle";
  if (stage !== "installing") {
    overlay.hidden = true;
    overlay.classList.remove("is-visible");
    fillEl.style.width = "0%";
    stepsEl.innerHTML = "";
    return;
  }
  const view = getAppUpdateInstallViewModel(state);
  overlay.hidden = false;
  overlay.classList.add("is-visible");
  titleEl.textContent = view.title;
  subtitleEl.textContent = view.subtitle;
  progressLabelEl.textContent = "安装进度";
  progressValueEl.textContent = view.progressText;
  fillEl.style.width = `${view.progress}%`;
  detailEl.textContent = view.detail;
  stepsEl.innerHTML = view.steps
    .map(
      (item) => `
        <div class="app-update-install-step is-${item.state}">
          <span class="app-update-install-step-dot"></span>
          <span class="app-update-install-step-text">${item.label}</span>
        </div>
      `
    )
    .join("");
}

function renderGlobalAppUpdateState(state = {}) {
  const host = document.getElementById("global-live-status");
  if (!host) return;
  const stage = String(state?.stage || "idle").trim() || "idle";
  renderAppUpdateInstallOverlay(state || { stage: "idle" });
  if (stage === "idle") {
    host.hidden = true;
    host.className = "global-live-status";
    host.textContent = "";
    return;
  }
  if (stage === "installing") {
    host.hidden = true;
    host.className = "global-live-status";
    host.textContent = "";
    return;
  }
  const progress = Math.max(0, Math.min(100, Number(state?.progress || 0) || 0));
  const receivedBytes = Math.max(0, Number(state?.receivedBytes || 0) || 0);
  const totalBytes = Math.max(0, Number(state?.totalBytes || 0) || 0);
  const isIndeterminate = stage === "downloading" && (state?.isProgressIndeterminate === true || (totalBytes <= 0 && receivedBytes > 0));
  const latestVersion = String(state?.latestVersion || "").trim();
  const artifactName = String(state?.artifactName || "").trim();
  const updateMode = String(state?.updateMode || "").trim();
  const tone = stage === "error" ? "warn" : stage === "installing" ? "success" : "info";
  let title = "更新状态";
  let subtitle = "";
  let fillPct = progress;
  if (stage === "downloading") {
    if (updateMode === "binary-diff") {
      const downloadKind = String(state?.downloadKind || "").trim();
      title =
        downloadKind === "base-installer"
          ? latestVersion
            ? `正在为 v${latestVersion} 下载基线安装包`
            : "正在下载差分基线安装包"
          : downloadKind === "patch-file"
            ? latestVersion
              ? `正在为 v${latestVersion} 下载差分包`
              : "正在下载差分包"
            : latestVersion
              ? `正在为 v${latestVersion} 下载差分更新资源`
              : "正在下载差分更新资源";
    } else {
      title = latestVersion ? `正在下载 v${latestVersion}` : "正在下载完整安装包";
    }
    subtitle = totalBytes > 0 ? `${progress.toFixed(1)}% · ${formatAppUpdateBytes(receivedBytes)} / ${formatAppUpdateBytes(totalBytes)}` : formatAppUpdateBytes(receivedBytes);
  } else if (stage === "error") {
    title = "更新失败";
    subtitle = String(state?.errorMessage || state?.message || "请稍后重试。");
  }
  if (artifactName && stage !== "error") {
    subtitle = subtitle ? `${subtitle} · ${artifactName}` : artifactName;
  }
  host.hidden = false;
  host.className = `global-live-status global-update-live is-${tone}`;
  host.innerHTML = `
    <div class="global-update-live-body">
      <div class="global-update-live-title">${title}</div>
      <div class="global-update-live-sub">${subtitle}</div>
      <div class="global-update-live-track${isIndeterminate ? " is-indeterminate" : ""}">
        <span class="global-update-live-fill${isIndeterminate ? " is-indeterminate" : ""}" style="width:${isIndeterminate ? 100 : fillPct}%"></span>
      </div>
    </div>
  `;
}

function bindAppUpdateState(state = {}) {
  renderGlobalAppUpdateState(state || { stage: "idle" });
  const stage = String(state?.stage || "idle").trim() || "idle";
  const msg = String(state?.errorMessage || state?.message || "").trim();
  const toastKey = `${stage}:${msg}`;
  if (stage === "error" && msg && _lastAppUpdateToastKey !== toastKey) {
    _lastAppUpdateToastKey = toastKey;
    topToast(msg, { type: "error" });
  }
}

function ensureAppUpdateStateSubscription() {
  if (_appUpdateStateUnsubscribe) return;
  _appUpdateStateUnsubscribe = window.api?.appUpdate?.onState?.((state) => {
    bindAppUpdateState(state || { stage: "idle" });
  });
  window.api?.appUpdate?.getState?.()
    .then((res) => bindAppUpdateState(res?.state || { stage: "idle" }))
    .catch(() => {});
}

async function normalizeAppUpdateConfigForIdentity(config = {}) {
  return config && typeof config === "object" ? config : {};
}

async function checkAppUpdateOnLaunch() {
  if (_appUpdateCheckedThisBoot) return;
  _appUpdateCheckedThisBoot = true;
  try {
    const configRes = await window.api?.appUpdate?.readConfig?.();
    const config = await normalizeAppUpdateConfigForIdentity(configRes?.config || {});
    if (config?.autoCheckOnLaunch === false) return;
    const syncRes = await window.api?.appUpdate?.syncFromCloud?.({ scene: "desktop" }).catch?.(() => null);
    if (!syncRes?.ok) return;
    const res = await window.api?.appUpdate?.check?.({ forceSync: false });
    if (res?.unsupportedContext) return;
    if (!res?.ok || !res?.hasUpdate) return;
    const forceUpdate = res?.forceUpdate === true;
    if (!forceUpdate) {
      const confirm = await confirmDialog({
        title: "发现新版本",
        message: `当前版本：v${String(res?.currentVersion || "")}\n最新版本：v${String(res?.latestVersion || "")}\n${String(res?.notes || "").trim() || "检测到可用更新，是否立即下载完整安装包并执行覆盖安装？"}`,
        confirmText: "立即下载并安装",
        cancelText: "稍后再说"
      });
      if (!confirm) {
        topToast(`发现新版本 v${String(res?.latestVersion || "")}，可在设置里再次检查更新。`, { type: "info" });
        return;
      }
    } else {
      topToast(`检测到强制更新 v${String(res?.latestVersion || "")}，正在开始下载。`, { type: "warn" });
    }
    const installRes = await window.api?.appUpdate?.downloadAndInstall?.({
      downloadUrl: String(res?.downloadUrl || ""),
      artifactName: String(res?.artifactName || res?.raw?.manifest?.artifactName || ""),
      latestVersion: String(res?.latestVersion || ""),
      size: Math.max(0, Number(res?.size || res?.raw?.manifest?.size || 0) || 0),
      sha512: String(res?.sha512 || res?.raw?.manifest?.sha512 || ""),
      providerBaseUrl: String(res?.providerBaseUrl || ""),
      manifestOnly: res?.manifestOnly === true
    });
    if (!installRes?.ok) {
      topToast(String(installRes?.message || "启动更新失败。"), { type: "warn" });
      return;
    }
    bindAppUpdateState(installRes?.state || { stage: "downloading" });
    topToast("完整安装包更新已开始。", { type: "success" });
  } catch {}
}

function markActiveNav(path) {
  document.querySelectorAll(".nav-item[data-route]").forEach((el) => {
    if (el.getAttribute("data-route") === path) el.setAttribute("aria-current", "page");
    else el.removeAttribute("aria-current");
  });
}

applyTheme();
setInterval(renderLicenseBadge, 1000);
setInterval(checkAuthExpiryTick, 2000);

const router = createRouter({
  routes,
  outletId: "route-outlet",
  resolvePath: ({ path }) => {
    if (path === NO_ACCESS_PATH || path === "/login") return path;
    if (!isMenuVisible(path)) return getBlockedRoutePath(path);
    return path;
  },
  onRouteChange: ({ path, title }) => {
    updateAppShellDisplayMode(path);
    updateWindowControlsLayout(path);
    const titleEl = document.getElementById("app-title");
    if (titleEl) titleEl.textContent = title || "不空IP智能体";
    document.title = title ? `${title} - 不空IP智能体` : "不空IP智能体";
    if (path !== "/login") markActiveNav(path);
    else markActiveNav("");
  }
});

renderBootScreen();

Promise.resolve()
  .then(async () => {
    const bootStartedAt = Date.now();
    updateBootStatus("正在读取本地配置...");
    await Promise.allSettled([
      readDetectionConfig(),
      ensureDefaultOutputDir()
    ]);
    updateBootStatus("正在读取本地域名...");
    const local = await window.api?.domain?.read?.();
    if (local?.ok && local.domain) applyCloudDomainToLocalStorage(local.domain);
    startMenuDetectionTimer();
    const remaining = BOOT_MIN_DURATION_MS - (Date.now() - bootStartedAt);
    if (remaining > 0) await wait(remaining);
  })
  .catch(() => {
    startMenuDetectionTimer();
  })
  .finally(async () => {
    let forceLoginOnBoot = false;
    try {
      const runtimeInfo = await window.api?.app?.getRuntimeInfo?.().catch(() => null);
      forceLoginOnBoot = runtimeInfo?.ok === true && runtimeInfo?.isPackaged !== true;
    } catch {}
    await leaveBootScreen();
    createAppShell({ entering: true });
    ensureAppUpdateStateSubscription();
    startIdentityAccessDetectionTimer();
    renderSidebarMenus();
    renderBadge();
    renderLicenseBadge();
    if (forceLoginOnBoot && window.location.hash !== "#/login") {
      window.location.hash = "#/login";
    }
    router.start();
    setTimeout(() => {
      runStartupBackgroundSync().catch(() => {});
      checkAppUpdateOnLaunch().catch(() => {});
    }, 0);
  });

window.addEventListener("focus", () => {
  refreshAuthProfile().catch(() => null);
  refreshIdentityAccess({ dispatch: true }).catch(() => null);
  loadMenuVisibilityFromCloud({ silent: true }).catch(() => {});
  syncPublicCloudLlmFromCloud({ silent: true }).catch(() => {});
});

window.addEventListener("ipfactory:authChanged", async (event) => {
  const changeType = String(event?.detail?.type || "").trim();
  if (changeType === "login") {
    await window.api?.openClaw?.setSessionAuth?.({ ready: true }).catch(() => null);
  } else if (changeType === "logout") {
    await window.api?.openClaw?.setSessionAuth?.({ ready: false }).catch(() => null);
  }
  await syncRuntimeAuthUser().catch(() => null);
  ensurePageModuleCloudDefaults().catch(() => {});
  await syncPublicCloudLlmFromCloud({ silent: true }).catch(() => null);
  await refreshIdentityAccess({ dispatch: false }).catch(() => null);
  await loadMenuVisibilityFromCloud({ silent: false }).catch(() => null);
  renderSidebarMenus();
  const currentPath = getCurrentRoutePath();
  if (currentPath !== "/login" && !isMenuVisible(currentPath)) {
    window.location.hash = `#${getBlockedRoutePath(currentPath)}`;
  }
  renderLicenseBadge();
});

syncRuntimeAuthUser().catch(() => {});

window.addEventListener("ipfactory:outputDirChanged", () => {
  renderBadge();
});
