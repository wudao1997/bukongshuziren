// 页面模块云控：统一读取指定云对象中的模块显示状态，并按 data-cloud-module 批量控制页面模块显隐。
import { isIdentityKeyAllowed, isSuperAdminIdentity as isIdentitySuperAdmin } from "./shenfenquanxian.js";

function normalizeText(v) {
  return String(v || "").trim();
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

function normalizeModuleMap(defaultModules = {}, source = {}) {
  const base = defaultModules && typeof defaultModules === "object" ? defaultModules : {};
  const extra = source && typeof source === "object" ? source : {};
  const out = {};
  Object.keys(base).forEach((key) => {
    out[key] = typeof extra[key] === "boolean" ? extra[key] : base[key] !== false;
  });
  return out;
}

function readAuth() {
  try {
    const raw = localStorage.getItem("auth.user");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && parsed.userId ? parsed : null;
  } catch {
    return null;
  }
}

function isSuperAdminIdentity(identity) {
  return isIdentitySuperAdmin(identity);
}

function canBypassModuleVisibility() {
  return isSuperAdminIdentity(readAuth()?.identity);
}

export function applyPageModuleVisibility(root, visibilityMap = {}) {
  const host = root && typeof root.querySelectorAll === "function" ? root : null;
  if (!host) return visibilityMap;
  const forceVisible = canBypassModuleVisibility();
  const identityAccess = readAuth()?.identityAccess || {};
  host.querySelectorAll("[data-cloud-module], [data-module]").forEach((node) => {
    const key = normalizeText(node.getAttribute("data-cloud-module") || node.getAttribute("data-module"));
    if (!key) return;
    const identityVisible = isIdentityKeyAllowed(identityAccess, key, ["areas", "features"]);
    const visible = forceVisible ? true : visibilityMap[key] !== false && identityVisible;
    node.hidden = !visible;
    node.style.display = visible ? "" : "none";
  });
  return visibilityMap;
}

export async function syncPageModuleVisibility(root, options = {}) {
  const cloudObjectName = normalizeText(options.cloudObjectName);
  const defaultModules = options.defaultModules && typeof options.defaultModules === "object" ? options.defaultModules : {};
  const scene = normalizeText(options.scene) || "desktop";
  const silent = options.silent !== false;
  let resolved = normalizeModuleMap(defaultModules, {});
  if (!cloudObjectName) {
    applyPageModuleVisibility(root, resolved);
    return { ok: false, modules: resolved, message: "未配置云对象名称" };
  }
  try {
    const domainRes = await window.api?.domain?.read?.();
    const baseDomain = normalizeText(domainRes?.domain).replace(/\/+$/, "");
    const url = buildCloudMethodUrl(`${baseDomain}/${cloudObjectName}`, "getLatest");
    if (!url) {
      applyPageModuleVisibility(root, resolved);
      return { ok: false, modules: resolved, message: "未配置云端域名" };
    }
    const res = await window.api?.cloudAuth?.getMenuConfig?.({
      url,
      token: "",
      body: { scene }
    });
    resolved = normalizeModuleMap(defaultModules, res?.modules || {});
    applyPageModuleVisibility(root, resolved);
    return {
      ok: !!res?.ok,
      modules: resolved,
      updatedAt: res?.updatedAt || "",
      message: res?.ok ? "" : normalizeText(res?.errMsg || res?.message || (silent ? "" : "页面模块同步失败"))
    };
  } catch (e) {
    applyPageModuleVisibility(root, resolved);
    return { ok: false, modules: resolved, message: normalizeText(e?.message || e) };
  }
}

export function startPageModuleVisibilityLiveSync(root, options = {}) {
  const host = root && typeof root.querySelectorAll === "function" ? root : null;
  if (!host) return () => {};
  const intervalMs = Math.max(2000, Number(options.intervalMs || 5000) || 5000);
  const state = host.__pageModuleVisibilityLiveSyncState;
  if (state && state.timer) return state.stop;

  let stopped = false;
  let syncing = false;
  let lastUpdatedAt = normalizeText(options.updatedAt);

  const tick = async () => {
    if (stopped || syncing) return;
    if (!host.isConnected || host.hidden || document.visibilityState === "hidden") return;
    syncing = true;
    try {
      const res = await syncPageModuleVisibility(host, { ...options, silent: true });
      const nextUpdatedAt = normalizeText(res?.updatedAt);
      if (nextUpdatedAt) lastUpdatedAt = nextUpdatedAt;
    } catch {
      // 静默轮询失败时保持当前页面状态，不打断用户操作。
    } finally {
      syncing = false;
    }
  };

  const timer = window.setInterval(tick, intervalMs);
  const onVisible = () => {
    if (document.visibilityState === "visible") tick();
  };
  document.addEventListener("visibilitychange", onVisible);

  const stop = () => {
    if (stopped) return;
    stopped = true;
    try {
      window.clearInterval(timer);
    } catch {}
    try {
      document.removeEventListener("visibilitychange", onVisible);
    } catch {}
    delete host.__pageModuleVisibilityLiveSyncState;
  };

  host.__pageModuleVisibilityLiveSyncState = {
    timer,
    stop,
    get updatedAt() {
      return lastUpdatedAt;
    }
  };
  return stop;
}
