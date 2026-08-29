import { elFromHTML, pageHeader, topToast } from "../ui.js";

const AUTH_STORAGE_KEY = "auth.user";
const CLOUD_LOGIN_URL_KEY = "ipfactory.cloud.loginUrl";
const CLOUD_PROFILE_URL_KEY = "ipfactory.cloud.profileUrl";
const CLOUD_TOKEN_KEY = "ipfactory.cloud.tokenEnc";
const REMEMBER_KEY = "auth.remember.v1";
const SAVED_PASSWORD_KEY = "auth.savedPassword.v1";

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

function writeAuth(patch) {
  const existing = readAuth() || {};
  const next = { ...existing, ...(patch && typeof patch === "object" ? patch : {}) };
  if (!next.userId) return;
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(next));
}

function formatRemaining(ms) {
  const n = Number(ms || 0) || 0;
  if (n <= 0) return "已到期";
  const s = Math.floor(n / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  const hh = h % 24;
  const mm = m % 60;
  if (d > 0) return `${d}天${hh}小时`;
  if (h > 0) return `${h}小时${mm}分钟`;
  return `${m}分钟`;
}

function formatDate(d) {
  if (!d) return "";
  const t = new Date(d);
  if (!Number.isFinite(t.getTime())) return "";
  const pad = (x) => String(x).padStart(2, "0");
  return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())} ${pad(t.getHours())}:${pad(t.getMinutes())}`;
}

function readCloudConfig() {
  const loginUrl = String(localStorage.getItem(CLOUD_LOGIN_URL_KEY) || "").trim();
  const profileUrl = String(localStorage.getItem(CLOUD_PROFILE_URL_KEY) || "").trim();
  const tokenEnc = String(localStorage.getItem(CLOUD_TOKEN_KEY) || "").trim();
  return { loginUrl, profileUrl, tokenEnc };
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

async function readRememberedPassword() {
  try {
    const remember = localStorage.getItem(REMEMBER_KEY) === "1";
    if (!remember) return "";
    const enc = String(localStorage.getItem(SAVED_PASSWORD_KEY) || "").trim();
    if (!enc) return "";
    const res = await window.api?.auth?.safeDecrypt?.({ data: enc });
    if (res?.ok && typeof res.text === "string") return res.text;
    return "";
  } catch {
    return "";
  }
}

async function writeRememberedPassword(nextPassword) {
  try {
    const remember = localStorage.getItem(REMEMBER_KEY) === "1";
    if (!remember) return;
    const pwd = String(nextPassword || "");
    if (!pwd) return;
    const res = await window.api?.auth?.safeEncrypt?.({ text: pwd });
    if (res?.ok && res.data) localStorage.setItem(SAVED_PASSWORD_KEY, String(res.data));
  } catch {}
}

export const route = {
  path: "/account",
  title: "账号信息",
  cache: false,
  async render() {
    const auth = readAuth();
    if (!auth) {
      topToast("请先登录。", { type: "warn" });
      window.location.hash = "#/login";
      return elFromHTML(`<div></div>`);
    }

    const root = elFromHTML(`
      <div>
        ${pageHeader({
          title: "账号信息",
          subtitle: "查看登录信息、机器码、IP与卡密时长；修改手机号与密码",
          actionsHTML: `<button class="btn btn-soft" id="btn-refresh">刷新</button><button class="btn btn-danger" id="btn-logout">退出登录</button>`
        })}

        <div class="grid cols-2">
          <div class="card">
            <div class="card-title"><h3>当前账号</h3><span class="pill">登录态</span></div>
            <div class="form">
              <div class="field">
                <div class="label">用户名</div>
                <input id="acc-account" type="text" readonly />
              </div>
              <div class="field">
                <div class="label">用户身份</div>
                <input id="acc-identity" type="text" readonly />
              </div>
              <div class="field">
                <div class="label">手机号</div>
                <input id="acc-phone" type="text" placeholder="请输入手机号" />
              </div>
              <div class="field">
                <div class="label">当前密码（用于校验）</div>
                <input id="acc-current" type="password" placeholder="请输入当前密码" />
              </div>
              <div class="field">
                <div class="label">新密码（可选）</div>
                <input id="acc-new" type="password" placeholder="留空则不修改" />
              </div>
              <div class="card-actions">
                <button class="btn btn-primary" id="btn-save">保存修改</button>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-title"><h3>设备与卡密</h3><span class="pill">授权</span></div>
            <div class="form">
              <div class="field">
                <div class="label">机器码</div>
                <input id="acc-device" type="text" readonly />
              </div>
              <div class="field">
                <div class="label">IP</div>
                <input id="acc-ip" type="text" readonly />
              </div>
              <div class="field">
                <div class="label">卡密编号</div>
                <input id="acc-kami" type="text" readonly />
              </div>
              <div class="field">
                <div class="label">到期时间</div>
                <input id="acc-expire" type="text" readonly />
              </div>
              <div class="field">
                <div class="label">剩余时长</div>
                <input id="acc-remaining" type="text" readonly />
              </div>
            </div>
          </div>
        </div>
      </div>
    `);

    const elAccount = root.querySelector("#acc-account");
    const elIdentity = root.querySelector("#acc-identity");
    const elPhone = root.querySelector("#acc-phone");
    const elCurrent = root.querySelector("#acc-current");
    const elNew = root.querySelector("#acc-new");
    const elDevice = root.querySelector("#acc-device");
    const elIp = root.querySelector("#acc-ip");
    const elKami = root.querySelector("#acc-kami");
    const elExpire = root.querySelector("#acc-expire");
    const elRemaining = root.querySelector("#acc-remaining");

    const applyView = (u) => {
      elAccount.value = String(u.account || "");
      elIdentity.value = String(u.identity || "普通用户");
      elPhone.value = String(u.phone || "");
      elDevice.value = String(u.deviceId || "");
      elIp.value = String(u.ip || "");
      elKami.value = String(u.kamiCode || "");
      elExpire.value = formatDate(u.trialEndAt || "");
      elRemaining.value = formatRemaining(u.licenseRemainingMs || 0);
    };
    applyView(auth);

    const refresh = async () => {
      const cfg = readCloudConfig();
      if (!cfg.profileUrl) {
        topToast("未配置云端用户信息接口URL。", { type: "warn" });
        return;
      }
      let token = "";
      try {
        const dec = await window.api?.auth?.safeDecrypt?.({ data: cfg.tokenEnc });
        if (dec?.ok && typeof dec.text === "string") token = dec.text;
      } catch {}
      const deviceIdRes = await window.api?.device?.getId?.();
      const deviceId = String(deviceIdRes?.deviceId || "").trim() || String(auth.deviceId || "");
      const res = await window.api?.cloudAuth?.getProfile?.({
        url: buildCloudMethodUrl(cfg.profileUrl, "getProfile"),
        token,
        body: { account: String(auth.account || ""), deviceId }
      });
      if (!res || res.errCode || res.ok !== true) {
        topToast(String(res?.errMsg || "刷新失败"), { type: "error" });
        return;
      }
      writeAuth({
        identity: String(res.identity || auth.identity || "普通用户"),
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
      applyView(readAuth() || auth);
      topToast("已刷新。", { type: "success" });
    };

    root.querySelector("#btn-refresh").addEventListener("click", refresh);
    root.querySelector("#btn-logout").addEventListener("click", () => {
      try {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      } catch {}
      try {
        window.dispatchEvent(new CustomEvent("ipfactory:authChanged", { detail: { type: "logout" } }));
      } catch {}
      window.location.hash = "#/login";
      topToast("已退出登录。", { type: "success" });
    });

    root.querySelector("#btn-save").addEventListener("click", async () => {
      const cfg = readCloudConfig();
      if (!cfg.profileUrl) {
        topToast("未配置云端用户信息接口URL。", { type: "warn" });
        return;
      }
      let token = "";
      try {
        const dec = await window.api?.auth?.safeDecrypt?.({ data: cfg.tokenEnc });
        if (dec?.ok && typeof dec.text === "string") token = dec.text;
      } catch {}
      const currentPassword = String(elCurrent.value || "");
      if (!currentPassword) {
        topToast("请输入当前密码。", { type: "warn" });
        elCurrent.focus();
        return;
      }
      const phone = String(elPhone.value || "").trim();
      const newPassword = String(elNew.value || "");
      const deviceIdRes = await window.api?.device?.getId?.();
      const deviceId = String(deviceIdRes?.deviceId || "").trim() || String(auth.deviceId || "");
      const res = await window.api?.cloudAuth?.updateProfile?.({
        url: buildCloudMethodUrl(cfg.profileUrl, "updateProfile"),
        token,
        body: {
          account: String(auth.account || ""),
          deviceId,
          currentPassword,
          newPassword,
          phone
        }
      });
      if (!res || res.errCode || res.ok !== true) {
        topToast(String(res?.errMsg || "保存失败"), { type: "error" });
        return;
      }
      if (phone || newPassword) writeAuth({ phone, passwordResetRequired: false, passwordUpdatedAt: new Date().toISOString() });
      if (newPassword) await writeRememberedPassword(newPassword);
      elCurrent.value = "";
      elNew.value = "";
      topToast("已保存。", { type: "success" });
    });

    return root;
  }
};
