import { elFromHTML, pageHeader } from "../ui.js";

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function readAuth() {
  try {
    const raw = localStorage.getItem("auth.user");
    const parsed = JSON.parse(raw || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export const route = {
  path: "/no-access",
  title: "无权限访问",
  async render() {
    const auth = readAuth();
    const identity = String(auth?.identity || "未知身份").trim() || "未知身份";
    const root = elFromHTML(`
      <div class="help-page">
        ${pageHeader({
          title: "无权限访问",
          subtitle: "当前账号身份没有该菜单的访问权限，页面已被系统拦截。"
        })}
        <section class="card help-hero">
          <div class="help-hero-main">
            <div class="help-hero-eyebrow">访问已拦截</div>
            <h3 class="help-hero-title">当前页面仅对有权限的身份开放</h3>
            <p class="help-hero-desc">当前登录身份为 ${escapeHtml(identity)}，该页面在身份权限配置中已被关闭，因此软件不会继续渲染目标页面内容。</p>
          </div>
          <div class="help-hero-meta">
            <span class="pill">身份：${escapeHtml(identity)}</span>
            <span class="pill">状态：禁止访问</span>
          </div>
        </section>
        <section class="card">
          <div class="form">
            <div class="field">
              <div class="label">当前处理结果</div>
              <div class="hint">已阻止继续进入受限菜单页面，避免通过手动地址进入被关闭的功能模块。</div>
            </div>
            <div class="card-actions" style="justify-content:flex-start">
              <button class="btn btn-primary" id="no-access-back-home">返回首页</button>
              <button class="btn" id="no-access-back-prev">返回上一步</button>
            </div>
          </div>
        </section>
      </div>
    `);
    root.querySelector("#no-access-back-home")?.addEventListener("click", () => {
      window.location.hash = "#/home";
    });
    root.querySelector("#no-access-back-prev")?.addEventListener("click", () => {
      if (window.history.length > 1) window.history.back();
      else window.location.hash = "#/home";
    });
    return root;
  }
};
