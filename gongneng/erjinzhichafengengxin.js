// 二进制差分更新功能：负责生成 patch、校验 patch、应用 patch，还原完整安装包。
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

let _binaryDiffLib = null;

function loadBinaryDiffLib() {
  if (_binaryDiffLib) return _binaryDiffLib;
  try {
    _binaryDiffLib = require("@bsdiff-rust/node");
  } catch {
    _binaryDiffLib = require("bsdiff-node");
  }
  return _binaryDiffLib;
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function removeFileIfExists(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {}
}

function hashFileSha512Base64(filePath) {
  return crypto.createHash("sha512").update(fs.readFileSync(filePath)).digest("base64");
}

function statFile(filePath) {
  return fs.statSync(filePath);
}

function normalizePositiveNumber(value) {
  const num = Number(value || 0);
  return Number.isFinite(num) && num > 0 ? Math.floor(num) : 0;
}

function assertFileExists(filePath, label) {
  const target = String(filePath || "").trim();
  if (!target) {
    throw new Error(`${label}不能为空`);
  }
  if (!fs.existsSync(target)) {
    throw new Error(`${label}不存在：${target}`);
  }
  const stat = statFile(target);
  if (!stat.isFile()) {
    throw new Error(`${label}不是文件：${target}`);
  }
  return target;
}

function verifyRestoredFile({ outputFilePath, targetSha512, targetSize }) {
  const nextPath = assertFileExists(outputFilePath, "还原后的安装包");
  const stat = statFile(nextPath);
  const normalizedTargetSize = normalizePositiveNumber(targetSize);
  if (normalizedTargetSize > 0 && stat.size !== normalizedTargetSize) {
    throw new Error(`还原后的安装包大小不匹配：期望 ${normalizedTargetSize}，实际 ${stat.size}`);
  }
  const expectedSha512 = String(targetSha512 || "").trim();
  const actualSha512 = hashFileSha512Base64(nextPath);
  if (expectedSha512 && actualSha512 !== expectedSha512) {
    throw new Error("还原后的安装包哈希不匹配");
  }
  return {
    filePath: nextPath,
    size: stat.size,
    sha512: actualSha512
  };
}

function generateBinaryDiffPatch({
  baseFilePath,
  targetFilePath,
  patchFilePath,
  verify = true
} = {}) {
  const basePath = assertFileExists(baseFilePath, "旧版本完整安装包");
  const targetPath = assertFileExists(targetFilePath, "新版本完整安装包");
  const outPath = String(patchFilePath || "").trim();
  if (!outPath) {
    throw new Error("差分包输出路径不能为空");
  }
  ensureDir(path.dirname(outPath));
  removeFileIfExists(outPath);
  const lib = loadBinaryDiffLib();
  lib.diffSync(basePath, targetPath, outPath);
  const patchStat = statFile(outPath);
  let verified = false;
  if (verify !== false) {
    if (typeof lib.verifyPatchSync === "function") {
      verified = lib.verifyPatchSync(basePath, targetPath, outPath) === true;
      if (!verified) {
        throw new Error("差分包校验失败，旧包无法正确还原出新包");
      }
    } else {
      const verifyOutputPath = path.join(
        path.dirname(outPath),
        `${path.basename(outPath)}.${Date.now()}.verify.tmp`
      );
      try {
        removeFileIfExists(verifyOutputPath);
        lib.patchSync(basePath, verifyOutputPath, outPath);
        const expectedSha512 = hashFileSha512Base64(targetPath);
        const actualSha512 = hashFileSha512Base64(verifyOutputPath);
        verified = expectedSha512 === actualSha512;
      } finally {
        removeFileIfExists(verifyOutputPath);
      }
      if (!verified) {
        throw new Error("差分包校验失败，旧包无法正确还原出新包");
      }
    }
  }
  return {
    patchFilePath: outPath,
    patchSize: patchStat.size,
    patchSha512: hashFileSha512Base64(outPath),
    baseSize: statFile(basePath).size,
    baseSha512: hashFileSha512Base64(basePath),
    targetSize: statFile(targetPath).size,
    targetSha512: hashFileSha512Base64(targetPath),
    verified
  };
}

function applyBinaryDiffPatch({
  baseFilePath,
  patchFilePath,
  outputFilePath,
  targetSha512 = "",
  targetSize = 0
} = {}) {
  const basePath = assertFileExists(baseFilePath, "基线安装包");
  const patchPath = assertFileExists(patchFilePath, "差分包");
  const outPath = String(outputFilePath || "").trim();
  if (!outPath) {
    throw new Error("还原后的安装包输出路径不能为空");
  }
  ensureDir(path.dirname(outPath));
  removeFileIfExists(outPath);
  const lib = loadBinaryDiffLib();
  lib.patchSync(basePath, outPath, patchPath);
  const verified = verifyRestoredFile({
    outputFilePath: outPath,
    targetSha512,
    targetSize
  });
  return {
    outputFilePath: verified.filePath,
    outputSize: verified.size,
    outputSha512: verified.sha512
  };
}

module.exports = {
  ensureDir,
  removeFileIfExists,
  hashFileSha512Base64,
  generateBinaryDiffPatch,
  applyBinaryDiffPatch
};
