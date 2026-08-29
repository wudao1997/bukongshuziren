// 字幕模板识别：用于上传 1-9 张同行截图，分析字幕区域样式并生成可应用的模板参数。

const clamp = (n, min, max) => Math.max(min, Math.min(max, Number(n || 0) || 0));

const normalizeHex = (value, fallback = "#ffffff") => {
  const text = String(value || "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(text) ? text.toLowerCase() : fallback;
};

const padHex = (value) => Math.max(0, Math.min(255, Math.round(Number(value || 0) || 0))).toString(16).padStart(2, "0");
const rgbToHex = (r, g, b) => `#${padHex(r)}${padHex(g)}${padHex(b)}`;

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    try {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("图片加载失败"));
      img.src = String(src || "");
    } catch (error) {
      reject(error);
    }
  });

const pickFiles = ({ accept = "image/png,image/jpeg,image/jpg,image/webp", multiple = true } = {}) =>
  new Promise((resolve) => {
    try {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = accept;
      input.multiple = multiple === true;
      input.style.display = "none";
      document.body.appendChild(input);
      input.addEventListener(
        "change",
        () => {
          const files = Array.from(input.files || []);
          try {
            input.remove();
          } catch {}
          resolve(files);
        },
        { once: true }
      );
      input.click();
    } catch {
      resolve([]);
    }
  });

const fileToDataUrl = (file) =>
  new Promise((resolve) => {
    try {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => resolve("");
      reader.readAsDataURL(file);
    } catch {
      resolve("");
    }
  });

const resizeImageDataUrl = async (dataUrl, { maxWidth = 1080, maxHeight = 1920, quality = 0.86, mimeType = "image/webp" } = {}) => {
  const src = String(dataUrl || "").trim();
  if (!src) return "";
  try {
    const img = await loadImage(src);
    const sw = Math.max(1, Number(img.naturalWidth || img.width || 1) || 1);
    const sh = Math.max(1, Number(img.naturalHeight || img.height || 1) || 1);
    const ratio = Math.min(1, Number(maxWidth || sw) / sw, Number(maxHeight || sh) / sh);
    const tw = Math.max(1, Math.round(sw * ratio));
    const th = Math.max(1, Math.round(sh * ratio));
    const canvas = document.createElement("canvas");
    canvas.width = tw;
    canvas.height = th;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return src;
    ctx.drawImage(img, 0, 0, tw, th);
    return canvas.toDataURL(mimeType, quality);
  } catch {
    return src;
  }
};

export async function pickSubtitleTemplateReferenceImages({ maxCount = 9 } = {}) {
  const files = await pickFiles();
  const capped = files.slice(0, clamp(maxCount || 9, 1, 9));
  const items = [];
  for (let i = 0; i < capped.length; i += 1) {
    const file = capped[i];
    const rawUrl = await fileToDataUrl(file);
    const dataUrl = await resizeImageDataUrl(rawUrl, { maxWidth: 1080, maxHeight: 1920, quality: 0.86 });
    if (!dataUrl) continue;
    items.push({
      id: `stpl_ref_${Date.now()}_${i}_${Math.random().toString(16).slice(2, 8)}`,
      name: String(file?.name || `参考图${i + 1}`).trim() || `参考图${i + 1}`,
      dataUrl
    });
  }
  return items;
}

const buildCanvasData = async (dataUrl) => {
  const img = await loadImage(dataUrl);
  const width = Math.max(1, Number(img.naturalWidth || img.width || 1) || 1);
  const height = Math.max(1, Number(img.naturalHeight || img.height || 1) || 1);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("无法创建识别画布");
  ctx.drawImage(img, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);
  return { width, height, data: imageData.data };
};

const rgbToHsl = (r, g, b) => {
  const rn = (Number(r || 0) || 0) / 255;
  const gn = (Number(g || 0) || 0) / 255;
  const bn = (Number(b || 0) || 0) / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (!d) return { h: 0, s: 0, l };
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  switch (max) {
    case rn:
      h = (gn - bn) / d + (gn < bn ? 6 : 0);
      break;
    case gn:
      h = (bn - rn) / d + 2;
      break;
    default:
      h = (rn - gn) / d + 4;
      break;
  }
  return { h: h / 6, s, l };
};

const getPixel = (raw, width, x, y) => {
  const safeX = clamp(x, 0, width - 1);
  const idx = (Math.round(y) * width + Math.round(safeX)) * 4;
  return {
    r: raw[idx] || 0,
    g: raw[idx + 1] || 0,
    b: raw[idx + 2] || 0,
    a: raw[idx + 3] || 0
  };
};

const buildEdgeMaps = ({ width, height, data }) => {
  const rowScores = new Array(height).fill(0);
  const colScores = new Array(width).fill(0);
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const idx = (y * width + x) * 4;
      const r = data[idx] || 0;
      const g = data[idx + 1] || 0;
      const b = data[idx + 2] || 0;
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      const right = getPixel(data, width, x + 1, y);
      const down = getPixel(data, width, x, y + 1);
      const rightLum = (0.299 * right.r + 0.587 * right.g + 0.114 * right.b) / 255;
      const downLum = (0.299 * down.r + 0.587 * down.g + 0.114 * down.b) / 255;
      const { s } = rgbToHsl(r, g, b);
      const edge = Math.abs(lum - rightLum) + Math.abs(lum - downLum) + s * 0.22;
      rowScores[y] += edge;
      colScores[x] += edge;
    }
  }
  return {
    rowScores: rowScores.map((v) => v / Math.max(1, width)),
    colScores: colScores.map((v) => v / Math.max(1, height))
  };
};

const smoothSeries = (values, radius = 3) =>
  values.map((_, idx) => {
    let total = 0;
    let count = 0;
    for (let i = idx - radius; i <= idx + radius; i += 1) {
      if (i < 0 || i >= values.length) continue;
      total += Number(values[i] || 0) || 0;
      count += 1;
    }
    return count ? total / count : 0;
  });

const findBand = (scores, start, end, { minHeight = 16 } = {}) => {
  const from = clamp(start, 0, scores.length - 1);
  const to = clamp(end, from + 1, scores.length);
  const slice = scores.slice(from, to);
  if (!slice.length) return null;
  const peak = Math.max(...slice, 0);
  const avg = slice.reduce((sum, item) => sum + item, 0) / slice.length;
  const threshold = Math.max(avg * 1.35, peak * 0.46);
  let best = null;
  let segStart = -1;
  let segScore = 0;
  for (let i = 0; i < slice.length; i += 1) {
    const value = slice[i];
    if (value >= threshold) {
      if (segStart < 0) {
        segStart = i;
        segScore = 0;
      }
      segScore += value;
      continue;
    }
    if (segStart >= 0) {
      const segEnd = i - 1;
      if (segEnd - segStart + 1 >= minHeight) {
        const candidate = { start: from + segStart, end: from + segEnd, score: segScore };
        if (!best || candidate.score > best.score) best = candidate;
      }
      segStart = -1;
      segScore = 0;
    }
  }
  if (segStart >= 0) {
    const segEnd = slice.length - 1;
    if (segEnd - segStart + 1 >= minHeight) {
      const candidate = { start: from + segStart, end: from + segEnd, score: segScore };
      if (!best || candidate.score > best.score) best = candidate;
    }
  }
  return best;
};

const findHorizontalBand = (scores, start, end, { minWidth = 80 } = {}) => {
  const from = clamp(start, 0, scores.length - 1);
  const to = clamp(end, from + 1, scores.length);
  const slice = scores.slice(from, to);
  if (!slice.length) return { left: from, right: to - 1 };
  const peak = Math.max(...slice, 0);
  const avg = slice.reduce((sum, item) => sum + item, 0) / slice.length;
  const threshold = Math.max(avg * 1.22, peak * 0.40);
  let left = -1;
  let right = -1;
  for (let i = 0; i < slice.length; i += 1) {
    if (slice[i] < threshold) continue;
    if (left < 0) left = i;
    right = i;
  }
  if (left < 0 || right < 0) return { left: from, right: to - 1 };
  if (right - left + 1 < minWidth) return { left: from, right: to - 1 };
  return { left: from + left, right: from + right };
};

const countLineClusters = (scores, start, end) => {
  const from = clamp(start, 0, scores.length - 1);
  const to = clamp(end, from + 1, scores.length);
  const slice = scores.slice(from, to);
  if (!slice.length) return 1;
  const peak = Math.max(...slice, 0);
  const threshold = Math.max(peak * 0.54, 0.00001);
  let count = 0;
  let inCluster = false;
  for (let i = 0; i < slice.length; i += 1) {
    const hit = slice[i] >= threshold;
    if (hit && !inCluster) {
      count += 1;
      inCluster = true;
    } else if (!hit) {
      inCluster = false;
    }
  }
  return clamp(count || 1, 1, 3);
};

const quantizeColor = (r, g, b, step = 24) => {
  const sr = Math.round((Number(r || 0) || 0) / step) * step;
  const sg = Math.round((Number(g || 0) || 0) / step) * step;
  const sb = Math.round((Number(b || 0) || 0) / step) * step;
  return rgbToHex(sr, sg, sb);
};

const sampleBandColors = ({ raw, width, x0, x1, y0, y1 }) => {
  const fillMap = new Map();
  const darkMap = new Map();
  const accentMap = new Map();
  for (let y = y0; y <= y1; y += 2) {
    for (let x = x0; x <= x1; x += 2) {
      const { r, g, b, a } = getPixel(raw, width, x, y);
      if (a <= 0) continue;
      const { s, l } = rgbToHsl(r, g, b);
      const key = quantizeColor(r, g, b, 24);
      if (l <= 0.24) {
        darkMap.set(key, (darkMap.get(key) || 0) + 1);
      }
      if (l >= 0.56) {
        fillMap.set(key, (fillMap.get(key) || 0) + 1);
      }
      if (s >= 0.24 && l >= 0.25 && l <= 0.88) {
        accentMap.set(key, (accentMap.get(key) || 0) + 1);
      }
    }
  }
  const pickMax = (map, fallback) => {
    let bestKey = fallback;
    let bestScore = -1;
    map.forEach((score, key) => {
      if (score > bestScore) {
        bestScore = score;
        bestKey = key;
      }
    });
    return normalizeHex(bestKey, fallback);
  };
  const accentColors = Array.from(accentMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([key]) => normalizeHex(key, "#f59e0b"))
    .filter((value, idx, arr) => arr.indexOf(value) === idx)
    .slice(0, 6);
  return {
    fillColor: pickMax(fillMap, "#ffffff"),
    outlineColor: pickMax(darkMap, "#000000"),
    accentColors
  };
};

const detectBandDarkRatio = ({ raw, width, x0, x1, y0, y1 }) => {
  let hit = 0;
  let total = 0;
  for (let y = y0; y <= y1; y += 2) {
    for (let x = x0; x <= x1; x += 2) {
      const { r, g, b, a } = getPixel(raw, width, x, y);
      if (a <= 0) continue;
      total += 1;
      const { l, s } = rgbToHsl(r, g, b);
      if (l <= 0.22 || (l <= 0.3 && s <= 0.18)) hit += 1;
    }
  }
  return total ? hit / total : 0;
};

const median = (list, fallback = 0) => {
  const nums = (Array.isArray(list) ? list : []).map((item) => Number(item || 0) || 0).sort((a, b) => a - b);
  if (!nums.length) return fallback;
  const mid = Math.floor(nums.length / 2);
  return nums.length % 2 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
};

const modeText = (list, fallback = "") => {
  const counter = new Map();
  (Array.isArray(list) ? list : []).forEach((item) => {
    const key = String(item || "").trim();
    if (!key) return;
    counter.set(key, (counter.get(key) || 0) + 1);
  });
  let best = fallback;
  let bestCount = -1;
  counter.forEach((count, key) => {
    if (count > bestCount) {
      bestCount = count;
      best = key;
    }
  });
  return best || fallback;
};

const estimateBodyPos = (centerYRatio) => {
  if (centerYRatio <= 0.38) return "top";
  if (centerYRatio <= 0.68) return "middle";
  return "bottom";
};

const analyzeSingleImage = async (item) => {
  const { width, height, data } = await buildCanvasData(item.dataUrl);
  const { rowScores, colScores } = buildEdgeMaps({ width, height, data });
  const smoothRows = smoothSeries(rowScores, 4);
  const smoothCols = smoothSeries(colScores, 5);
  const titleBand = findBand(smoothRows, Math.round(height * 0.02), Math.round(height * 0.46), {
    minHeight: Math.max(10, Math.round(height * 0.03))
  });
  const bodyBand = findBand(smoothRows, Math.round(height * 0.42), Math.round(height * 0.96), {
    minHeight: Math.max(14, Math.round(height * 0.04))
  });

  const titleBox = titleBand
    ? findHorizontalBand(smoothCols, Math.round(width * 0.06), Math.round(width * 0.94), { minWidth: Math.round(width * 0.18) })
    : null;
  const bodyBox = bodyBand
    ? findHorizontalBand(smoothCols, Math.round(width * 0.04), Math.round(width * 0.96), { minWidth: Math.round(width * 0.22) })
    : null;

  const titleLineCount = titleBand ? countLineClusters(smoothRows, titleBand.start, titleBand.end) : 0;
  const bodyLineCount = bodyBand ? countLineClusters(smoothRows, bodyBand.start, bodyBand.end) : 2;

  const titleColors =
    titleBand && titleBox
      ? sampleBandColors({ raw: data, width, x0: titleBox.left, x1: titleBox.right, y0: titleBand.start, y1: titleBand.end })
      : { fillColor: "#f5c400", outlineColor: "#000000", accentColors: [] };
  const bodyColors =
    bodyBand && bodyBox
      ? sampleBandColors({ raw: data, width, x0: bodyBox.left, x1: bodyBox.right, y0: bodyBand.start, y1: bodyBand.end })
      : { fillColor: "#ffffff", outlineColor: "#000000", accentColors: [] };

  const titleHeight = titleBand ? titleBand.end - titleBand.start + 1 : 0;
  const bodyHeight = bodyBand ? bodyBand.end - bodyBand.start + 1 : 0;
  const titleDarkRatio =
    titleBand && titleBox
      ? detectBandDarkRatio({
          raw: data,
          width,
          x0: clamp(titleBox.left - Math.round(width * 0.02), 0, width - 1),
          x1: clamp(titleBox.right + Math.round(width * 0.02), 0, width - 1),
          y0: clamp(titleBand.start - Math.round(height * 0.01), 0, height - 1),
          y1: clamp(titleBand.end + Math.round(height * 0.01), 0, height - 1)
        })
      : 0;
  const titleAccentColor = normalizeHex(titleColors.accentColors[0] || titleColors.fillColor, titleColors.fillColor);

  const titleFontSize = titleBand ? clamp(Math.round((titleHeight / Math.max(1, titleLineCount || 1)) * 0.82), 28, 160) : 68;
  const bodyFontSize = bodyBand ? clamp(Math.round((bodyHeight / Math.max(1, bodyLineCount || 1)) * 0.76), 24, 120) : 44;

  const titleWidth = titleBox ? Math.max(1, titleBox.right - titleBox.left + 1) : Math.round(width * 0.72);
  const bodyWidth = bodyBox ? Math.max(1, bodyBox.right - bodyBox.left + 1) : Math.round(width * 0.84);

  const titleMaxChars = clamp(Math.round(titleWidth / Math.max(20, titleFontSize * 0.92)), 6, 20);
  const bodyMaxChars = clamp(Math.round(bodyWidth / Math.max(20, bodyFontSize * 0.92)), 6, 24);

  const titleTopMarginPct = titleBand ? clamp(Math.round((titleBand.start / height) * 100), 0, 30) : 10;
  const bodyCenterYRatio = bodyBand ? (bodyBand.start + bodyBand.end) / 2 / height : 0.78;
  const bodyPos = estimateBodyPos(bodyCenterYRatio);
  let marginVPct = 34;
  if (bodyBand) {
    if (bodyPos === "bottom") marginVPct = clamp(Math.round(((height - bodyBand.end) / height) * 100), 2, 60);
    else if (bodyPos === "top") marginVPct = clamp(Math.round((bodyBand.start / height) * 100), 2, 60);
    else marginVPct = clamp(Math.round(Math.abs(bodyCenterYRatio - 0.5) * 100), 0, 20);
  }

  const accentColors = bodyColors.accentColors.length ? bodyColors.accentColors : titleColors.accentColors;
  return {
    width,
    height,
    titleDetected: !!titleBand,
    title: {
      enable: !!titleBand,
      lineCount: clamp(titleLineCount || 1, 1, 3),
      maxChars: titleMaxChars,
      topMarginPct: titleTopMarginPct,
      lineGapPct: 5,
      background: {
        enable: titleDarkRatio >= 0.24,
        color: "#202020",
        alpha: titleDarkRatio >= 0.4 ? 0.88 : 0.78,
        radius: 16,
        paddingX: 22,
        paddingY: 10
      },
      lines: [
        {
          font: "Microsoft YaHei",
          fontSize: titleFontSize,
          color: titleColors.fillColor,
          outlineColor: titleColors.outlineColor,
          outline: titleColors.outlineColor === "#000000" ? 4 : 3,
          bold: true,
          shadow: true
        },
        {
          font: "Microsoft YaHei",
          fontSize: clamp(Math.round(titleFontSize * 0.88), 24, 140),
          color: titleAccentColor,
          outlineColor: titleColors.outlineColor,
          outline: titleColors.outlineColor === "#000000" ? 4 : 3,
          bold: true,
          shadow: true
        }
      ]
    },
    body: {
      pos: bodyPos,
      font: "Microsoft YaHei",
      fontSize: bodyFontSize,
      lineCount: clamp(bodyLineCount || 2, 1, 3),
      maxChars: bodyMaxChars,
      lineGapPct: 4,
      letterSpacing: 0,
      bold: true,
      shadow: true,
      color: bodyColors.fillColor,
      outlineColor: bodyColors.outlineColor,
      outline: bodyColors.outlineColor === "#000000" ? 3 : 2,
      marginVPct
    },
    keywordFx: {
      enable: accentColors.length > 0,
      accentColors
    }
  };
};

const buildKeywordGroupPatch = (accentColors = []) => {
  const seed = ["#b30b08", "#5a8cff", "#22c55e", "#f59e0b"];
  const colors = seed.map((fallback, idx) => normalizeHex(accentColors[idx] || fallback, fallback));
  const names = ["重点词/成语词", "描述词", "行动词", "情感词"];
  return names.reduce((out, key, idx) => {
    out[key] = {
      font: "Microsoft YaHei",
      fontSize: idx === 0 ? 52 : 48,
      bold: true,
      shadow: true,
      color: colors[idx],
      outlineColor: "#000000",
      outline: 4
    };
    return out;
  }, {});
};

export async function analyzeSubtitleTemplateReferenceImages(items = []) {
  const sourceItems = Array.isArray(items) ? items.slice(0, 9) : [];
  if (!sourceItems.length) {
    return { ok: false, message: "请先上传至少 1 张参考图。" };
  }
  const sampleResults = [];
  for (let i = 0; i < sourceItems.length; i += 1) {
    const item = sourceItems[i];
    const analysis = await analyzeSingleImage(item);
    sampleResults.push({
      ...item,
      width: analysis.width,
      height: analysis.height,
      analysis
    });
  }
  const titleEnabled = sampleResults.filter((item) => item.analysis?.title?.enable === true).length >= Math.ceil(sampleResults.length / 2);
  const titleLineCount = Math.round(median(sampleResults.map((item) => item.analysis?.title?.lineCount || 1), 1));
  const titleFontSize = Math.round(median(sampleResults.map((item) => item.analysis?.title?.lines?.[0]?.fontSize || 68), 68));
  const titleTopMarginPct = Math.round(median(sampleResults.map((item) => item.analysis?.title?.topMarginPct || 10), 10));
  const titleMaxChars = Math.round(median(sampleResults.map((item) => item.analysis?.title?.maxChars || 12), 12));
  const titleColor = modeText(sampleResults.map((item) => item.analysis?.title?.lines?.[0]?.color || "#f5c400"), "#f5c400");
  const titleAccentColor = modeText(sampleResults.map((item) => item.analysis?.title?.lines?.[1]?.color || "#f5c400"), "#f5c400");
  const titleOutlineColor = modeText(sampleResults.map((item) => item.analysis?.title?.lines?.[0]?.outlineColor || "#000000"), "#000000");
  const titleBgEnabled = sampleResults.filter((item) => item.analysis?.title?.background?.enable === true).length >= Math.ceil(sampleResults.length / 2);

  const bodyFontSize = Math.round(median(sampleResults.map((item) => item.analysis?.body?.fontSize || 44), 44));
  const bodyLineCount = Math.round(median(sampleResults.map((item) => item.analysis?.body?.lineCount || 2), 2));
  const bodyMaxChars = Math.round(median(sampleResults.map((item) => item.analysis?.body?.maxChars || 14), 14));
  const bodyMarginVPct = Math.round(median(sampleResults.map((item) => item.analysis?.body?.marginVPct || 34), 34));
  const bodyPos = modeText(sampleResults.map((item) => item.analysis?.body?.pos || "bottom"), "bottom");
  const bodyColor = modeText(sampleResults.map((item) => item.analysis?.body?.color || "#ffffff"), "#ffffff");
  const bodyOutlineColor = modeText(sampleResults.map((item) => item.analysis?.body?.outlineColor || "#000000"), "#000000");

  const accentPool = [];
  sampleResults.forEach((item) => {
    const colors = Array.isArray(item.analysis?.keywordFx?.accentColors) ? item.analysis.keywordFx.accentColors : [];
    accentPool.push(...colors);
  });
  const uniqueAccentColors = Array.from(new Set(accentPool.map((item) => normalizeHex(item, "#f59e0b")))).slice(0, 4);

  const patch = {
    title: {
      enable: titleEnabled,
      lineCount: clamp(titleLineCount, 1, 3),
      maxChars: clamp(titleMaxChars, 8, 20),
      topMarginPct: clamp(titleTopMarginPct, 0, 30),
      lineGapPct: 5,
      background: {
        enable: titleBgEnabled,
        color: "#202020",
        alpha: 0.82,
        radius: 16,
        paddingX: 22,
        paddingY: 10
      },
      lines: [
        {
          font: "Microsoft YaHei",
          fontSize: clamp(titleFontSize, 28, 160),
          color: normalizeHex(titleColor, "#f5c400"),
          outlineColor: normalizeHex(titleOutlineColor, "#000000"),
          outline: 4,
          bold: true,
          shadow: true
        },
        {
          font: "Microsoft YaHei",
          fontSize: clamp(Math.round(titleFontSize * 0.88), 24, 140),
          color: normalizeHex(titleAccentColor, "#f5c400"),
          outlineColor: normalizeHex(titleOutlineColor, "#000000"),
          outline: 4,
          bold: true,
          shadow: true
        }
      ]
    },
    body: {
      pos: bodyPos,
      font: "Microsoft YaHei",
      fontSize: clamp(bodyFontSize, 24, 120),
      lineCount: clamp(bodyLineCount, 1, 3),
      maxChars: clamp(bodyMaxChars, 6, 24),
      lineGapPct: 4,
      letterSpacing: 0,
      bold: true,
      shadow: true,
      color: normalizeHex(bodyColor, "#ffffff"),
      outlineColor: normalizeHex(bodyOutlineColor, "#000000"),
      outline: 3,
      marginVPct: clamp(bodyMarginVPct, 0, 60)
    },
    keywordFx: {
      enable: uniqueAccentColors.length > 0,
      groups: buildKeywordGroupPatch(uniqueAccentColors)
    }
  };

  return {
    ok: true,
    patch,
    items: sampleResults,
    summary: {
      imageCount: sampleResults.length,
      titleDetectedCount: sampleResults.filter((item) => item.analysis?.titleDetected).length,
      bodyPos,
      titleBgEnabled,
      accentColors: uniqueAccentColors
    }
  };
}
