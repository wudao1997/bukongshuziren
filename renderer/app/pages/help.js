import { elFromHTML, pageHeader, topToast } from "../ui.js";
import HELP_CHANGELOGS from "../data/gengxinrizhi.js";

const FALLBACK_APP_VERSION = "0.1.3";

const TOOL_STEPS = [
  "首页是主工作台，负责完成对标内容拆解、文案生成、数字人合成与成片生产的核心链路。",
  "发布管理支持打开发布页后逐项同步标题、话题、封面、发布时间，并可执行一键发布。",
  "账号管理负责多平台账号添加、测试与重新登入，账号异常时优先先到该模块处理。",
  "设置页用于维护主题和保存目录，首次部署或换电脑后优先确认本地输出路径。",
  "帮助页集中展示当前客户端统计、工具说明与更新日志，排查环境问题时优先查看这里。"
];

const TOOL_NOTES = [
  {
    title: "核心能力",
    items: ["多模块工作台统一串联", "发布流程支持分步与一键执行", "菜单与账号状态均可实时校验"]
  },
  {
    title: "使用建议",
    items: ["先确认登录状态和剩余时长", "再检查保存目录与素材来源", "最后进入发布管理完成外部平台同步"]
  },
  {
    title: "问题排查",
    items: ["先看账号是否掉线或到期", "再看网络与云端地址是否正常", "最后排查素材本身与操作步骤"]
  }
];

function formatLogDate(value) {
  const text = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function buildCurrentVersionLog(appVersion, config = {}) {
  const versionText = String(appVersion || FALLBACK_APP_VERSION).trim() || FALLBACK_APP_VERSION;
  return {
    version: versionText,
    versionLabel: `v${versionText}`,
    date: formatLogDate(config?.publishedAt || config?.updatedAt || ""),
    summary: "当前安装包版本已同步到帮助页",
    items: [
      `帮助菜单会自动显示当前安装包版本 v${versionText}，并优先读取“更新记录.md”同步过来的版本日志。`,
      String(config?.notes || "").trim() || "当前版本已完成打包，可直接用于安装或自动更新测试。",
      "后续每次生成新版本时，打包脚本都会自动把本次版本写入更新记录，并同步到帮助页日志。"
    ]
  };
}

function normalizeChangelogEntry(entry = {}) {
  const version = String(entry.version || "").trim().replace(/^v/i, "");
  if (!version) return null;
  const items = Array.isArray(entry.items) ? entry.items.map((item) => String(item || "").trim()).filter(Boolean) : [];
  return {
    version,
    versionLabel: String(entry.versionLabel || `v${version}`).trim(),
    date: formatLogDate(entry.date || ""),
    summary: String(entry.summary || "").trim() || `v${version} 版本更新`,
    items: items.length ? items : ["本次版本已同步到帮助页更新日志。"]
  };
}

function buildChangelogs(appVersion, config = {}) {
  const normalized = Array.isArray(HELP_CHANGELOGS) ? HELP_CHANGELOGS.map(normalizeChangelogEntry).filter(Boolean) : [];
  if (!normalized.length) return [buildCurrentVersionLog(appVersion, config)];
  return normalized;
}

function splitVisibleAndCollapsedLogs(logs = []) {
  const list = Array.isArray(logs) ? logs : [];
  return {
    visible: list.slice(0, 3),
    hiddenCount: Math.max(0, list.length - 3)
  };
}

function escapeHTML(value) {
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
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function toMs(value) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function formatRemaining(ms) {
  if (!ms || ms <= 0) return "已到期";
  const totalMinutes = Math.ceil(ms / 60000);
  if (totalMinutes < 60) return `${totalMinutes}分钟`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (!minutes) return `${hours}小时`;
  if (hours < 24) return `${hours}小时${minutes}分钟`;
  const days = Math.floor(hours / 24);
  const restHours = hours % 24;
  return restHours ? `${days}天${restHours}小时` : `${days}天`;
}

function formatBytes(bytes) {
  const value = Math.max(0, Number(bytes || 0) || 0);
  if (value >= 1024 * 1024 * 1024) return `${(value / (1024 * 1024 * 1024)).toFixed(2)}GB`;
  if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(2)}MB`;
  if (value >= 1024) return `${(value / 1024).toFixed(1)}KB`;
  return `${value}B`;
}

function formatCacheMode(mode) {
  return String(mode || "").trim() === "on-close" ? "关闭软件时自动清理" : "手动自行清理";
}

function summarizeAutoCacheRules(config, categories = []) {
  const selected = new Set(Array.isArray(config?.autoCategories) ? config.autoCategories : []);
  const names = (Array.isArray(categories) ? categories : [])
    .filter((item) => selected.has(String(item?.key || "").trim()))
    .map((item) => String(item?.label || "").trim())
    .filter(Boolean);
  return names.length ? names.join("、") : "未设置自动清理规则";
}

function buildCopyText(stats, versions, auth, appVersion) {
  const versionText = String(appVersion || FALLBACK_APP_VERSION).trim() || FALLBACK_APP_VERSION;
    const lines = [
    "不空IP智能体 - 帮助中心摘要",
    `当前客户端版本：v${versionText}`,
    `可见菜单数：${stats.visibleMenus}`,
    `说明条目数：${stats.guideCount}`,
      `更新版本数：${stats.logCount}`
  ];
  if (auth?.account) {
    const licenseEndAt = auth.trialEndAt || auth.licenseEndAt || auth.kamiEndAt || "";
    const remaining = formatRemaining(Math.max(0, toMs(licenseEndAt) - Date.now()));
    lines.push(`当前账号：${auth.account}`);
    lines.push(`剩余使用时间：${remaining}`);
  } else {
    lines.push("当前账号：未登录");
  }
  return lines.join("\n");
}

export const route = {
  path: "/help",
  title: "帮助与反馈",
  async render() {
    const versions = window.api?.versions?.() || {};
    const appInfo = await window.api?.appUpdate?.readConfig?.().catch?.(() => null);
    const cacheOverviewRes = await window.api?.cacheControl?.getOverview?.().catch?.(() => null);
    const appVersion = String(appInfo?.currentVersion || FALLBACK_APP_VERSION).trim() || FALLBACK_APP_VERSION;
    const changelogs = buildChangelogs(appVersion, appInfo?.config || {});
    const { visible: visibleLogs, hiddenCount } = splitVisibleAndCollapsedLogs(changelogs);
    const latestLog = visibleLogs[0] || buildCurrentVersionLog(appVersion, appInfo?.config || {});
    const auth = readAuth();
    const visibleMenus = document.querySelectorAll(".nav-item[data-route]").length || 0;
    const licenseEndAt = auth?.trialEndAt || auth?.licenseEndAt || auth?.kamiEndAt || "";
    const remainingText = auth?.account
      ? formatRemaining(Math.max(0, toMs(licenseEndAt) - Date.now()))
      : "未登录";
    const stats = {
      visibleMenus,
      guideCount: TOOL_STEPS.length,
      logCount: changelogs.length
    };
    let cacheCategories = Array.isArray(cacheOverviewRes?.categories) ? cacheOverviewRes.categories : [];
    let cacheConfig = cacheOverviewRes?.config && typeof cacheOverviewRes.config === "object" ? cacheOverviewRes.config : { mode: "manual", autoCategories: [] };
    const cacheStats = {
      categoryCount: cacheCategories.length,
      nonEmptyCount: cacheCategories.filter((item) => Number(item?.fileCount || 0) > 0).length,
      totalBytes: cacheCategories.reduce((sum, item) => sum + (Number(item?.totalBytes || 0) || 0), 0)
    };

    const statCards = [
      { label: "可见菜单", value: String(stats.visibleMenus || 0), meta: "当前左侧导航可直接进入的模块数" },
      { label: "工具说明", value: String(stats.guideCount), meta: "帮助页当前沉淀的核心使用说明条目" },
      { label: "更新版本", value: String(stats.logCount), meta: "本页已归档的版本记录总数" },
      { label: "最新版本", value: String(latestLog.versionLabel || "-"), meta: `最近一次更新日期 ${latestLog.date || "-"}` }
    ];

    const root = elFromHTML(`
      <div class="help-page">
        ${pageHeader({
          title: "帮助与反馈",
          subtitle: "集中查看当前客户端统计、工具说明和版本更新，帮助页不再使用骨架占位。",
          actionsHTML: `
            <button class="btn" id="help-open-cache-clean">清理缓存</button>
            <button class="btn" id="help-open-cache-settings">清理设置</button>
            <button class="btn" id="help-copy-info">复制系统信息</button>
            <button class="btn btn-primary" id="help-scroll-log">查看更新日志</button>
          `
        })}

        <section class="card help-hero">
          <div class="help-hero-main">
            <div class="help-hero-eyebrow">欢迎使用 AI 智能体</div>
            <h3 class="help-hero-title">当前客户端版本 v${escapeHTML(appVersion)}</h3>
            <p class="help-hero-desc">这里集中展示当前客户端统计、工具说明和最近三次更新记录。帮助菜单中的更新日志已改为直接读取打包脚本同步出来的版本记录，不再手工维护。</p>
          </div>
          <div class="help-hero-meta">
            <span class="pill">当前版本 v${escapeHTML(appVersion)}</span>
            <span class="pill">${auth?.account ? `当前账号 ${escapeHTML(auth.account)}` : "当前未登录"}</span>
            <span class="pill">剩余使用时间 ${escapeHTML(remainingText)}</span>
            <span class="pill">日志来源 更新记录.md</span>
          </div>
        </section>

        <section class="card help-section">
          <div class="card-title help-section-title">
            <div>
              <h3>数据统计</h3>
              <div class="help-section-desc">用于快速确认当前客户端结构是否完整，以及帮助页说明与版本归档数量。</div>
            </div>
            <span class="pill">本地统计</span>
          </div>
          <div class="help-stats-grid">
            ${statCards
              .map(
                (item) => `
                  <article class="help-stat-card">
                    <div class="help-stat-label">${escapeHTML(item.label)}</div>
                    <div class="help-stat-value">${escapeHTML(item.value)}</div>
                    <div class="help-stat-meta">${escapeHTML(item.meta)}</div>
                  </article>
                `
              )
              .join("")}
          </div>
        </section>

        <section class="card help-section">
          <div class="card-title help-section-title">
            <div>
              <h3>工具说明</h3>
              <div class="help-section-desc">按照实际使用顺序整理常用模块说明，帮助快速定位该去哪个菜单处理问题。</div>
            </div>
            <span class="pill">核心说明</span>
          </div>
          <div class="help-guide-layout">
            <div class="help-step-list">
              ${TOOL_STEPS
                .map(
                  (item, index) => `
                    <article class="help-step-item">
                      <div class="help-step-index">${index + 1}</div>
                      <div class="help-step-text">${escapeHTML(item)}</div>
                    </article>
                  `
                )
                .join("")}
            </div>
            <div class="help-tip-stack">
              ${TOOL_NOTES
                .map(
                  (note) => `
                    <section class="help-tip-card">
                      <div class="help-tip-title">${escapeHTML(note.title)}</div>
                      <div class="help-tip-list">
                        ${note.items
                          .map((line) => `<div class="help-tip-item">${escapeHTML(line)}</div>`)
                          .join("")}
                      </div>
                    </section>
                  `
                )
                .join("")}
            </div>
          </div>
        </section>

        <section class="card help-section">
          <div class="card-title help-section-title">
            <div>
              <h3>缓存管理</h3>
              <div class="help-section-desc">这里统一管理首页提取文案缓存、自动更新缓存和运行时临时文件。保留“提取文案标记文件”时，同一条抖音链接下次可直接复用已提取文案，不再重复下载视频。</div>
            </div>
            <span class="pill">${escapeHTML(formatCacheMode(cacheConfig.mode))}</span>
          </div>
          <div class="help-stats-grid">
            <article class="help-stat-card">
              <div class="help-stat-label">缓存分类</div>
              <div class="help-stat-value">${escapeHTML(String(cacheStats.categoryCount))}</div>
              <div class="help-stat-meta">当前帮助页可管理的缓存分类数量</div>
            </article>
            <article class="help-stat-card">
              <div class="help-stat-label">有内容分类</div>
              <div class="help-stat-value">${escapeHTML(String(cacheStats.nonEmptyCount))}</div>
              <div class="help-stat-meta">当前实际占用空间的缓存分类数量</div>
            </article>
            <article class="help-stat-card">
              <div class="help-stat-label">缓存体积</div>
              <div class="help-stat-value">${escapeHTML(formatBytes(cacheStats.totalBytes))}</div>
              <div class="help-stat-meta">当前帮助页可见缓存的总占用</div>
            </article>
            <article class="help-stat-card">
              <div class="help-stat-label">自动规则</div>
              <div class="help-stat-value">${escapeHTML(formatCacheMode(cacheConfig.mode))}</div>
              <div class="help-stat-meta">${escapeHTML(summarizeAutoCacheRules(cacheConfig, cacheCategories))}</div>
            </article>
          </div>
          <div class="help-tip-stack" id="help-cache-category-list">
            ${cacheCategories
              .map(
                (item) => `
                  <section class="help-tip-card">
                    <div class="help-tip-title">${escapeHTML(item.label || item.key || "未命名缓存")}</div>
                    <div class="help-tip-item">文件数：${escapeHTML(String(item.fileCount || 0))}</div>
                    <div class="help-tip-item">占用：${escapeHTML(formatBytes(item.totalBytes || 0))}</div>
                    <div class="help-tip-item">${escapeHTML(item.description || "")}</div>
                  </section>
                `
              )
              .join("")}
          </div>
        </section>

        <section class="card help-section" id="help-changelog">
          <div class="card-title help-section-title">
            <div>
              <h3>更新日志</h3>
              <div class="help-section-desc">这里固定展示更新记录中的最近三次版本，默认展开最新版本，可一键切换查看方式。</div>
            </div>
            <div class="help-log-toolbar">
              <span class="pill">最近三次</span>
              <button class="btn btn-small" id="help-log-latest" type="button">只看最新</button>
              <button class="btn btn-primary btn-small" id="help-log-expand" type="button">展开全部</button>
            </div>
          </div>
          <section class="help-log-spotlight">
            <div class="help-log-spotlight-main">
              <div class="help-log-spotlight-label">最新更新</div>
              <div class="help-log-spotlight-version">${escapeHTML(latestLog.versionLabel || "-")}</div>
              <div class="help-log-spotlight-summary">${escapeHTML(latestLog.summary || "")}</div>
            </div>
            <div class="help-log-spotlight-meta">
              <span class="help-log-meta-chip">更新时间 ${escapeHTML(latestLog.date || "-")}</span>
              <span class="help-log-meta-chip">已归档 ${escapeHTML(stats.logCount)} 次版本记录</span>
            </div>
          </section>
          <div class="help-log-list">
            ${visibleLogs
              .map(
                (log, index) => `
                  <article class="help-log-item ${index === 0 ? "is-open" : ""}" data-help-log>
                    <button class="help-log-trigger" type="button" data-help-toggle>
                      <div class="help-log-head">
                        <div>
                          <div class="help-log-version-row">
                            <div class="help-log-version">${escapeHTML(log.versionLabel || `v${log.version}`)}</div>
                            ${index === 0 ? `<span class="help-log-badge">最新</span>` : ""}
                          </div>
                          <div class="help-log-summary">${escapeHTML(log.summary)}</div>
                        </div>
                        <div class="help-log-side">
                          <div class="help-log-date">${escapeHTML(log.date)}</div>
                          <div class="help-log-arrow">${index === 0 ? "收起" : "展开"}</div>
                        </div>
                      </div>
                    </button>
                    <div class="help-log-body">
                      ${log.items
                        .map((line) => `<div class="help-log-line">${escapeHTML(line)}</div>`)
                        .join("")}
                    </div>
                  </article>
                `
              )
              .join("")}
            ${
              hiddenCount > 0
                ? `
                  <article class="help-log-item help-log-item-ellipsis">
                    <div class="help-log-ellipsis">......</div>
                    <div class="help-log-ellipsis-meta">其余 ${hiddenCount} 次更早版本记录已折叠隐藏。</div>
                  </article>
                `
                : ""
            }
          </div>
        </section>

        <div class="modal-overlay" id="help-cache-clean-overlay" hidden></div>
        <div class="modal" id="help-cache-clean-modal" hidden>
          <div class="modal-head">
            <div class="modal-title">清理缓存</div>
            <button class="modal-close" id="help-cache-clean-close" title="关闭">×</button>
          </div>
          <div class="modal-body">
            <div class="modal-tip">
              <div class="help-tip-item">可按分类手动清理缓存。</div>
              <div class="help-tip-item">如果保留“提取文案标记文件”，同一抖音链接下次仍可直接复用已提取文案。</div>
            </div>
            <div id="help-cache-clean-list"></div>
          </div>
          <div class="modal-foot" style="justify-content: space-between">
            <button class="btn" id="help-cache-clean-select-filled" type="button">勾选有内容分类</button>
            <div style="display:flex;gap:8px;">
              <button class="btn" id="help-cache-clean-cancel" type="button">取消</button>
              <button class="btn btn-primary" id="help-cache-clean-submit" type="button">立即清理</button>
            </div>
          </div>
        </div>

        <div class="modal-overlay" id="help-cache-settings-overlay" hidden></div>
        <div class="modal" id="help-cache-settings-modal" hidden>
          <div class="modal-head">
            <div class="modal-title">清理设置</div>
            <button class="modal-close" id="help-cache-settings-close" title="关闭">×</button>
          </div>
          <div class="modal-body">
            <div class="modal-tip">
              <div class="help-tip-item">可选择关闭软件时自动清理，或改成完全手动清理。</div>
              <div class="help-tip-item">自动清理规则只会作用于下方勾选的缓存分类。</div>
            </div>
            <div style="display:grid;gap:12px;">
              <label class="help-tip-item"><input type="radio" name="help-cache-mode" value="manual" /> 手动自行清理</label>
              <label class="help-tip-item"><input type="radio" name="help-cache-mode" value="on-close" /> 关闭软件时自动清理</label>
            </div>
            <div id="help-cache-settings-list" style="margin-top:12px;"></div>
          </div>
          <div class="modal-foot">
            <button class="btn" id="help-cache-settings-cancel" type="button">取消</button>
            <button class="btn btn-primary" id="help-cache-settings-submit" type="button">保存设置</button>
          </div>
        </div>
      </div>
    `);

    const openCacheCleanBtn = root.querySelector("#help-open-cache-clean");
    const openCacheSettingsBtn = root.querySelector("#help-open-cache-settings");
    const copyBtn = root.querySelector("#help-copy-info");
    const logBtn = root.querySelector("#help-scroll-log");
    const changelog = root.querySelector("#help-changelog");
    const latestOnlyBtn = root.querySelector("#help-log-latest");
    const expandAllBtn = root.querySelector("#help-log-expand");
    const cacheCategoryList = root.querySelector("#help-cache-category-list");
    const cacheCleanOverlay = root.querySelector("#help-cache-clean-overlay");
    const cacheCleanModal = root.querySelector("#help-cache-clean-modal");
    const cacheSettingsOverlay = root.querySelector("#help-cache-settings-overlay");
    const cacheSettingsModal = root.querySelector("#help-cache-settings-modal");
    const cacheCleanList = root.querySelector("#help-cache-clean-list");
    const cacheSettingsList = root.querySelector("#help-cache-settings-list");

    const openModal = (overlay, modal) => {
      if (!overlay || !modal) return;
      overlay.hidden = false;
      modal.hidden = false;
    };

    const closeModal = (overlay, modal) => {
      if (!overlay || !modal) return;
      overlay.hidden = true;
      modal.hidden = true;
    };

    const refreshCacheState = async () => {
      const res = await window.api?.cacheControl?.getOverview?.().catch?.(() => null);
      cacheCategories = Array.isArray(res?.categories) ? res.categories : [];
      cacheConfig = res?.config && typeof res.config === "object" ? res.config : { mode: "manual", autoCategories: [] };
    };

    const renderCacheCategorySummary = () => {
      if (!cacheCategoryList) return;
      cacheCategoryList.innerHTML = cacheCategories
        .map(
          (item) => `
            <section class="help-tip-card">
              <div class="help-tip-title">${escapeHTML(item.label || item.key || "未命名缓存")}</div>
              <div class="help-tip-item">文件数：${escapeHTML(String(item.fileCount || 0))}</div>
              <div class="help-tip-item">占用：${escapeHTML(formatBytes(item.totalBytes || 0))}</div>
              <div class="help-tip-item">${escapeHTML(item.description || "")}</div>
            </section>
          `
        )
        .join("");
    };

    const renderCacheCleanList = (defaultFilledOnly = false) => {
      if (!cacheCleanList) return;
      cacheCleanList.innerHTML = cacheCategories
        .map((item) => {
          const checked = defaultFilledOnly ? Number(item?.fileCount || 0) > 0 : true;
          return `
            <label class="help-tip-item" style="display:block;margin-bottom:10px;">
              <input type="checkbox" data-cache-clean-key="${escapeHTML(item.key || "")}" ${checked ? "checked" : ""} />
              ${escapeHTML(item.label || item.key || "未命名缓存")}｜${escapeHTML(formatBytes(item.totalBytes || 0))}｜${escapeHTML(String(item.fileCount || 0))}个文件
              <div style="margin-left:22px;color:#666;">${escapeHTML(item.description || "")}</div>
            </label>
          `;
        })
        .join("");
    };

    const renderCacheSettingsList = () => {
      if (!cacheSettingsList) return;
      const selected = new Set(Array.isArray(cacheConfig?.autoCategories) ? cacheConfig.autoCategories : []);
      root.querySelectorAll('input[name="help-cache-mode"]').forEach((input) => {
        input.checked = input.value === String(cacheConfig?.mode || "manual");
      });
      cacheSettingsList.innerHTML = cacheCategories
        .map(
          (item) => `
            <label class="help-tip-item" style="display:block;margin-bottom:10px;">
              <input type="checkbox" data-cache-setting-key="${escapeHTML(item.key || "")}" ${selected.has(String(item?.key || "")) ? "checked" : ""} />
              ${escapeHTML(item.label || item.key || "未命名缓存")}
              <div style="margin-left:22px;color:#666;">${escapeHTML(item.description || "")}</div>
            </label>
          `
        )
        .join("");
    };

    const setLogOpenMode = (mode = "latest") => {
      const items = Array.from(root.querySelectorAll("[data-help-log]"));
      items.forEach((item, index) => {
        const opened = mode === "all" ? true : index === 0;
        item.classList.toggle("is-open", opened);
        const arrow = item.querySelector(".help-log-arrow");
        if (arrow) arrow.textContent = opened ? "收起" : "展开";
      });
    };

    copyBtn?.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(buildCopyText(stats, versions, auth, appVersion));
        topToast("系统信息已复制。", { type: "success" });
      } catch {
        topToast("复制失败。", { type: "error" });
      }
    });

    logBtn?.addEventListener("click", () => {
      changelog?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    latestOnlyBtn?.addEventListener("click", () => {
      setLogOpenMode("latest");
    });

    expandAllBtn?.addEventListener("click", () => {
      setLogOpenMode("all");
    });

    openCacheCleanBtn?.addEventListener("click", async () => {
      await refreshCacheState();
      renderCacheCategorySummary();
      renderCacheCleanList(true);
      openModal(cacheCleanOverlay, cacheCleanModal);
    });

    openCacheSettingsBtn?.addEventListener("click", async () => {
      await refreshCacheState();
      renderCacheCategorySummary();
      renderCacheSettingsList();
      openModal(cacheSettingsOverlay, cacheSettingsModal);
    });

    root.querySelector("#help-cache-clean-close")?.addEventListener("click", () => closeModal(cacheCleanOverlay, cacheCleanModal));
    root.querySelector("#help-cache-clean-cancel")?.addEventListener("click", () => closeModal(cacheCleanOverlay, cacheCleanModal));
    cacheCleanOverlay?.addEventListener("click", () => closeModal(cacheCleanOverlay, cacheCleanModal));
    root.querySelector("#help-cache-settings-close")?.addEventListener("click", () => closeModal(cacheSettingsOverlay, cacheSettingsModal));
    root.querySelector("#help-cache-settings-cancel")?.addEventListener("click", () => closeModal(cacheSettingsOverlay, cacheSettingsModal));
    cacheSettingsOverlay?.addEventListener("click", () => closeModal(cacheSettingsOverlay, cacheSettingsModal));

    root.querySelector("#help-cache-clean-select-filled")?.addEventListener("click", () => {
      cacheCleanList?.querySelectorAll("[data-cache-clean-key]").forEach((input) => {
        const key = String(input.getAttribute("data-cache-clean-key") || "").trim();
        const item = cacheCategories.find((row) => String(row?.key || "").trim() === key);
        input.checked = Number(item?.fileCount || 0) > 0;
      });
    });

    root.querySelector("#help-cache-clean-submit")?.addEventListener("click", async () => {
      const keys = Array.from(cacheCleanList?.querySelectorAll("[data-cache-clean-key]:checked") || []).map((input) =>
        String(input.getAttribute("data-cache-clean-key") || "").trim()
      );
      if (!keys.length) {
        topToast("请先选择要清理的缓存分类。", { type: "warn" });
        return;
      }
      const res = await window.api?.cacheControl?.clear?.({ keys, reason: "manual" }).catch?.(() => null);
      if (res?.ok !== true) {
        topToast(String(res?.message || "清理缓存失败。"), { type: "error" });
        return;
      }
      await refreshCacheState();
      renderCacheCategorySummary();
      renderCacheCleanList(true);
      topToast(`已清理 ${String(res?.removedFileCount || 0)} 个文件，释放 ${formatBytes(res?.removedBytes || 0)}。`, { type: "success" });
      closeModal(cacheCleanOverlay, cacheCleanModal);
    });

    root.querySelector("#help-cache-settings-submit")?.addEventListener("click", async () => {
      const mode = Array.from(root.querySelectorAll('input[name="help-cache-mode"]')).find((input) => input.checked)?.value || "manual";
      const autoCategories = Array.from(cacheSettingsList?.querySelectorAll("[data-cache-setting-key]:checked") || []).map((input) =>
        String(input.getAttribute("data-cache-setting-key") || "").trim()
      );
      const res = await window.api?.cacheControl?.writeConfig?.({ mode, autoCategories }).catch?.(() => null);
      if (res?.ok !== true) {
        topToast(String(res?.message || "保存清理设置失败。"), { type: "error" });
        return;
      }
      await refreshCacheState();
      renderCacheCategorySummary();
      renderCacheSettingsList();
      topToast("清理设置已保存。", { type: "success" });
      closeModal(cacheSettingsOverlay, cacheSettingsModal);
    });

    root.querySelectorAll("[data-help-toggle]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const item = btn.closest("[data-help-log]");
        if (!item) return;
        const items = Array.from(root.querySelectorAll("[data-help-log]"));
        items.forEach((current) => {
          if (current !== item) {
            current.classList.remove("is-open");
            const currentArrow = current.querySelector(".help-log-arrow");
            if (currentArrow) currentArrow.textContent = "展开";
          }
        });
        const opened = item.classList.toggle("is-open");
        const arrow = item.querySelector(".help-log-arrow");
        if (arrow) arrow.textContent = opened ? "收起" : "展开";
      });
    });

    renderCacheCategorySummary();

    return root;
  }
};
