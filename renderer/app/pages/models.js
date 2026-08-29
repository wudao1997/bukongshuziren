import { elFromHTML, pageHeader, topToast, confirmDialog } from "../ui.js";
import {
  getModels,
  setModels,
  repairStoredModels,
  getDefaultModelId,
  setDefaultModelId,
  getCloudLlms,
  setCloudLlms,
  setPublicCloudLlm,
  getActiveCloudLlmId,
  setActiveCloudLlmId,
  getLlmProviderSecrets,
  setLlmProviderSecrets,
  getLlmUsageLogs,
  setLlmUsageLogs
} from "../store.js";

const PUBLIC_CLOUD_LLM_OBJECT_NAME = "gongyongyunduandamoxing";

function nowId() {
  return `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function baseName(p) {
  const s = (p || "").replace(/\\/g, "/");
  const parts = s.split("/").filter(Boolean);
  return parts[parts.length - 1] || "";
}

function normalizePath(p) {
  return (p || "").trim();
}

function escapeHtml(v) {
  return String(v || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function maskKey(v) {
  const s = String(v || "").trim();
  if (!s) return "";
  if (s.length <= 8) return `${s.slice(0, 2)}***${s.slice(-2)}`;
  return `${s.slice(0, 4)}********${s.slice(-4)}`;
}

function renderMaskedKeyHtml(v) {
  const masked = maskKey(v);
  if (!masked) return "";
  const chunks = masked.match(/.{1,10}/g) || [masked];
  return chunks.map((item, index) => `${index ? "&nbsp;&nbsp;" : ""}${escapeHtml(item)}`).join("<br />");
}

function fmtNumber(v) {
  const n = Number(v || 0) || 0;
  return n.toLocaleString("zh-CN");
}

function fmtDateTime(v) {
  const ms = Number(new Date(v).getTime() || 0);
  if (!ms) return "-";
  const d = new Date(ms);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function buildModelStatusText(bundle = {}) {
  const validation = bundle?.validation;
  if (validation?.ok === false) {
    const firstError = Array.isArray(validation.errors) ? String(validation.errors[0] || "").trim() : "";
    return firstError ? `校验失败：${firstError}` : "校验失败";
  }
  if (bundle?.error) return String(bundle.error || "配置异常");
  return "已导入";
}

function buildModelToneClass(tone) {
  return tone === "success" ? "is-ok" : tone === "error" ? "is-bad" : "";
}

function renderValidationSummaryHtml(validation) {
  if (!validation || typeof validation !== "object") return `<span class="pill">未校验</span>`;
  const warnings = Array.isArray(validation.warnings) ? validation.warnings.length : 0;
  const errors = Array.isArray(validation.errors) ? validation.errors.length : 0;
  const pills = [
    `<span class="pill ${validation.ok === false ? "is-bad" : "is-ok"}">${validation.ok === false ? "校验失败" : "校验通过"}</span>`
  ];
  if (errors) pills.push(`<span class="pill is-bad">错误 ${errors}</span>`);
  if (warnings) pills.push(`<span class="pill">警告 ${warnings}</span>`);
  return pills.join("");
}

function buildBundleFailureHtml(item = {}) {
  const validation = item?.validation && typeof item.validation === "object" ? item.validation : {};
  const errors = Array.isArray(validation.errors) ? validation.errors.map((row) => String(row || "").trim()).filter(Boolean) : [];
  const warnings = Array.isArray(validation.warnings) ? validation.warnings.map((row) => String(row || "").trim()).filter(Boolean) : [];
  const parts = [];
  if (errors.length) parts.push(`错误：${escapeHtml(errors.join("；"))}`);
  if (warnings.length) parts.push(`警告：${escapeHtml(warnings.join("；"))}`);
  return parts.join("<br />") || "未通过校验";
}

function buildImportedBundleModel(bundle = {}) {
  return {
    id: nowId(),
    name: bundle.name || baseName(bundle.bundleDir),
    kind: "bundle",
    type: bundle.type || "Unknown",
    path: bundle.bundleDir,
    bundleDir: bundle.bundleDir,
    configPath: bundle.configPath,
    functions: Array.isArray(bundle.functions) ? bundle.functions : [],
    easyServer: bundle.easyServer || null,
    validation: bundle.validation || null,
    status: buildModelStatusText(bundle),
    createdAt: Date.now()
  };
}

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

const PROVIDER_BASES = [
  {
    id: "aliyun-bailian",
    label: "阿里云百炼",
    endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
    theme: "is-provider-aliyun"
  },
  {
    id: "zhipu-bigmodel",
    label: "智谱开放平台",
    endpoint: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
    theme: "is-provider-zhipu"
  },
  {
    id: "deepseek-open-platform",
    label: "DeepSeek 深度求索",
    endpoint: "https://api.deepseek.com/chat/completions",
    theme: "is-provider-deepseek"
  },
  {
    id: "moonshot-kimi",
    label: "Moonshot 月之暗面（Kimi）",
    endpoint: "https://api.moonshot.ai/v1/chat/completions",
    theme: "is-provider-moonshot"
  },
  {
    id: "tencent-tokenhub",
    label: "腾讯云 TokenHub",
    endpoint: "https://tokenhub.tencentmaas.com/v1/chat/completions",
    theme: "is-provider-tencent"
  },
  {
    id: "baidu-qianfan",
    label: "百度千帆",
    endpoint: "https://qianfan.baidubce.com/v2/chat/completions",
    theme: "is-provider-baidu"
  },
  {
    id: "volcengine-ark",
    label: "火山引擎方舟",
    endpoint: "https://ark.cn-beijing.volces.com/api/v3/chat/completions",
    theme: "is-provider-volc"
  },
  {
    id: "siliconflow",
    label: "硅基流动",
    endpoint: "https://api.siliconflow.cn/v1/chat/completions",
    theme: "is-provider-silicon"
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    endpoint: "https://openrouter.ai/api/v1/chat/completions",
    theme: "is-provider-openrouter"
  }
];

const HOME_MODULE_LABELS = {
  copy: "文案处理",
  hotcopy: "爆款文案",
  meta: "标题生成",
  ipbrain: "IP大脑"
};

function buildCloudMethodUrl(baseUrl, methodName) {
  const baseRaw = String(baseUrl || "").trim();
  const method = String(methodName || "").trim().replace(/^\/+/, "");
  if (!baseRaw || !method) return "";
  try {
    const u = new URL(baseRaw);
    const p = String(u.pathname || "")
      .replace(/\/+$/, "")
      .replace(/^\/+/, "/");
    if (!p || p === "/") return "";
    const want = `/${method}`;
    if (p.toLowerCase().endsWith(want.toLowerCase())) return u.toString();
    u.pathname = `${p}${want}`;
    return u.toString();
  } catch {
    const base = baseRaw.replace(/\/+$/, "");
    if (!base) return "";
    if (base.toLowerCase().endsWith(`/${method}`.toLowerCase())) return base;
    return `${base}/${method}`;
  }
}

function uniqList(list = []) {
  return Array.from(new Set((Array.isArray(list) ? list : []).map((item) => String(item || "").trim()).filter(Boolean)));
}

function getSecretRecordList(map, providerId) {
  const raw = map && typeof map === "object" ? map[providerId] : null;
  if (Array.isArray(raw)) return raw.filter((item) => item && typeof item === "object");
  if (raw && typeof raw === "object") return [raw];
  return [];
}

function buildProviderCatalog(baseList = PROVIDER_BASES, remoteProviders = []) {
  const remoteMap = new Map((Array.isArray(remoteProviders) ? remoteProviders : []).map((item) => [String(item?.id || "").trim(), item]));
  return baseList.map((item) => {
    const remote = remoteMap.get(item.id) || {};
    return {
      id: item.id,
      label: String(remote?.label || item.label || "").trim(),
      endpoint: String(remote?.endpoint || item.endpoint || "").trim(),
      theme: item.theme,
      updatedAt: remote?.updatedAt || null,
      models: Array.isArray(remote?.models) ? remote.models : []
    };
  });
}

function getProviderById(id) {
  return PROVIDER_BASES.find((item) => item.id === String(id || "").trim()) || PROVIDER_BASES[0];
}

function getCurrentOwner() {
  const auth = readAuth();
  return {
    userId: String(auth?.userId || "").trim(),
    account: String(auth?.account || "").trim(),
    phone: String(auth?.phone || "").trim()
  };
}

async function encryptApiKeyForOwner({ providerId, apiKey, owner }) {
  const payload = {
    providerId: String(providerId || "").trim(),
    apiKey: String(apiKey || "").trim(),
    ownerUserId: String(owner?.userId || "").trim(),
    ownerAccount: String(owner?.account || "").trim(),
    updatedAt: new Date().toISOString()
  };
  const res = await window.api?.auth?.safeEncrypt?.({ text: JSON.stringify(payload) });
  if (!res?.ok || !res?.data) return { ok: false, message: String(res?.message || "加密失败") };
  return { ok: true, data: String(res.data || "") };
}

async function decryptApiKeyRecord(record, owner = getCurrentOwner()) {
  const rec = record && typeof record === "object" ? record : null;
  if (!rec) return { ok: false, locked: false, message: "未保存" };
  const ownerAccount = String(owner?.account || "").trim();
  const ownerUserId = String(owner?.userId || "").trim();
  if (!ownerAccount) return { ok: false, locked: true, message: "未登录软件账号" };
  if (String(rec.ownerAccount || "").trim() !== ownerAccount) {
    return { ok: false, locked: true, message: "当前不是保存该Key的软件账号" };
  }
  if (String(rec.ownerUserId || "").trim() && String(rec.ownerUserId || "").trim() !== ownerUserId) {
    return { ok: false, locked: true, message: "当前账号无权读取该Key" };
  }
  const dec = await window.api?.auth?.safeDecrypt?.({ data: String(rec.enc || "") });
  if (!dec?.ok || !dec?.text) return { ok: false, locked: false, message: String(dec?.message || "解密失败") };
  try {
    const parsed = JSON.parse(String(dec.text || "{}"));
    if (String(parsed?.ownerAccount || "").trim() !== ownerAccount || String(parsed?.providerId || "").trim() !== String(rec.providerId || "").trim()) {
      return { ok: false, locked: true, message: "当前账号无权读取该Key" };
    }
    if (String(parsed?.ownerUserId || "").trim() && String(parsed?.ownerUserId || "").trim() !== ownerUserId) {
      return { ok: false, locked: true, message: "当前账号无权读取该Key" };
    }
    return { ok: true, apiKey: String(parsed?.apiKey || "").trim(), payload: parsed };
  } catch {
    return { ok: false, locked: false, message: "解密内容异常" };
  }
}

function findSecretRecordForOwner(map, providerId, owner = getCurrentOwner()) {
  const ownerAccount = String(owner?.account || "").trim();
  const ownerUserId = String(owner?.userId || "").trim();
  const list = getSecretRecordList(map, providerId);
  return (
    list.find(
      (item) =>
        String(item?.ownerAccount || "").trim() === ownerAccount &&
        (!String(item?.ownerUserId || "").trim() || String(item?.ownerUserId || "").trim() === ownerUserId)
    ) || null
  );
}

function summarizeUsageByCloudId(logs, cloudId) {
  const rows = (Array.isArray(logs) ? logs : []).filter((item) => String(item?.cloudId || "") === String(cloudId || ""));
  return rows.reduce(
    (acc, item) => {
      acc.requests += 1;
      acc.success += item?.success === false ? 0 : 1;
      acc.totalTokens += Number(item?.usage?.totalTokens || 0) || 0;
      acc.promptTokens += Number(item?.usage?.promptTokens || 0) || 0;
      acc.completionTokens += Number(item?.usage?.completionTokens || 0) || 0;
      acc.cachedTokens += Number(item?.usage?.cachedTokens || 0) || 0;
      acc.reasoningTokens += Number(item?.usage?.reasoningTokens || 0) || 0;
      acc.lastUsedAt = acc.lastUsedAt && new Date(acc.lastUsedAt).getTime() > new Date(item?.createdAt || 0).getTime() ? acc.lastUsedAt : item?.createdAt || acc.lastUsedAt;
      return acc;
    },
    {
      requests: 0,
      success: 0,
      totalTokens: 0,
      promptTokens: 0,
      completionTokens: 0,
      cachedTokens: 0,
      reasoningTokens: 0,
      lastUsedAt: ""
    }
  );
}

export const route = {
  path: "/models",
  title: "模型",
  async render() {
    const root = elFromHTML(`
      <div>
        ${pageHeader({
          title: "模型",
          subtitle: "统一管理本地模型、云端模型平台、加密 API Key 与大模型调用统计",
          actionsHTML: `
            <button class="btn" id="btn-refresh-cloud-models">刷新</button>
            <button class="btn" id="btn-scan-project">扫描本地模型包</button>
            <button class="btn" id="btn-llm-settings">大模型设置</button>
          `
        })}

        <div class="card model-provider-card" style="margin-bottom: 12px">
          <div class="card-title">
            <h3>平台凭证库</h3>
            <span class="pill" id="provider-owner-pill">未登录</span>
          </div>
          <div class="hint" style="margin-bottom: 12px">API Key 使用系统加密后保存到本地，并绑定当前登录的软件账号。切换到其它软件账号时只能看到“已锁定”，无法直接读取。</div>
          <div class="model-provider-grid" id="provider-secret-grid"></div>
        </div>

        <div class="card model-cloud-card" style="margin-bottom: 12px">
          <div class="card-title">
            <h3>云端大模型</h3>
            <div class="card-actions">
              <span class="pill mono" id="catalog-sync-pill">云目录未同步</span>
              <button class="btn" id="btn-sync-catalog">同步云端目录</button>
              <button class="btn btn-primary" id="btn-cloud-add">添加云模型</button>
            </div>
          </div>
          <div id="cloud-llm-area"></div>
        </div>

        <div class="card model-usage-card" style="margin-bottom: 12px">
          <div class="card-title">
            <h3>调用统计</h3>
            <div class="card-actions">
              <button class="btn" id="btn-usage-clear">清空统计</button>
            </div>
          </div>
          <div id="llm-usage-area"></div>
        </div>

        <div class="card model-center-card" style="margin-bottom: 12px">
          <div class="card-title">
            <h3>本地模型中心</h3>
            <div class="card-actions">
              <span class="pill mono" id="model-center-status">未同步</span>
              <button class="btn" id="btn-model-center-refresh">刷新模型中心</button>
              <button class="btn btn-primary" id="btn-model-center-open">配置模型目录</button>
            </div>
          </div>
          <div id="model-center-area"></div>
        </div>

        <div id="models-area"></div>

        <div class="modal-overlay" id="model-modal-overlay" hidden></div>
        <div class="modal model-modal" id="model-modal" hidden>
          <div class="modal-head">
            <div class="modal-title">添加本地模型</div>
            <button class="modal-close" id="model-modal-close" title="关闭">×</button>
          </div>
          <div class="modal-body">
            <div class="model-illus">
              <div class="model-illus-icon">AI</div>
              <div class="model-illus-text">导入模型配置后即可在各模块调用</div>
            </div>
            <div class="model-actions">
              <button class="btn btn-primary" id="btn-import-bundles">一键导入运行 Bundles</button>
              <button class="btn" id="btn-pick-config">选择本地模型 config.json</button>
            </div>
            <div class="model-picked">
              <div class="pill mono" id="picked-path">未选择</div>
              <div class="hint" id="picked-hint">请选择 Bundles 目录或 config.json 文件</div>
            </div>
            <div class="modal-tip">
              <div class="label">模型运行在本地，对电脑性能要求较高</div>
              <ol class="tip-list" style="margin-top: 6px">
                <li>下载模型并准备 config.json 或 Bundles 目录</li>
                <li>导入后可在首页模块中直接选择本地模型</li>
                <li>若要让本地模型作为大模型调用，需提供兼容 OpenAI 的端点配置</li>
              </ol>
            </div>
          </div>
          <div class="modal-foot">
            <button class="btn" id="model-cancel">取消</button>
            <button class="btn btn-primary" id="model-confirm">确认添加</button>
          </div>
        </div>

        <div class="modal-overlay" id="llm-modal-overlay" hidden></div>
        <div class="modal llm-modal" id="llm-modal" hidden>
          <div class="modal-head">
            <div class="modal-title">大模型设置</div>
            <button class="modal-close" id="llm-modal-close" title="关闭">×</button>
          </div>
          <div class="modal-body">
            <div class="grid cols-2" style="gap: 10px">
              <div class="field">
                <div class="label">默认本地模型</div>
                <select id="default-model"></select>
              </div>
              <div class="field">
                <div class="label">超时（秒）</div>
                <input id="llm-timeout" type="text" value="120" />
              </div>
            </div>
            <div class="field">
              <div class="label">并发</div>
              <select id="llm-concurrency">
                <option value="1" selected>1</option>
                <option value="2">2</option>
                <option value="3">3</option>
              </select>
              <div class="hint">本地并发参数保留给后续本地推理服务使用。</div>
            </div>
          </div>
          <div class="modal-foot">
            <button class="btn" id="llm-cancel">取消</button>
            <button class="btn btn-primary" id="llm-save">保存</button>
          </div>
        </div>

        <div class="modal-overlay" id="provider-modal-overlay" hidden></div>
        <div class="modal llm-modal" id="provider-modal" hidden>
          <div class="modal-head">
            <div class="modal-title">设置平台 API Key</div>
            <button class="modal-close" id="provider-modal-close" title="关闭">×</button>
          </div>
          <div class="modal-body">
            <div class="grid cols-2" style="gap: 10px">
              <div class="field">
                <div class="label">平台</div>
                <input id="provider-platform-name" type="text" readonly />
              </div>
              <div class="field">
                <div class="label">归属账号</div>
                <input id="provider-owner-name" type="text" placeholder="默认当前登录账号，可改成其它软件账号" />
              </div>
            </div>
            <div class="field">
              <div class="label">默认接口地址</div>
              <input id="provider-endpoint" type="text" readonly />
            </div>
            <div class="field">
              <div class="label">API Key</div>
              <input id="provider-api-key" type="password" placeholder="输入后会加密保存到本地，仅当前软件账号可读取" />
            </div>
            <div class="hint" id="provider-key-hint">未保存</div>
          </div>
          <div class="modal-foot">
            <button class="btn btn-danger" id="provider-key-remove">移除Key</button>
            <button class="btn" id="provider-key-cancel">取消</button>
            <button class="btn btn-primary" id="provider-key-save">保存Key</button>
          </div>
        </div>

        <div class="modal-overlay" id="cloud-modal-overlay" hidden></div>
        <div class="modal llm-modal" id="cloud-modal" hidden>
          <div class="modal-head">
            <div class="modal-title">添加云端大模型</div>
            <button class="modal-close" id="cloud-modal-close" title="关闭">×</button>
          </div>
          <div class="modal-body">
            <div class="model-cloud-hero">
              <div class="model-cloud-hero-title">选择平台后将自动匹配接口地址与已保存的 API Key</div>
              <div class="model-cloud-hero-sub">你只需要选择平台与模型，后续首页模块即可直接调用</div>
            </div>
            <div class="grid cols-2" style="gap: 10px">
              <div class="field">
                <div class="label">平台</div>
                <select id="cloud-provider"></select>
              </div>
              <div class="field">
                <div class="label">模型</div>
                <select id="cloud-model"></select>
              </div>
            </div>
            <div class="field">
              <div class="label">服务名称</div>
              <input id="cloud-name" type="text" placeholder="例如：百炼-Qwen Plus" />
            </div>
            <div class="field">
              <div class="label">接口地址（自动匹配）</div>
              <input id="cloud-endpoint" type="text" readonly />
            </div>
            <div class="field">
              <div class="label">API Key 状态</div>
              <div class="inline-flags" style="justify-content: space-between">
                <div class="pill mono" id="cloud-provider-key-state">未匹配</div>
                <button class="btn" id="cloud-provider-key-config" type="button">设置当前平台Key</button>
              </div>
            </div>
            <div class="field">
              <div class="label">模型能力标签</div>
              <div class="model-chip-list" id="cloud-ability-preview"></div>
            </div>
            <div class="field">
              <div class="label">适用模块</div>
              <div class="model-chip-list" id="cloud-module-preview"></div>
            </div>
            <div class="field">
              <div class="label">System Prompt（可选）</div>
              <input id="cloud-system" type="text" value="You are a helpful assistant." />
            </div>
          </div>
          <div class="modal-foot">
            <button class="btn" id="cloud-cancel">取消</button>
            <button class="btn btn-primary" id="cloud-save">保存模型</button>
          </div>
        </div>
      </div>
    `);

    const toast = (msg, { type = "success" } = {}) => topToast(msg, { type });

    const providerGrid = root.querySelector("#provider-secret-grid");
    const providerOwnerPill = root.querySelector("#provider-owner-pill");
    const cloudArea = root.querySelector("#cloud-llm-area");
    const usageArea = root.querySelector("#llm-usage-area");
    const modelCenterArea = root.querySelector("#model-center-area");
    const modelCenterStatus = root.querySelector("#model-center-status");
    const area = root.querySelector("#models-area");

    const modelOverlay = root.querySelector("#model-modal-overlay");
    const modelModal = root.querySelector("#model-modal");
    const pickedPathEl = root.querySelector("#picked-path");
    const pickedHintEl = root.querySelector("#picked-hint");

    const llmOverlay = root.querySelector("#llm-modal-overlay");
    const llmModal = root.querySelector("#llm-modal");

    const providerOverlay = root.querySelector("#provider-modal-overlay");
    const providerModal = root.querySelector("#provider-modal");
    const providerPlatformName = root.querySelector("#provider-platform-name");
    const providerOwnerName = root.querySelector("#provider-owner-name");
    const providerEndpoint = root.querySelector("#provider-endpoint");
    const providerApiKey = root.querySelector("#provider-api-key");
    const providerKeyHint = root.querySelector("#provider-key-hint");

    const cloudOverlay = root.querySelector("#cloud-modal-overlay");
    const cloudModal = root.querySelector("#cloud-modal");
    const cloudProviderSel = root.querySelector("#cloud-provider");
    const cloudModelSel = root.querySelector("#cloud-model");
    const cloudNameInput = root.querySelector("#cloud-name");
    const cloudEndpointInput = root.querySelector("#cloud-endpoint");
    const cloudSystemInput = root.querySelector("#cloud-system");
    const cloudProviderKeyState = root.querySelector("#cloud-provider-key-state");
    const cloudAbilityPreview = root.querySelector("#cloud-ability-preview");
    const cloudModulePreview = root.querySelector("#cloud-module-preview");
    const catalogSyncPill = root.querySelector("#catalog-sync-pill");
    const cloudCard = root.querySelector(".model-cloud-card");

    let picked = { kind: "", path: "", configPath: "", type: "", functions: [], easyServer: null, bundleEntries: [] };
    let providerEditingId = "";
    let runtimeCatalog = buildProviderCatalog();
    let modelCenterState = {
      config: {
        rootPath: "",
        officialDownloadUrl: "",
        importedBundles: [],
        lastImportLog: null,
        updatedAt: ""
      },
      candidateRoots: [],
      bundles: [],
      report: null
    };
    let modelCenterBusy = "";

    const getCatalogProviders = () => runtimeCatalog;
    const getProviderRuntime = (providerId) => {
      const pid = String(providerId || "").trim();
      return getCatalogProviders().find((item) => item.id === pid) || buildProviderCatalog().find((item) => item.id === pid) || buildProviderCatalog()[0];
    };
    const getProviderModels = (providerId) => {
      const provider = getProviderRuntime(providerId);
      return Array.isArray(provider?.models) ? provider.models : [];
    };
    const getModuleLabel = (key) => HOME_MODULE_LABELS[String(key || "").trim()] || String(key || "").trim();
    const renderModulePills = (keys = []) => {
      const list = uniqList(keys);
      return list.length
        ? list.map((item) => `<span class="pill model-scope-pill">适用：${escapeHtml(getModuleLabel(item))}</span>`).join("")
        : `<span class="pill">未标注模块</span>`;
    };
    const getSelectedModuleUsagesForCloud = (cloudId) => {
      let parsed = {};
      try {
        parsed = JSON.parse(localStorage.getItem("ipfactory.home.llmSelections") || "{}");
      } catch {}
      return Object.entries(parsed || {})
        .filter(([, value]) => String(value || "").trim() === `cloud:${String(cloudId || "").trim()}`)
        .map(([key]) => getModuleLabel(key));
    };
    const updateCatalogSyncPill = (text, ok = false) => {
      catalogSyncPill.textContent = text;
      catalogSyncPill.className = `pill mono ${ok ? "is-ok" : ""}`;
    };
    const setModelCenterStatus = (text, tone = "info") => {
      modelCenterStatus.textContent = text;
      modelCenterStatus.className = `pill mono ${buildModelToneClass(tone)}`.trim();
    };
    const repairLocalModelStore = ({ silent = true } = {}) => {
      const result = repairStoredModels();
      if (!silent && result.removedCount > 0) {
        toast(`已自动去重 ${result.removedCount} 个重复本地模型。`);
      }
      return result;
    };
    const getActiveModelReport = () => {
      const report = modelCenterState?.report;
      if (report && typeof report === "object") return report;
      const fallback = modelCenterState?.config?.lastImportLog?.report;
      return fallback && typeof fallback === "object" ? fallback : null;
    };
    const addBundleModels = (bundles = []) => {
      const existing = getModels();
      const existingConfig = new Set(existing.map((m) => String(m?.configPath || "").trim()).filter(Boolean));
      const toAdd = (Array.isArray(bundles) ? bundles : []).filter((b) => {
        const key = String(b?.configPath || "").trim();
        return key && !existingConfig.has(key);
      });
      if (!toAdd.length) return { addedCount: 0, totalCount: Array.isArray(bundles) ? bundles.length : 0 };
      const next = [...toAdd.map((b) => buildImportedBundleModel(b)), ...existing];
      setModels(next);
      if (!getDefaultModelId()) setDefaultModelId(next[0]?.id || "");
      return { addedCount: toAdd.length, totalCount: Array.isArray(bundles) ? bundles.length : toAdd.length };
    };
    const renderModelCenterArea = () => {
      const cfg = modelCenterState?.config || {};
      const bundles = Array.isArray(modelCenterState?.bundles) ? modelCenterState.bundles : [];
      const candidateRoots = Array.isArray(modelCenterState?.candidateRoots) ? modelCenterState.candidateRoots : [];
      const report = getActiveModelReport();
      const importedBundles = Array.isArray(cfg.importedBundles) ? cfg.importedBundles : [];
      const rootPath = String(cfg.rootPath || "").trim();
      const officialDownloadUrl = String(cfg.officialDownloadUrl || "").trim();
      const importedAt = String(cfg?.lastImportLog?.exportedAt || "").trim();
      const statusText =
        modelCenterBusy === "refresh"
          ? "同步中..."
          : modelCenterBusy === "scan"
            ? "扫描中..."
            : modelCenterBusy === "import"
              ? "导入中..."
              : "空闲";
      const statHtml = `
        <div class="model-cloud-stats" style="margin-top: 12px">
          <div class="model-stat-box"><div class="k">检测目录</div><div class="v">${fmtNumber(candidateRoots.length)}</div></div>
          <div class="model-stat-box"><div class="k">识别模型包</div><div class="v">${fmtNumber(bundles.length)}</div></div>
          <div class="model-stat-box"><div class="k">累计导入</div><div class="v">${fmtNumber(importedBundles.length)}</div></div>
          <div class="model-stat-box"><div class="k">最近状态</div><div class="v">${escapeHtml(statusText)}</div></div>
        </div>
      `;
      const candidateHtml = candidateRoots.length
        ? candidateRoots.map((item) => `<span class="pill mono">${escapeHtml(item)}</span>`).join("")
        : `<span class="pill">暂无候选目录</span>`;
      const failureRows = Array.isArray(report?.failures) ? report.failures : [];
      const failureHtml = failureRows.length
        ? `
          <div class="table-wrap model-import-table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th style="width: 120px">类型</th>
                  <th style="width: 180px">模型包</th>
                  <th>失败原因</th>
                </tr>
              </thead>
              <tbody>
                ${failureRows
                  .map(
                    (item) => `
                      <tr>
                        <td>${escapeHtml(item?.type || "Unknown")}</td>
                        <td class="mono">${escapeHtml(item?.name || baseName(item?.bundleDir || item?.configPath || ""))}</td>
                        <td>${buildBundleFailureHtml(item)}</td>
                      </tr>
                    `
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        `
        : `<div class="empty">最近一次扫描没有失败项。</div>`;
      modelCenterArea.innerHTML = `
        <div class="model-center-hero">
          <div>
            <div class="model-center-badge">第二阶段 模型链路</div>
            <div class="model-cloud-hero-title">模型目录、导入记录、业务调用统一收口到模型中心</div>
            <div class="model-cloud-hero-sub">ASR / TTS / VideoSync 缺模型时，统一回到这里修复，不再只给生硬报错。</div>
          </div>
          <div class="model-center-actions">
            <button class="btn" id="btn-model-root-pick" ${modelCenterBusy ? "disabled" : ""}>选择目录</button>
            <button class="btn" id="btn-model-root-save" ${modelCenterBusy ? "disabled" : ""}>保存目录</button>
            <button class="btn btn-primary" id="btn-model-root-import" ${modelCenterBusy ? "disabled" : ""}>导入当前目录</button>
            <button class="btn" id="btn-model-download" ${officialDownloadUrl ? "" : "disabled"}>官方模型下载</button>
            <button class="btn" id="btn-model-export-log" ${(report && !modelCenterBusy) ? "" : "disabled"}>导出日志</button>
          </div>
        </div>
        <div class="grid cols-2" style="gap: 12px; margin-top: 12px">
          <div class="field">
            <div class="label">模型根目录</div>
            <input id="model-root-input" type="text" value="${escapeHtml(rootPath)}" placeholder="例如：E:\\models\\models" />
            <div class="hint">保存后业务页会优先从该目录及其 models / models\\models 子目录自动扫描模型包。</div>
          </div>
          <div class="model-center-summary-card">
            <div class="model-center-summary-row"><span>官方下载地址</span><span class="mono">${escapeHtml(officialDownloadUrl || "未配置")}</span></div>
            <div class="model-center-summary-row"><span>最近导入</span><span>${escapeHtml(report?.summary || cfg?.lastImportLog?.summary || "暂无")}</span></div>
            <div class="model-center-summary-row"><span>最近时间</span><span>${escapeHtml(importedAt ? fmtDateTime(importedAt) : "-")}</span></div>
          </div>
        </div>
        ${statHtml}
        <div class="model-center-block">
          <div class="label">自动检测目录</div>
          <div class="model-chip-list">${candidateHtml}</div>
        </div>
        <div class="model-center-block">
          <div class="model-center-report-head">
            <div>
              <div class="label">最近一次批量导入报告</div>
              <div class="hint">${escapeHtml(report?.summary || "还没有扫描/导入记录。")}</div>
            </div>
            <div class="model-chip-list">
              ${report ? renderValidationSummaryHtml({ ok: (report.failureCount || 0) === 0, errors: Array(report.failureCount || 0).fill("x"), warnings: [] }) : `<span class="pill">暂无报告</span>`}
              ${report ? `<span class="pill">可导入 ${fmtNumber(report.successCount || 0)}</span>` : ""}
              ${report ? `<span class="pill ${report.failureCount ? "is-bad" : "is-ok"}">失败 ${fmtNumber(report.failureCount || 0)}</span>` : ""}
            </div>
          </div>
          ${failureHtml}
        </div>
      `;
      modelCenterArea.querySelector("#btn-model-root-pick")?.addEventListener("click", async () => {
        const res = await window.api?.openDirectory?.();
        if (!res || res.canceled) return;
        const dir = normalizePath(res.directoryPath);
        if (!dir) return;
        const input = modelCenterArea.querySelector("#model-root-input");
        if (input) input.value = dir;
      });
      modelCenterArea.querySelector("#btn-model-root-save")?.addEventListener("click", async () => {
        const nextRoot = normalizePath(modelCenterArea.querySelector("#model-root-input")?.value || "");
        modelCenterBusy = "refresh";
        renderModelCenterArea();
        const officialUrl = String(modelCenterState?.config?.officialDownloadUrl || "").trim();
        const res = await window.api?.models?.saveConfig?.({ rootPath: nextRoot, officialDownloadUrl: officialUrl });
        modelCenterBusy = "";
        if (!res?.ok) {
          toast(res?.message || "模型目录保存失败。", { type: "error" });
          renderModelCenterArea();
          return;
        }
        modelCenterState = {
          ...modelCenterState,
          config: res.config || modelCenterState.config,
          bundles: Array.isArray(res.bundles) ? res.bundles : modelCenterState.bundles,
          candidateRoots: []
        };
        addBundleModels(modelCenterState.bundles);
        await refreshModelCenter({ silent: true });
        toast("模型目录已保存。");
      });
      modelCenterArea.querySelector("#btn-model-root-import")?.addEventListener("click", async () => {
        const nextRoot = normalizePath(modelCenterArea.querySelector("#model-root-input")?.value || "");
        if (!nextRoot) {
          toast("请先填写或选择模型目录。", { type: "warn" });
          return;
        }
        await importBundleDirectory(nextRoot, { setAsRootPath: true, silent: false });
      });
      modelCenterArea.querySelector("#btn-model-download")?.addEventListener("click", async () => {
        if (!officialDownloadUrl) {
          toast("当前还没有配置官方模型下载地址。", { type: "warn" });
          return;
        }
        const res = await window.api?.shell?.openExternal?.({ url: officialDownloadUrl });
        if (!res?.ok) {
          toast(res?.message || "打开下载地址失败。", { type: "error" });
          return;
        }
        toast("已打开模型下载地址。");
      });
      modelCenterArea.querySelector("#btn-model-export-log")?.addEventListener("click", async () => {
        const reportData = getActiveModelReport();
        if (!reportData) {
          toast("暂无可导出的模型导入日志。", { type: "warn" });
          return;
        }
        const res = await window.api?.models?.exportImportLog?.({ report: reportData });
        if (!res?.ok) {
          if (!res?.canceled) toast(res?.message || "导出日志失败。", { type: "error" });
          return;
        }
        toast("模型导入日志已导出。");
        await refreshModelCenter({ silent: true });
      });
    };
    const refreshModelCenter = async ({ silent = false } = {}) => {
      repairLocalModelStore({ silent: true });
      modelCenterBusy = "refresh";
      setModelCenterStatus("同步中...", "info");
      renderModelCenterArea();
      try {
        const res = await window.api?.models?.getConfig?.();
        if (!res?.ok) {
          setModelCenterStatus("模型中心同步失败", "error");
          if (!silent) toast(res?.message || "模型中心同步失败。", { type: "error" });
          return { ok: false, message: res?.message || "模型中心同步失败" };
        }
        modelCenterState = {
          ...modelCenterState,
          config: res.config || modelCenterState.config,
          candidateRoots: Array.isArray(res.candidateRoots) ? res.candidateRoots : [],
          bundles: Array.isArray(res.bundles) ? res.bundles : [],
          report: modelCenterState.report || res?.config?.lastImportLog?.report || null
        };
        const mergeRes = addBundleModels(modelCenterState.bundles);
        setModelCenterStatus(`已同步 ${modelCenterState.bundles.length} 个模型包`, "success");
        if (!silent) {
          toast(
            mergeRes.addedCount
              ? `模型中心已同步，并新增导入 ${mergeRes.addedCount} 个模型包。`
              : `模型中心已同步，共识别 ${modelCenterState.bundles.length} 个模型包。`
          );
        }
        await renderAll();
        return { ok: true };
      } finally {
        modelCenterBusy = "";
        renderModelCenterArea();
      }
    };
    const importBundleDirectory = async (bundleRoot, { setAsRootPath = false, silent = false } = {}) => {
      const rootPath = normalizePath(bundleRoot);
      if (!rootPath) return { ok: false, message: "模型目录为空" };
      modelCenterBusy = "import";
      setModelCenterStatus("导入中...", "info");
      renderModelCenterArea();
      try {
        const res = await window.api?.models?.importBundles?.({ bundleRoot: rootPath, setAsRootPath });
        if (!res?.ok) {
          setModelCenterStatus("模型导入失败", "error");
          if (!silent) toast(res?.message || "模型导入失败。", { type: "error" });
          return { ok: false, message: res?.message || "模型导入失败" };
        }
        modelCenterState = {
          ...modelCenterState,
          config: res.config || modelCenterState.config,
          bundles: Array.isArray(res.bundles) ? res.bundles : [],
          report: res.report || null
        };
        const mergeRes = addBundleModels(modelCenterState.bundles);
        setModelCenterStatus(`已导入 ${res?.report?.successCount || 0} 个模型包`, "success");
        await renderAll();
        if (!silent) {
          toast(
            mergeRes.addedCount
              ? `导入完成，新增 ${mergeRes.addedCount} 个模型包。`
              : `导入完成，可用模型包 ${fmtNumber(res?.report?.successCount || 0)} 个。`
          );
        }
        await refreshModelCenter({ silent: true });
        return { ok: true, data: res };
      } finally {
        modelCenterBusy = "";
        renderModelCenterArea();
      }
    };
    const mergeCloudLlmWithCatalog = (cloudItem, catalogModel, provider) => {
      const item = cloudItem && typeof cloudItem === "object" ? cloudItem : {};
      return {
        ...item,
        providerId: provider.id,
        providerLabel: provider.label,
        endpoint: String(catalogModel?.endpoint || provider.endpoint || item.endpoint || "").trim(),
        catalogModelLabel: String(catalogModel?.label || item.catalogModelLabel || item.model || "").trim(),
        abilities: uniqList(catalogModel?.abilities || item.abilities || []),
        moduleKeys: uniqList(catalogModel?.moduleKeys || item.moduleKeys || []),
        summary: String(catalogModel?.summary || item.summary || "").trim(),
        badge: String(catalogModel?.badge || item.badge || "").trim(),
        enabled: item.enabled !== false
      };
    };
    const syncCloudLlmsWithCatalog = () => {
      const current = getCloudLlms();
      const next = current.map((item) => {
        const provider = getProviderRuntime(item.providerId);
        const model = getProviderModels(provider.id).find((m) => String(m.id || "").trim() === String(item.model || "").trim());
        return model ? mergeCloudLlmWithCatalog(item, { ...model, endpoint: provider.endpoint }, provider) : item;
      });
      setCloudLlms(next);
      const enabledList = next.filter((item) => item.enabled !== false);
      if (!enabledList.some((item) => item.id === getActiveCloudLlmId())) {
        setActiveCloudLlmId(enabledList[0]?.id || "");
      }
    };
    const syncCatalogFromCloud = async ({ silent = false } = {}) => {
      try {
        const domainRes = await window.api?.domain?.read?.();
        const baseDomain = String(domainRes?.domain || "").trim().replace(/\/+$/, "");
        if (!baseDomain) {
          updateCatalogSyncPill("未配置云端域名", false);
          return { ok: false, message: "未配置云端域名" };
        }
        const url = buildCloudMethodUrl(`${baseDomain}/qd-pingtaimoxing`, "getLatest");
        if (!url) {
          updateCatalogSyncPill("云目录地址无效", false);
          return { ok: false, message: "云目录地址无效" };
        }
        const res = await window.api?.cloudAuth?.getMenuConfig?.({ url, body: { scene: "desktop" }, token: "" });
        if (!res?.ok || !Array.isArray(res?.providers)) {
          updateCatalogSyncPill("云目录同步失败", false);
          return { ok: false, message: String(res?.errMsg || res?.message || "云目录同步失败") };
        }
        runtimeCatalog = buildProviderCatalog(PROVIDER_BASES, res.providers);
        syncCloudLlmsWithCatalog();
        updateCatalogSyncPill(`云目录已同步 ${fmtDateTime(res.updatedAt)}`, true);
        if (!silent) toast(`云端模型目录已同步，共 ${Number(res.total || 0)} 条模型。`);
        return { ok: true, data: res };
      } catch (e) {
        updateCatalogSyncPill("云目录同步异常", false);
        return { ok: false, message: String(e?.message || e) };
      }
    };
    const syncPublicCloudLlmFromCloud = async ({ silent = false } = {}) => {
      try {
        const domainRes = await window.api?.domain?.read?.();
        const baseDomain = String(domainRes?.domain || "").trim().replace(/\/+$/, "");
        if (!baseDomain) {
          if (!silent) toast("未配置云端域名，无法同步公用云端大模型。");
          return { ok: false, message: "未配置云端域名" };
        }
        const url = buildCloudMethodUrl(`${baseDomain}/${PUBLIC_CLOUD_LLM_OBJECT_NAME}`, "getLatest");
        if (!url) {
          if (!silent) toast("公用云端大模型地址无效。");
          return { ok: false, message: "公用云端大模型地址无效" };
        }
        const res = await window.api?.cloudAuth?.getMenuConfig?.({ url, body: { scene: "desktop" }, token: "" });
        const item =
          (res?.item && typeof res.item === "object" ? res.item : null) ||
          (res?.data?.item && typeof res.data.item === "object" ? res.data.item : null) ||
          (res?.result?.item && typeof res.result.item === "object" ? res.result.item : null) ||
          ((res?.providerId || res?.modelId || res?.model || res?.endpoint) ? res : null);
        if (!res?.ok || !item) {
          if (!silent) toast(String(res?.errMsg || res?.message || "公用云端大模型同步失败。"));
          return { ok: false, message: String(res?.errMsg || res?.message || "公用云端大模型同步失败") };
        }
        if (item?.enabled === false) {
          setPublicCloudLlm(null);
          return { ok: true, disabled: true, item };
        }
        const providerId = String(item.providerId || "").trim();
        const providerRuntime = getProviderRuntime(providerId || "");
        const endpoint = String(item.endpoint || providerRuntime?.endpoint || "").trim();
        const providerLabel = String(item.providerLabel || providerRuntime?.label || providerId || "云端平台").trim();
        setPublicCloudLlm({
          id: "public-cloud-llm",
          isPublicShared: true,
          enabled: item?.enabled !== false,
          name: String(item.name || item.modelLabel || item.modelId || "公用云端大模型").trim() || "公用云端大模型",
          providerId,
          providerLabel,
          model: String(item.modelId || item.model || "").trim(),
          endpoint,
          apiKey: String(item.apiKey || "").trim(),
          abilities: Array.isArray(item.abilities) ? item.abilities : [],
          moduleKeys: Array.isArray(item.moduleKeys) ? item.moduleKeys : ["copy", "hotcopy", "meta", "ipbrain"],
          summary: String(item.summary || "").trim(),
          badge: String(item.badge || "公用").trim(),
          catalogModelLabel: String(item.modelLabel || item.modelId || item.model || "").trim(),
          systemPrompt: String(item.systemPrompt || "").trim(),
          updatedAt: String(item.updatedAt || res?.updatedAt || "").trim()
        });
        return { ok: true, item };
      } catch (e) {
        if (!silent) toast(String(e?.message || e || "公用云端大模型同步失败。"));
        return { ok: false, message: String(e?.message || e) };
      }
    };
    const refreshCloudModels = async ({ silent = false } = {}) => {
      const refreshBtn = root.querySelector("#btn-refresh-cloud-models");
      const setRefreshingState = (refreshing) => {
        [refreshBtn].forEach((btn) => {
          if (!btn) return;
          btn.disabled = !!refreshing;
          btn.textContent = refreshing ? "刷新中..." : "刷新";
        });
      };
      setRefreshingState(true);
      try {
        const [catalogRes, publicRes] = await Promise.all([
          syncCatalogFromCloud({ silent: true }),
          syncPublicCloudLlmFromCloud({ silent: true })
        ]);
        fillProviderOptions();
        renderCloudModelOptions();
        await updateCloudProviderKeyState();
        await renderAll();
        if (silent !== true) {
          if (catalogRes?.ok || publicRes?.ok) toast("云端大模型与公用模型已刷新。");
          else toast(String(catalogRes?.message || publicRes?.message || "刷新失败。"));
        }
        return {
          ok: !!(catalogRes?.ok || publicRes?.ok),
          catalogRes,
          publicRes
        };
      } finally {
        setRefreshingState(false);
      }
    };
    const fillProviderOptions = () => {
      cloudProviderSel.innerHTML = getCatalogProviders().map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.label)}</option>`).join("");
    };
    const renderCloudModelOptions = (e) => {
      const preserveValue = !!e;
      const provider = getProviderRuntime(cloudProviderSel.value);
      const models = getProviderModels(provider.id);
      
      if (!preserveValue) {
        cloudModelSel.innerHTML = models.length
          ? models.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.label)}</option>`).join("")
          : `<option value="">当前平台暂无可用模型</option>`;
        cloudEndpointInput.value = String(provider?.endpoint || "");
      }
      
      const selectedModel = models.find((item) => item.id === String(cloudModelSel.value || "").trim()) || models[0] || null;
      const abilities = Array.isArray(selectedModel?.abilities) ? selectedModel.abilities : [];
      const moduleKeys = Array.isArray(selectedModel?.moduleKeys) ? selectedModel.moduleKeys : [];
      cloudAbilityPreview.innerHTML = abilities.length
        ? abilities.map((item) => `<span class="pill">${escapeHtml(item)}</span>`).join("")
        : `<span class="pill">暂无标签</span>`;
      cloudModulePreview.innerHTML = renderModulePills(moduleKeys);
      
      if (!preserveValue || !String(cloudNameInput.value || "").trim()) {
        cloudNameInput.value = `${provider.label}-${selectedModel?.label || selectedModel?.id || "模型"}`;
      } else if (preserveValue && selectedModel) {
        cloudNameInput.value = `${provider.label}-${selectedModel?.label || selectedModel?.id || "模型"}`;
      }
    };
    const updateCloudProviderKeyState = async () => {
      const provider = getProviderRuntime(cloudProviderSel.value);
      const secrets = getLlmProviderSecrets();
      const currentRecord = findSecretRecordForOwner(secrets, provider.id);
      const dec = await decryptApiKeyRecord(currentRecord, getCurrentOwner());
      const hasOtherOwnerRecords = !currentRecord && getSecretRecordList(secrets, provider.id).length > 0;
      if (dec?.ok && dec?.apiKey) {
        cloudProviderKeyState.textContent = `已匹配 ${maskKey(dec.apiKey)}`;
        cloudProviderKeyState.className = "pill is-ok mono";
      } else if (dec?.locked || hasOtherOwnerRecords) {
        cloudProviderKeyState.textContent = "已锁定（其它软件账号）";
        cloudProviderKeyState.className = "pill mono";
      } else {
        cloudProviderKeyState.textContent = "当前账号未保存Key";
        cloudProviderKeyState.className = "pill is-bad mono";
      }
    };
    const openProviderModal = async (providerId) => {
      const provider = getProviderRuntime(providerId);
      providerEditingId = provider.id;
      providerPlatformName.value = provider.label;
      providerEndpoint.value = provider.endpoint;
      const owner = getCurrentOwner();
      const record = findSecretRecordForOwner(getLlmProviderSecrets(), provider.id, owner);
      providerOwnerName.value = String(record?.ownerAccount || owner.account || owner.phone || "").trim();
      providerApiKey.value = "";
      const dec = await decryptApiKeyRecord(record, owner);
      providerKeyHint.textContent = dec?.ok && dec?.apiKey ? `当前已保存：${maskKey(dec.apiKey)}` : record?.ownerAccount ? `已为账号 ${record.ownerAccount} 保存` : dec?.message || "未保存";
      providerOverlay.hidden = false;
      providerModal.hidden = false;
      providerApiKey.focus();
    };
    const closeProviderModal = () => {
      providerOverlay.hidden = true;
      providerModal.hidden = true;
      providerEditingId = "";
      providerApiKey.value = "";
      providerOwnerName.value = "";
    };
    const openCloudModal = async () => {
      await syncCatalogFromCloud({ silent: true });
      fillProviderOptions();
      cloudProviderSel.value = getCatalogProviders()[0]?.id || "";
      cloudNameInput.value = "";
      cloudSystemInput.value = "You are a helpful assistant.";
      renderCloudModelOptions();
      await updateCloudProviderKeyState();
      cloudOverlay.hidden = false;
      cloudModal.hidden = false;
      requestAnimationFrame(() => {
        cloudCard?.scrollIntoView({ behavior: "smooth", block: "start" });
        requestAnimationFrame(() => {
          cloudModal.querySelector(".modal-body")?.scrollIntoView({ behavior: "smooth", block: "center" });
          cloudProviderSel.focus();
        });
      });
    };
    const closeCloudModal = () => {
      cloudOverlay.hidden = true;
      cloudModal.hidden = true;
    };

    const openModelModal = (focusTip = false) => {
      picked = { kind: "", path: "", configPath: "", type: "", functions: [], easyServer: null, bundleEntries: [] };
      pickedPathEl.textContent = "未选择";
      pickedPathEl.title = "";
      pickedHintEl.textContent = "请选择 Bundles 目录或 config.json 文件";
      modelOverlay.hidden = false;
      modelModal.hidden = false;
      if (focusTip) modelModal.querySelector(".modal-tip")?.scrollIntoView({ behavior: "smooth", block: "center" });
    };

    const closeModelModal = () => {
      modelOverlay.hidden = true;
      modelModal.hidden = true;
    };

    const openLlm = () => {
      const models = getModels();
      const defaultId = getDefaultModelId();
      const sel = root.querySelector("#default-model");
      sel.innerHTML = models.length
        ? models.map((m) => `<option value="${escapeHtml(m.id)}" ${m.id === defaultId ? "selected" : ""}>${escapeHtml(m.name)}</option>`).join("")
        : `<option value="" selected>暂无模型</option>`;
      llmOverlay.hidden = false;
      llmModal.hidden = false;
    };

    const closeLlm = () => {
      llmOverlay.hidden = true;
      llmModal.hidden = true;
    };

    async function importProjectBundles() {
      const rootPath = String(modelCenterState?.config?.rootPath || "").trim();
      if (rootPath) {
        await importBundleDirectory(rootPath, { setAsRootPath: true, silent: false });
        return;
      }
      await refreshModelCenter({ silent: false });
    }

    const renderProviderCards = async () => {
      const owner = getCurrentOwner();
      providerOwnerPill.textContent = owner.account || owner.phone || "未登录";
      providerOwnerPill.className = `pill ${owner.account ? "is-ok" : ""}`;
      const secrets = getLlmProviderSecrets();
      const cards = [];
      for (const provider of getCatalogProviders()) {
        const allRecords = getSecretRecordList(secrets, provider.id);
        const rec = findSecretRecordForOwner(secrets, provider.id, owner);
        const dec = await decryptApiKeyRecord(rec, owner);
        const statusText = dec?.ok && dec?.apiKey ? "当前账号可用" : dec?.locked ? "凭证已锁定" : "暂未保存";
        const ownerText = allRecords.length ? `已保存 ${allRecords.length} 个账号凭证` : "暂无已保存凭证";
        const providerUpdatedText = provider.updatedAt ? `目录更新 ${fmtDateTime(provider.updatedAt)}` : "";
        const keyPreviewHtml = dec?.ok && dec?.apiKey
          ? renderMaskedKeyHtml(dec.apiKey)
          : escapeHtml(dec?.locked ? "当前凭证仅对应软件账号可读取。" : "当前账号还未保存 Key。");
        const providerDescText = dec?.ok && dec?.apiKey
          ? `归属账号：${owner.account || owner.phone || "未登录"}`
          : dec?.locked
            ? "该凭证属于其它软件账号，当前账号不可读取。"
            : "保存后会自动绑定当前软件账号。";
        const metaPills = [
          `<span class="pill">目录模型 ${Number(provider.models?.length || 0)}</span>`,
          providerUpdatedText ? `<span class="pill">${escapeHtml(providerUpdatedText)}</span>` : ""
        ]
          .filter(Boolean)
          .join("");
        cards.push(`
          <div class="model-provider-item ${provider.theme}">
            <div class="model-provider-head">
              <div class="model-provider-main">
                <div class="model-provider-name">${escapeHtml(provider.label)}</div>
                <div class="model-provider-meta">${metaPills}</div>
              </div>
              <div class="model-provider-status">
                <span class="pill ${dec?.ok ? "is-ok" : dec?.locked ? "" : "is-bad"}">${escapeHtml(statusText)}</span>
              </div>
            </div>
            <div class="model-provider-body">
              <div class="model-provider-keybox ${dec?.ok && dec?.apiKey ? "mono" : "is-empty"}">
                <div class="keybox-title">API Key</div>
                <div class="keybox-content">${keyPreviewHtml}</div>
              </div>
            </div>
            <div class="model-provider-foot">
              <div class="model-provider-foot-info">
                <div class="info-primary" title="${escapeHtml(ownerText)}">${escapeHtml(ownerText)}</div>
                <div class="info-secondary" title="${escapeHtml(providerDescText)}">${escapeHtml(providerDescText)}</div>
              </div>
              <button class="btn ${rec ? "" : "btn-primary"}" data-provider-act="config" data-provider-id="${escapeHtml(provider.id)}">${rec ? "更新凭证" : "设置凭证"}</button>
            </div>
          </div>
        `);
      }
      providerGrid.innerHTML = cards.join("");
      providerGrid.querySelectorAll("[data-provider-act='config']").forEach((btn) => {
        btn.addEventListener("click", () => openProviderModal(btn.getAttribute("data-provider-id")));
      });
    };

    const renderCloudArea = async () => {
      const cloudLlms = getCloudLlms();
      const owner = getCurrentOwner();
      const secrets = getLlmProviderSecrets();
      const usageLogs = getLlmUsageLogs();
      if (!cloudLlms.length) {
        cloudArea.innerHTML = `<div class="empty">暂无可用云端大模型。先检查云端域名配置，或在上方设置平台 Key 后点击“添加云模型”。</div>`;
        return;
      }
      const cards = [];
      for (const item of cloudLlms) {
        const providerRuntime = getProviderRuntime(item.providerId || "");
        const provider = String(providerRuntime?.id || "").trim() === String(item?.providerId || "").trim()
          ? providerRuntime
          : {
              id: String(item?.providerId || "").trim(),
              label: String(item?.providerLabel || item?.providerId || "云端平台").trim() || "云端平台",
              endpoint: String(item?.endpoint || "").trim(),
              theme: ""
            };
        const usage = summarizeUsageByCloudId(usageLogs, item.id);
        const isPublicShared = item?.isPublicShared === true;
        const keyState = isPublicShared
          ? { ok: true, message: "公用云端大模型已内置可用凭证" }
          : await decryptApiKeyRecord(findSecretRecordForOwner(secrets, provider.id, owner), owner);
        const occupiedModules = getSelectedModuleUsagesForCloud(item.id);
        const abilityHtml = Array.isArray(item.abilities) && item.abilities.length
          ? item.abilities.map((tag) => `<span class="pill">${escapeHtml(tag)}</span>`).join("")
          : `<span class="pill">未标注</span>`;
        const scopeHtml = renderModulePills(item.moduleKeys || []);
        const usingHtml = occupiedModules.length
          ? occupiedModules.map((tag) => `<span class="pill is-ok">${escapeHtml(`正在被 ${tag} 调用`)}</span>`).join("")
          : `<span class="pill">${item.enabled === false ? "已停用" : "当前未被首页模块选中"}</span>`;
        cards.push(`
          <div class="model-item model-cloud-item" data-cloud-id="${escapeHtml(item.id)}">
            <div class="model-item-head">
              <div class="model-item-title">
                <span class="pill ${provider.theme}">${escapeHtml(provider.label)}</span>
                <span class="model-name">${escapeHtml(item.name || item.catalogModelLabel || item.model || "未命名云模型")}</span>
                ${item.badge ? `<span class="pill">${escapeHtml(item.badge)}</span>` : ""}
                ${isPublicShared ? `<span class="pill is-ok">固定公用</span>` : ""}
                <span class="pill ${item.enabled === false ? "" : "is-ok"}">${item.enabled === false ? "已停用" : "已启用"}</span>
              </div>
              <div class="card-actions">
                ${isPublicShared ? "" : `<button class="btn ${item.enabled === false ? "btn-primary" : ""}" data-cloud-act="toggle" data-id="${escapeHtml(item.id)}">${item.enabled === false ? "启用" : "停用"}</button>`}
                ${isPublicShared ? "" : `<button class="btn btn-danger" data-cloud-act="remove" data-id="${escapeHtml(item.id)}">移除</button>`}
              </div>
            </div>
            <div class="model-item-body">
              <div class="model-kv"><span class="k">模型</span><span class="v mono">${escapeHtml(item.model || "")}</span></div>
              <div class="model-kv"><span class="k">接口</span><span class="v mono">${escapeHtml(item.endpoint || provider.endpoint || "")}</span></div>
              <div class="model-kv"><span class="k">Key</span><span class="v">${escapeHtml(isPublicShared ? "公用模型已内置，无需用户单独配置" : keyState?.ok ? `当前账号可用 ${maskKey(keyState.apiKey)}` : keyState?.message || "未保存")}</span></div>
              <div class="model-kv"><span class="k">能力</span><span class="v"><div class="model-chip-list">${abilityHtml}</div></span></div>
              <div class="model-kv"><span class="k">模块</span><span class="v"><div class="model-chip-list">${scopeHtml}</div></span></div>
              <div class="model-kv"><span class="k">占用</span><span class="v"><div class="model-chip-list">${usingHtml}</div></span></div>
              ${item.summary ? `<div class="model-kv"><span class="k">简介</span><span class="v">${escapeHtml(item.summary)}</span></div>` : ""}
              <div class="model-cloud-stats">
                <div class="model-stat-box"><div class="k">累计调用</div><div class="v">${fmtNumber(usage.requests)}</div></div>
                <div class="model-stat-box"><div class="k">总Token</div><div class="v">${fmtNumber(usage.totalTokens)}</div></div>
                <div class="model-stat-box"><div class="k">输入Token</div><div class="v">${fmtNumber(usage.promptTokens)}</div></div>
                <div class="model-stat-box"><div class="k">输出Token</div><div class="v">${fmtNumber(usage.completionTokens)}</div></div>
              </div>
            </div>
          </div>
        `);
      }
      cloudArea.innerHTML = `<div class="model-list">${cards.join("")}</div>`;
      cloudArea.querySelectorAll("[data-cloud-act]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const act = btn.getAttribute("data-cloud-act");
          const id = btn.getAttribute("data-id");
          if (!id) return;
          if (act === "toggle") {
            const next = getCloudLlms().map((item) => (item.id === id ? { ...item, enabled: item.enabled === false } : item));
            setCloudLlms(next);
            const enabledList = next.filter((item) => item.enabled !== false);
            if (!enabledList.some((item) => item.id === getActiveCloudLlmId())) setActiveCloudLlmId(enabledList[0]?.id || "");
            renderAll();
            toast(next.find((item) => item.id === id)?.enabled === false ? "已停用云模型。" : "已启用云模型。");
            return;
          }
          const next = getCloudLlms().filter((x) => x.id !== id);
          setCloudLlms(next);
          if (getActiveCloudLlmId() === id) setActiveCloudLlmId(next[0]?.id || "");
          renderAll();
          toast("已移除云端大模型。");
        });
      });
    };

    const renderUsageArea = () => {
      const logs = getLlmUsageLogs();
      if (!logs.length) {
        usageArea.innerHTML = `<div class="empty">暂无调用记录。首页调用大模型后，这里会显示最近使用情况、Token 消耗和耗时统计。</div>`;
        return;
      }
      const summary = logs.reduce(
        (acc, item) => {
          acc.requests += 1;
          acc.totalTokens += Number(item?.usage?.totalTokens || 0) || 0;
          acc.promptTokens += Number(item?.usage?.promptTokens || 0) || 0;
          acc.completionTokens += Number(item?.usage?.completionTokens || 0) || 0;
          acc.cachedTokens += Number(item?.usage?.cachedTokens || 0) || 0;
          acc.reasoningTokens += Number(item?.usage?.reasoningTokens || 0) || 0;
          return acc;
        },
        { requests: 0, totalTokens: 0, promptTokens: 0, completionTokens: 0, cachedTokens: 0, reasoningTokens: 0 }
      );
      const rows = logs
        .slice(0, 20)
        .map(
          (item) => `
            <tr>
              <td>${escapeHtml(fmtDateTime(item.createdAt))}</td>
              <td>${escapeHtml(item.sceneLabel || item.scene || "-")}</td>
              <td>${escapeHtml(item.providerLabel || "-")}</td>
              <td class="mono">${escapeHtml(item.model || "-")}</td>
              <td>${escapeHtml(item.success === false ? "失败" : "成功")}</td>
              <td class="mono">${fmtNumber(item?.usage?.totalTokens)}</td>
              <td class="mono">${fmtNumber(item?.usage?.promptTokens)}</td>
              <td class="mono">${fmtNumber(item?.usage?.completionTokens)}</td>
              <td class="mono">${fmtNumber(item?.elapsedMs)}</td>
            </tr>
          `
        )
        .join("");
      usageArea.innerHTML = `
        <div class="model-cloud-stats" style="margin-bottom: 12px">
          <div class="model-stat-box"><div class="k">总调用</div><div class="v">${fmtNumber(summary.requests)}</div></div>
          <div class="model-stat-box"><div class="k">总Token</div><div class="v">${fmtNumber(summary.totalTokens)}</div></div>
          <div class="model-stat-box"><div class="k">输入Token</div><div class="v">${fmtNumber(summary.promptTokens)}</div></div>
          <div class="model-stat-box"><div class="k">输出Token</div><div class="v">${fmtNumber(summary.completionTokens)}</div></div>
          <div class="model-stat-box"><div class="k">缓存Token</div><div class="v">${fmtNumber(summary.cachedTokens)}</div></div>
          <div class="model-stat-box"><div class="k">推理Token</div><div class="v">${fmtNumber(summary.reasoningTokens)}</div></div>
        </div>
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th style="width: 170px">时间</th>
                <th style="width: 110px">模块</th>
                <th style="width: 120px">平台</th>
                <th>模型</th>
                <th style="width: 72px">结果</th>
                <th style="width: 96px">总Token</th>
                <th style="width: 96px">输入</th>
                <th style="width: 96px">输出</th>
                <th style="width: 90px">耗时ms</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `;
    };

    const renderLocalModels = () => {
      const models = getModels();
      const defaultId = getDefaultModelId();
      if (!models.length) {
        area.innerHTML = `
          <div class="models-empty">
            <div class="models-empty-illus">
              <div class="models-empty-icon">◎</div>
              <div class="models-empty-title">请添加本地模型，连接本地加速</div>
              <div class="models-empty-sub">后续可直接在首页模块中调用本地大模型能力</div>
            </div>
            <div class="models-empty-actions">
              <button class="btn btn-primary" id="btn-add-model">导入单个模型</button>
              <button class="btn" id="btn-open-center">配置模型中心</button>
            </div>
            <div class="models-empty-tip">
              <div class="label">添加步骤</div>
              <ol class="tip-list" style="margin-top: 6px">
                <li>先在上方“本地模型中心”配置模型目录</li>
                <li>扫描并批量导入 Bundles，失败项会给出原因</li>
                <li>导入后在首页各模块中直接选择</li>
              </ol>
            </div>
          </div>
        `;
      } else {
        area.innerHTML = `
          <div class="model-toolbar">
            <button class="btn btn-primary" id="btn-add-model">导入单个模型</button>
            <button class="btn" id="btn-open-center">配置模型中心</button>
          </div>
          <div class="model-list">
            ${models
              .map((m) => {
                const typeLabel = m.type || (m.kind === "bundles" ? "Bundles" : m.kind);
                const abilities = Array.isArray(m.functions) ? m.functions : [];
                const validationHtml = renderValidationSummaryHtml(m.validation);
                return `
                  <div class="model-item" data-id="${escapeHtml(m.id)}">
                    <div class="model-item-head">
                      <div class="model-item-title">
                        <span class="pill">${escapeHtml(typeLabel)}</span>
                        <span class="model-name">${escapeHtml(m.name)}</span>
                        ${m.id === defaultId ? `<span class="pill is-ok">默认</span>` : ""}
                      </div>
                      <div class="card-actions">
                        <button class="btn" data-act="setDefault">设为默认</button>
                        <button class="btn btn-danger" data-act="remove">移除</button>
                      </div>
                    </div>
                    <div class="model-item-body">
                      <div class="model-kv"><span class="k">路径</span><span class="v mono">${escapeHtml(m.path || m.bundleDir || "")}</span></div>
                      ${m.configPath ? `<div class="model-kv"><span class="k">config</span><span class="v mono">${escapeHtml(m.configPath)}</span></div>` : ""}
                      <div class="model-kv"><span class="k">能力</span><span class="v"><div class="model-chip-list">${abilities.length ? abilities.map((x) => `<span class="pill">${escapeHtml(x)}</span>`).join("") : `<span class="pill">未标注</span>`}</div></span></div>
                      <div class="model-kv"><span class="k">校验</span><span class="v"><div class="model-chip-list">${validationHtml}</div></span></div>
                      <div class="model-kv"><span class="k">状态</span><span class="v">${escapeHtml(m.status || "已导入")}</span></div>
                    </div>
                  </div>
                `;
              })
              .join("")}
          </div>
        `;
      }
      const btnAdd = area.querySelector("#btn-add-model");
      if (btnAdd) btnAdd.addEventListener("click", openModelModal);
      const btnOpenCenter = area.querySelector("#btn-open-center");
      if (btnOpenCenter) btnOpenCenter.addEventListener("click", () => {
        root.querySelector(".model-center-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      area.querySelectorAll(".model-item [data-act]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const act = btn.getAttribute("data-act");
          const id = btn.closest(".model-item")?.getAttribute("data-id");
          if (!id) return;
          const modelsNow = getModels();
          if (act === "remove") {
            const ok = await confirmDialog({
              title: "移除本地模型",
              message: "这只会从当前软件列表中移除该模型，不会删除磁盘上的模型文件。是否继续？",
              confirmText: "确认移除",
              cancelText: "取消",
              tone: "warn"
            });
            if (!ok) return;
            const next = modelsNow.filter((x) => x.id !== id);
            setModels(next);
            if (getDefaultModelId() === id) setDefaultModelId(next[0]?.id || "");
            await renderAll();
            toast("已移除模型。");
            return;
          }
          setDefaultModelId(id);
          await renderAll();
          toast("已设置默认模型。");
        });
      });
    };

    const renderAll = async () => {
      repairLocalModelStore({ silent: true });
      await renderProviderCards();
      await renderCloudArea();
      renderUsageArea();
      renderModelCenterArea();
      renderLocalModels();
    };

    fillProviderOptions();

    root.querySelector("#btn-cloud-add").addEventListener("click", openCloudModal);
    root.querySelector("#cloud-modal-close").addEventListener("click", closeCloudModal);
    root.querySelector("#cloud-cancel").addEventListener("click", closeCloudModal);
    cloudOverlay.addEventListener("click", closeCloudModal);
    root.querySelector("#btn-sync-catalog").addEventListener("click", async () => {
      await refreshCloudModels({ silent: false }).catch(() => {});
    });
    cloudProviderSel.addEventListener("change", async () => {
      cloudNameInput.value = "";
      renderCloudModelOptions();
      await updateCloudProviderKeyState();
    });
    cloudModelSel.addEventListener("change", renderCloudModelOptions);
    root.querySelector("#cloud-provider-key-config").addEventListener("click", () => openProviderModal(cloudProviderSel.value));

    root.querySelector("#provider-modal-close").addEventListener("click", closeProviderModal);
    root.querySelector("#provider-key-cancel").addEventListener("click", closeProviderModal);
    providerOverlay.addEventListener("click", closeProviderModal);

    root.querySelector("#provider-key-save").addEventListener("click", async () => {
      const provider = getProviderRuntime(providerEditingId);
      const currentOwner = getCurrentOwner();
      const ownerAccount = String(providerOwnerName.value || "").trim();
      const apiKey = String(providerApiKey.value || "").trim();
      if (!ownerAccount) {
        toast("请输入归属账号。");
        return;
      }
      if (!apiKey) {
        toast("请输入 API Key。");
        return;
      }
      const owner = {
        userId: ownerAccount === currentOwner.account ? currentOwner.userId : "",
        account: ownerAccount
      };
      const enc = await encryptApiKeyForOwner({ providerId: provider.id, apiKey, owner });
      if (!enc?.ok) {
        toast(enc?.message || "Key 保存失败。");
        return;
      }
      const list = getSecretRecordList(getLlmProviderSecrets(), provider.id).filter((item) => String(item?.ownerAccount || "").trim() !== ownerAccount);
      const next = {
        ...getLlmProviderSecrets(),
        [provider.id]: [...list, {
          providerId: provider.id,
          providerLabel: provider.label,
          ownerUserId: owner.userId,
          ownerAccount: owner.account,
          enc: enc.data,
          updatedAt: new Date().toISOString()
        }]
      };
      setLlmProviderSecrets(next);
      closeProviderModal();
      await renderAll();
      await updateCloudProviderKeyState();
      toast(`${provider.label} 的 API Key 已加密保存。`);
    });

    root.querySelector("#provider-key-remove").addEventListener("click", async () => {
      const provider = getProviderRuntime(providerEditingId);
      const ownerAccount = String(providerOwnerName.value || "").trim();
      const all = { ...getLlmProviderSecrets() };
      const nextList = getSecretRecordList(all, provider.id).filter((item) => String(item?.ownerAccount || "").trim() !== ownerAccount);
      if (nextList.length) all[provider.id] = nextList;
      else delete all[provider.id];
      setLlmProviderSecrets(all);
      closeProviderModal();
      await renderAll();
      await updateCloudProviderKeyState();
      toast(`已移除 ${provider.label} 的 Key。`);
    });

    root.querySelector("#btn-usage-clear").addEventListener("click", async () => {
      const ok = await confirmDialog({
        title: "清空调用统计",
        message: "该操作会清空当前软件内的大模型调用统计，但不会影响已保存的模型配置。是否继续？",
        confirmText: "确认清空",
        cancelText: "取消",
        tone: "warn"
      });
      if (!ok) return;
      setLlmUsageLogs([]);
      renderUsageArea();
      toast("已清空调用统计。");
    });

    root.querySelector("#btn-model-center-refresh").addEventListener("click", () => {
      refreshModelCenter({ silent: false }).catch(() => {});
    });
    root.querySelector("#btn-model-center-open").addEventListener("click", () => {
      root.querySelector(".model-center-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    root.querySelector("#model-modal-close").addEventListener("click", closeModelModal);
    root.querySelector("#model-cancel").addEventListener("click", closeModelModal);
    modelOverlay.addEventListener("click", closeModelModal);
    root.querySelector("#btn-import-bundles").addEventListener("click", async () => {
      const res = await window.api?.openDirectory?.();
      if (!res || res.canceled) return;
      const dir = normalizePath(res.directoryPath);
      if (!dir) return;
      const scanRes = await window.api?.models?.scanBundleTree?.(dir).catch?.(() => null);
      const bundleEntries = Array.isArray(scanRes?.bundles) ? scanRes.bundles : [];
      picked = {
        kind: bundleEntries.length ? "bundle-group" : "bundles",
        path: dir,
        configPath: "",
        type: bundleEntries.length ? "Bundles" : "Unknown",
        functions: [],
        easyServer: null,
        bundleEntries,
        report: scanRes?.report || null
      };
      pickedPathEl.textContent = dir;
      pickedPathEl.title = dir;
      if (bundleEntries.length) {
        const report = scanRes?.report || null;
        pickedHintEl.textContent = report
          ? `已识别 ${report.totalCount} 个模型包，可导入 ${report.successCount} 个，失败 ${report.failureCount} 个。`
          : `已识别 ${bundleEntries.length} 个模型包。`;
        return;
      }
      pickedHintEl.textContent = "该目录下未识别到可用模型包，请确认目录中包含 config.json。";
    });
    root.querySelector("#btn-pick-config").addEventListener("click", async () => {
      const res = await window.api?.openFile?.();
      if (!res || res.canceled) return;
      const fp = normalizePath(res.filePaths?.[0] || "");
      if (!fp) return;
      if (!fp.toLowerCase().endsWith(".json")) {
        toast("请选择 .json 文件。");
        return;
      }
      const parsed = await window.api?.models?.readConfig?.(fp);
      if (parsed?.ok) {
        const config = parsed.config || {};
        picked = {
          kind: "bundle",
          path: parsed.bundleDir || fp,
          bundleDir: parsed.bundleDir || "",
          configPath: fp,
          type: parsed.type || "Unknown",
          functions: Array.isArray(config.functions) ? config.functions : [],
          easyServer: config.easyServer || null,
          name: config.title || config.name || baseName(parsed.bundleDir || fp),
          description: config.description || "",
          bundleEntries: []
        };
        pickedPathEl.textContent = fp;
        pickedPathEl.title = fp;
        pickedHintEl.textContent = `已识别：${picked.type}（${picked.name}）`;
        return;
      }
      picked = { kind: "config", path: fp, configPath: fp, type: "Unknown", functions: [], easyServer: null, bundleEntries: [] };
      pickedPathEl.textContent = fp;
      pickedPathEl.title = fp;
      pickedHintEl.textContent = "已选择 config.json，后续可继续补充兼容端点配置。";
    });
    root.querySelector("#model-confirm").addEventListener("click", async () => {
      if (!picked.path) {
        toast("请先选择 Bundles 或 config.json。");
        return;
      }
      if (picked.kind === "bundle-group") {
        const bundles = Array.isArray(picked.bundleEntries) ? picked.bundleEntries : [];
        if (!bundles.length) {
          toast("该目录下未识别到可导入的模型包。");
          return;
        }
        const importRes = await importBundleDirectory(picked.path, { setAsRootPath: false, silent: true });
        if (!importRes?.ok) {
          toast(importRes?.message || "模型包导入失败。", { type: "error" });
          return;
        }
        closeModelModal();
        const report = importRes?.data?.report || picked.report;
        toast(
          report
            ? `已导入 ${fmtNumber(report.successCount || 0)} 个模型包，失败 ${fmtNumber(report.failureCount || 0)} 个。`
            : "模型包已导入。"
        );
        return;
      }
      const models = getModels();
      const already = models.some((m) => (m.configPath && picked.configPath && m.configPath === picked.configPath) || (m.path && m.path === picked.path));
      if (already) {
        toast("该模型已存在。");
        closeModelModal();
        return;
      }
      const name = picked.name || (picked.kind === "bundles" ? baseName(picked.path) : baseName(picked.path.replace(/\\/g, "/")));
      const newModel = {
        id: nowId(),
        name: name || "未命名模型",
        kind: picked.kind || "bundle",
        type: picked.type || "",
        path: picked.path,
        bundleDir: picked.bundleDir || "",
        configPath: picked.configPath,
        functions: Array.isArray(picked.functions) ? picked.functions : [],
        easyServer: picked.easyServer || null,
        status: "已导入",
        createdAt: Date.now()
      };
      const next = [newModel, ...models];
      setModels(next);
      if (!getDefaultModelId()) setDefaultModelId(newModel.id);
      closeModelModal();
      await renderAll();
      toast("已添加模型。");
    });

    root.querySelector("#btn-llm-settings").addEventListener("click", openLlm);
    root.querySelector("#btn-refresh-cloud-models").addEventListener("click", () => {
      repairLocalModelStore({ silent: false });
      refreshCloudModels({ silent: false }).catch(() => {});
    });
    root.querySelector("#llm-modal-close").addEventListener("click", closeLlm);
    root.querySelector("#llm-cancel").addEventListener("click", closeLlm);
    llmOverlay.addEventListener("click", closeLlm);
    root.querySelector("#llm-save").addEventListener("click", () => {
      const id = root.querySelector("#default-model")?.value || "";
      setDefaultModelId(id);
      closeLlm();
      renderAll();
      toast("已保存大模型设置。");
    });

    root.querySelector("#cloud-save").addEventListener("click", async () => {
      const provider = getProviderRuntime(cloudProviderSel.value);
      const providerKey = await decryptApiKeyRecord(findSecretRecordForOwner(getLlmProviderSecrets(), provider.id), getCurrentOwner());
      if (!providerKey?.ok || !providerKey?.apiKey) {
        toast("请先为当前平台保存可用的 API Key。");
        return;
      }
      const selectedModel = getProviderModels(provider.id).find((item) => item.id === String(cloudModelSel.value || "").trim());
      if (!selectedModel?.id) {
        toast("请选择要添加的模型。");
        return;
      }
      const all = getCloudLlms();
      const duplicated = all
        .filter((item) => item?.isPublicShared !== true)
        .some((item) => String(item.providerId || "").trim() === provider.id && String(item.model || "").trim() === selectedModel.id);
      if (duplicated) {
        toast("该云模型已添加，无需重复添加。");
        return;
      }
      const item = {
        id: nowId(),
        name: String(cloudNameInput.value || "").trim() || `${provider.label}-${selectedModel.label}`,
        providerId: provider.id,
        providerLabel: provider.label,
        model: selectedModel.id,
        endpoint: provider.endpoint,
        abilities: Array.isArray(selectedModel.abilities) ? selectedModel.abilities : [],
        moduleKeys: Array.isArray(selectedModel.moduleKeys) ? selectedModel.moduleKeys : [],
        summary: String(selectedModel.summary || "").trim(),
        badge: String(selectedModel.badge || "").trim(),
        catalogModelLabel: String(selectedModel.label || selectedModel.id || "").trim(),
        enabled: true,
        systemPrompt: String(cloudSystemInput.value || "").trim(),
        createdAt: Date.now()
      };
      const next = [item, ...all];
      setCloudLlms(next);
      if (!getActiveCloudLlmId()) setActiveCloudLlmId(item.id);
      closeCloudModal();
      await renderAll();
      toast("已添加云端大模型。");
    });

    document.addEventListener("keydown", (e) => {
      if (root.hidden) return;
      if (e.key !== "Escape") return;
      if (!modelModal.hidden) closeModelModal();
      if (!llmModal.hidden) closeLlm();
      if (!providerModal.hidden) closeProviderModal();
      if (!cloudModal.hidden) closeCloudModal();
    });

    await refreshCloudModels({ silent: true });
    await refreshModelCenter({ silent: true });
    fillProviderOptions();
    renderCloudModelOptions();
    await updateCloudProviderKeyState();
    await renderAll();
    root.querySelector("#btn-scan-project").addEventListener("click", importProjectBundles);
    return root;
  }
};
