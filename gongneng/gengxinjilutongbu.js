const fs = require("fs");
const path = require("path");

// 同步维护桌面端版本更新记录，并生成帮助页直接读取的最近版本日志数据。
const PROJECT_ROOT = path.resolve(__dirname, "..");
const WORKSPACE_ROOT = path.resolve(PROJECT_ROOT, "..");
const UPDATE_RECORD_MD_PATH = path.join(WORKSPACE_ROOT, "更新记录.md");
const HELP_LOG_DATA_PATH = path.join(PROJECT_ROOT, "renderer", "app", "data", "gengxinrizhi.js");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readTextSafe(filePath) {
  try {
    return String(fs.readFileSync(filePath, "utf8") || "");
  } catch {
    return "";
  }
}

function writeTextSafe(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, String(content || ""), "utf8");
}

function normalizeVersion(value) {
  const text = String(value || "").trim().replace(/^v/i, "");
  return text || "";
}

function normalizeVersionLabel(value) {
  const version = normalizeVersion(value);
  return version ? `v${version}` : "";
}

function normalizeDateText(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (/^\d{4}-\d{2}-\d{2}( \d{2}:\d{2}:\d{2})?$/.test(text)) return text;
  const time = new Date(text);
  if (!Number.isFinite(time.getTime())) return text;
  const y = time.getFullYear();
  const m = String(time.getMonth() + 1).padStart(2, "0");
  const d = String(time.getDate()).padStart(2, "0");
  const hh = String(time.getHours()).padStart(2, "0");
  const mm = String(time.getMinutes()).padStart(2, "0");
  const ss = String(time.getSeconds()).padStart(2, "0");
  return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
}

function compactText(value) {
  return String(value || "").replace(/\r/g, "").trim();
}

function splitNoteItems(notes) {
  const raw = compactText(notes);
  if (!raw) return [];
  return raw
    .split(/\n+|[；;]+/)
    .map((item) => compactText(item).replace(/^[\-*•]+\s*/, ""))
    .filter(Boolean);
}

function deriveSummaryFromItems(items = [], fallbackVersion = "") {
  const first = compactText(Array.isArray(items) ? items[0] : "");
  if (!first) return normalizeVersionLabel(fallbackVersion) || "版本更新";
  const shortText = first.replace(/[。！!？?]+$/g, "");
  return shortText.length > 28 ? `${shortText.slice(0, 28)}...` : shortText;
}

function normalizeRecord(record = {}) {
  const version = normalizeVersion(record.version || record.rawVersion || "");
  const items = Array.isArray(record.items) ? record.items.map((item) => compactText(item)).filter(Boolean) : [];
  return {
    version,
    versionLabel: normalizeVersionLabel(version),
    date: normalizeDateText(record.date || record.publishedAt || ""),
    summary: compactText(record.summary || "") || deriveSummaryFromItems(items, version),
    items: items.length ? items : ["本次版本已完成打包并同步发布说明。"]
  };
}

function compareRecords(a, b) {
  const timeA = new Date(a.date || "").getTime() || 0;
  const timeB = new Date(b.date || "").getTime() || 0;
  if (timeA !== timeB) return timeB - timeA;
  return String(b.version || "").localeCompare(String(a.version || ""), undefined, { numeric: true, sensitivity: "base" });
}

function parseUpdateRecordsMarkdown(markdown = "") {
  const lines = String(markdown || "").replace(/\r/g, "").split("\n");
  const records = [];
  let current = null;
  for (const line of lines) {
    const text = String(line || "");
    const headerMatch = text.match(/^##\s*V?(\d+\.\d+\.\d+)\s*$/i);
    if (headerMatch) {
      if (current && current.version) records.push(normalizeRecord(current));
      current = { version: headerMatch[1], items: [] };
      continue;
    }
    if (!current) continue;
    const dateMatch = text.match(/^\-\s*日期[:：]\s*(.+)\s*$/);
    if (dateMatch) {
      current.date = dateMatch[1];
      continue;
    }
    const summaryMatch = text.match(/^\-\s*摘要[:：]\s*(.+)\s*$/);
    if (summaryMatch) {
      current.summary = summaryMatch[1];
      continue;
    }
    const itemMatch = text.match(/^\-\s*条目[:：]\s*(.+)\s*$/);
    if (itemMatch) {
      current.items.push(itemMatch[1]);
      continue;
    }
  }
  if (current && current.version) records.push(normalizeRecord(current));
  return records.sort(compareRecords);
}

function buildMarkdownFromRecords(records = []) {
  const list = Array.isArray(records) ? records.map(normalizeRecord).filter((item) => item.version) : [];
  const lines = [
    "# 更新记录",
    "",
    "说明：每次打包新版本时，脚本会自动把本次版本写入这里；帮助菜单中的更新日志会默认读取这里最新三次记录。",
    ""
  ];
  list.forEach((record) => {
    lines.push(`## V${record.version}`);
    lines.push(`- 日期：${record.date || ""}`);
    lines.push(`- 摘要：${record.summary || ""}`);
    record.items.forEach((item) => {
      lines.push(`- 条目：${item}`);
    });
    lines.push("");
  });
  return `${lines.join("\n").trim()}\n`;
}

function buildHelpLogDataModule(records = []) {
  const normalized = Array.isArray(records) ? records.map(normalizeRecord).filter((item) => item.version) : [];
  return `// 自动生成：帮助页更新日志数据，来源于项目根目录“更新记录.md”。\nexport const HELP_CHANGELOGS = ${JSON.stringify(
    normalized,
    null,
    2
  )};\n\nexport default HELP_CHANGELOGS;\n`;
}

function upsertUpdateRecord(records = [], record = {}) {
  const normalized = normalizeRecord(record);
  if (!normalized.version) return Array.isArray(records) ? records.map(normalizeRecord) : [];
  const filtered = (Array.isArray(records) ? records : [])
    .map(normalizeRecord)
    .filter((item) => item.version && item.version !== normalized.version);
  return [normalized, ...filtered].sort(compareRecords);
}

function readUpdateRecords() {
  return parseUpdateRecordsMarkdown(readTextSafe(UPDATE_RECORD_MD_PATH));
}

function writeUpdateRecords(records = []) {
  writeTextSafe(UPDATE_RECORD_MD_PATH, buildMarkdownFromRecords(records));
}

function writeHelpLogData(records = []) {
  writeTextSafe(HELP_LOG_DATA_PATH, buildHelpLogDataModule(records));
}

function syncUpdateRecordArtifacts(payload = {}) {
  const currentRecords = readUpdateRecords();
  const version = normalizeVersion(payload.version || "");
  const items = Array.isArray(payload.items) && payload.items.length ? payload.items : splitNoteItems(payload.notes || "");
  const nextRecords = version
    ? upsertUpdateRecord(currentRecords, {
        version,
        date: payload.publishedAt || payload.date || "",
        summary: payload.summary || "",
        items
      })
    : currentRecords;
  writeUpdateRecords(nextRecords);
  writeHelpLogData(nextRecords);
  return {
    updateRecordPath: UPDATE_RECORD_MD_PATH,
    helpLogDataPath: HELP_LOG_DATA_PATH,
    records: nextRecords
  };
}

module.exports = {
  UPDATE_RECORD_MD_PATH,
  HELP_LOG_DATA_PATH,
  parseUpdateRecordsMarkdown,
  buildMarkdownFromRecords,
  buildHelpLogDataModule,
  syncUpdateRecordArtifacts,
  readUpdateRecords,
  writeUpdateRecords,
  writeHelpLogData
};
