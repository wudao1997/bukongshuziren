// 安装日志云上报功能：负责统一生成自动更新安装会话ID，并规范每条安装日志的云端数据结构。
const crypto = require("crypto");

const APP_INSTALL_LOG_CLOUD_OBJECT_NAME = "qd-anzhuangrizhi";

function normalizeText(value) {
  return String(value || "").trim();
}

function cutText(value, maxLen) {
  const text = normalizeText(value);
  if (!maxLen || text.length <= maxLen) return text;
  return text.slice(0, maxLen);
}

function normalizeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function normalizeNumber(value, fallback = 0) {
  const num = Number(value || 0);
  return Number.isFinite(num) ? num : fallback;
}

function createInstallLogSessionId(prefix = "upd") {
  const head = cutText(prefix || "upd", 16).toLowerCase().replace(/[^a-z0-9_-]/g, "") || "upd";
  const seed = crypto.randomBytes(6).toString("hex");
  return `${head}-${Date.now()}-${seed}`;
}

function normalizeInstallLogEntry(input = {}) {
  const extra = normalizeObject(input.extra);
  return {
    scene: cutText(input.scene || "desktop", 40) || "desktop",
    installSessionId: cutText(input.installSessionId, 80),
    releaseId: cutText(input.releaseId, 80),
    source: cutText(input.source || "main", 40) || "main",
    stage: cutText(input.stage, 60),
    eventType: cutText(input.eventType, 80),
    level: cutText(input.level || "info", 20) || "info",
    message: cutText(input.message, 4000),
    currentVersion: cutText(input.currentVersion, 40),
    targetVersion: cutText(input.targetVersion, 40),
    artifactName: cutText(input.artifactName, 260),
    installMode: cutText(input.installMode, 40),
    deviceId: cutText(input.deviceId, 120),
    userId: cutText(input.userId, 100),
    account: cutText(input.account, 100),
    installDir: cutText(input.installDir, 500),
    appExePath: cutText(input.appExePath, 500),
    installerPath: cutText(input.installerPath, 500),
    helperPath: cutText(input.helperPath, 500),
    helperLogPath: cutText(input.helperLogPath, 500),
    helperPid: normalizeNumber(input.helperPid),
    parentPid: normalizeNumber(input.parentPid),
    exitCode: normalizeNumber(input.exitCode),
    signal: cutText(input.signal, 60),
    extra,
    createdAt: normalizeNumber(input.createdAt, Date.now()),
    updatedAt: Date.now()
  };
}

module.exports = {
  APP_INSTALL_LOG_CLOUD_OBJECT_NAME,
  createInstallLogSessionId,
  normalizeInstallLogEntry
};
