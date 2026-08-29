const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { generateBinaryDiffPatch } = require("./gongneng/erjinzhichafengengxin");
const { syncUpdateRecordArtifacts } = require("./gongneng/gengxinjilutongbu");
const { syncBuildRecordArtifacts } = require("./gongneng/dabaojilutongbu");

// 自动为最新安装包输出目录生成 update.json，避免每次打包后手工补清单文件。
const projectRoot = __dirname;
const packageJsonPath = path.join(projectRoot, "package.json");
const DEFAULT_RELEASE_BASE_URL = String(process.env.APP_UPDATE_RELEASE_BASE_URL || "").trim().replace(/\/+$/, "");
const DEFAULT_RELEASE_ROOT_DIR_NAME = "release";
const DEFAULT_RELEASE_SCENE = "desktop";

function readJsonSafe(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function formatDateTime(date = new Date()) {
  return [
    date.getFullYear(),
    "-",
    pad2(date.getMonth() + 1),
    "-",
    pad2(date.getDate()),
    " ",
    pad2(date.getHours()),
    ":",
    pad2(date.getMinutes()),
    ":",
    pad2(date.getSeconds())
  ].join("");
}

function formatReleaseTimestamp(date = new Date()) {
  return [
    date.getFullYear(),
    pad2(date.getMonth() + 1),
    pad2(date.getDate()),
    pad2(date.getHours()),
    pad2(date.getMinutes()),
    pad2(date.getSeconds())
  ].join("");
}

function parseCliArgs(argv = []) {
  return argv.reduce((acc, item) => {
    if (!item.startsWith("--")) return acc;
    const eqIndex = item.indexOf("=");
    const key = eqIndex > -1 ? item.slice(2, eqIndex) : item.slice(2);
    const value = eqIndex > -1 ? item.slice(eqIndex + 1) : "true";
    acc[key] = value;
    return acc;
  }, {});
}

function listOutputDirs(rootDir) {
  return fs
    .readdirSync(rootDir, { withFileTypes: true })
    .filter((item) => item.isDirectory() && /^dist/i.test(item.name))
    .map((item) => path.join(rootDir, item.name));
}

function listRootInstallers(outputDir) {
  return fs
    .readdirSync(outputDir, { withFileTypes: true })
    .filter((item) => item.isFile() && /\.exe$/i.test(item.name))
    .map((item) => {
      const fullPath = path.join(outputDir, item.name);
      const stat = fs.statSync(fullPath);
      return {
        name: item.name,
        fullPath,
        mtimeMs: stat.mtimeMs
      };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function copyFileSync(sourcePath, targetPath) {
  ensureDir(path.dirname(targetPath));
  fs.copyFileSync(sourcePath, targetPath);
}

function normalizeBooleanLike(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  const text = String(value).trim().toLowerCase();
  if (!text) return fallback;
  if (["1", "true", "yes", "y", "on"].includes(text)) return true;
  if (["0", "false", "no", "n", "off"].includes(text)) return false;
  return fallback;
}

function sanitizeVersionForFileName(value) {
  return String(value || "")
    .trim()
    .replace(/[^0-9a-zA-Z._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function sanitizePathSegment(value, fallback = "") {
  const normalized = String(value || "")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || String(fallback || "").trim();
}

function toPosixPath(...segments) {
  return segments
    .flat()
    .map((item) => String(item || "").trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, ""))
    .filter(Boolean)
    .join("/");
}

function joinUrlSegments(baseUrl, ...segments) {
  const base = String(baseUrl || "").trim().replace(/\/+$/, "");
  const tail = toPosixPath(...segments);
  if (!base) return "";
  if (!tail) return base;
  return `${base}/${tail}`;
}

function buildAbsolutePublishUrl(baseUrl, fileName) {
  const base = String(baseUrl || "").trim().replace(/\/+$/, "");
  const name = String(fileName || "").trim().replace(/^\/+/, "");
  if (!base || !name) return "";
  return `${base}/${name}`;
}

function buildReleasePublishPlan({ outputDir, version, installerName, blockMapName, cliArgs }) {
  const releaseRootDirName =
    sanitizePathSegment(cliArgs.releaseRootDirName || DEFAULT_RELEASE_ROOT_DIR_NAME, DEFAULT_RELEASE_ROOT_DIR_NAME) ||
    DEFAULT_RELEASE_ROOT_DIR_NAME;
  const releaseScene =
    sanitizePathSegment(cliArgs.releaseScene || process.env.APP_UPDATE_RELEASE_SCENE || DEFAULT_RELEASE_SCENE, DEFAULT_RELEASE_SCENE) ||
    DEFAULT_RELEASE_SCENE;
  const releaseBaseUrl = String(
    cliArgs.releaseBaseUrl || process.env.APP_UPDATE_RELEASE_BASE_URL || DEFAULT_RELEASE_BASE_URL
  )
    .trim()
    .replace(/\/+$/, "");
  const releaseTimestamp =
    sanitizePathSegment(
      cliArgs.releaseTimestamp || process.env.APP_UPDATE_RELEASE_TIMESTAMP || formatReleaseTimestamp(new Date()),
      formatReleaseTimestamp(new Date())
    ) || formatReleaseTimestamp(new Date());
  const releaseId =
    sanitizePathSegment(
      cliArgs.releaseId ||
        process.env.APP_UPDATE_RELEASE_ID ||
        `${sanitizeVersionForFileName(version || "version")}_${releaseTimestamp}`,
      `${sanitizeVersionForFileName(version || "version")}_${releaseTimestamp}`
    ) || `${sanitizeVersionForFileName(version || "version")}_${releaseTimestamp}`;
  const relativeRootPath = toPosixPath(releaseRootDirName, releaseScene, releaseId);
  const rootDir = path.join(outputDir, ...relativeRootPath.split("/"));
  const releaseRootUrl = joinUrlSegments(releaseBaseUrl, releaseScene, releaseId);
  const manifestRelativePath = toPosixPath(relativeRootPath, "manifest", "update.json");
  const latestRelativePath = toPosixPath(relativeRootPath, "latest", "latest.yml");
  const downloadRelativePath = toPosixPath(relativeRootPath, "exe", installerName);
  const blockMapRelativePath = blockMapName ? toPosixPath(relativeRootPath, "blockmap", blockMapName) : "";
  return {
    releaseId,
    releaseScene,
    releaseBaseUrl,
    releaseRootUrl,
    relativeRootPath,
    rootDir,
    manifestDir: path.join(rootDir, "manifest"),
    latestDir: path.join(rootDir, "latest"),
    exeDir: path.join(rootDir, "exe"),
    patchDir: path.join(rootDir, "patch"),
    blockMapDir: path.join(rootDir, "blockmap"),
    metadataPath: path.join(rootDir, "fabuqingdan.json"),
    manifestUrl: joinUrlSegments(releaseRootUrl, "manifest", "update.json"),
    manifestRelativePath,
    latestYmlUrl: joinUrlSegments(releaseRootUrl, "latest", "latest.yml"),
    latestRelativePath,
    providerBaseUrl: joinUrlSegments(releaseRootUrl, "latest"),
    downloadUrl: joinUrlSegments(releaseRootUrl, "exe", installerName),
    downloadRelativePath,
    blockMapUrl: blockMapName ? joinUrlSegments(releaseRootUrl, "blockmap", blockMapName) : "",
    blockMapRelativePath,
    patchBaseUrl: joinUrlSegments(releaseRootUrl, "patch"),
    latestInstallerRelativeUrl: `../exe/${installerName}`
  };
}

function pickLatestOutputDir(rootDir) {
  const candidates = listOutputDirs(rootDir)
    .map((dir) => {
      const installers = listRootInstallers(dir);
      if (!installers.length) return null;
      return {
        dir,
        installers,
        latestInstallerMtimeMs: installers[0].mtimeMs
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.latestInstallerMtimeMs - a.latestInstallerMtimeMs);
  return candidates[0] || null;
}

function resolveOutputDir(rootDir, cliArgs) {
  const rawOutputDir = String(cliArgs.outputDir || "").trim();
  if (rawOutputDir) {
    const outputDir = path.resolve(rootDir, rawOutputDir);
    if (!fs.existsSync(outputDir)) {
      throw new Error(`指定输出目录不存在：${outputDir}`);
    }
    const installers = listRootInstallers(outputDir);
    if (!installers.length) {
      throw new Error(`指定输出目录下未找到安装包：${outputDir}`);
    }
    return { dir: outputDir, installers };
  }
  const latest = pickLatestOutputDir(rootDir);
  if (!latest) {
    throw new Error("未找到可生成 update.json 的安装包输出目录");
  }
  return latest;
}

function resolveInstallerFromDir(dirPath) {
  const installers = listRootInstallers(dirPath);
  if (!installers.length) {
    throw new Error(`指定目录下未找到安装包：${dirPath}`);
  }
  return installers[0];
}

function readVersionFromUpdateManifest(outputDir, fallback = "") {
  const updateJsonPath = path.join(outputDir, "update.json");
  const existing = readJsonSafe(updateJsonPath) || {};
  return String(existing.version || existing.latestVersion || fallback || "").trim();
}

function resolveBaseInstallerInfo(rootDir, cliArgs) {
  const explicitBaseInstallerPath = String(
    cliArgs.baseInstallerPath || process.env.APP_UPDATE_BASE_INSTALLER_PATH || ""
  ).trim();
  const explicitBaseOutputDir = String(
    cliArgs.baseOutputDir || process.env.APP_UPDATE_BASE_OUTPUT_DIR || ""
  ).trim();
  if (!explicitBaseInstallerPath && !explicitBaseOutputDir) {
    return null;
  }
  if (explicitBaseInstallerPath) {
    const installerPath = path.resolve(rootDir, explicitBaseInstallerPath);
    if (!fs.existsSync(installerPath)) {
      throw new Error(`指定旧版本安装包不存在：${installerPath}`);
    }
    const outputDir = path.dirname(installerPath);
    return {
      outputDir,
      installer: {
        name: path.basename(installerPath),
        fullPath: installerPath
      },
      version: String(
        cliArgs.baseVersion ||
          process.env.APP_UPDATE_BASE_VERSION ||
          readVersionFromUpdateManifest(outputDir, "")
      ).trim(),
      manifest: readJsonSafe(path.join(outputDir, "update.json")) || {}
    };
  }
  const outputDir = path.resolve(rootDir, explicitBaseOutputDir);
  if (!fs.existsSync(outputDir)) {
    throw new Error(`指定旧版本输出目录不存在：${outputDir}`);
  }
  return {
    outputDir,
    installer: resolveInstallerFromDir(outputDir),
    version: String(
      cliArgs.baseVersion ||
        process.env.APP_UPDATE_BASE_VERSION ||
        readVersionFromUpdateManifest(outputDir, "")
    ).trim(),
    manifest: readJsonSafe(path.join(outputDir, "update.json")) || {}
  };
}

function buildBinaryDiffArtifact({
  rootDir,
  outputDir,
  installerName,
  installerPath,
  version,
  providerBaseUrl,
  patchBaseUrl,
  cliArgs
}) {
  const baseInfo = resolveBaseInstallerInfo(rootDir, cliArgs);
  if (!baseInfo) return null;
  const baseVersion = String(baseInfo.version || "").trim();
  if (!baseVersion) {
    throw new Error("生成二进制差分包时缺少旧版本号，请补充 --baseVersion 或确保旧目录已有 update.json");
  }
  const patchDir = path.join(outputDir, "patches");
  const patchFileName =
    String(cliArgs.patchFileName || "").trim() ||
    `${installerName}.from-${sanitizeVersionForFileName(baseVersion || "base")}.patch`;
  const patchFilePath = path.join(patchDir, patchFileName);
  const resolvedPatchBaseUrl = String(
    cliArgs.patchBaseUrl ||
      process.env.APP_UPDATE_PATCH_BASE_URL ||
      patchBaseUrl ||
      (providerBaseUrl ? `${providerBaseUrl}/patches` : "")
  )
    .trim()
    .replace(/\/+$/, "");
  const baseDownloadUrl = String(
    cliArgs.baseDownloadUrl || process.env.APP_UPDATE_BASE_DOWNLOAD_URL || baseInfo?.manifest?.downloadUrl || ""
  ).trim();
  const patchMeta = generateBinaryDiffPatch({
    baseFilePath: baseInfo.installer.fullPath,
    targetFilePath: installerPath,
    patchFilePath,
    verify: normalizeBooleanLike(cliArgs.verifyBinaryDiff, true)
  });
  return {
    patchFileName,
    patchFilePath,
    baseInfo,
    entry: {
      baseVersion,
      baseArtifactName: baseInfo.installer.name,
      baseSha512: patchMeta.baseSha512,
      baseSize: patchMeta.baseSize,
      baseDownloadUrl,
      targetVersion: String(version || "").trim(),
      targetArtifactName: installerName,
      targetSha512: patchMeta.targetSha512,
      targetSize: patchMeta.targetSize,
      patchName: patchFileName,
      patchUrl: buildAbsolutePublishUrl(resolvedPatchBaseUrl, patchFileName),
      patchSha512: patchMeta.patchSha512,
      patchSize: patchMeta.patchSize,
      verified: patchMeta.verified === true
    }
  };
}

function buildUpdateManifest({ outputDir, installerName, version, productName, releasePlan, cliArgs }) {
  const updateJsonPath = path.join(outputDir, "update.json");
  const existing = readJsonSafe(updateJsonPath) || {};
  const providerBaseUrl = resolveProviderBaseUrl(
    String(
      cliArgs.providerBaseUrl ||
        process.env.APP_UPDATE_PROVIDER_BASE_URL ||
        releasePlan?.providerBaseUrl ||
        existing.providerBaseUrl
    ).trim(),
    releasePlan?.downloadUrl || existing.downloadUrl || ""
  );
  const downloadUrl = String(
    cliArgs.downloadUrl || process.env.APP_UPDATE_DOWNLOAD_URL || releasePlan?.downloadUrl || existing.downloadUrl || ""
  ).trim();
  const latestYmlUrl = String(
    cliArgs.latestYmlUrl || process.env.APP_UPDATE_LATEST_YML_URL || releasePlan?.latestYmlUrl || existing.latestYmlUrl || ""
  ).trim();
  const manifestUrl = String(releasePlan?.manifestUrl || existing.manifestUrl || "").trim();
  const notes = String(cliArgs.notes || process.env.APP_UPDATE_NOTES || existing.notes || `${productName} ${version} 安装包`).trim();
  const publishedAt = String(existing.publishedAt || formatDateTime(new Date())).trim();
  return {
    updateJsonPath,
    content: {
      version,
      releaseId: String(releasePlan?.releaseId || existing.releaseId || "").trim(),
      manifestUrl,
      downloadUrl,
      providerBaseUrl,
      latestYmlUrl,
      channel: "latest",
      publishedAt,
      notes,
      artifactName: installerName,
      binaryDiffPreferred: existing.binaryDiffPreferred === true,
      binaryDiffPatches: Array.isArray(existing.binaryDiffPatches) ? existing.binaryDiffPatches : []
    }
  };
}

function normalizeBinaryDiffPatchEntry(entry) {
  if (!entry || typeof entry !== "object") return null;
  const baseVersion = String(entry.baseVersion || "").trim();
  const targetVersion = String(entry.targetVersion || "").trim();
  const patchName = String(entry.patchName || "").trim();
  if (!baseVersion || !targetVersion || !patchName) return null;
  return {
    baseVersion,
    baseArtifactName: String(entry.baseArtifactName || "").trim(),
    baseSha512: String(entry.baseSha512 || "").trim(),
    baseSize: Number(entry.baseSize || 0) || 0,
    baseDownloadUrl: String(entry.baseDownloadUrl || "").trim(),
    targetVersion,
    targetArtifactName: String(entry.targetArtifactName || "").trim(),
    targetSha512: String(entry.targetSha512 || "").trim(),
    targetSize: Number(entry.targetSize || 0) || 0,
    patchName,
    patchUrl: String(entry.patchUrl || "").trim(),
    patchSha512: String(entry.patchSha512 || "").trim(),
    patchSize: Number(entry.patchSize || 0) || 0,
    verified: entry.verified === true
  };
}

function mergeBinaryDiffPatchEntries(...groups) {
  const merged = new Map();
  groups.flat().forEach((item) => {
    const normalized = normalizeBinaryDiffPatchEntry(item);
    if (!normalized) return;
    const key = `${normalized.baseVersion}=>${normalized.targetVersion}`;
    merged.set(key, normalized);
  });
  return Array.from(merged.values()).sort((a, b) => String(a.baseVersion || "").localeCompare(String(b.baseVersion || "")));
}

function buildBinaryDiffArtifactsFromEntries(outputDir, entries = []) {
  const patchDir = path.join(outputDir, "patches");
  return entries
    .map((entry) => {
      const normalized = normalizeBinaryDiffPatchEntry(entry);
      if (!normalized) return null;
      return {
        patchFileName: normalized.patchName,
        patchFilePath: path.join(patchDir, normalized.patchName),
        entry: normalized
      };
    })
    .filter(Boolean);
}

function escapeYamlString(value) {
  return JSON.stringify(String(value || ""));
}

function resolveProviderBaseUrl(explicitBaseUrl, downloadUrl) {
  const rawBase = String(explicitBaseUrl || "").trim();
  if (rawBase) return rawBase.replace(/\/+$/, "");
  const rawDownloadUrl = String(downloadUrl || "").trim();
  if (!rawDownloadUrl) return "";
  try {
    const url = new URL(rawDownloadUrl);
    url.search = "";
    url.hash = "";
    const parts = String(url.pathname || "").split("/");
    if (parts.length > 1) parts.pop();
    url.pathname = parts.join("/") || "/";
    return url.toString().replace(/\/+$/, "");
  } catch {
    return "";
  }
}

function resolveDownloadUrl({ explicitDownloadUrl, providerBaseUrl, installerName }) {
  const rawDownloadUrl = String(explicitDownloadUrl || "").trim();
  if (rawDownloadUrl) return rawDownloadUrl;
  const baseUrl = String(providerBaseUrl || "").trim().replace(/\/+$/, "");
  if (!baseUrl || !installerName) return "";
  return `${baseUrl}/${installerName}`;
}

function hashFileSha512Base64(filePath) {
  return crypto.createHash("sha512").update(fs.readFileSync(filePath)).digest("base64");
}

function buildLatestYmlContent({ installerPath, installerUrl, version, releaseDate }) {
  const installerStat = fs.statSync(installerPath);
  const sha512 = hashFileSha512Base64(installerPath);
  const normalizedInstallerUrl = String(installerUrl || "").trim() || path.basename(installerPath);
  const lines = [
    `version: ${escapeYamlString(version)}`,
    "files:",
    `  - url: ${escapeYamlString(normalizedInstallerUrl)}`,
    `    sha512: ${escapeYamlString(sha512)}`,
    `    size: ${installerStat.size}`
  ];
  lines.push(`path: ${escapeYamlString(normalizedInstallerUrl)}`);
  lines.push(`sha512: ${escapeYamlString(sha512)}`);
  lines.push(`releaseDate: ${escapeYamlString(releaseDate)}`);
  return {
    text: `${lines.join("\n")}\n`,
    meta: {
      sha512,
      size: installerStat.size
    }
  };
}

function writeReleasePublishReadme({ releasePlan, installerName, blockMapName, binaryDiffArtifacts = [] }) {
  const lines = [
    "发布专属目录说明",
    "",
    `发布ID：${releasePlan.releaseId}`,
    `目录根路径：${releasePlan.relativeRootPath}`,
    "",
    "本次发布文件请分别上传到下面 5 个目录：",
    `1. manifest/update.json -> ${releasePlan.manifestUrl}`,
    `2. exe/${installerName} -> ${releasePlan.downloadUrl}`,
    `3. latest/latest.yml -> ${releasePlan.latestYmlUrl}`
  ];
  if (blockMapName) {
    lines.push(`4. blockmap/${blockMapName} -> ${releasePlan.blockMapUrl}`);
  }
  if (Array.isArray(binaryDiffArtifacts) && binaryDiffArtifacts.length) {
    binaryDiffArtifacts.forEach((item, index) => {
      lines.push(
        `${blockMapName ? 5 + index : 4 + index}. patch/${item.patchFileName} -> ${buildAbsolutePublishUrl(
          releasePlan.patchBaseUrl,
          item.patchFileName
        )}`
      );
      lines.push(
        `   基线版本：${String(item?.entry?.baseVersion || "").trim()}，目标版本：${String(item?.entry?.targetVersion || "").trim()}`
      );
    });
  }
  lines.push("");
  lines.push("manifestUrl 请写入云数据表中的 manifestUrl 字段，客户端后续按该地址读取本次发布清单。");
  fs.writeFileSync(path.join(releasePlan.rootDir, "shangchuanshuoming.txt"), `${lines.join("\n")}\n`, "utf8");
}

function writeReleaseMetadata({ releasePlan, installerName, blockMapName, binaryDiffArtifacts = [], manifest }) {
  const metadata = {
    releaseId: releasePlan.releaseId,
    scene: releasePlan.releaseScene,
    releaseRootPath: releasePlan.relativeRootPath,
    releaseRootUrl: releasePlan.releaseRootUrl,
    manifestUrl: releasePlan.manifestUrl,
    manifestCloudPath: releasePlan.manifestRelativePath,
    latestYmlUrl: releasePlan.latestYmlUrl,
    latestYmlCloudPath: releasePlan.latestRelativePath,
    providerBaseUrl: releasePlan.providerBaseUrl,
    downloadUrl: releasePlan.downloadUrl,
    installerCloudPath: releasePlan.downloadRelativePath,
    installerName,
    blockMapUrl: releasePlan.blockMapUrl,
    blockMapCloudPath: releasePlan.blockMapRelativePath,
    blockMapName,
    binaryDiffPatches: Array.isArray(binaryDiffArtifacts)
      ? binaryDiffArtifacts.map((item) => ({
          baseVersion: String(item?.entry?.baseVersion || "").trim(),
          targetVersion: String(item?.entry?.targetVersion || "").trim(),
          patchName: item.patchFileName,
          patchUrl: buildAbsolutePublishUrl(releasePlan.patchBaseUrl, item.patchFileName),
          patchCloudPath: toPosixPath(releasePlan.relativeRootPath, "patch", item.patchFileName)
        }))
      : [],
    manifest: manifest?.content || {}
  };
  fs.writeFileSync(releasePlan.metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
}

function emitReleasePublishBundle({
  outputDir,
  installerName,
  installerPath,
  blockMapName,
  blockMapPath,
  updateJsonPath,
  latestYmlPath,
  updateManifest,
  releasePlan,
  binaryDiffArtifacts = [],
}) {
  ensureDir(releasePlan.rootDir);
  ensureDir(releasePlan.manifestDir);
  ensureDir(releasePlan.latestDir);
  ensureDir(releasePlan.exeDir);
  ensureDir(releasePlan.patchDir);
  ensureDir(releasePlan.blockMapDir);
  copyFileSync(updateJsonPath, path.join(releasePlan.manifestDir, "update.json"));
  copyFileSync(latestYmlPath, path.join(releasePlan.latestDir, "latest.yml"));
  copyFileSync(installerPath, path.join(releasePlan.exeDir, installerName));
  if (blockMapName && blockMapPath && fs.existsSync(blockMapPath)) {
    copyFileSync(blockMapPath, path.join(releasePlan.blockMapDir, blockMapName));
  }
  if (Array.isArray(binaryDiffArtifacts) && binaryDiffArtifacts.length) {
    binaryDiffArtifacts.forEach((item) => {
      if (item?.patchFilePath && fs.existsSync(item.patchFilePath)) {
        copyFileSync(item.patchFilePath, path.join(releasePlan.patchDir, item.patchFileName));
      }
    });
  }
  writeReleasePublishReadme({ releasePlan, installerName, blockMapName, binaryDiffArtifacts });
  writeReleaseMetadata({ releasePlan, installerName, blockMapName, binaryDiffArtifacts, manifest: updateManifest });
  return releasePlan;
}

async function main() {
  const cliArgs = parseCliArgs(process.argv.slice(2));
  const packageJson = readJsonSafe(packageJsonPath);
  if (!packageJson || typeof packageJson !== "object") {
    throw new Error("无法读取 package.json");
  }
  const version = String(packageJson.version || "").trim();
  const productName = String(packageJson.build?.productName || packageJson.productName || "app").trim();
  if (!version) {
    throw new Error("package.json 缺少 version");
  }

  const resolved = resolveOutputDir(projectRoot, cliArgs);
  const installer = resolved.installers[0];
  const blockMapName = `${installer.name}.blockmap`;
  const blockMapPath = path.join(resolved.dir, blockMapName);
  const releasePlan = buildReleasePublishPlan({
    outputDir: resolved.dir,
    version,
    installerName: installer.name,
    blockMapName: fs.existsSync(blockMapPath) ? blockMapName : "",
    cliArgs
  });
  const manifest = buildUpdateManifest({
    outputDir: resolved.dir,
    installerName: installer.name,
    version,
    productName,
    releasePlan,
    cliArgs
  });
  const latestYmlPath = path.join(resolved.dir, "latest.yml");
  const releaseDate = new Date().toISOString();
  const latestYml = buildLatestYmlContent({
    installerPath: installer.fullPath,
    installerUrl: releasePlan.latestInstallerRelativeUrl,
    version,
    releaseDate
  });

  manifest.content.sha512 = latestYml.meta.sha512;
  manifest.content.size = latestYml.meta.size;
  manifest.content.blockMapUrl = fs.existsSync(blockMapPath) ? releasePlan.blockMapUrl : "";
  manifest.content.blockMapSize = fs.existsSync(blockMapPath) ? fs.statSync(blockMapPath).size : 0;
  const binaryDiffArtifact = buildBinaryDiffArtifact({
    rootDir: projectRoot,
    outputDir: resolved.dir,
    installerName: installer.name,
    installerPath: installer.fullPath,
    version,
    providerBaseUrl: manifest.content.providerBaseUrl,
    patchBaseUrl: releasePlan.patchBaseUrl,
    cliArgs
  });
  const mergedBinaryDiffEntries = mergeBinaryDiffPatchEntries(
    Array.isArray(manifest.content.binaryDiffPatches) ? manifest.content.binaryDiffPatches : [],
    binaryDiffArtifact?.entry ? [binaryDiffArtifact.entry] : []
  );
  if (mergedBinaryDiffEntries.length) {
    manifest.content.binaryDiffPreferred = true;
    manifest.content.binaryDiffPatches = mergedBinaryDiffEntries;
  }
  const binaryDiffArtifacts = buildBinaryDiffArtifactsFromEntries(resolved.dir, mergedBinaryDiffEntries);

  fs.writeFileSync(manifest.updateJsonPath, `${JSON.stringify(manifest.content, null, 2)}\n`, "utf8");
  fs.writeFileSync(latestYmlPath, latestYml.text, "utf8");
  const updateRecordSyncRes = syncUpdateRecordArtifacts({
    version,
    publishedAt: manifest.content.publishedAt,
    notes: manifest.content.notes
  });
  const releasePublishPlan = emitReleasePublishBundle({
    outputDir: resolved.dir,
    installerName: installer.name,
    installerPath: installer.fullPath,
    blockMapName: fs.existsSync(blockMapPath) ? blockMapName : "",
    blockMapPath: fs.existsSync(blockMapPath) ? blockMapPath : "",
    updateJsonPath: manifest.updateJsonPath,
    latestYmlPath,
    updateManifest: manifest,
    releasePlan,
    binaryDiffArtifacts
  });
  const buildRecordRes = await syncBuildRecordArtifacts({
    outputDir: resolved.dir,
    releasePlan,
    installer,
    blockMapPath: fs.existsSync(blockMapPath) ? blockMapPath : "",
    updateJsonPath: manifest.updateJsonPath,
    latestYmlPath,
    binaryDiffArtifacts,
    baseInfo: binaryDiffArtifact?.baseInfo || null,
    version,
    manifest
  });
  console.log(`update.json generated: ${manifest.updateJsonPath}`);
  console.log(`latest.yml generated: ${latestYmlPath}`);
  if (binaryDiffArtifact?.patchFilePath) {
    console.log(`binary diff patch generated: ${binaryDiffArtifact.patchFilePath}`);
  }
  console.log(`update records synced: ${updateRecordSyncRes.updateRecordPath}`);
  console.log(`help changelog data synced: ${updateRecordSyncRes.helpLogDataPath}`);
  console.log(`build record saved: ${buildRecordRes.rootPath}`);
  console.log(`release build record saved: ${buildRecordRes.releasePath}`);
  if (buildRecordRes?.syncRes?.ok) {
    console.log(`build record cloud synced: ${buildRecordRes.syncRes.url}`);
  } else {
    console.warn(`build record cloud sync failed: ${String(buildRecordRes?.syncRes?.message || "unknown error")}`);
  }
  console.log(`releaseId: ${releasePublishPlan.releaseId}`);
  console.log(`manifestUrl: ${releasePublishPlan.manifestUrl}`);
  console.log(`release publish bundle generated: ${releasePublishPlan.rootDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
