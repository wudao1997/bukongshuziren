// 同行监控工作台：提供主页对标、作品对标、同步规则和趋势分析四个标签页视图。

import { elFromHTML, pageHeader, topToast } from "../ui.js";
import {
  buildEmptyMonitorRule,
  buildMonitorAlertsByRules,
  createMonitorAccountFromSnapshot,
  createMonitorAccountFromUrl,
  detectMonitorPlatformFromText,
  extractMonitorFirstUrl,
  getManualMonitorWorkAccountId,
  getMonitorPlatformList,
  getMonitorPlatformMeta,
  getMonitorTrackOptions,
  mergeMonitorAccountSnapshot,
  mergeMonitorWorkSummary,
  readMonitorWorkspace,
  syncMonitorWorkspace,
  upsertManualMonitorWork,
  writeMonitorWorkspace
} from "../data/tonghangjiankongdata.js";
import {
  cancelMonitorCapture,
  collectMonitorAwemeSummary,
  collectMonitorHomepageSnapshot,
  downloadMonitorVideo,
  exportMonitorWorksTable,
  getMonitorCaptureLoginStatus,
  getMonitorCaptureState,
  openMonitorCaptureLogin
} from "../gongneng/tonghangjiankongtongbu.js";

const TAB_LIST = [
  { id: "accounts", label: "对标主页列表" },
  { id: "works", label: "对标作品列表" },
  { id: "conditions", label: "条件设置" },
  { id: "trends", label: "同行趋势分析" }
];

const ACCOUNT_PAGE_SIZE = 10;

const METRIC_LABELS = {
  fans: "粉丝",
  likes: "点赞",
  worksCount: "作品数",
  fans_delta: "粉丝增量",
  likes_delta: "点赞增量",
  new_works: "新增作品数",
  works_total: "作品总数",
  fans_total: "粉丝总量",
  likes_total: "点赞总量"
};

function escapeHtml(value = "") {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatNumber(value) {
  const number = Number(value || 0) || 0;
  if (number >= 100000000) return `${(number / 100000000).toFixed(1)}亿`;
  if (number >= 10000) return `${(number / 10000).toFixed(1)}万`;
  return number.toLocaleString("zh-CN");
}

function formatTime(value) {
  const date = value ? new Date(value) : new Date();
  if (!Number.isFinite(date.getTime())) return "--";
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

function formatRelativeMinutes(value) {
  const date = value ? new Date(value) : new Date();
  if (!Number.isFinite(date.getTime())) return "--";
  const diff = Math.max(0, Date.now() - date.getTime());
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  return `${Math.round(hours / 24)} 天前`;
}

function metricLabel(metric) {
  return METRIC_LABELS[String(metric || "").trim()] || "指标";
}

function operatorLabel(value) {
  const operator = String(value || ">=").trim();
  if (operator === ">") return ">";
  if (operator === "<") return "<";
  if (operator === "<=") return "<=";
  if (operator === "=" || operator === "==") return "=";
  return ">=";
}

function getLatestSyncTime(accounts = []) {
  const times = (Array.isArray(accounts) ? accounts : [])
    .map((item) => new Date(item?.lastSyncAt || 0).getTime())
    .filter((item) => Number.isFinite(item) && item > 0);
  return times.length ? new Date(Math.max(...times)).toISOString() : "";
}

function getOverview(workspace) {
  const accounts = Array.isArray(workspace?.accounts) ? workspace.accounts : [];
  const platforms = Array.from(new Set(accounts.map((item) => item.platform).filter(Boolean)));
  const totalFans = accounts.reduce((sum, item) => sum + (Number(item?.fans || 0) || 0), 0);
  const totalLikes = accounts.reduce((sum, item) => sum + (Number(item?.likes || 0) || 0), 0);
  return {
    accountCount: accounts.length,
    platformCount: platforms.length,
    totalFans,
    totalLikes,
    alertCount: Array.isArray(workspace?.alerts) ? workspace.alerts.length : 0,
    latestSyncAt: getLatestSyncTime(accounts)
  };
}

function groupAccounts(accounts = [], platformFilter = "all", groupMode = "platform") {
  const groups = {};
  (Array.isArray(accounts) ? accounts : []).forEach((item) => {
    if (platformFilter !== "all" && item.platform !== platformFilter) return;
    const key = groupMode === "track" ? String(item.track || "未分类赛道").trim() || "未分类赛道" : item.platform || "unknown";
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  });
  return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0], "zh-CN"));
}

function flattenWorks(accounts = [], manualWorks = []) {
  const accountWorks = (Array.isArray(accounts) ? accounts : [])
    .flatMap((account) =>
      (Array.isArray(account.works) ? account.works : []).map((work) => ({
        ...work,
        accountId: account.id,
        accountName: account.name,
        platform: account.platform,
        homepageUrl: account.homepageUrl,
        workScope: "account"
      }))
    )
    .sort((a, b) => new Date(b.publishAt).getTime() - new Date(a.publishAt).getTime());
  const extraWorks = (Array.isArray(manualWorks) ? manualWorks : [])
    .map((work) => ({
      ...work,
      accountId: getManualMonitorWorkAccountId(),
      accountName:
        String(work?.accountName || "").trim() && !/^(手动提取|手动作品|作者待获取)$/i.test(String(work?.accountName || "").trim())
          ? String(work?.accountName || "").trim()
          : String(work?.authorName || work?.nickname || work?.author?.nickname || "手动提取").trim() || "手动提取",
      platform: String(work?.platform || "douyin").trim() || "douyin",
      homepageUrl: String(work?.homepageUrl || "").trim(),
      workScope: "manual"
    }))
    .sort((a, b) => new Date(b.publishAt).getTime() - new Date(a.publishAt).getTime());
  return [...extraWorks, ...accountWorks].sort((a, b) => new Date(b.publishAt).getTime() - new Date(a.publishAt).getTime());
}

function buildMonitorTrackOptionList(workspace) {
  const defaults = getMonitorTrackOptions();
  const dynamic = (Array.isArray(workspace?.accounts) ? workspace.accounts : []).map((item) => String(item?.track || "").trim()).filter(Boolean);
  return Array.from(new Set([...defaults, ...dynamic]));
}

function getMonitorWorkRowKey(item) {
  return `${String(item?.accountId || "").trim()}:${String(item?.id || item?.awemeId || "").trim()}`;
}

function getMonitorWorkExtractMethodLabel(item) {
  if (String(item?.workScope || "").trim() === "manual") return "手动提取";
  if (/手动/i.test(String(item?.extractFrom || "").trim())) return "手动提取";
  return "主页提取";
}

function sanitizeMonitorAccountSignature(value = "") {
  const text = String(value || "").trim();
  if (!text) return "";
  const percentMatches = text.match(/%[0-9A-Fa-f]{2}/g) || [];
  const encodedRatio = text ? percentMatches.length / Math.max(1, text.length / 3) : 0;
  const hasEncodedNoise = percentMatches.length >= 12 && encodedRatio > 0.45;
  const hasSuspiciousBlob = /[A-Za-z0-9+/=]{160,}/.test(text);
  const urlMatches = text.match(/https?:\/\/|www\.|%2F|%3A|\.com|\.cn|\.net/gi) || [];
  const hasTooManyLinks = urlMatches.length >= 6;
  const tooLongWithLinks = text.length >= 220 && urlMatches.length >= 3;
  const hasDenseMixedNoise = text.length >= 180 && /[%=&?/_-]/.test(text) && /[A-Za-z]/.test(text) && /[\u4e00-\u9fa5]/.test(text);
  if (hasEncodedNoise || hasSuspiciousBlob || hasTooManyLinks || tooLongWithLinks || hasDenseMixedNoise) {
    return "主页简介存在异常编码内容，已自动隐藏，请点击“打开主页”在浏览器中查看原始主页。";
  }
  return text;
}

function pickLatestWorks(works = [], limit = 1) {
  return (Array.isArray(works) ? works : [])
    .slice()
    .sort((left, right) => new Date(right?.publishAt || right?.create_time || right?.createTime || 0).getTime() - new Date(left?.publishAt || left?.create_time || left?.createTime || 0).getTime())
    .slice(0, Math.max(1, Number(limit || 1) || 1));
}

function buildLineChart(points = [], metric = "fans") {
  const list = Array.isArray(points) ? points : [];
  if (!list.length) {
    return `<div class="empty">暂无趋势数据</div>`;
  }
  const width = 760;
  const height = 260;
  const paddingX = 42;
  const paddingY = 24;
  const values = list.map((item) => Number(item?.[metric] || 0) || 0);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  const coords = list.map((item, index) => {
    const x = list.length === 1 ? width / 2 : paddingX + (index * (width - paddingX * 2)) / (list.length - 1);
    const y = height - paddingY - ((Number(item?.[metric] || 0) - min) / range) * (height - paddingY * 2);
    return { x, y, value: Number(item?.[metric] || 0) || 0, date: String(item?.date || "").trim() };
  });
  const polyline = coords.map((item) => `${item.x},${item.y}`).join(" ");
  const area = `${polyline} ${coords[coords.length - 1].x},${height - paddingY} ${coords[0].x},${height - paddingY}`;
  return `
    <svg class="cmon-chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="同行趋势分析图表">
      <defs>
        <linearGradient id="cmonTrendArea" x1="0" x2="0" y1="0" y2="1">
          <stop stop-color="rgba(90,167,255,.42)" offset="0%"></stop>
          <stop stop-color="rgba(90,167,255,0)" offset="100%"></stop>
        </linearGradient>
      </defs>
      <path d="M${paddingX} ${height - paddingY}H${width - paddingX} M${paddingX} ${height * 0.65}H${width - paddingX} M${paddingX} ${height * 0.35}H${width - paddingX}" class="cmon-chart-grid"></path>
      <polygon points="${area}" class="cmon-chart-area"></polygon>
      <polyline points="${polyline}" class="cmon-chart-line"></polyline>
      ${coords
        .map(
          (item) => `
            <g class="cmon-chart-point">
              <circle cx="${item.x}" cy="${item.y}" r="5"></circle>
              <text x="${item.x}" y="${height - 6}" text-anchor="middle">${escapeHtml(item.date.slice(5))}</text>
            </g>
          `
        )
        .join("")}
    </svg>
  `;
}

export const route = {
  path: "/monitor",
  title: "同行监控",
  async render() {
    const root = elFromHTML(`<div class="cmon-page"></div>`);
    let workspace = readMonitorWorkspace();
    let activeTab = "accounts";
    let accountPages = {};
    const expandedSignatureAccountIds = new Set();
    const selectedWorkRowKeys = new Set();
    const activeAccountSyncJobs = new Map();
    let autoSyncing = false;
    let captureTicker = 0;
    let captureStatePoller = 0;
    let captureLoginState = {
      loggedIn: false,
      accountName: "",
      updatedAt: ""
    };
    let customTrackEditor = {
      accountId: "",
      value: ""
    };
    let activeCaptureJob = {
      action: "",
      accountId: "",
      targetId: "",
      sessionId: ""
    };
    let captureState = {
      visible: false,
      working: false,
      percent: 0,
      status: "",
      logs: []
    };
    let filters = {
      accountsPlatform: "all",
      worksPlatform: "all",
      worksAccountId: "all",
      worksKeyword: "",
      worksSort: "publish_desc",
      extractFrom: "",
      extractTo: "",
      extractLikesMin: "",
      extractCommentsMin: "",
      extractSharesMin: "",
      extractCollectsMin: "",
      extractLimit: "10",
      trendAccountId: workspace.accounts[0]?.id || "",
      trendMetric: "fans",
      trendRange: "30"
    };

    const pushCaptureLog = (text, level = "info") => {
      const message = String(text || "").trim();
      if (!message) return;
      const nextLogs = Array.isArray(captureState.logs) ? captureState.logs.slice(0, 119) : [];
      nextLogs.unshift({
        time: formatTime(new Date().toISOString()),
        text: message,
        level: String(level || "info").trim() || "info"
      });
      captureState = {
        ...captureState,
        visible: true,
        logs: nextLogs
      };
    };

    const updateCaptureState = ({ visible, working, percent, status, appendLog, level = "info" } = {}) => {
      const nextPercent = Number.isFinite(Number(percent)) ? Math.max(0, Math.min(100, Math.round(Number(percent) || 0))) : null;
      captureState = {
        ...captureState,
        ...(typeof visible === "boolean" ? { visible } : {}),
        ...(typeof working === "boolean" ? { working } : {}),
        ...(nextPercent !== null
          ? {
              percent:
                captureState.working === false || working === false
                  ? nextPercent
                  : Math.max(0, Math.min(100, Math.max(Number(captureState.percent || 0) || 0, nextPercent)))
            }
          : {}),
        ...(typeof status === "string" ? { status: String(status || "").trim() } : {})
      };
      if (appendLog) pushCaptureLog(appendLog, level);
      syncCapturePanelDom();
    };

    const appendCaptureLogs = (entries = []) => {
      const list = Array.isArray(entries) ? entries : [];
      if (!list.length) return;
      const nextLogs = Array.isArray(captureState.logs) ? captureState.logs.slice(0, 119) : [];
      list.forEach((item) => {
        const message = String(item?.text || item?.message || "").trim();
        if (!message) return;
        nextLogs.unshift({
          time: formatTime(item?.time || new Date().toISOString()),
          text: message,
          level: String(item?.level || "info").trim() || "info"
        });
      });
      captureState = {
        ...captureState,
        visible: true,
        logs: nextLogs.slice(0, 120)
      };
      syncCapturePanelDom();
    };

    const stopCaptureProgressTicker = () => {
      if (captureTicker) {
        window.clearInterval(captureTicker);
        captureTicker = 0;
      }
    };

    const stopCaptureStatePoller = () => {
      if (captureStatePoller) {
        window.clearInterval(captureStatePoller);
        captureStatePoller = 0;
      }
    };

    const setActiveCaptureJob = ({ action = "", accountId = "", targetId = "", sessionId = "" } = {}) => {
      activeCaptureJob = {
        action: String(action || "").trim(),
        accountId: String(accountId || "").trim(),
        targetId: String(targetId || accountId || "").trim(),
        sessionId: String(sessionId || "").trim()
      };
    };

    const resetActiveCaptureJob = () => {
      setActiveCaptureJob();
    };

    const isActiveCaptureAction = (action = "", targetId = "") =>
      activeCaptureJob.action === String(action || "").trim() &&
      (!String(targetId || "").trim() || activeCaptureJob.targetId === String(targetId || "").trim()) &&
      !!activeCaptureJob.sessionId;

    const buildCaptureSessionId = (prefix = "monitor", targetId = "") =>
      `${String(prefix || "monitor").trim()}_${String(targetId || "job").replace(/[^\w-]/g, "_")}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const cancelCurrentCaptureJob = async (fallbackName = "当前任务") => {
      if (!activeCaptureJob.sessionId) throw new Error("当前没有可停止的执行任务");
      const cancelRes = await cancelMonitorCapture({ sessionId: activeCaptureJob.sessionId });
      if (!cancelRes?.ok) throw new Error(String(cancelRes?.message || "停止执行失败"));
      updateCaptureState({
        visible: true,
        working: true,
        appendLog: `已向后台发送停止指令：${fallbackName}`,
        level: "warn"
      });
      topToast("已发送停止指令，正在终止当前执行。", { type: "warn" });
    };

    const setActiveAccountSyncJob = (accountId = "", sessionId = "") => {
      const id = String(accountId || "").trim();
      const sid = String(sessionId || "").trim();
      if (!id || !sid) return;
      activeAccountSyncJobs.set(id, sid);
    };

    const resetActiveAccountSyncJob = (accountId = "") => {
      const id = String(accountId || "").trim();
      if (!id) return;
      activeAccountSyncJobs.delete(id);
    };

    const isActiveAccountSync = (accountId = "") => {
      const id = String(accountId || "").trim();
      return !!(id && activeAccountSyncJobs.get(id));
    };

    const cancelAccountSyncJob = async (accountId = "", fallbackName = "当前账号") => {
      const id = String(accountId || "").trim();
      const sessionId = id ? String(activeAccountSyncJobs.get(id) || "").trim() : "";
      if (!sessionId) throw new Error("当前账号没有可停止的同步任务");
      const cancelRes = await cancelMonitorCapture({ sessionId });
      if (!cancelRes?.ok) throw new Error(String(cancelRes?.message || "停止执行失败"));
      updateCaptureState({
        visible: true,
        working: true,
        appendLog: `已向后台发送停止指令：${fallbackName}`,
        level: "warn"
      });
      topToast("已发送停止指令，正在终止当前账号同步。", { type: "warn" });
    };

    const parseMonitorPublishTime = (value) => {
      const raw = value == null ? "" : String(value).trim();
      if (!raw) return 0;
      if (/^\d+$/.test(raw)) {
        const num = Number(raw || 0) || 0;
        const time = num > 9999999999 ? num : num * 1000;
        return Number.isFinite(time) ? time : 0;
      }
      const parsed = new Date(raw).getTime();
      return Number.isFinite(parsed) ? parsed : 0;
    };

    const isCaptureLoginRequiredMessage = (message = "") => /登录|验证|response为空|未捕获到作品详情协议|未捕获到作品列表协议/i.test(String(message || ""));

    const refreshMonitorCaptureLoginState = async ({ silent = false } = {}) => {
      try {
        const result = await getMonitorCaptureLoginStatus();
        captureLoginState = {
          loggedIn: result?.loggedIn === true,
          accountName: String(result?.accountName || "").trim(),
          updatedAt: String(result?.updatedAt || "").trim()
        };
        if (!silent) render();
      } catch {}
    };

    const promptMonitorCaptureLogin = async (message = "") => {
      updateCaptureState({
        visible: true,
        working: false,
        percent: 100,
        status: "需要登录采集账号",
        appendLog: String(message || "当前采集环境疑似未登录抖音采集账号，请先登录后再继续提取。"),
        level: "warn"
      });
      topToast("当前采集环境疑似未登录，请先进行采集账号登录。", { type: "warn" });
    };

    const startCaptureProgressTicker = (steps = []) => {
      stopCaptureProgressTicker();
      const queue = (Array.isArray(steps) ? steps : []).map((item) => String(item || "").trim()).filter(Boolean);
      let stepIndex = 0;
      captureTicker = window.setInterval(() => {
        if (!captureState.working) {
          stopCaptureProgressTicker();
          return;
        }
        if (stepIndex < queue.length) {
          updateCaptureState({
            percent: Math.max(captureState.percent, Math.min(82, 20 + stepIndex * 14)),
            status: queue[stepIndex],
            appendLog: queue[stepIndex]
          });
          stepIndex += 1;
          return;
        }
        const nextPercent = Math.max(captureState.percent, Math.min(86, captureState.percent + 2));
        if (nextPercent !== captureState.percent) {
          updateCaptureState({
            percent: nextPercent,
            status: queue[queue.length - 1] || captureState.status || "正在采集中..."
          });
        }
      }, 850);
    };

    const persist = () => {
      workspace = writeMonitorWorkspace(workspace);
    };

    const notifyAlerts = (beforeCount) => {
      const nextCount = Array.isArray(workspace.alerts) ? workspace.alerts.length : 0;
      if (nextCount <= beforeCount) return;
      const latest = workspace.alerts[0];
      if (!latest) return;
      if (workspace.settings.remindMode === "toast") {
        topToast(`提醒：${latest.message}`, { type: latest.level === "high" ? "warn" : "info" });
      }
    };

    const syncAccounts = (targetIds = []) => {
      const beforeCount = Array.isArray(workspace.alerts) ? workspace.alerts.length : 0;
      workspace = syncMonitorWorkspace(workspace, targetIds);
      persist();
      notifyAlerts(beforeCount);
      render();
    };

    const filterWorksForImport = (works = [], options = {}) => {
      const from = String(options.from || "").trim() ? new Date(`${options.from}T00:00:00`).getTime() : 0;
      const to = String(options.to || "").trim() ? new Date(`${options.to}T23:59:59`).getTime() : 0;
      const minLikes = Math.max(0, Number(options.likesMin || 0) || 0);
      const minComments = Math.max(0, Number(options.commentsMin || 0) || 0);
      const minShares = Math.max(0, Number(options.sharesMin || 0) || 0);
      const minCollects = Math.max(0, Number(options.collectsMin || 0) || 0);
      const limit = Math.max(1, Math.min(20, Number(options.limit || 10) || 10));
      return (Array.isArray(works) ? works : [])
        .filter((item) => {
          const rawTime = item?.publishAt || item?.create_time || item?.createTime || 0;
          const published = parseMonitorPublishTime(rawTime);
          const stats = item?.statistics && typeof item.statistics === "object" ? item.statistics : {};
          const likes = Number(item?.likes ?? stats?.digg_count ?? stats?.diggCount ?? 0) || 0;
          const comments = Number(item?.comments ?? stats?.comment_count ?? stats?.commentCount ?? 0) || 0;
          const shares = Number(item?.shares ?? stats?.share_count ?? stats?.shareCount ?? 0) || 0;
          const collects = Number(item?.collects ?? stats?.collect_count ?? stats?.collectCount ?? 0) || 0;
          if (from && (!Number.isFinite(published) || published < from)) return false;
          if (to && (!Number.isFinite(published) || published > to)) return false;
          if (likes < minLikes) return false;
          if (comments < minComments) return false;
          if (shares < minShares) return false;
          if (collects < minCollects) return false;
          return true;
        })
        .slice(0, limit);
    };

    const formatExtractionOptionsLog = (options = {}) => {
      const source = options && typeof options === "object" ? options : {};
      return [
        `发布时间 ${source.from || "不限"} ~ ${source.to || "不限"}`,
        `最低点赞 ${source.likesMin || "不限"}`,
        `最低评论 ${source.commentsMin || "不限"}`,
        `最低转发 ${source.sharesMin || "不限"}`,
        `最低收藏 ${source.collectsMin || "不限"}`,
        `最多同步 ${source.limit || "10"} 条`
      ].join("；");
    };

    const applyRealtimeSnapshot = (accountId, snapshot, extractionOptions = null) => {
      const beforeCount = Array.isArray(workspace.alerts) ? workspace.alerts.length : 0;
      const prev = workspace.accounts.find((item) => item.id === accountId) || null;
      const sourceWorks = Array.isArray(snapshot?.works) ? snapshot.works : [];
      const filteredWorks = extractionOptions ? filterWorksForImport(sourceWorks, extractionOptions) : pickLatestWorks(sourceWorks, 1);
      const normalizedSnapshot = extractionOptions ? { ...snapshot, works: filteredWorks } : snapshot;
      const merged = prev ? mergeMonitorAccountSnapshot(prev, { ...normalizedSnapshot, works: filteredWorks }) : createMonitorAccountFromSnapshot({ ...normalizedSnapshot, works: filteredWorks });
      workspace.accounts = prev
        ? workspace.accounts.map((item) => (item.id === accountId ? merged : item))
        : [merged, ...workspace.accounts];
      const nextAlerts = buildMonitorAlertsByRules(workspace.rules, merged);
      workspace.alerts = [...nextAlerts, ...workspace.alerts].slice(0, 60);
      persist();
      notifyAlerts(beforeCount);
      return {
        merged,
        sourceWorks,
        filteredWorks
      };
    };

    const collectRealtimeSnapshotByInput = async (input, { platform = "", recentCount = 10, sessionId = "" } = {}) => {
      const finalSessionId = String(sessionId || `monitor_capture_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`).trim();
      const pollCursor = { seq: 0 };
      const syncBackendCaptureState = async () => {
        const stateRes = await getMonitorCaptureState({ sessionId: finalSessionId });
        const session = stateRes?.session;
        if (!session || typeof session !== "object") return;
        const logs = Array.isArray(session.logs) ? session.logs : [];
        const newLogs = logs
          .filter((item) => Number(item?.seq || 0) > Number(pollCursor.seq || 0))
          .sort((left, right) => Number(left?.seq || 0) - Number(right?.seq || 0));
        if (newLogs.length) {
          pollCursor.seq = Math.max(pollCursor.seq, ...newLogs.map((item) => Number(item?.seq || 0) || 0));
          appendCaptureLogs(newLogs);
        }
        captureState = {
          ...captureState,
          ...(typeof session.visible === "boolean" ? { visible: session.visible } : {}),
          ...(typeof session.working === "boolean" ? { working: session.working } : {}),
          ...(Number.isFinite(Number(session.percent))
            ? { percent: Math.max(Number(captureState.percent || 0) || 0, Math.max(0, Math.min(100, Math.round(Number(session.percent) || 0)))) }
            : {}),
          ...(typeof session.status === "string" ? { status: String(session.status || "").trim() } : {})
        };
        syncCapturePanelDom();
        return session;
      };
      updateCaptureState({
        visible: true,
        working: true,
        percent: 12,
        status: "正在解析链接并准备采集主页信息...",
        appendLog: `开始采集：${String(input || "").slice(0, 120)}`
      });
      stopCaptureStatePoller();
      captureStatePoller = window.setInterval(() => {
        syncBackendCaptureState().catch(() => {});
      }, 700);
      try {
        let latestSession = await syncBackendCaptureState().catch(() => null);
        const result = await collectMonitorHomepageSnapshot({
          input,
          platform,
          recentCount,
          sessionId: finalSessionId
        });
        latestSession = await syncBackendCaptureState().catch(() => latestSession);
        stopCaptureStatePoller();
        if (pollCursor.seq <= 0 && Array.isArray(result?.debugSteps)) {
          result.debugSteps.forEach((item, index) => {
            updateCaptureState({
              percent: 20 + Math.round(((index + 1) / Math.max(1, result.debugSteps.length)) * 55),
              status: String(item || "").trim() || "正在采集中...",
              appendLog: item
            });
          });
        }
        if (!result?.ok) {
          const message = String(result?.message || "主页内容提取失败");
          const error = new Error(message);
          error.requiresLogin = result?.requiresLogin === true || latestSession?.requiresLogin === true;
          error.canceled = result?.canceled === true || latestSession?.canceled === true || message.includes("已停止执行");
          throw error;
        }
        updateCaptureState({
          working: false,
          percent: 100,
          status: `主页采集完成：${String(result?.accountName || result?.handle || "未命名同行")}`,
          appendLog: `主页作品总数 ${formatNumber(result?.worksCount)}；本次成功提取作品 ${Array.isArray(result?.works) ? result.works.length : 0} 条；粉丝 ${formatNumber(result?.fans)}，点赞 ${formatNumber(result?.likes)}`
        });
        return result;
      } catch (error) {
        stopCaptureStatePoller();
        const message = String(error?.message || error);
        const finalError = error instanceof Error ? error : new Error(message);
        finalError.requiresLogin = error?.requiresLogin === true || isCaptureLoginRequiredMessage(message);
        finalError.canceled = error?.canceled === true || message.includes("已停止执行");
        throw finalError;
      }
    };

    const collectWorkSummaryByInput = async (input, { sessionId = "" } = {}) => {
      const finalSessionId = String(sessionId || buildCaptureSessionId("monitor_work", "single")).trim();
      const pollCursor = { seq: 0 };
      const syncBackendCaptureState = async () => {
        const stateRes = await getMonitorCaptureState({ sessionId: finalSessionId });
        const session = stateRes?.session;
        if (!session || typeof session !== "object") return null;
        const logs = Array.isArray(session.logs) ? session.logs : [];
        const newLogs = logs
          .filter((item) => Number(item?.seq || 0) > Number(pollCursor.seq || 0))
          .sort((left, right) => Number(left?.seq || 0) - Number(right?.seq || 0));
        if (newLogs.length) {
          pollCursor.seq = Math.max(pollCursor.seq, ...newLogs.map((item) => Number(item?.seq || 0) || 0));
          appendCaptureLogs(newLogs);
        }
        captureState = {
          ...captureState,
          ...(typeof session.visible === "boolean" ? { visible: session.visible } : {}),
          ...(typeof session.working === "boolean" ? { working: session.working } : {}),
          ...(Number.isFinite(Number(session.percent))
            ? { percent: Math.max(Number(captureState.percent || 0) || 0, Math.max(0, Math.min(100, Math.round(Number(session.percent) || 0)))) }
            : {}),
          ...(typeof session.status === "string" ? { status: String(session.status || "").trim() } : {})
        };
        syncCapturePanelDom();
        return session;
      };
      stopCaptureStatePoller();
      captureStatePoller = window.setInterval(() => {
        syncBackendCaptureState().catch(() => {});
      }, 700);
      try {
        let latestSession = await syncBackendCaptureState().catch(() => null);
        const result = await collectMonitorAwemeSummary({ url: input, sessionId: finalSessionId });
        latestSession = await syncBackendCaptureState().catch(() => latestSession);
        stopCaptureStatePoller();
        if (!result?.ok) {
          const message = String(result?.message || "作品内容提取失败");
          const error = new Error(message);
          error.requiresLogin = result?.requiresLogin === true || latestSession?.requiresLogin === true;
          error.canceled = result?.canceled === true || latestSession?.canceled === true || message.includes("已停止执行");
          throw error;
        }
        return result;
      } catch (error) {
        stopCaptureStatePoller();
        const message = String(error?.message || error);
        const finalError = error instanceof Error ? error : new Error(message);
        finalError.requiresLogin = error?.requiresLogin === true || isCaptureLoginRequiredMessage(message);
        finalError.canceled = error?.canceled === true || message.includes("已停止执行");
        throw finalError;
      }
    };

    const applyWorkSummaryToAccount = (accountId, workId, summary) => {
      const beforeCount = Array.isArray(workspace.alerts) ? workspace.alerts.length : 0;
      if (String(accountId || "").trim() === getManualMonitorWorkAccountId()) {
        workspace.manualWorks = upsertManualMonitorWork(workspace.manualWorks, workId, summary);
      } else {
        workspace.accounts = workspace.accounts.map((item) => (item.id === accountId ? mergeMonitorWorkSummary(item, workId, summary) : item));
      }
      persist();
      notifyAlerts(beforeCount);
      render();
    };

    const getVisibleWorks = () => {
      const manualWorks = Array.isArray(workspace.manualWorks) ? workspace.manualWorks : [];
      const works = flattenWorks(workspace.accounts, manualWorks).filter((item) => {
        if (filters.worksPlatform !== "all" && item.platform !== filters.worksPlatform) return false;
        if (filters.worksAccountId !== "all" && item.accountId !== filters.worksAccountId) return false;
        if (filters.worksKeyword && !`${item.title} ${item.accountName} ${item.copywriting || ""}`.includes(filters.worksKeyword)) return false;
        return true;
      });
      const [sortField, sortDirection] = String(filters.worksSort || "publish_desc").split("_");
      works.sort((left, right) => {
        const map = {
          publish: (item) => new Date(item.publishAt || 0).getTime(),
          likes: (item) => Number(item.likes || 0),
          comments: (item) => Number(item.comments || 0),
          shares: (item) => Number(item.shares || 0),
          collects: (item) => Number(item.collects || 0)
        };
        const getValue = map[sortField] || map.publish;
        const delta = getValue(left) - getValue(right);
        return sortDirection === "asc" ? delta : -delta;
      });
      return works;
    };

    const removeMonitorWorksByKeys = (rowKeys = []) => {
      const keySet = new Set((Array.isArray(rowKeys) ? rowKeys : []).map((item) => String(item || "").trim()).filter(Boolean));
      if (!keySet.size) return 0;
      let removedCount = 0;
      workspace.accounts = workspace.accounts.map((account) => {
        const nextWorks = (Array.isArray(account.works) ? account.works : []).filter((work) => {
          const rowKey = getMonitorWorkRowKey({ accountId: account.id, ...work });
          const shouldKeep = !keySet.has(rowKey);
          if (!shouldKeep) removedCount += 1;
          return shouldKeep;
        });
        return { ...account, works: nextWorks };
      });
      workspace.manualWorks = (Array.isArray(workspace.manualWorks) ? workspace.manualWorks : []).filter((work) => {
        const rowKey = getMonitorWorkRowKey({ accountId: getManualMonitorWorkAccountId(), ...work });
        const shouldKeep = !keySet.has(rowKey);
        if (!shouldKeep) removedCount += 1;
        return shouldKeep;
      });
      keySet.forEach((key) => selectedWorkRowKeys.delete(key));
      persist();
      return removedCount;
    };

    const chooseMonitorDownloadDirectory = async () => {
      const res = await window.api?.openDirectory?.();
      const directoryPath = String(res?.directoryPath || "").trim();
      if (res?.canceled || !directoryPath) return "";
      workspace.settings.downloadDirectory = directoryPath;
      persist();
      render();
      return directoryPath;
    };

    const exportVisibleWorksTable = async () => {
      const works = getVisibleWorks();
      if (!works.length) throw new Error("当前没有可导出的作品数据");
      const saveRes = await window.api?.saveFile?.({
        defaultPath: `同行监控作品表_${new Date().toISOString().slice(0, 10)}.csv`,
        filters: [{ name: "CSV 表格", extensions: ["csv"] }]
      });
      const filePath = String(saveRes?.filePath || "").trim();
      if (saveRes?.canceled || !filePath) return { canceled: true };
      const rows = works.map((item) => ({
        title: item.title || "",
        accountName: item.accountName || "",
        extractMethod: getMonitorWorkExtractMethodLabel(item),
        platformLabel: getMonitorPlatformMeta(item.platform).label,
        publishAt: formatTime(item.publishAt),
        likes: Number(item.likes || 0) || 0,
        comments: Number(item.comments || 0) || 0,
        shares: Number(item.shares || 0) || 0,
        collects: Number(item.collects || 0) || 0,
        url: item.url || "",
        videoUrl: item.videoUrl || "",
        copywriting: item.copywriting || ""
      }));
      return exportMonitorWorksTable({ filePath, rows });
    };

    const syncAccountsByIds = async (targetIds = [], extractionOptions = null, runtimeOptions = {}) => {
      const selectedIds = Array.isArray(targetIds) && targetIds.length ? targetIds.map((item) => String(item || "").trim()) : [];
      const targetAccounts = selectedIds.length ? workspace.accounts.filter((item) => selectedIds.includes(item.id)) : workspace.accounts.slice();
      if (!targetAccounts.length) return { updatedCount: 0, realtimeCount: 0 };

      const realtimeAccounts = targetAccounts.filter((item) => item.platform === "douyin");
      const fallbackIds = targetAccounts.filter((item) => item.platform !== "douyin").map((item) => item.id);
      let realtimeCount = 0;
      let requiresLogin = false;
      const captureSessionId = String(runtimeOptions?.sessionId || "").trim();

      for (const account of realtimeAccounts) {
        try {
          updateCaptureState({
            visible: true,
            working: true,
            percent: Math.max(8, Math.round((realtimeCount / Math.max(1, realtimeAccounts.length)) * 65)),
            status: `正在同步抖音主页：${account.name}`,
            appendLog: `开始同步主页：${account.name}`
          });
          const snapshot = await collectRealtimeSnapshotByInput(account.homepageUrl, {
            platform: account.platform,
            recentCount: 10,
            sessionId: captureSessionId
          });
          if (snapshot?.requiresLogin) requiresLogin = true;
          const applyResult = applyRealtimeSnapshot(account.id, snapshot, extractionOptions);
          const merged = applyResult?.merged || null;
          const sourceWorks = Array.isArray(applyResult?.sourceWorks) ? applyResult.sourceWorks : [];
          const filteredWorks = Array.isArray(applyResult?.filteredWorks) ? applyResult.filteredWorks : [];
          if (extractionOptions) {
            updateCaptureState({
              appendLog: `本次作品筛选条件：${formatExtractionOptionsLog(extractionOptions)}`
            });
          }
          updateCaptureState({
            appendLog: extractionOptions
              ? `主页原始作品返回 ${sourceWorks.length} 条；符合当前筛选条件 ${filteredWorks.length} 条；当前账号作品列表累计 ${Array.isArray(merged?.works) ? merged.works.length : 0} 条`
              : `主页原始作品返回 ${sourceWorks.length} 条；本轮仅保留最新发布时间作品 ${filteredWorks.length} 条用于主页列表展示`
          });
          sourceWorks.slice(0, Math.min(10, sourceWorks.length)).forEach((item, index) => {
            updateCaptureState({
              appendLog: `主页作品[${index + 1}]：${String(item?.title || "未命名作品").trim()}｜${String(item?.url || "未解析到作品链接").trim() || "未解析到作品链接"}`
            });
          });
          if (sourceWorks.length > 0 && filteredWorks.length === 0 && extractionOptions) {
            updateCaptureState({
              appendLog: "协议已返回作品，但全部被当前筛选条件过滤掉；请重点检查发布时间、点赞、评论、转发、收藏阈值。",
              level: "warn"
            });
          }
          updateCaptureState({
            percent: Math.max(18, Math.round(((realtimeCount + 1) / Math.max(1, realtimeAccounts.length)) * 88)),
            status: `已同步主页：${snapshot.accountName || account.name}`,
            appendLog: extractionOptions
              ? `已同步主页：${snapshot.accountName || account.name}，主页作品 ${formatNumber(snapshot.worksCount)}，本次符合条件并写入 ${filteredWorks.length} 条`
              : `已同步主页：${snapshot.accountName || account.name}，主页作品 ${formatNumber(snapshot.worksCount)}，主页列表仅更新最新作品样本 ${filteredWorks.length} 条`
          });
          realtimeCount += 1;
        } catch (error) {
          if (String(error?.message || error).includes("已停止执行")) {
            updateCaptureState({
              percent: 100,
              status: "已手动停止主页作品提取",
              appendLog: `已手动停止：${account.name}`,
              level: "warn"
            });
            return { updatedCount: realtimeCount, realtimeCount, canceled: true, requiresLogin };
          }
          if (error?.requiresLogin === true || isCaptureLoginRequiredMessage(error?.message || error)) requiresLogin = true;
          updateCaptureState({
            percent: 100,
            status: `同步失败：${account.name}`,
            appendLog: `同步失败：${account.name}，${String(error?.message || error)}`,
            level: "warn"
          });
          topToast(`抖音主页同步失败：${String(error?.message || error)}`, { type: "warn" });
        }
      }

      if (fallbackIds.length) {
        syncAccounts(fallbackIds);
      } else if (realtimeCount > 0) {
        render();
      }
      if (realtimeAccounts.length) {
        updateCaptureState({
          visible: true,
          working: false,
          percent: 100,
          status: `已完成 ${realtimeCount}/${realtimeAccounts.length} 个抖音主页同步`,
          appendLog: `本轮主页同步结束：成功 ${realtimeCount} 个，失败 ${Math.max(0, realtimeAccounts.length - realtimeCount)} 个。`,
          level: realtimeCount === realtimeAccounts.length ? "info" : "warn"
        });
      }
      if (requiresLogin) {
        await promptMonitorCaptureLogin("检测到当前采集环境疑似未登录抖音采集账号，请先登录后再继续提取主页作品。");
      }
      return { updatedCount: realtimeCount + fallbackIds.length, realtimeCount, requiresLogin };
    };

    const renderAccountsTab = () => {
      const groups = groupAccounts(workspace.accounts, filters.accountsPlatform, "platform");
      const trackOptions = buildMonitorTrackOptionList(workspace);
      if (!groups.length) {
        return `<div class="card"><div class="empty">当前还没有监控账号，先在上方输入同行主页链接加入监控列表。</div></div>`;
      }
      return groups
        .map(([platform, accounts]) => {
          const meta = getMonitorPlatformMeta(accounts[0]?.platform || "unknown");
          const totalPages = Math.max(1, Math.ceil(accounts.length / ACCOUNT_PAGE_SIZE));
          const currentPage = Math.min(Math.max(Number(accountPages[platform] || 1) || 1, 1), totalPages);
          accountPages[platform] = currentPage;
          const start = (currentPage - 1) * ACCOUNT_PAGE_SIZE;
          const pageItems = accounts.slice(start, start + ACCOUNT_PAGE_SIZE);
          const isSyncingPlatform = isActiveCaptureAction("sync-platform", platform);
          return `
            <section class="card cmon-section">
              <div class="cmon-section-head">
                <div class="cmon-section-title">
                  <span class="cmon-platform-badge" style="--cmon-platform:${meta.color}">${escapeHtml(meta.label)}</span>
                  <strong>${accounts.length} 个同行账号</strong>
                  <span class="pill">${accounts.reduce((sum, item) => sum + (Number(item?.worksCount || 0) || 0), 0)} 个作品样本</span>
                </div>
                <div class="cmon-section-actions">
                  <span class="pill">第 ${currentPage} / ${totalPages} 页</span>
                  <button class="btn ${isSyncingPlatform ? "btn-danger" : ""}" data-action="sync-platform" data-platform="${platform}">${isSyncingPlatform ? "停止同步" : "同步本平台"}</button>
                </div>
              </div>
              <div class="table-wrap">
                <table class="table cmon-account-table">
                  <thead>
                    <tr>
                      <th style="width: 300px;">账号</th>
                      <th style="width: 110px;">粉丝</th>
                      <th style="width: 110px;">点赞</th>
                      <th style="width: 110px;">作品数</th>
                      <th style="width: 260px;">最新作品</th>
                      <th style="width: 120px;">同步状态</th>
                      <th style="width: 120px;">最近同步</th>
                      <th style="width: 260px;">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                ${pageItems
                  .map((account) => {
                    const latestWork = Array.isArray(account.works) && account.works.length ? account.works[0] : null;
                    const isSyncingAccount = isActiveAccountSync(account.id);
                    const signatureExpanded = expandedSignatureAccountIds.has(account.id);
                    const accountSignature = sanitizeMonitorAccountSignature(account.signature || "建议重点观察主页简介、IP属地和作品互动结构。");
                    const regionText = String(account.regionText || account.city || "").trim() || "地区待获取";
                    const editingCustomTrack = customTrackEditor.accountId === account.id;
                    return `
                      <tr>
                        <td>
                          <div class="cmon-table-account">
                            ${
                              account.avatarUrl
                                ? `<img class="cmon-avatar cmon-avatar-sm cmon-avatar-image" src="${escapeHtml(account.avatarUrl)}" alt="${escapeHtml(account.name)} 头像" />`
                                : `<div class="cmon-avatar cmon-avatar-sm" style="--cmon-platform:${meta.color}">${escapeHtml(account.avatarText)}</div>`
                            }
                            <div class="cmon-table-account-meta">
                              <div class="cmon-account-name-row">
                                <div>
                                  <div class="cmon-account-name">${escapeHtml(account.name)}</div>
                                  <div class="cmon-account-subline">主页资料与作品样本已同步</div>
                                </div>
                              </div>
                              <div class="cmon-account-meta-board">
                                <div class="cmon-account-info-grid">
                                  <div class="cmon-account-info-item">
                                    <span class="cmon-account-info-label">抖音ID</span>
                                    <span class="cmon-account-info-value">${escapeHtml(account.handle || "未识别抖音号")}</span>
                                  </div>
                                  <div class="cmon-account-info-item">
                                    <span class="cmon-account-info-label">IP属地</span>
                                    <span class="cmon-account-info-value">${escapeHtml(account.locationText || "待获取")}</span>
                                  </div>
                                  <div class="cmon-account-info-item">
                                    <span class="cmon-account-info-label">地区</span>
                                    <span class="cmon-account-info-value">${escapeHtml(regionText)}</span>
                                  </div>
                                </div>
                                <div class="cmon-account-track-strip">
                                  <span class="cmon-account-info-label">分组</span>
                                  <select class="cmon-account-track-select" data-account-track-id="${account.id}">
                                    ${trackOptions
                                      .map((item) => `<option value="${escapeHtml(item)}" ${item === account.track ? "selected" : ""}>${escapeHtml(item)}</option>`)
                                      .join("")}
                                    <option value="__custom__">自定义分组</option>
                                  </select>
                                </div>
                                <div class="cmon-account-signature-wrap">
                                  <span class="cmon-account-info-label">简介</span>
                                  <button class="cmon-account-signature ${signatureExpanded ? "is-expanded" : ""}" data-action="toggle-signature" data-id="${account.id}" title="${escapeHtml(
                                    accountSignature
                                  )}">
                                    ${escapeHtml(accountSignature)}
                                  </button>
                                </div>
                              </div>
                              ${
                                editingCustomTrack
                                  ? `<div class="cmon-account-track-editor">
                                      <input class="cmon-account-track-input" type="text" data-role="account-track-input" data-account-track-input-id="${account.id}" value="${escapeHtml(
                                        customTrackEditor.value
                                      )}" placeholder="输入新的分类名称" />
                                      <button class="btn btn-primary" data-action="save-account-track" data-id="${account.id}">保存分类</button>
                                      <button class="btn" data-action="cancel-account-track" data-id="${account.id}">取消</button>
                                    </div>`
                                  : ""
                              }
                            </div>
                          </div>
                        </td>
                        <td><div class="cmon-table-metric"><strong>${formatNumber(account.fans)}</strong><em>+${formatNumber(account.delta.fans)}</em></div></td>
                        <td><div class="cmon-table-metric"><strong>${formatNumber(account.likes)}</strong><em>+${formatNumber(account.delta.likes)}</em></div></td>
                        <td><div class="cmon-table-metric"><strong>${formatNumber(account.worksCount)}</strong><em>${account.delta.works > 0 ? `+${formatNumber(account.delta.works)}` : "无新增"}</em></div></td>
                        <td>
                          ${
                            latestWork
                              ? `<div class="cmon-table-work">
                                  <div class="cmon-work-title">${escapeHtml(latestWork.title)}</div>
                                  <div class="cmon-work-note">发布时间 ${formatTime(latestWork.publishAt)} · 点赞 ${formatNumber(latestWork.likes)} · 评论 ${formatNumber(latestWork.comments)} · ${escapeHtml(latestWork.status)}</div>
                                </div>`
                              : `<div class="empty">暂无作品样本</div>`
                          }
                        </td>
                        <td><span class="pill ${account.syncStatus.includes("新作品") ? "is-ok" : ""}">${escapeHtml(account.syncStatus)}</span></td>
                        <td><div class="cmon-table-time">${formatRelativeMinutes(account.lastSyncAt)}<br /><span>${formatTime(account.lastSyncAt)}</span></div></td>
                        <td>
                          <div class="cmon-row-actions cmon-row-actions-left">
                            <button class="btn ${isSyncingAccount ? "btn-danger" : "btn-primary"}" data-action="sync-account" data-id="${account.id}">${isSyncingAccount ? "停止同步" : "同步"}</button>
                            <button class="btn" data-action="open-account-homepage" data-url="${escapeHtml(account.homepageUrl || "")}" ${account.homepageUrl ? "" : "disabled"}>打开主页</button>
                            <button class="btn" data-action="show-account-works" data-id="${account.id}">看作品</button>
                            <button class="btn" data-action="show-account-trend" data-id="${account.id}">看趋势</button>
                            <button class="btn btn-danger" data-action="remove-account" data-id="${account.id}">移除</button>
                          </div>
                        </td>
                      </tr>
                    `;
                  })
                  .join("")}
                  </tbody>
                </table>
              </div>
              <div class="cmon-pagination">
                <button class="btn" data-action="account-page" data-platform="${platform}" data-page="${currentPage - 1}" ${currentPage <= 1 ? "disabled" : ""}>上一页</button>
                <span class="pill">本页显示 ${pageItems.length} / 10 个账号</span>
                <button class="btn" data-action="account-page" data-platform="${platform}" data-page="${currentPage + 1}" ${currentPage >= totalPages ? "disabled" : ""}>下一页</button>
              </div>
            </section>
          `;
        })
        .join("");
    };

    const renderWorksTab = () => {
      const conditionAccounts = workspace.accounts.filter((item) => filters.worksPlatform === "all" || item.platform === filters.worksPlatform);
      const selectedAccount = workspace.accounts.find((item) => item.id === filters.worksAccountId) || null;
      const manualWorks = Array.isArray(workspace.manualWorks) ? workspace.manualWorks : [];
      const works = getVisibleWorks();
      const isExtractingCurrentAccount =
        isActiveCaptureAction("extract-account-works", filters.worksAccountId);
      const isExtractingSingleWork = isActiveCaptureAction("extract-single-work", "single");
      const selectedCount = works.filter((item) => selectedWorkRowKeys.has(getMonitorWorkRowKey(item))).length;
      return `
        <section class="card cmon-single-work-priority-card">
          <div class="card-title"><h3>单条作品链接提取</h3><span class="pill">优先入口</span></div>
          <div class="cmon-single-work-form">
            <input id="cmon-single-work-url" type="text" placeholder="粘贴任意抖音单条作品链接，可直接提取进对标作品列表，不需要先选择主页账号" />
            <button class="btn ${isExtractingSingleWork ? "btn-danger" : "btn-primary"}" data-action="extract-single-work">${isExtractingSingleWork ? "停止提取" : "提取单条作品"}</button>
          </div>
          <div class="cmon-works-quality-note">该入口独立于主页账号筛选。你可以直接从网页上挑任意单条作品链接补提到列表中，提取后会归入“手动提取”来源。</div>
        </section>
        <div class="card cmon-filter-bar">
          <div class="field cmon-filter-search">
            <div class="label">关键词</div>
            <input id="cmon-works-keyword" type="text" value="${escapeHtml(filters.worksKeyword)}" placeholder="按作品标题 / 账号名称筛选" />
          </div>
          <div class="field">
            <div class="label">排序方式</div>
            <select id="cmon-works-sort">
              <option value="publish_desc" ${filters.worksSort === "publish_desc" ? "selected" : ""}>发布时间：最新优先</option>
              <option value="publish_asc" ${filters.worksSort === "publish_asc" ? "selected" : ""}>发布时间：最早优先</option>
              <option value="likes_desc" ${filters.worksSort === "likes_desc" ? "selected" : ""}>点赞：从高到低</option>
              <option value="comments_desc" ${filters.worksSort === "comments_desc" ? "selected" : ""}>评论：从高到低</option>
              <option value="shares_desc" ${filters.worksSort === "shares_desc" ? "selected" : ""}>转发：从高到低</option>
              <option value="collects_desc" ${filters.worksSort === "collects_desc" ? "selected" : ""}>收藏：从高到低</option>
            </select>
          </div>
        </div>
        <section class="card cmon-extract-condition-card">
          <div class="card-title">
            <h3>主页作品提取条件</h3>
            <div class="card-actions">
              <span class="pill">仅对主页账号提取生效</span>
              <button class="btn ${isExtractingCurrentAccount ? "btn-danger" : "btn-primary"}" data-action="extract-account-works" data-id="${escapeHtml(filters.worksAccountId)}" ${
                filters.worksAccountId === "all" ? "disabled" : ""
              }>${isExtractingCurrentAccount ? "停止提取" : "提取该账号最新作品"}</button>
            </div>
          </div>
          <div class="cmon-extract-condition-grid">
            <label class="field">
              <div class="label">平台</div>
              <select id="cmon-works-platform">
                <option value="all">全部平台</option>
                ${getMonitorPlatformList()
                  .map((item) => `<option value="${item.value}" ${filters.worksPlatform === item.value ? "selected" : ""}>${item.label}</option>`)
                  .join("")}
              </select>
            </label>
            <label class="field">
              <div class="label">主页账号</div>
              <select id="cmon-works-account">
                <option value="all">全部账号</option>
                ${conditionAccounts
                  .map((item) => `<option value="${item.id}" ${filters.worksAccountId === item.id ? "selected" : ""}>${escapeHtml(item.name)}</option>`)
                  .join("")}
              </select>
            </label>
            <label class="field"><div class="label">发布时间从</div><input id="cmon-extract-from" type="date" value="${escapeHtml(filters.extractFrom)}" ${filters.worksAccountId === "all" ? "disabled" : ""} /></label>
            <label class="field"><div class="label">发布时间到</div><input id="cmon-extract-to" type="date" value="${escapeHtml(filters.extractTo)}" ${filters.worksAccountId === "all" ? "disabled" : ""} /></label>
            <label class="field"><div class="label">最低点赞</div><input id="cmon-extract-likes" type="number" min="0" value="${escapeHtml(filters.extractLikesMin)}" placeholder="不限" ${filters.worksAccountId === "all" ? "disabled" : ""} /></label>
            <label class="field"><div class="label">最低评论</div><input id="cmon-extract-comments" type="number" min="0" value="${escapeHtml(filters.extractCommentsMin)}" placeholder="不限" ${filters.worksAccountId === "all" ? "disabled" : ""} /></label>
            <label class="field"><div class="label">最低转发</div><input id="cmon-extract-shares" type="number" min="0" value="${escapeHtml(filters.extractSharesMin)}" placeholder="不限" ${filters.worksAccountId === "all" ? "disabled" : ""} /></label>
            <label class="field"><div class="label">最低收藏</div><input id="cmon-extract-collects" type="number" min="0" value="${escapeHtml(filters.extractCollectsMin)}" placeholder="不限" ${filters.worksAccountId === "all" ? "disabled" : ""} /></label>
            <label class="field"><div class="label">最多同步</div><select id="cmon-extract-limit" ${filters.worksAccountId === "all" ? "disabled" : ""}>${[5, 10, 18, 20].map((item) => `<option value="${item}" ${Number(filters.extractLimit) === item ? "selected" : ""}>${item} 条</option>`).join("")}</select></label>
          </div>
          <div class="cmon-extract-condition-note">定时同步和主页列表同步时，只会更新每个账号最新发布时间的那一条作品样本；只有在这里手动点击“提取该账号最新作品”时，才会按条件批量同步作品到列表。</div>
        </section>
        <div class="card cmon-table-card">
          <div class="card-title">
            <h3>对标作品列表</h3>
            <div class="card-actions">
              <span class="pill">已提取 ${works.length} 条</span>
              <span class="pill">已选中 ${selectedCount} 条</span>
              <button class="btn" data-action="choose-download-directory">保存地址</button>
              <button class="btn" data-action="export-works-table">导出表格</button>
              <button class="btn btn-danger" data-action="delete-selected-works" ${selectedCount ? "" : "disabled"}>批量删除</button>
            </div>
          </div>
          <div class="cmon-works-quality">
            <div><span>主页作品总数</span><strong>${selectedAccount ? formatNumber(selectedAccount.worksCount) : "全部账号"}</strong></div>
            <div><span>主页已入列表</span><strong>${selectedAccount ? formatNumber(selectedAccount.works.length) : formatNumber(works.filter((item) => item.workScope !== "manual").length)}</strong></div>
            <div><span>手动补提作品</span><strong>${formatNumber(manualWorks.length)}</strong></div>
            <div><span>默认保存地址</span><strong>${escapeHtml(workspace.settings.downloadDirectory || "未设置")}</strong></div>
            <div class="cmon-works-quality-note">${selectedAccount ? (selectedAccount.works.length ? "当前账号的主页作品已写入列表，可继续筛选或补提单条作品。" : "当前账号主页已同步，但作品详情还不完整时，可点击“提取该账号最新作品”或直接使用最上方单条链接提取。") : "最上方的“单条作品链接提取”不依赖账号选择；下方账号与条件区域只用于主页作品同步。"}</div>
          </div>
          ${
            works.length
              ? `<div class="table-wrap"><table class="table">
                  <thead>
                    <tr>
                      <th style="width:54px;"><input id="cmon-select-all-works" data-action="toggle-all-works-select" type="checkbox" ${works.length && selectedCount === works.length ? "checked" : ""} /></th>
                      <th style="width:72px;">序号</th>
                      <th>作品</th>
                      <th>账号</th>
                      <th style="width:96px;">提取方式</th>
                      <th>平台</th>
                      <th>发布时间</th>
                      <th>点赞</th>
                      <th>评论</th>
                      <th>转发</th>
                      <th>收藏</th>
                      <th>作品文案</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${works
                      .map((item, index) => {
                        const meta = getMonitorPlatformMeta(item.platform);
                        const rowKey = getMonitorWorkRowKey(item);
                        return `
                          <tr>
                            <td><input type="checkbox" data-action="toggle-work-select" data-row-key="${escapeHtml(rowKey)}" ${selectedWorkRowKeys.has(rowKey) ? "checked" : ""} /></td>
                            <td><span class="pill">${index + 1}</span></td>
                            <td>
                              <div class="cmon-work-cell">
                                <div><div class="cmon-work-title">${escapeHtml(item.title || "未命名作品")}</div>
                              <div class="cmon-work-note">${escapeHtml(item.note || (item.workScope === "manual" ? "手动提取作品" : "主页同步作品"))}</div>
                                </div>
                              </div>
                            </td>
                            <td>${escapeHtml(item.accountName)}</td>
                            <td>${escapeHtml(getMonitorWorkExtractMethodLabel(item))}</td>
                            <td>${escapeHtml(meta.label)}</td>
                            <td>${formatTime(item.publishAt)}</td>
                            <td>${formatNumber(item.likes)}</td>
                            <td>${formatNumber(item.comments)}</td>
                            <td>${formatNumber(item.shares)}</td>
                            <td>${formatNumber(item.collects)}</td>
                            <td><div class="cmon-work-copy">${escapeHtml(item.copywriting || "暂未提取到作品文案")}</div></td>
                            <td>
                              <div class="cmon-row-actions">
                                <button class="btn ${isActiveCaptureAction("refresh-work-content", `${item.accountId}:${item.id}`) ? "btn-danger" : "btn-primary"}" data-action="refresh-work-content" data-account-id="${item.accountId}" data-work-id="${escapeHtml(
                                  item.id
                                )}" data-url="${escapeHtml(item.url || "")}" ${item.platform !== "douyin" || !item.url ? "disabled" : ""}>${
                                  isActiveCaptureAction("refresh-work-content", `${item.accountId}:${item.id}`) ? "停止刷新" : "刷新"
                                }</button>
                                <button class="btn" data-action="download-work-video" data-account-id="${item.accountId}" data-work-id="${escapeHtml(item.id)}" data-url="${escapeHtml(
                                  item.url || ""
                                )}" data-video-url="${escapeHtml(item.videoUrl || "")}" ${item.platform !== "douyin" || (!item.videoUrl && !item.url) ? "disabled" : ""}>下载视频</button>
                                <a class="btn" href="${escapeHtml(item.url || "#")}" target="_blank" rel="noreferrer" ${item.url ? "" : "aria-disabled=\"true\""}>打开链接</a>
                              </div>
                            </td>
                          </tr>
                        `;
                      })
                      .join("")}
                  </tbody>
                </table></div>`
              : `<div class="empty">当前筛选条件下暂无作品记录。</div>`
          }
        </div>
      `;
    };

    const renderConditionsTab = () => {
      return `
        <div class="cmon-condition-layout">
          <section class="card cmon-settings-card">
            <div class="card-title"><h3>同步与提醒设置</h3><span class="pill">定时同步</span></div>
            <div class="cmon-settings-grid">
              <label class="cmon-toggle-line">
                <span>自动定时同步</span>
                <input id="cmon-auto-sync" type="checkbox" ${workspace.settings.autoSyncEnabled ? "checked" : ""} />
              </label>
              <div class="field">
                <div class="label">同步间隔</div>
                <select id="cmon-sync-interval">
                  ${[15, 30, 60, 120]
                    .map((item) => `<option value="${item}" ${Number(workspace.settings.syncIntervalMinutes) === item ? "selected" : ""}>${item} 分钟</option>`)
                    .join("")}
                </select>
              </div>
              <div class="field">
                <div class="label">提醒方式</div>
                <select id="cmon-remind-mode">
                  <option value="toast" ${workspace.settings.remindMode === "toast" ? "selected" : ""}>界面提醒</option>
                  <option value="log" ${workspace.settings.remindMode === "log" ? "selected" : ""}>写入提醒列表</option>
                </select>
              </div>
              <div class="field">
                <div class="label">分组方式</div>
                <select id="cmon-group-mode">
                  <option value="platform" ${workspace.settings.groupMode === "platform" ? "selected" : ""}>按平台分类</option>
                  <option value="track" ${workspace.settings.groupMode === "track" ? "selected" : ""}>按赛道分类</option>
                </select>
              </div>
            </div>
            <div class="cmon-settings-note">自动同步仅在当前页面打开时生效，用于快速查看同行最近一轮的账号和作品变化。</div>
          </section>

          <section class="card cmon-rules-card">
            <div class="card-title">
              <h3>监控规则</h3>
              <div class="card-actions">
                <button class="btn btn-primary" data-action="add-rule">新增规则</button>
              </div>
            </div>
            <div class="cmon-rule-list">
              ${workspace.rules
                .map(
                  (rule) => `
                    <div class="cmon-rule-item">
                      <label class="cmon-toggle-line cmon-toggle-inline">
                        <span>启用</span>
                        <input type="checkbox" data-rule-id="${rule.id}" data-rule-field="enabled" ${rule.enabled ? "checked" : ""} />
                      </label>
                      <input type="text" data-rule-id="${rule.id}" data-rule-field="name" value="${escapeHtml(rule.name)}" placeholder="规则名称" />
                      <select data-rule-id="${rule.id}" data-rule-field="metric">
                        <option value="fans_delta" ${rule.metric === "fans_delta" ? "selected" : ""}>粉丝增量</option>
                        <option value="likes_delta" ${rule.metric === "likes_delta" ? "selected" : ""}>点赞增量</option>
                        <option value="new_works" ${rule.metric === "new_works" ? "selected" : ""}>新增作品数</option>
                        <option value="works_total" ${rule.metric === "works_total" ? "selected" : ""}>作品总数</option>
                        <option value="fans_total" ${rule.metric === "fans_total" ? "selected" : ""}>粉丝总量</option>
                        <option value="likes_total" ${rule.metric === "likes_total" ? "selected" : ""}>点赞总量</option>
                      </select>
                      <select data-rule-id="${rule.id}" data-rule-field="operator">
                        ${[">=", ">", "<=", "<", "="]
                          .map((item) => `<option value="${item}" ${operatorLabel(rule.operator) === item ? "selected" : ""}>${item}</option>`)
                          .join("")}
                      </select>
                      <input type="number" min="1" data-rule-id="${rule.id}" data-rule-field="value" value="${Number(rule.value || 1)}" />
                      <select data-rule-id="${rule.id}" data-rule-field="platform">
                        <option value="all" ${rule.platform === "all" ? "selected" : ""}>全部平台</option>
                        ${getMonitorPlatformList()
                          .map((item) => `<option value="${item.value}" ${rule.platform === item.value ? "selected" : ""}>${item.label}</option>`)
                          .join("")}
                      </select>
                      <button class="btn btn-danger" data-action="delete-rule" data-id="${rule.id}">删除</button>
                    </div>
                  `
                )
                .join("")}
            </div>
          </section>

          <section class="card cmon-alert-card">
            <div class="card-title"><h3>最新提醒</h3><span class="pill">${workspace.alerts.length} 条</span></div>
            <div class="cmon-alert-list">
              ${
                workspace.alerts.length
                  ? workspace.alerts
                      .slice(0, 10)
                      .map((item) => {
                        const meta = getMonitorPlatformMeta(item.platform);
                        return `
                          <div class="cmon-alert-item">
                            <div class="cmon-alert-top">
                              <span class="cmon-mini-platform" style="--cmon-platform:${meta.color}">${meta.label}</span>
                              <strong>${escapeHtml(item.accountName)}</strong>
                              <span class="pill ${item.level === "high" ? "is-bad" : "is-ok"}">${item.level === "high" ? "重点提醒" : "普通提醒"}</span>
                            </div>
                            <div class="cmon-alert-message">${escapeHtml(item.message)}</div>
                            <div class="cmon-alert-time">${formatTime(item.createdAt)}</div>
                          </div>
                        `;
                      })
                      .join("")
                  : `<div class="empty">当前还没有触发提醒，先设置规则并执行同步。</div>`
              }
            </div>
          </section>
        </div>
      `;
    };

    const renderTrendTab = () => {
      const account = workspace.accounts.find((item) => item.id === filters.trendAccountId) || workspace.accounts[0] || null;
      const trendHistory = account ? account.trendHistory.slice(-Number(filters.trendRange || 30)) : [];
      const metric = filters.trendMetric;
      const first = trendHistory[0] || null;
      const last = trendHistory[trendHistory.length - 1] || null;
      const growth = first && last ? (Number(last[metric] || 0) || 0) - (Number(first[metric] || 0) || 0) : 0;
      const avg = trendHistory.length > 1 ? growth / (trendHistory.length - 1) : growth;
      return `
        <div class="card cmon-filter-bar">
          <div class="field">
            <div class="label">对标账号</div>
            <select id="cmon-trend-account">
              ${workspace.accounts.map((item) => `<option value="${item.id}" ${item.id === (account?.id || "") ? "selected" : ""}>${escapeHtml(item.name)}</option>`).join("")}
            </select>
          </div>
          <div class="field">
            <div class="label">指标</div>
            <select id="cmon-trend-metric">
              <option value="fans" ${metric === "fans" ? "selected" : ""}>粉丝</option>
              <option value="likes" ${metric === "likes" ? "selected" : ""}>点赞</option>
              <option value="worksCount" ${metric === "worksCount" ? "selected" : ""}>作品数</option>
            </select>
          </div>
          <div class="field">
            <div class="label">时间窗</div>
            <select id="cmon-trend-range">
              ${[7, 15, 30]
                .map((item) => `<option value="${item}" ${Number(filters.trendRange || 30) === item ? "selected" : ""}>近 ${item} 天</option>`)
                .join("")}
            </select>
          </div>
        </div>
        ${
          account
            ? `
              <div class="cmon-trend-layout">
                <section class="card cmon-trend-chart-card">
                  <div class="card-title">
                    <h3>${escapeHtml(account.name)} · ${metricLabel(metric)}</h3>
                    <span class="pill">最近同步：${formatRelativeMinutes(account.lastSyncAt)}</span>
                  </div>
                  ${buildLineChart(trendHistory, metric)}
                </section>
                <section class="cmon-trend-side">
                  <div class="card cmon-trend-stat-card">
                    <span>当前值</span>
                    <strong>${formatNumber(last?.[metric] || 0)}</strong>
                    <em>${metricLabel(metric)}实时快照</em>
                  </div>
                  <div class="card cmon-trend-stat-card">
                    <span>${filters.trendRange} 天增长</span>
                    <strong>${growth >= 0 ? "+" : ""}${formatNumber(growth)}</strong>
                    <em>对比窗口起始点</em>
                  </div>
                  <div class="card cmon-trend-stat-card">
                    <span>日均变化</span>
                    <strong>${avg >= 0 ? "+" : ""}${formatNumber(Math.round(avg))}</strong>
                    <em>便于判断增长斜率</em>
                  </div>
                  <div class="card cmon-trend-stat-card">
                    <span>重点结论</span>
                    <strong>${escapeHtml(account.compareNote)}</strong>
                    <em>${escapeHtml(account.track)}</em>
                  </div>
                </section>
              </div>
              <div class="card cmon-trend-log-card">
                <div class="card-title"><h3>趋势节点明细</h3></div>
                <div class="table-wrap">
                  <table class="table">
                    <thead><tr><th>日期</th><th>粉丝</th><th>点赞</th><th>作品数</th></tr></thead>
                    <tbody>
                      ${trendHistory
                        .slice()
                        .reverse()
                        .map(
                          (item) => `
                            <tr>
                              <td>${escapeHtml(item.date)}</td>
                              <td>${formatNumber(item.fans)}</td>
                              <td>${formatNumber(item.likes)}</td>
                              <td>${formatNumber(item.worksCount)}</td>
                            </tr>
                          `
                        )
                        .join("")}
                    </tbody>
                  </table>
                </div>
              </div>
            `
            : `<div class="card"><div class="empty">请先添加同行账号后再查看趋势分析。</div></div>`
        }
      `;
    };

    const renderCapturePanel = () => {
      const logs = Array.isArray(captureState.logs) ? captureState.logs : [];
      if (!captureState.visible && !logs.length) return "";
      return `
        <section class="card cmon-capture-card ${captureState.working ? "is-working" : ""}">
          <div class="cmon-capture-head">
            <div>
              <div class="cmon-capture-title">采集状态</div>
              <div class="cmon-capture-sub">${escapeHtml(captureState.status || "等待开始采集")}</div>
            </div>
            <div class="cmon-capture-meta">
              <span class="pill ${captureState.working ? "is-ok" : ""}">${captureState.working ? "采集中" : "最近一次采集"}</span>
              <strong>${Math.max(0, Math.min(100, Number(captureState.percent || 0) || 0))}%</strong>
            </div>
          </div>
          <div class="cmon-capture-progress"><span style="width:${Math.max(0, Math.min(100, Number(captureState.percent || 0) || 0))}%"></span></div>
          <div class="cmon-capture-logbox">
            ${
              logs.length
                ? logs
                    .map(
                      (item) => `
                        <div class="cmon-capture-log cmon-capture-log-${escapeHtml(item.level || "info")}">
                          <span>${escapeHtml(item.time || "--")}</span>
                          <div>${escapeHtml(item.text || "")}</div>
                        </div>
                      `
                    )
                    .join("")
                : `<div class="empty">点击“加入监控列表”或“同步”后，这里会实时显示采集进度。</div>`
            }
          </div>
        </section>
      `;
    };

    const syncCapturePanelDom = () => {
      const slot = root.querySelector("#cmon-capture-slot");
      if (!slot) return;
      const prevLogbox = slot.querySelector(".cmon-capture-logbox");
      const prevScrollTop = prevLogbox ? Number(prevLogbox.scrollTop || 0) || 0 : 0;
      const prevScrollHeight = prevLogbox ? Number(prevLogbox.scrollHeight || 0) || 0 : 0;
      slot.innerHTML = renderCapturePanel();
      const nextLogbox = slot.querySelector(".cmon-capture-logbox");
      if (nextLogbox && prevScrollTop > 0) {
        const nextScrollHeight = Number(nextLogbox.scrollHeight || 0) || 0;
        const deltaHeight = Math.max(0, nextScrollHeight - prevScrollHeight);
        nextLogbox.scrollTop = prevScrollTop + deltaHeight;
      }
    };

    const render = () => {
      const overview = getOverview(workspace);
      const platformOptions = getMonitorPlatformList();
      const isAddingAccount = isActiveCaptureAction("add-account", "intake");
      const isSyncingAll = isActiveCaptureAction("sync-all", "all");
      const captureLoginLabel = captureLoginState.loggedIn ? "已登录" : "采集账号登录";
      const captureLoginTitle = captureLoginState.loggedIn
        ? `当前采集账号已登录${captureLoginState.accountName ? `：${captureLoginState.accountName}` : ""}${captureLoginState.updatedAt ? `（最近记录 ${formatTime(captureLoginState.updatedAt)}）` : ""}`
        : "打开独立采集账号登录窗口";
      if (!workspace.accounts.find((item) => item.id === filters.trendAccountId)) {
        filters.trendAccountId = workspace.accounts[0]?.id || "";
      }
      root.innerHTML = `
        ${pageHeader({
          title: "同行监控",
          subtitle: "通过同行主页链接建立长期监控列表，分平台查看账号、作品、规则提醒和趋势变化；抖音链接支持自动转化并提取主页内容。",
          actionsHTML: `
            <button class="btn ${captureLoginState.loggedIn ? "btn-primary" : ""}" data-action="login-capture-account" title="${escapeHtml(captureLoginTitle)}">${captureLoginLabel}</button>
            <button class="btn ${isSyncingAll ? "btn-danger" : "btn-primary"}" data-action="sync-all">${isSyncingAll ? "停止同步全部" : "立即同步全部"}</button>
            <button class="btn" data-action="switch-tab" data-tab="conditions">规则提醒</button>
          `
        })}

        <section class="card cmon-hero-card">
          <div class="cmon-summary-grid">
            <div class="cmon-summary-card"><span>监控账号</span><strong>${formatNumber(overview.accountCount)}</strong><em>当前已纳入列表的同行主页</em></div>
            <div class="cmon-summary-card"><span>覆盖平台</span><strong>${formatNumber(overview.platformCount)}</strong><em>支持分平台排版查看</em></div>
            <div class="cmon-summary-card"><span>活跃提醒</span><strong>${formatNumber(overview.alertCount)}</strong><em>命中规则后的最新提醒</em></div>
            <div class="cmon-summary-card"><span>最近同步</span><strong>${overview.latestSyncAt ? formatRelativeMinutes(overview.latestSyncAt) : "--"}</strong><em>${overview.latestSyncAt ? formatTime(overview.latestSyncAt) : "暂无同步记录"}</em></div>
          </div>

          <div class="cmon-intake-grid">
            <div class="cmon-intake-main">
              <div class="cmon-intake-title">添加同行主页到监控列表</div>
              <div class="cmon-intake-sub">输入同行在不同平台的账号主页链接，系统会自动识别平台并加入监控列表；抖音主页 / 短链 / 作品分享链接会优先做真实解析和主页内容提取。</div>
              <div class="cmon-intake-form">
                <input id="cmon-homepage-url" type="text" placeholder="例如：https://www.douyin.com/user/...、https://v.douyin.com/...、https://www.xiaohongshu.com/user/profile/..." />
                <input id="cmon-account-name" type="text" placeholder="可选：自定义监控名称" />
                <select id="cmon-track-select">
                  ${getMonitorTrackOptions().map((item) => `<option value="${item}">${item}</option>`).join("")}
                  <option value="__custom__">自定义分组</option>
                </select>
                <input id="cmon-track-custom" type="text" placeholder="输入自定义分组名称" hidden />
                <button class="btn ${isAddingAccount ? "btn-danger" : "btn-primary"}" data-action="add-account">${isAddingAccount ? "停止加入" : "加入监控列表"}</button>
              </div>
              <div class="cmon-intake-tips">
                ${platformOptions
                  .map((item) => `<span class="cmon-mini-platform" style="--cmon-platform:${item.color}">${item.label}</span>`)
                  .join("")}
                <span class="pill">当前汇总粉丝：${formatNumber(overview.totalFans)}</span>
                <span class="pill">当前汇总点赞：${formatNumber(overview.totalLikes)}</span>
              </div>
              <div class="cmon-intake-sub cmon-intake-sub-strong">抖音主页采集过程会在下方显示实时状态、阶段进度和后台提取日志。</div>
            </div>
            <div class="cmon-intake-side">
              <div class="cmon-side-label">同步策略</div>
              <div class="cmon-side-value">${workspace.settings.autoSyncEnabled ? "已开启自动同步" : "当前仅手动同步"}</div>
              <div class="cmon-side-note">同步间隔 ${workspace.settings.syncIntervalMinutes} 分钟 · 提醒方式 ${
                workspace.settings.remindMode === "toast" ? "界面提醒" : "写入提醒列表"
              }</div>
              <div class="cmon-side-actions">
                <button class="btn" data-action="switch-tab" data-tab="conditions">调整条件</button>
                <button class="btn" data-action="switch-tab" data-tab="trends">查看趋势</button>
              </div>
            </div>
          </div>
          <div id="cmon-capture-slot">${renderCapturePanel()}</div>
        </section>

        <div class="cmon-tabs">
          ${TAB_LIST.map((item) => `<button class="btn cmon-tab ${activeTab === item.id ? "is-active" : ""}" data-action="switch-tab" data-tab="${item.id}">${item.label}</button>`).join("")}
        </div>

        ${
          activeTab === "accounts"
            ? `
              <div class="cmon-platform-filter">
                <button class="btn ${filters.accountsPlatform === "all" ? "btn-primary" : ""}" data-action="filter-accounts-platform" data-platform="all">全部平台</button>
                ${platformOptions
                  .map((item) => `<button class="btn ${filters.accountsPlatform === item.value ? "btn-primary" : ""}" data-action="filter-accounts-platform" data-platform="${item.value}">${item.label}</button>`)
                  .join("")}
              </div>
              ${renderAccountsTab()}
            `
            : ""
        }
        ${activeTab === "works" ? renderWorksTab() : ""}
        ${activeTab === "conditions" ? renderConditionsTab() : ""}
        ${activeTab === "trends" ? renderTrendTab() : ""}
      `;
    };

    root.addEventListener("click", async (event) => {
      const actionEl = event.target.closest("[data-action]");
      if (!actionEl) return;
      const action = String(actionEl.dataset.action || "").trim();
      if (!action) return;
      if (action === "toggle-signature") {
        const id = String(actionEl.dataset.id || "").trim();
        if (!id) return;
        if (expandedSignatureAccountIds.has(id)) expandedSignatureAccountIds.delete(id);
        else expandedSignatureAccountIds.add(id);
        render();
        return;
      }
      if (action === "open-account-homepage") {
        const url = String(actionEl.dataset.url || "").trim();
        if (!url) {
          topToast("当前账号还没有可打开的主页链接。", { type: "warn" });
          return;
        }
        try {
          const result = await window.api?.shell?.openExternal?.({ url });
          if (result?.ok === false) throw new Error(String(result?.message || "打开主页失败"));
        } catch (error) {
          topToast(`打开主页失败：${String(error?.message || error)}`, { type: "warn" });
        }
        return;
      }
      if (action === "save-account-track") {
        const id = String(actionEl.dataset.id || "").trim();
        if (!id) return;
        const nextTrack = String(customTrackEditor.value || "").trim();
        if (!nextTrack) {
          topToast("请输入新的分类名称。", { type: "warn" });
          return;
        }
        workspace.accounts = workspace.accounts.map((item) => (item.id === id ? { ...item, track: nextTrack } : item));
        customTrackEditor = { accountId: "", value: "" };
        persist();
        render();
        topToast("账号分类已更新。", { type: "success" });
        return;
      }
      if (action === "cancel-account-track") {
        customTrackEditor = { accountId: "", value: "" };
        render();
        return;
      }
      if (action === "switch-tab") {
        activeTab = String(actionEl.dataset.tab || "accounts").trim() || "accounts";
        render();
        return;
      }
      if (action === "login-capture-account") {
        actionEl.setAttribute("disabled", "disabled");
        try {
          const result = await openMonitorCaptureLogin();
          if (!result?.ok) throw new Error(String(result?.message || "无法打开采集账号登录窗口"));
          topToast(result.reused ? "已定位到采集账号登录窗口。" : "已打开独立采集账号登录窗口，请登录专门用于采集的抖音账号。", { type: "success" });
          window.setTimeout(() => {
            refreshMonitorCaptureLoginState({ silent: false }).catch(() => {});
          }, 1200);
        } catch (error) {
          topToast(`无法打开采集账号登录窗口：${String(error?.message || error)}`, { type: "warn" });
        } finally {
          actionEl.removeAttribute("disabled");
        }
        return;
      }
      if (action === "filter-accounts-platform") {
        filters.accountsPlatform = String(actionEl.dataset.platform || "all").trim() || "all";
        render();
        return;
      }
      if (action === "account-page") {
        const platform = String(actionEl.dataset.platform || "").trim();
        const page = Math.max(1, Number(actionEl.dataset.page || 1) || 1);
        if (!platform) return;
        accountPages[platform] = page;
        render();
        return;
      }
      if (action === "add-account") {
        const urlInput = root.querySelector("#cmon-homepage-url");
        const nameInput = root.querySelector("#cmon-account-name");
        const trackInput = root.querySelector("#cmon-track-select");
        const customTrackInput = root.querySelector("#cmon-track-custom");
        const rawInput = String(urlInput?.value || "").trim();
        if (!rawInput) {
          topToast("请先输入同行账号主页链接。", { type: "warn" });
          return;
        }
        if (isActiveCaptureAction("add-account", "intake")) {
          try {
            await cancelCurrentCaptureJob("加入监控列表");
          } catch (error) {
            topToast(`停止加入失败：${String(error?.message || error)}`, { type: "warn" });
          }
          return;
        }
        const normalizedPlatform = detectMonitorPlatformFromText(rawInput);
        if (normalizedPlatform === "unknown") {
          topToast("暂未识别该链接平台，请检查主页链接是否正确。", { type: "warn" });
          return;
        }
        const inputUrl = extractMonitorFirstUrl(rawInput) || rawInput;
        const finalTrack =
          String(trackInput?.value || "").trim() === "__custom__"
            ? String(customTrackInput?.value || "").trim()
            : String(trackInput?.value || "").trim();
        if (!finalTrack) {
          topToast("请选择分组，或输入自定义分组名称。", { type: "warn" });
          return;
        }
        const sessionId = buildCaptureSessionId("monitor_add", "intake");
        setActiveCaptureJob({
          action: "add-account",
          targetId: "intake",
          sessionId
        });
        render();
        try {
          let next = null;
          if (normalizedPlatform === "douyin") {
            topToast("正在解析抖音主页并提取最新作品...", { type: "info" });
            const snapshot = await collectRealtimeSnapshotByInput(rawInput, {
              platform: normalizedPlatform,
              recentCount: 10,
              sessionId
            });
            next = createMonitorAccountFromSnapshot(snapshot, {
              name: String(nameInput?.value || "").trim(),
              track: finalTrack
            });
          } else {
            next = createMonitorAccountFromUrl(inputUrl, {
              name: String(nameInput?.value || "").trim(),
              track: finalTrack
            });
          }
          if (workspace.accounts.some((item) => item.homepageUrl === next.homepageUrl)) {
            topToast("该同行主页已经在监控列表中了。", { type: "warn" });
            return;
          }
          workspace.accounts = [next, ...workspace.accounts];
          persist();
          if (urlInput) urlInput.value = "";
          if (nameInput) nameInput.value = "";
          if (customTrackInput) customTrackInput.value = "";
          if (trackInput) trackInput.value = getMonitorTrackOptions()[0] || "";
          filters.trendAccountId = next.id;
          topToast(normalizedPlatform === "douyin" ? "已加入监控列表，并完成抖音主页内容提取。" : "已加入同行监控列表。", { type: "success" });
          render();
        } catch (error) {
          updateCaptureState({
            visible: true,
            working: false,
            percent: 100,
            status: "加入监控列表失败",
            appendLog: `加入监控列表失败：${String(error?.message || error)}`,
            level: "warn"
          });
          if (error?.requiresLogin === true || isCaptureLoginRequiredMessage(error?.message || error)) {
            await promptMonitorCaptureLogin("当前采集环境疑似未登录抖音采集账号，请先登录后再继续加入监控或提取主页作品。");
          }
          topToast(`加入监控失败：${String(error?.message || error)}`, { type: "warn" });
        } finally {
          resetActiveCaptureJob();
          render();
        }
        return;
      }
      if (action === "sync-all") {
        if (!workspace.accounts.length) {
          topToast("当前还没有可同步的同行账号。", { type: "warn" });
          return;
        }
        if (isActiveCaptureAction("sync-all", "all")) {
          try {
            await cancelCurrentCaptureJob("同步全部主页");
          } catch (error) {
            topToast(`停止同步失败：${String(error?.message || error)}`, { type: "warn" });
          }
          return;
        }
        const sessionId = buildCaptureSessionId("monitor_sync_all", "all");
        setActiveCaptureJob({
          action: "sync-all",
          targetId: "all",
          sessionId
        });
        render();
        try {
          const result = await syncAccountsByIds([], null, { sessionId });
          topToast(
            result?.canceled
              ? "已停止全部同行账号同步。"
              : result.realtimeCount > 0
              ? `已完成全部同行账号同步，其中 ${result.realtimeCount} 个抖音主页已做真实同步。`
              : "已完成全部同行账号同步。",
            { type: "success" }
          );
        } finally {
          resetActiveCaptureJob();
          render();
        }
        return;
      }
      if (action === "sync-account") {
        const id = String(actionEl.dataset.id || "").trim();
        if (!id) return;
        if (isActiveAccountSync(id)) {
          try {
            await cancelAccountSyncJob(id, (workspace.accounts.find((item) => item.id === id) || {}).name || "当前账号");
          } catch (error) {
            topToast(`停止同步失败：${String(error?.message || error)}`, { type: "warn" });
          }
          return;
        }
        const sessionId = buildCaptureSessionId("monitor_sync_account", id);
        setActiveAccountSyncJob(id, sessionId);
        render();
        try {
          const target = workspace.accounts.find((item) => item.id === id) || null;
          const result = await syncAccountsByIds([id], null, { sessionId });
          topToast(result?.canceled ? "已停止该账号同步。" : target?.platform === "douyin" ? "已完成该抖音账号主页真实同步。" : "已完成该账号最新数据同步。", { type: "success" });
        } finally {
          resetActiveAccountSyncJob(id);
          render();
        }
        return;
      }
      if (action === "sync-platform") {
        const platform = String(actionEl.dataset.platform || "").trim();
        const ids = workspace.accounts.filter((item) => item.platform === platform).map((item) => item.id);
        if (!ids.length) return;
        if (isActiveCaptureAction("sync-platform", platform)) {
          try {
            await cancelCurrentCaptureJob(`${getMonitorPlatformMeta(platform).label} 平台同步`);
          } catch (error) {
            topToast(`停止同步失败：${String(error?.message || error)}`, { type: "warn" });
          }
          return;
        }
        const sessionId = buildCaptureSessionId("monitor_sync_platform", platform);
        setActiveCaptureJob({
          action: "sync-platform",
          targetId: platform,
          sessionId
        });
        render();
        try {
          const result = await syncAccountsByIds(ids, null, { sessionId });
          topToast(result?.canceled ? "已停止该平台同步。" : platform === "douyin" && result.realtimeCount > 0 ? "已完成该平台真实主页同步。" : "已完成该平台同行账号同步。", {
            type: "success"
          });
        } finally {
          resetActiveCaptureJob();
          render();
        }
        return;
      }
      if (action === "sync-track") {
        const track = String(actionEl.dataset.track || "").trim();
        const ids = workspace.accounts.filter((item) => item.track === track).map((item) => item.id);
        if (!ids.length) return;
        actionEl.setAttribute("disabled", "disabled");
        try {
          await syncAccountsByIds(ids);
          topToast("已完成该赛道同行账号同步。", { type: "success" });
        } finally {
          actionEl.removeAttribute("disabled");
        }
        return;
      }
      if (action === "extract-account-works") {
        const id = String(actionEl.dataset.id || "").trim();
        if (!id || id === "all") {
          topToast("请先在上方筛选一个具体账号，再提取主页最新作品。", { type: "warn" });
          return;
        }
        if (
          captureState.working &&
          activeCaptureJob.action === "extract-account-works" &&
          activeCaptureJob.accountId === id &&
          activeCaptureJob.sessionId
        ) {
          try {
            await cancelCurrentCaptureJob((workspace.accounts.find((item) => item.id === id) || {}).name || "当前账号");
          } catch (error) {
            topToast(`停止提取失败：${String(error?.message || error)}`, { type: "warn" });
          }
          return;
        }
        try {
          const extractionOptions = {
            from: String(root.querySelector("#cmon-extract-from")?.value || "").trim(),
            to: String(root.querySelector("#cmon-extract-to")?.value || "").trim(),
            likesMin: String(root.querySelector("#cmon-extract-likes")?.value || "").trim(),
            commentsMin: String(root.querySelector("#cmon-extract-comments")?.value || "").trim(),
            sharesMin: String(root.querySelector("#cmon-extract-shares")?.value || "").trim(),
            collectsMin: String(root.querySelector("#cmon-extract-collects")?.value || "").trim(),
            limit: String(root.querySelector("#cmon-extract-limit")?.value || "10").trim()
          };
          Object.assign(filters, {
            extractFrom: extractionOptions.from,
            extractTo: extractionOptions.to,
            extractLikesMin: extractionOptions.likesMin,
            extractCommentsMin: extractionOptions.commentsMin,
            extractSharesMin: extractionOptions.sharesMin,
            extractCollectsMin: extractionOptions.collectsMin,
            extractLimit: extractionOptions.limit
          });
          const sessionId = `monitor_extract_${id}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
          setActiveCaptureJob({
            action: "extract-account-works",
            accountId: id,
            targetId: id,
            sessionId
          });
          render();
          updateCaptureState({
            visible: true,
            working: true,
            percent: 10,
            status: "正在提取该账号最新作品...",
            appendLog: `开始提取该账号最新作品，筛选条件：${formatExtractionOptionsLog(extractionOptions)}`
          });
          const result = await syncAccountsByIds([id], extractionOptions, { sessionId });
          activeTab = "works";
          filters.worksAccountId = id;
          if (result?.canceled) {
            updateCaptureState({
              working: false,
              percent: 100,
              status: "已停止主页最新作品提取",
              appendLog: "本轮主页作品提取已按你的指令停止。",
              level: "warn"
            });
            topToast("已停止当前账号的主页作品提取。", { type: "warn" });
          } else {
            updateCaptureState({
              working: false,
              percent: 100,
              status: "已完成主页最新作品提取",
              appendLog: `已按本次条件完成主页作品同步；请在作品列表查看符合条件的作品。`
            });
            topToast("已按当前条件从主页同步作品。", { type: "success" });
          }
          render();
        } catch (error) {
          updateCaptureState({
            visible: true,
            working: false,
            percent: 100,
            status: error?.canceled ? "已停止主页最新作品提取" : "主页最新作品提取失败",
            appendLog: error?.canceled ? "本轮主页作品提取已停止。" : `主页最新作品提取失败：${String(error?.message || error)}`,
            level: "warn"
          });
          if (error?.requiresLogin === true || isCaptureLoginRequiredMessage(error?.message || error)) {
            await promptMonitorCaptureLogin("当前采集环境疑似未登录抖音采集账号，请先登录后再继续提取主页作品。");
          } else if (!error?.canceled) {
            topToast(`主页最新作品提取失败：${String(error?.message || error)}`, { type: "warn" });
          }
        } finally {
          resetActiveCaptureJob();
          render();
        }
        return;
      }
      if (action === "extract-single-work") {
        const urlInput = root.querySelector("#cmon-single-work-url");
        const url = String(urlInput?.value || "").trim();
        if (isActiveCaptureAction("extract-single-work", "single")) {
          try {
            await cancelCurrentCaptureJob("单条作品提取");
          } catch (error) {
            topToast(`停止提取失败：${String(error?.message || error)}`, { type: "warn" });
          }
          return;
        }
        if (!url) {
          topToast("请粘贴一条抖音作品分享链接后再提取。", { type: "warn" });
          return;
        }
        const sessionId = buildCaptureSessionId("monitor_single_work", "single");
        setActiveCaptureJob({
          action: "extract-single-work",
          targetId: "single",
          sessionId
        });
        render();
        try {
          updateCaptureState({
            visible: true,
            working: true,
            percent: 20,
            status: "正在提取单条作品...",
            appendLog: `开始补提单条作品：${url.slice(0, 120)}`
          });
          startCaptureProgressTicker(["正在解析作品分享链接...", "正在拉取作品详情...", "正在提取标题、互动数据和作品文案...", "正在写入对标作品列表..."]);
          const res = await collectWorkSummaryByInput(url, { sessionId });
          stopCaptureProgressTicker();
          if (!res?.ok || !res?.summary) throw new Error(String(res?.message || "单条作品提取失败"));
          const workId = String(res.summary.id || res.summary.awemeId || res.awemeId || "").trim();
          applyWorkSummaryToAccount(getManualMonitorWorkAccountId(), workId, {
            ...res.summary,
            accountName: res?.author?.nickname || res?.summary?.accountName || "手动提取",
            extractFrom: "单条作品链接提取"
          });
          if (urlInput) urlInput.value = "";
          filters.worksAccountId = "all";
          activeTab = "works";
          updateCaptureState({
            working: false,
            percent: 100,
            status: `单条作品已写入列表：${res.summary.title || "未命名作品"}`,
            appendLog: `补提成功：${res.summary.title || "未命名作品"}，点赞 ${formatNumber(res.summary.likes)}，评论 ${formatNumber(res.summary.comments)}，转发 ${formatNumber(res.summary.shares)}，收藏 ${formatNumber(res.summary.collects)}`
          });
          topToast("单条作品已成功写入对标作品列表。", { type: "success" });
        } catch (error) {
          stopCaptureProgressTicker();
          updateCaptureState({
            working: false,
            percent: 100,
            status: error?.canceled ? "已停止单条作品提取" : "单条作品提取失败",
            appendLog: error?.canceled ? "本轮单条作品提取已停止。" : `补提失败：${String(error?.message || error)}。请检查作品链接是否可打开后重试。`,
            level: "warn"
          });
          if (!error?.canceled) topToast(`单条作品提取失败：${String(error?.message || error)}`, { type: "warn" });
        } finally {
          resetActiveCaptureJob();
          render();
        }
        return;
      }
      if (action === "refresh-work-content") {
        const accountId = String(actionEl.dataset.accountId || "").trim();
        const workId = String(actionEl.dataset.workId || "").trim();
        const url = String(actionEl.dataset.url || "").trim();
        const targetId = `${accountId}:${workId}`;
        if (isActiveCaptureAction("refresh-work-content", targetId)) {
          try {
            await cancelCurrentCaptureJob("当前作品信息刷新");
          } catch (error) {
            topToast(`停止刷新失败：${String(error?.message || error)}`, { type: "warn" });
          }
          return;
        }
        if (!accountId || !workId || !url) {
          topToast("当前作品缺少可刷新的链接。", { type: "warn" });
          return;
        }
        const sessionId = buildCaptureSessionId("monitor_work_content", targetId);
        setActiveCaptureJob({
          action: "refresh-work-content",
          accountId,
          targetId,
          sessionId
        });
        render();
        try {
          updateCaptureState({
            visible: true,
            working: true,
            percent: 20,
            status: "正在刷新作品信息...",
            appendLog: `开始刷新作品信息：${url}`
          });
          startCaptureProgressTicker(["正在解析作品链接...", "正在拉取作品详情接口...", "正在整理标题与互动数据...", "正在回写最新作品信息..."]);
          const res = await collectWorkSummaryByInput(url, { sessionId });
          stopCaptureProgressTicker();
          if (!res?.ok || !res?.summary) {
            throw new Error(String(res?.message || "作品信息刷新失败"));
          }
          applyWorkSummaryToAccount(accountId, workId, res.summary);
          updateCaptureState({
            working: false,
            percent: 100,
            status: `作品信息刷新完成：${res.summary.title || "未命名作品"}`,
            appendLog: `已刷新作品信息：${res.summary.title || "未命名作品"}，点赞 ${formatNumber(res.summary.likes)}，评论 ${formatNumber(res.summary.comments)}`
          });
          topToast("已刷新作品信息并更新到列表。", { type: "success" });
        } catch (error) {
          stopCaptureProgressTicker();
          updateCaptureState({
            working: false,
            percent: 100,
            status: error?.canceled ? "已停止刷新作品信息" : "作品信息刷新失败",
            appendLog: error?.canceled ? "当前作品信息刷新已停止。" : `作品信息刷新失败：${String(error?.message || error)}`,
            level: "warn"
          });
          if (!error?.canceled) topToast(`作品信息刷新失败：${String(error?.message || error)}`, { type: "warn" });
        } finally {
          resetActiveCaptureJob();
          render();
        }
        return;
      }
      if (action === "toggle-work-select") {
        const rowKey = String(actionEl.dataset.rowKey || "").trim();
        if (!rowKey) return;
        const checked = actionEl instanceof HTMLInputElement ? actionEl.checked : !selectedWorkRowKeys.has(rowKey);
        if (checked) selectedWorkRowKeys.add(rowKey);
        else selectedWorkRowKeys.delete(rowKey);
        render();
        return;
      }
      if (action === "toggle-all-works-select") {
        const checked = actionEl instanceof HTMLInputElement ? actionEl.checked : false;
        const works = getVisibleWorks();
        if (checked) works.forEach((item) => selectedWorkRowKeys.add(getMonitorWorkRowKey(item)));
        else works.forEach((item) => selectedWorkRowKeys.delete(getMonitorWorkRowKey(item)));
        render();
        return;
      }
      if (action === "delete-selected-works") {
        const works = getVisibleWorks();
        const rowKeys = works.map((item) => getMonitorWorkRowKey(item)).filter((key) => selectedWorkRowKeys.has(key));
        if (!rowKeys.length) {
          topToast("请先勾选要删除的作品。", { type: "warn" });
          return;
        }
        const confirmed = window.confirm(`确认删除已选中的 ${rowKeys.length} 条作品吗？`);
        if (!confirmed) return;
        const removedCount = removeMonitorWorksByKeys(rowKeys);
        render();
        topToast(`已删除 ${removedCount} 条作品。`, { type: "success" });
        return;
      }
      if (action === "choose-download-directory") {
        actionEl.setAttribute("disabled", "disabled");
        try {
          const directoryPath = await chooseMonitorDownloadDirectory();
          if (!directoryPath) {
            topToast("已取消设置保存地址。", { type: "info" });
            return;
          }
          topToast(`视频默认保存地址已更新。`, { type: "success" });
        } catch (error) {
          topToast(`设置保存地址失败：${String(error?.message || error)}`, { type: "warn" });
        } finally {
          render();
        }
        return;
      }
      if (action === "export-works-table") {
        actionEl.setAttribute("disabled", "disabled");
        try {
          const result = await exportVisibleWorksTable();
          if (result?.canceled) {
            topToast("已取消导出作品表格。", { type: "info" });
            return;
          }
          if (!result?.ok) throw new Error(String(result?.message || "作品表格导出失败"));
          topToast("作品表格已成功导出。", { type: "success" });
        } catch (error) {
          topToast(`导出表格失败：${String(error?.message || error)}`, { type: "warn" });
        } finally {
          render();
        }
        return;
      }
      if (action === "download-work-video") {
        const accountId = String(actionEl.dataset.accountId || "").trim();
        const workId = String(actionEl.dataset.workId || "").trim();
        const workUrl = String(actionEl.dataset.url || "").trim();
        let downloadUrl = String(actionEl.dataset.videoUrl || "").trim();
        const allWorks = flattenWorks(workspace.accounts, workspace.manualWorks);
        const currentWork =
          allWorks.find(
            (item) =>
              String(item?.accountId || "").trim() === accountId &&
              (String(item?.id || "").trim() === workId || String(item?.awemeId || "").trim() === workId)
          ) || null;
        if (!currentWork) {
          topToast("未找到要下载的视频记录。", { type: "warn" });
          return;
        }
        actionEl.setAttribute("disabled", "disabled");
        try {
          let targetDir = String(workspace.settings.downloadDirectory || "").trim();
          if (!targetDir) {
            targetDir = await chooseMonitorDownloadDirectory();
            if (!targetDir) {
              topToast("请先选择视频保存地址。", { type: "warn" });
              return;
            }
          }
          if (!downloadUrl && workUrl && currentWork.platform === "douyin") {
            const sessionId = buildCaptureSessionId("monitor_download_video", `${accountId}:${workId}`);
            updateCaptureState({
              visible: true,
              working: true,
              percent: 18,
              status: "正在补提视频下载地址...",
              appendLog: `下载前补提视频地址：${workUrl}`
            });
            const res = await collectWorkSummaryByInput(workUrl, { sessionId });
            if (!res?.ok || !res?.summary) throw new Error(String(res?.message || "未提取到视频下载地址"));
            downloadUrl = String(res?.summary?.videoUrl || "").trim();
            applyWorkSummaryToAccount(accountId, workId, res.summary);
            updateCaptureState({
              working: false,
              percent: 100,
              status: "视频下载地址补提完成",
              appendLog: downloadUrl ? "已补提到视频直链，开始下载。" : "补提成功，但视频直链为空。",
              level: downloadUrl ? "info" : "warn"
            });
          }
          if (!downloadUrl) {
            throw new Error("当前作品还没有可用的视频直链，请先提取作品内容后再下载");
          }
          const result = await downloadMonitorVideo({
            downloadUrl,
            targetDir,
            fileName: `${currentWork.accountName || "作者"}_${currentWork.title || "同行监控作品视频"}`
          });
          if (!result?.ok) throw new Error(String(result?.message || "视频下载失败"));
          topToast("视频已下载到保存地址。", { type: "success" });
        } catch (error) {
          updateCaptureState({
            working: false,
            percent: 100,
            status: "视频下载失败",
            appendLog: `视频下载失败：${String(error?.message || error)}`,
            level: "warn"
          });
          topToast(`下载视频失败：${String(error?.message || error)}`, { type: "warn" });
        } finally {
          render();
        }
        return;
      }
      if (action === "remove-account") {
        const id = String(actionEl.dataset.id || "").trim();
        workspace.accounts = workspace.accounts.filter((item) => item.id !== id);
        workspace.alerts = workspace.alerts.filter((item) => item.accountId !== id);
        persist();
        topToast("已移除该同行监控对象。", { type: "success" });
        render();
        return;
      }
      if (action === "show-account-works") {
        filters.worksAccountId = String(actionEl.dataset.id || "all").trim() || "all";
        activeTab = "works";
        render();
        return;
      }
      if (action === "show-account-trend") {
        filters.trendAccountId = String(actionEl.dataset.id || "").trim();
        activeTab = "trends";
        render();
        return;
      }
      if (action === "add-rule") {
        workspace.rules = [...workspace.rules, buildEmptyMonitorRule()];
        persist();
        render();
        return;
      }
      if (action === "delete-rule") {
        const id = String(actionEl.dataset.id || "").trim();
        workspace.rules = workspace.rules.filter((item) => item.id !== id);
        persist();
        render();
      }
    });

    root.addEventListener("change", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      if (target.id === "cmon-works-platform") {
        filters.worksPlatform = String(target.value || "all").trim() || "all";
        if (
          filters.worksAccountId !== "all" &&
          !workspace.accounts.some((item) => item.id === filters.worksAccountId && (filters.worksPlatform === "all" || item.platform === filters.worksPlatform))
        ) {
          filters.worksAccountId = "all";
        }
        selectedWorkRowKeys.clear();
        render();
        return;
      }
      if (target.id === "cmon-track-select") {
        const customTrackInput = root.querySelector("#cmon-track-custom");
        if (customTrackInput instanceof HTMLElement) {
          if (String(target.value || "").trim() === "__custom__") customTrackInput.removeAttribute("hidden");
          else customTrackInput.setAttribute("hidden", "hidden");
        }
        return;
      }
      if (target.classList.contains("cmon-account-track-select")) {
        const accountId = String(target.dataset.accountTrackId || "").trim();
        if (!accountId) return;
        let nextTrack = String(target.value || "").trim();
        if (nextTrack === "__custom__") {
          const current = workspace.accounts.find((item) => item.id === accountId);
          customTrackEditor = {
            accountId,
            value: String(current?.track || "").trim()
          };
          render();
          return;
        }
        if (customTrackEditor.accountId === accountId) customTrackEditor = { accountId: "", value: "" };
        workspace.accounts = workspace.accounts.map((item) => (item.id === accountId ? { ...item, track: nextTrack } : item));
        persist();
        render();
        topToast("账号分组已更新。", { type: "success" });
        return;
      }
      if (target.id === "cmon-works-account") {
        filters.worksAccountId = String(target.value || "all").trim() || "all";
        selectedWorkRowKeys.clear();
        render();
        return;
      }
      if (target.id === "cmon-works-keyword") {
        filters.worksKeyword = String(target.value || "").trim();
        render();
        return;
      }
      if (target.id === "cmon-works-sort") {
        filters.worksSort = String(target.value || "publish_desc").trim() || "publish_desc";
        selectedWorkRowKeys.clear();
        render();
        return;
      }
      if (target.id === "cmon-trend-account") {
        filters.trendAccountId = String(target.value || "").trim();
        render();
        return;
      }
      if (target.id === "cmon-trend-metric") {
        filters.trendMetric = String(target.value || "fans").trim() || "fans";
        render();
        return;
      }
      if (target.id === "cmon-trend-range") {
        filters.trendRange = String(target.value || "30").trim() || "30";
        render();
        return;
      }
      if (target.id === "cmon-auto-sync") {
        workspace.settings.autoSyncEnabled = target.checked;
        persist();
        render();
        return;
      }
      if (target.id === "cmon-sync-interval") {
        workspace.settings.syncIntervalMinutes = Math.max(5, Number(target.value || 30) || 30);
        persist();
        render();
        return;
      }
      if (target.id === "cmon-remind-mode") {
        workspace.settings.remindMode = String(target.value || "toast").trim() || "toast";
        persist();
        render();
        return;
      }
      if (target.id === "cmon-group-mode") {
        workspace.settings.groupMode = String(target.value || "platform").trim() || "platform";
        persist();
        render();
        return;
      }
      const ruleId = String(target.dataset.ruleId || "").trim();
      const ruleField = String(target.dataset.ruleField || "").trim();
      if (ruleId && ruleField) {
        workspace.rules = workspace.rules.map((item) => {
          if (item.id !== ruleId) return item;
          const next = { ...item };
          if (ruleField === "enabled") next.enabled = target.checked;
          else if (ruleField === "value") next.value = Math.max(1, Number(target.value || 1) || 1);
          else next[ruleField] = String(target.value || "").trim();
          return next;
        });
        persist();
        render();
      }
    });

    root.addEventListener("input", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.dataset.accountTrackInputId) {
        customTrackEditor = {
          accountId: String(target.dataset.accountTrackInputId || "").trim(),
          value: String(target.value || "").trim()
        };
        return;
      }
      if (target.id === "cmon-works-keyword") {
        filters.worksKeyword = String(target.value || "").trim();
        render();
        return;
      }
      const ruleId = String(target.dataset.ruleId || "").trim();
      const ruleField = String(target.dataset.ruleField || "").trim();
      if (ruleId && ruleField === "name") {
        workspace.rules = workspace.rules.map((item) => (item.id === ruleId ? { ...item, name: String(target.value || "").trim() } : item));
        persist();
      }
    });

    render();
    refreshMonitorCaptureLoginState({ silent: false }).catch(() => {});

    const syncTimer = window.setInterval(() => {
      if (!root.isConnected) {
        window.clearInterval(syncTimer);
        return;
      }
      if (!workspace.settings.autoSyncEnabled || !workspace.accounts.length) return;
      const latestSyncAt = getLatestSyncTime(workspace.accounts);
      const latest = latestSyncAt ? new Date(latestSyncAt).getTime() : 0;
      if (!latest) return;
      const dueMs = Math.max(5, Number(workspace.settings.syncIntervalMinutes || 30) || 30) * 60000;
      if (Date.now() - latest < dueMs) return;
        if (autoSyncing) return;
        autoSyncing = true;
        syncAccountsByIds([])
          .then((result) => {
            topToast(result?.realtimeCount > 0 ? "已按定时策略完成主页真实同步。" : "已按定时策略同步同行最新数据。", { type: "info" });
          })
          .catch((error) => {
            topToast(`定时同步失败：${String(error?.message || error)}`, { type: "warn" });
          })
          .finally(() => {
            autoSyncing = false;
          });
    }, 15000);

    return root;
  }
};
