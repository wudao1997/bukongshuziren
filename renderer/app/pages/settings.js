import { confirmDialog, elFromHTML, pageHeader, topToast } from "../ui.js";
import { getTheme, setTheme, getOutputDir, setOutputDir } from "../store.js";

const UPDATE_MANIFEST_PLACEHOLDER = "https://你的域名/release/desktop/版本号_时间戳/manifest/update.json";

// #region debug-point local-install-96-stall-log
const dbgLocalInstall96Emit = (hypothesisId, location, msg, data = {}) => {
  try {
    fetch("http://127.0.0.1:7777/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "local-install-96-stall",
        runId: "pre-fix",
        hypothesisId: String(hypothesisId || ""),
        location: String(location || "").trim(),
        msg: `[DEBUG] ${String(msg || "").trim()}`,
        data: data && typeof data === "object" ? data : {},
        ts: Date.now()
      })
    }).catch(() => {});
  } catch {}
};
// #endregion

export const route = {
  path: "/settings",
  title: "设置",
  async render() {
    const root = elFromHTML(`
      <div>
        ${pageHeader({
          title: "设置",
          subtitle: "管理主题与保存目录，软件会自动记住你的选择。"
        })}

        <div class="settings-layout">
          <div class="settings-column">
            <div class="card">
              <div class="card-title"><h3>外观</h3><span class="pill">主题</span></div>
              <div class="form">
                <div class="field">
                  <div class="label">主题</div>
                  <select id="theme">
                    <option value="light">浅色</option>
                    <option value="dark">深色</option>
                  </select>
                </div>
                <div class="hint">主题设置会立即生效并保存在本地。</div>
              </div>
            </div>

            <div class="card update-card">
              <div class="card-title update-card-title">
                <div class="update-card-heading">
                  <h3>自动更新</h3>
                  <div class="update-card-subtitle" id="update-card-subtitle">正在读取更新配置...</div>
                </div>
                <span class="pill" id="update-current-version">版本读取中</span>
              </div>
              <div class="form update-card-body">
                <div class="update-runtime" id="update-runtime" hidden>
                  <div class="update-runtime-head">
                    <div class="update-runtime-meta">
                      <div class="update-runtime-label">更新状态</div>
                      <div class="update-runtime-value" id="update-status-text">待检查</div>
                    </div>
                    <div class="update-runtime-side" id="update-progress-text">0%</div>
                  </div>
                  <div class="update-progress-track">
                    <span class="update-progress-fill" id="update-progress-fill"></span>
                  </div>
                  <div class="update-runtime-steps" id="update-runtime-steps" hidden></div>
                  <div class="update-runtime-detail" id="update-runtime-detail" hidden></div>
                </div>
                <div class="card-actions update-action-row">
                  <button class="btn btn-primary" id="btn-update-check">检测更新</button>
                </div>
              </div>
            </div>

            <div class="card">
              <div class="card-title">
                <h3>反馈记录</h3>
                <div class="card-actions">
                  <span class="pill">最近5条</span>
                  <button class="btn btn-soft" id="btn-feedback-refresh" type="button">刷新</button>
                </div>
              </div>
              <div class="form">
                <div class="feedback-list" id="feedback-list">
                  <div class="feedback-empty">正在加载反馈记录...</div>
                </div>
              </div>
            </div>
          </div>

          <div class="settings-column">
            <div class="card">
              <div class="card-title"><h3>保存目录</h3><span class="pill">本地</span></div>
              <div class="form">
                <div class="field">
                  <div class="label">当前保存目录</div>
                  <div class="card-actions">
                    <button class="btn" id="btn-dir">选择目录</button>
                    <button class="btn btn-soft" id="btn-dir-default">恢复默认</button>
                    <span class="pill mono" id="dir"></span>
                  </div>
                </div>
                <div class="hint">默认保存到软件根目录，也可以改成你自己的目录。设置后会自动记忆，下次打开软件继续沿用。</div>
              </div>
            </div>

            <div class="card">
              <div class="card-title"><h3>OpenClaw 接口</h3><span class="pill">本机服务</span></div>
              <div class="form">
                <div class="field">
                  <label class="checkbox" style="display:flex;align-items:center;gap:10px;">
                    <input type="checkbox" id="openclaw-enabled" />
                    <span>启用 OpenClaw / 小龙虾本地工具接口</span>
                  </label>
                </div>
                <div class="field">
                  <div class="label">当前状态</div>
                  <div class="card-actions">
                    <span class="pill" id="openclaw-status">读取中</span>
                    <button class="btn btn-soft" id="btn-openclaw-refresh" type="button">刷新</button>
                    <button class="btn btn-primary" id="btn-openclaw-generate-skill" type="button">生成最新SKILL</button>
                  </div>
                </div>
                <div class="field">
                  <div class="label">本地地址</div>
                  <div class="hint mono" id="openclaw-url">读取中...</div>
                </div>
                <div class="hint" id="openclaw-hint">当前版本需要先登录账号并开启接口，本地 HTTP 服务才会启动。点击“生成最新SKILL”后会在桌面生成主 SKILL、总控 Skill、小龙虾接管 Skill、工具清单和示例计划。</div>
              </div>
            </div>

            <div class="card">
              <div class="card-title"><h3>意见反馈</h3><span class="pill">云端同步</span></div>
              <div class="form">
                <div class="field">
                  <div class="label">问题描述</div>
                  <textarea id="feedback-content" rows="6" placeholder="请直接写清楚你遇到的问题、复现步骤、报错现象，或你希望优化的建议。"></textarea>
                </div>
                <div class="card-actions" style="margin-top:12px">
                  <button class="btn btn-primary" id="btn-feedback-submit">提交反馈</button>
                  <span class="pill" id="feedback-status">未提交</span>
                </div>
                <div class="hint" id="feedback-hint">提交后会同步到云端意见反馈表；同一用户 1 小时内最多提交 2 次，管理员可在后台回复并决定是否对优质建议发放充值卡密。</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `);

    const toast = (msg, type = "success") => topToast(msg, { type });
    const readAuth = () => {
      try {
        const raw = localStorage.getItem("auth.user");
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" ? parsed : null;
      } catch {
        return null;
      }
    };
    const normalizeIdentity = (value) => String(value || "").trim();
    const isSuperAdminIdentity = (identity) => {
      const normalized = normalizeIdentity(identity).toLowerCase();
      return normalized === "超级管理员" || normalized === "super_admin" || normalized === "superadmin";
    };
    const auth = readAuth();
    const isSuperAdminUser = isSuperAdminIdentity(auth?.identity);

    const themeSel = root.querySelector("#theme");
    themeSel.value = getTheme();
    themeSel.addEventListener("change", () => {
      setTheme(themeSel.value);
      document.documentElement.dataset.theme = getTheme();
      toast("主题已更新。");
    });

    const dirEl = root.querySelector("#dir");
    const getDefaultDir = async () => {
      const res = await window.api?.app?.getWritableDefaultOutputDir?.();
      return String(res?.directoryPath || "").trim();
    };
    const renderDir = () => {
      const d = getOutputDir();
      dirEl.textContent = d ? d : "未设置";
      dirEl.title = d || "";
    };
    if (!getOutputDir()) {
      const defaultDir = await getDefaultDir();
      if (defaultDir) setOutputDir(defaultDir);
    }
    renderDir();

    root.querySelector("#btn-dir").addEventListener("click", async () => {
      const res = await window.api?.openDirectory?.();
      if (!res || res.canceled) return;
      const dir = res.directoryPath;
      if (!dir) return;
      setOutputDir(dir);
      renderDir();
      try {
        window.dispatchEvent(new CustomEvent("ipfactory:outputDirChanged"));
      } catch {}
      toast("已设置保存目录。");
    });

    root.querySelector("#btn-dir-default").addEventListener("click", async () => {
      const defaultDir = await getDefaultDir();
      if (!defaultDir) {
        toast("读取默认目录失败。");
        return;
      }
      setOutputDir(defaultDir);
      renderDir();
      try {
        window.dispatchEvent(new CustomEvent("ipfactory:outputDirChanged"));
      } catch {}
      toast("已恢复默认保存目录。");
    });

    const updateCard = root.querySelector(".update-card");
    const updateVersionPill = root.querySelector("#update-current-version");
    const updateCardSubtitle = root.querySelector("#update-card-subtitle");
    const updateRuntime = root.querySelector("#update-runtime");
    const updateStatusText = root.querySelector("#update-status-text");
    const updateProgressText = root.querySelector("#update-progress-text");
    const updateProgressTrack = root.querySelector(".update-progress-track");
    const updateProgressFill = root.querySelector("#update-progress-fill");
    const updateRuntimeSteps = root.querySelector("#update-runtime-steps");
    const updateRuntimeDetail = root.querySelector("#update-runtime-detail");
    const updateAdminPanel = root.querySelector("#update-admin-panel");
    const updateManifestInput = root.querySelector("#update-manifest-url");
    const updateAutoCheckRow = root.querySelector("#update-auto-check-row");
    const updateAutoCheck = root.querySelector("#update-auto-check");
    const updateResultHint = root.querySelector("#update-result-hint");
    const updateDiagnosticsStatus = root.querySelector("#update-diagnostics-status");
    const updateCacheDir = root.querySelector("#update-cache-dir");
    const updateInstallDir = root.querySelector("#update-install-dir");
    const updateCurrentExe = root.querySelector("#update-current-exe");
    const updateHelperLogPath = root.querySelector("#update-helper-log-path");
    const updateCacheFiles = root.querySelector("#update-cache-files");
    const updateHelperLogTail = root.querySelector("#update-helper-log-tail");
    const btnUpdateSave = root.querySelector("#btn-update-save");
    const btnUpdateCheck = root.querySelector("#btn-update-check");
    const btnUpdateInstallLocal = root.querySelector("#btn-update-install-local");
    const btnUpdateOpenFile = root.querySelector("#btn-update-open-file");
    const btnUpdateCloseApp = root.querySelector("#btn-update-close-app");
    const openClawEnabled = root.querySelector("#openclaw-enabled");
    const openClawStatus = root.querySelector("#openclaw-status");
    const openClawUrl = root.querySelector("#openclaw-url");
    const openClawHint = root.querySelector("#openclaw-hint");
    const btnOpenClawRefresh = root.querySelector("#btn-openclaw-refresh");
    const btnOpenClawGenerateSkill = root.querySelector("#btn-openclaw-generate-skill");
    const feedbackContent = root.querySelector("#feedback-content");
    const feedbackStatus = root.querySelector("#feedback-status");
    const feedbackHint = root.querySelector("#feedback-hint");
    const btnFeedbackSubmit = root.querySelector("#btn-feedback-submit");
    const feedbackList = root.querySelector("#feedback-list");
    const btnFeedbackRefresh = root.querySelector("#btn-feedback-refresh");
    let feedbackExpanded = false;
    let currentUpdateConfig = {};
    let openClawBusy = false;

    const escapeHTML = (value) =>
      String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

    const formatFeedbackTime = (value) => {
      const ts = Number(value || 0);
      if (!ts) return "-";
      const d = new Date(ts);
      if (Number.isNaN(d.getTime())) return "-";
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      return `${y}-${m}-${day} ${hh}:${mm}`;
    };

    const formatBytes = (value) => {
      const bytes = Math.max(0, Number(value || 0) || 0);
      if (!bytes) return "0 B";
      const units = ["B", "KB", "MB", "GB"];
      const idx = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
      const size = bytes / 1024 ** idx;
      return `${size >= 100 || idx === 0 ? size.toFixed(0) : size.toFixed(1)} ${units[idx]}`;
    };

    const renderUpdateDiagnostics = async () => {
      const res = await window.api?.appUpdate?.getDiagnostics?.().catch?.(() => null);
      if (!res?.ok) {
        if (updateDiagnosticsStatus) updateDiagnosticsStatus.textContent = "自动更新诊断读取失败。";
        return;
      }
      const installDir = String(res?.installRecord?.installDir || "").trim();
      const currentExePath = String(res?.currentExe?.path || "").trim();
      const currentExeVersion = String(res?.currentExe?.version || "").trim();
      const currentExeTime = String(res?.currentExe?.lastWriteTime || "").trim();
      if (updateDiagnosticsStatus) {
        updateDiagnosticsStatus.textContent = String(res?.lastInstallStatus || "已读取自动更新诊断信息。").trim();
      }
      if (updateCacheDir) {
        updateCacheDir.textContent = `${String(res?.cacheDir || "-")}（自动更新下载文件默认保存在软件根目录的 gengxin 文件夹）`;
        updateCacheDir.title = String(res?.cacheDir || "");
      }
      if (updateInstallDir) {
        updateInstallDir.textContent = installDir
          ? `${installDir}（记录版本 v${String(res?.installRecord?.appVersion || "").trim() || "未知"}）`
          : "未读取到安装目录记录";
        updateInstallDir.title = `${String(res?.installRecordPath || "")}\n${installDir}`;
      }
      if (updateCurrentExe) {
        updateCurrentExe.textContent = currentExePath
          ? `${currentExePath}（当前文件版本 v${currentExeVersion || "未知"}，修改时间 ${currentExeTime || "未知"}）`
          : "未读取到当前运行程序";
        updateCurrentExe.title = currentExePath;
      }
      if (updateHelperLogPath) {
        updateHelperLogPath.textContent = `${String(res?.helperLogPath || "-")}（PowerShell：${String(res?.powerShellPath || "-")}）`;
        updateHelperLogPath.title = String(res?.helperPath || "");
      }
      if (updateCacheFiles) {
        const cacheText = Array.isArray(res?.cacheFiles) && res.cacheFiles.length
          ? res.cacheFiles
              .slice(0, 8)
              .map((item) => `${item.name} · ${item.type === "file" ? formatBytes(item.size) : "目录"} · ${item.updatedAt || "-"}`)
              .join(" | ")
          : "当前没有可见缓存文件";
        updateCacheFiles.textContent = cacheText;
        updateCacheFiles.title = Array.isArray(res?.cacheFiles)
          ? res.cacheFiles.map((item) => `${item.path} | ${item.updatedAt || "-"} | ${item.type === "file" ? formatBytes(item.size) : "目录"}`).join("\n")
          : "";
      }
      if (updateHelperLogTail) {
        updateHelperLogTail.textContent = String(res?.helperLogTail || "当前还没有安装日志。若再次更新后仍为空，说明安装助手没有真正启动。");
      }
    };

    const getUpdateStateLabel = (stage) => {
      const normalized = String(stage || "").trim();
      if (normalized === "downloading") {
        const updateMode = String(currentUpdateState?.updateMode || "").trim();
        const downloadKind = String(currentUpdateState?.downloadKind || "").trim();
        if (updateMode === "binary-diff") {
          if (downloadKind === "base-installer") return "正在下载差分基线包";
          if (downloadKind === "patch-file") return "正在下载差分包";
          return "正在下载差分更新资源";
        }
        return "正在下载完整安装包";
      }
      if (normalized === "installing" && String(currentUpdateState?.updateMode || "").trim() === "local-installer") {
        return "正在安装本地新版本";
      }
      if (normalized === "installing") return "正在安装更新并准备重启";
      if (normalized === "error") return "更新失败";
      return "待检查";
    };

    const renderOpenClawState = (payload = {}) => {
      const config = payload?.config && typeof payload.config === "object" ? payload.config : {};
      const state = payload?.state && typeof payload.state === "object" ? payload.state : {};
      const enabled = config.enabled !== false;
      const running = state.running === true;
      if (openClawEnabled) openClawEnabled.checked = enabled;
      if (openClawStatus) openClawStatus.textContent = enabled ? (running ? "已开启" : "已配置未运行") : "已关闭";
      if (openClawUrl) {
        const localUrl = String(state.localUrl || "").trim();
        openClawUrl.textContent = localUrl || "未提供本地地址";
        openClawUrl.title = localUrl;
      }
      if (openClawHint) {
        openClawHint.textContent = enabled
          ? `OpenClaw 本地工具接口当前${running ? "正在运行" : "已启用但尚未运行"}。只监听本机地址，不影响软件原有页面功能。`
          : "OpenClaw 本地工具接口当前已关闭。关闭后会立即停止本地 HTTP 服务，但不会影响软件原有页面功能。";
      }
    };

    const loadOpenClawConfig = async ({ silent = true } = {}) => {
      const res = await window.api?.openClaw?.readConfig?.().catch?.(() => null);
      if (!res?.ok) {
        if (openClawStatus) openClawStatus.textContent = "读取失败";
        if (openClawHint) openClawHint.textContent = String(res?.message || "读取 OpenClaw 配置失败。");
        if (!silent) toast(String(res?.message || "读取 OpenClaw 配置失败。"), "error");
        return false;
      }
      renderOpenClawState(res);
      return true;
    };

    const getInstallRuntimeView = (state = {}) => {
      const updateMode = String(state?.updateMode || "").trim();
      const phase = String(state?.installPhase || "").trim();
      const progress = Math.max(0, Math.min(100, Number(state?.progress || 0) || 0));
      const defs =
        updateMode === "binary-diff"
          ? [
              { key: "merge", label: "合并新安装包", desc: "正在根据差分包生成完整安装器" },
              { key: "prepare-installer", label: "准备安装助手", desc: "正在启动静默安装助手" },
              { key: "spawn-helper", label: "接管自动安装", desc: "安装助手已经接管后续流程" },
              { key: "handoff", label: "退出旧版本", desc: "软件退出后继续自动覆盖安装" }
            ]
          : updateMode === "local-installer"
            ? [
                { key: "prepare-installer", label: "扫描安装包", desc: "正在确认你选择的本地新版本安装包" },
                { key: "spawn-helper", label: "启动安装助手", desc: "正在用当前软件目录执行覆盖安装" },
                { key: "handoff", label: "覆盖并重启", desc: "软件退出后继续覆盖安装并自动重启" }
              ]
          : [
              { key: "prepare", label: "校验安装包", desc: "正在确认安装包可直接执行" },
              { key: "spawn-helper", label: "准备安装助手", desc: "正在启动静默安装助手" },
              { key: "handoff", label: "退出旧版本", desc: "软件退出后继续自动覆盖安装" }
            ];
      let activeIndex = defs.findIndex((item) => item.key === phase);
      if (activeIndex < 0) {
        if (progress >= 90) activeIndex = Math.max(defs.length - 1, 0);
        else if (progress >= 55) activeIndex = Math.max(defs.length - 2, 0);
        else activeIndex = 0;
      }
      const steps = defs.map((item, idx) => ({
        ...item,
        state: idx < activeIndex ? "done" : idx === activeIndex ? "active" : "pending"
      }));
      const activeStep = steps[activeIndex] || steps[0] || { desc: "" };
      return {
        progress,
        progressText: `${Math.max(1, Math.round(progress))}%`,
        detail:
          String(state?.installDetail || state?.message || "").trim() ||
          activeStep.desc ||
          "正在自动安装更新，请稍候。",
        steps
      };
    };

    const setUpdateHint = (text = "", { forceShow = false } = {}) => {
      if (!updateResultHint) return;
      const nextText = String(text || "").trim();
      if (nextText) updateResultHint.textContent = nextText;
      updateResultHint.hidden = !(forceShow || isSuperAdminUser || nextText);
    };

    let currentUpdateState = { stage: "idle" };
    let lastLocalInstallerPath = "";
    let localInstallStallTimer = 0;
    let localInstallRecoveryKey = "";

    const clearLocalInstallStallTimer = () => {
      if (!localInstallStallTimer) return;
      try {
        window.clearTimeout(localInstallStallTimer);
      } catch {}
      localInstallStallTimer = 0;
    };

    const maybeRecoverLocalInstallFromStall = () => {
      const stage = String(currentUpdateState?.stage || "").trim();
      const updateMode = String(currentUpdateState?.updateMode || "").trim();
      const installPhase = String(currentUpdateState?.installPhase || "").trim();
      const progress = Math.max(0, Number(currentUpdateState?.progress || 0) || 0);
      const installerPath = String(currentUpdateState?.installerPath || lastLocalInstallerPath || "").trim();
      const stallKey = [stage, updateMode, installPhase, progress, installerPath, String(currentUpdateState?.updatedAt || "")].join("|");
      const shouldWatch =
        stage === "installing" && updateMode === "local-installer" && installPhase === "handoff" && progress >= 96 && !!installerPath;
      if (!shouldWatch) {
        clearLocalInstallStallTimer();
        localInstallRecoveryKey = "";
        return;
      }
      if (localInstallRecoveryKey === stallKey || localInstallStallTimer) return;
      clearLocalInstallStallTimer();
      localInstallStallTimer = window.setTimeout(async () => {
        localInstallStallTimer = 0;
        const latestStage = String(currentUpdateState?.stage || "").trim();
        const latestMode = String(currentUpdateState?.updateMode || "").trim();
        const latestPhase = String(currentUpdateState?.installPhase || "").trim();
        const latestProgress = Math.max(0, Number(currentUpdateState?.progress || 0) || 0);
        const latestInstallerPath = String(currentUpdateState?.installerPath || lastLocalInstallerPath || "").trim();
        if (!(latestStage === "installing" && latestMode === "local-installer" && latestPhase === "handoff" && latestProgress >= 96 && latestInstallerPath)) {
          return;
        }
        localInstallRecoveryKey = stallKey;
        // #region debug-point E:local-install-stall-recovery-dialog
        try {
          dbgLocalInstall96Emit("E", "settings.js:maybeRecoverLocalInstallFromStall", "检测到本地安装长时间停留在96%，准备弹出恢复对话框", {
            installerPath: latestInstallerPath,
            stage: latestStage,
            installPhase: latestPhase,
            progress: latestProgress
          });
        } catch {}
        // #endregion
        const confirm = await confirmDialog({
          title: "安装卡住处理",
          message:
            `检测到“安装新版本”长时间停留在 96%。\n点击确定后，会重新打开你刚才选择的安装包目录，并重新唤起安装包原生安装界面；随后会自动关闭旧版软件进程。`,
          confirmText: "确定",
          cancelText: "取消"
        });
        // #region debug-point E:local-install-stall-confirm
        try {
          dbgLocalInstall96Emit("E", "settings.js:maybeRecoverLocalInstallFromStall", "96%卡顿恢复对话框返回", {
            confirm: confirm === true,
            installerPath: latestInstallerPath
          });
        } catch {}
        // #endregion
        if (!confirm) return;
        const reopenRes = await window.api?.openFile?.({
          title: "重新选择新版本 EXE 安装包",
          defaultPath: latestInstallerPath,
          properties: ["openFile"],
          filters: [{ name: "EXE 安装包", extensions: ["exe"] }]
        });
        if (!reopenRes || reopenRes.canceled) return;
        const retryInstallerPath = String(Array.isArray(reopenRes?.filePaths) ? reopenRes.filePaths[0] || "" : "").trim();
        if (!retryInstallerPath) {
          toast("没有重新选中 EXE 安装包文件。", "warn");
          return;
        }
        lastLocalInstallerPath = retryInstallerPath;
        const retryRes = await window.api?.appUpdate?.installFromDirectory?.({ localPath: retryInstallerPath });
        // #region debug-point E:local-install-stall-retry
        try {
          dbgLocalInstall96Emit("E", "settings.js:maybeRecoverLocalInstallFromStall", "96%卡顿后的重新安装请求返回", {
            ok: retryRes?.ok === true,
            installerPath: retryInstallerPath,
            mode: String(retryRes?.mode || "").trim(),
            message: String(retryRes?.message || "").trim()
          });
        } catch {}
        // #endregion
        if (!retryRes?.ok) {
          setUpdateHint(String(retryRes?.message || "重新启动安装失败。"), { forceShow: true });
          toast(String(retryRes?.message || "重新启动安装失败。"), "error");
          return;
        }
        renderUpdateRuntimeState(retryRes?.state || { stage: "installing", updateMode: "local-installer" });
        setUpdateHint(`已重新唤起安装界面：${retryInstallerPath}。软件将自动关闭并继续进入新版本安装流程。`, { forceShow: true });
        toast("已重新打开安装界面。", "info");
      }, 8000);
    };

    const renderUpdateRuntimeState = (state = {}) => {
      currentUpdateState = state && typeof state === "object" ? state : { stage: "idle" };
      const stage = String(currentUpdateState?.stage || "idle").trim() || "idle";
      const progress = Math.max(0, Math.min(100, Number(currentUpdateState?.progress || 0) || 0));
      const receivedBytes = Math.max(0, Number(currentUpdateState?.receivedBytes || 0) || 0);
      const totalBytes = Math.max(0, Number(currentUpdateState?.totalBytes || 0) || 0);
      const isIndeterminate = stage === "downloading" && (currentUpdateState?.isProgressIndeterminate === true || (totalBytes <= 0 && receivedBytes > 0));
      const isRunning = stage === "downloading" || stage === "installing";
      // #region debug-point E:render-update-state
      try {
        if (stage === "installing" || stage === "error" || stage === "idle") {
          dbgLocalInstall96Emit("E", "settings.js:renderUpdateRuntimeState", "设置页渲染更新状态", {
            stage,
            progress,
            updateMode: String(currentUpdateState?.updateMode || "").trim(),
            installPhase: String(currentUpdateState?.installPhase || "").trim(),
            message: String(currentUpdateState?.message || "").trim(),
            errorMessage: String(currentUpdateState?.errorMessage || "").trim()
          });
        }
      } catch {}
      // #endregion
      if (updateRuntime) updateRuntime.hidden = !isRunning && stage !== "error";
      if (updateStatusText) updateStatusText.textContent = getUpdateStateLabel(stage);
      if (updateProgressFill) {
        updateProgressFill.style.width =
          stage === "installing" ? `${getInstallRuntimeView(currentUpdateState).progress}%` : `${isIndeterminate ? 100 : progress}%`;
        updateProgressFill.classList.toggle("is-indeterminate", isIndeterminate);
      }
      if (updateProgressTrack) {
        updateProgressTrack.classList.toggle("is-indeterminate", isIndeterminate);
      }
      if (updateProgressText) {
        if (stage === "downloading") {
          updateProgressText.textContent =
            totalBytes > 0 ? `${progress.toFixed(1)}% · ${formatBytes(receivedBytes)} / ${formatBytes(totalBytes)}` : `${formatBytes(receivedBytes)}`;
        } else if (stage === "installing") {
          updateProgressText.textContent = getInstallRuntimeView(currentUpdateState).progressText;
        } else if (stage === "error") {
          updateProgressText.textContent = "失败";
        } else {
          updateProgressText.textContent = "0%";
        }
      }
      if (updateRuntimeSteps) {
        if (stage === "installing") {
          const view = getInstallRuntimeView(currentUpdateState);
          updateRuntimeSteps.hidden = false;
          updateRuntimeSteps.innerHTML = view.steps
            .map(
              (item) => `
                <div class="update-runtime-step is-${item.state}">
                  <span class="update-runtime-step-dot"></span>
                  <span class="update-runtime-step-text">${escapeHTML(item.label)}</span>
                </div>
              `
            )
            .join("");
        } else {
          updateRuntimeSteps.hidden = true;
          updateRuntimeSteps.innerHTML = "";
        }
      }
      if (updateRuntimeDetail) {
        if (stage === "installing") {
          updateRuntimeDetail.hidden = false;
          updateRuntimeDetail.textContent = getInstallRuntimeView(currentUpdateState).detail;
        } else {
          updateRuntimeDetail.hidden = true;
          updateRuntimeDetail.textContent = "";
        }
      }
      if (btnUpdateCheck) {
        btnUpdateCheck.disabled = isRunning;
        btnUpdateCheck.textContent = stage === "downloading" ? "下载中..." : stage === "installing" ? "处理中..." : "检测更新";
      }
      if (btnUpdateInstallLocal) {
        btnUpdateInstallLocal.disabled = isRunning;
        btnUpdateInstallLocal.textContent = stage === "installing" && String(currentUpdateState?.updateMode || "").trim() === "local-installer" ? "安装中..." : "安装新版本";
      }
      if (btnUpdateSave) btnUpdateSave.disabled = isRunning;
      if (stage === "downloading") {
        setUpdateHint(
          String(currentUpdateState?.updateMode || "").trim() === "binary-diff"
            ? "当前正在执行差分更新：会先下载旧版本基线安装包，再下载差分包，随后在本地合并出新安装包并自动安装。"
            : "当前正在下载完整安装包，下载完成后会自动复用“安装新版本”链路继续安装。",
          { forceShow: true }
        );
      } else if (stage === "installing") {
          setUpdateHint(String(currentUpdateState?.message || "安装流程已启动，正在按“安装新版本”同链路继续安装..."), { forceShow: true });
      } else if (stage === "error") {
        setUpdateHint(String(currentUpdateState?.errorMessage || currentUpdateState?.message || "更新失败，请稍后重试。"), { forceShow: true });
      }
      maybeRecoverLocalInstallFromStall();
    };

    const buildFeedbackContext = async () => {
      const auth = readAuth();
      const versionRes = await window.api?.appUpdate?.readConfig?.().catch?.(() => null);
      const deviceRes = await window.api?.device?.getId?.().catch?.(() => null);
      return {
        account: String(auth?.account || "").trim(),
        userId: String(auth?.userId || auth?._id || "").trim(),
        identity: String(auth?.identity || "").trim(),
        clientVersion: String(versionRes?.currentVersion || "").trim(),
        deviceId: String(deviceRes?.deviceId || deviceRes?.id || "").trim(),
        platform: "electron"
      };
    };

    const renderFeedbackList = (items = []) => {
      if (!feedbackList) return;
      const list = Array.isArray(items) ? items : [];
      if (!list.length) {
        feedbackList.innerHTML = `<div class="feedback-empty">暂无反馈记录，你提交的问题和建议会在这里显示。</div>`;
        return;
      }
      const renderItem = (item) => {
          const reply = String(item?.adminReply || "").trim();
          const statusText = String(item?.status || "pending").trim() || "pending";
          return `
            <article class="feedback-item">
              <div class="feedback-item-head">
                <span class="feedback-item-time">${escapeHTML(formatFeedbackTime(item?.createdAt))}</span>
                <span class="feedback-item-status">${escapeHTML(statusText)}</span>
              </div>
              <div class="feedback-item-content">${escapeHTML(String(item?.content || ""))}</div>
              <div class="feedback-item-reply-wrap">
                <div class="feedback-item-reply-label">管理员回复</div>
                <div class="feedback-item-reply">${escapeHTML(reply || "管理员暂未回复")}</div>
              </div>
            </article>
          `;
        };
      const visibleList = list.slice(0, 5);
      const hiddenList = list.slice(5);
      feedbackList.innerHTML = `
        ${visibleList.map(renderItem).join("")}
        ${
          hiddenList.length
            ? `
              <div class="feedback-collapse">
                <button class="btn feedback-toggle-btn" id="feedback-toggle-btn" type="button">
                  ${feedbackExpanded ? "收起更早记录" : `展开其余 ${hiddenList.length} 条记录`}
                </button>
                <div class="feedback-collapse-body${feedbackExpanded ? " is-open" : ""}" id="feedback-collapse-body">
                  ${hiddenList.map(renderItem).join("")}
                </div>
              </div>
            `
            : ""
        }
      `;
      const toggleBtn = feedbackList.querySelector("#feedback-toggle-btn");
      toggleBtn?.addEventListener("click", () => {
        feedbackExpanded = !feedbackExpanded;
        renderFeedbackList(list);
      });
    };

    const loadFeedbackList = async ({ silent = false } = {}) => {
      if (!feedbackList) return;
      if (!silent) {
        feedbackList.innerHTML = `<div class="feedback-empty">正在加载反馈记录...</div>`;
      }
      if (btnFeedbackRefresh) {
        btnFeedbackRefresh.disabled = true;
        btnFeedbackRefresh.textContent = "刷新中...";
      }
      const ctx = await buildFeedbackContext();
      const res = await window.api?.feedback?.list?.({ body: ctx }).catch?.(() => null);
      if (!res?.ok) {
        feedbackList.innerHTML = `<div class="feedback-empty">反馈记录加载失败，请稍后重试。</div>`;
        if (btnFeedbackRefresh) {
          btnFeedbackRefresh.disabled = false;
          btnFeedbackRefresh.textContent = "刷新";
        }
        return false;
      }
      renderFeedbackList(res?.list || []);
      if (btnFeedbackRefresh) {
        btnFeedbackRefresh.disabled = false;
        btnFeedbackRefresh.textContent = "刷新";
      }
      return true;
    };

    const renderUpdateConfig = async () => {
      const res = await window.api?.appUpdate?.readConfig?.();
      let config = res?.config || {};
      currentUpdateConfig = config && typeof config === "object" ? config : {};
      if (updateVersionPill) updateVersionPill.textContent = `当前版本 v${String(res?.currentVersion || "0.0.0")}`;
      if (updateCardSubtitle) {
        updateCardSubtitle.hidden = !isSuperAdminUser;
        updateCardSubtitle.textContent = isSuperAdminUser
          ? "超级管理员可维护更新展示地址与启动自动检查策略；版本判断始终以云端 update 表为准。"
          : "";
      }
      if (updateCard) updateCard.classList.toggle("is-simple", !isSuperAdminUser);
      if (updateAdminPanel) updateAdminPanel.hidden = !isSuperAdminUser;
      if (btnUpdateSave) btnUpdateSave.hidden = !isSuperAdminUser;
      if (updateAutoCheckRow) updateAutoCheckRow.hidden = !isSuperAdminUser;
      if (updateManifestInput) updateManifestInput.value = String(currentUpdateConfig?.manualManifestUrl || currentUpdateConfig?.manifestUrl || "");
      if (updateAutoCheck) {
        updateAutoCheck.checked = currentUpdateConfig?.autoCheckOnLaunch !== false;
        updateAutoCheck.disabled = !isSuperAdminUser;
      }
      if (isSuperAdminUser) {
        setUpdateHint("软件现在直接读取云数据库 update 表中的版本和完整安装包下载地址；自动更新会将最新 EXE 下载到软件根目录的 gengxin 文件夹，再自动执行覆盖安装，这里的地址仅用于展示和留档，不参与版本判断。");
      } else if (!["downloading", "installing", "error"].includes(String(currentUpdateState?.stage || "").trim())) {
        setUpdateHint("");
      }
      renderUpdateRuntimeState(res?.state || currentUpdateState);
      await renderUpdateDiagnostics();
    };

    btnUpdateSave?.addEventListener("click", async () => {
      if (!isSuperAdminUser) return;
      const manifestUrl = String(updateManifestInput?.value || "").trim();
      const autoCheckOnLaunch = updateAutoCheck?.checked === true;
      const res = await window.api?.appUpdate?.writeConfig?.({
        config: { manualManifestUrl: manifestUrl, autoCheckOnLaunch }
      });
      if (!res?.ok) {
        setUpdateHint(String(res?.message || "保存更新配置失败。"), { forceShow: true });
        toast(String(res?.message || "保存更新配置失败。"), "error");
        return;
      }
      setUpdateHint(
        manifestUrl ? `更新展示地址已保存：${manifestUrl}` : "已清空本地更新展示地址，版本判断后续继续直接读取云数据库 update 表。",
        { forceShow: true }
      );
      await renderUpdateConfig();
      toast("自动更新配置已保存。");
    });

    const runInstallNewVersionFlow = async (installerPath, { expectedVersion = "", sourceLabel = "安装新版本", skipConfirm = false } = {}) => {
      const normalizedInstallerPath = String(installerPath || "").trim();
      if (!normalizedInstallerPath) {
        toast("没有可用的安装包路径。", "warn");
        return { ok: false, message: "没有可用的安装包路径。" };
      }
      try {
        dbgLocalInstall96Emit("E", "settings.js:runInstallNewVersionFlow", "准备复用安装新版本链路", {
          installerPath: normalizedInstallerPath,
          expectedVersion: String(expectedVersion || "").trim(),
          sourceLabel: String(sourceLabel || "").trim(),
          skipConfirm: skipConfirm === true
        });
      } catch {}
      lastLocalInstallerPath = normalizedInstallerPath;
      if (!skipConfirm) {
        const confirm = await confirmDialog({
          title: "准备安装更新",
          message: `已准备更新安装包：${normalizedInstallerPath}\n安装需要先关闭当前软件。\n点击确认后会先打开安装界面，再自动关闭当前软件，已打开的安装界面不会受影响。`,
          confirmText: "确认继续",
          cancelText: "取消"
        });
        try {
          dbgLocalInstall96Emit("E", "settings.js:runInstallNewVersionFlow", "安装新版本确认框返回", {
            installerPath: normalizedInstallerPath,
            expectedVersion: String(expectedVersion || "").trim(),
            sourceLabel: String(sourceLabel || "").trim(),
            confirm: confirm === true
          });
        } catch {}
        if (!confirm) return { ok: false, canceled: true, message: "用户取消安装。" };
      }
      const oldInstallText = btnUpdateInstallLocal?.textContent || "安装新版本";
      const oldCheckText = btnUpdateCheck?.textContent || "检测更新";
      if (btnUpdateInstallLocal) {
        btnUpdateInstallLocal.disabled = true;
        btnUpdateInstallLocal.textContent = "准备中...";
      }
      if (btnUpdateCheck) {
        btnUpdateCheck.disabled = true;
        btnUpdateCheck.textContent = sourceLabel === "检测更新" ? "准备安装..." : oldCheckText;
      }
      try {
        const openFileRes = await window.api?.appUpdate?.openLocalFile?.({ localPath: normalizedInstallerPath });
        try {
          dbgLocalInstall96Emit("E", "settings.js:runInstallNewVersionFlow", "安装新版本接口返回", {
            ok: openFileRes?.ok === true,
            mode: "open-file-then-close-app",
            sourceLabel: String(sourceLabel || "").trim(),
            expectedVersion: String(expectedVersion || "").trim(),
            message: String(openFileRes?.message || "").trim(),
            openedPath: String(openFileRes?.openedPath || "").trim()
          });
        } catch {}
        if (!openFileRes?.ok) {
          setUpdateHint(String(openFileRes?.message || "打开安装包失败。"), { forceShow: true });
          toast(String(openFileRes?.message || "打开安装包失败。"), "error");
          return { ok: false, message: String(openFileRes?.message || "打开安装包失败。") };
        }
        setUpdateHint(
          `更新安装包已打开：${String(openFileRes?.openedPath || normalizedInstallerPath)}。接下来会自动关闭当前软件，并继续安装新版本。`,
          { forceShow: true }
        );
        toast("安装界面已打开，软件即将自动关闭。", "info");
        await window.api?.appUpdate?.closeApp?.({
          reason: sourceLabel === "检测更新" ? "check-update-after-open-file" : "manual-install-after-open-file"
        });
        return {
          ok: true,
          openedPath: String(openFileRes?.openedPath || normalizedInstallerPath).trim()
        };
      } finally {
        if (!["downloading", "installing"].includes(String(currentUpdateState?.stage || "").trim())) {
          if (btnUpdateInstallLocal) {
            btnUpdateInstallLocal.disabled = false;
            btnUpdateInstallLocal.textContent = oldInstallText;
          }
          if (btnUpdateCheck) {
            btnUpdateCheck.disabled = false;
            btnUpdateCheck.textContent = oldCheckText;
          }
        }
      }
    };

    btnUpdateCheck?.addEventListener("click", async () => {
      if (["downloading", "installing"].includes(String(currentUpdateState?.stage || "").trim())) return;
      btnUpdateCheck.disabled = true;
      const oldText = btnUpdateCheck.textContent;
      btnUpdateCheck.textContent = "检测中...";
      try {
        const syncRes = await window.api?.appUpdate?.syncFromCloud?.({ scene: "desktop" }).catch((e) => ({
          ok: false,
          message: String(e?.message || e || "")
        }));
        if (!syncRes?.ok) {
          const finalMessage = String(syncRes?.message || "同步云端更新配置失败。").trim() || "同步云端更新配置失败。";
          setUpdateHint(finalMessage, { forceShow: true });
          toast(finalMessage, "error");
          return;
        }
        if (syncRes?.ok && syncRes?.config && typeof syncRes.config === "object") {
          currentUpdateConfig = syncRes.config;
          await renderUpdateConfig();
        }
        if (syncRes?.manifestHydrationWarning) {
          setUpdateHint(`云端 manifest 校验失败，已回退使用 update 表数据继续检查：${String(syncRes.manifestHydrationWarning || "")}`, {
            forceShow: true
          });
        }
        const res = await window.api?.appUpdate?.check?.({ forceSync: false });
        if (!res?.ok) {
          const finalMessage =
            String(res?.message || "").trim() ||
            String(syncRes?.ok === false ? syncRes?.message || "" : "").trim() ||
            "检查更新失败。";
          setUpdateHint(finalMessage, { forceShow: true });
          toast(finalMessage, "error");
          return;
        }
        if (res?.unsupportedContext) {
          setUpdateHint(String(res?.message || "当前运行环境不支持自动更新。"), { forceShow: true });
          toast(String(res?.message || "当前运行环境不支持自动更新。"), "warn");
          return;
        }
        if (!res?.hasUpdate) {
          setUpdateHint(`当前已是最新版本 v${String(res?.currentVersion || "")}。`, { forceShow: true });
          toast("当前已是最新版本。", "info");
          return;
        }
        const forceUpdate = res?.forceUpdate === true;
        setUpdateHint(
          `${forceUpdate ? "检测到强制更新" : "发现新版本"} v${String(res?.latestVersion || "")}${res?.publishedAt ? `，发布时间：${String(res.publishedAt)}` : ""}`,
          { forceShow: true }
        );
        if (!forceUpdate) {
          const confirm = await confirmDialog({
            title: "检测到新版本",
            message: `当前版本：v${String(res?.currentVersion || "")}\n最新版本：v${String(res?.latestVersion || "")}\n${String(res?.notes || "").trim() || "检测到可用更新，是否下载最新完整安装包到 gengxin 文件夹，并自动复用“安装新版本”链路继续安装？"}`,
            confirmText: "下载并继续安装",
            cancelText: "稍后再说"
          });
          if (!confirm) return;
        }
        const downloadRes = await window.api?.appUpdate?.downloadLatestInstaller?.({
          downloadUrl: String(res?.downloadUrl || ""),
          artifactName: String(res?.artifactName || res?.raw?.manifest?.artifactName || ""),
          latestVersion: String(res?.latestVersion || ""),
          size: Math.max(0, Number(res?.size || res?.raw?.manifest?.size || 0) || 0),
          sha512: String(res?.sha512 || res?.raw?.manifest?.sha512 || ""),
          providerBaseUrl: String(res?.providerBaseUrl || ""),
          manifestOnly: res?.manifestOnly === true
        });
        if (!downloadRes?.ok) {
          setUpdateHint(String(downloadRes?.message || "下载最新安装包失败。"), { forceShow: true });
          toast(String(downloadRes?.message || "下载最新安装包失败。"), "error");
          return;
        }
        renderUpdateRuntimeState(downloadRes?.state || { stage: "idle" });
        setUpdateHint(
          forceUpdate
            ? `已触发强制更新，最新安装包已下载到 gengxin：${String(downloadRes?.installerPath || "")}。接下来会自动复用“安装新版本”链路继续安装。`
            : `最新安装包已下载到 gengxin：${String(downloadRes?.installerPath || "")}。接下来会自动复用“安装新版本”链路继续安装。`,
          { forceShow: true }
        );
        toast("最新安装包已下载完成，准备继续安装。", "info");
        const flowRes = await runInstallNewVersionFlow(String(downloadRes?.installerPath || "").trim(), {
          expectedVersion: String(res?.latestVersion || "").trim(),
          sourceLabel: "检测更新",
          skipConfirm: true
        });
        if (!flowRes?.ok && !flowRes?.canceled) return;
      } finally {
        if (!["downloading", "installing"].includes(String(currentUpdateState?.stage || "").trim())) {
          btnUpdateCheck.disabled = false;
          btnUpdateCheck.textContent = oldText;
        }
      }
    });

    btnUpdateInstallLocal?.addEventListener("click", async () => {
      if (["downloading", "installing"].includes(String(currentUpdateState?.stage || "").trim())) return;
      const openRes = await window.api?.openFile?.({
        title: "选择新版本 EXE 安装包",
        properties: ["openFile"],
        filters: [{ name: "EXE 安装包", extensions: ["exe"] }]
      });
      if (!openRes || openRes.canceled) return;
      const installerPath = String(Array.isArray(openRes?.filePaths) ? openRes.filePaths[0] || "" : "").trim();
      if (!installerPath) {
        toast("没有选中 EXE 安装包文件。", "warn");
        return;
      }
      // #region debug-point E:local-install-selected
      try {
        dbgLocalInstall96Emit("E", "settings.js:btnUpdateInstallLocal", "用户已选择本地安装包", {
          installerPath
        });
      } catch {}
      // #endregion
      lastLocalInstallerPath = installerPath;
      await runInstallNewVersionFlow(installerPath, {
        sourceLabel: "安装新版本",
        skipConfirm: false
      });
    });

    btnUpdateOpenFile?.addEventListener("click", async () => {
      const openRes = await window.api?.openFile?.({
        title: "选择要直接打开的 EXE 文件",
        properties: ["openFile"],
        filters: [{ name: "EXE 程序", extensions: ["exe"] }]
      });
      if (!openRes || openRes.canceled) return;
      const filePath = String(Array.isArray(openRes?.filePaths) ? openRes.filePaths[0] || "" : "").trim();
      if (!filePath) {
        toast("没有选中 EXE 文件。", "warn");
        return;
      }
      const openFileRes = await window.api?.appUpdate?.openLocalFile?.({ localPath: filePath });
      if (!openFileRes?.ok) {
        setUpdateHint(String(openFileRes?.message || "打开 EXE 文件失败。"), { forceShow: true });
        toast(String(openFileRes?.message || "打开 EXE 文件失败。"), "error");
        return;
      }
      setUpdateHint(`已直接打开 EXE 文件：${String(openFileRes?.openedPath || filePath)}。`, { forceShow: true });
      toast("EXE 文件已打开。", "info");
    });

    btnUpdateCloseApp?.addEventListener("click", async () => {
      setUpdateHint("正在关闭当前软件；已经通过“打开文件”按钮打开的文件窗口不会受影响。", { forceShow: true });
      toast("软件即将关闭。", "info");
      await window.api?.appUpdate?.closeApp?.({ reason: "settings-close-button" });
    });

    btnFeedbackSubmit?.addEventListener("click", async () => {
      const content = String(feedbackContent?.value || "").trim();
      if (!content) {
        if (feedbackHint) feedbackHint.textContent = "请先填写问题描述后再提交。";
        toast("请先填写反馈内容。", "warn");
        return;
      }
      btnFeedbackSubmit.disabled = true;
      const oldText = btnFeedbackSubmit.textContent;
      btnFeedbackSubmit.textContent = "提交中...";
      try {
        const ctx = await buildFeedbackContext();
        const res = await window.api?.feedback?.submit?.({
          body: {
            content,
            ...ctx
          }
        });
        if (!res?.ok) {
          const errText = String(res?.errMsg || res?.message || "提交反馈失败。");
          if (feedbackStatus) feedbackStatus.textContent = "提交失败";
          if (feedbackHint) feedbackHint.textContent = errText;
          toast(errText, "error");
          return;
        }
        if (feedbackStatus) feedbackStatus.textContent = "已提交";
        if (feedbackHint) feedbackHint.textContent = "反馈已同步到云端后台，管理员后续可直接查看并决定是否发放充值卡密。";
        if (feedbackContent) feedbackContent.value = "";
        await loadFeedbackList({ silent: true });
        toast("意见反馈已提交。");
      } finally {
        btnFeedbackSubmit.disabled = false;
        btnFeedbackSubmit.textContent = oldText;
      }
    });

    btnFeedbackRefresh?.addEventListener("click", async () => {
      const ok = await loadFeedbackList();
      if (ok) toast("反馈记录已刷新。", "info");
    });

    openClawEnabled?.addEventListener("change", async () => {
      if (openClawBusy) return;
      openClawBusy = true;
      openClawEnabled.disabled = true;
      try {
        const res = await window.api?.openClaw?.writeConfig?.({
          config: { enabled: openClawEnabled.checked === true }
        });
        if (!res?.ok) {
          renderOpenClawState({
            config: { enabled: !openClawEnabled.checked },
            state: { running: !openClawEnabled.checked }
          });
          toast(String(res?.message || "保存 OpenClaw 配置失败。"), "error");
          await loadOpenClawConfig({ silent: true });
          return;
        }
        renderOpenClawState(res);
        toast(openClawEnabled.checked ? "OpenClaw 接口已开启。" : "OpenClaw 接口已关闭。");
      } finally {
        openClawBusy = false;
        openClawEnabled.disabled = false;
      }
    });

    btnOpenClawRefresh?.addEventListener("click", async () => {
      const ok = await loadOpenClawConfig({ silent: false });
      if (ok) toast("OpenClaw 状态已刷新。", "info");
    });

    btnOpenClawGenerateSkill?.addEventListener("click", async () => {
      if (openClawBusy) return;
      openClawBusy = true;
      if (btnOpenClawGenerateSkill) btnOpenClawGenerateSkill.disabled = true;
      try {
        const res = await window.api?.openClaw?.generateSkillPackage?.({ openFolder: true }).catch?.(() => null);
        if (!res?.ok) {
          toast(String(res?.message || "生成最新 OpenClaw SKILL 文件夹失败。"), "error");
          return;
        }
        toast(`已在桌面生成最新 OpenClaw SKILL 文件夹：${String(res?.path || "").trim() || "桌面目录"}`);
      } finally {
        openClawBusy = false;
        if (btnOpenClawGenerateSkill) btnOpenClawGenerateSkill.disabled = false;
      }
    });

    const updateStateRes = await window.api?.appUpdate?.getState?.().catch?.(() => null);
    renderUpdateRuntimeState(updateStateRes?.state || { stage: "idle" });
    const unsubscribeUpdateState = window.api?.appUpdate?.onState?.((state) => {
      renderUpdateRuntimeState(state || { stage: "idle" });
      if (String(state?.stage || "").trim() === "installing") {
        setUpdateHint(String(state?.message || "更新包已下载完成，正在安装并自动重启软件..."), { forceShow: true });
      }
      if (["installing", "error", "idle"].includes(String(state?.stage || "").trim())) {
        renderUpdateDiagnostics();
      }
    });
    if (typeof unsubscribeUpdateState === "function") {
      const observer = new MutationObserver(() => {
        if (document.body.contains(root)) return;
        try {
          unsubscribeUpdateState();
        } catch {}
        observer.disconnect();
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }

    await renderUpdateConfig();
    await loadOpenClawConfig({ silent: true });
    await loadFeedbackList();

    return root;
  }
};
