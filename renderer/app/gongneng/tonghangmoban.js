// 同行参考模板：只导入可复用的样式参数，不复制或生成任何人物图片。
// 这些模板会自动注入本地模板库，供首页和模板管理页直接选择。

const SUBTITLE_TPL_KEY = "ipfactory.subtitle.templates.v1";
const COVER_TPL_KEY = "ipfactory.cover.templates.v1";

const nowTs = () => Date.now();

const readStore = (key, fallbackActiveId = "system") => {
  try {
    const raw = localStorage.getItem(String(key || ""));
    const parsed = JSON.parse(raw || "{}");
    const templates = Array.isArray(parsed?.templates) ? parsed.templates.filter((item) => item && typeof item === "object") : [];
    const activeId = String(parsed?.activeId || "").trim() || fallbackActiveId;
    return { templates, activeId };
  } catch {
    return { templates: [], activeId: fallbackActiveId };
  }
};

const writeStore = (key, templates, activeId) => {
  localStorage.setItem(
    String(key || ""),
    JSON.stringify(
      {
        templates: Array.isArray(templates) ? templates : [],
        activeId: String(activeId || "system").trim() || "system"
      },
      null,
      2
    )
  );
};

const mergeTemplatesById = (existing, seeds) => {
  const list = Array.isArray(existing) ? existing.slice() : [];
  const ids = new Set(list.map((item) => String(item?.id || "").trim()).filter(Boolean));
  let changed = false;
  (Array.isArray(seeds) ? seeds : []).forEach((seed) => {
    const id = String(seed?.id || "").trim();
    if (!id || ids.has(id)) return;
    list.push(JSON.parse(JSON.stringify(seed)));
    ids.add(id);
    changed = true;
  });
  return { templates: list, changed };
};

const makeSubtitleTemplate = ({
  id,
  name,
  body,
  title,
  keywordFx
}) => ({
  id,
  name,
  updatedAt: nowTs(),
  baseRes: { w: 1080, h: 1920 },
  body: {
    pos: "bottom",
    font: "Microsoft YaHei",
    fontSize: 44,
    lineCount: 2,
    maxChars: 14,
    lineGapPct: 4,
    letterSpacing: 0,
    bold: true,
    shadow: true,
    color: "#ffffff",
    outlineColor: "#101010",
    outline: 3,
    marginVPct: 34,
    ...(body && typeof body === "object" ? body : {})
  },
  keywordFx: {
    enable: true,
    groups: {
      "重点词/成语词": { font: "Microsoft YaHei", fontSize: 54, bold: true, shadow: true, color: "#f5d400", outlineColor: "#000000", outline: 4 },
      描述词: { font: "Microsoft YaHei", fontSize: 48, bold: true, shadow: true, color: "#ffffff", outlineColor: "#000000", outline: 3 },
      行动词: { font: "Microsoft YaHei", fontSize: 48, bold: true, shadow: true, color: "#ff5f5f", outlineColor: "#000000", outline: 4 },
      情感词: { font: "Microsoft YaHei", fontSize: 48, bold: true, shadow: true, color: "#70d6ff", outlineColor: "#000000", outline: 4 }
    },
    ...(keywordFx && typeof keywordFx === "object" ? keywordFx : {})
  },
  title: {
    enable: true,
    text: "",
    lineCount: 2,
    maxChars: 10,
    lineGapPct: 6,
    letterSpacing: 0,
    topMarginPct: 10,
    lines: [
      { font: "Microsoft YaHei", fontSize: 66, bold: true, shadow: true, color: "#ffffff", outlineColor: "#000000", outline: 4 },
      { font: "Microsoft YaHei", fontSize: 60, bold: true, shadow: true, color: "#f5d400", outlineColor: "#000000", outline: 4 }
    ],
    ...(title && typeof title === "object" ? title : {})
  }
});

const makeCoverTemplate = ({
  id,
  name,
  background,
  mask,
  main,
  sub
}) => ({
  id,
  name,
  updatedAt: nowTs(),
  baseRes: { w: 1080, h: 1440 },
  background: {
    blur: 6,
    dimPct: 18,
    ...(background && typeof background === "object" ? background : {})
  },
  mask: {
    enable: false,
    xPct: 8,
    yPct: 58,
    wPct: 84,
    hPct: 24,
    color: "#000000",
    alphaPct: 20,
    ...(mask && typeof mask === "object" ? mask : {})
  },
  main: {
    align: "center",
    xPct: 50,
    yPct: 16,
    font: "Microsoft YaHei",
    fontSize: 110,
    bold: true,
    shadow: true,
    color: "#f5c400",
    outlineColor: "#000000",
    outline: 6,
    maxChars: 8,
    lineCount: 2,
    lineGapPct: 4,
    letterSpacing: 0,
    ...(main && typeof main === "object" ? main : {})
  },
  sub: {
    enable: true,
    align: "center",
    xPct: 50,
    yPct: 76,
    font: "Microsoft YaHei",
    fontSize: 56,
    bold: true,
    shadow: true,
    color: "#ffffff",
    outlineColor: "#000000",
    outline: 4,
    maxChars: 14,
    lineCount: 2,
    lineGapPct: 4,
    letterSpacing: 0,
    ...(sub && typeof sub === "object" ? sub : {})
  }
});

export const getTonghangSubtitleTemplateSeeds = () => [
  makeSubtitleTemplate({
    id: "tonghang-subtitle-jinhei",
    name: "参考同行·鎏金黑底",
    body: { font: "胡晓波男神体", fontSize: 36, color: "#ffffff", outlineColor: "#000000", outline: 2, marginVPct: 30 },
    title: {
      maxChars: 8,
      lineGapPct: 5,
      topMarginPct: 10,
      lines: [
        { font: "优设标题黑", fontSize: 80, bold: true, shadow: true, color: "#ffff00", outlineColor: "#000000", outline: 2 },
        { font: "优设标题黑", fontSize: 80, bold: true, shadow: true, color: "#ffffff", outlineColor: "#000000", outline: 3 }
      ]
    }
  }),
  makeSubtitleTemplate({
    id: "tonghang-subtitle-hongbai",
    name: "参考同行·红白对撞",
    body: { font: "USMCCyuanjiantecu", fontSize: 42, color: "#efe9e9", outlineColor: "#000000", outline: 3, marginVPct: 32 },
    title: {
      maxChars: 8,
      lineGapPct: 5,
      topMarginPct: 10,
      lines: [
        { font: "USMCCyuanjiantecu", fontSize: 76, bold: true, shadow: true, color: "#ffffff", outlineColor: "#a91919", outline: 3 },
        { font: "USMCCyuanjiantecu", fontSize: 76, bold: true, shadow: true, color: "#a30f0f", outlineColor: "#ffffff", outline: 4 }
      ]
    },
    keywordFx: {
      groups: {
        "重点词/成语词": { font: "USMCCyuanjiantecu", fontSize: 54, bold: true, shadow: true, color: "#850f0f", outlineColor: "#ffffff", outline: 3 },
        描述词: { font: "USMCCyuanjiantecu", fontSize: 48, bold: true, shadow: true, color: "#850f0f", outlineColor: "#ffffff", outline: 3 },
        行动词: { font: "USMCCyuanjiantecu", fontSize: 48, bold: true, shadow: true, color: "#850f0f", outlineColor: "#ffffff", outline: 3 },
        情感词: { font: "USMCCyuanjiantecu", fontSize: 44, bold: true, shadow: true, color: "#850f0f", outlineColor: "#fefefe", outline: 2 }
      }
    }
  }),
  makeSubtitleTemplate({
    id: "tonghang-subtitle-fense",
    name: "参考同行·柔粉描边",
    body: { font: "杨任东竹石体", fontSize: 44, color: "#ffffff", outlineColor: "#f13b83", outline: 3, marginVPct: 33 },
    title: {
      lineCount: 1,
      maxChars: 15,
      lineGapPct: 7,
      topMarginPct: 10,
      lines: [{ font: "猫啃珠圆体 MaokenZhuyuanTi", fontSize: 90, bold: true, shadow: true, color: "#f59ed1", outlineColor: "#000000", outline: 3 }]
    }
  }),
  makeSubtitleTemplate({
    id: "tonghang-subtitle-qinglan",
    name: "参考同行·青蓝清透",
    body: { font: "文鼎PL简中楷", fontSize: 44, color: "#ffffff", outlineColor: "#000000", outline: 2, marginVPct: 31 },
    title: {
      maxChars: 8,
      lineGapPct: 6,
      topMarginPct: 10,
      lines: [
        { font: "方正粗黑宋简体", fontSize: 80, bold: true, shadow: true, color: "#ffffff", outlineColor: "#000000", outline: 3 },
        { font: "方正粗黑宋简体", fontSize: 76, bold: true, shadow: true, color: "#0dade3", outlineColor: "#000000", outline: 3 }
      ]
    }
  }),
  makeSubtitleTemplate({
    id: "tonghang-subtitle-heidi-jinhuang",
    name: "参考同行·黑底金黄",
    body: { font: "月星楷", fontSize: 46, color: "#ffffff", outlineColor: "#ffffff", outline: 0, marginVPct: 35 },
    title: {
      lineCount: 1,
      maxChars: 15,
      lineGapPct: 7,
      topMarginPct: 10,
      lines: [{ font: "千图厚黑体", fontSize: 86, bold: true, shadow: true, color: "#efc52e", outlineColor: "#000000", outline: 3 }]
    },
    keywordFx: {
      groups: {
        "重点词/成语词": { font: "月星楷", fontSize: 52, bold: true, shadow: true, color: "#ffff00", outlineColor: "#000000", outline: 2 },
        描述词: { font: "月星楷", fontSize: 48, bold: true, shadow: true, color: "#ffff00", outlineColor: "#000000", outline: 2 },
        行动词: { font: "月星楷", fontSize: 48, bold: true, shadow: true, color: "#ffff00", outlineColor: "#000000", outline: 2 },
        情感词: { font: "月星楷", fontSize: 46, bold: true, shadow: true, color: "#ffff00", outlineColor: "#000000", outline: 2 }
      }
    }
  }),
  makeSubtitleTemplate({
    id: "tonghang-subtitle-lanse-biaoqian",
    name: "参考同行·蓝签对白",
    body: { font: "庞门正道标题体免费版", fontSize: 36, color: "#000000", outlineColor: "#ffffff", outline: 2, marginVPct: 33 },
    title: {
      maxChars: 8,
      lineGapPct: 5,
      topMarginPct: 10,
      lines: [
        { font: "优设标题黑", fontSize: 78, bold: true, shadow: true, color: "#ffffff", outlineColor: "#000000", outline: 3 },
        { font: "思源黑体 Normal", fontSize: 74, bold: true, shadow: false, color: "#000000", outlineColor: "#ffffff", outline: 0 }
      ]
    }
  })
];

export const getTonghangCoverTemplateSeeds = () => [
  makeCoverTemplate({
    id: "tonghang-cover-xiehuangbai",
    name: "参考同行·斜黄白（适配版）",
    background: { blur: 4, dimPct: 12 },
    mask: { enable: true, xPct: 26, yPct: 28, wPct: 40, hPct: 14, color: "#f5f5f5", alphaPct: 25 },
    main: { align: "center", xPct: 45, yPct: 38, font: "斗鱼追光体2.0", fontSize: 118, color: "#f5d400", outlineColor: "#000000", outline: 3, maxChars: 8, lineCount: 2 },
    sub: { enable: true, align: "center", xPct: 47, yPct: 67, font: "斗鱼追光体2.0", fontSize: 76, color: "#ffffff", outlineColor: "#000000", outline: 1, maxChars: 16, lineCount: 2 }
  }),
  makeCoverTemplate({
    id: "tonghang-cover-dasizibao",
    name: "参考同行·大四字报（适配版）",
    background: { blur: 2, dimPct: 18 },
    main: { align: "center", xPct: 53, yPct: 44, font: "USMCCyuanjiantecu", fontSize: 166, color: "#e6ca19", outlineColor: "#000000", outline: 0, maxChars: 2, lineCount: 2 },
    sub: { enable: true, align: "center", xPct: 51, yPct: 82, font: "USMCCyuanjiantecu", fontSize: 84, color: "#e37a16", outlineColor: "#000000", outline: 5, maxChars: 8, lineCount: 2 }
  }),
  makeCoverTemplate({
    id: "tonghang-cover-landi-baizi",
    name: "参考同行·蓝底白字（适配版）",
    background: { blur: 0, dimPct: 8 },
    mask: { enable: true, xPct: 10, yPct: 60, wPct: 80, hPct: 20, color: "#599dd9", alphaPct: 28 },
    main: { align: "center", xPct: 50, yPct: 64, font: "USMCCyuanjiantecu", fontSize: 106, color: "#cbcdb1", outlineColor: "#000000", outline: 0, maxChars: 8, lineCount: 2 },
    sub: { enable: true, align: "center", xPct: 50, yPct: 74, font: "千图厚黑体", fontSize: 120, color: "#ffffff", outlineColor: "#000000", outline: 8, maxChars: 10, lineCount: 2 }
  }),
  makeCoverTemplate({
    id: "tonghang-cover-huangbai-shimiao",
    name: "参考同行·黄白实描（适配版）",
    background: { blur: 10, dimPct: 22 },
    main: { align: "right", xPct: 88, yPct: 52, font: "1.程荣光刻楷", fontSize: 148, color: "#ffde05", outlineColor: "#000000", outline: 0, maxChars: 4, lineCount: 2 },
    sub: { enable: true, align: "center", xPct: 48, yPct: 18, font: "USMCCyuanjiantecu", fontSize: 76, color: "#ffffff", outlineColor: "#000000", outline: 0, maxChars: 12, lineCount: 2 }
  }),
  makeCoverTemplate({
    id: "tonghang-cover-renxiang-juzhong",
    name: "参考同行·人像居中（适配版）",
    background: { blur: 10, dimPct: 20 },
    main: { align: "center", xPct: 40, yPct: 68, font: "墨趣古风体", fontSize: 94, color: "#ffffff", outlineColor: "#000000", outline: 0, maxChars: 10, lineCount: 2 },
    sub: { enable: true, align: "center", xPct: 59, yPct: 79, font: "庞门正道标题体免费版", fontSize: 80, color: "#eaf273", outlineColor: "#000000", outline: 0, maxChars: 12, lineCount: 2 }
  }),
  makeCoverTemplate({
    id: "tonghang-cover-qinglan-xumiao",
    name: "参考同行·青蓝虚描（适配版）",
    background: { blur: 14, dimPct: 24 },
    main: { align: "right", xPct: 88, yPct: 26, font: "泼墨体", fontSize: 104, color: "#149fc2", outlineColor: "#000000", outline: 6, maxChars: 4, lineCount: 2 },
    sub: { enable: true, align: "center", xPct: 74, yPct: 58, font: "杨任东竹石体", fontSize: 70, color: "#149fc2", outlineColor: "#000000", outline: 0, maxChars: 12, lineCount: 2 }
  }),
  makeCoverTemplate({
    id: "tonghang-cover-fenghong-xubai",
    name: "参考同行·粉红虚白（适配版）",
    background: { blur: 12, dimPct: 18 },
    main: { align: "center", xPct: 37, yPct: 14, font: "庞门正道标题体免费版", fontSize: 118, color: "#e8c4df", outlineColor: "#e147c0", outline: 6, maxChars: 8, lineCount: 2 },
    sub: { enable: true, align: "center", xPct: 52, yPct: 25, font: "方正粗黑宋简体", fontSize: 76, color: "#ffffff", outlineColor: "#ef62e3", outline: 5, maxChars: 12, lineCount: 2 }
  }),
  makeCoverTemplate({
    id: "tonghang-cover-honghuang-xumiao",
    name: "参考同行·红黄虚描（适配版）",
    background: { blur: 12, dimPct: 22 },
    main: { align: "center", xPct: 55, yPct: 16, font: "泼墨体", fontSize: 118, color: "#d4ec74", outlineColor: "#000000", outline: 0, maxChars: 8, lineCount: 2 },
    sub: { enable: true, align: "left", xPct: 20, yPct: 64, font: "MaokenAssortedSans-Lite", fontSize: 78, color: "#7e1010", outlineColor: "#ffffff", outline: 6, maxChars: 10, lineCount: 2 }
  })
];

export const ensureTonghangSubtitleTemplateStore = ({ dispatchEvent = false } = {}) => {
  const current = readStore(SUBTITLE_TPL_KEY);
  const merged = mergeTemplatesById(current.templates, getTonghangSubtitleTemplateSeeds());
  if (merged.changed) {
    writeStore(SUBTITLE_TPL_KEY, merged.templates, current.activeId || "system");
    if (dispatchEvent) {
      try {
        window.dispatchEvent(new CustomEvent("ipfactory:subtitleTemplatesChanged"));
      } catch {}
    }
  }
  return { templates: merged.templates, activeId: current.activeId || "system", changed: merged.changed };
};

export const ensureTonghangCoverTemplateStore = ({ dispatchEvent = false } = {}) => {
  const current = readStore(COVER_TPL_KEY);
  const merged = mergeTemplatesById(current.templates, getTonghangCoverTemplateSeeds());
  if (merged.changed) {
    writeStore(COVER_TPL_KEY, merged.templates, current.activeId || "system");
    if (dispatchEvent) {
      try {
        window.dispatchEvent(new CustomEvent("ipfactory:coverTemplatesChanged"));
      } catch {}
    }
  }
  return { templates: merged.templates, activeId: current.activeId || "system", changed: merged.changed };
};
