// 同行监控同步模块：
// 1. 封装同行监控页面与主进程的真实采集通信。
// 2. 优先对抖音主页/作品链接执行真实解析和主页内容提取。

export async function collectMonitorHomepageSnapshot({ input, platform = "", recentCount = 10, sessionId = "" } = {}) {
  const api = window.api?.monitor;
  if (!api || typeof api.collectHomepage !== "function") {
    return { ok: false, missingHandler: true, message: "同行监控采集接口未就绪" };
  }
  return api.collectHomepage({
    input: String(input || "").trim(),
    platform: String(platform || "").trim(),
    recentCount: Math.max(1, Math.min(10, Number(recentCount || 10) || 10)),
    sessionId: String(sessionId || "").trim()
  });
}

export async function getMonitorCaptureState({ sessionId = "" } = {}) {
  const api = window.api?.monitor;
  if (!api || typeof api.getCaptureState !== "function") {
    return { ok: false, missingHandler: true, message: "同行监控采集状态接口未就绪", session: null };
  }
  return api.getCaptureState({
    sessionId: String(sessionId || "").trim()
  });
}

export async function cancelMonitorCapture({ sessionId = "" } = {}) {
  const api = window.api?.monitor;
  if (!api || typeof api.cancelCapture !== "function") {
    return { ok: false, missingHandler: true, message: "同行监控停止采集接口未就绪" };
  }
  return api.cancelCapture({
    sessionId: String(sessionId || "").trim()
  });
}

export async function openMonitorCaptureLogin() {
  const api = window.api?.monitor;
  if (!api || typeof api.openCaptureLogin !== "function") {
    return { ok: false, missingHandler: true, message: "采集账号登录窗口未就绪" };
  }
  return api.openCaptureLogin();
}

export async function getMonitorCaptureLoginStatus() {
  const api = window.api?.monitor;
  if (!api || typeof api.getCaptureLoginStatus !== "function") {
    return { ok: true, missingHandler: true, loggedIn: false, accountName: "", updatedAt: "" };
  }
  return api.getCaptureLoginStatus();
}

export async function collectMonitorAwemeSummary({ input, url, itemId, sessionId = "" } = {}) {
  const api = window.api?.monitor;
  if (!api || typeof api.collectAwemeSummary !== "function") {
    return { ok: false, missingHandler: true, message: "作品内容提取接口未就绪" };
  }
  return api.collectAwemeSummary({
    input: String(input || url || itemId || "").trim(),
    url: String(url || "").trim(),
    itemId: String(itemId || "").trim(),
    sessionId: String(sessionId || "").trim()
  });
}

export async function downloadMonitorVideo({ downloadUrl = "", targetDir = "", fileName = "" } = {}) {
  const api = window.api?.monitor;
  if (!api || typeof api.downloadVideo !== "function") {
    return { ok: false, missingHandler: true, message: "视频下载接口未就绪" };
  }
  return api.downloadVideo({
    downloadUrl: String(downloadUrl || "").trim(),
    targetDir: String(targetDir || "").trim(),
    fileName: String(fileName || "").trim()
  });
}

export async function exportMonitorWorksTable({ filePath = "", rows = [] } = {}) {
  const api = window.api?.monitor;
  if (!api || typeof api.exportWorksTable !== "function") {
    return { ok: false, missingHandler: true, message: "作品表格导出接口未就绪" };
  }
  return api.exportWorksTable({
    filePath: String(filePath || "").trim(),
    rows: Array.isArray(rows) ? rows : []
  });
}
