function esc(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function toErrorText(err) {
  if (!err) return "未知错误";
  if (err instanceof Error) return err.stack || err.message || String(err);
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err, null, 2);
  } catch {
    return String(err);
  }
}

function renderBootError(err, extra) {
  const root = document.getElementById("app");
  if (!root) return;

  const errText = toErrorText(err);
  const extraText = extra ? toErrorText(extra) : "";
  const payload = extraText ? `${errText}\n\n---\n\n${extraText}` : errText;

  root.innerHTML = `
    <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; background: radial-gradient(1200px 600px at 20% 0%, #17214a 0%, #0b1020 45%, #070b14 100%); color: #e8eeff;">
      <div style="width: min(980px, 100%); border: 1px solid rgba(255,255,255,0.08); background: rgba(11,16,32,0.72); backdrop-filter: blur(10px); border-radius: 16px; box-shadow: 0 18px 60px rgba(0,0,0,0.45); overflow: hidden;">
        <div style="display:flex; align-items:center; justify-content: space-between; padding: 16px 18px; border-bottom: 1px solid rgba(255,255,255,0.08);">
          <div style="display:flex; align-items:center; gap: 10px;">
            <div style="width: 34px; height: 34px; border-radius: 10px; background: linear-gradient(135deg, #6ea8fe 0%, #8c7bff 60%, #ff7bd9 100%); box-shadow: 0 12px 24px rgba(110,168,254,0.25);"></div>
            <div>
              <div style="font-size: 15px; font-weight: 700; letter-spacing: 0.2px;">页面启动失败</div>
              <div style="opacity: 0.75; font-size: 12px; margin-top: 2px;">渲染进程发生异常，已拦截并展示错误信息（避免白屏）</div>
            </div>
          </div>
          <div style="display:flex; gap: 10px;">
            <button id="boot-copy" type="button" style="appearance:none; border: 1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.06); color: #e8eeff; padding: 9px 12px; border-radius: 10px; cursor: pointer; font-weight: 600;">复制错误</button>
            <button id="boot-reload" type="button" style="appearance:none; border: 1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.06); color: #e8eeff; padding: 9px 12px; border-radius: 10px; cursor: pointer; font-weight: 600;">重载</button>
          </div>
        </div>
        <div style="padding: 16px 18px 18px;">
          <div style="display:flex; gap: 12px; flex-wrap: wrap; margin-bottom: 12px;">
            <div style="padding: 8px 10px; border-radius: 999px; background: rgba(110,168,254,0.12); border: 1px solid rgba(110,168,254,0.18); font-size: 12px; color: rgba(232,238,255,0.92);">
              Electron：${esc(window?.api?.versions?.()?.electron || "unknown")}
            </div>
            <div style="padding: 8px 10px; border-radius: 999px; background: rgba(140,123,255,0.12); border: 1px solid rgba(140,123,255,0.18); font-size: 12px; color: rgba(232,238,255,0.92);">
              Chrome：${esc(window?.api?.versions?.()?.chrome || "unknown")}
            </div>
            <div style="padding: 8px 10px; border-radius: 999px; background: rgba(255,123,217,0.12); border: 1px solid rgba(255,123,217,0.18); font-size: 12px; color: rgba(232,238,255,0.92);">
              Node：${esc(window?.api?.versions?.()?.node || "unknown")}
            </div>
          </div>
          <pre id="boot-text" style="margin: 0; padding: 14px; border-radius: 12px; background: rgba(0,0,0,0.30); border: 1px solid rgba(255,255,255,0.08); color: rgba(232,238,255,0.92); font-size: 12px; line-height: 1.5; overflow: auto; max-height: 55vh;">${esc(payload)}</pre>
        </div>
      </div>
    </div>
  `;

  const btnCopy = root.querySelector("#boot-copy");
  const btnReload = root.querySelector("#boot-reload");
  const pre = root.querySelector("#boot-text");

  btnReload?.addEventListener("click", () => window.location.reload());
  btnCopy?.addEventListener("click", async () => {
    const text = pre?.textContent || payload;
    try {
      await navigator.clipboard.writeText(text);
      btnCopy.textContent = "已复制";
      setTimeout(() => (btnCopy.textContent = "复制错误"), 1200);
      return;
    } catch {}
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      ta.style.top = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      btnCopy.textContent = "已复制";
      setTimeout(() => (btnCopy.textContent = "复制错误"), 1200);
    } catch {
      btnCopy.textContent = "复制失败";
      setTimeout(() => (btnCopy.textContent = "复制错误"), 1200);
    }
  });
}

window.addEventListener("error", (e) => {
  renderBootError(e?.error || e?.message || e);
});

window.addEventListener("unhandledrejection", (e) => {
  renderBootError(e?.reason || e);
});

const root = document.getElementById("app");
if (root) {
  root.innerHTML = `
    <div style="min-height: 100vh; display:flex; align-items:center; justify-content:center; padding: 24px; background: radial-gradient(1200px 600px at 20% 0%, #17214a 0%, #0b1020 45%, #070b14 100%); color: rgba(232,238,255,0.88);">
      <div style="display:flex; align-items:center; gap: 12px;">
        <div style="width: 36px; height: 36px; border-radius: 12px; background: rgba(110,168,254,0.12); border: 1px solid rgba(110,168,254,0.18); position: relative; overflow:hidden;">
          <div style="position:absolute; inset:-40%; background: conic-gradient(from 90deg, rgba(110,168,254,0.0), rgba(110,168,254,0.85), rgba(140,123,255,0.85), rgba(255,123,217,0.85), rgba(110,168,254,0.0)); animation: bootspin 1.05s linear infinite;"></div>
          <div style="position:absolute; inset: 2px; background: rgba(11,16,32,0.92); border-radius: 10px;"></div>
        </div>
        <div>
          <div style="font-size: 14px; font-weight: 700; letter-spacing: 0.2px;">IP工厂智能体</div>
          <div style="font-size: 12px; opacity: 0.72; margin-top: 2px;">启动中…</div>
        </div>
      </div>
      <style>
        @keyframes bootspin { to { transform: rotate(360deg); } }
      </style>
    </div>
  `;
}

Promise.resolve()
  .then(() => import("./app/app.js"))
  .catch((err) => {
    renderBootError(err);
  });
