const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const http = require("http");
const https = require("https");

const PROJECT_ROOT = path.resolve(__dirname, "..");
// 开源版本不绑定私有后端。可通过环境变量或 yuming.json 配置自己的服务地址。
const DEFAULT_CLOUD_DOMAIN = String(process.env.BUKONG_CLOUD_DOMAIN || "").trim().replace(/\/+$/, "");
const YUMING_JSON_PATH = path.join(PROJECT_ROOT, "yuming.json");
const BUILD_RECORD_FILE_NAME = "dabaojilu.json";
const BUILD_RECORD_CLOUD_OBJECT_NAME = "qd-dabaojilu";

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeCloudUrl(raw) {
  const rawText = normalizeText(raw);
  if (!rawText) return "";
  let s = rawText;
  if (!/^https?:\/\//i.test(s)) s = `https://${s.replace(/^\/+/, "")}`;
  try {
    const u = new URL(s);
    if (u.protocol === "http:" && /bspapp\.com$/i.test(u.hostname)) u.protocol = "https:";
    return u.toString();
  } catch {
    return "";
  }
}

function readCloudDomainFromFile() {
  try {
    if (!fs.existsSync(YUMING_JSON_PATH)) return DEFAULT_CLOUD_DOMAIN;
    const raw = fs.readFileSync(YUMING_JSON_PATH, "utf8");
    const parsed = JSON.parse(raw || "{}");
    return normalizeCloudUrl(parsed?.domain) || DEFAULT_CLOUD_DOMAIN;
  } catch {
    return DEFAULT_CLOUD_DOMAIN;
  }
}

function buildCloudObjectUrl(domain, objectName, methodName) {
  const base = normalizeCloudUrl(domain) || DEFAULT_CLOUD_DOMAIN;
  const obj = normalizeText(objectName);
  const method = normalizeText(methodName);
  return `${base.replace(/\/+$/, "")}/${obj}/${method}`;
}

function requestJson(url, body) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const mod = target.protocol === "http:" ? http : https;
    const payload = Buffer.from(JSON.stringify(body || {}), "utf8");
    const req = mod.request(
      target,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": String(payload.length)
        },
        timeout: 30000
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const raw = Buffer.concat(chunks).toString("utf8");
          let data = null;
          try {
            data = raw ? JSON.parse(raw) : null;
          } catch {}
          resolve({
            statusCode: Number(res.statusCode || 0) || 0,
            headers: res.headers || {},
            raw,
            data
          });
        });
      }
    );
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

function hashFileSha512Base64(filePath) {
  return crypto.createHash("sha512").update(fs.readFileSync(filePath)).digest("base64");
}

function safeRelative(fromPath, targetPath) {
  try {
    return path.relative(fromPath, targetPath).replace(/\\/g, "/");
  } catch {
    return "";
  }
}

function describeFileRole(role) {
  const map = {
    "root-installer": "根目录安装包，便于本地核对或直接分发",
    "root-blockmap": "根目录安装包 blockmap 文件",
    "root-manifest": "根目录更新清单文件",
    "root-latest-yml": "根目录 latest.yml 文件",
    "root-patch": "根目录差分包文件",
    "release-installer": "发布目录安装包，客户端完整安装时使用",
    "release-blockmap": "发布目录 blockmap 文件",
    "release-manifest": "发布目录 manifest 清单，供后台和云数据留档",
    "release-latest-yml": "发布目录 latest.yml 文件",
    "release-patch": "发布目录差分包，客户端差分更新时使用",
    "release-metadata": "发布目录元数据文件，记录本次发布的机器可读信息",
    "release-readme": "发布目录上传说明文件",
    "release-build-record": "发布目录打包记录文件，用于核对所有发布产物",
    "base-installer": "差分更新基线安装包，客户端差分升级前需要先下载的旧版本包"
  };
  return map[role] || "发布产物记录文件";
}

function buildFileRecord({
  filePath,
  role,
  outputDir,
  releaseRootDir,
  cloudPath = "",
  publicUrl = "",
  version = "",
  relatedVersion = "",
  releaseId = ""
}) {
  if (!filePath || !fs.existsSync(filePath)) return null;
  const stat = fs.statSync(filePath);
  return {
    fileName: path.basename(filePath),
    fileExt: path.extname(filePath).replace(/^\./, ""),
    fileRole: normalizeText(role),
    fileFunction: describeFileRole(role),
    sizeBytes: stat.size,
    sha512: hashFileSha512Base64(filePath),
    localPath: filePath,
    outputRelativePath: outputDir ? safeRelative(outputDir, filePath) : "",
    releaseRelativePath: releaseRootDir && filePath.startsWith(releaseRootDir) ? safeRelative(releaseRootDir, filePath) : "",
    cloudPath: normalizeText(cloudPath),
    publicUrl: normalizeCloudUrl(publicUrl),
    version: normalizeText(version),
    relatedVersion: normalizeText(relatedVersion),
    releaseId: normalizeText(releaseId),
    updatedAt: stat.mtimeMs || Date.now()
  };
}

function buildPatchCloudPath(releasePlan, patchName) {
  const relativeRootPath = normalizeText(releasePlan?.relativeRootPath);
  return [relativeRootPath, "patch", normalizeText(patchName)].filter(Boolean).join("/");
}

function collectBuildRecordFiles({
  outputDir,
  releasePlan,
  installer,
  blockMapPath,
  updateJsonPath,
  latestYmlPath,
  binaryDiffArtifacts = [],
  baseInfo = null,
  version = ""
}) {
  const releaseRootDir = normalizeText(releasePlan?.rootDir);
  const records = [];
  const pushRecord = (item) => {
    if (item) records.push(item);
  };
  pushRecord(
    buildFileRecord({
      filePath: installer?.fullPath,
      role: "root-installer",
      outputDir,
      releaseRootDir,
      version,
      releaseId: releasePlan?.releaseId
    })
  );
  pushRecord(
    buildFileRecord({
      filePath: updateJsonPath,
      role: "root-manifest",
      outputDir,
      releaseRootDir,
      version,
      releaseId: releasePlan?.releaseId
    })
  );
  pushRecord(
    buildFileRecord({
      filePath: latestYmlPath,
      role: "root-latest-yml",
      outputDir,
      releaseRootDir,
      version,
      releaseId: releasePlan?.releaseId
    })
  );
  if (blockMapPath && fs.existsSync(blockMapPath)) {
    pushRecord(
      buildFileRecord({
        filePath: blockMapPath,
        role: "root-blockmap",
        outputDir,
        releaseRootDir,
        version,
        releaseId: releasePlan?.releaseId
      })
    );
  }
  pushRecord(
    buildFileRecord({
      filePath: path.join(releaseRootDir, "manifest", "update.json"),
      role: "release-manifest",
      outputDir,
      releaseRootDir,
      cloudPath: releasePlan?.manifestRelativePath,
      publicUrl: releasePlan?.manifestUrl,
      version,
      releaseId: releasePlan?.releaseId
    })
  );
  pushRecord(
    buildFileRecord({
      filePath: path.join(releaseRootDir, "latest", "latest.yml"),
      role: "release-latest-yml",
      outputDir,
      releaseRootDir,
      cloudPath: releasePlan?.latestRelativePath,
      publicUrl: releasePlan?.latestYmlUrl,
      version,
      releaseId: releasePlan?.releaseId
    })
  );
  pushRecord(
    buildFileRecord({
      filePath: path.join(releaseRootDir, "exe", installer?.name || ""),
      role: "release-installer",
      outputDir,
      releaseRootDir,
      cloudPath: releasePlan?.downloadRelativePath,
      publicUrl: releasePlan?.downloadUrl,
      version,
      releaseId: releasePlan?.releaseId
    })
  );
  if (blockMapPath && fs.existsSync(blockMapPath)) {
    pushRecord(
      buildFileRecord({
        filePath: path.join(releaseRootDir, "blockmap", path.basename(blockMapPath)),
        role: "release-blockmap",
        outputDir,
        releaseRootDir,
        cloudPath: releasePlan?.blockMapRelativePath,
        publicUrl: releasePlan?.blockMapUrl,
        version,
        releaseId: releasePlan?.releaseId
      })
    );
  }
  binaryDiffArtifacts.forEach((item) => {
    pushRecord(
      buildFileRecord({
        filePath: item?.patchFilePath,
        role: "root-patch",
        outputDir,
        releaseRootDir,
        publicUrl: item?.entry?.patchUrl,
        version,
        relatedVersion: item?.entry?.baseVersion,
        releaseId: releasePlan?.releaseId
      })
    );
    pushRecord(
      buildFileRecord({
        filePath: path.join(releaseRootDir, "patch", item.patchFileName),
        role: "release-patch",
        outputDir,
        releaseRootDir,
        cloudPath: buildPatchCloudPath(releasePlan, item.patchFileName),
        publicUrl: item?.entry?.patchUrl,
        version,
        relatedVersion: item?.entry?.baseVersion,
        releaseId: releasePlan?.releaseId
      })
    );
  });
  pushRecord(
    buildFileRecord({
      filePath: path.join(releaseRootDir, "fabuqingdan.json"),
      role: "release-metadata",
      outputDir,
      releaseRootDir,
      version,
      releaseId: releasePlan?.releaseId
    })
  );
  pushRecord(
    buildFileRecord({
      filePath: path.join(releaseRootDir, "shangchuanshuoming.txt"),
      role: "release-readme",
      outputDir,
      releaseRootDir,
      version,
      releaseId: releasePlan?.releaseId
    })
  );
  if (baseInfo?.installer?.fullPath && fs.existsSync(baseInfo.installer.fullPath)) {
    pushRecord(
      buildFileRecord({
        filePath: baseInfo.installer.fullPath,
        role: "base-installer",
        outputDir,
        releaseRootDir,
        publicUrl: baseInfo?.manifest?.downloadUrl || "",
        version,
        relatedVersion: baseInfo?.version || "",
        releaseId: releasePlan?.releaseId
      })
    );
  }
  return records.filter(Boolean);
}

function buildBuildRecord(payload = {}) {
  const files = Array.isArray(payload.files) ? payload.files.filter(Boolean) : [];
  const binaryDiffPatches = Array.isArray(payload.binaryDiffPatches) ? payload.binaryDiffPatches : [];
  const fileCount = files.length;
  const totalSizeBytes = files.reduce((sum, item) => sum + (Number(item?.sizeBytes || 0) || 0), 0);
  return {
    scene: normalizeText(payload.scene) || "desktop",
    version: normalizeText(payload.version),
    releaseId: normalizeText(payload.releaseId),
    releaseRootPath: normalizeText(payload.releaseRootPath),
    releaseRootUrl: normalizeCloudUrl(payload.releaseRootUrl),
    manifestUrl: normalizeCloudUrl(payload.manifestUrl),
    manifestCloudPath: normalizeText(payload.manifestCloudPath),
    downloadUrl: normalizeCloudUrl(payload.downloadUrl),
    installerCloudPath: normalizeText(payload.installerCloudPath),
    installerName: normalizeText(payload.installerName),
    providerBaseUrl: normalizeCloudUrl(payload.providerBaseUrl),
    latestYmlUrl: normalizeCloudUrl(payload.latestYmlUrl),
    latestYmlCloudPath: normalizeText(payload.latestYmlCloudPath),
    blockMapUrl: normalizeCloudUrl(payload.blockMapUrl),
    blockMapCloudPath: normalizeText(payload.blockMapCloudPath),
    blockMapName: normalizeText(payload.blockMapName),
    notes: normalizeText(payload.notes),
    publishedAt: normalizeText(payload.publishedAt),
    artifactName: normalizeText(payload.artifactName || payload.installerName),
    binaryDiffPreferred: payload.binaryDiffPreferred === true,
    baseVersion: normalizeText(payload.baseVersion),
    baseReleaseId: normalizeText(payload.baseReleaseId),
    outputDir: normalizeText(payload.outputDir),
    fileCount,
    totalSizeBytes,
    files,
    binaryDiffPatches,
    manifest: payload.manifest && typeof payload.manifest === "object" ? payload.manifest : {},
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}

function writeBuildRecordFiles(record = {}, { outputDir, releaseRootDir } = {}) {
  const jsonText = `${JSON.stringify(record, null, 2)}\n`;
  const rootPath = path.join(outputDir, BUILD_RECORD_FILE_NAME);
  ensureDir(path.dirname(rootPath));
  fs.writeFileSync(rootPath, jsonText, "utf8");
  const releasePath = path.join(releaseRootDir, BUILD_RECORD_FILE_NAME);
  ensureDir(path.dirname(releasePath));
  fs.writeFileSync(releasePath, jsonText, "utf8");
  return { rootPath, releasePath };
}

async function syncBuildRecordToCloud(record = {}, options = {}) {
  const domain = normalizeCloudUrl(options.cloudDomain) || readCloudDomainFromFile();
  const url = buildCloudObjectUrl(domain, BUILD_RECORD_CLOUD_OBJECT_NAME, "upsertBuildRecord");
  const res = await requestJson(url, record);
  if (res.statusCode < 200 || res.statusCode >= 300) {
    return { ok: false, domain, url, statusCode: res.statusCode, message: `云端请求失败：http ${res.statusCode}`, raw: res.raw };
  }
  const data = res.data && typeof res.data === "object" ? res.data : {};
  if (data.errCode || data.ok === false) {
    return { ok: false, domain, url, statusCode: res.statusCode, message: String(data.errMsg || data.message || "打包记录写入云端失败"), raw: data };
  }
  return { ok: true, domain, url, statusCode: res.statusCode, data };
}

async function syncBuildRecordArtifacts(payload = {}, options = {}) {
  const files = collectBuildRecordFiles(payload);
  const record = buildBuildRecord({
    scene: payload.releasePlan?.releaseScene,
    version: payload.version,
    releaseId: payload.releasePlan?.releaseId,
    releaseRootPath: payload.releasePlan?.relativeRootPath,
    releaseRootUrl: payload.releasePlan?.releaseRootUrl,
    manifestUrl: payload.releasePlan?.manifestUrl,
    manifestCloudPath: payload.releasePlan?.manifestRelativePath,
    downloadUrl: payload.releasePlan?.downloadUrl,
    installerCloudPath: payload.releasePlan?.downloadRelativePath,
    installerName: payload.installer?.name,
    providerBaseUrl: payload.releasePlan?.providerBaseUrl,
    latestYmlUrl: payload.releasePlan?.latestYmlUrl,
    latestYmlCloudPath: payload.releasePlan?.latestRelativePath,
    blockMapUrl: payload.releasePlan?.blockMapUrl,
    blockMapCloudPath: payload.releasePlan?.blockMapRelativePath,
    blockMapName: payload.blockMapPath ? path.basename(payload.blockMapPath) : "",
    notes: payload.manifest?.content?.notes,
    publishedAt: payload.manifest?.content?.publishedAt,
    artifactName: payload.manifest?.content?.artifactName,
    binaryDiffPreferred: payload.manifest?.content?.binaryDiffPreferred === true,
    baseVersion: payload.baseInfo?.version || "",
    baseReleaseId: normalizeText(payload.baseInfo?.manifest?.releaseId || ""),
    outputDir: payload.outputDir,
    files,
    binaryDiffPatches: Array.isArray(payload.manifest?.content?.binaryDiffPatches) ? payload.manifest.content.binaryDiffPatches : [],
    manifest: payload.manifest?.content || {}
  });
  const paths = writeBuildRecordFiles(record, {
    outputDir: payload.outputDir,
    releaseRootDir: payload.releasePlan?.rootDir
  });
  const syncRes = await syncBuildRecordToCloud(record, options).catch((e) => ({
    ok: false,
    message: String(e?.message || e)
  }));
  return {
    record,
    rootPath: paths.rootPath,
    releasePath: paths.releasePath,
    syncRes
  };
}

module.exports = {
  BUILD_RECORD_FILE_NAME,
  collectBuildRecordFiles,
  buildBuildRecord,
  writeBuildRecordFiles,
  syncBuildRecordToCloud,
  syncBuildRecordArtifacts
};
