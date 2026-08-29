import { confirmDialog, triConfirmDialog } from "./ui.js";

function parseHash() {
  const raw = window.location.hash || "";
  const hash = raw.startsWith("#") ? raw.slice(1) : raw;
  const [pathPart, queryPart] = hash.split("?");
  const path = (pathPart || "/home").startsWith("/") ? pathPart || "/home" : `/${pathPart}`;
  const query = new URLSearchParams(queryPart || "");
  return { path, query };
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, Math.max(0, Number(ms || 0) || 0)));
}

function toMs(d) {
  if (!d) return 0;
  const t = new Date(d).getTime();
  return Number.isFinite(t) ? t : 0;
}

function clearAuth(reason) {
  try {
    localStorage.removeItem("auth.user");
  } catch {}
  try {
    sessionStorage.setItem("auth.logoutReason", String(reason || "").trim());
  } catch {}
}

function isAuthed() {
  try {
    const raw = localStorage.getItem("auth.user");
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.userId) return false;
    const licenseEndAt = parsed.trialEndAt || null;
    const licenseEndMs = toMs(licenseEndAt);
    if (licenseEndMs && Date.now() > licenseEndMs) {
      clearAuth("使用时间已到期，请重新登录后再使用。");
      return false;
    }
    const tokenEndMs = toMs(parsed.sessionTokenEndAt);
    if (tokenEndMs && Date.now() > tokenEndMs) {
      clearAuth("登录凭证已过期，请重新登录。");
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function setRedirectAfterLogin(path) {
  try {
    const p = String(path || "").trim();
    if (!p || !p.startsWith("/")) return;
    sessionStorage.setItem("auth.redirectAfterLogin", p);
  } catch {}
}

export function createRouter({ routes, outletId, onRouteChange, resolvePath }) {
  const routeMap = new Map(routes.map((r) => [r.path, r]));
  const mounted = new Map();
  const PUBLIC_ROUTES = new Set(["/login", "/settings"]);
  let rendering = false;
  let pending = false;
  let activePath = "";

  function readLeaveGuard(path) {
    try {
      const guards = window.__ipfactoryRouteLeaveGuards;
      if (!guards || typeof guards !== "object") return null;
      const guard = guards[String(path || "")];
      return typeof guard === "function" ? guard : null;
    } catch {
      return null;
    }
  }

  async function confirmLeaveCurrent(targetPath) {
    const guard = readLeaveGuard(activePath);
    if (!guard || !activePath || activePath === targetPath) return true;
    const raw = guard(targetPath);
    const meta =
      raw && typeof raw === "object"
        ? raw
        : {
            message: String(raw || "").trim()
          };
    const message = String(meta?.message || "").trim();
    if (!message) return true;
    const extraText = String(meta?.extraText || "").trim();
    if (extraText) {
      const action = await triConfirmDialog({
        title: String(meta?.title || "确认离开"),
        message,
        confirmText: String(meta?.confirmText || "确定"),
        cancelText: String(meta?.cancelText || "取消"),
        extraText,
        tone: String(meta?.tone || "primary")
      });
      if (action === "cancel") return false;
      if (action === "confirm") {
        if (typeof meta?.onConfirm === "function") {
          try {
            const res = await meta.onConfirm(targetPath);
            if (res === false) return false;
          } catch {
            return false;
          }
        }
        return true;
      }
      if (action === "extra") {
        if (typeof meta?.onExtra === "function") {
          try {
            const res = await meta.onExtra(targetPath);
            if (res === false) return false;
          } catch {
            return false;
          }
        }
        return true;
      }
      return false;
    }

    const ok = await confirmDialog({
      title: String(meta?.title || "确认离开"),
      message,
      confirmText: String(meta?.confirmText || "确定"),
      cancelText: String(meta?.cancelText || "取消"),
      tone: String(meta?.tone || "primary")
    });
    if (!ok) return false;
    if (typeof meta?.onConfirm === "function") {
      try {
        const res = await meta.onConfirm(targetPath);
        if (res === false) return false;
      } catch {
        return false;
      }
    }
    return true;
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

  async function verifySessionTokenIfNeeded() {
    const auth = readAuth();
    if (!auth) return { ok: false, reason: "未登录" };
    if (!auth.sessionToken) {
      clearAuth("token不存在，请重新登录。");
      return { ok: false, reason: "token不存在" };
    }
    const baseUrl = String(localStorage.getItem("ipfactory.cloud.sessionTokenUrl") || "").trim();
    const url = buildCloudMethodUrl(baseUrl, "verify");
    if (!url) {
      clearAuth("未配置token接口URL，请先到设置页配置云端域名。");
      return { ok: false, reason: "未配置token接口URL" };
    }

    const key = "auth.sessionTokenVerifiedAt";
    let last = 0;
    try {
      last = Number(sessionStorage.getItem(key) || 0) || 0;
    } catch {}
    if (Date.now() - last < 60 * 1000) return { ok: true, skipped: true };

    const res = await window.api?.cloudAuth?.verifySessionToken?.({
      url,
      token: "",
      body: { account: String(auth.account || ""), deviceId: String(auth.deviceId || ""), token: String(auth.sessionToken || "") }
    });
    if (!res || res.errCode || res.ok !== true) {
      const msg = String(res?.errMsg || "登录已失效，请重新登录。");
      clearAuth(msg);
      return { ok: false, reason: msg };
    }
    try {
      sessionStorage.setItem(key, String(Date.now()));
    } catch {}
    return { ok: true };
  }

  async function doRender() {
    const outlet = document.getElementById(outletId);
    if (!outlet) throw new Error(`Missing outlet #${outletId}`);

    const { path, query } = parseHash();
    const authed = isAuthed();
    const requested = path || "/home";
    if (!authed && !PUBLIC_ROUTES.has(requested)) {
      setRedirectAfterLogin(requested);
      if (window.location.hash !== "#/login") window.location.hash = "#/login";
      return;
    }

    if (authed && !PUBLIC_ROUTES.has(requested)) {
      const ver = await verifySessionTokenIfNeeded();
      if (!ver || ver.ok !== true) {
        if (window.location.hash !== "#/login") window.location.hash = "#/login";
        return;
      }
    }

    const finalPath = typeof resolvePath === "function" ? String(resolvePath({ path: requested, authed, query }) || requested) : requested;
    if (finalPath !== requested) {
      if (window.location.hash !== `#${finalPath}`) window.location.hash = `#${finalPath}`;
      return;
    }

    const route = routeMap.get(finalPath) || routeMap.get("/home");
    if (!route) throw new Error("Missing /home route");
    if (activePath && route.path !== activePath) {
      if (!(await confirmLeaveCurrent(route.path))) {
        if (window.location.hash !== `#${activePath}`) window.location.hash = `#${activePath}`;
        return;
      }
    }

    onRouteChange?.({ path: route.path, title: route.title });
    const previousActivePath = activePath;

    const ctx = { path: route.path, query, routes };
    const cacheEnabled = route.cache !== false;
    const existing = mounted.get(route.path);

    if (!cacheEnabled && existing) {
      try {
        existing.remove();
      } catch {}
      mounted.delete(route.path);
    }

    if (!cacheEnabled) {
      Array.from(outlet.children).forEach((child) => {
        if (child && child.dataset && child.dataset.route === route.path) {
          try {
            child.remove();
          } catch {}
        }
      });
    }

    let el = mounted.get(route.path);
    if (!el) {
      el = await route.render(ctx);
      el.dataset.route = route.path;
      el.classList.add("route-screen");
      mounted.set(route.path, el);
      outlet.appendChild(el);
    }

    const sameRouteEls = Array.from(outlet.children).filter((c) => c?.dataset?.route === route.path);
    if (sameRouteEls.length > 1) {
      sameRouteEls.slice(0, -1).forEach((c) => {
        try {
          c.remove();
        } catch {}
      });
    }

    const nextEl = el;
    const previousEl = Array.from(outlet.children).find((child) => child?.dataset?.route === previousActivePath) || null;
    const shouldAnimate = !!previousActivePath && previousActivePath !== route.path && previousEl && previousEl !== nextEl;

    if (shouldAnimate) {
      previousEl.classList.remove("route-screen-enter", "is-enter-active");
      previousEl.classList.add("route-screen-leave", "is-leave-active");
      await wait(180);
      previousEl.classList.remove("route-screen-leave", "is-leave-active");
      previousEl.hidden = true;

      Array.from(outlet.children).forEach((child) => {
        if (child !== nextEl) child.hidden = true;
      });
      nextEl.hidden = false;
      nextEl.classList.remove("route-screen-leave", "is-leave-active");
      nextEl.classList.add("route-screen-enter");
      void nextEl.offsetWidth;
      nextEl.classList.add("is-enter-active");
      await wait(220);
      nextEl.classList.remove("route-screen-enter", "is-enter-active");
    } else {
      Array.from(outlet.children).forEach((child) => {
        const isActive = child.dataset.route === route.path;
        child.hidden = !isActive;
        child.classList.remove("route-screen-enter", "is-enter-active", "route-screen-leave", "is-leave-active");
      });
    }
    activePath = route.path;
  }

  async function render() {
    pending = true;
    if (rendering) return;
    rendering = true;
    try {
      while (pending) {
        pending = false;
        await doRender();
      }
    } finally {
      rendering = false;
    }
  }

  function start() {
    window.addEventListener("beforeunload", (e) => {
      const guard = readLeaveGuard(activePath);
      const raw = guard ? guard("") : "";
      const message = String(raw && typeof raw === "object" ? raw.message || "" : raw || "").trim();
      if (!message) return;
      e.preventDefault();
      e.returnValue = message;
      return message;
    });
    window.addEventListener("hashchange", render);
    const { path } = parseHash();
    const requested = path || "/home";
    if (requested !== "/login") setRedirectAfterLogin(requested);
    render();
  }

  return { start, render };
}
