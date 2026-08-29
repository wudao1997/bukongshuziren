import { elFromHTML, pageHeader, topToast } from "../ui.js";
import { getActiveVoiceId, getAudioHistory, getCloneVoices, getLlmProviderSecrets, setActiveVoiceId, setAudioHistory, setCloneVoices } from "../store.js";
import { buildCloudMethodUrl, isSuperAdminIdentity } from "../gongneng/shenfenquanxian.js";
import { getRecommendedCloneMinSeconds, saveCloneVoicesToJsonAndLocal, syncCloneVoicesFromJsonToLocal, upsertCloneVoiceToStorage } from "../gongneng/shouyekelongyinpin.js";

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

function escapeOptionHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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

export const route = {
  path: "/voice-clone",
  title: "声音克隆",
  cache: true,
  async render() {
    const root = elFromHTML(`
      <div>
        ${pageHeader({
          title: "声音克隆",
          subtitle: "在当前菜单中直接完成克隆、保存、试听和选择音色，支持本地模型与阿里云 CosyVoice。",
          actionsHTML: `
            <button class="btn btn-soft" id="voiceclone-refresh">刷新列表</button>
            <button class="btn btn-primary" id="voiceclone-go-home">去首页配音</button>
          `
        })}

        <div class="grid cols-2" style="margin-bottom: 14px;">
          <div class="card">
            <div class="card-title"><h3>音色概览</h3><span class="pill">工作台</span></div>
            <div class="card-actions" style="justify-content: space-between;">
              <div><div class="mono" style="font-size: 24px; font-weight: 700;" id="voiceclone-count">0</div><div class="hint">已保存克隆音色</div></div>
              <div><div class="mono" style="font-size: 24px; font-weight: 700;" id="voiceclone-active-count">0</div><div class="hint">当前已选音色</div></div>
              <div><div class="mono" style="font-size: 24px; font-weight: 700;" id="voiceclone-cloud-count">0</div><div class="hint">历史音频</div></div>
            </div>
          </div>
          <div class="card">
            <div class="card-title"><h3>复刻说明</h3><span class="pill">优化交互</span></div>
            <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;">
              <div style="padding:12px 14px;border-radius:14px;background:#f8fafc;border:1px solid #e5e7eb;">
                <div style="font-weight:700;color:#111827;">录音设备</div>
                <div class="hint" style="margin-top:6px;line-height:1.8;">建议使用支持 24kHz 及以上采样率的手机、录音笔或专业设备，保证输入音频清晰稳定。</div>
              </div>
              <div style="padding:12px 14px;border-radius:14px;background:#f8fafc;border:1px solid #e5e7eb;">
                <div style="font-weight:700;color:#111827;">录音环境</div>
                <div class="hint" style="margin-top:6px;line-height:1.8;">优先在 10 平方米以内的小型封闭空间录音，关闭空调风扇，减少混响和底噪。</div>
              </div>
              <div style="padding:12px 14px;border-radius:14px;background:#f8fafc;border:1px solid #e5e7eb;">
                <div style="font-weight:700;color:#111827;">录音文案</div>
                <div class="hint" style="margin-top:6px;line-height:1.8;">避免过短句子，保持至少 3 秒连续表达，语速稳定，可加入自然情绪但不要机械朗读。</div>
              </div>
              <div style="padding:12px 14px;border-radius:14px;background:#eef2ff;border:1px solid #c7d2fe;">
                <div style="font-weight:700;color:#3730a3;">操作建议</div>
                <div class="hint" style="margin-top:6px;line-height:1.8;">先选模型再录音。阿里云 CosyVoice 需要公网音频 URL，可直接点击“上传到云端并填写 URL”。录音时保持与设备约 10 厘米距离。</div>
              </div>
            </div>
          </div>
        </div>

        <div class="grid cols-2">
          <div class="card">
            <div class="card-title">
              <h3>声音资源列表</h3>
              <span class="pill" id="voiceclone-list-pill">本地缓存</span>
            </div>
            <div class="card-actions" style="justify-content:space-between;gap:8px;margin-bottom:10px;flex-wrap:wrap;">
              <div class="card-actions" style="justify-content:flex-start;gap:8px;">
              <button class="btn btn-soft" id="voiceclone-tab-voices">克隆音色</button>
              <button class="btn btn-soft" id="voiceclone-tab-history">历史音频</button>
              </div>
              <div class="card-actions" style="justify-content:flex-end;gap:8px;">
                <button class="btn btn-soft" id="voiceclone-batch-toggle">批量管理</button>
                <button class="btn" id="voiceclone-batch-all" hidden>全选</button>
                <button class="btn btn-danger" id="voiceclone-batch-delete" hidden>批量删除</button>
              </div>
            </div>
            <div id="voiceclone-list" class="voice-list"></div>
          </div>

          <div style="display:flex;flex-direction:column;gap:14px;">
            <div class="card">
              <div class="card-title"><h3>直接克隆声音</h3><span class="pill">可立即执行</span></div>
              <div class="form">
              <div class="grid cols-2" style="gap: 10px;">
                <div class="field">
                  <div class="label">音色名称</div>
                  <input id="clone-name" type="text" placeholder="例如：我的专属音色" />
                </div>
                <div class="field">
                  <div class="label">麦克风</div>
                  <select id="clone-mic"></select>
                </div>
              </div>
              <div class="field" style="margin-top: 10px;">
                <div class="label">克隆模型</div>
                <select id="clone-model-select"></select>
                <div class="hint" id="clone-model-hint">复刻过程只按这里所选模型执行。</div>
              </div>
              <div class="field" style="margin-top: 10px;">
                <div class="label">参考音频</div>
                <div class="card-actions">
                  <button class="btn btn-primary" id="clone-record">开始录制</button>
                  <button class="btn" id="clone-stop" disabled>停止</button>
                  <button class="btn" id="clone-pick-file">选择音频文件</button>
                  <span class="pill mono" id="clone-audio-status">未录制</span>
                </div>
                <div class="hint">建议 6~20 秒，清晰无噪音；可录音，也可直接选择本地参考音频。</div>
              </div>
              <div class="field" style="margin-top: 10px;">
                <div class="label">公网音频 URL（阿里云 CosyVoice 必填）</div>
                <input id="clone-public-audio-url" type="text" placeholder="https://example.com/voice.wav" />
                <div class="card-actions" style="margin-top: 8px;">
                  <button class="btn" id="clone-upload-cloud-audio">上传到云端并填写 URL</button>
                  <span class="pill mono" id="clone-upload-cloud-status">未上传</span>
                </div>
                <div class="hint" id="clone-cloud-hint">当前使用本地模型时可留空；切到阿里云 CosyVoice 后必须填写公网音频 URL。</div>
              </div>
              <div class="field" style="margin-top: 10px;">
                <div class="label">参考文字</div>
                <textarea id="clone-ref-text" placeholder="请输入参考文字（用于生成预览音频）..."></textarea>
              </div>
              <div class="card-actions" style="margin-top: 12px;">
                <button class="btn btn-primary" id="clone-create">开始复刻</button>
                <button class="btn" id="clone-cancel-gen" disabled>停止生成</button>
                <button class="btn btn-soft" id="clone-reset">重置表单</button>
                <button class="btn btn-primary" id="clone-save" disabled>保存音色</button>
              </div>
              <div class="field" style="margin-top: 10px;">
                <div class="label">生成日志</div>
                <pre class="clone-log" id="clone-log-box"></pre>
              </div>
              </div>
            </div>
            <div class="card">
              <div class="card-title"><h3>语音合成</h3><span class="pill" id="voiceclone-synth-voice-pill">请先选择音色</span></div>
              <div class="form">
                <div class="field">
                  <div class="label">合成文本</div>
                  <textarea id="voiceclone-synth-text" placeholder="请输入需要合成的新文案内容..."></textarea>
                </div>
                <div class="field" style="margin-top:10px;">
                  <div class="label">TTS 模型</div>
                  <select id="voiceclone-synth-model"></select>
                  <div class="hint" id="voiceclone-synth-model-hint">默认沿用当前列表中的可用模型，你也可以切换。</div>
                </div>
                <div class="grid cols-3" style="gap:10px;margin-top:10px;">
                  <div class="field">
                    <div class="label">情绪</div>
                    <select id="voiceclone-synth-emotion">
                      <option selected>自然</option>
                      <option>兴奋</option>
                      <option>严肃</option>
                      <option>温柔</option>
                    </select>
                  </div>
                  <div class="field">
                    <div class="label">语言</div>
                    <select id="voiceclone-synth-language">
                      <option selected>中文（普通话）</option>
                      <option>中文（粤语）</option>
                      <option>英语</option>
                    </select>
                  </div>
                  <div class="field">
                    <div class="label">语速</div>
                    <select id="voiceclone-synth-speed">
                      <option>0.9</option>
                      <option selected>1.0</option>
                      <option>1.1</option>
                    </select>
                  </div>
                </div>
                <div class="card-actions" style="margin-top:12px;">
                  <button class="btn btn-primary" id="voiceclone-synth-create">开始合成</button>
                  <button class="btn" id="voiceclone-synth-cancel" disabled>停止生成</button>
                  <button class="btn btn-soft" id="voiceclone-synth-to-history">切到历史音频</button>
                </div>
                <div class="field" style="margin-top:10px;">
                  <div class="label">运行日志</div>
                  <pre class="clone-log" id="voiceclone-synth-log"></pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `);

    const listEl = root.querySelector("#voiceclone-list");
    const countEl = root.querySelector("#voiceclone-count");
    const activeCountEl = root.querySelector("#voiceclone-active-count");
    const cloudCountEl = root.querySelector("#voiceclone-cloud-count");
    const listPill = root.querySelector("#voiceclone-list-pill");
    const voiceTabVoices = root.querySelector("#voiceclone-tab-voices");
    const voiceTabHistory = root.querySelector("#voiceclone-tab-history");
    const batchToggleBtn = root.querySelector("#voiceclone-batch-toggle");
    const batchAllBtn = root.querySelector("#voiceclone-batch-all");
    const batchDeleteBtn = root.querySelector("#voiceclone-batch-delete");
    const cloneName = root.querySelector("#clone-name");
    const cloneMic = root.querySelector("#clone-mic");
    const cloneModelSelect = root.querySelector("#clone-model-select");
    const cloneModelHint = root.querySelector("#clone-model-hint");
    const cloneRecord = root.querySelector("#clone-record");
    const cloneStop = root.querySelector("#clone-stop");
    const clonePickFile = root.querySelector("#clone-pick-file");
    const cloneAudioStatus = root.querySelector("#clone-audio-status");
    const clonePublicAudioUrl = root.querySelector("#clone-public-audio-url");
    const cloneUploadCloudAudio = root.querySelector("#clone-upload-cloud-audio");
    const cloneUploadCloudStatus = root.querySelector("#clone-upload-cloud-status");
    const cloneCloudHint = root.querySelector("#clone-cloud-hint");
    const cloneRefText = root.querySelector("#clone-ref-text");
    const cloneCreate = root.querySelector("#clone-create");
    const cloneCancelGen = root.querySelector("#clone-cancel-gen");
    const cloneReset = root.querySelector("#clone-reset");
    const cloneSave = root.querySelector("#clone-save");
    const cloneLogBox = root.querySelector("#clone-log-box");
    const synthVoicePill = root.querySelector("#voiceclone-synth-voice-pill");
    const synthText = root.querySelector("#voiceclone-synth-text");
    const synthModelSelect = root.querySelector("#voiceclone-synth-model");
    const synthModelHint = root.querySelector("#voiceclone-synth-model-hint");
    const synthEmotion = root.querySelector("#voiceclone-synth-emotion");
    const synthLanguage = root.querySelector("#voiceclone-synth-language");
    const synthSpeed = root.querySelector("#voiceclone-synth-speed");
    const synthCreate = root.querySelector("#voiceclone-synth-create");
    const synthCancel = root.querySelector("#voiceclone-synth-cancel");
    const synthToHistory = root.querySelector("#voiceclone-synth-to-history");
    const synthLogBox = root.querySelector("#voiceclone-synth-log");

    let previewAudio = null;
    let mediaRecorder = null;
    let micStream = null;
    let recordChunks = [];
    let recordedBlob = null;
    let pickedPromptFilePath = "";
    let pendingCloneVoice = null;
    let currentCloneTaskId = "";
    let currentSynthTaskId = "";
    let homeMediaBundleCatalog = [];
    let activeListTab = "voices";
    let listBatchMode = false;
    let batchSelectedIds = new Set();
    let previewingItemKey = "";
    let cloneModelSelectionId = "";

    const stopPreviewAudio = () => {
      try {
        previewAudio?.pause?.();
      } catch {}
      previewingItemKey = "";
      previewAudio = null;
      renderVoiceList();
    };
    const attachPreviewAudio = (audio, itemKey) => {
      previewAudio = audio || null;
      previewingItemKey = String(itemKey || "").trim();
      if (previewAudio) {
        previewAudio.onended = () => stopPreviewAudio();
        previewAudio.onerror = () => stopPreviewAudio();
      }
      renderVoiceList();
    };

    const pushCloneLog = (level, message) => {
      if (!cloneLogBox) return;
      const now = new Date();
      const ts = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
      cloneLogBox.textContent += `[${ts}][${String(level || "info")}] ${String(message || "")}\n`;
      cloneLogBox.scrollTop = cloneLogBox.scrollHeight;
    };

    const clearCloneLog = () => {
      if (cloneLogBox) cloneLogBox.textContent = "";
    };
    const pushSynthLog = (level, message) => {
      if (!synthLogBox) return;
      const now = new Date();
      const ts = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
      synthLogBox.textContent += `[${ts}][${String(level || "info")}] ${String(message || "")}\n`;
      synthLogBox.scrollTop = synthLogBox.scrollHeight;
    };
    const clearSynthLog = () => {
      if (synthLogBox) synthLogBox.textContent = "";
    };

    const setCloneUploadStatus = (text, title = "") => {
      cloneUploadCloudStatus.textContent = String(text || "").trim() || "未上传";
      cloneUploadCloudStatus.title = String(title || "").trim();
    };

    const canReadProviderSecretRecord = (record, ownerAccount, ownerUserId, authIdentity) => {
      const recordAccount = String(record?.ownerAccount || "").trim();
      const recordUserId = String(record?.ownerUserId || "").trim();
      if (!recordAccount && !recordUserId) return true;
      if (recordAccount === ownerAccount && (!recordUserId || recordUserId === ownerUserId)) return true;
      if (isSuperAdminIdentity(authIdentity)) return true;
      return false;
    };

    const hasReadableProviderSecret = (providerId) => {
      const auth = readAuth();
      const ownerAccount = String(auth?.account || "").trim();
      const ownerUserId = String(auth?.userId || "").trim();
      const authIdentity = String(auth?.identity || "").trim();
      const raw = getLlmProviderSecrets()?.[String(providerId || "").trim()];
      const list = Array.isArray(raw) ? raw : raw && typeof raw === "object" ? [raw] : [];
      return !!ownerAccount && list.some((item) => canReadProviderSecretRecord(item, ownerAccount, ownerUserId, authIdentity));
    };

    const resolveCloudApiKeyByProvider = async (providerId) => {
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
    };

    const formatHistoryTime = (value) => {
      const createdAt = Number(value || 0);
      const d = createdAt ? new Date(createdAt) : null;
      if (!d) return "未知时间";
      return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(
        d.getMinutes()
      ).padStart(2, "0")}`;
    };
    const isCurrentAudioHistoryOwner = (item) => {
      const auth = readAuth();
      const ownerAccount = String(auth?.account || "").trim();
      const ownerUserId = String(auth?.userId || "").trim();
      const itemAccount = String(item?.ownerAccount || "").trim();
      const itemUserId = String(item?.ownerUserId || "").trim();
      if (!ownerAccount) return true;
      if (!itemAccount && !itemUserId) return true;
      if (itemAccount && itemAccount !== ownerAccount) return false;
      if (itemUserId && ownerUserId && itemUserId !== ownerUserId) return false;
      return true;
    };
    const readCurrentAudioHistory = () => getAudioHistory().filter(isCurrentAudioHistoryOwner);
    const writeCurrentAudioHistory = (list) => {
      const keepIds = new Set((Array.isArray(list) ? list : []).map((item) => String(item?.id || "").trim()).filter(Boolean));
      const remained = getAudioHistory().filter((item) => !isCurrentAudioHistoryOwner(item) || keepIds.has(String(item?.id || "").trim()));
      const own = Array.isArray(list) ? list : [];
      setAudioHistory([...own, ...remained]);
    };

    const buildCloneModelCatalog = () => {
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
    };

    const resolveSelectedCloneModel = () => {
      const catalog = buildCloneModelCatalog();
      return catalog.find((item) => item.id === String(cloneModelSelect?.value || "").trim()) || catalog[0] || null;
    };

    const isAliyunCosyVoiceSelection = (selection) =>
      String(selection?.source || "").trim() === "cloud" &&
      String(selection?.providerId || "").trim() === "aliyun-bailian" &&
      /^cosyvoice-v3\.5-(plus|flash)$/i.test(String(selection?.modelId || selection?.modelChoice?.modelId || "").trim());

    const ensureCloneSelection = async () => {
      const selected = resolveSelectedCloneModel();
      if (!selected) {
        topToast("当前暂无可用克隆模型。", { type: "warn" });
        return null;
      }
      if (selected.source !== "cloud") return selected;
      const apiKey = await resolveCloudApiKeyByProvider("aliyun-bailian");
      if (!apiKey) {
        topToast("当前已选阿里云 CosyVoice，但当前登录账号下还没有可用的阿里云百炼 API Key。", { type: "warn" });
        return null;
      }
      return {
        ...selected,
        modelChoice: {
          ...(selected.modelChoice || {}),
          apiKey
        }
      };
    };

    const renderCloneModelSelect = () => {
      const catalog = buildCloneModelCatalog();
      const preferredId = String(cloneModelSelectionId || cloneModelSelect.value || "").trim();
      const cloudOptions = catalog
        .filter((item) => item.source === "cloud")
        .map((item) => {
          const suffix = item.configured === false ? "｜待配置Key" : "";
          return `<option value="${escapeOptionHtml(item.id)}">${escapeOptionHtml(`${item.label}｜${item.sourceLabel}${suffix}`)}</option>`;
        })
        .join("");
      const localOptions = catalog
        .filter((item) => item.source !== "cloud")
        .map((item) => `<option value="${escapeOptionHtml(item.id)}">${escapeOptionHtml(`${item.label}｜${item.sourceLabel}`)}</option>`)
        .join("");
      const groups = [];
      if (cloudOptions) groups.push(`<optgroup label="云端克隆模型">${cloudOptions}</optgroup>`);
      if (localOptions) groups.push(`<optgroup label="本地克隆模型">${localOptions}</optgroup>`);
      cloneModelSelect.innerHTML = groups.length ? groups.join("") : `<option value="">暂无可用模型</option>`;
      cloneModelSelect.disabled = !catalog.length;
      const nextId = catalog.find((item) => item.id === preferredId)?.id || String(catalog[0]?.id || "");
      cloneModelSelect.value = nextId;
      cloneModelSelectionId = nextId;
      const selected = resolveSelectedCloneModel();
      const isAliyun = isAliyunCosyVoiceSelection(selected);
      const hasConfiguredKey = selected?.configured !== false;
      const selectedLabel = String(selected?.modelChoice?.label || selected?.label || "阿里云 CosyVoice").trim() || "阿里云 CosyVoice";
      cloneModelHint.textContent = isAliyun
        ? hasConfiguredKey
          ? `当前复刻将固定调用${selectedLabel}，不会误用本地 TTS。百炼文档建议样本音频 10~20 秒，当前最低按 ${getRecommendedCloneMinSeconds(selected)} 秒校验。`
          : `${selectedLabel} 已显示在列表中，但当前账号还没有可用的阿里云百炼 API Key。`
        : "当前复刻将使用本地 TTS 克隆链路。";
      cloneCloudHint.textContent = isAliyun
        ? hasConfiguredKey
          ? `当前已切换到${selectedLabel}。请填写公网音频 URL，或直接点击“上传到云端并填写 URL”。`
          : `当前已切换到${selectedLabel}，但执行前仍需先在“模型”菜单保存当前账号可用的阿里云百炼 API Key。`
        : "当前使用本地模型时可留空；切换到阿里云 CosyVoice 后必须填写公网音频 URL。";
      clonePublicAudioUrl.placeholder = isAliyun ? "阿里云 CosyVoice 复刻必须填写公网音频 URL" : "https://example.com/voice.wav";
    };

    const renderListTabs = () => {
      if (voiceTabVoices) voiceTabVoices.className = activeListTab === "voices" ? "btn btn-primary" : "btn btn-soft";
      if (voiceTabHistory) voiceTabHistory.className = activeListTab === "history" ? "btn btn-primary" : "btn btn-soft";
      if (batchToggleBtn) batchToggleBtn.textContent = listBatchMode ? "取消批量" : "批量管理";
      if (batchAllBtn) batchAllBtn.hidden = !listBatchMode;
      if (batchDeleteBtn) batchDeleteBtn.hidden = !listBatchMode;
    };
    const renderBatchToolbarState = (list = []) => {
      const total = Array.isArray(list) ? list.length : 0;
      const selectedCount = [...batchSelectedIds].filter(Boolean).length;
      if (batchAllBtn) batchAllBtn.textContent = total > 0 && selectedCount >= total ? "取消全选" : "全选";
      if (batchDeleteBtn) {
        batchDeleteBtn.disabled = selectedCount === 0;
        batchDeleteBtn.textContent = selectedCount > 0 ? `批量删除（${selectedCount}）` : "批量删除";
      }
    };
    const appendAudioHistoryItem = (item) => {
      const next = [item, ...readCurrentAudioHistory().filter((row) => String(row?.id || "").trim() !== String(item?.id || "").trim())];
      writeCurrentAudioHistory(next);
    };
    const getActiveVoice = () => {
      const activeId = String(getActiveVoiceId() || "").trim();
      if (!activeId) return null;
      return getCloneVoices().find((item) => String(item?.id || "").trim() === activeId) || null;
    };
    const syncSynthVoicePill = () => {
      const voice = getActiveVoice();
      if (!synthVoicePill) return;
      if (!voice) {
        synthVoicePill.textContent = "请先选择音色";
        return;
      }
      synthVoicePill.textContent = `当前音色：${String(voice?.name || voice?.id || "未命名音色").trim()}`;
    };
    const syncSynthModelWithActiveVoice = ({ preserveSelection = true } = {}) => {
      const voice = getActiveVoice();
      const catalog = buildCloneModelCatalog();
      if (!synthModelSelect) return;
      if (!catalog.length) {
        synthModelSelect.innerHTML = `<option value="">暂无可用模型</option>`;
        synthModelSelect.disabled = true;
        if (synthModelHint) synthModelHint.textContent = "当前没有可用 TTS 模型。";
        return;
      }
      const currentValue = String(synthModelSelect.value || "").trim();
      const options = catalog
        .map((item) => {
          const suffix = item.configured === false ? "｜待配置Key" : "";
          return `<option value="${escapeOptionHtml(item.id)}">${escapeOptionHtml(`${item.label}｜${item.sourceLabel}${suffix}`)}</option>`;
        })
        .join("");
      synthModelSelect.innerHTML = options;
      synthModelSelect.disabled = false;
      const preferredCloudId =
        voice && String(voice?.providerId || "").trim() === "aliyun-bailian" && String(voice?.targetModel || "").trim()
          ? `cloud:tts:aliyun-bailian:${String(voice.targetModel || "").trim()}`
          : "";
      const nextValue =
        (preserveSelection ? String(catalog.find((item) => item.id === currentValue)?.id || "") : "") ||
        String(catalog.find((item) => item.id === preferredCloudId)?.id || "") ||
        String(catalog[0]?.id || "");
      synthModelSelect.value = nextValue;
      const selected = catalog.find((item) => item.id === nextValue) || null;
      if (synthModelHint) {
        synthModelHint.textContent = voice && String(voice?.providerId || "").trim() === "aliyun-bailian"
          ? `当前云端音色绑定模型：${String(voice?.targetModel || "未知").trim()}，建议保持与所选 TTS 模型一致。`
          : `当前合成默认使用 ${String(selected?.label || "所选模型").trim()}。`;
      }
    };
    const renderVoiceList = () => {
      const voices = getCloneVoices();
      const historyList = readCurrentAudioHistory();
      const activeId = String(getActiveVoiceId() || "").trim();
      countEl.textContent = String(voices.length);
      activeCountEl.textContent = activeId ? "1" : "0";
      cloudCountEl.textContent = String(historyList.length);
      renderListTabs();
      if (activeListTab === "history") {
        listPill.textContent = historyList.length ? "按当前账号显示" : "暂无历史音频";
        renderBatchToolbarState(historyList);
        if (!historyList.length) {
          listEl.innerHTML = `<div class="empty">当前账号还没有历史合成音频。先去首页生成语音后，这里会自动同步可管理的历史音频。</div>`;
          return;
        }
        listEl.innerHTML = historyList
          .map((item) => {
            const id = String(item?.id || "").trim();
            const label = String(item?.voiceLabel || item?.voiceId || "未知音色").trim();
            const modelLabel = String(item?.modelLabel || item?.modelId || "未记录模型").trim();
            const emotion = String(item?.emotion || "").trim() || "自然";
            const language = String(item?.language || "").trim() || "默认";
            const checked = batchSelectedIds.has(id) ? "checked" : "";
            const isPreviewing = previewingItemKey === `history:${id}`;
            return `
              <div class="voice-item" data-kind="history" data-id="${escapeOptionHtml(id)}">
                <div class="voice-item-left">
                  ${listBatchMode ? `<label class="chk" style="margin-bottom:8px;"><input type="checkbox" data-act="toggle-batch" ${checked} /> 选中该历史音频</label>` : ""}
                  <div class="voice-item-title">${escapeOptionHtml(formatHistoryTime(item?.createdAt))}</div>
                  <div class="voice-item-sub mono">${escapeOptionHtml(`${label}｜${emotion}｜${language}｜${modelLabel}`)}</div>
                </div>
                <div class="voice-item-actions">
                  <button class="btn" data-act="preview">${isPreviewing ? "停止" : "试听"}</button>
                  <button class="btn" data-act="reveal">定位</button>
                  <button class="btn btn-danger" data-act="remove">删除</button>
                </div>
              </div>
            `;
          })
          .join("");
        return;
      }
      listPill.textContent = voices.length ? "已同步本地缓存" : "暂无音色";
      renderBatchToolbarState(voices);
      if (!voices.length) {
        listEl.innerHTML = `<div class="empty">当前还没有克隆音色，右侧填写信息后可直接开始复刻。</div>`;
        return;
      }
      listEl.innerHTML = voices
        .map((voice) => {
          const id = String(voice?.id || "").trim();
          const active = id && id === activeId;
          const sourceLabel = String(voice?.providerLabel || "").trim() || (String(voice?.source || "").trim() === "cloud" ? "云端克隆" : "本地克隆");
          const checked = batchSelectedIds.has(id) ? "checked" : "";
          const isPreviewing = previewingItemKey === `voice:${id}`;
          return `
            <div class="voice-item" data-kind="voice" data-id="${escapeOptionHtml(id)}">
              <div class="voice-item-left">
                ${listBatchMode ? `<label class="chk" style="margin-bottom:8px;"><input type="checkbox" data-act="toggle-batch" ${checked} /> 选中该音色</label>` : ""}
                <div class="voice-item-title">${escapeOptionHtml(voice?.name || "未命名音色")}${active ? ` <span class="pill">当前使用</span>` : ""}</div>
                <div class="voice-item-sub mono">${escapeOptionHtml(sourceLabel)}｜${escapeOptionHtml(id)}</div>
              </div>
              <div class="voice-item-actions">
                <button class="btn" data-act="preview">${isPreviewing ? "停止" : "试听"}</button>
                <button class="btn btn-primary" data-act="use">使用</button>
                <button class="btn btn-danger" data-act="remove">删除</button>
              </div>
            </div>
          `;
        })
        .join("");
    };

    const resetForm = () => {
      recordedBlob = null;
      pickedPromptFilePath = "";
      recordChunks = [];
      pendingCloneVoice = null;
      currentCloneTaskId = "";
      cloneName.value = "";
      cloneRefText.value = "";
      clonePublicAudioUrl.value = "";
      cloneAudioStatus.textContent = "未录制";
      cloneAudioStatus.title = "";
      cloneCreate.disabled = false;
      cloneCreate.textContent = "开始复刻";
      cloneCancelGen.disabled = true;
      cloneSave.disabled = true;
      setCloneUploadStatus("未上传", "");
      clearCloneLog();
      renderCloneModelSelect();
    };

    const refreshMicDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const mics = devices.filter((d) => d.kind === "audioinput");
        cloneMic.innerHTML = mics.map((d, idx) => `<option value="${escapeOptionHtml(d.deviceId)}">${escapeOptionHtml(d.label || `麦克风 ${idx + 1}`)}</option>`).join("");
        if (!mics.length) cloneMic.innerHTML = `<option value="" selected>未检测到麦克风</option>`;
      } catch {
        cloneMic.innerHTML = `<option value="" selected>无法获取麦克风列表</option>`;
      }
    };

    const uploadCloneReferenceAudio = async () => {
      const auth = readAuth();
      if (!auth?.userId || !auth?.account) {
        topToast("请先登录后再上传参考音频。", { type: "warn" });
        return "";
      }
      let filePath = String(pickedPromptFilePath || "").trim();
      let source = filePath ? "file" : recordedBlob ? "mic" : "";
      let mimeType = "";
      let fileName = "";
      let audioBytes = null;
      if (!filePath && !recordedBlob) {
        const res = await window.api?.openFile?.();
        if (!res || res.canceled) return "";
        filePath = String(res.filePaths?.[0] || "").trim();
        if (!filePath) return "";
        pickedPromptFilePath = filePath;
        cloneAudioStatus.textContent = "已选择文件";
        cloneAudioStatus.title = filePath;
        source = "file";
      }
      if (recordedBlob) {
        const ab = await recordedBlob.arrayBuffer();
        audioBytes = Array.from(new Uint8Array(ab));
        mimeType = String(recordedBlob.type || "audio/webm").trim();
        fileName = `voice-clone-reference-${Date.now()}`;
      }
      if (filePath) fileName = filePath.split(/[\\/]/).pop() || "";
      const domainRes = await window.api?.domain?.read?.();
      const baseDomain = String(domainRes?.domain || "").trim().replace(/\/+$/, "");
      const url = buildCloudMethodUrl(`${baseDomain}/qd-yinpinshangchuan`, "uploadReferenceAudio");
      if (!url) {
        topToast("未配置音频上传云对象URL。", { type: "warn" });
        return "";
      }
      setCloneUploadStatus("上传中...", "");
      cloneUploadCloudAudio.disabled = true;
      try {
        const res = await window.api?.cloudStorage?.uploadReferenceAudio?.({
          url,
          token: "",
          body: {
            account: String(auth.account || "").trim(),
            userId: String(auth.userId || "").trim(),
            identity: String(auth.identity || "").trim(),
            source,
            filePath,
            fileName,
            mimeType,
            audioBytes
          }
        });
        if (!res?.ok || !res?.url) {
          setCloneUploadStatus("上传失败", String(res?.errMsg || res?.message || ""));
          topToast(String(res?.errMsg || res?.message || "音频上传失败"), { type: "error" });
          return "";
        }
        clonePublicAudioUrl.value = String(res.url || "").trim();
        setCloneUploadStatus("已上传", String(res.url || ""));
        renderCloneModelSelect();
        topToast("参考音频已上传，公网 URL 已自动填写。", { type: "success" });
        return String(res.url || "").trim();
      } finally {
        cloneUploadCloudAudio.disabled = false;
      }
    };

    const startClone = async () => {
      const name = String(cloneName.value || "").trim();
      const refText = String(cloneRefText.value || "").trim();
      const publicAudioUrl = String(clonePublicAudioUrl.value || "").trim();
      const selectedModel = await ensureCloneSelection();
      if (!selectedModel) return;
      if (!name) {
        topToast("请输入音色名称。", { type: "warn" });
        cloneName.focus();
        return;
      }
      if (!refText) {
        topToast("请输入参考文字。", { type: "warn" });
        cloneRefText.focus();
        return;
      }
      if (isAliyunCosyVoiceSelection(selectedModel)) {
        if (!publicAudioUrl) {
          topToast("当前阿里云 CosyVoice 复刻必须填写公网音频 URL。", { type: "warn" });
          clonePublicAudioUrl.focus();
          return;
        }
      } else if (!recordedBlob && !pickedPromptFilePath) {
        topToast("请先录制或选择参考音频。", { type: "warn" });
        return;
      }
      pendingCloneVoice = null;
      cloneSave.disabled = true;
      cloneCreate.disabled = true;
      cloneCreate.textContent = "生成中...";
      cloneCancelGen.disabled = false;
      clearCloneLog();
      currentCloneTaskId = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
      pushCloneLog("info", `任务已创建：${currentCloneTaskId}`);
      pushCloneLog("info", `当前克隆模型：${String(selectedModel?.modelChoice?.label || selectedModel?.label || "").trim() || "未知模型"}`);
      try {
        let res = null;
        if (pickedPromptFilePath) {
          res = await window.api?.voice?.cloneCreateFromFile?.({
            name,
            refText,
            filePath: pickedPromptFilePath,
            taskId: currentCloneTaskId,
            publicAudioUrl,
            modelChoice: selectedModel.modelChoice
          });
        } else if (recordedBlob) {
          const ab = await recordedBlob.arrayBuffer();
          res = await window.api?.voice?.cloneCreateFromMic?.({
            name,
            refText,
            audioBytes: new Uint8Array(ab),
            mimeType: recordedBlob.type || "audio/webm",
            taskId: currentCloneTaskId,
            publicAudioUrl,
            modelChoice: selectedModel.modelChoice
          });
        } else if (publicAudioUrl) {
          res = await window.api?.voice?.cloneCreateFromFile?.({
            name,
            refText,
            filePath: "",
            taskId: currentCloneTaskId,
            publicAudioUrl,
            modelChoice: selectedModel.modelChoice
          });
        }
        if (!res?.ok || !res?.voice) {
          pushCloneLog("warn", String(res?.message || "复刻失败"));
          topToast("复刻失败，请查看生成日志。", { type: "error" });
          return;
        }
        pendingCloneVoice = res.voice;
        cloneAudioStatus.textContent = "已生成预览";
        cloneAudioStatus.title = String(res.voice.previewWavPath || "");
        cloneSave.disabled = false;
        topToast("复刻完成，请点击保存音色。", { type: "success" });
      } catch (e) {
        pushCloneLog("error", String(e?.message || e));
        topToast("复刻失败，请查看生成日志。", { type: "error" });
      } finally {
        cloneCreate.disabled = false;
        cloneCreate.textContent = "开始复刻";
        cloneCancelGen.disabled = true;
      }
    };

    const saveCloneVoice = async () => {
      if (!pendingCloneVoice?.id) return;
      const voiceId = String(pendingCloneVoice.id || "").trim();
      await upsertCloneVoiceToStorage(pendingCloneVoice);
      setActiveVoiceId(voiceId);
      activeListTab = "voices";
      renderVoiceList();
      topToast("已保存并设为当前音色。", { type: "success" });
      syncSynthVoicePill();
      syncSynthModelWithActiveVoice();
    };
    const startSynthesis = async () => {
      const voice = getActiveVoice();
      if (!voice) {
        topToast("请先在左侧克隆音色列表中选择一个正在使用的音色。", { type: "warn" });
        return;
      }
      const text = String(synthText?.value || "").trim();
      if (!text) {
        topToast("请输入需要合成的文本内容。", { type: "warn" });
        synthText?.focus();
        return;
      }
      const catalog = buildCloneModelCatalog();
      const selected = catalog.find((item) => item.id === String(synthModelSelect?.value || "").trim()) || catalog[0] || null;
      if (!selected) {
        topToast("当前没有可用的 TTS 模型。", { type: "warn" });
        return;
      }
      let resolved = selected;
      if (selected.source === "cloud") {
        const apiKey = await resolveCloudApiKeyByProvider("aliyun-bailian");
        if (!apiKey) {
          topToast("当前云端模型未匹配可用的阿里云百炼 API Key。", { type: "warn" });
          return;
        }
        resolved = {
          ...selected,
          modelChoice: {
            ...(selected.modelChoice || {}),
            apiKey
          }
        };
      }
      const speed = Number(synthSpeed?.value || 1.0) || 1.0;
      const emotion = String(synthEmotion?.value || "").trim() || "自然";
      const language = String(synthLanguage?.value || "").trim() || "中文（普通话）";
      currentSynthTaskId = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
      clearSynthLog();
      pushSynthLog("info", `任务已创建：${currentSynthTaskId}`);
      pushSynthLog("info", `当前音色：${String(voice?.name || voice?.id || "未命名音色").trim()}`);
      pushSynthLog("info", `当前 TTS 模型：${String(resolved?.modelChoice?.label || resolved?.label || "未知模型").trim()}`);
      synthCreate.disabled = true;
      synthCreate.textContent = "合成中...";
      synthCancel.disabled = false;
      try {
        const res = await window.api?.voice?.generateSpeech?.({
          taskId: currentSynthTaskId,
          voiceId: String(voice?.id || "").trim(),
          text,
          speed,
          emotion,
          language,
          modelChoice: resolved.modelChoice
        });
        if (!res?.ok || !res?.audioPath) {
          pushSynthLog("warn", String(res?.message || "语音合成失败"));
          topToast("语音合成失败，请查看运行日志。", { type: "error" });
          return;
        }
        appendAudioHistoryItem({
          id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
          createdAt: Date.now(),
          audioPath: String(res.audioPath || ""),
          ownerAccount: String(readAuth()?.account || "").trim(),
          ownerUserId: String(readAuth()?.userId || "").trim(),
          voiceId: String(voice?.id || "").trim(),
          voiceLabel: String(voice?.name || voice?.id || "未命名音色").trim(),
          requestId: String(res.requestId || "").trim(),
          usage: res.usage || {},
          speed,
          emotion,
          language,
          modelId: String(resolved?.modelChoice?.modelId || "").trim(),
          modelLabel: String(resolved?.label || resolved?.modelChoice?.label || "").trim()
        });
        activeListTab = "history";
        renderVoiceList();
        pushSynthLog("info", "语音合成完成，已写入历史音频。");
        topToast("语音合成完成，已记录到历史音频。", { type: "success" });
      } catch (e) {
        pushSynthLog("error", String(e?.message || e));
        topToast("语音合成失败，请查看运行日志。", { type: "error" });
      } finally {
        currentSynthTaskId = "";
        synthCreate.disabled = false;
        synthCreate.textContent = "开始合成";
        synthCancel.disabled = true;
      }
    };

    root.querySelector("#voiceclone-go-home").addEventListener("click", () => {
      window.location.hash = "#/home";
    });
    root.querySelector("#voiceclone-refresh").addEventListener("click", async () => {
      const res = await window.api?.models?.scanProjectBundles?.();
      homeMediaBundleCatalog = Array.isArray(res?.bundles) ? res.bundles : [];
      renderCloneModelSelect();
      renderVoiceList();
      topToast("声音克隆工作台已刷新。", { type: "success" });
    });
    voiceTabVoices?.addEventListener("click", () => {
      activeListTab = "voices";
      batchSelectedIds = new Set();
      renderVoiceList();
    });
    voiceTabHistory?.addEventListener("click", () => {
      activeListTab = "history";
      batchSelectedIds = new Set();
      renderVoiceList();
    });
    batchToggleBtn?.addEventListener("click", () => {
      listBatchMode = !listBatchMode;
      batchSelectedIds = new Set();
      renderVoiceList();
    });
    batchAllBtn?.addEventListener("click", () => {
      const source = activeListTab === "history" ? readCurrentAudioHistory() : getCloneVoices();
      const visibleIds = source.map((item) => String(item?.id || "").trim()).filter(Boolean);
      const allSelected = visibleIds.length > 0 && visibleIds.every((id) => batchSelectedIds.has(id));
      batchSelectedIds = allSelected ? new Set() : new Set(visibleIds);
      renderVoiceList();
    });
    batchDeleteBtn?.addEventListener("click", async () => {
      const ids = [...batchSelectedIds].filter(Boolean);
      if (!ids.length) return;
      if (activeListTab === "history") {
        const next = readCurrentAudioHistory().filter((item) => !batchSelectedIds.has(String(item?.id || "").trim()));
        writeCurrentAudioHistory(next);
        batchSelectedIds = new Set();
        renderVoiceList();
        topToast(`已删除 ${ids.length} 条历史音频记录。`, { type: "success" });
        return;
      }
      const next = getCloneVoices().filter((item) => !batchSelectedIds.has(String(item?.id || "").trim()));
      const activeId = String(getActiveVoiceId() || "").trim();
      if (activeId && batchSelectedIds.has(activeId)) setActiveVoiceId("");
      await saveCloneVoicesToJsonAndLocal(next);
      batchSelectedIds = new Set();
      renderVoiceList();
      syncSynthVoicePill();
      syncSynthModelWithActiveVoice();
      topToast(`已删除 ${ids.length} 个克隆音色。`, { type: "success" });
    });

    listEl.addEventListener("click", async (e) => {
      const item = e.target.closest(".voice-item");
      if (!item) return;
      const id = String(item.getAttribute("data-id") || "").trim();
      const kind = String(item.getAttribute("data-kind") || "voice").trim();
      const act = String(e.target.closest("[data-act]")?.getAttribute("data-act") || "").trim();
      if (act === "toggle-batch") {
        if (batchSelectedIds.has(id)) batchSelectedIds.delete(id);
        else batchSelectedIds.add(id);
        renderVoiceList();
        return;
      }
      if (!id || !act) return;
      if (kind === "history") {
        const record = readCurrentAudioHistory().find((row) => String(row?.id || "").trim() === id) || null;
        if (!record) return;
        if (act === "preview") {
          const itemKey = `history:${id}`;
          if (previewingItemKey === itemKey) {
            stopPreviewAudio();
            return;
          }
          stopPreviewAudio();
          const url = toFileUrl(record?.audioPath || "");
          if (!url) return topToast("当前历史音频无法试听。", { type: "warn" });
          const audio = new Audio(url);
          attachPreviewAudio(audio, itemKey);
          audio.play().catch(() => {
            stopPreviewAudio();
            topToast("无法试听当前历史音频。", { type: "warn" });
          });
          return;
        }
        if (act === "reveal") {
          window.api?.shell?.reveal?.({ path: String(record?.audioPath || "").trim() });
          return;
        }
        if (act === "remove") {
          const next = readCurrentAudioHistory().filter((row) => String(row?.id || "").trim() !== id);
          writeCurrentAudioHistory(next);
          renderVoiceList();
          topToast("已删除该历史音频记录。", { type: "success" });
        }
        return;
      }
      const voice = getCloneVoices().find((row) => String(row?.id || "").trim() === id) || null;
      if (!voice) return;
      if (act === "preview") {
        const itemKey = `voice:${id}`;
        if (previewingItemKey === itemKey) {
          stopPreviewAudio();
          return;
        }
        stopPreviewAudio();
        const resolved = await window.api?.voice?.resolvePreviewPath?.({ voiceId: id }).catch(() => null);
        const url = toFileUrl(String(voice?.previewWavPath || resolved?.path || "").trim());
        if (!url) return topToast("当前音色暂无可试听预览。", { type: "warn" });
        const audio = new Audio(url);
        attachPreviewAudio(audio, itemKey);
        audio.play().catch(() => {
          stopPreviewAudio();
          topToast("无法试听当前音色。", { type: "warn" });
        });
        return;
      }
      if (act === "use") {
        setActiveVoiceId(id);
        renderVoiceList();
        syncSynthVoicePill();
        syncSynthModelWithActiveVoice();
        topToast("已切换为当前音色。", { type: "success" });
        return;
      }
      if (act === "remove") {
        const next = getCloneVoices().filter((row) => String(row?.id || "").trim() !== id);
        await saveCloneVoicesToJsonAndLocal(next);
        if (String(getActiveVoiceId() || "").trim() === id) setActiveVoiceId("");
        renderVoiceList();
        syncSynthVoicePill();
        syncSynthModelWithActiveVoice();
        topToast("已删除该克隆音色。", { type: "success" });
      }
    });

    cloneModelSelect.addEventListener("change", () => {
      cloneModelSelectionId = String(cloneModelSelect.value || "").trim();
      renderCloneModelSelect();
    });
    clonePickFile.addEventListener("click", async () => {
      const res = await window.api?.openFile?.();
      if (!res || res.canceled) return;
      const fp = String(res.filePaths?.[0] || "").trim();
      if (!fp) return;
      pickedPromptFilePath = fp;
      recordedBlob = null;
      cloneAudioStatus.textContent = "已选择文件";
      cloneAudioStatus.title = fp;
      setCloneUploadStatus("未上传", "");
    });
    cloneRecord.addEventListener("click", async () => {
      if (mediaRecorder) return;
      recordedBlob = null;
      pickedPromptFilePath = "";
      recordChunks = [];
      setCloneUploadStatus("未上传", "");
      try {
        const deviceId = cloneMic.value || undefined;
        micStream = await navigator.mediaDevices.getUserMedia({
          audio: deviceId ? { deviceId: { exact: deviceId } } : true
        });
        mediaRecorder = new MediaRecorder(micStream);
        mediaRecorder.ondataavailable = (ev) => {
          if (ev.data && ev.data.size > 0) recordChunks.push(ev.data);
        };
        mediaRecorder.onstop = () => {
          recordedBlob = new Blob(recordChunks, { type: mediaRecorder?.mimeType || "audio/webm" });
          recordChunks = [];
          cloneAudioStatus.textContent = recordedBlob ? "已录制" : "未录制";
          cloneAudioStatus.title = "";
          cloneRecord.disabled = false;
          cloneStop.disabled = true;
          try {
            micStream?.getTracks?.().forEach((track) => track.stop());
          } catch {}
          micStream = null;
          mediaRecorder = null;
        };
        mediaRecorder.start();
        cloneAudioStatus.textContent = "录制中...";
        cloneRecord.disabled = true;
        cloneStop.disabled = false;
      } catch {
        cloneAudioStatus.textContent = "录制失败";
        cloneRecord.disabled = false;
        cloneStop.disabled = true;
      }
    });
    cloneStop.addEventListener("click", () => {
      try {
        mediaRecorder?.stop?.();
      } catch {}
    });
    cloneUploadCloudAudio.addEventListener("click", async () => {
      await uploadCloneReferenceAudio();
    });
    cloneCreate.addEventListener("click", startClone);
    cloneSave.addEventListener("click", saveCloneVoice);
    synthCreate?.addEventListener("click", startSynthesis);
    synthCancel?.addEventListener("click", async () => {
      if (!currentSynthTaskId) return;
      synthCancel.disabled = true;
      pushSynthLog("warn", "正在请求停止生成...");
      try {
        const res = await window.api?.voice?.cancel?.(currentSynthTaskId);
        if (!res?.ok) pushSynthLog("warn", String(res?.message || "停止失败"));
      } catch (e) {
        pushSynthLog("error", String(e?.message || e));
      } finally {
        currentSynthTaskId = "";
        synthCreate.disabled = false;
        synthCreate.textContent = "开始合成";
      }
    });
    synthToHistory?.addEventListener("click", () => {
      activeListTab = "history";
      renderVoiceList();
    });
    synthModelSelect?.addEventListener("change", () => syncSynthModelWithActiveVoice({ preserveSelection: true }));
    cloneReset.addEventListener("click", resetForm);
    cloneCancelGen.addEventListener("click", async () => {
      if (!currentCloneTaskId) return;
      cloneCancelGen.disabled = true;
      pushCloneLog("warn", "正在请求停止生成...");
      try {
        const res = await window.api?.voice?.cancel?.(currentCloneTaskId);
        if (!res?.ok) pushCloneLog("warn", String(res?.message || "停止失败"));
      } catch (e) {
        pushCloneLog("error", String(e?.message || e));
      } finally {
        cloneCreate.disabled = false;
        cloneCreate.textContent = "开始复刻";
      }
    });

    if (window.__ipfactoryVoiceCloneLogUnsub) {
      try {
        window.__ipfactoryVoiceCloneLogUnsub();
      } catch {}
      window.__ipfactoryVoiceCloneLogUnsub = null;
    }
    window.__ipfactoryVoiceCloneLogUnsub = window.api?.voice?.onLog?.((data) => {
      const taskId = String(data?.taskId || "").trim();
      if (!taskId) return;
      if (taskId === currentCloneTaskId) {
        pushCloneLog(data?.level || "info", data?.message || "");
        return;
      }
      if (taskId === currentSynthTaskId) {
        pushSynthLog(data?.level || "info", data?.message || "");
      }
    });

    if (window.__ipfactoryVoiceCloneModelsChanged) {
      try {
        window.removeEventListener("ipfactory:modelsChanged", window.__ipfactoryVoiceCloneModelsChanged);
      } catch {}
    }
    window.__ipfactoryVoiceCloneModelsChanged = async () => {
      const res = await window.api?.models?.scanProjectBundles?.();
      homeMediaBundleCatalog = Array.isArray(res?.bundles) ? res.bundles : [];
      renderCloneModelSelect();
    };
    window.addEventListener("ipfactory:modelsChanged", window.__ipfactoryVoiceCloneModelsChanged);

    if (window.__ipfactoryVoiceCloneAuthChanged) {
      try {
        window.removeEventListener("ipfactory:authChanged", window.__ipfactoryVoiceCloneAuthChanged);
      } catch {}
    }
    window.__ipfactoryVoiceCloneAuthChanged = async () => {
      const res = await window.api?.models?.scanProjectBundles?.();
      homeMediaBundleCatalog = Array.isArray(res?.bundles) ? res.bundles : [];
      renderCloneModelSelect();
      renderVoiceList();
    };
    window.addEventListener("ipfactory:authChanged", window.__ipfactoryVoiceCloneAuthChanged);

    await refreshMicDevices();
    await syncCloneVoicesFromJsonToLocal();
    const bundleRes = await window.api?.models?.scanProjectBundles?.();
    homeMediaBundleCatalog = Array.isArray(bundleRes?.bundles) ? bundleRes.bundles : [];
    renderCloneModelSelect();
    renderVoiceList();
    syncSynthVoicePill();
    syncSynthModelWithActiveVoice();
    resetForm();
    return root;
  }
};
