// 同行监控数据层：负责管理对标账号、本地持久化、同步模拟、规则提醒和趋势数据。

const STORAGE_KEY = "ipfactory.monitor.workspace.v3";
const MAX_ALERTS = 60;
const MAX_WORKS = 18;
const MANUAL_WORK_ACCOUNT_ID = "__manual_work_pool__";

const PLATFORM_META = {
  douyin: { label: "抖音", short: "DY", color: "#8b5cf6", hosts: ["douyin.com", "iesdouyin.com"] },
  kuaishou: { label: "快手", short: "KS", color: "#f97316", hosts: ["kuaishou.com"] },
  xiaohongshu: { label: "小红书", short: "XHS", color: "#ef4444", hosts: ["xiaohongshu.com", "xhslink.com"] },
  shipinhao: { label: "视频号", short: "SPH", color: "#10b981", hosts: ["weixin.qq.com", "channels.weixin.qq.com"] },
  bilibili: { label: "B站", short: "B", color: "#3b82f6", hosts: ["bilibili.com", "b23.tv"] },
  unknown: { label: "其他平台", short: "OT", color: "#64748b", hosts: [] }
};

const TRACK_OPTIONS = ["实体门店", "教育培训", "本地生活", "家居建材", "外贸工厂", "企业服务"];
const MONITOR_PROVINCE_PATTERN =
  /(北京|天津|上海|重庆|河北|山西|辽宁|吉林|黑龙江|江苏|浙江|安徽|福建|江西|山东|河南|湖北|湖南|广东|海南|四川|贵州|云南|陕西|甘肃|青海|台湾|香港|澳门|内蒙古|广西|西藏|宁夏|新疆)/;

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

function randomInt(min, max) {
  const low = Math.min(Number(min || 0), Number(max || 0));
  const high = Math.max(Number(min || 0), Number(max || 0));
  return Math.round(low + Math.random() * (high - low));
}

function pickOne(list = []) {
  const items = Array.isArray(list) ? list : [];
  return items[randomInt(0, Math.max(items.length - 1, 0))] || "";
}

function clampNumber(value, min = 0) {
  return Math.max(min, Number(value || 0) || 0);
}

function normalizeMonitorGenderText(value) {
  const raw = String(value == null ? "" : value).trim();
  if (!raw) return "";
  if (raw === "1" || /male|man|男/i.test(raw)) return "男";
  if (raw === "2" || /female|woman|女/i.test(raw)) return "女";
  return raw;
}

function normalizeMonitorHandleText(value) {
  const raw = String(value == null ? "" : value).replace(/\s+/g, " ").trim();
  if (!raw) return "";
  const matched = raw.match(/^([A-Za-z0-9._-]{4,})/);
  if (matched && matched[1]) return String(matched[1]).trim();
  return raw
    .replace(/IP属地[:：]?.*$/i, "")
    .replace(/[男女](?:[\u4e00-\u9fa5·•]{2,})?$/g, "")
    .replace(/地区[:：]?.*$/i, "")
    .trim();
}

function normalizeMonitorRegionText(value) {
  return String(value == null ? "" : value)
    .replace(/^IP属地[:：]?\s*/i, "")
    .replace(/^地区[:：]?\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isNoisyMonitorMetaText(value) {
  const text = String(value == null ? "" : value).trim();
  if (!text) return false;
  const percentMatches = text.match(/%[0-9A-Fa-f]{2}/g) || [];
  const urlMatches = text.match(/https?:\/\/|www\.|\.com|\.cn|%2F|%3A|&[a-z_]+=|[?=_-]/gi) || [];
  return percentMatches.length >= 6 || urlMatches.length >= 8 || /[A-Za-z0-9+/=]{120,}/.test(text);
}

function extractMonitorProvinceText(value) {
  const text = normalizeMonitorRegionText(value);
  if (!text || isNoisyMonitorMetaText(text)) return "";
  const directHit = text.match(MONITOR_PROVINCE_PATTERN);
  if (directHit?.[1]) return String(directHit[1]).trim();
  const suffixHit = text.match(/([\u4e00-\u9fa5]{2,6}(?:省|自治区|特别行政区))/);
  return String(suffixHit?.[1] || "").trim();
}

function extractMonitorCityText(value) {
  const text = normalizeMonitorRegionText(value);
  if (!text || isNoisyMonitorMetaText(text)) return "";
  const isProvinceOnly = (candidate) => {
    const normalized = String(candidate || "").replace(/(?:省|市|自治区|特别行政区)$/g, "").trim();
    return !!normalized && MONITOR_PROVINCE_PATTERN.test(normalized);
  };
  const parts = text.split(/[·•]/).map((item) => String(item || "").trim()).filter(Boolean);
  if (parts.length >= 2) {
    const tail = String(parts[parts.length - 1] || "").trim();
    const exactTail = tail.match(/^([\u4e00-\u9fa5]{2,12}(?:市|州|盟|区|县))/);
    if (exactTail?.[1]) return String(exactTail[1]).trim();
    const shortTail = tail.match(/^([\u4e00-\u9fa5]{2,12})$/);
    if (shortTail?.[1] && !isProvinceOnly(shortTail[1])) return String(shortTail[1]).trim();
  }
  const exactText = text.match(/^([\u4e00-\u9fa5]{2,12})$/);
  if (exactText?.[1] && !isProvinceOnly(exactText[1])) return String(exactText[1]).trim();
  const cityHit = text.match(/([\u4e00-\u9fa5]{2,12}(?:市|州|盟|区|县))/);
  if (cityHit?.[1]) return String(cityHit[1]).trim();
  const shortText = text
    .replace(new RegExp(`^${MONITOR_PROVINCE_PATTERN.source}(?:省|市|自治区|特别行政区)?`, "i"), "")
    .replace(/^[·•\s-]+/, "")
    .trim();
  const shortHit = shortText.match(/^([\u4e00-\u9fa5]{2,12})/);
  if (shortHit?.[1] && !isProvinceOnly(shortHit[1])) return String(shortHit[1]).trim();
  return "";
}

function buildMonitorAccountMeta(rawHandle = "", rawLocation = "", rawGender = "", rawRegion = "") {
  const sourceHandle = String(rawHandle || "").trim();
  const sourceLocation = normalizeMonitorRegionText(rawLocation);
  const sourceGender = normalizeMonitorGenderText(rawGender);
  const sourceRegion = normalizeMonitorRegionText(rawRegion);
  const combined = `${sourceHandle} ${sourceLocation} ${sourceRegion}`.trim();
  const handle = normalizeMonitorHandleText(sourceHandle);
  const genderText = sourceGender || normalizeMonitorGenderText((combined.match(/(^|[\s:：])(男|女)(?=[\s\u4e00-\u9fa5·•]|$)/)?.[2] || "").trim());
  const regionText = extractMonitorCityText(sourceRegion) || "";
  const locationText = extractMonitorProvinceText(sourceLocation) || extractMonitorProvinceText(regionText) || "";
  return {
    handle,
    genderText,
    locationText,
    regionText
  };
}

function normalizeExactMonitorLocationText(value) {
  return extractMonitorProvinceText(value);
}

function normalizeExactMonitorRegionText(value) {
  return extractMonitorCityText(value);
}

function toIsoTime(input) {
  const date = input ? new Date(input) : new Date();
  return Number.isFinite(date.getTime()) ? date.toISOString() : new Date().toISOString();
}

function shiftDays(days = 0) {
  const date = new Date();
  date.setDate(date.getDate() + Number(days || 0));
  return date;
}

function formatDateKey(input) {
  const date = input ? new Date(input) : new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function normalizeUrl(url = "") {
  const raw = String(url || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw.replace(/^\/+/, "")}`;
}

export function extractMonitorFirstUrl(input = "") {
  const text = String(input || "").trim();
  if (!text) return "";
  const match = text.match(/https?:\/\/[^\s]+/i);
  return match ? String(match[0] || "").replace(/[)\]}>,，。！!]+$/g, "") : "";
}

export function detectMonitorPlatform(url = "") {
  const normalized = normalizeUrl(url);
  if (!normalized) return "unknown";
  try {
    const host = new URL(normalized).hostname.toLowerCase();
    const matched = Object.entries(PLATFORM_META).find(([, meta]) => meta.hosts.some((item) => host.includes(item)));
    return matched ? matched[0] : "unknown";
  } catch {
    return "unknown";
  }
}

export function detectMonitorPlatformFromText(input = "") {
  const firstUrl = extractMonitorFirstUrl(input);
  if (firstUrl) return detectMonitorPlatform(firstUrl);
  const text = String(input || "").trim().toLowerCase();
  if (!text) return "unknown";
  if (text.includes("douyin.com") || text.includes("iesdouyin.com")) return "douyin";
  if (text.includes("kuaishou.com")) return "kuaishou";
  if (text.includes("xiaohongshu.com") || text.includes("xhslink.com")) return "xiaohongshu";
  if (text.includes("channels.weixin.qq.com") || text.includes("weixin.qq.com")) return "shipinhao";
  if (text.includes("bilibili.com") || text.includes("b23.tv")) return "bilibili";
  return "unknown";
}

function buildHandleFromUrl(url = "") {
  try {
    const parsed = new URL(normalizeUrl(url));
    const parts = String(parsed.pathname || "")
      .split("/")
      .map((item) => String(item || "").trim())
      .filter(Boolean);
    return parts.pop() || parsed.hostname.replace(/\./g, "_");
  } catch {
    return `monitor_${Math.random().toString(36).slice(2, 7)}`;
  }
}

function createTrendHistory({ fans = 0, likes = 0, worksCount = 0 } = {}) {
  const days = 30;
  const list = [];
  let fansSeed = clampNumber(fans);
  let likesSeed = clampNumber(likes);
  let worksSeed = clampNumber(worksCount);
  for (let i = days - 1; i >= 0; i -= 1) {
    fansSeed = clampNumber(fansSeed - randomInt(120, 820));
    likesSeed = clampNumber(likesSeed - randomInt(400, 4200));
    if (i % 6 === 0) worksSeed = clampNumber(worksSeed - 1);
    list.push({
      date: formatDateKey(shiftDays(-i)),
      fans: fansSeed,
      likes: likesSeed,
      worksCount: worksSeed
    });
  }
  return list;
}

function createWorkItem(accountName, index, platform) {
  const topicPool = {
    douyin: ["门店引流", "成交话术", "口播拆解", "爆款结构", "私域承接"],
    kuaishou: ["直播预热", "短视频转化", "工厂展示", "账号起号", "本地拓客"],
    xiaohongshu: ["种草内容", "笔记封面", "客资转化", "门店案例", "真实体验"],
    shipinhao: ["私域成交", "微信承接", "案例复盘", "复购策略", "社群引导"],
    bilibili: ["深度拆解", "同行分析", "数据复盘", "内容策略", "行业洞察"],
    unknown: ["内容复盘", "账号观察", "运营动作", "热点跟进", "作品追踪"]
  };
  const title = `${pickOne(topicPool[platform] || topicPool.unknown)}｜${accountName} 第 ${index + 1} 条重点作品`;
  return {
    id: uid("work"),
    title,
    type: pickOne(["视频", "图文", "口播", "混剪"]),
    likes: randomInt(180, 8200),
    comments: randomInt(8, 480),
    shares: randomInt(5, 320),
    collects: randomInt(12, 560),
    publishAt: toIsoTime(shiftDays(-randomInt(0, 14))),
    status: pickOne(["持续增长", "稳定观察", "需重点复盘"]),
    note: pickOne(["评论区互动高", "点赞增速快", "转发表现突出", "适合拆选题", "封面点击率高"])
  };
}

function createRule(overrides = {}) {
  const base = {
    id: uid("rule"),
    name: "新规则",
    enabled: true,
    metric: "fans_delta",
    operator: ">=",
    value: 500,
    platform: "all",
    remindType: "toast"
  };
  return { ...base, ...(overrides && typeof overrides === "object" ? overrides : {}) };
}

function createAccountFromSeed({ url, name, track, platform }) {
  const finalPlatform = platform || detectMonitorPlatform(url);
  const handle = buildHandleFromUrl(url);
  const fans = randomInt(2200, 280000);
  const likes = randomInt(8000, 2400000);
  const worksCount = randomInt(18, 168);
  const works = Array.from({ length: randomInt(4, 8) }, (_, index) => createWorkItem(name, index, finalPlatform));
  return {
    id: uid("acct"),
    platform: finalPlatform,
    name,
    handle,
    homepageUrl: normalizeUrl(url),
    track: track || pickOne(TRACK_OPTIONS),
    fans,
    likes,
    worksCount,
    avatarText: String(name || handle || "同").trim().slice(0, 2),
    lastSyncAt: toIsoTime(shiftDays(-randomInt(0, 2))),
    syncStatus: pickOne(["正常监控", "等待同步", "重点关注"]),
    compareNote: pickOne(["最近发文频率提升", "作品互动较稳定", "粉丝增长趋缓", "点赞转粉较高"]),
    delta: {
      fans: randomInt(50, 2200),
      likes: randomInt(200, 8600),
      works: randomInt(0, 3)
    },
    works,
    trendHistory: createTrendHistory({ fans, likes, worksCount })
  };
}

export function getMonitorPlatformList() {
  return Object.entries(PLATFORM_META)
    .filter(([key]) => key !== "unknown")
    .map(([value, meta]) => ({ value, label: meta.label, short: meta.short, color: meta.color }));
}

export function getMonitorPlatformMeta(platform = "") {
  return PLATFORM_META[String(platform || "").trim()] || PLATFORM_META.unknown;
}

function buildDefaultWorkspace() {
  const accounts = [
    createAccountFromSeed({
      url: "https://www.douyin.com/user/MS4wLjABAAAA实体门店案例",
      name: "牛会",
      track: "实体门店",
      platform: "douyin"
    }),
    createAccountFromSeed({
      url: "https://www.douyin.com/user/MS4wLjABAAAA外贸增长",
      name: "凡人很烦",
      track: "外贸工厂",
      platform: "douyin"
    }),
    createAccountFromSeed({
      url: "https://www.xiaohongshu.com/user/profile/企业内容研究所",
      name: "内容研究所",
      track: "企业服务",
      platform: "xiaohongshu"
    }),
    createAccountFromSeed({
      url: "https://www.kuaishou.com/profile/门店获客增长",
      name: "门店获客增长",
      track: "本地生活",
      platform: "kuaishou"
    }),
    createAccountFromSeed({
      url: "https://channels.weixin.qq.com/profile/微信成交增长",
      name: "微信成交增长",
      track: "私域成交",
      platform: "shipinhao"
    })
  ];
  return {
    accounts,
    manualWorks: [],
    settings: {
      autoSyncEnabled: true,
      syncIntervalMinutes: 30,
      remindMode: "toast",
      groupMode: "platform",
      downloadDirectory: ""
    },
    rules: [
      createRule({ name: "粉丝增长提醒", metric: "fans_delta", operator: ">=", value: 1000 }),
      createRule({ name: "点赞飙升提醒", metric: "likes_delta", operator: ">=", value: 5000 }),
      createRule({ name: "新增作品提醒", metric: "new_works", operator: ">=", value: 1 })
    ],
    alerts: [
      {
        id: uid("alert"),
        accountId: accounts[0].id,
        accountName: accounts[0].name,
        platform: accounts[0].platform,
        level: "high",
        message: "近一次同步中点赞增量超过 5000，建议优先拆解最新作品。",
        createdAt: toIsoTime(shiftDays(-1))
      }
    ]
  };
}

function normalizeWorkItem(item, accountName, platform) {
  const source = item && typeof item === "object" ? item : {};
  return {
    id: String(source.id || uid("work")),
    title: String(source.title || `${accountName} 重点作品`).trim(),
    copywriting: String(source.copywriting || source.desc || source.title || "").trim(),
    type: String(source.type || "视频").trim(),
    likes: clampNumber(source.likes),
    comments: clampNumber(source.comments),
    shares: clampNumber(source.shares),
    collects: clampNumber(source.collects),
    publishAt: toIsoTime(source.publishAt),
    status: String(source.status || "稳定观察").trim(),
    note: String(source.note || "").trim(),
    platform: String(source.platform || platform || "unknown").trim(),
    awemeId: String(source.awemeId || "").trim(),
    url: normalizeUrl(source.url || source.awemeUrl || ""),
    coverUrl: String(source.coverUrl || source.cover?.url_list?.[0] || "").trim(),
    videoUrl: String(source.videoUrl || "").trim(),
    resolution: String(source.resolution || "").trim(),
    durationSec: clampNumber(source.durationSec),
    imageCount: clampNumber(source.imageCount),
    extractFrom: String(source.extractFrom || "").trim(),
    contentExtractedAt: String(source.contentExtractedAt || "").trim()
  };
}

function resolveManualWorkAccountName(source) {
  const author = source?.author && typeof source.author === "object" ? source.author : {};
  const currentName = String(source?.accountName || "").trim();
  if (currentName && !/^(手动提取|手动作品|作者待获取)$/i.test(currentName)) return currentName;
  return (
    String(source?.authorName || "").trim() ||
    String(source?.nickname || "").trim() ||
    String(author?.nickname || "").trim() ||
    currentName ||
    "手动提取"
  );
}

function normalizeManualWorkItem(item) {
  const source = item && typeof item === "object" ? item : {};
  const platform = String(source.platform || "douyin").trim() || "douyin";
  const accountName = resolveManualWorkAccountName(source);
  return {
    ...normalizeWorkItem(source, accountName, platform),
    accountId: MANUAL_WORK_ACCOUNT_ID,
    accountName,
    homepageUrl: normalizeUrl(source.homepageUrl || source.homeUrl || ""),
    sourceType: "manual_single_work"
  };
}

function normalizeTrendHistory(history = [], account = {}) {
  const list = Array.isArray(history) ? history : [];
  if (!list.length) {
    return createTrendHistory({
      fans: clampNumber(account.fans),
      likes: clampNumber(account.likes),
      worksCount: clampNumber(account.worksCount)
    });
  }
  return list.map((item) => ({
    date: formatDateKey(item?.date || new Date()),
    fans: clampNumber(item?.fans),
    likes: clampNumber(item?.likes),
    worksCount: clampNumber(item?.worksCount)
  }));
}

function normalizeAccount(item) {
  const account = item && typeof item === "object" ? item : {};
  const detectedPlatform = detectMonitorPlatform(account.homepageUrl || "");
  const platform = detectedPlatform !== "unknown" ? detectedPlatform : String(account.platform || "unknown").trim() || "unknown";
  const meta = buildMonitorAccountMeta(account.handle, account.locationText || account.region || account.ipLocation || "", account.genderText || account.genderLabel || account.gender || account.sex || "", account.regionText || account.region || "");
  const explicitLocationText =
    normalizeExactMonitorLocationText(account.locationText || "") ||
    normalizeExactMonitorLocationText(account.ipLocation || "") ||
    String(meta.locationText || "").trim();
  const explicitRegionText =
    normalizeExactMonitorRegionText(account.regionText || "") ||
    normalizeExactMonitorRegionText(account.city || "") ||
    String(meta.regionText || "").trim();
  const normalizedWorks = (Array.isArray(account.works) ? account.works : [])
    .map((work) => normalizeWorkItem(work, account.name, platform))
    .map((work) => {
      if (
        platform === "douyin" &&
        clampNumber(account.likes) > 0 &&
        clampNumber(work.likes) === clampNumber(account.likes) &&
        clampNumber(work.comments) <= 1 &&
        clampNumber(work.shares) <= 1 &&
        clampNumber(work.collects) <= 1
      ) {
        return {
          ...work,
          likes: 0,
          comments: 0,
          shares: 0,
          collects: 0,
          note: String(work.note || "该作品互动数据疑似被账号总点赞污染，等待重新提取。").trim() || "该作品互动数据疑似被账号总点赞污染，等待重新提取。"
        };
      }
      return work;
    })
    .slice(0, MAX_WORKS);
  return {
    id: String(account.id || uid("acct")),
    platform,
    name: String(account.name || account.handle || "未命名同行").trim(),
    handle: String(meta.handle || account.handle || buildHandleFromUrl(account.homepageUrl || "")).trim(),
    homepageUrl: normalizeUrl(account.homepageUrl || ""),
    track: String(account.track || pickOne(TRACK_OPTIONS)).trim(),
    ipLocation: String(explicitLocationText || "").trim(),
    locationText: String(explicitLocationText || "").trim(),
    city: String(explicitRegionText || "").trim(),
    regionText: String(explicitRegionText || "").trim(),
    genderText: normalizeMonitorGenderText(meta.genderText || ""),
    fans: clampNumber(account.fans),
    likes: clampNumber(account.likes),
    worksCount: clampNumber(account.worksCount),
    avatarText: String(account.avatarText || account.name || account.handle || "同").trim().slice(0, 2),
    avatarUrl: String(account.avatarUrl || "").trim(),
    secUid: String(account.secUid || "").trim(),
    signature: String(account.signature || "").trim(),
    sourceType: String(account.sourceType || "manual").trim() || "manual",
    lastSyncAt: toIsoTime(account.lastSyncAt),
    syncStatus: String(account.syncStatus || "等待同步").trim(),
    compareNote: String(account.compareNote || "建议持续观察发文节奏和互动结构。").trim(),
    delta: {
      fans: clampNumber(account?.delta?.fans),
      likes: clampNumber(account?.delta?.likes),
      works: clampNumber(account?.delta?.works)
    },
    works: normalizedWorks,
    trendHistory: normalizeTrendHistory(account.trendHistory, account)
  };
}

function normalizeRule(item) {
  const source = item && typeof item === "object" ? item : {};
  return createRule({
    id: String(source.id || uid("rule")),
    name: String(source.name || "新规则").trim(),
    enabled: source.enabled !== false,
    metric: String(source.metric || "fans_delta").trim(),
    operator: String(source.operator || ">=").trim(),
    value: clampNumber(source.value, 1),
    platform: String(source.platform || "all").trim(),
    remindType: String(source.remindType || "toast").trim()
  });
}

function normalizeAlert(item) {
  const source = item && typeof item === "object" ? item : {};
  return {
    id: String(source.id || uid("alert")),
    accountId: String(source.accountId || "").trim(),
    accountName: String(source.accountName || "未命名同行").trim(),
    platform: String(source.platform || "unknown").trim(),
    level: String(source.level || "info").trim(),
    message: String(source.message || "").trim(),
    createdAt: toIsoTime(source.createdAt)
  };
}

function normalizeWorkspace(data) {
  const source = data && typeof data === "object" ? data : {};
  const fallback = buildDefaultWorkspace();
  return {
    accounts: (Array.isArray(source.accounts) ? source.accounts : fallback.accounts).map(normalizeAccount),
    manualWorks: (Array.isArray(source.manualWorks) ? source.manualWorks : fallback.manualWorks).map(normalizeManualWorkItem).slice(0, 200),
    settings: {
      autoSyncEnabled: source?.settings?.autoSyncEnabled !== false,
      syncIntervalMinutes: clampNumber(source?.settings?.syncIntervalMinutes || fallback.settings.syncIntervalMinutes, 5),
      remindMode: String(source?.settings?.remindMode || fallback.settings.remindMode).trim() || "toast",
      groupMode: String(source?.settings?.groupMode || fallback.settings.groupMode).trim() || "platform",
      downloadDirectory: String(source?.settings?.downloadDirectory || fallback.settings.downloadDirectory || "").trim()
    },
    rules: (Array.isArray(source.rules) ? source.rules : fallback.rules).map(normalizeRule),
    alerts: (Array.isArray(source.alerts) ? source.alerts : fallback.alerts).map(normalizeAlert).slice(0, MAX_ALERTS)
  };
}

export function readMonitorWorkspace() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const fallback = buildDefaultWorkspace();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fallback));
      return normalizeWorkspace(fallback);
    }
    return normalizeWorkspace(JSON.parse(raw));
  } catch {
    const fallback = buildDefaultWorkspace();
    return normalizeWorkspace(fallback);
  }
}

export function writeMonitorWorkspace(workspace) {
  const normalized = normalizeWorkspace(workspace);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function createMonitorAccountFromUrl(url, options = {}) {
  const homepageUrl = normalizeUrl(url);
  const platform = detectMonitorPlatform(homepageUrl);
  const handle = buildHandleFromUrl(homepageUrl);
  const meta = getMonitorPlatformMeta(platform);
  return normalizeAccount(
    createAccountFromSeed({
      url: homepageUrl,
      name: String(options?.name || `${meta.label}同行-${handle.slice(0, 6)}`).trim(),
      track: String(options?.track || pickOne(TRACK_OPTIONS)).trim(),
      platform
    })
  );
}

function compareMetric(left, operator, right) {
  if (operator === ">") return left > right;
  if (operator === "<") return left < right;
  if (operator === "<=") return left <= right;
  if (operator === "=" || operator === "==") return left === right;
  return left >= right;
}

function buildRuleMetricMap(delta, account) {
  return {
    fans_delta: clampNumber(delta.fans),
    likes_delta: clampNumber(delta.likes),
    new_works: clampNumber(delta.works),
    works_total: clampNumber(account.worksCount),
    fans_total: clampNumber(account.fans),
    likes_total: clampNumber(account.likes)
  };
}

function pushTrendPoint(account) {
  const history = Array.isArray(account.trendHistory) ? account.trendHistory.slice(-29) : [];
  const todayKey = formatDateKey(new Date());
  const current = {
    date: todayKey,
    fans: clampNumber(account.fans),
    likes: clampNumber(account.likes),
    worksCount: clampNumber(account.worksCount)
  };
  if (history.length && history[history.length - 1].date === todayKey) {
    history[history.length - 1] = current;
  } else {
    history.push(current);
  }
  return history;
}

export function syncMonitorWorkspace(workspace, targetIds = []) {
  const current = normalizeWorkspace(workspace);
  const selectedIds = Array.isArray(targetIds) && targetIds.length ? targetIds.map((item) => String(item || "").trim()) : [];
  const nextAlerts = [];
  const nextAccounts = current.accounts.map((item) => {
    if (selectedIds.length && !selectedIds.includes(item.id)) return item;
    const worksGrowth = Math.random() > 0.55 ? randomInt(0, 2) : 0;
    const delta = {
      fans: randomInt(120, 3200),
      likes: randomInt(500, 12000),
      works: worksGrowth
    };
    const next = {
      ...item,
      fans: item.fans + delta.fans,
      likes: item.likes + delta.likes,
      worksCount: item.worksCount + delta.works,
      lastSyncAt: toIsoTime(new Date()),
      syncStatus: delta.works > 0 ? "检测到新作品" : "正常监控",
      compareNote: delta.works > 0 ? "本轮同步检测到新作品，建议优先查看标题和互动结构。" : "本轮同步完成，建议继续观察粉丝与点赞增速。",
      delta
    };
    if (delta.works > 0) {
      const latestWork = createWorkItem(next.name, 0, next.platform);
      next.works = [latestWork];
    }
    next.trendHistory = pushTrendPoint(next);
    const metricMap = buildRuleMetricMap(delta, next);
    current.rules.forEach((rule) => {
      if (!rule.enabled) return;
      if (rule.platform !== "all" && rule.platform !== next.platform) return;
      const metricValue = clampNumber(metricMap[rule.metric]);
      if (!compareMetric(metricValue, rule.operator, clampNumber(rule.value))) return;
      nextAlerts.push({
        id: uid("alert"),
        accountId: next.id,
        accountName: next.name,
        platform: next.platform,
        level: metricValue >= clampNumber(rule.value) * 2 ? "high" : "info",
        message: `${rule.name}：${next.name}${rule.metric === "new_works" ? ` 新增作品 ${metricValue} 条` : ` 当前命中值 ${metricValue}`}`,
        createdAt: toIsoTime(new Date())
      });
    });
    return next;
  });
  return normalizeWorkspace({
    ...current,
    accounts: nextAccounts,
    manualWorks: current.manualWorks,
    alerts: [...nextAlerts, ...current.alerts].slice(0, MAX_ALERTS)
  });
}

function buildTrendHistoryFromSnapshot(account, { fans = 0, likes = 0, worksCount = 0 } = {}) {
  const history = Array.isArray(account?.trendHistory) ? account.trendHistory.slice(-29) : [];
  const current = {
    date: formatDateKey(new Date()),
    fans: clampNumber(fans),
    likes: clampNumber(likes),
    worksCount: clampNumber(worksCount)
  };
  if (history.length && history[history.length - 1].date === current.date) history[history.length - 1] = current;
  else history.push(current);
  return history;
}

export function createMonitorAccountFromSnapshot(snapshot, options = {}) {
  const source = snapshot && typeof snapshot === "object" ? snapshot : {};
  const homepageUrl = String(source.homepageUrl || source.resolvedUrl || source.sourceUrl || "").trim();
  const meta = buildMonitorAccountMeta(source.handle, source.locationText || "", source.genderText || source.genderLabel || source.gender || source.sex || "", source.regionText || source.region || "");
  const exactLocationText = normalizeExactMonitorLocationText(source.locationText || source.ipLocation || "") || String(meta.locationText || "").trim();
  const exactRegionText = normalizeExactMonitorRegionText(source.regionText || source.city || source.region || "") || String(meta.regionText || "").trim();
  const accountName = String(options?.name || source.accountName || source.handle || "未命名同行").trim();
  const works = Array.isArray(source.works) ? source.works : [];
  return normalizeAccount({
    id: String(options?.id || uid("acct")),
    platform: String(source.platform || detectMonitorPlatformFromText(homepageUrl)).trim() || "unknown",
    name: accountName,
    handle: String(meta.handle || source.handle || "").trim(),
    homepageUrl,
    track: String(options?.track || pickOne(TRACK_OPTIONS)).trim(),
    ipLocation: String(exactLocationText || "").trim(),
    locationText: String(exactLocationText || "").trim(),
    city: String(exactRegionText || "").trim(),
    regionText: String(exactRegionText || "").trim(),
    genderText: normalizeMonitorGenderText(meta.genderText || ""),
    fans: clampNumber(source.fans),
    likes: clampNumber(source.likes),
    worksCount: clampNumber(source.worksCount || works.length),
    avatarText: String(source.avatarText || accountName || "同").trim().slice(0, 2),
    avatarUrl: String(source.avatarUrl || "").trim(),
    secUid: String(source.secUid || "").trim(),
    signature: String(source.signature || "").trim(),
    sourceType: String(source.platform || "").trim() === "douyin" ? "live_douyin" : "manual",
    lastSyncAt: toIsoTime(new Date()),
    syncStatus: String(source.syncStatus || "真实同步完成").trim(),
    compareNote: String(source.compareNote || "主页数据已同步。").trim(),
    delta: {
      fans: 0,
      likes: 0,
      works: 0
    },
    works,
    trendHistory: buildTrendHistoryFromSnapshot(null, {
      fans: clampNumber(source.fans),
      likes: clampNumber(source.likes),
      worksCount: clampNumber(source.worksCount || works.length)
    })
  });
}

export function mergeMonitorAccountSnapshot(account, snapshot) {
  const current = normalizeAccount(account);
  const source = snapshot && typeof snapshot === "object" ? snapshot : {};
  const meta = buildMonitorAccountMeta(
    source.handle || current.handle || "",
    source.locationText || current.locationText || source.regionText || current.regionText || "",
    source.genderText || source.genderLabel || source.gender || source.sex || current.genderText || "",
    source.regionText || current.regionText || ""
  );
  const exactLocationText =
    normalizeExactMonitorLocationText(source.locationText || source.ipLocation || "") ||
    normalizeExactMonitorLocationText(current.locationText || "") ||
    String(meta.locationText || "").trim();
  const exactRegionText =
    normalizeExactMonitorRegionText(source.regionText || source.city || source.region || "") ||
    normalizeExactMonitorRegionText(current.regionText || "") ||
    String(meta.regionText || "").trim();
  const works = Array.isArray(source.works) && source.works.length ? source.works : current.works;
  const nextFans = clampNumber(source.fans || current.fans);
  const nextLikes = clampNumber(source.likes || current.likes);
  const nextWorksCount = clampNumber(source.worksCount || works.length || current.worksCount);
  const delta = {
    fans: Math.max(0, nextFans - clampNumber(current.fans)),
    likes: Math.max(0, nextLikes - clampNumber(current.likes)),
    works: Math.max(0, nextWorksCount - clampNumber(current.worksCount))
  };
  return normalizeAccount({
    ...current,
    platform: String(source.platform || current.platform || "").trim() || current.platform,
    name: String(source.accountName || current.name || "").trim() || current.name,
    handle: String(meta.handle || source.handle || current.handle || "").trim() || current.handle,
    homepageUrl: String(source.homepageUrl || source.resolvedUrl || current.homepageUrl || "").trim() || current.homepageUrl,
    track: String(source.track || current.track || "").trim() || current.track,
    ipLocation: String(exactLocationText || "").trim(),
    locationText: String(exactLocationText || "").trim(),
    city: String(exactRegionText || "").trim(),
    regionText: String(exactRegionText || "").trim(),
    genderText: normalizeMonitorGenderText(meta.genderText || current.genderText || ""),
    fans: nextFans,
    likes: nextLikes,
    worksCount: nextWorksCount,
    avatarText: String(source.avatarText || current.avatarText || current.name || "同").trim().slice(0, 2),
    avatarUrl: String(source.avatarUrl || current.avatarUrl || "").trim(),
    secUid: String(source.secUid || current.secUid || "").trim(),
    signature: String(source.signature || current.signature || "").trim(),
    sourceType: String(source.platform || "").trim() === "douyin" ? "live_douyin" : String(current.sourceType || "manual").trim(),
    lastSyncAt: toIsoTime(new Date()),
    syncStatus: String(source.syncStatus || "真实同步完成").trim(),
    compareNote: String(source.compareNote || current.compareNote || "").trim() || current.compareNote,
    delta,
    works,
    trendHistory: buildTrendHistoryFromSnapshot(current, {
      fans: nextFans,
      likes: nextLikes,
      worksCount: nextWorksCount
    })
  });
}

export function mergeMonitorWorkSummary(account, workId, summary = {}) {
  const current = normalizeAccount(account);
  const targetId = String(workId || "").trim();
  const source = summary && typeof summary === "object" ? summary : {};
  let matched = false;
  const mapped = current.works.map((item) => {
    const itemId = String(item?.id || "").trim();
    const awemeId = String(item?.awemeId || "").trim();
    if (targetId && itemId !== targetId && awemeId !== targetId) return item;
    matched = true;
    return normalizeWorkItem(
      {
        ...item,
        ...source,
        copywriting: String(source.copywriting || source.desc || item.copywriting || item.title || "").trim(),
        id: itemId || targetId || String(source.id || ""),
        awemeId: String(source.awemeId || awemeId || targetId).trim(),
        url: String(source.url || source.awemeUrl || item.url || "").trim() || item.url,
        videoUrl: String(source.videoUrl || item.videoUrl || "").trim(),
        coverUrl: String(source.coverUrl || item.coverUrl || "").trim(),
        extractFrom: String(source.extractFrom || "作品内容提取").trim(),
        contentExtractedAt: String(source.contentExtractedAt || new Date().toISOString()).trim()
      },
      current.name,
      current.platform
    );
  });
  const nextWorks = matched
    ? mapped
    : [
        normalizeWorkItem(
          {
            ...source,
            copywriting: String(source.copywriting || source.desc || source.title || "").trim(),
            id: String(source.id || source.awemeId || targetId || uid("work")).trim(),
            awemeId: String(source.awemeId || targetId || "").trim(),
            extractFrom: String(source.extractFrom || "单作品链接提取").trim(),
            contentExtractedAt: String(source.contentExtractedAt || new Date().toISOString()).trim()
          },
          current.name,
          current.platform
        ),
        ...mapped
      ];
  return normalizeAccount({
    ...current,
    works: nextWorks.slice(0, MAX_WORKS)
  });
}

export function upsertManualMonitorWork(manualWorks = [], workId = "", summary = {}) {
  const current = Array.isArray(manualWorks) ? manualWorks.map(normalizeManualWorkItem) : [];
  const targetId = String(workId || "").trim();
  const source = summary && typeof summary === "object" ? summary : {};
  let matched = false;
  const mapped = current.map((item) => {
    const itemId = String(item?.id || "").trim();
    const awemeId = String(item?.awemeId || "").trim();
    if (targetId && itemId !== targetId && awemeId !== targetId) return item;
    matched = true;
    return normalizeManualWorkItem({
      ...item,
      ...source,
      copywriting: String(source.copywriting || source.desc || item.copywriting || item.title || "").trim(),
      id: itemId || targetId || String(source.id || ""),
      awemeId: String(source.awemeId || awemeId || targetId).trim(),
      url: String(source.url || source.awemeUrl || item.url || "").trim() || item.url,
      videoUrl: String(source.videoUrl || item.videoUrl || "").trim(),
      coverUrl: String(source.coverUrl || item.coverUrl || "").trim(),
      extractFrom: String(source.extractFrom || "单条作品链接提取").trim(),
      contentExtractedAt: String(source.contentExtractedAt || new Date().toISOString()).trim(),
        accountName: resolveManualWorkAccountName({
          ...item,
          ...source,
          accountName: String(source.accountName || item.accountName || "").trim()
        }),
      homepageUrl: String(source.homepageUrl || source.homeUrl || item.homepageUrl || "").trim()
    });
  });
  const nextWorks = matched
    ? mapped
    : [
        normalizeManualWorkItem({
          ...source,
          copywriting: String(source.copywriting || source.desc || source.title || "").trim(),
          id: String(source.id || source.awemeId || targetId || uid("work")).trim(),
          awemeId: String(source.awemeId || targetId || "").trim(),
          extractFrom: String(source.extractFrom || "单条作品链接提取").trim(),
          contentExtractedAt: String(source.contentExtractedAt || new Date().toISOString()).trim(),
          accountName: resolveManualWorkAccountName(source),
          homepageUrl: String(source.homepageUrl || source.homeUrl || "").trim()
        }),
        ...mapped
      ];
  return nextWorks.slice(0, 200);
}

export function getManualMonitorWorkAccountId() {
  return MANUAL_WORK_ACCOUNT_ID;
}

export function buildMonitorAlertsByRules(rules = [], account = {}) {
  const target = normalizeAccount(account);
  const metricMap = buildRuleMetricMap(target.delta, target);
  return (Array.isArray(rules) ? rules : [])
    .filter((rule) => {
      if (!rule?.enabled) return false;
      if (rule.platform !== "all" && rule.platform !== target.platform) return false;
      return compareMetric(clampNumber(metricMap[rule.metric]), rule.operator, clampNumber(rule.value));
    })
    .map((rule) => ({
      id: uid("alert"),
      accountId: String(target.id || "").trim(),
      accountName: String(target.name || "未命名同行").trim(),
      platform: String(target.platform || "unknown").trim(),
      level: clampNumber(metricMap[rule.metric]) >= clampNumber(rule.value) * 2 ? "high" : "info",
      message: `${String(rule.name || "新规则").trim()}：${String(target.name || "未命名同行").trim()}${
        rule.metric === "new_works" ? ` 新增作品 ${clampNumber(metricMap[rule.metric])} 条` : ` 当前命中值 ${clampNumber(metricMap[rule.metric])}`
      }`,
      createdAt: toIsoTime(new Date())
    }));
}

export function buildEmptyMonitorRule() {
  return createRule({ name: `新规则-${randomInt(10, 99)}` });
}

export function getMonitorTrackOptions() {
  return TRACK_OPTIONS.slice();
}
