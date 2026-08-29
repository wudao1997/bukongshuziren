import { elFromHTML, topToast } from "../ui.js";
import { checkRegisterLimit, getRegisterLimiterIp, recordRegisterAttempt } from "../../../zhucexianzhi.js";
import { buildIdentityAccessFromProfile, fetchIdentityAccess } from "../gongneng/shenfenquanxian.js";

const AUTH_STORAGE_KEY = "auth.user";
const AUTH_REDIRECT_KEY = "auth.redirectAfterLogin";
const REMEMBER_KEY = "auth.remember.v1";
const SAVED_ACCOUNT_KEY = "auth.savedAccount.v1";
const SAVED_PASSWORD_KEY = "auth.savedPassword.v1";
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
  menu: "qd-caidan"
};

function readAuth() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.userId) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeAuth(user) {
  const u = user && typeof user === "object" ? user : {};
  if (!u.userId) return null;
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(u));
  return u;
}

function patchAuth(patch) {
  const current = readAuth() || {};
  return writeAuth({ ...current, ...(patch && typeof patch === "object" ? patch : {}) });
}

function clearAuth() {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {}
}

function readRemember() {
  try {
    return localStorage.getItem(REMEMBER_KEY) === "1";
  } catch {
    return false;
  }
}

function writeRemember(enabled) {
  try {
    localStorage.setItem(REMEMBER_KEY, enabled ? "1" : "0");
  } catch {}
}

function readSavedAccount() {
  try {
    return String(localStorage.getItem(SAVED_ACCOUNT_KEY) || "").trim();
  } catch {
    return "";
  }
}

function writeSavedAccount(account) {
  try {
    localStorage.setItem(SAVED_ACCOUNT_KEY, String(account || "").trim());
  } catch {}
}

function readSavedPasswordEnc() {
  try {
    return String(localStorage.getItem(SAVED_PASSWORD_KEY) || "").trim();
  } catch {
    return "";
  }
}

function writeSavedPasswordEnc(enc) {
  try {
    localStorage.setItem(SAVED_PASSWORD_KEY, String(enc || "").trim());
  } catch {}
}

function clearSavedCredentials() {
  try {
    localStorage.removeItem(SAVED_ACCOUNT_KEY);
  } catch {}
  try {
    localStorage.removeItem(SAVED_PASSWORD_KEY);
  } catch {}
  writeRemember(false);
}

function readCloudConfig() {
  const loginUrl = String(localStorage.getItem(CLOUD_LOGIN_URL_KEY) || "").trim();
  const registerUrl = String(localStorage.getItem(CLOUD_REGISTER_URL_KEY) || "").trim();
  const profileUrl = String(localStorage.getItem(CLOUD_PROFILE_URL_KEY) || "").trim();
  const kamiUrl = String(localStorage.getItem(CLOUD_KAMI_URL_KEY) || "").trim();
  const sessionTokenUrl = String(localStorage.getItem(CLOUD_SESSION_TOKEN_URL_KEY) || "").trim();
  const machineUrl = String(localStorage.getItem(CLOUD_MACHINE_URL_KEY) || "").trim();
  const menuUrl = String(localStorage.getItem(CLOUD_MENU_URL_KEY) || "").trim();
  const tokenEnc = String(localStorage.getItem(CLOUD_TOKEN_KEY) || "").trim();
  return { loginUrl, registerUrl, profileUrl, kamiUrl, sessionTokenUrl, machineUrl, menuUrl, tokenEnc };
}

async function readCloudTokenText(tokenEnc) {
  const enc = String(tokenEnc || "").trim();
  if (!enc) return "";
  try {
    const dec = await window.api?.auth?.safeDecrypt?.({ data: enc });
    if (dec?.ok && typeof dec.text === "string") return dec.text;
  } catch {}
  return "";
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

function getCloudErrorMessage(res, fallback) {
  if (typeof res === "string" && res.trim()) return res.trim();
  const msg =
    String(res?.errMsg || "").trim() ||
    String(res?.message || "").trim() ||
    String(res?.errMessage || "").trim() ||
    String(res?.msg || "").trim();
  if (msg) return msg;
  if (res?.raw) return "云端返回异常（请检查URL化PATH/是否已上传部署/是否同一个服务空间）";
  return fallback;
}

function isCloudSuccess(res) {
  if (!res) return false;
  if (res.ok === true) return true;
  if (res.errCode === 0 || res.errCode === "0") return true;
  return false;
}

function getRedirectAfterLogin() {
  try {
    const raw = sessionStorage.getItem(AUTH_REDIRECT_KEY);
    const p = String(raw || "").trim();
    return p && p.startsWith("/") ? p : "";
  } catch {
    return "";
  }
}

function setRedirectAfterLogin(path) {
  try {
    const p = String(path || "").trim();
    if (!p || !p.startsWith("/")) return;
    sessionStorage.setItem(AUTH_REDIRECT_KEY, p);
  } catch {}
}

function clearRedirectAfterLogin() {
  try {
    sessionStorage.removeItem(AUTH_REDIRECT_KEY);
  } catch {}
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

function isDomainOnlyUrl(url) {
  try {
    const u = new URL(normalizeUrlForParse(url));
    const p = String(u.pathname || "").replace(/\/+$/, "");
    return !p || p === "/";
  } catch {
    return false;
  }
}

function normalizeUrlForParse(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw.replace(/^\/+/, "")}`;
}

function getUrlOrigin(url) {
  try {
    const u = new URL(normalizeUrlForParse(url));
    return `${u.protocol}//${u.host}`;
  } catch {
    return "";
  }
}

function normalizePathname(url) {
  try {
    const u = new URL(normalizeUrlForParse(url));
    return String(u.pathname || "").replace(/\/+$/, "");
  } catch {
    return "";
  }
}

function isCloudObjectBasePath(url, objectName) {
  const p = normalizePathname(url);
  if (!p) return false;
  const expected = `/${String(objectName || "").trim().replace(/^\/+/, "")}`.replace(/\/+$/, "");
  return p.toLowerCase() === expected.toLowerCase();
}

function getCloudObjectUrlMode(url, objectName) {
  const p = normalizePathname(url);
  if (!p) return "";
  const obj = String(objectName || "").trim().replace(/^\/+/, "");
  const plain = `/${obj}`.replace(/\/+$/, "").toLowerCase();
  const http = `/http/${obj}`.replace(/\/+$/, "").toLowerCase();
  const low = p.toLowerCase();
  if (low === plain) return "plain";
  if (low === http) return "http";
  return "";
}

function applyCloudDomainToLocalStorageWithMode(origin, mode) {
  const d = normalizeDomain(origin);
  if (!d) return false;
  const prefix = mode === "http" ? `${d}/http` : d;
  try {
    localStorage.setItem(CLOUD_LOGIN_URL_KEY, `${prefix}/${CLOUD_OBJECTS.login}`);
    localStorage.setItem(CLOUD_REGISTER_URL_KEY, `${prefix}/${CLOUD_OBJECTS.register}`);
    localStorage.setItem(CLOUD_PROFILE_URL_KEY, `${prefix}/${CLOUD_OBJECTS.profile}`);
    localStorage.setItem(CLOUD_KAMI_URL_KEY, `${prefix}/${CLOUD_OBJECTS.kami}`);
    localStorage.setItem(CLOUD_SESSION_TOKEN_URL_KEY, `${prefix}/${CLOUD_OBJECTS.sessionToken}`);
    localStorage.setItem(CLOUD_MACHINE_URL_KEY, `${prefix}/${CLOUD_OBJECTS.machine}`);
    localStorage.setItem(CLOUD_MENU_URL_KEY, `${prefix}/${CLOUD_OBJECTS.menu}`);
    return true;
  } catch {
    return false;
  }
}

async function ensureCloudConfigured() {
  const cfg = readCloudConfig();
  if (cfg.loginUrl && cfg.registerUrl && cfg.profileUrl && cfg.kamiUrl && cfg.sessionTokenUrl && cfg.machineUrl && cfg.menuUrl) {
    const candidate = [cfg.loginUrl, cfg.registerUrl, cfg.profileUrl, cfg.kamiUrl, cfg.sessionTokenUrl, cfg.machineUrl, cfg.menuUrl].find(isDomainOnlyUrl);
    if (candidate) {
      applyCloudDomainToLocalStorage(candidate);
      const fixed = readCloudConfig();
      if (fixed.loginUrl && fixed.registerUrl && fixed.profileUrl && fixed.kamiUrl && fixed.sessionTokenUrl && fixed.machineUrl && fixed.menuUrl) return true;
    } else {
      const urls = {
        loginUrl: cfg.loginUrl,
        registerUrl: cfg.registerUrl,
        profileUrl: cfg.profileUrl,
        kamiUrl: cfg.kamiUrl,
        sessionTokenUrl: cfg.sessionTokenUrl,
        machineUrl: cfg.machineUrl,
        menuUrl: cfg.menuUrl
      };
      const origin = Object.values(urls).map(getUrlOrigin).find(Boolean) || "";
      const modeLogin = getCloudObjectUrlMode(urls.loginUrl, CLOUD_OBJECTS.login);
      const modeRegister = getCloudObjectUrlMode(urls.registerUrl, CLOUD_OBJECTS.register);
      const modeProfile = getCloudObjectUrlMode(urls.profileUrl, CLOUD_OBJECTS.profile);
      const modeKami = getCloudObjectUrlMode(urls.kamiUrl, CLOUD_OBJECTS.kami);
      const modeToken = getCloudObjectUrlMode(urls.sessionTokenUrl, CLOUD_OBJECTS.sessionToken);
      const modeMachine = getCloudObjectUrlMode(urls.machineUrl, CLOUD_OBJECTS.machine);
      const modeMenu = getCloudObjectUrlMode(urls.menuUrl, CLOUD_OBJECTS.menu);
      const modes = [modeLogin, modeRegister, modeProfile, modeKami, modeToken, modeMachine, modeMenu].filter(Boolean);
      const sameMode = modes.length === 7 && modes.every((m) => m === modes[0]);
      if (sameMode) return true;
      if (origin) {
        applyCloudDomainToLocalStorage(origin);
        const fixed = readCloudConfig();
        if (fixed.loginUrl && fixed.registerUrl && fixed.profileUrl && fixed.kamiUrl && fixed.sessionTokenUrl && fixed.machineUrl && fixed.menuUrl) return true;
      }
    }
  }
  try {
    const local = await window.api?.domain?.read?.();
    if (local?.ok && local.domain) applyCloudDomainToLocalStorage(local.domain);
  } catch {}
  const cfg2 = readCloudConfig();
  if (cfg2.loginUrl && cfg2.registerUrl && cfg2.profileUrl && cfg2.kamiUrl && cfg2.sessionTokenUrl && cfg2.machineUrl && cfg2.menuUrl) return true;
  window.location.hash = "#/settings";
  return false;
}

export const route = {
  path: "/login",
  title: "用户登录",
  cache: false,
  render: async () => {
    const root = elFromHTML(`
      <div class="login-page">
        <div class="login-card">
          <div class="login-brand">
            <div class="login-title">IP工厂智能体</div>
            <div class="login-subtitle">登录后开始使用全部功能</div>
          </div>

          <div class="login-status" id="login-status" hidden></div>

          <div class="form">
            <div class="field">
              <div class="label">账号</div>
              <input type="text" id="login-account" placeholder="请输入账号（必填）" />
            </div>
            <div class="field">
              <div class="label">密码</div>
              <input type="password" id="login-password" placeholder="请输入密码（必填）" />
            </div>
            <div class="login-row">
              <label class="login-check">
                <input type="checkbox" id="login-remember" />
                <span>记住账号密码</span>
              </label>
            </div>
          </div>

          <div class="login-actions">
            <button class="btn btn-primary btn-wide" id="login-submit">登录</button>
            <button class="btn btn-soft" id="login-register">注册</button>
          </div>

          <div class="login-actions" style="margin-top: 10px">
            <button class="btn" id="login-redeem">卡密充值</button>
            <button class="btn" id="login-machine">换绑/添加机器</button>
          </div>
        </div>

        <div id="login-sync-overlay" hidden style="position: fixed; inset: 0; background: rgba(248,250,252,0.92); backdrop-filter: blur(10px); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 24px;">
          <div style="width: min(460px, 92vw); border-radius: 24px; background: #fff; box-shadow: 0 24px 80px rgba(15,23,42,0.14); padding: 28px 26px; text-align: center;">
            <div style="width: 62px; height: 62px; margin: 0 auto 16px; border-radius: 50%; border: 4px solid rgba(99,102,241,0.12); border-top-color: #6366f1; animation: loginSyncSpin 0.9s linear infinite;"></div>
            <div style="font-size: 20px; font-weight: 700; color: #111827;">登录成功，正在同步</div>
            <div id="login-sync-status" style="margin-top: 10px; font-size: 14px; color: #6b7280;">正在准备账号资料...</div>
            <div style="margin-top: 18px; height: 8px; border-radius: 999px; background: #eef2ff; overflow: hidden;">
              <div id="login-sync-progress" style="width: 28%; height: 100%; border-radius: 999px; background: linear-gradient(90deg, #6366f1, #8b5cf6); transition: width 0.24s ease;"></div>
            </div>
          </div>
        </div>
        <div class="modal-overlay" id="force-pwd-overlay" hidden></div>
        <div class="modal" id="force-pwd-modal" hidden>
          <div class="modal-head">
            <div class="modal-title">首次登录请修改密码</div>
          </div>
          <div class="modal-body">
            <div class="form">
              <div class="hint">后台已重置当前账号密码，请先设置新的登录密码后再进入软件。</div>
              <div class="field">
                <div class="label">新密码</div>
                <input type="password" id="force-pwd-new" placeholder="请输入新的登录密码" />
              </div>
              <div class="field">
                <div class="label">确认新密码</div>
                <input type="password" id="force-pwd-confirm" placeholder="请再次输入新的登录密码" />
              </div>
            </div>
          </div>
          <div class="modal-foot">
            <button class="btn" id="force-pwd-logout">退出登录</button>
            <button class="btn btn-primary" id="force-pwd-submit">确认修改</button>
          </div>
        </div>
        <style>
          @keyframes loginSyncSpin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        </style>

        <div class="modal-overlay" id="reg-overlay" hidden></div>
        <div class="modal" id="reg-modal" hidden>
          <div class="modal-head">
            <div class="modal-title">注册账号</div>
            <button class="modal-close" id="reg-close" title="关闭">×</button>
          </div>
          <div class="modal-body">
            <div class="form">
              <div class="field">
                <div class="label">账号</div>
                <input type="text" id="reg-account" placeholder="请输入账号（必填）" />
              </div>
              <div class="field">
                <div class="label">密码</div>
                <input type="password" id="reg-password" placeholder="请输入密码（必填）" />
              </div>
              <div class="field">
                <div class="label">确认密码</div>
                <input type="password" id="reg-password2" placeholder="请再次输入密码（必填）" />
              </div>
              <div class="field">
                <div class="label">手机号</div>
                <input type="text" id="reg-phone" placeholder="请输入手机号（必填）" />
              </div>
              <div class="field">
                <div class="label">邮箱（可选）</div>
                <input type="text" id="reg-email" placeholder="用于找回密码" />
              </div>
            </div>
          </div>
          <div class="modal-foot">
            <button class="btn" id="reg-cancel">取消</button>
            <button class="btn btn-primary" id="reg-submit">注册</button>
          </div>
        </div>

        <div class="modal-overlay" id="kami-overlay" hidden></div>
        <div class="modal" id="kami-modal" hidden>
          <div class="modal-head">
            <div class="modal-title">卡密充值</div>
            <button class="modal-close" id="kami-close" title="关闭">×</button>
          </div>
          <div class="modal-body">
            <div class="form">
              <div class="field">
                <div class="label">账号</div>
                <input type="text" id="kami-account" placeholder="请输入账号" />
              </div>
              <div class="field">
                <div class="label">卡密</div>
                <input type="text" id="kami-code" placeholder="请输入卡密" />
              </div>
              <div class="hint">验证成功后会自动增加本账号在本机的使用时长。</div>
            </div>
          </div>
          <div class="modal-foot">
            <button class="btn" id="kami-cancel">取消</button>
            <button class="btn btn-primary" id="kami-submit">充值</button>
          </div>
        </div>

        <div class="modal-overlay" id="machine-overlay" hidden></div>
        <div class="modal" id="machine-modal" hidden>
          <div class="modal-head">
            <div class="modal-title">换绑/添加机器</div>
            <button class="modal-close" id="machine-close" title="关闭">×</button>
          </div>
          <div class="modal-body">
            <div class="form">
              <div class="field">
                <div class="label">本机机器码</div>
                <div class="hint mono machine-code-box" id="machine-device-code">读取中...</div>
              </div>
              <div class="field">
                <div class="label">账号</div>
                <input type="text" id="machine-account" placeholder="请输入需要申请的账号" />
              </div>
              <div class="modal-tip">
                申请提交后会同步到云端等待管理员处理。管理员同意“换绑机器”后会清除旧机器码并改绑到当前机器；同意“添加机器”后会在原绑定基础上追加当前机器码。
              </div>
            </div>
          </div>
          <div class="modal-foot machine-modal-foot">
            <button class="btn" id="machine-cancel">取消</button>
            <button class="btn" id="machine-submit-add">申请添加机器</button>
            <button class="btn btn-primary" id="machine-submit-replace">申请换绑机器</button>
          </div>
        </div>
      </div>
    `);

    const inputAccount = root.querySelector("#login-account");
    const inputPassword = root.querySelector("#login-password");
    const btnSubmit = root.querySelector("#login-submit");
    const btnRegister = root.querySelector("#login-register");
    const btnRedeem = root.querySelector("#login-redeem");
    const btnMachine = root.querySelector("#login-machine");
    const chkRemember = root.querySelector("#login-remember");
    const statusEl = root.querySelector("#login-status");
    const loginSyncOverlay = root.querySelector("#login-sync-overlay");
    const loginSyncStatus = root.querySelector("#login-sync-status");
    const loginSyncProgress = root.querySelector("#login-sync-progress");
    const forcePwdOverlay = root.querySelector("#force-pwd-overlay");
    const forcePwdModal = root.querySelector("#force-pwd-modal");
    const forcePwdNew = root.querySelector("#force-pwd-new");
    const forcePwdConfirm = root.querySelector("#force-pwd-confirm");
    const forcePwdLogout = root.querySelector("#force-pwd-logout");
    const forcePwdSubmit = root.querySelector("#force-pwd-submit");

    const regOverlay = root.querySelector("#reg-overlay");
    const regModal = root.querySelector("#reg-modal");
    const regClose = root.querySelector("#reg-close");
    const regCancel = root.querySelector("#reg-cancel");
    const regSubmit = root.querySelector("#reg-submit");
    const regAccount = root.querySelector("#reg-account");
    const regPassword = root.querySelector("#reg-password");
    const regPassword2 = root.querySelector("#reg-password2");
    const regPhone = root.querySelector("#reg-phone");
    const regEmail = root.querySelector("#reg-email");

    const kamiOverlay = root.querySelector("#kami-overlay");
    const kamiModal = root.querySelector("#kami-modal");
    const kamiClose = root.querySelector("#kami-close");
    const kamiCancel = root.querySelector("#kami-cancel");
    const kamiSubmit = root.querySelector("#kami-submit");
    const kamiAccount = root.querySelector("#kami-account");
    const kamiCode = root.querySelector("#kami-code");

    const machineOverlay = root.querySelector("#machine-overlay");
    const machineModal = root.querySelector("#machine-modal");
    const machineClose = root.querySelector("#machine-close");
    const machineCancel = root.querySelector("#machine-cancel");
    const machineDeviceCode = root.querySelector("#machine-device-code");
    const machineAccount = root.querySelector("#machine-account");
    const machineSubmitAdd = root.querySelector("#machine-submit-add");
    const machineSubmitReplace = root.querySelector("#machine-submit-replace");

    const showLoginSyncOverlay = (text, progress) => {
      if (loginSyncOverlay) loginSyncOverlay.hidden = false;
      if (loginSyncStatus) loginSyncStatus.textContent = String(text || "").trim() || "正在同步账号信息...";
      if (loginSyncProgress) loginSyncProgress.style.width = `${Math.max(10, Math.min(100, Number(progress || 0) || 0))}%`;
    };

    const hideLoginSyncOverlay = () => {
      if (loginSyncOverlay) loginSyncOverlay.hidden = true;
    };

    const existing = readAuth();
    if (existing) {
      statusEl.hidden = false;
      statusEl.textContent = `已登录：${String(existing.account || "") || "未命名账号"}（本次仍会进入登录页）`;
    }

    try {
      const reason = String(sessionStorage.getItem("auth.logoutReason") || "").trim();
      if (reason) {
        statusEl.hidden = false;
        statusEl.textContent = reason;
        sessionStorage.removeItem("auth.logoutReason");
      }
    } catch {}

    const cloudCfg = readCloudConfig();
    if (!cloudCfg.loginUrl || !cloudCfg.profileUrl || !cloudCfg.kamiUrl || !cloudCfg.sessionTokenUrl || !cloudCfg.machineUrl || !cloudCfg.menuUrl) statusEl.hidden = false;
    if (!cloudCfg.loginUrl || !cloudCfg.profileUrl || !cloudCfg.kamiUrl || !cloudCfg.sessionTokenUrl || !cloudCfg.machineUrl || !cloudCfg.menuUrl) {
      statusEl.textContent = "未配置云端接口：请先在设置页配置云端域名（将自动生成登录/用户信息/卡密/token/机器管理/菜单云对象URL）。";
    }

    await ensureCloudConfigured();
    const cloudCfg2 = readCloudConfig();
    if (cloudCfg2.loginUrl && cloudCfg2.registerUrl && cloudCfg2.profileUrl && cloudCfg2.kamiUrl && cloudCfg2.sessionTokenUrl && cloudCfg2.machineUrl && cloudCfg2.menuUrl) {
      if (!existing) statusEl.hidden = true;
    }

    const rememberEnabled = readRemember();
    chkRemember.checked = rememberEnabled === true;
    if (rememberEnabled) {
      const savedAcc = readSavedAccount();
      if (savedAcc) inputAccount.value = savedAcc;
      const enc = readSavedPasswordEnc();
      if (enc) {
        try {
          const res = await window.api?.auth?.safeDecrypt?.({ data: enc });
          if (res?.ok && typeof res.text === "string") inputPassword.value = res.text;
        } catch {}
      }
    }

    const getDeviceId = async () => {
      try {
        const res = await window.api?.device?.getId?.();
        const id = String(res?.deviceId || "").trim();
        return id || "";
      } catch {
        return "";
      }
    };

    const saveRememberIfNeeded = async (passwordOverride = null) => {
      const enabled = chkRemember.checked === true;
      writeRemember(enabled);
      if (!enabled) {
        clearSavedCredentials();
        return;
      }
      writeSavedAccount(String(inputAccount.value || "").trim());
      const pwd = typeof passwordOverride === "string" ? passwordOverride : String(inputPassword.value || "");
      if (!pwd) return;
      try {
        const res = await window.api?.auth?.safeEncrypt?.({ text: pwd });
        if (res?.ok && res.data) {
          writeSavedPasswordEnc(res.data);
        } else {
          writeSavedPasswordEnc("");
          topToast("系统不支持安全加密：已记住账号，但不保存密码。", { type: "warn" });
        }
      } catch {
        writeSavedPasswordEnc("");
        topToast("保存密码失败：已记住账号，但不保存密码。", { type: "warn" });
      }
    };

    const forceChangePassword = async ({ account, deviceId, currentPassword }) =>
      new Promise((resolve) => {
        const show = () => {
          forcePwdNew.value = "";
          forcePwdConfirm.value = "";
          forcePwdOverlay.hidden = false;
          forcePwdModal.hidden = false;
          setTimeout(() => forcePwdNew.focus(), 0);
        };
        const close = () => {
          forcePwdOverlay.hidden = true;
          forcePwdModal.hidden = true;
        };
        const cleanup = () => {
          forcePwdSubmit.removeEventListener("click", onSubmit);
          forcePwdLogout.removeEventListener("click", onLogout);
          forcePwdConfirm.removeEventListener("keydown", onKeydown);
          forcePwdNew.removeEventListener("keydown", onKeydown);
        };
        const finish = (result) => {
          cleanup();
          close();
          resolve(result);
        };
        const onLogout = () => finish({ ok: false, aborted: true });
        const onKeydown = (e) => {
          if (e.key === "Enter") onSubmit();
        };
        const onSubmit = async () => {
          const newPassword = String(forcePwdNew.value || "");
          const confirmPassword = String(forcePwdConfirm.value || "");
          if (!newPassword) {
            topToast("请输入新的登录密码。", { type: "warn" });
            forcePwdNew.focus();
            return;
          }
          if (newPassword.length < 6) {
            topToast("新密码至少需要6位。", { type: "warn" });
            forcePwdNew.focus();
            return;
          }
          if (newPassword !== confirmPassword) {
            topToast("两次输入的新密码不一致。", { type: "warn" });
            forcePwdConfirm.focus();
            return;
          }
          forcePwdSubmit.disabled = true;
          forcePwdLogout.disabled = true;
          forcePwdSubmit.textContent = "修改中...";
          try {
            const cfg = readCloudConfig();
            const token = await readCloudTokenText(cfg.tokenEnc);
            const res = await window.api?.cloudAuth?.updateProfile?.({
              url: buildCloudMethodUrl(cfg.profileUrl, "updateProfile"),
              token,
              body: {
                account: String(account || "").trim(),
                deviceId: String(deviceId || "").trim(),
                currentPassword: String(currentPassword || ""),
                newPassword
              }
            });
            if (!res || res.errCode || res.ok !== true) {
              topToast(String(res?.errMsg || "修改密码失败"), { type: "error" });
              return;
            }
            inputPassword.value = newPassword;
            await saveRememberIfNeeded(newPassword);
            finish({ ok: true, newPassword });
          } finally {
            forcePwdSubmit.disabled = false;
            forcePwdLogout.disabled = false;
            forcePwdSubmit.textContent = "确认修改";
          }
        };
        forcePwdSubmit.addEventListener("click", onSubmit);
        forcePwdLogout.addEventListener("click", onLogout);
        forcePwdConfirm.addEventListener("keydown", onKeydown);
        forcePwdNew.addEventListener("keydown", onKeydown);
        show();
      });

    const cloudLogin = async ({ account, password, deviceId }) => {
      if (!(await ensureCloudConfigured())) return { ok: false, errMsg: "未配置云端接口" };
      const did = String(deviceId || "").trim() || (await getDeviceId());
      if (!did) return { ok: false, errMsg: "无法获取机器码" };
      const cfg = readCloudConfig();
      const baseUrl = String(cfg.loginUrl || "").trim();
      const url = buildCloudMethodUrl(baseUrl, "login");
      if (!url) return { ok: false, errMsg: "未配置云端登录接口URL" };
      let token = "";
      try {
        const dec = await window.api?.auth?.safeDecrypt?.({ data: cfg.tokenEnc });
        if (dec?.ok && typeof dec.text === "string") token = dec.text;
      } catch {}
      const body = { account, password, deviceId: did };
      const first = await window.api?.cloudAuth?.login?.({ url, token, body });
      const msg = String(first?.errMsg || first?.message || "");
      if (first && first.ok === true) return first;
      if (msg.includes("http 404") || msg.includes("HTTP 404") || msg.includes("404")) {
        const origin = getUrlOrigin(baseUrl);
        if (origin) {
          const baseHttp = `${origin}/http/${CLOUD_OBJECTS.login}`;
          const basePlain = `${origin}/${CLOUD_OBJECTS.login}`;
          const tryBase = baseUrl.includes("/http/") ? basePlain : baseHttp;
          const altUrl = buildCloudMethodUrl(tryBase, "login");
          const second = await window.api?.cloudAuth?.login?.({ url: altUrl, token, body });
          if (second && second.ok === true) {
            applyCloudDomainToLocalStorageWithMode(origin, tryBase.includes("/http/") ? "http" : "plain");
            return second;
          }
        }
      }
      return first;
    };

    const cloudRedeemKami = async ({ account, code }) => {
      if (!(await ensureCloudConfigured())) return { ok: false, errMsg: "未配置云端接口" };
      const deviceId = await getDeviceId();
      if (!deviceId) return { ok: false, errMsg: "无法获取机器码" };
      const cfg = readCloudConfig();
      const baseUrl = String(cfg.kamiUrl || "").trim();
      const url = buildCloudMethodUrl(baseUrl, "redeem");
      if (!url) return { ok: false, errMsg: "未配置云端卡密接口URL" };
      let token = "";
      try {
        const dec = await window.api?.auth?.safeDecrypt?.({ data: cfg.tokenEnc });
        if (dec?.ok && typeof dec.text === "string") token = dec.text;
      } catch {}
      const body = { account, deviceId, code };
      const first = await window.api?.cloudAuth?.redeemKami?.({ url, token, body });
      const msg = String(first?.errMsg || first?.message || "");
      if (first && first.ok === true) return first;
      if (msg.includes("http 404") || msg.includes("HTTP 404") || msg.includes("404")) {
        try {
          const u = new URL(baseUrl);
          const origin = `${u.protocol}//${u.host}`;
          const altName = baseUrl.includes("/qd-kamiguanli") ? "hd-kamiguanli" : "qd-kamiguanli";
          const altBase = `${origin}/${altName}`;
          const altUrl = buildCloudMethodUrl(altBase, "redeem");
          const second = await window.api?.cloudAuth?.redeemKami?.({ url: altUrl, token, body });
          if (second && second.ok === true) {
            try {
              localStorage.setItem(CLOUD_KAMI_URL_KEY, altBase);
            } catch {}
            return second;
          }
        } catch {}
      }
      return first;
    };

    const validateEmail = (email) => {
      if (!email) return true;
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
    };

    const validatePhone = (phone) => /^1\d{10}$/.test(String(phone || "").trim());

    const openReg = () => {
      regAccount.value = inputAccount.value || "";
      regPassword.value = "";
      regPassword2.value = "";
      regPhone.value = "";
      regEmail.value = "";
      regOverlay.hidden = false;
      regModal.hidden = false;
      setTimeout(() => regAccount.focus(), 0);
    };

    const closeReg = () => {
      regOverlay.hidden = true;
      regModal.hidden = true;
    };

    const openKami = () => {
      const auth = readAuth();
      kamiAccount.value = String(auth?.account || inputAccount.value || "").trim();
      kamiCode.value = "";
      kamiOverlay.hidden = false;
      kamiModal.hidden = false;
      setTimeout(() => (kamiAccount.value ? kamiCode.focus() : kamiAccount.focus()), 0);
    };

    const closeKami = () => {
      kamiOverlay.hidden = true;
      kamiModal.hidden = true;
    };

    const cloudRegister = async ({ account, password, phone, email }) => {
      if (!(await ensureCloudConfigured())) return { ok: false, errMsg: "未配置云端接口" };
      const deviceId = await getDeviceId();
      if (!deviceId) return { ok: false, errMsg: "无法获取机器码" };
      const cfg = readCloudConfig();
      const url = buildCloudMethodUrl(cfg.registerUrl, "register");
      if (!url) return { ok: false, errMsg: "未配置云端注册接口URL" };
      let token = "";
      try {
        const dec = await window.api?.auth?.safeDecrypt?.({ data: cfg.tokenEnc });
        if (dec?.ok && typeof dec.text === "string") token = dec.text;
      } catch {}
      const body = { account, password, phone, email, deviceId };
      return await window.api?.cloudAuth?.register?.({ url, token, body });
    };

    const cloudIssueSessionToken = async ({ account, deviceId }) => {
      const cfg = readCloudConfig();
      const url = buildCloudMethodUrl(cfg.sessionTokenUrl, "issue");
      if (!url) return { ok: false, errMsg: "未配置云端Token接口URL" };
      let token = "";
      try {
        const dec = await window.api?.auth?.safeDecrypt?.({ data: cfg.tokenEnc });
        if (dec?.ok && typeof dec.text === "string") token = dec.text;
      } catch {}
      const body = { account, deviceId, days: 7 };
      return await window.api?.cloudAuth?.issueSessionToken?.({ url, token, body });
    };

    const cloudTouchLastLogin = async ({ account, deviceId }) => {
      const cfg = readCloudConfig();
      const url = buildCloudMethodUrl(cfg.registerUrl, "touchLastLogin");
      if (!url) return { ok: false, errMsg: "未配置云端登录记录接口URL" };
      let token = "";
      try {
        const dec = await window.api?.auth?.safeDecrypt?.({ data: cfg.tokenEnc });
        if (dec?.ok && typeof dec.text === "string") token = dec.text;
      } catch {}
      const body = { account, deviceId };
      return await window.api?.cloudAuth?.touchLastLogin?.({ url, token, body });
    };

    const readMachineCode = async () => {
      try {
        const res = await window.api?.machine?.readCode?.();
        const code = String(res?.deviceId || "").trim();
        return code || (await getDeviceId());
      } catch {
        return await getDeviceId();
      }
    };

    const cloudSubmitMachineRequest = async ({ account, requestType, newDeviceId }) => {
      if (!(await ensureCloudConfigured())) return { ok: false, errMsg: "未配置云端接口" };
      const cfg = readCloudConfig();
      const url = buildCloudMethodUrl(cfg.machineUrl, "submit");
      if (!url) return { ok: false, errMsg: "未配置云端机器管理接口URL" };
      let token = "";
      try {
        const dec = await window.api?.auth?.safeDecrypt?.({ data: cfg.tokenEnc });
        if (dec?.ok && typeof dec.text === "string") token = dec.text;
      } catch {}
      const body = { account, requestType, newDeviceId };
      return await window.api?.cloudAuth?.submitMachineRequest?.({ url, token, body });
    };

    const openMachine = async () => {
      const auth = readAuth();
      machineAccount.value = String(auth?.account || inputAccount.value || "").trim();
      machineDeviceCode.textContent = "读取中...";
      machineOverlay.hidden = false;
      machineModal.hidden = false;
      const code = await readMachineCode();
      machineDeviceCode.textContent = code || "读取失败";
      setTimeout(() => (machineAccount.value ? machineAccount.select() : machineAccount.focus()), 0);
    };

    const closeMachine = () => {
      machineOverlay.hidden = true;
      machineModal.hidden = true;
    };

    const submitMachineRequest = async (requestType) => {
      const account = String(machineAccount.value || "").trim();
      const newDeviceId = String(machineDeviceCode.textContent || "").trim();
      if (!account) {
        topToast("请输入账号。", { type: "warn" });
        machineAccount.focus();
        return;
      }
      if (!newDeviceId || newDeviceId === "读取中..." || newDeviceId === "读取失败") {
        topToast("本机机器码读取失败，请稍后重试。", { type: "error" });
        return;
      }

      const btn = requestType === "add" ? machineSubmitAdd : machineSubmitReplace;
      const otherBtn = requestType === "add" ? machineSubmitReplace : machineSubmitAdd;
      btn.disabled = true;
      otherBtn.disabled = true;
      btn.textContent = requestType === "add" ? "提交中…" : "提交中…";
      try {
        const res = await cloudSubmitMachineRequest({ account, requestType, newDeviceId });
        if (!res || res.errCode || res.ok !== true) {
          topToast(String(res?.errMsg || "提交申请失败"), { type: "error" });
          return;
        }
        closeMachine();
        topToast(String(res?.errMsg || "申请已提交，请等待管理员处理"), { type: "success" });
      } finally {
        machineSubmitAdd.disabled = false;
        machineSubmitReplace.disabled = false;
        machineSubmitAdd.textContent = "申请添加机器";
        machineSubmitReplace.textContent = "申请换绑机器";
      }
    };

    const doLogin = async () => {
      const account = String(inputAccount.value || "").trim();
      const password = String(inputPassword.value || "");
      if (!account) {
        topToast("账号必填。", { type: "warn" });
        inputAccount.focus();
        return;
      }
      if (!password) {
        topToast("密码必填。", { type: "warn" });
        inputPassword.focus();
        return;
      }

      btnSubmit.disabled = true;
      btnSubmit.textContent = "登录中…";
      try {
        const deviceId = await getDeviceId();
        if (!deviceId) {
          topToast("无法获取机器码。", { type: "error" });
          return;
        }
        const res = await cloudLogin({ account, password, deviceId });
        if (!res || res.errCode || (res.ok === false && !isCloudSuccess(res)) || (!isCloudSuccess(res) && !res.userId)) {
          const msg = getCloudErrorMessage(res, "登录失败");
          if (msg.includes("未配置云端登录接口URL")) {
            topToast("未配置云端登录接口URL，请先到“云端设置”配置。", { type: "warn" });
            window.location.hash = "#/settings";
            return;
          }
          topToast(msg, { type: "error" });
          return;
        }

        const tokenRes = await cloudIssueSessionToken({ account, deviceId });
        if (!tokenRes || tokenRes.errCode || tokenRes.ok !== true || !tokenRes.token) {
          topToast(String(tokenRes?.errMsg || "登录Token生成失败，请重试。"), { type: "error" });
          return;
        }

        const touchRes = await cloudTouchLastLogin({ account, deviceId });

        writeAuth({
          userId: res.userId,
          account: res.account,
          identity: String(res.identity || "").trim() || "普通用户",
          identityAccess: null,
          identityPermissionsUpdatedAt: null,
          phone: res.phone || "",
          deviceId: res.deviceId || deviceId,
          ip: res.ip || "",
          kamiCode: res.kamiCode || "",
          kamiStartAt: res.kamiStartAt || null,
          kamiEndAt: res.kamiEndAt || null,
          trialEndAt: res.trialEndAt || null,
          licenseSource: res.licenseSource || "",
          licenseEndAt: res.licenseEndAt || null,
          licenseRemainingMs: Number(res.licenseRemainingMs || 0) || 0,
          passwordResetRequired: res.passwordResetRequired === true,
          passwordResetAt: res.passwordResetAt || null,
          passwordUpdatedAt: res.passwordUpdatedAt || null,
          sessionToken: tokenRes.token,
          sessionTokenEndAt: tokenRes.tokenEndAt || null,
          desktopLastLoginAt: touchRes?.desktopLastLoginAt || null,
          loginAt: Date.now()
        });

        showLoginSyncOverlay("正在同步账号资料...", 28);
        const cfg = readCloudConfig();
        const cloudToken = await readCloudTokenText(cfg.tokenEnc);
        const profileUrl = buildCloudMethodUrl(cfg.profileUrl, "getProfile");
        let profileRes = null;
        if (profileUrl) {
          profileRes = await window.api?.cloudAuth?.getProfile?.({
            url: profileUrl,
            token: cloudToken,
            body: {
              account: String(res.account || account || "").trim(),
              deviceId: String(res.deviceId || deviceId || "").trim()
            }
          });
          if (profileRes?.ok === true) {
            patchAuth({
              identity: String(profileRes.identity || res.identity || "").trim() || "普通用户",
              phone: profileRes.phone || "",
              deviceId: profileRes.deviceId || deviceId,
              ip: profileRes.ip || "",
              kamiCode: profileRes.kamiCode || "",
              kamiStartAt: profileRes.kamiStartAt || null,
              kamiEndAt: profileRes.kamiEndAt || null,
              trialEndAt: profileRes.trialEndAt || null,
              licenseSource: profileRes.licenseSource || "",
              licenseEndAt: profileRes.licenseEndAt || null,
              licenseRemainingMs: Number(profileRes.licenseRemainingMs || 0) || 0,
              passwordResetRequired: profileRes.passwordResetRequired === true,
              passwordResetAt: profileRes.passwordResetAt || null,
              passwordUpdatedAt: profileRes.passwordUpdatedAt || null
            });
          }
        }

        const mustChangePassword = profileRes?.passwordResetRequired === true || res.passwordResetRequired === true;
        if (mustChangePassword) {
          hideLoginSyncOverlay();
          const resetRes = await forceChangePassword({
            account: String(res.account || account || "").trim(),
            deviceId: String(res.deviceId || deviceId || "").trim(),
            currentPassword: password
          });
          if (!resetRes?.ok) {
            clearAuth();
            topToast("已取消本次登录，请使用新密码重新登录。", { type: "warn" });
            return;
          }
          patchAuth({
            passwordResetRequired: false,
            passwordUpdatedAt: new Date().toISOString()
          });
          showLoginSyncOverlay("新密码已设置，正在同步身份权限...", 66);
        } else {
          await saveRememberIfNeeded();
        }

        showLoginSyncOverlay("正在同步身份权限...", 66);
        const authNow = readAuth();
        const identityRes = await fetchIdentityAccess({
          account: String(authNow?.account || res.account || "").trim(),
          userId: String(authNow?.userId || res.userId || "").trim(),
          deviceId: String(authNow?.deviceId || deviceId || "").trim(),
          identity: String(authNow?.identity || res.identity || "").trim() || "普通用户",
          scene: "desktop"
        });
        if (identityRes?.ok && identityRes.access) {
          patchAuth({
            identity: String(identityRes.access.identityName || authNow?.identity || res.identity || "").trim() || "普通用户",
            identityAccess: identityRes.access,
            identityPermissionsUpdatedAt: identityRes.access.updatedAt || null
          });
        } else {
          const rawText = String(identityRes?.raw?.raw || "").trim();
          const errText = String(identityRes?.errMsg || identityRes?.message || "").trim();
          const isIdentityPathMissing =
            rawText.includes("no_matching_function_for_path /qd-shenfenguanli/getIdentityAccess") ||
            errText.includes("http 404") ||
            errText.includes("HTTP 404");
          const fallbackAccess = isIdentityPathMissing && profileRes?.ok === true
            ? buildIdentityAccessFromProfile(profileRes, String(authNow?.identity || res.identity || "普通用户").trim() || "普通用户")
            : null;
          if (fallbackAccess) {
            patchAuth({
              identity: String(fallbackAccess.identityName || authNow?.identity || res.identity || "").trim() || "普通用户",
              identityAccess: fallbackAccess,
              identityPermissionsUpdatedAt: fallbackAccess.updatedAt || null
            });
            topToast("身份权限云接口未部署最新方法，已自动使用账号资料中的菜单权限继续登录。", { type: "warn" });
          } else {
            clearAuth();
            topToast(String(identityRes?.errMsg || identityRes?.message || "身份权限同步失败，请检查云端域名与身份管理云对象是否已部署。"), { type: "error" });
            return;
          }
        }

        showLoginSyncOverlay("正在进入工作台...", 100);
        await new Promise((resolve) => window.setTimeout(resolve, 220));

        try {
          window.dispatchEvent(new CustomEvent("ipfactory:authChanged", { detail: { type: "login" } }));
        } catch {}

        topToast("登录成功。", { type: "success" });
        const to = getRedirectAfterLogin() || "/home";
        clearRedirectAfterLogin();
        window.location.hash = `#${to}`;
      } finally {
        hideLoginSyncOverlay();
        btnSubmit.disabled = false;
        btnSubmit.textContent = "登录";
      }
    };

    btnSubmit.addEventListener("click", doLogin);
    btnRegister.addEventListener("click", openReg);
    btnRedeem.addEventListener("click", openKami);
    btnMachine.addEventListener("click", openMachine);
    inputPassword.addEventListener("keydown", (e) => {
      if (e.key === "Enter") doLogin();
    });
    inputAccount.addEventListener("keydown", (e) => {
      if (e.key === "Enter") inputPassword.focus();
    });

    regOverlay.addEventListener("click", closeReg);
    regClose.addEventListener("click", closeReg);
    regCancel.addEventListener("click", closeReg);
    regSubmit.addEventListener("click", async () => {
      const account = String(regAccount.value || "").trim();
      const password = String(regPassword.value || "");
      const password2 = String(regPassword2.value || "");
      const phone = String(regPhone.value || "").trim();
      const email = String(regEmail.value || "").trim();

      if (!account) return topToast("账号必填。", { type: "warn" });
      if (!password) return topToast("密码必填。", { type: "warn" });
      if (!password2 || password2 !== password) return topToast("两次密码不一致。", { type: "warn" });
      if (!validatePhone(phone)) return topToast("手机号格式不正确。", { type: "warn" });
      if (!validateEmail(email)) return topToast("邮箱格式不正确。", { type: "warn" });

      const deviceId = await getDeviceId();
      if (!deviceId) return topToast("无法获取机器码。", { type: "error" });
      const clientIp = (await getRegisterLimiterIp()) || "unknown";
      const limitCheck = checkRegisterLimit({ deviceId, ip: clientIp });
      if (!limitCheck?.ok) {
        topToast("操作过于频繁，请稍后再试", { type: "error" });
        return;
      }

      regSubmit.disabled = true;
      regSubmit.textContent = "注册中…";
      try {
        recordRegisterAttempt({ deviceId, ip: clientIp });
        const res = await cloudRegister({ account, password, phone, email: email || "" });
        if (!res || res.errCode || (res.ok === false && !isCloudSuccess(res)) || (!isCloudSuccess(res) && !res.userId)) {
          const msg = getCloudErrorMessage(res, "注册失败");
          topToast(msg, { type: "error" });
          if (msg.includes("未配置云端注册接口URL")) window.location.hash = "#/settings";
          return;
        }
        topToast("注册成功。", { type: "success" });
        closeReg();
        inputAccount.value = account;
        inputPassword.value = password;
        await doLogin();
      } finally {
        regSubmit.disabled = false;
        regSubmit.textContent = "注册";
      }
    });

    kamiOverlay.addEventListener("click", closeKami);
    kamiClose.addEventListener("click", closeKami);
    kamiCancel.addEventListener("click", closeKami);
    kamiSubmit.addEventListener("click", async () => {
      const auth = readAuth();
      const account = String(kamiAccount.value || "").trim();
      const code = String(kamiCode.value || "").trim();
      if (!account) {
        topToast("请输入账号。", { type: "warn" });
        kamiAccount.focus();
        return;
      }
      if (!code) {
        topToast("请输入卡密。", { type: "warn" });
        kamiCode.focus();
        return;
      }

      kamiSubmit.disabled = true;
      kamiSubmit.textContent = "验证中…";
      try {
        const res = await cloudRedeemKami({ account, code });
        if (!res || res.errCode || res.ok !== true) {
          const msg = String(res?.errMsg || "卡密充值失败");
          if (msg.includes("http 404") || msg.includes("HTTP 404") || msg.includes("404")) {
            topToast("卡密充值接口不存在（HTTP 404）。请确认云对象 qd-kamiguanli 已上传部署并开启URL化（PATH: /qd-kamiguanli）。", {
              type: "error"
            });
            return;
          }
          topToast(msg, { type: "error" });
          return;
        }
        if (auth && auth.userId && String(auth.account || "") === account) {
          writeAuth({
            kamiCode: res.kamiCode || code,
            kamiStartAt: res.kamiStartAt || null,
            kamiEndAt: res.kamiEndAt || null,
            trialEndAt: res.trialEndAt || null,
            licenseSource: res.licenseSource || "kami",
            licenseEndAt: res.trialEndAt || res.licenseEndAt || null,
            licenseRemainingMs: Number(res.licenseRemainingMs || 0) || 0
          });
        }
        closeKami();
        topToast("卡密充值成功。", { type: "success" });
      } finally {
        kamiSubmit.disabled = false;
        kamiSubmit.textContent = "充值";
      }
    });

    machineOverlay.addEventListener("click", closeMachine);
    machineClose.addEventListener("click", closeMachine);
    machineCancel.addEventListener("click", closeMachine);
    machineSubmitAdd.addEventListener("click", () => submitMachineRequest("add"));
    machineSubmitReplace.addEventListener("click", () => submitMachineRequest("replace"));

    setTimeout(() => inputAccount.focus(), 0);
    return root;
  }
};

