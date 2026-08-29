function qs(id) {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element: ${id}`);
  return el;
}

function appendLog(message) {
  const el = qs("log-text");
  const ts = new Date().toLocaleString();
  el.textContent = `[${ts}] ${message}\n` + el.textContent;
}

function renderVersions() {
  const container = qs("versions");
  const v = window.api.versions();
  container.innerHTML = `
    <div class="muted">Electron</div><div><code>${v.electron}</code></div>
    <div class="muted">Chrome</div><div><code>${v.chrome}</code></div>
    <div class="muted">Node.js</div><div><code>${v.node}</code></div>
  `;
}

function bindWindowControls() {
  qs("btn-minimize").addEventListener("click", () => window.api.window.minimize());
  qs("btn-maximize").addEventListener("click", () => window.api.window.toggleMaximize());
  qs("btn-close").addEventListener("click", () => window.api.window.close());
}

function bindActions() {
  qs("btn-ping").addEventListener("click", async () => {
    const res = await window.api.ping();
    appendLog(`主进程响应：${JSON.stringify(res)}`);
  });

  qs("btn-open-file").addEventListener("click", async () => {
    const res = await window.api.openFile();
    appendLog(`选择文件结果：${JSON.stringify(res)}`);
  });
}

renderVersions();
bindWindowControls();
bindActions();
appendLog("渲染进程已就绪。");
