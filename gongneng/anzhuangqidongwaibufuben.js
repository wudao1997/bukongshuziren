// 安装器外部副本工具：当安装包位于旧安装目录下时，先复制到安装目录外再启动，避免卸载旧版时把安装器自己一起删掉。
const fs = require("fs");
const path = require("path");

function normalizeWindowsPath(input = "") {
  const raw = String(input || "").trim();
  if (!raw) return "";
  try {
    return path.resolve(raw).replace(/\//g, "\\").replace(/\\+$/, "").toLowerCase();
  } catch {
    return raw.replace(/\//g, "\\").replace(/\\+$/, "").toLowerCase();
  }
}

function ensureDir(dirPath = "") {
  const targetPath = String(dirPath || "").trim();
  if (!targetPath) return;
  fs.mkdirSync(targetPath, { recursive: true });
}

function isPathInside(targetPath = "", rootPath = "") {
  const target = normalizeWindowsPath(targetPath);
  const root = normalizeWindowsPath(rootPath);
  if (!target || !root) return false;
  return target === root || target.startsWith(`${root}\\`);
}

function sanitizeFileName(fileName = "") {
  const raw = String(fileName || "").trim();
  if (!raw) return "";
  return raw.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_");
}

function stageInstallerOutsideInstallDir({ installerPath = "", installDir = "", stagingRoot = "", artifactName = "" } = {}) {
  const sourcePath = String(installerPath || "").trim();
  if (!sourcePath) throw new Error("缺少安装包路径");
  if (!fs.existsSync(sourcePath)) throw new Error(`安装包不存在：${sourcePath}`);

  const normalizedSource = normalizeWindowsPath(sourcePath);
  const normalizedInstallDir = normalizeWindowsPath(installDir);
  const normalizedStagingRoot = normalizeWindowsPath(stagingRoot);

  if (normalizedStagingRoot && isPathInside(sourcePath, stagingRoot)) {
    const stats = fs.statSync(sourcePath);
    return {
      launchPath: sourcePath,
      staged: false,
      reason: "already-staged",
      originalPath: sourcePath,
      stagedPath: sourcePath,
      size: Math.max(0, Number(stats?.size || 0) || 0)
    };
  }

  if (!normalizedInstallDir || !isPathInside(sourcePath, installDir)) {
    const stats = fs.statSync(sourcePath);
    return {
      launchPath: sourcePath,
      staged: false,
      reason: "outside-install-dir",
      originalPath: sourcePath,
      stagedPath: sourcePath,
      size: Math.max(0, Number(stats?.size || 0) || 0)
    };
  }

  const safeFileName = sanitizeFileName(artifactName || path.basename(sourcePath) || `installer-${Date.now()}.exe`) || `installer-${Date.now()}.exe`;
  const targetRoot = String(stagingRoot || "").trim();
  if (!targetRoot) throw new Error("缺少安装器外部暂存目录");
  ensureDir(targetRoot);

  const stagedPath = path.join(targetRoot, `${Date.now()}-${safeFileName}`);
  fs.copyFileSync(sourcePath, stagedPath);

  const sourceSize = Math.max(0, Number(fs.statSync(sourcePath)?.size || 0) || 0);
  const stagedSize = Math.max(0, Number(fs.statSync(stagedPath)?.size || 0) || 0);
  if (sourceSize <= 0 || stagedSize !== sourceSize) {
    try {
      fs.unlinkSync(stagedPath);
    } catch {}
    throw new Error(`安装器外部副本校验失败：source=${sourceSize}, staged=${stagedSize}`);
  }

  return {
    launchPath: stagedPath,
    staged: true,
    reason: "copied-outside-install-dir",
    originalPath: sourcePath,
    stagedPath,
    size: stagedSize
  };
}

module.exports = {
  stageInstallerOutsideInstallDir
};
