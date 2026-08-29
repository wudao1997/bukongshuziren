// 模板预览同步：统一负责模板 patch 深合并、帧级预览调度和本地字体文件注册。

function normalizeText(v) {
  return String(v || "").trim();
}

function cloneValue(input) {
  if (Array.isArray(input)) return input.map((item) => cloneValue(item));
  if (input && typeof input === "object") {
    const out = {};
    Object.keys(input).forEach((key) => {
      out[key] = cloneValue(input[key]);
    });
    return out;
  }
  return input;
}

function isPlainObject(input) {
  return !!input && typeof input === "object" && !Array.isArray(input);
}

function stripFontExt(name) {
  return normalizeText(name).replace(/\.(ttf|otf|ttc|woff|woff2)$/i, "");
}

function uniqueTextList(items = []) {
  const seen = new Set();
  const out = [];
  (Array.isArray(items) ? items : []).forEach((item) => {
    const value = normalizeText(item);
    if (!value) return;
    const key = value.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(value);
  });
  return out;
}

function toFileUrl(filePath) {
  const raw = normalizeText(filePath);
  if (!raw) return "";
  const normalized = raw.replace(/\\/g, "/").replace(/^\/+/, "");
  return `file:///${encodeURI(normalized)}`;
}

function escapeCssFontFamily(name) {
  return `'${String(name || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
}

const loadedFontFaceKeys = new Set();

export function decodeTemplateFontValue(fontKey) {
  const raw = normalizeText(fontKey);
  if (!raw) return "Microsoft YaHei";
  try {
    return normalizeText(decodeURIComponent(raw)) || raw;
  } catch {
    return raw;
  }
}

export function buildTemplateFontCandidates(fontKey) {
  const decoded = decodeTemplateFontValue(fontKey);
  return uniqueTextList([decoded, stripFontExt(decoded)]);
}

export function buildTemplateFontCss(fontKey, fallbacks = ["Microsoft YaHei", "system-ui", "sans-serif"]) {
  const parts = uniqueTextList([...buildTemplateFontCandidates(fontKey), ...(Array.isArray(fallbacks) ? fallbacks : [])]);
  return parts.map((item) => escapeCssFontFamily(item)).join(", ");
}

export function mergeTemplatePatch(base, patch) {
  const source = isPlainObject(base) ? base : {};
  const diff = isPlainObject(patch) ? patch : {};
  const out = { ...source };
  Object.keys(diff).forEach((key) => {
    const next = diff[key];
    if (Array.isArray(next)) {
      out[key] = cloneValue(next);
      return;
    }
    if (isPlainObject(next)) {
      out[key] = mergeTemplatePatch(isPlainObject(source[key]) ? source[key] : {}, next);
      return;
    }
    out[key] = next;
  });
  return out;
}

async function loadFontAlias(alias, filePath) {
  const family = normalizeText(alias);
  const fileUrl = toFileUrl(filePath);
  if (!family || !fileUrl || typeof FontFace !== "function" || !document?.fonts?.add) return false;
  const cacheKey = `${family.toLowerCase()}@@${normalizeText(filePath).toLowerCase()}`;
  if (loadedFontFaceKeys.has(cacheKey)) return true;
  try {
    const face = new FontFace(family, `url("${fileUrl}")`);
    await face.load();
    document.fonts.add(face);
    loadedFontFaceKeys.add(cacheKey);
    return true;
  } catch {
    return false;
  }
}

export async function ensureProjectTemplateFonts(fontItems = []) {
  const items = Array.isArray(fontItems) ? fontItems : [];
  let loadedCount = 0;
  const tasks = [];
  items.forEach((item) => {
    const filePath = normalizeText(item?.path);
    const aliases = buildTemplateFontCandidates(item?.name);
    aliases.forEach((alias) => {
      tasks.push(
        loadFontAlias(alias, filePath).then((ok) => {
          if (ok) loadedCount += 1;
        })
      );
    });
  });
  await Promise.allSettled(tasks);
  return { ok: true, loadedCount };
}

export function createTemplatePreviewScheduler({ render, onRendered } = {}) {
  let rafId = 0;
  let queuedAt = 0;
  const pendingReasons = new Set();

  const run = () => {
    rafId = 0;
    const startAt = typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
    const latencyMs = queuedAt > 0 ? Math.max(0, Math.round(startAt - queuedAt)) : 0;
    try {
      if (typeof render === "function") render({ reasons: Array.from(pendingReasons) });
    } finally {
      pendingReasons.clear();
      queuedAt = 0;
      if (typeof onRendered === "function") onRendered({ latencyMs });
    }
  };

  const requestRender = (reason = "") => {
    if (reason) pendingReasons.add(String(reason));
    if (rafId) return;
    queuedAt = typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
    rafId = window.requestAnimationFrame(run);
  };

  const flushRender = () => {
    if (rafId) {
      window.cancelAnimationFrame(rafId);
      rafId = 0;
    }
    run();
  };

  const dispose = () => {
    if (rafId) window.cancelAnimationFrame(rafId);
    rafId = 0;
    queuedAt = 0;
    pendingReasons.clear();
  };

  return { requestRender, flushRender, dispose };
}
