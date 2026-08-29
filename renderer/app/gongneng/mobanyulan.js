// 模板预览与模板封面工具：
// 1. 上传背景图片并转为 data URL
// 2. 根据当前模板参数生成可保存的模板封面
// 3. 供首页弹窗、字幕模板页、封面模板页共用

const clamp = (n, a, b) => Math.max(a, Math.min(b, Number(n || 0) || 0));

const escXml = (value) =>
  String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

const normalizeHex = (value, fallback = "#ffffff") => {
  const s = String(value || "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(s) ? s.toLowerCase() : fallback;
};

const decodeFontValue = (fontKey, fallback = "Microsoft YaHei") => {
  const raw = String(fontKey || "").trim();
  if (!raw) return fallback;
  try {
    return String(decodeURIComponent(raw) || "").trim() || raw;
  } catch {
    return raw;
  }
};

const toSvgDataUrl = (svg) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(String(svg || ""))}`;

const pickFileByInput = ({ accept = "image/*" } = {}) =>
  new Promise((resolve) => {
    try {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = accept;
      input.style.display = "none";
      document.body.appendChild(input);
      input.addEventListener(
        "change",
        () => {
          const file = input.files && input.files[0] ? input.files[0] : null;
          try {
            input.remove();
          } catch {}
          resolve(file);
        },
        { once: true }
      );
      input.click();
    } catch {
      resolve(null);
    }
  });

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    try {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("图片加载失败"));
      img.src = String(src || "");
    } catch (e) {
      reject(e);
    }
  });

const renderImageToDataUrl = async (
  source,
  { maxWidth = 360, maxHeight = 640, quality = 0.78, mimeType = "image/webp", backgroundColor = "" } = {}
) => {
  const src = typeof source === "string" ? source : source ? URL.createObjectURL(source) : "";
  if (!src) return "";
  return new Promise((resolve) => {
    try {
      loadImage(src)
        .then((img) => {
          const sw = Math.max(1, Number(img.naturalWidth || img.width || 1) || 1);
          const sh = Math.max(1, Number(img.naturalHeight || img.height || 1) || 1);
          const ratio = Math.min(1, Number(maxWidth || sw) / sw, Number(maxHeight || sh) / sh);
          const tw = Math.max(1, Math.round(sw * ratio));
          const th = Math.max(1, Math.round(sh * ratio));
          const canvas = document.createElement("canvas");
          canvas.width = tw;
          canvas.height = th;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve("");
            return;
          }
          if (backgroundColor) {
            ctx.fillStyle = String(backgroundColor || "#ffffff");
            ctx.fillRect(0, 0, tw, th);
          }
          ctx.drawImage(img, 0, 0, tw, th);
          resolve(canvas.toDataURL(mimeType, quality));
        })
        .catch(() => resolve(""))
        .finally(() => {
          try {
            if (source && typeof source !== "string") URL.revokeObjectURL(src);
          } catch {}
        });
    } catch {
      resolve("");
    }
  });
};

export const pickImageAsDataUrl = async ({ maxWidth = 360, maxHeight = 640, quality = 0.78, mimeType = "image/webp" } = {}) => {
  const file = await pickFileByInput({ accept: "image/png,image/jpeg,image/jpg,image/webp" });
  if (!file) return "";
  return renderImageToDataUrl(file, { maxWidth, maxHeight, quality, mimeType });
};

export const compressDataUrlImage = async (
  dataUrl,
  { maxWidth = 240, maxHeight = 426, quality = 0.74, mimeType = "image/webp", backgroundColor = "#ffffff" } = {}
) => renderImageToDataUrl(String(dataUrl || ""), { maxWidth, maxHeight, quality, mimeType, backgroundColor });

const wrapText = (text, maxChars = 8, lineCount = 2) => {
  const raw = String(text || "").replace(/\s+/g, "").trim();
  if (!raw) return [];
  const max = clamp(maxChars || 8, 1, 40);
  const rows = clamp(lineCount || 2, 1, 4);
  const chars = Array.from(raw);
  const lines = [];
  for (let i = 0; i < chars.length; i += max) lines.push(chars.slice(i, i + max).join(""));
  return lines.slice(0, rows);
};

const buildDefaultBgSvg = ({ width, height, mode = "cover" } = {}) => {
  const w = clamp(width || 1080, 64, 4096);
  const h = clamp(height || 1440, 64, 4096);
  const warm = mode === "subtitle" ? "#f4e7d3" : "#e6efe9";
  const cool = mode === "subtitle" ? "#6f8faa" : "#6a9ccc";
  return `
    <defs>
      <linearGradient id="bgMain" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${warm}" />
        <stop offset="100%" stop-color="${cool}" />
      </linearGradient>
      <radialGradient id="lightA" cx="22%" cy="18%" r="42%">
        <stop offset="0%" stop-color="rgba(255,255,255,0.95)" />
        <stop offset="100%" stop-color="rgba(255,255,255,0)" />
      </radialGradient>
      <radialGradient id="lightB" cx="74%" cy="28%" r="38%">
        <stop offset="0%" stop-color="rgba(255,255,255,0.65)" />
        <stop offset="100%" stop-color="rgba(255,255,255,0)" />
      </radialGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#bgMain)" />
    <rect width="${w}" height="${h}" fill="url(#lightA)" opacity="0.75" />
    <rect width="${w}" height="${h}" fill="url(#lightB)" opacity="0.55" />
  `;
};

const buildImageOrDefaultBg = ({ width, height, imageUrl, mode = "cover" } = {}) => {
  const w = clamp(width || 1080, 64, 4096);
  const h = clamp(height || 1440, 64, 4096);
  const safeHref = escXml(imageUrl);
  if (!safeHref) return buildDefaultBgSvg({ width: w, height: h, mode });
  return `
    ${buildDefaultBgSvg({ width: w, height: h, mode })}
    <image href="${safeHref}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice" />
  `;
};

const buildTextShadowCss = (outline, outlineColor) => {
  const oc = normalizeHex(outlineColor, "#000000");
  const o = clamp(outline || 0, 0, 30);
  if (!o) return "filter: drop-shadow(0 4px 12px rgba(0,0,0,0.35));";
  return `paint-order:stroke;stroke:${oc};stroke-width:${o};stroke-linejoin:round;filter: drop-shadow(0 4px 12px rgba(0,0,0,0.32));`;
};

const estimateTextWidth = (text, fontSize, { isAscii = false } = {}) => {
  const chars = Array.from(String(text || ""));
  const unit = (Number(fontSize || 0) || 0) * (isAscii ? 0.62 : 0.94);
  return Math.max(1, Math.round(chars.length * unit));
};

const buildSubtitleKeywordPreviewTextSvg = ({ tpl, w, h, body, bodyY, bodyAnchor, bodyDominant }) => {
  const keywordFx = tpl.keywordFx && typeof tpl.keywordFx === "object" ? tpl.keywordFx : {};
  if (keywordFx.enable !== true) return "";
  const groups = keywordFx.groups && typeof keywordFx.groups === "object" ? keywordFx.groups : {};
  const tokens = [
    { text: "普通字幕", style: body },
    { text: "重点词", style: groups["重点词/成语词"] || body },
    { text: "描述词", style: groups["描述词"] || body },
    { text: "行动词", style: groups["行动词"] || body },
    { text: "情感词", style: groups["情感词"] || body }
  ];
  const lines = [tokens.slice(0, 3), tokens.slice(3)];
  const lineGap = Math.max(14, Math.round((clamp(body.lineGapPct || 4, 0, 30) / 100) * h) || Math.round(clamp(body.fontSize || 44, 10, 200) * 0.32));
  const letterSpacing = clamp(body.letterSpacing || 0, 0, 20);
  const maxLineFs = (line) => Math.max(...line.map((it) => clamp(it?.style?.fontSize || body.fontSize || 44, 10, 260)));
  const firstFs = maxLineFs(lines[0]);
  const secondFs = maxLineFs(lines[1]);
  const blockHeight = Math.round(firstFs * 1.1 + secondFs * 1.1 + lineGap);
  const startY =
    String(body.pos || "bottom") === "middle"
      ? Math.round(bodyY - blockHeight / 2 + firstFs)
      : String(body.pos || "bottom") === "top"
        ? bodyY
        : Math.round(bodyY - secondFs * 1.15 - lineGap);
  const estimateTokenWidth = (token) => {
    const fs = clamp(token?.style?.fontSize || body.fontSize || 44, 10, 260);
    return Math.round(Array.from(String(token?.text || "")).length * fs * 0.96);
  };
  const renderLine = (line, y) => {
    const gap = Math.max(16, Math.round(Math.max(...line.map((it) => clamp(it?.style?.fontSize || body.fontSize || 44, 10, 260))) * 0.35));
    const widths = line.map(estimateTokenWidth);
    const total = widths.reduce((sum, cur) => sum + cur, 0) + gap * Math.max(0, line.length - 1);
    let x = Math.round((w - total) / 2);
    return line
      .map((token, idx) => {
        const fs = clamp(token?.style?.fontSize || body.fontSize || 44, 10, 260);
        const width = widths[idx];
        const style = token?.style && typeof token.style === "object" ? token.style : body;
        const textSvg = `<text x="${x}" y="${y}" text-anchor="start" dominant-baseline="${
          bodyDominant
        }" font-family="${escXml(decodeFontValue(style.font || body.font || "Microsoft YaHei"))}" font-size="${fs}" font-weight="${
          style.bold === false ? 700 : 900
        }" fill="${normalizeHex(style.color, body.color || "#ffffff")}" letter-spacing="${letterSpacing}" style="${buildTextShadowCss(
          clamp(style.outline || body.outline || 3, 0, 18),
          normalizeHex(style.outlineColor, body.outlineColor || "#000000")
        )}">${escXml(token.text)}</text>`;
        x += width + gap;
        return textSvg;
      })
      .join("");
  };
  return `
    ${renderLine(lines[0], startY)}
    ${renderLine(lines[1], startY + Math.round(secondFs * 1.1 + lineGap))}
  `;
};

export const createSubtitleTemplatePreviewDataUrl = (template, options = {}) => {
  const tpl = template && typeof template === "object" ? template : {};
  const base = tpl.baseRes && typeof tpl.baseRes === "object" ? tpl.baseRes : { w: 1080, h: 1920 };
  const w = clamp(base.w || 1080, 240, 4096);
  const h = clamp(base.h || 1920, 240, 4096);
  const title = tpl.title && typeof tpl.title === "object" ? tpl.title : {};
  const body = tpl.body && typeof tpl.body === "object" ? tpl.body : {};
  const titleText = String(options.titleText || title.text || "标题示例").trim() || "标题示例";
  const bodyText = String(options.bodyText || "示例字幕文字").trim() || "示例字幕文字";
  const titleLines =
    Array.isArray(options.titleLines) && options.titleLines.length
      ? options.titleLines.map((line) => String(line || ""))
      : wrapText(titleText, Number(title.maxChars || 12) || 12, Number(title.lineCount || 2) || 2);
  const titleLetterSpacing = clamp(title.letterSpacing || 0, 0, 20);
  const topPct = clamp(title.topMarginPct || 10, 0, 40);
  const gapPx = Math.round((clamp(title.lineGapPct || 5, 0, 30) / 100) * h);
  const titleOffsetXPx = Math.round((clamp(title.offsetXPct || 0, -40, 40) / 100) * w);
  const titleOffsetYPx = Math.round((clamp(title.offsetYPct || 0, -40, 40) / 100) * h);
  const titleCenterX = Math.round(w / 2) + titleOffsetXPx;
  const titleBg = title?.background && typeof title.background === "object" ? title.background : {};
  const titleBgEnabled = titleBg.enable === true;
  const titleBgColor = normalizeHex(titleBg.color, "#202020");
  const titleBgAlpha = clamp(Number(titleBg.alpha ?? 0.82) || 0.82, 0.05, 1);
  const titleBgRadius = clamp(Number(titleBg.radius || 16) || 16, 0, 60);
  const titleBgPadX = clamp(Number(titleBg.paddingX || 22) || 22, 0, 140);
  const titleBgPadY = clamp(Number(titleBg.paddingY || 10) || 10, 0, 80);
  const titleHtml =
    title.enable === false
      ? ""
      : titleLines
          .map((line, idx) => {
            const style = Array.isArray(title.lines) ? title.lines[idx] || {} : {};
            const fs = clamp(style.fontSize || (idx === 0 ? 68 : 60), 10, 260);
            const color = normalizeHex(style.color, idx === 0 ? "#b30b08" : "#ffffff");
            const outlineColor = normalizeHex(style.outlineColor, "#000000");
            const outline = clamp(style.outline || 4, 0, 24);
            const y = Math.round((topPct / 100) * h + idx * (fs + gapPx) + titleOffsetYPx);
            const safeLine = line || " ";
            const rectWidth = Math.min(
              Math.round(w * 0.94),
              estimateTextWidth(safeLine, fs, { isAscii: /^[\x00-\x7F\s]+$/.test(safeLine) }) + titleBgPadX * 2
            );
            const rectHeight = Math.round(fs * 1.08 + titleBgPadY * 2);
            const rectX = Math.round(titleCenterX - rectWidth / 2);
            const rectY = Math.round(y - fs * 0.9 - titleBgPadY);
            const bgRect = titleBgEnabled
              ? `<rect x="${rectX}" y="${rectY}" width="${rectWidth}" height="${rectHeight}" rx="${titleBgRadius}" ry="${titleBgRadius}" fill="${titleBgColor}" opacity="${titleBgAlpha}" />`
              : "";
            return `${bgRect}<text x="${titleCenterX}" y="${y}" text-anchor="middle" letter-spacing="${titleLetterSpacing}" font-family="${escXml(
              decodeFontValue(style.font || "Microsoft YaHei")
            )}" font-size="${fs}" font-weight="${style.bold === false ? 700 : 900}" fill="${color}" style="${buildTextShadowCss(
              outline,
              outlineColor
            )}">${escXml(safeLine)}</text>`;
          })
          .join("");
  const bodyFs = clamp(body.fontSize || 44, 10, 200);
  const bodyLines =
    Array.isArray(options.bodyLines) && options.bodyLines.length
      ? options.bodyLines.map((line) => String(line || ""))
      : wrapText(bodyText, Number(body.maxChars || 14) || 14, Number(body.lineCount || 2) || 2);
  const safeBodyLines = bodyLines.length ? bodyLines : [bodyText];
  const bodyGapPx = Math.round((clamp(body.lineGapPct || 4, 0, 30) / 100) * h);
  const bodyLetterSpacing = clamp(body.letterSpacing || 0, 0, 20);
  const bodyBlockHeight = safeBodyLines.length * bodyFs + Math.max(0, safeBodyLines.length - 1) * bodyGapPx;
  const bodyOffsetXPx = Math.round((clamp(body.offsetXPct || 0, -40, 40) / 100) * w);
  const bodyOffsetYPx = Math.round((clamp(body.offsetYPct || 0, -40, 40) / 100) * h);
  const bodyY =
    String(body.pos || "bottom") === "top"
      ? Math.round((clamp(body.marginVPct || 34, 0, 60) / 100) * h) + Math.round(bodyFs * 0.92) + bodyOffsetYPx
      : String(body.pos || "bottom") === "middle"
        ? Math.round(h / 2 - bodyBlockHeight / 2 + bodyFs * 0.92 + bodyOffsetYPx)
        : Math.round(h - (clamp(body.marginVPct || 34, 0, 60) / 100) * h - bodyBlockHeight + bodyFs * 0.92 - bodyOffsetYPx);
  const bodyCenterX = Math.round(w / 2) + bodyOffsetXPx;
  const bodyAnchor = "middle";
  const bodyDominant = String(body.pos || "bottom") === "middle" ? "middle" : "auto";
  const useKeywordPreview = options.keywordPreview === true && tpl.keywordFx?.enable === true;
  const bodySvg = useKeywordPreview
    ? buildSubtitleKeywordPreviewTextSvg({ tpl, w, h, body: { ...body, offsetXPct: 0 }, bodyY, bodyAnchor, bodyDominant })
        .replaceAll(`x="${Math.round(w / 2)}"`, `x="${bodyCenterX}"`)
    : safeBodyLines
        .map((line, idx) => {
          const yPos = bodyY + idx * (bodyFs + bodyGapPx);
          return `<text x="${bodyCenterX}" y="${yPos}" text-anchor="${bodyAnchor}" dominant-baseline="${bodyDominant}" letter-spacing="${bodyLetterSpacing}" font-family="${escXml(
            decodeFontValue(body.font || "Microsoft YaHei")
          )}" font-size="${bodyFs}" font-weight="${body.bold === false ? 700 : 900}" fill="${normalizeHex(
            body.color,
            "#ffffff"
          )}" style="${buildTextShadowCss(clamp(body.outline || 3, 0, 18), normalizeHex(body.outlineColor, "#000000"))}">${escXml(line)}</text>`;
        })
        .join("");
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      ${buildImageOrDefaultBg({ width: w, height: h, imageUrl: options.backgroundImage || tpl.previewBackground, mode: "subtitle" })}
      <rect width="${w}" height="${h}" fill="#000000" opacity="0.10" />
      ${titleHtml}
      ${bodySvg}
    </svg>
  `;
  return toSvgDataUrl(svg);
};

export const createCoverTemplatePreviewDataUrl = (template, options = {}) => {
  const tpl = template && typeof template === "object" ? template : {};
  const base = tpl.baseRes && typeof tpl.baseRes === "object" ? tpl.baseRes : { w: 1080, h: 1440 };
  const w = clamp(base.w || 1080, 240, 4096);
  const h = clamp(base.h || 1440, 240, 4096);
  const bg = tpl.background && typeof tpl.background === "object" ? tpl.background : {};
  const mask = tpl.mask && typeof tpl.mask === "object" ? tpl.mask : {};
  const main = tpl.main && typeof tpl.main === "object" ? tpl.main : {};
  const sub = tpl.sub && typeof tpl.sub === "object" ? tpl.sub : {};
  const mainLines = wrapText(String(options.mainText || "主标题示例"), Number(main.maxChars || 8) || 8, Number(main.lineCount || 2) || 2);
  const subLines = sub.enable === true ? wrapText(String(options.subText || "副标题示例"), Number(sub.maxChars || 14) || 14, Number(sub.lineCount || 2) || 2) : [];
  const alignToAnchor = (align) => (align === "left" ? "start" : align === "right" ? "end" : "middle");
  const mainAnchor = alignToAnchor(String(main.align || "center"));
  const subAnchor = alignToAnchor(String(sub.align || "center"));
  const mainX = Math.round((clamp(main.xPct || 50, 0, 100) / 100) * w);
  const mainY = Math.round((clamp(main.yPct || 10, 0, 100) / 100) * h);
  const subX = Math.round((clamp(sub.xPct || 50, 0, 100) / 100) * w);
  const subY = Math.round((clamp(sub.yPct || 76, 0, 100) / 100) * h);
  const mainFs = clamp(main.fontSize || 98, 10, 260);
  const subFs = clamp(sub.fontSize || 54, 10, 200);
  const mainGapPx = Math.round((clamp(main.lineGapPct || 4, 0, 30) / 100) * h);
  const subGapPx = Math.round((clamp(sub.lineGapPct || 4, 0, 30) / 100) * h);
  const mainLetterSpacing = clamp(main.letterSpacing || 0, 0, 20);
  const subLetterSpacing = clamp(sub.letterSpacing || 0, 0, 20);
  const dimPct = clamp(bg.dimPct || 10, 0, 80) / 100;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      ${buildImageOrDefaultBg({ width: w, height: h, imageUrl: tpl.previewBackground, mode: "cover" })}
      <rect width="${w}" height="${h}" fill="#000000" opacity="${Math.min(0.85, dimPct * 0.9)}" />
      ${
        mask.enable === true
          ? `<rect x="${Math.round((clamp(mask.xPct || 6, 0, 100) / 100) * w)}" y="${Math.round(
              (clamp(mask.yPct || 60, 0, 100) / 100) * h
            )}" width="${Math.round((clamp(mask.wPct || 88, 0, 100) / 100) * w)}" height="${Math.round(
              (clamp(mask.hPct || 22, 0, 100) / 100) * h
            )}" rx="24" ry="24" fill="${normalizeHex(mask.color, "#000000")}" opacity="${clamp(mask.alphaPct || 25, 0, 80) / 100}" />`
          : ""
      }
      ${mainLines
        .map((line, idx) => {
          const y = mainY + idx * (mainFs + mainGapPx);
          return `<text x="${mainX}" y="${y}" text-anchor="${mainAnchor}" letter-spacing="${mainLetterSpacing}" font-family="${escXml(
            decodeFontValue(main.font || "Microsoft YaHei")
          )}" font-size="${mainFs}" font-weight="${main.bold === false ? 700 : 900}" fill="${normalizeHex(
            main.color,
            "#f5c400"
          )}" style="${buildTextShadowCss(clamp(main.outline || 6, 0, 20), normalizeHex(main.outlineColor, "#000000"))}">${escXml(
            line || " "
          )}</text>`;
        })
        .join("")}
      ${subLines
        .map((line, idx) => {
          const y = subY + idx * (subFs + subGapPx);
          return `<text x="${subX}" y="${y}" text-anchor="${subAnchor}" letter-spacing="${subLetterSpacing}" font-family="${escXml(
            decodeFontValue(sub.font || "Microsoft YaHei")
          )}" font-size="${subFs}" font-weight="${sub.bold === false ? 700 : 900}" fill="${normalizeHex(
            sub.color,
            "#ffffff"
          )}" style="${buildTextShadowCss(clamp(sub.outline || 4, 0, 20), normalizeHex(sub.outlineColor, "#000000"))}">${escXml(
            line || " "
          )}</text>`;
        })
        .join("")}
    </svg>
  `;
  return toSvgDataUrl(svg);
};
