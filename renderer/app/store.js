const KEY_THEME = "ipfactory.theme";
const KEY_OUTPUT_DIR = "ipfactory.outputDir";
const KEY_MODELS = "ipfactory.models";
const KEY_DEFAULT_MODEL_ID = "ipfactory.models.defaultId";
const KEY_CLOUD_LLMS = "ipfactory.cloudLlms";
const KEY_PUBLIC_CLOUD_LLM = "ipfactory.cloudLlms.public";
const KEY_ACTIVE_CLOUD_LLM_ID = "ipfactory.cloudLlms.activeId";
const KEY_HOME_LLM_SELECTIONS = "ipfactory.home.llmSelections";
const KEY_HOME_MEDIA_SELECTIONS = "ipfactory.home.mediaSelections";
const KEY_HOME_RUN_MODE = "ipfactory.home.runMode";
const KEY_LLM_PROVIDER_SECRETS = "ipfactory.llm.providerSecrets";
const KEY_LLM_USAGE_LOGS = "ipfactory.llm.usageLogs";
const KEY_CLONE_VOICES = "ipfactory.voices.clone";
const KEY_ACTIVE_VOICE_ID = "ipfactory.voices.activeId";
const KEY_AUDIO_HISTORY = "ipfactory.audio.history";

function readAuthStorageScope() {
  try {
    const raw = localStorage.getItem("auth.user");
    if (!raw) return "";
    const parsed = JSON.parse(raw);
    return String(parsed?.userId || parsed?.user_id || parsed?.account || "").trim();
  } catch {
    return "";
  }
}

function sanitizeStorageScope(scope) {
  return String(scope || "")
    .trim()
    .replace(/[^0-9a-zA-Z_.-]/g, "_")
    .slice(0, 80);
}

function buildScopedStorageKey(baseKey) {
  const scope = sanitizeStorageScope(readAuthStorageScope());
  return scope ? `${baseKey}::${scope}` : baseKey;
}

function getScopedStorageMigrationKey(baseKey) {
  return `${baseKey}::__scopedMigrated`;
}

function ensureScopedStorageKey(baseKey) {
  const scopedKey = buildScopedStorageKey(baseKey);
  if (scopedKey === baseKey) return scopedKey;
  try {
    const scopedValue = localStorage.getItem(scopedKey);
    if (scopedValue !== null) return scopedKey;
    const migrationKey = getScopedStorageMigrationKey(baseKey);
    const migratedTarget = String(localStorage.getItem(migrationKey) || "").trim();
    if (migratedTarget && migratedTarget !== scopedKey) return scopedKey;
    const legacyValue = localStorage.getItem(baseKey);
    if (legacyValue !== null) {
      localStorage.setItem(scopedKey, legacyValue);
      localStorage.setItem(migrationKey, scopedKey);
    }
  } catch {}
  return scopedKey;
}

function getScopedStorageItem(baseKey) {
  try {
    return localStorage.getItem(ensureScopedStorageKey(baseKey));
  } catch {
    return null;
  }
}

function setScopedStorageItem(baseKey, value) {
  try {
    const scopedKey = ensureScopedStorageKey(baseKey);
    localStorage.setItem(scopedKey, value);
    if (scopedKey !== baseKey) localStorage.setItem(getScopedStorageMigrationKey(baseKey), scopedKey);
  } catch {}
}

function normalizeCloudLlmItem(item, fallback = {}) {
  const source = item && typeof item === "object" ? item : {};
  const base = fallback && typeof fallback === "object" ? fallback : {};
  const id = String(source.id || base.id || "").trim();
  if (!id) return null;
  return {
    ...base,
    ...source,
    id,
    name: String(source.name || base.name || "").trim(),
    providerId: String(source.providerId || base.providerId || "").trim(),
    providerLabel: String(source.providerLabel || base.providerLabel || "").trim(),
    model: String(source.model || base.model || "").trim(),
    endpoint: String(source.endpoint || base.endpoint || "").trim(),
    apiKey: String(source.apiKey || base.apiKey || ""),
    summary: String(source.summary || base.summary || "").trim(),
    badge: String(source.badge || base.badge || "").trim(),
    catalogModelLabel: String(source.catalogModelLabel || base.catalogModelLabel || "").trim(),
    systemPrompt: String(source.systemPrompt || base.systemPrompt || "").trim(),
    enabled: source.enabled !== false,
    isPublicShared: source.isPublicShared === true || base.isPublicShared === true,
    abilities: Array.isArray(source.abilities) ? source.abilities : Array.isArray(base.abilities) ? base.abilities : [],
    moduleKeys: Array.isArray(source.moduleKeys) ? source.moduleKeys : Array.isArray(base.moduleKeys) ? base.moduleKeys : []
  };
}

function getStoredCloudLlms() {
  try {
    const raw = localStorage.getItem(KEY_CLOUD_LLMS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => normalizeCloudLlmItem(item)).filter(Boolean).filter((item) => item.isPublicShared !== true);
  } catch {
    return [];
  }
}

function getPublicCloudLlm() {
  try {
    const raw = localStorage.getItem(KEY_PUBLIC_CLOUD_LLM);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return normalizeCloudLlmItem(parsed, { isPublicShared: true, enabled: true });
  } catch {
    return null;
  }
}

export function getTheme() {
  const v = localStorage.getItem(KEY_THEME);
  if (v === "dark" || v === "light") return v;
  return "light";
}

export function setTheme(theme) {
  localStorage.setItem(KEY_THEME, theme);
}

export function getOutputDir() {
  return localStorage.getItem(KEY_OUTPUT_DIR) || "";
}

export function setOutputDir(dir) {
  localStorage.setItem(KEY_OUTPUT_DIR, dir);
}

export function getModels() {
  try {
    const raw = localStorage.getItem(KEY_MODELS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return dedupeLocalModels(parsed);
  } catch {
    return [];
  }
}

export function setModels(models) {
  localStorage.setItem(KEY_MODELS, JSON.stringify(dedupeLocalModels(models)));
  window.dispatchEvent(new CustomEvent("ipfactory:modelsChanged"));
}

export function getDefaultModelId() {
  return localStorage.getItem(KEY_DEFAULT_MODEL_ID) || "";
}

export function setDefaultModelId(id) {
  localStorage.setItem(KEY_DEFAULT_MODEL_ID, id || "");
}

export function getCloudLlms() {
  const publicItem = getPublicCloudLlm();
  const customItems = getStoredCloudLlms();
  if (!publicItem) return customItems;
  return [publicItem, ...customItems.filter((item) => String(item?.id || "").trim() !== publicItem.id)];
}

export function setCloudLlms(list) {
  const next = (Array.isArray(list) ? list : [])
    .map((item) => normalizeCloudLlmItem(item))
    .filter(Boolean)
    .filter((item) => item.isPublicShared !== true);
  localStorage.setItem(KEY_CLOUD_LLMS, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("ipfactory:modelsChanged"));
}

export function setPublicCloudLlm(item) {
  const normalized = normalizeCloudLlmItem(item, {
    id: "public-cloud-llm",
    isPublicShared: true,
    enabled: true
  });
  if (!normalized || !normalized.providerId || !normalized.model || !normalized.endpoint) {
    localStorage.removeItem(KEY_PUBLIC_CLOUD_LLM);
  } else {
    localStorage.setItem(KEY_PUBLIC_CLOUD_LLM, JSON.stringify({ ...normalized, isPublicShared: true, enabled: true }));
  }
  window.dispatchEvent(new CustomEvent("ipfactory:modelsChanged"));
}

export function getActiveCloudLlmId() {
  return localStorage.getItem(KEY_ACTIVE_CLOUD_LLM_ID) || "";
}

export function setActiveCloudLlmId(id) {
  localStorage.setItem(KEY_ACTIVE_CLOUD_LLM_ID, id || "");
}

export function getHomeLlmSelections() {
  try {
    const raw = localStorage.getItem(KEY_HOME_LLM_SELECTIONS);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function setHomeLlmSelections(map) {
  localStorage.setItem(KEY_HOME_LLM_SELECTIONS, JSON.stringify(map && typeof map === "object" ? map : {}));
}

export function getHomeMediaSelections() {
  try {
    const raw = localStorage.getItem(KEY_HOME_MEDIA_SELECTIONS);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function setHomeMediaSelections(map) {
  localStorage.setItem(KEY_HOME_MEDIA_SELECTIONS, JSON.stringify(map && typeof map === "object" ? map : {}));
}

export function getHomeRunMode() {
  const raw = String(localStorage.getItem(KEY_HOME_RUN_MODE) || "").trim().toLowerCase();
  return raw === "cloud" || raw === "local" ? raw : "custom";
}

export function setHomeRunMode(mode) {
  const next = String(mode || "").trim().toLowerCase();
  localStorage.setItem(KEY_HOME_RUN_MODE, next === "cloud" || next === "local" ? next : "custom");
}

export function getLlmProviderSecrets() {
  try {
    const raw = localStorage.getItem(KEY_LLM_PROVIDER_SECRETS);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function setLlmProviderSecrets(map) {
  localStorage.setItem(KEY_LLM_PROVIDER_SECRETS, JSON.stringify(map && typeof map === "object" ? map : {}));
  window.dispatchEvent(new CustomEvent("ipfactory:modelsChanged"));
}

export function getLlmUsageLogs() {
  try {
    const raw = localStorage.getItem(KEY_LLM_USAGE_LOGS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function setLlmUsageLogs(list) {
  localStorage.setItem(KEY_LLM_USAGE_LOGS, JSON.stringify(Array.isArray(list) ? list : []));
}

export function appendLlmUsageLog(item) {
  const list = getLlmUsageLogs();
  const next = [item, ...list].slice(0, 500);
  setLlmUsageLogs(next);
  return next;
}

export function getCloneVoices() {
  try {
    const raw = getScopedStorageItem(KEY_CLONE_VOICES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function setCloneVoices(list) {
  setScopedStorageItem(KEY_CLONE_VOICES, JSON.stringify(Array.isArray(list) ? list : []));
}

export function getActiveVoiceId() {
  return getScopedStorageItem(KEY_ACTIVE_VOICE_ID) || "";
}

export function setActiveVoiceId(id) {
  setScopedStorageItem(KEY_ACTIVE_VOICE_ID, id || "");
}

export function getAudioHistory() {
  try {
    const raw = getScopedStorageItem(KEY_AUDIO_HISTORY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function setAudioHistory(list) {
  const next = Array.isArray(list) ? list.slice(0, 80) : [];
  setScopedStorageItem(KEY_AUDIO_HISTORY, JSON.stringify(next, null, 2));
}

function normalizeModelStoragePath(v) {
  return String(v || "")
    .trim()
    .replace(/\//g, "\\")
    .replace(/\\+$/g, "")
    .toLowerCase();
}

function buildLocalModelDedupeKey(item) {
  const model = item && typeof item === "object" ? item : {};
  const configPath = normalizeModelStoragePath(model.configPath);
  if (configPath) return `config:${configPath}`;
  const bundleDir = normalizeModelStoragePath(model.bundleDir || model.path);
  if (bundleDir) return `bundle:${bundleDir}`;
  const type = String(model.type || model.kind || "").trim().toLowerCase();
  const name = String(model.name || "").trim().toLowerCase();
  if (type && name) return `meta:${type}:${name}`;
  const id = String(model.id || "").trim();
  return id ? `id:${id}` : "";
}

export function dedupeLocalModels(list) {
  const arr = Array.isArray(list) ? list : [];
  const seen = new Set();
  return arr.filter((item) => {
    if (!item || typeof item !== "object") return false;
    const key = buildLocalModelDedupeKey(item);
    if (!key) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function repairStoredModels() {
  try {
    const raw = localStorage.getItem(KEY_MODELS);
    const parsed = raw ? JSON.parse(raw) : [];
    const before = Array.isArray(parsed) ? parsed : [];
    const next = dedupeLocalModels(before);
    const removedCount = Math.max(0, before.length - next.length);
    if (removedCount > 0) {
      localStorage.setItem(KEY_MODELS, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent("ipfactory:modelsChanged"));
    }
    return { removedCount, beforeCount: before.length, afterCount: next.length };
  } catch {
    return { removedCount: 0, beforeCount: 0, afterCount: 0 };
  }
}
