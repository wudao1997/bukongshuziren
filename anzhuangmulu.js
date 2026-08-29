const fs = require("fs");
const path = require("path");

// 安装目录专属模块：负责记录首次安装目录，并在后续自动更新时回读同一目录做覆盖安装。
function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizePath(value) {
  const raw = normalizeText(value);
  if (!raw) return "";
  try {
    return path.resolve(raw);
  } catch {
    return raw;
  }
}

function safeNowIso() {
  return new Date().toISOString();
}

function getInstallDirRecordPath({ app }) {
  try {
    const userDataDir = app && typeof app.getPath === "function" ? app.getPath("userData") : "";
    if (userDataDir) {
      return path.join(userDataDir, "config", "anzhuangmulu.json");
    }
  } catch {}
  return path.join(__dirname, "anzhuangmulu.runtime.json");
}

function detectCurrentInstallInfo({ app, projectRoot, isPackaged, execPath }) {
  const currentExecPath = normalizePath(execPath);
  const packaged = isPackaged === true;
  const installDir = packaged
    ? normalizePath(currentExecPath ? path.dirname(currentExecPath) : "")
    : normalizePath(projectRoot || __dirname);
  return {
    installDir,
    execPath: currentExecPath,
    sourceType: packaged ? "packaged" : "development"
  };
}

function normalizeInstallDirRecord(input = {}) {
  return {
    installDir: normalizePath(input.installDir),
    execPath: normalizePath(input.execPath),
    sourceType: normalizeText(input.sourceType) || "unknown",
    appVersion: normalizeText(input.appVersion),
    firstRecordedAt: normalizeText(input.firstRecordedAt),
    updatedAt: normalizeText(input.updatedAt),
    note: normalizeText(input.note)
  };
}

function readInstallDirRecord(options = {}) {
  const filePath = getInstallDirRecordPath(options);
  try {
    if (!fs.existsSync(filePath)) {
      return { ok: true, filePath, record: normalizeInstallDirRecord({}) };
    }
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = raw ? JSON.parse(raw) : {};
    return { ok: true, filePath, record: normalizeInstallDirRecord(parsed) };
  } catch (e) {
    return { ok: false, filePath, message: String(e?.message || e), record: normalizeInstallDirRecord({}) };
  }
}

function writeInstallDirRecord(record = {}, options = {}) {
  const filePath = getInstallDirRecordPath(options);
  try {
    ensureDir(path.dirname(filePath));
    const normalized = normalizeInstallDirRecord(record);
    fs.writeFileSync(filePath, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
    return { ok: true, filePath, record: normalized };
  } catch (e) {
    return { ok: false, filePath, message: String(e?.message || e), record: normalizeInstallDirRecord(record) };
  }
}

function persistInstallDirRecord(options = {}) {
  const current = detectCurrentInstallInfo(options);
  const existingRes = readInstallDirRecord(options);
  const existing = existingRes.record || normalizeInstallDirRecord({});
  const installDir = current.installDir || existing.installDir;
  const execPath = current.execPath || existing.execPath;
  const nextRecord = {
    installDir,
    execPath,
    sourceType: current.sourceType || existing.sourceType || "unknown",
    appVersion: normalizeText(options.appVersion || existing.appVersion),
    firstRecordedAt: existing.firstRecordedAt || safeNowIso(),
    updatedAt: safeNowIso(),
    note:
      normalizeText(options.note) ||
      (existing.installDir && existing.installDir === installDir
        ? "已校验当前安装目录"
        : "首次启动或安装目录变更后已自动记录")
  };
  return writeInstallDirRecord(nextRecord, options);
}

function resolvePreferredInstallDir(options = {}) {
  const existing = readInstallDirRecord(options).record || normalizeInstallDirRecord({});
  const current = detectCurrentInstallInfo(options);
  return normalizePath(existing.installDir || current.installDir);
}

module.exports = {
  getInstallDirRecordPath,
  detectCurrentInstallInfo,
  normalizeInstallDirRecord,
  readInstallDirRecord,
  writeInstallDirRecord,
  persistInstallDirRecord,
  resolvePreferredInstallDir
};
