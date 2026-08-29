const fs = require("fs");
const path = require("path");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function assertFileExists(filePath, label) {
  const normalized = path.resolve(String(filePath || "").trim());
  if (!normalized || !fs.existsSync(normalized) || !fs.statSync(normalized).isFile()) {
    throw new Error(`未找到${label}。`);
  }
  return normalized;
}

function sanitizeFolderName(name) {
  const raw = String(name || "").trim();
  if (!raw) return "";
  return raw
    .replace(/[\\/:*?"<>|]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/[. ]+$/g, "")
    .trim()
    .slice(0, 80);
}

function formatFolderTime(input) {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return "";
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}-${minutes}-${seconds}`;
}

function resolveVideoTimeText(videoPath) {
  try {
    const stat = fs.statSync(videoPath);
    const time = stat.mtimeMs || stat.birthtimeMs || stat.ctimeMs || Date.now();
    return formatFolderTime(time);
  } catch {
    return formatFolderTime(Date.now());
  }
}

function ensureUniqueFolder(outputDir, folderName) {
  const baseName = sanitizeFolderName(folderName) || formatFolderTime(Date.now()) || "导出内容";
  let candidate = path.join(outputDir, baseName);
  let index = 2;
  while (fs.existsSync(candidate)) {
    candidate = path.join(outputDir, `${baseName}_${index}`);
    index += 1;
  }
  return candidate;
}

function copyToNamedFile(sourcePath, targetDir, targetName) {
  const safeName = String(targetName || "").trim();
  if (!safeName) throw new Error("导出文件名不能为空。");
  const targetPath = path.join(targetDir, safeName);
  fs.copyFileSync(sourcePath, targetPath);
  return targetPath;
}

function exportHomePublishBundle({ outputDir, videoPath, coverPath, title } = {}) {
  const targetRoot = path.resolve(String(outputDir || "").trim());
  if (!targetRoot) {
    throw new Error("请先设置导出目录。");
  }
  ensureDir(targetRoot);
  const safeVideoPath = assertFileExists(videoPath, "字幕和音乐合成成片");
  const safeCoverPath = assertFileExists(coverPath, "封面图片");
  const safeTitle = sanitizeFolderName(title);
  const fallbackFolderName = resolveVideoTimeText(safeVideoPath) || formatFolderTime(Date.now()) || "导出内容";
  const folderName = safeTitle || fallbackFolderName;
  const folderPath = ensureUniqueFolder(targetRoot, folderName);
  ensureDir(folderPath);

  const videoExt = path.extname(safeVideoPath) || ".mp4";
  const coverExt = path.extname(safeCoverPath) || ".png";
  const exportedVideoPath = copyToNamedFile(safeVideoPath, folderPath, `成片${videoExt}`);
  const exportedCoverPath = copyToNamedFile(safeCoverPath, folderPath, `封面${coverExt}`);

  return {
    folderName: path.basename(folderPath),
    folderPath,
    exportedVideoPath,
    exportedCoverPath,
    titleUsed: safeTitle,
    fallbackFolderName
  };
}

module.exports = {
  exportHomePublishBundle
};
