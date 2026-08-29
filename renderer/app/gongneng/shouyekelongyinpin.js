import { getCloneVoices, getLlmProviderSecrets, setCloneVoices } from "../store.js";
import { buildCloudMethodUrl, isSuperAdminIdentity } from "./shenfenquanxian.js";

export const HOME_CLONE_VOICE_CHANGED_EVENT = "ipfactory:cloneVoicesChanged";
export const MIN_HOME_CLONE_SECONDS = 6;

function readAuth() {
  try {
    const raw = localStorage.getItem("auth.user");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && parsed.userId ? parsed : null;
  } catch {
    return null;
  }
}

function canReadProviderSecretRecord(record, ownerAccount, ownerUserId, authIdentity) {
  const recordAccount = String(record?.ownerAccount || "").trim();
  const recordUserId = String(record?.ownerUserId || "").trim();
  if (!recordAccount && !recordUserId) return true;
  if (recordAccount === ownerAccount && (!recordUserId || recordUserId === ownerUserId)) return true;
  if (isSuperAdminIdentity(authIdentity)) return true;
  return false;
}

function toFileUrl(p) {
  const raw = String(p || "").trim();
  if (!raw) return "";
  if (/^[a-zA-Z]:\\/.test(raw) || raw.startsWith("\\\\")) {
    return encodeURI(`file:///${raw.replace(/\\/g, "/")}`).replace(/#/g, "%23");
  }
  try {
    return new URL(raw, window.location.href).toString();
  } catch {
    return raw;
  }
}

export function hasReadableProviderSecret(providerId) {
  const auth = readAuth();
  const ownerAccount = String(auth?.account || "").trim();
  const ownerUserId = String(auth?.userId || "").trim();
  const authIdentity = String(auth?.identity || "").trim();
  const raw = getLlmProviderSecrets()?.[String(providerId || "").trim()];
  const list = Array.isArray(raw) ? raw : raw && typeof raw === "object" ? [raw] : [];
  return !!ownerAccount && list.some((item) => canReadProviderSecretRecord(item, ownerAccount, ownerUserId, authIdentity));
}

export async function resolveCloudApiKeyByProvider(providerId) {
  const auth = readAuth();
  const ownerAccount = String(auth?.account || "").trim();
  const ownerUserId = String(auth?.userId || "").trim();
  const authIdentity = String(auth?.identity || "").trim();
  if (!ownerAccount) return "";
  const raw = getLlmProviderSecrets()?.[String(providerId || "").trim()];
  const list = Array.isArray(raw) ? raw : raw && typeof raw === "object" ? [raw] : [];
  const record = list.find((item) => canReadProviderSecretRecord(item, ownerAccount, ownerUserId, authIdentity)) || null;
  if (!record) return "";
  const dec = await window.api?.auth?.safeDecrypt?.({ data: String(record?.enc || "") });
  if (!dec?.ok || !dec?.text) return "";
  try {
    const parsed = JSON.parse(String(dec.text || "{}"));
    if (!canReadProviderSecretRecord(parsed, ownerAccount, ownerUserId, authIdentity)) return "";
    return String(parsed?.apiKey || "").trim();
  } catch {
    return "";
  }
}

function sanitizeCloneVoiceItem(item) {
  const src = item && typeof item === "object" ? item : {};
  const id = String(src?.id || "").trim();
  if (!id) return null;
  const source = String(src?.source || (id.startsWith("clone_") ? "local" : "")).trim() || "local";
  const previewWavPath = String(src?.previewWavPath || "").trim();
  const promptWavPath = String(src?.promptWavPath || "").trim();
  if (source === "cloud") {
    return {
      ...src,
      id,
      source: "cloud",
      name: String(src?.name || id).trim(),
      providerId: String(src?.providerId || "").trim(),
      providerLabel: String(src?.providerLabel || "").trim(),
      targetModel: String(src?.targetModel || "").trim(),
      previewWavPath,
      publicAudioUrl: String(src?.publicAudioUrl || "").trim(),
      createdAt: Number(src?.createdAt || Date.now()) || Date.now()
    };
  }
  if (!id.startsWith("clone_")) return null;
  if (!promptWavPath && !previewWavPath) return null;
  return {
    ...src,
    id,
    source: "local",
    name: String(src?.name || id).trim(),
    promptWavPath,
    previewWavPath,
    createdAt: Number(src?.createdAt || Date.now()) || Date.now()
  };
}

export function sanitizeCloneVoiceList(list) {
  const arr = Array.isArray(list) ? list : [];
  const seen = new Set();
  return arr
    .map((item) => sanitizeCloneVoiceItem(item))
    .filter(Boolean)
    .filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
}

function dispatchCloneVoiceChanged() {
  try {
    window.dispatchEvent(new CustomEvent(HOME_CLONE_VOICE_CHANGED_EVENT));
  } catch {}
}

function isMissingCloneVoiceStoreHandler(error) {
  const text = String(error?.message || error || "").trim();
  return text.includes("No handler registered for 'cloneVoiceStore:list'") || text.includes("No handler registered for 'cloneVoiceStore:write'");
}

async function safeCloneVoiceStoreList() {
  try {
    return await window.api?.cloneVoiceStore?.list?.();
  } catch (e) {
    if (isMissingCloneVoiceStoreHandler(e)) {
      return { ok: false, missingHandler: true, items: sanitizeCloneVoiceList(getCloneVoices()) };
    }
    throw e;
  }
}

async function safeCloneVoiceStoreWrite(items) {
  const cleanItems = sanitizeCloneVoiceList(items);
  try {
    return await window.api?.cloneVoiceStore?.write?.({ items: cleanItems });
  } catch (e) {
    if (isMissingCloneVoiceStoreHandler(e)) {
      return { ok: false, missingHandler: true, items: cleanItems };
    }
    throw e;
  }
}

export async function syncCloneVoicesFromJsonToLocal() {
  const res = await safeCloneVoiceStoreList();
  let items = sanitizeCloneVoiceList(res?.items);
  if (!items.length) {
    const legacy = sanitizeCloneVoiceList(getCloneVoices());
    if (legacy.length) {
      await safeCloneVoiceStoreWrite(legacy);
      items = legacy;
    }
  }
  setCloneVoices(items);
  dispatchCloneVoiceChanged();
  return items;
}

export async function saveCloneVoicesToJsonAndLocal(list) {
  const items = sanitizeCloneVoiceList(list);
  const res = await safeCloneVoiceStoreWrite(items);
  if (res?.ok === false && res?.missingHandler !== true) throw new Error(String(res?.message || "克隆音色保存失败"));
  setCloneVoices(items);
  dispatchCloneVoiceChanged();
  return items;
}

export async function upsertCloneVoiceToStorage(voice) {
  const current = await syncCloneVoicesFromJsonToLocal();
  const nextVoice = sanitizeCloneVoiceItem(voice);
  if (!nextVoice?.id) throw new Error("无效的克隆音色数据");
  return await saveCloneVoicesToJsonAndLocal([nextVoice, ...current.filter((item) => item.id !== nextVoice.id)]);
}

export async function removeCloneVoiceFromStorage(voiceId) {
  const id = String(voiceId || "").trim();
  const current = await syncCloneVoicesFromJsonToLocal();
  return await saveCloneVoicesToJsonAndLocal(current.filter((item) => item.id !== id));
}

export function buildCloneModelCatalog(homeMediaBundleCatalog = []) {
  const configured = hasReadableProviderSecret("aliyun-bailian");
  const cloudItems = [
    {
      id: "cloud:tts:aliyun-bailian:cosyvoice-v3.5-plus",
      label: "CosyVoice v3.5 Plus",
      source: "cloud",
      sourceLabel: "阿里云百炼",
      providerId: "aliyun-bailian",
      providerLabel: "阿里云百炼",
      modelId: "cosyvoice-v3.5-plus",
      configured,
      modelChoice: {
        source: "cloud",
        sceneKey: "tts",
        type: "TTS",
        providerId: "aliyun-bailian",
        providerLabel: "阿里云百炼",
        modelId: "cosyvoice-v3.5-plus",
        endpoint: "https://dashscope.aliyuncs.com/api/v1/services/audio/tts/SpeechSynthesizer",
        cloneEndpoint: "https://dashscope.aliyuncs.com/api/v1/services/audio/tts/customization",
        label: "阿里云 CosyVoice v3.5 Plus",
        configured
      }
    },
    {
      id: "cloud:tts:aliyun-bailian:cosyvoice-v3.5-flash",
      label: "CosyVoice v3.5 Flash",
      source: "cloud",
      sourceLabel: "阿里云百炼",
      providerId: "aliyun-bailian",
      providerLabel: "阿里云百炼",
      modelId: "cosyvoice-v3.5-flash",
      configured,
      modelChoice: {
        source: "cloud",
        sceneKey: "tts",
        type: "TTS",
        providerId: "aliyun-bailian",
        providerLabel: "阿里云百炼",
        modelId: "cosyvoice-v3.5-flash",
        endpoint: "https://dashscope.aliyuncs.com/api/v1/services/audio/tts/SpeechSynthesizer",
        cloneEndpoint: "https://dashscope.aliyuncs.com/api/v1/services/audio/tts/customization",
        label: "阿里云 CosyVoice v3.5 Flash",
        configured
      }
    }
  ];
  const localItems = (Array.isArray(homeMediaBundleCatalog) ? homeMediaBundleCatalog : [])
    .filter((item) => String(item?.type || "").trim() === "TTS")
    .map((item) => {
      const bundleDir = String(item?.bundleDir || item?.path || "").trim();
      const configPath = String(item?.configPath || "").trim();
      const label = String(item?.name || item?.title || bundleDir || "当前本地默认 TTS").trim();
      return {
        id: `local:${bundleDir || configPath || label}`,
        label,
        source: "local",
        sourceLabel: "本地模型包",
        providerId: "",
        modelChoice: {
          source: "local",
          sceneKey: "tts",
          type: "TTS",
          bundleDir,
          configPath,
          label
        }
      };
    });
  return [
    ...cloudItems,
    {
      id: "local:auto:tts",
      label: "当前本地默认 TTS",
      source: "local",
      sourceLabel: "系统默认",
      providerId: "",
      modelChoice: {
        source: "local",
        sceneKey: "tts",
        type: "TTS",
        useAutoPick: true,
        label: "当前本地默认 TTS"
      }
    },
    ...localItems
  ];
}

export function getRecommendedCloneMinSeconds(selection, fallback = MIN_HOME_CLONE_SECONDS) {
  if (isAliyunCosyVoiceSelection(selection)) return 10;
  return Number(fallback || MIN_HOME_CLONE_SECONDS) || MIN_HOME_CLONE_SECONDS;
}

export function resolveSelectedCloneModel(selectedId, homeMediaBundleCatalog = []) {
  const catalog = buildCloneModelCatalog(homeMediaBundleCatalog);
  return catalog.find((item) => item.id === String(selectedId || "").trim()) || catalog[0] || null;
}

export function isAliyunCosyVoiceSelection(selection) {
  return String(selection?.source || "").trim() === "cloud" &&
    String(selection?.providerId || "").trim() === "aliyun-bailian" &&
    /^cosyvoice-v3\.5-(plus|flash)$/i.test(String(selection?.modelId || selection?.modelChoice?.modelId || "").trim());
}

export async function resolveCloneModelSelection(selectedId, homeMediaBundleCatalog = []) {
  const selected = resolveSelectedCloneModel(selectedId, homeMediaBundleCatalog);
  if (!selected) return null;
  if (!isAliyunCosyVoiceSelection(selected)) return selected;
  const apiKey = await resolveCloudApiKeyByProvider("aliyun-bailian");
  if (!apiKey) return null;
  return {
    ...selected,
    modelChoice: {
      ...(selected.modelChoice || {}),
      apiKey
    }
  };
}

function measureAudioDurationByUrl(url) {
  return new Promise((resolve, reject) => {
    const audio = document.createElement("audio");
    let settled = false;
    const done = (cb, value) => {
      if (settled) return;
      settled = true;
      audio.onloadedmetadata = null;
      audio.onerror = null;
      cb(value);
    };
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      const duration = Number(audio.duration || 0);
      if (!Number.isFinite(duration) || duration <= 0) {
        done(reject, new Error("无法读取音频时长"));
        return;
      }
      done(resolve, duration);
    };
    audio.onerror = () => done(reject, new Error("音频时长解析失败"));
    audio.src = url;
  });
}

function measureAudioDurationFromBuffer(bufferLike) {
  return new Promise((resolve, reject) => {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) {
      reject(new Error("当前环境不支持音频解码"));
      return;
    }
    const ctx = new AudioCtx();
    const clean = () => {
      try {
        ctx.close?.();
      } catch {}
    };
    const source = bufferLike instanceof ArrayBuffer ? bufferLike.slice(0) : bufferLike;
    ctx.decodeAudioData(
      source,
      (audioBuffer) => {
        const duration = Number(audioBuffer?.duration || 0);
        clean();
        if (!Number.isFinite(duration) || duration <= 0) {
          reject(new Error("无法解析录音时长"));
          return;
        }
        resolve(duration);
      },
      (error) => {
        clean();
        reject(error || new Error("音频解码失败"));
      }
    );
  });
}

async function probeAudioDurationViaMain(filePath) {
  const fp = String(filePath || "").trim();
  if (!fp) return 0;
  try {
    const res = await window.api?.audio?.probeDuration?.({ filePath: fp });
    const duration = Number(res?.duration || 0);
    if (!res?.ok) return 0;
    return Number.isFinite(duration) && duration > 0 ? duration : 0;
  } catch {
    return 0;
  }
}

export async function readReferenceAudioDuration({ blob = null, filePath = "", fallbackDuration = 0 } = {}) {
  const fallback = Number(fallbackDuration || 0) || 0;
  if (blob) {
    try {
      const ab = await blob.arrayBuffer();
      const decodedDuration = await measureAudioDurationFromBuffer(ab);
      if (decodedDuration > 0) return fallback > 0 ? Math.max(decodedDuration, fallback) : decodedDuration;
    } catch {}
    const objectUrl = URL.createObjectURL(blob);
    try {
      const urlDuration = await measureAudioDurationByUrl(objectUrl);
      return fallback > 0 ? Math.max(urlDuration, fallback) : urlDuration;
    } catch {
      if (fallback > 0) return fallback;
      throw new Error("音频时长解析失败");
    } finally {
      try {
        URL.revokeObjectURL(objectUrl);
      } catch {}
    }
  }
  const fp = String(filePath || "").trim();
  if (!fp) return fallback;
  try {
    return await measureAudioDurationByUrl(toFileUrl(fp));
  } catch {
    const probed = await probeAudioDurationViaMain(fp);
    if (probed > 0) return probed;
    return fallback;
  }
}

export async function validateCloneReferenceDuration({ blob = null, filePath = "", minSeconds = MIN_HOME_CLONE_SECONDS, fallbackDuration = 0 } = {}) {
  const duration = await readReferenceAudioDuration({ blob, filePath, fallbackDuration });
  const min = Number(minSeconds || MIN_HOME_CLONE_SECONDS) || MIN_HOME_CLONE_SECONDS;
  const eps = 0.05;
  if (!Number.isFinite(duration) || duration + eps < min) {
    return {
      ok: false,
      duration,
      message: `最少录制时间要达到${min}秒`
    };
  }
  return { ok: true, duration, message: "" };
}

export async function uploadCloneReferenceAudio({ recordedBlob = null, filePath = "", setStatus } = {}) {
  const auth = readAuth();
  if (!auth?.userId || !auth?.account) {
    return { ok: false, message: "请先登录后再上传参考音频。" };
  }
  let source = "";
  let mimeType = "";
  let fileName = "";
  let audioBytes = null;
  const normalizedFilePath = String(filePath || "").trim();
  if (!normalizedFilePath && !recordedBlob) {
    return { ok: false, message: "请先录制或选择参考音频。" };
  }
  if (typeof setStatus === "function") setStatus("上传中...", "");
  if (recordedBlob) {
    const ab = await recordedBlob.arrayBuffer();
    audioBytes = Array.from(new Uint8Array(ab));
    mimeType = String(recordedBlob.type || "audio/webm").trim();
    fileName = `voice-clone-reference-${Date.now()}`;
    source = "mic";
  } else {
    fileName = normalizedFilePath.split(/[\\/]/).pop() || "";
    source = "file";
  }
  const domainRes = await window.api?.domain?.read?.();
  const baseDomain = String(domainRes?.domain || "").trim().replace(/\/+$/, "");
  const url = buildCloudMethodUrl(`${baseDomain}/qd-yinpinshangchuan`, "uploadReferenceAudio");
  if (!url) {
    if (typeof setStatus === "function") setStatus("上传失败", "未配置音频上传云对象URL。");
    return { ok: false, message: "未配置音频上传云对象URL。" };
  }
  const res = await window.api?.cloudStorage?.uploadReferenceAudio?.({
    url,
    token: "",
    body: {
      account: String(auth.account || "").trim(),
      userId: String(auth.userId || "").trim(),
      identity: String(auth.identity || "").trim(),
      source,
      filePath: normalizedFilePath,
      fileName,
      mimeType,
      audioBytes
    }
  });
  if (!res?.ok || !res?.url) {
    const message = String(res?.errMsg || res?.message || "音频上传失败");
    if (typeof setStatus === "function") setStatus("上传失败", message);
    return { ok: false, message };
  }
  if (typeof setStatus === "function") setStatus("已上传", String(res.url || ""));
  return { ok: true, url: String(res.url || "").trim() };
}
