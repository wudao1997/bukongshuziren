// 一键自动创作流程弹窗与步骤定义：

export const HOME_AUTO_CREATE_STEPS = [
  { id: "extract", title: "提取文案", subtitle: "正在识别视频文案..." },
  { id: "rewrite", title: "智能改写", subtitle: "正在生成优化文案..." },
  { id: "audioVideo", title: "音频视频生成", subtitle: "正在生成语音并驱动数字人口播..." },
  { id: "videoEdit", title: "视频编辑", subtitle: "正在执行自动剪辑..." },
  { id: "meta", title: "标题话题关键词", subtitle: "正在生成标题、标签和关键词..." },
  { id: "subtitleBgm", title: "字幕和音乐", subtitle: "正在合成字幕和背景音乐..." },
  { id: "cover", title: "封面制作", subtitle: "正在生成封面..." }
];

const ensureStepStatus = (steps, map) => {
  (Array.isArray(steps) ? steps : []).forEach((step) => {
    const id = String(step?.id || "").trim();
    if (!id) return;
    if (!map[id]) map[id] = "pending";
  });
  return map;
};

export const mountAutoCreateDialog = ({ steps = HOME_AUTO_CREATE_STEPS } = {}) => {
  let overlay = document.querySelector("#home-auto-create-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "home-auto-create-overlay";
    overlay.className = "modal-overlay auto-create-overlay";
    overlay.hidden = true;
    overlay.innerHTML = `
      <div class="modal auto-create-modal" role="dialog" aria-modal="true" aria-label="一键自动创作">
        <div class="auto-create-head">
          <div class="auto-create-title">智能体生成中...</div>
          <div class="auto-create-sub" id="home-auto-create-sub">正在准备自动创作流程...</div>
        </div>
        <div class="auto-create-progress">
          <div class="auto-create-progress-bar">
            <div class="auto-create-progress-fill" id="home-auto-create-fill"></div>
          </div>
          <div class="auto-create-progress-text" id="home-auto-create-pct">0%</div>
        </div>
        <div class="auto-create-step-list" id="home-auto-create-steps"></div>
        <div class="auto-create-foot">
          <button class="btn" id="home-auto-create-hide" type="button">后台运行</button>
          <button class="btn btn-danger" id="home-auto-create-stop" type="button">停止运行</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
  }

  let mini = document.querySelector("#home-auto-create-mini");
  if (!mini) {
    mini = document.createElement("button");
    mini.id = "home-auto-create-mini";
    mini.className = "auto-create-mini";
    mini.type = "button";
    mini.hidden = true;
    mini.innerHTML = `
      <span class="auto-create-mini-dot"></span>
      <span class="auto-create-mini-main">
        <span class="auto-create-mini-title">自动创作后台运行中</span>
        <span class="auto-create-mini-sub" id="home-auto-create-mini-sub">正在准备自动创作流程...</span>
      </span>
      <span class="auto-create-mini-pct" id="home-auto-create-mini-pct">0%</span>
    `;
    document.body.appendChild(mini);
  }

  const subEl = overlay.querySelector("#home-auto-create-sub");
  const fillEl = overlay.querySelector("#home-auto-create-fill");
  const pctEl = overlay.querySelector("#home-auto-create-pct");
  const stepListEl = overlay.querySelector("#home-auto-create-steps");
  const hideBtn = overlay.querySelector("#home-auto-create-hide");
  const stopBtn = overlay.querySelector("#home-auto-create-stop");
  const miniSubEl = mini.querySelector("#home-auto-create-mini-sub");
  const miniPctEl = mini.querySelector("#home-auto-create-mini-pct");

  const state = {
    progress: 0,
    subtitle: "",
    running: false,
    stepStatusMap: ensureStepStatus(steps, {}),
    restoreHandler: null
  };

  const renderSteps = () => {
    if (!stepListEl) return;
    stepListEl.innerHTML = (Array.isArray(steps) ? steps : [])
      .map((step) => {
        const id = String(step?.id || "").trim();
        const title = String(step?.title || id || "未命名步骤");
        const status = state.stepStatusMap[id] || "pending";
        const cls = `auto-create-step is-${status}`;
        return `<div class="${cls}" data-step-id="${id}">
          <span class="auto-create-step-dot"></span>
          <span class="auto-create-step-text">${title}</span>
        </div>`;
      })
      .join("");
  };

  const sync = () => {
    const subtitle = String(state.subtitle || "").trim() || "正在准备自动创作流程...";
    if (subEl) subEl.textContent = subtitle;
    const pct = Math.max(0, Math.min(100, Number(state.progress || 0) || 0));
    if (fillEl) fillEl.style.width = `${pct}%`;
    if (pctEl) pctEl.textContent = `${Math.round(pct)}%`;
    if (miniSubEl) miniSubEl.textContent = subtitle;
    if (miniPctEl) miniPctEl.textContent = `${Math.round(pct)}%`;
    if (hideBtn) hideBtn.disabled = state.running !== true;
    if (stopBtn) stopBtn.disabled = state.running !== true;
    renderSteps();
  };

  mini?.addEventListener("click", () => {
    if (typeof state.restoreHandler === "function") state.restoreHandler();
  });

  sync();

  return {
    overlay,
    mini,
    hideBtn,
    stopBtn,
    setRestoreHandler(handler) {
      state.restoreHandler = typeof handler === "function" ? handler : null;
    },
    open() {
      overlay.hidden = false;
      mini.hidden = true;
    },
    hide() {
      overlay.hidden = true;
    },
    close() {
      overlay.hidden = true;
      mini.hidden = true;
    },
    showMini() {
      mini.hidden = false;
    },
    hideMini() {
      mini.hidden = true;
    },
    reset() {
      state.progress = 0;
      state.subtitle = "正在准备自动创作流程...";
      state.running = false;
      state.stepStatusMap = ensureStepStatus(steps, {});
      sync();
    },
    setRunning(running) {
      state.running = running === true;
      sync();
    },
    setSubtitle(text) {
      state.subtitle = String(text || "").trim();
      sync();
    },
    setProgress(pct) {
      state.progress = Math.max(0, Math.min(100, Number(pct || 0) || 0));
      sync();
    },
    setStepStatus(stepId, status) {
      const id = String(stepId || "").trim();
      if (!id) return;
      state.stepStatusMap[id] = status || "pending";
      sync();
    }
  };
};
