export function elFromHTML(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  const el = t.content.firstElementChild;
  if (!el) throw new Error("Empty html");
  return el;
}

export function pageHeader({ title, subtitle, actionsHTML = "" }) {
  return `
    <div class="page-header">
      <div>
        <h1 class="page-title">${title}</h1>
        ${subtitle ? `<p class="page-subtitle">${subtitle}</p>` : ""}
      </div>
      ${actionsHTML ? `<div class="card-actions">${actionsHTML}</div>` : `<div></div>`}
    </div>
  `;
}

export function topToast(message, { type = "success" } = {}) {
  const msg = String(message || "").trim();
  if (!msg) return;
  const t = ["success", "warn", "error", "info"].includes(type) ? type : "success";
  let el = document.querySelector("#app-top-toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "app-top-toast";
    el.className = "app-top-toast";
    el.setAttribute("role", "status");
    document.body.appendChild(el);
  }
  el.classList.remove("is-success", "is-warn", "is-error", "is-info", "is-show");
  el.classList.add(`is-${t}`);
  el.textContent = msg;
  requestAnimationFrame(() => el.classList.add("is-show"));
  clearTimeout(el._hideTimer);
  el._hideTimer = setTimeout(() => {
    el.classList.remove("is-show");
  }, 1600);
}

export function confirmDialog({
  title = "确认操作",
  message = "",
  confirmText = "确定",
  cancelText = "取消",
  tone = "primary"
} = {}) {
  const msg = String(message || "").trim();
  if (!msg) return Promise.resolve(false);
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay app-confirm-overlay";
    overlay.innerHTML = `
      <div class="modal app-confirm-modal" role="dialog" aria-modal="true" aria-label="${String(title || "确认操作")}">
        <div class="modal-head">
          <div class="modal-title">${String(title || "确认操作")}</div>
          <button class="modal-close" type="button" aria-label="关闭">×</button>
        </div>
        <div class="modal-body">
          <div class="app-confirm-icon ${tone === "warn" ? "is-warn" : ""}">${tone === "warn" ? "!" : "?"}</div>
          <div class="app-confirm-message">${msg}</div>
        </div>
        <div class="modal-foot app-confirm-foot">
          <button class="btn" type="button" data-action="cancel">${String(cancelText || "取消")}</button>
          <button class="btn btn-primary" type="button" data-action="confirm">${String(confirmText || "确定")}</button>
        </div>
      </div>
    `;
    const close = (result) => {
      try {
        window.removeEventListener("keydown", onKeyDown, true);
      } catch {}
      try {
        overlay.remove();
      } catch {}
      resolve(result === true);
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close(false);
      }
    };
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close(false);
    });
    overlay.querySelector('[data-action="cancel"]')?.addEventListener("click", () => close(false));
    overlay.querySelector(".modal-close")?.addEventListener("click", () => close(false));
    overlay.querySelector('[data-action="confirm"]')?.addEventListener("click", () => close(true));
    window.addEventListener("keydown", onKeyDown, true);
    document.body.appendChild(overlay);
  });
}

export function triConfirmDialog({
  title = "确认操作",
  message = "",
  confirmText = "确定",
  cancelText = "取消",
  extraText = "",
  tone = "primary"
} = {}) {
  const msg = String(message || "").trim();
  const extraLabel = String(extraText || "").trim();
  if (!msg || !extraLabel) return Promise.resolve("cancel");
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay app-confirm-overlay";
    overlay.innerHTML = `
      <div class="modal app-confirm-modal" role="dialog" aria-modal="true" aria-label="${String(title || "确认操作")}">
        <div class="modal-head">
          <div class="modal-title">${String(title || "确认操作")}</div>
          <button class="modal-close" type="button" aria-label="关闭">×</button>
        </div>
        <div class="modal-body">
          <div class="app-confirm-icon ${tone === "warn" ? "is-warn" : ""}">${tone === "warn" ? "!" : "?"}</div>
          <div class="app-confirm-message">${msg}</div>
        </div>
        <div class="modal-foot app-confirm-foot" style="gap:10px;flex-wrap:wrap;justify-content:flex-end">
          <button class="btn" type="button" data-action="cancel">${String(cancelText || "取消")}</button>
          <button class="btn btn-danger" type="button" data-action="extra">${extraLabel}</button>
          <button class="btn btn-primary" type="button" data-action="confirm">${String(confirmText || "确定")}</button>
        </div>
      </div>
    `;
    const close = (action) => {
      try {
        window.removeEventListener("keydown", onKeyDown, true);
      } catch {}
      try {
        overlay.remove();
      } catch {}
      resolve(action === "confirm" ? "confirm" : action === "extra" ? "extra" : "cancel");
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close("cancel");
      }
    };
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close("cancel");
    });
    overlay.querySelector('[data-action="cancel"]')?.addEventListener("click", () => close("cancel"));
    overlay.querySelector(".modal-close")?.addEventListener("click", () => close("cancel"));
    overlay.querySelector('[data-action="extra"]')?.addEventListener("click", () => close("extra"));
    overlay.querySelector('[data-action="confirm"]')?.addEventListener("click", () => close("confirm"));
    window.addEventListener("keydown", onKeyDown, true);
    document.body.appendChild(overlay);
  });
}

export function inputChoiceDialog({
  title = "请输入内容",
  message = "",
  inputLabel = "名称",
  value = "",
  placeholder = "",
  confirmText = "确定",
  alternateText = "使用输入值",
  cancelText = "取消"
} = {}) {
  return new Promise((resolve) => {
    const hasAlternate = String(alternateText || "").trim().length > 0;
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay app-confirm-overlay";
    overlay.innerHTML = `
      <div class="modal app-confirm-modal" role="dialog" aria-modal="true" aria-label="${String(title || "请输入内容")}">
        <div class="modal-head">
          <div class="modal-title">${String(title || "请输入内容")}</div>
          <button class="modal-close" type="button" aria-label="关闭">×</button>
        </div>
        <div class="modal-body">
          <div class="app-confirm-message">${String(message || "").trim()}</div>
          <div class="field" style="margin-top:12px">
            <div class="label">${String(inputLabel || "名称")}</div>
            <input type="text" class="input" data-role="text-input" placeholder="${String(placeholder || "")}" value="${String(value || "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;")}" />
          </div>
        </div>
        <div class="modal-foot app-confirm-foot" style="gap:10px;flex-wrap:wrap;justify-content:flex-end">
          <button class="btn" style="min-width:112px" type="button" data-action="cancel">${String(cancelText || "取消")}</button>
          ${hasAlternate ? `<button class="btn" style="min-width:132px" type="button" data-action="alternate">${String(alternateText || "使用输入值")}</button>` : ""}
          <button class="btn btn-primary" style="min-width:132px" type="button" data-action="confirm">${String(confirmText || "确定")}</button>
        </div>
      </div>
    `;
    const input = overlay.querySelector('[data-role="text-input"]');
    const close = (action) => {
      try {
        window.removeEventListener("keydown", onKeyDown, true);
      } catch {}
      const nextValue = String(input?.value || "").trim();
      try {
        overlay.remove();
      } catch {}
      resolve({ action: action || "cancel", value: nextValue });
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close("cancel");
      }
      if (e.key === "Enter") {
        e.preventDefault();
        close(hasAlternate ? "alternate" : "confirm");
      }
    };
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close("cancel");
    });
    overlay.querySelector('[data-action="cancel"]')?.addEventListener("click", () => close("cancel"));
    overlay.querySelector('[data-action="alternate"]')?.addEventListener("click", () => close("alternate"));
    overlay.querySelector('[data-action="confirm"]')?.addEventListener("click", () => close("confirm"));
    overlay.querySelector(".modal-close")?.addEventListener("click", () => close("cancel"));
    window.addEventListener("keydown", onKeyDown, true);
    document.body.appendChild(overlay);
    setTimeout(() => {
      try {
        input?.focus();
        input?.select?.();
      } catch {}
    }, 0);
  });
}
