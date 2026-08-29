import { elFromHTML, confirmDialog } from "../ui.js";
import { syncPageModuleVisibility, startPageModuleVisibilityLiveSync } from "../gongneng/yemianmokuaiyunkong.js";
import {
  getCloudLlms,
  getActiveCloudLlmId,
  getHomeLlmSelections,
  setHomeLlmSelections,
  getHomeRunMode,
  setHomeRunMode,
  getCloneVoices,
  setCloneVoices,
  getActiveVoiceId,
  setActiveVoiceId,
  getAudioHistory,
  setAudioHistory,
  getModels,
  getHomeMediaSelections,
  setHomeMediaSelections
} from "../store.js";
import { mountShouyeYijianDaochu } from "../gongneng/shouyeyijiandaochu.js";
import { openShouyeHuazhonghuaFenjingModal } from "../gongneng/shouyehuazhonghuafenjing.js";
import { createSubtitleTemplatePreviewDataUrl, createCoverTemplatePreviewDataUrl } from "../gongneng/mobanyulan.js";
import { fetchCloudTemplates, getTemplateCloudCache, mergeTemplateCollections, splitTemplatesBySource } from "../gongneng/mubanyuntongbu.js";
import {
  buildCloneModelCatalog,
  getRecommendedCloneMinSeconds,
  isAliyunCosyVoiceSelection,
  resolveCloudApiKeyByProvider,
  resolveSelectedCloneModel,
  saveCloneVoicesToJsonAndLocal,
  syncCloneVoicesFromJsonToLocal,
  upsertCloneVoiceToStorage,
  uploadCloneReferenceAudio,
  validateCloneReferenceDuration
} from "../gongneng/shouyekelongyinpin.js";

export const route = {
  path: "/home",
  title: "首页",
  async render() {
    const HOME_MODULE_VISIBILITY_DEFAULTS = {
      "ip-study": true,
      "copy-edit": true,
      "runtime-log": true,
      "audio-gen": true,
      "video-edit": true,
      "meta-gen": true,
      "subtitle-bgm": true,
      "auto-mode": true,
      cover: true,
      publish: true
    };
    const root = elFromHTML(`
      <div class="dashboard">
        <div class="dash-grid">
          <div class="dash-col">
            <section class="module-card" data-module="ip-study">
              <header class="module-head">
                <div class="module-left">
                  <span class="module-index">01</span>
                  <div class="module-meta">
                    <div class="module-title">IP深度学习</div>
                  </div>
                </div>
                <div class="module-right">
                  <button class="module-link" data-action="maximize">放大</button>
                  <button class="module-link module-collapse" data-action="collapse" title="收起/展开">▾</button>
                  <button class="module-link" data-action="menu">⋯</button>
                </div>
              </header>

              <div class="seg-tabs" data-tabs="ip-study-tabs">
                <button class="seg-tab is-active" data-tab="video">视频学习</button>
                <button class="seg-tab" data-tab="ip">IP学习</button>
                <button class="seg-tab" data-tab="hotcopy">爆款文案</button>
              </div>

              <div class="module-body">
                <div class="tab-panel is-active" data-tab-panel="video">
                  <div class="card-actions" style="justify-content: space-between">
                    <button class="btn btn-primary" id="btn-quick-parse">提取文案</button>
                    <span class="pill">可选：从同行监控导入</span>
                  </div>
                  <div class="field home-module-model-field" style="margin-top: 10px">
                    <div class="home-model-field-head">
                      <div class="label">ASR 模型</div>
                      <span class="pill">本地/云端可扩展</span>
                    </div>
                    <select id="home-asr-model">
                      <option value="local:auto:ASR" selected>系统默认 ASR</option>
                    </select>
                  </div>
                  <div class="field recognize-zone" style="margin-top: 10px">
                    <div class="label">识别的对标视频内容</div>
                    <textarea id="ip-study-result" readonly placeholder="使用“提取文案”功能后，识别的对标内容将展示在这里（占位）..."></textarea>
                    <div class="recognize-overlay" id="recognize-overlay" hidden>
                      <div class="recognize-card">
                        <div class="spinner"></div>
                        <div class="recognize-title">识别文案中</div>
                        <div class="recognize-sub" id="recognize-sub">正在解析输入内容...</div>
                        <button class="btn" id="recognize-cancel">取消</button>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="tab-panel" data-tab-panel="ip">
                  <div class="ipbrain-panel">
                    <div class="card-actions ipbrain-actions">
                      <button class="btn btn-primary" id="btn-ipbrain-add" type="button">添加IP大脑</button>
                      <span class="pill" id="ipbrain-count">已学习 0/5</span>
                    </div>

                    <div class="ipbrain-sec">
                      <div class="ipbrain-sec-head">
                        <div class="ipbrain-sec-title">已学习的对标</div>
                        <div class="ipbrain-sec-sub">点击账号名称切换选题库</div>
                      </div>
                      <div class="ipbrain-accounts" id="ipbrain-accounts"></div>
                      <div class="empty ipbrain-empty" id="ipbrain-empty">暂无已学习对标，点击“添加IP大脑”开始采集。</div>
                    </div>

                    <div class="ipbrain-sec">
                      <div class="ipbrain-sec-head">
                        <div class="ipbrain-sec-title" id="ipbrain-topic-title">选题库</div>
                        <div class="ipbrain-sec-sub" id="ipbrain-topic-sub">展示所选账号最新 5 条标题（AI改写优先）</div>
                      </div>
                      <div class="ipbrain-topics" id="ipbrain-topics"></div>
                      <div class="empty ipbrain-topic-empty" id="ipbrain-topic-empty">请选择一个对标账号查看选题库。</div>
                    </div>
                  </div>
                </div>

                <div class="tab-panel" data-tab-panel="hotcopy">
                  <div class="hotcopy-form">
                    <div class="grid cols-2" style="gap: 10px">
                      <div class="field">
                        <div class="label">视频类型 *</div>
                        <select id="hotcopy-video-type">
                          <option value="口播文案" selected>口播文案</option>
                          <option value="广告投放文案">广告投放文案</option>
                        </select>
                      </div>
                      <div class="field">
                        <div class="label">文案类型 *</div>
                        <select id="hotcopy-copy-type">
                          <option value="人设型" selected>人设型</option>
                          <option value="流量型">流量型</option>
                          <option value="变现型">变现型</option>
                          <option value="获客型">获客型</option>
                          <option value="案例型">案例型</option>
                        </select>
                      </div>
                    </div>

                    <div class="field">
                      <div class="label">行业+人设（可选）</div>
                      <input
                        id="hotcopy-persona"
                        type="text"
                        placeholder="例如:餐饮店，我叫斌哥，在上海，有10年餐饮经验"
                      />
                    </div>
                    <div class="field">
                      <div class="label">产品/业务（可选）</div>
                      <input id="hotcopy-product" type="text" placeholder="例如:纸巾，麻辣烫，房产，教培，财务..." />
                    </div>
                    <div class="field">
                      <div class="label">卖点+价格（可选）</div>
                      <input id="hotcopy-sell" type="text" placeholder="例如:纸张柔软亲肤，正常价99，今天只要59元" />
                    </div>
                    <div class="field">
                      <div class="label">其他要求（可选）</div>
                      <input id="hotcopy-other" type="text" placeholder="例如:风格幽默，突出性价比，适合30-50岁人群..." />
                    </div>

                    <div class="field">
                      <div class="label">目标字数</div>
                      <div class="hotcopy-count">
                        <input id="hotcopy-count-range" type="range" min="100" max="800" step="10" value="300" />
                        <input id="hotcopy-count" type="text" value="300" />
                      </div>
                    </div>

                    <div class="card-actions" style="justify-content: space-between">
                      <span class="pill">AI 将生成 3 个不同方向方案</span>
                      <button class="btn btn-primary" id="btn-gen-hotcopy" type="button">生成爆款文案</button>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section class="module-card" data-module="copy-edit">
              <header class="module-head">
                <div class="module-left">
                  <div class="module-meta">
                    <div class="module-title">视频文案编辑</div>
                  </div>
                </div>
                <div class="module-right">
                  <button class="module-link" data-action="maximize">放大</button>
                  <button class="module-link module-collapse" data-action="collapse" title="收起/展开">▾</button>
                </div>
              </header>
              <div class="module-body">
                <div class="field">
                  <div class="label">文案内容</div>
                  <textarea id="copy-edit-content" placeholder="文案内容将显示在这里（占位）..."></textarea>
                </div>
                <div class="card-actions" style="justify-content: space-between; margin-top: 10px">
                  <div class="copy-count">
                    <span class="pill">字数</span>
                    <input id="copy-word-count" type="text" value="300" />
                  </div>
                  <div class="card-actions">
                    <label class="chk" title="开启后，每次提取文案成功都会自动调用智能改写；默认关闭，避免浪费 token。">
                      <input type="checkbox" id="copy-auto-rewrite-toggle" />
                      提取后自动智能改写
                    </label>
                    <button class="btn" id="btn-rewrite-copy">智能改写</button>
                    <button class="btn btn-primary" id="btn-legal-review">AI法务</button>
                  </div>
                </div>
                <div class="field home-module-model-field" style="margin-top: 10px">
                  <div class="home-model-field-head">
                    <div class="label">文案处理模型</div>
                    <span class="pill">默认公用云端大模型</span>
                  </div>
                  <select id="home-copy-llm"></select>
                </div>
              </div>
            </section>

            <section class="module-card" data-module="runtime-log">
              <header class="module-head">
                <div class="module-left">
                  <span class="module-index">🧾</span>
                  <div class="module-meta">
                    <div class="module-title">运行日志</div>
                  </div>
                </div>
                <div class="module-right">
                  <button class="module-link" id="log-clear">清空</button>
                  <button class="module-link" id="log-copy">复制</button>
                  <button class="module-link module-collapse" data-action="collapse" title="收起/展开">▾</button>
                </div>
              </header>
              <div class="module-body">
                <div class="log-box mono" id="runtime-log-box"></div>
                <div class="card-actions" style="justify-content: space-between; margin-top: 10px">
                  <label class="chk"><input type="checkbox" id="log-autoscroll" checked /> 自动滚动</label>
                  <span class="pill">仅显示本页工作流日志</span>
                </div>
              </div>
            </section>
          </div>

          <div class="dash-col">
            <section class="module-card" data-module="audio-gen">
              <header class="module-head">
                <div class="module-left">
                  <span class="module-index">02</span>
                  <div class="module-meta">
                    <div class="module-title">音频视频生成</div>
                  </div>
                </div>
                <div class="module-right">
                  <button class="module-link" data-action="maximize">放大</button>
                  <button class="module-link module-collapse" data-action="collapse" title="收起/展开">▾</button>
                </div>
              </header>
              <div class="module-body">
                <div class="grid cols-2" style="gap: 10px">
                  <div class="field">
                    <div class="label">音色</div>
                    <button class="select-like" id="btn-voice-picker" type="button">
                      <span id="voice-picked-label">选择音色</span>
                      <span class="caret">▾</span>
                    </button>
                  </div>
                  <div class="field">
                    <div class="label">情绪</div>
                    <select id="audio-emotion">
                      <option selected>自然</option>
                      <option>兴奋</option>
                      <option>严肃</option>
                      <option>温柔</option>
                    </select>
                  </div>
                </div>

                <div class="grid cols-2" style="gap: 10px; margin-top: 10px">
                  <div class="field">
                    <div class="label">语言</div>
                    <select id="audio-language">
                      <option selected>中文（普通话）</option>
                      <option>中文（粤语）</option>
                      <option>英语</option>
                    </select>
                  </div>
                  <div class="field">
                    <div class="label">语速</div>
                    <select id="audio-speed">
                      <option>0.9</option>
                      <option selected>1.0</option>
                      <option>1.1</option>
                    </select>
                  </div>
                </div>

                <div class="field home-module-model-field" style="margin-top: 10px">
                  <div class="home-model-field-head">
                    <div class="label">TTS 模型</div>
                    <span class="pill">本地/云端可扩展</span>
                  </div>
                  <select id="home-tts-model">
                    <option value="local:auto:TTS" selected>系统默认 TTS</option>
                  </select>
                </div>
                <div class="hint" style="margin-top: 8px">首页会优先展示“模型”页已导入的本地模型包，同时保留云端 TTS 入口位。</div>

                <div class="field" style="margin-top: 10px">
                  <div class="label">音频预览</div>
                  <div class="audio-preview">
                    <div class="audio-preview-top">
                      <select id="audio-history">
                        <option value="" selected>选择历史音频</option>
                      </select>
                      <button class="module-link" id="audio-refresh" title="刷新">↻</button>
                    </div>
                    <div class="audio-player" id="audio-player">
                      <button class="audio-btn" id="audio-play" title="播放/暂停">▶</button>
                      <div class="audio-time mono" id="audio-time">00:00/00:00</div>
                      <input class="audio-seek" id="audio-seek" type="range" min="0" max="1000" value="0" />
                    </div>
                    <audio id="audio-el" preload="metadata" hidden></audio>
                    <pre class="clone-log" id="audio-log-box"></pre>
                  </div>
                </div>

                <div class="card-actions" style="margin-top: 10px">
                  <button class="btn btn-primary" id="btn-gen-audio">克隆声音</button>
                </div>

                <div class="divider" style="margin-top: 12px"></div>

                <div class="field" style="margin-top: 12px">
                  <div class="label">数字人形象</div>
                  <select id="home-avatar-select">
                    <option value="" selected>选择数字人形象</option>
                  </select>
                </div>
                <div class="field home-module-model-field" style="margin-top: 10px">
                  <div class="home-model-field-head">
                    <div class="label">数字人模型</div>
                    <span class="pill">本地/云端可扩展</span>
                  </div>
                  <select id="home-videosync-model">
                    <option value="local:auto:VideoSync" selected>系统默认数字人模型</option>
                  </select>
                </div>

                <div class="field" style="margin-top: 10px">
                  <div class="label">视频预览</div>
                  <div class="home-video-preview">
                    <div class="home-video-empty" id="home-video-empty">暂无视频预览</div>
                    <video id="home-video-el" controls muted playsinline hidden></video>
                    <div class="home-video-gen-overlay" id="home-video-gen" hidden>
                      <div class="home-video-gen-card">
                        <div class="spinner"></div>
                        <div class="home-video-gen-title">正在生成</div>
                        <div class="home-video-gen-sub" id="home-video-gen-sub">准备启动数字人模型...</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="card-actions" style="margin-top: 10px; justify-content: flex-start">
                  <button class="btn btn-primary" id="btn-gen-talking" disabled>生成口播视频</button>
                </div>
              </div>
            </section>

            <section class="module-card" data-module="video-edit">
              <header class="module-head">
                <div class="module-left">
                  <span class="module-index">03</span>
                  <div class="module-meta">
                    <div class="module-title">视频编辑</div>
                  </div>
                </div>
                <div class="module-right">
                  <button class="module-link" data-action="maximize">放大</button>
                  <button class="module-link module-collapse" data-action="collapse" title="收起/展开">▾</button>
                </div>
              </header>
              <div class="module-body">
                <div class="inline-flags">
                  <label class="chk"><input type="checkbox" id="home-edit-auto-cut" checked /> 自动剪气口</label>
                  <label class="chk"><input type="checkbox" id="home-edit-green-toggle" /> 启动绿幕切换</label>
                </div>
                <div class="preview-box home-edit-preview" id="home-edit-preview-box" style="margin-top: 10px">
                  <div id="home-edit-preview-empty">暂无视频预览</div>
                  <video id="home-edit-preview-video" controls playsinline hidden></video>
                </div>
                <div class="card-actions" style="margin-top: 10px">
                  <button class="btn btn-primary" id="btn-start-edit">开始剪辑</button>
                </div>
              </div>
            </section>
          </div>

          <div class="dash-col">
            <section class="module-card" data-module="meta-gen">
              <header class="module-head">
                <div class="module-left">
                  <span class="module-index">04</span>
                  <div class="module-meta">
                    <div class="module-title">标题｜话题｜关键词</div>
                  </div>
                </div>
                <div class="module-right">
                  <button class="module-link" data-action="maximize">放大</button>
                  <button class="module-link module-collapse" data-action="collapse" title="收起/展开">▾</button>
                </div>
              </header>
              <div class="module-body">
                <div class="card-actions meta-actions">
                  <button class="btn btn-primary" id="btn-gen-meta" disabled>生成标题｜标签｜关键词</button>
                </div>
                <div class="field home-module-model-field" style="margin-top: 10px">
                  <div class="home-model-field-head">
                    <div class="label">标题处理模型</div>
                    <span class="pill">默认公用云端大模型</span>
                  </div>
                  <select id="home-meta-llm"></select>
                </div>

                <div class="meta-grid">
                  <div class="field">
                    <div class="label">生成的标题（可编辑）</div>
                    <input id="meta-title" type="text" placeholder="标题将显示在这里..." />
                  </div>

                  <div class="field">
                    <div class="label">生成的话题/标签（可编辑）</div>
                    <div class="hint">建议用逗号分隔（例如：标签1，标签2，标签3）</div>
                    <textarea id="meta-tags" placeholder="标签将显示在这里，逗号分隔..."></textarea>
                  </div>
                </div>

                <div class="field meta-kw">
                  <div class="label">生成的关键词</div>
                  <div class="seg-tabs meta-kw-tabs" id="meta-kw-tabs">
                    <button class="seg-tab is-active" data-kw-cat="重点词/成语词">重点词/成语词</button>
                    <button class="seg-tab" data-kw-cat="描述词">描述词</button>
                    <button class="seg-tab" data-kw-cat="行动词">行动词</button>
                    <button class="seg-tab" data-kw-cat="情感词">情感词</button>
                  </div>
                  <textarea id="meta-kw-text" placeholder="关键词将显示在这里（可编辑）..."></textarea>
                  <div class="card-actions meta-kw-foot">
                    <span class="pill" id="meta-kw-count">已添加 0 个关键词</span>
                    <span class="pill">用于后续数字人识别（分类关键词）</span>
                  </div>
                </div>
              </div>
            </section>

            <section class="module-card" data-module="subtitle-bgm">
              <header class="module-head">
                <div class="module-left">
                  <span class="module-index">05</span>
                  <div class="module-meta">
                    <div class="module-title">字幕和音乐</div>
                  </div>
                </div>
                <div class="module-right">
                  <button class="module-link" data-action="maximize">放大</button>
                  <button class="module-link module-collapse" data-action="collapse" title="收起/展开">▾</button>
                </div>
              </header>
              <div class="module-body">
                <div class="inline-flags">
                  <label class="chk"><input type="checkbox" id="home-sub-auto" checked /> 自动生成字幕</label>
                  <label class="chk"><input type="checkbox" id="home-sub-smart" /> 启用智能字幕</label>
                </div>

                <div class="field home-module-model-field" style="margin-top: 10px">
                  <div class="home-model-field-head">
                    <div class="label">瀛楀箷璇嗗埆妯″瀷</div>
                    <span class="pill">鏈湴/浜戠鍙嫭绔嬮€夋嫨</span>
                  </div>
                  <select id="home-subbgm-asr-model">
                    <option value="local:auto:ASR" selected>绯荤粺榛樿 ASR</option>
                  </select>
                </div>

                <div class="field home-template-picker-field" style="margin-top: 10px">
                  <div class="home-template-picker-toolbar">
                    <div class="home-template-picker-head">
                      <div class="label">模板选择</div>
                      <span class="pill">单击选中，双击直接使用</span>
                    </div>
                    <button class="module-link" id="home-sub-template-manage" type="button">管理</button>
                  </div>
                  <div class="card-actions home-template-picker-row" style="justify-content: space-between; align-items: center">
                    <button class="home-template-picker" id="home-sub-template-picker" type="button">
                      <div class="home-template-picker-main">
                        <span class="home-template-picker-label">当前字幕模板</span>
                        <span id="home-sub-template-name">系统模板（默认）</span>
                      </div>
                      <span class="pill" id="home-sub-template-source">系统模板</span>
                    </button>
                  </div>
                  <div class="hint" id="home-sub-template-desc" style="margin-top: 8px">单击选中，双击直接使用。</div>
                  <select id="home-sub-template" hidden></select>
                </div>

                <div class="field" style="margin-top: 10px">
                  <div class="inline-flags" style="justify-content: space-between; align-items: center">
                    <label class="chk"><input type="checkbox" id="home-sub-pip-enable" /> 画中画</label>
                    <button class="btn" id="home-sub-pip-pick" type="button" hidden>素材选择</button>
                  </div>
                  <div class="hint" id="home-sub-pip-tip" style="margin-top: 6px" hidden>未绑定分段</div>
                </div>

                <div class="field" style="margin-top: 10px">
                  <div class="inline-flags" style="justify-content: space-between">
                    <label class="chk"><input type="checkbox" id="home-bgm-enable" checked /> 添加背景音乐</label>
                    <span class="pill" id="home-bgm-picked">未选择背景音乐</span>
                  </div>
                </div>

                <div class="field" style="margin-top: 10px">
                  <div class="label">背景音乐选择</div>
                  <select id="home-bgm-select">
                    <option value="" selected>选择背景音乐</option>
                  </select>
                </div>

                <div class="grid cols-2 home-audio-compare-grid" style="gap: 10px; margin-top: 10px">
                  <div class="field home-audio-volume-card">
                    <div class="home-audio-volume-head">
                      <div class="label">原视频音量</div>
                      <button class="btn" id="home-source-listen" type="button">试听原视频</button>
                    </div>
                    <div class="grid cols-2" style="gap: 10px">
                      <input id="home-source-volume" type="range" min="0" max="300" value="100" />
                      <input id="home-source-volume-text" type="text" value="100%" />
                    </div>
                    <div class="hint">来源：视频编辑模块生成的剪辑视频原声，支持加强到 300%。</div>
                  </div>
                  <div class="field home-audio-volume-card">
                    <div class="home-audio-volume-head">
                      <div class="label">背景音乐音量</div>
                      <button class="btn" id="home-bgm-listen" type="button">试听背景音乐</button>
                    </div>
                    <div class="grid cols-2" style="gap: 10px">
                      <input id="home-bgm-volume" type="range" min="0" max="100" value="10" />
                      <input id="home-bgm-volume-text" type="text" value="10%" />
                    </div>
                    <div class="hint">原视频和背景音乐试听可同时播放和停止，方便比较声音大小。</div>
                  </div>
                </div>

                <div class="card-actions" style="margin-top: 10px">
                  <button class="btn btn-primary" id="btn-auto-bgm">自动生成字幕和背景音乐</button>
                </div>

                <div class="field" style="margin-top: 12px">
                  <div class="card-actions" style="justify-content: space-between; align-items: center">
                    <div class="label" style="margin: 0">合成视频预览</div>
                    <button class="module-link" id="home-sub-bgm-compare-btn" type="button">视频对比</button>
                  </div>
                  <div class="home-sub-bgm-preview" id="home-sub-bgm-preview">
                    <div class="home-sub-bgm-empty" id="home-sub-bgm-empty">暂无合成预览（请先在“视频编辑”模块生成剪辑视频）</div>
                    <video id="home-sub-bgm-video" controls playsinline hidden></video>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div class="dash-col">
            <section class="module-card" data-module="auto-mode">
              <header class="module-head">
                <div class="module-left">
                  <span class="module-index">🔥</span>
                  <div class="module-meta">
                    <div class="module-title">自动创作模式</div>
                  </div>
                </div>
                <div class="module-right">
                  <button class="module-link" data-action="maximize">放大</button>
                  <button class="module-link module-collapse" data-action="collapse" title="收起/展开">▾</button>
                </div>
              </header>
              <div class="module-body">
                <div class="field">
                  <div class="label">运行模式</div>
                  <select id="home-run-mode">
                    <option value="custom" selected>自定义模型运行</option>
                    <option value="cloud">纯云端模型运行</option>
                    <option value="local">纯本地模型运行</option>
                  </select>
                  <div class="hint" id="home-run-mode-tip">默认自定义，可以自由切换本地和云端模型。</div>
                </div>
                <button class="btn btn-primary btn-wide" id="btn-auto">开启一键自动创作模式</button>
                <div class="card-actions" style="margin-top: 10px; justify-content: space-between">
                  <button class="btn" id="btn-init-files">文件初始化</button>
                  <button class="btn" id="btn-stop">停止任务</button>
                  <button class="btn" id="btn-clean">清除数据</button>
                </div>
                <button class="agent-config-tile" id="btn-agent-config" type="button">
                  <div class="agent-config-title">智能体配置</div>
                  <div class="agent-config-sub">模型设置｜提示词｜字幕｜其他｜画中画</div>
                </button>
              </div>
            </section>

            <section class="module-card" data-module="cover">
              <header class="module-head">
                <div class="module-left">
                  <span class="module-index">06</span>
                  <div class="module-meta">
                    <div class="module-title">封面制作</div>
                  </div>
                </div>
                <div class="module-right">
                  <button class="module-link" data-action="maximize">放大</button>
                  <button class="module-link module-collapse" data-action="collapse" title="收起/展开">▾</button>
                </div>
              </header>
              <div class="module-body">
                <div class="home-cover-bar home-cover-bar-compact">
                  <button class="btn btn-primary" id="btn-cover-auto">自动生成封面</button>
                  <div class="home-cover-template-stack">
                    <div class="home-template-picker-toolbar">
                      <div class="home-template-picker-head">
                        <div class="label">模板选择</div>
                        <span class="pill">封面模板</span>
                      </div>
                      <span class="pill" id="home-cover-picked">已选模板：系统封面模板（默认）</span>
                    </div>
                    <button class="home-template-picker" id="home-cover-template-picker" type="button">
                      <div class="home-template-picker-main">
                        <span class="home-template-picker-label">当前封面模板</span>
                        <span id="home-cover-template-name">系统封面模板（默认）</span>
                      </div>
                      <span class="pill" id="home-cover-template-source">系统模板</span>
                    </button>
                  </div>
                </div>

                <div class="field" style="margin-top: 12px">
                  <div class="label">封面预览</div>
                  <div class="home-cover-preview" id="home-cover-preview">
                    <div class="home-cover-empty" id="home-cover-empty">暂无封面预览（请先在“字幕和音乐”合成视频，或先在“视频编辑”生成剪辑视频）</div>
                    <img id="home-cover-img" hidden />
                  </div>
                </div>
              </div>
            </section>

            <section class="module-card" data-module="publish">
              <header class="module-head">
                <div class="module-left">
                  <span class="module-index">07</span>
                  <div class="module-meta">
                    <div class="module-title">视频发布</div>
                  </div>
                </div>
                <div class="module-right">
                  <button class="module-link" data-action="maximize">放大</button>
                  <button class="module-link module-collapse" data-action="collapse" title="收起/展开">▾</button>
                </div>
              </header>
              <div class="module-body">
                <div class="grid cols-2" style="gap: 10px">
                  <div class="field">
                    <div class="label">平台</div>
                    <select id="home-pub-platform"></select>
                  </div>
                  <div class="field">
                    <div class="inline-flags" style="justify-content: space-between">
                      <div class="label">账号</div>
                      <button class="module-link" id="home-pub-manage-accounts" type="button">管理</button>
                    </div>
                    <select id="home-pub-account"></select>
                  </div>
                </div>
                <div class="field home-pub-target-field" style="margin-top: 10px">
                  <div class="home-pub-target-head">
                    <div class="label">待发布账号</div>
                    <div class="card-actions">
                      <button class="btn" id="home-pub-add-account" type="button">添加账号</button>
                      <button class="module-link" id="home-pub-clear-accounts" type="button">清空</button>
                    </div>
                  </div>
                  <div class="home-pub-target-list" id="home-pub-target-list">未添加账号</div>
                </div>
                <div class="grid cols-2 home-pub-meta-grid" style="gap: 10px; margin-top: 10px">
                  <div class="field">
                    <div class="label">成片来源</div>
                    <div class="pill" id="home-pub-source">未生成成片</div>
                  </div>
                  <div class="field">
                    <div class="label">发布模式</div>
                    <div class="pill">支持跨平台多账号顺序一键发布</div>
                  </div>
                </div>

                <div class="grid cols-2" style="gap: 10px; margin-top: 10px">
                  <div class="field">
                    <div class="label">标题</div>
                    <input id="home-pub-title" type="text" placeholder="默认取首页标题" />
                  </div>
                  <div class="field">
                    <div class="label">话题/标签</div>
                    <input id="home-pub-tags" type="text" placeholder="默认取首页标签（逗号分隔）" />
                  </div>
                </div>

                <div class="field" style="margin-top: 10px">
                  <div class="label">发布时间</div>
                  <div class="home-pub-mode-row">
                    <div class="seg-tabs" id="home-pub-mode-tabs">
                      <button class="seg-tab is-active" data-pub-mode="immediate" type="button">立即发布</button>
                      <button class="seg-tab" data-pub-mode="schedule" type="button">定时发布</button>
                    </div>
                    <button class="btn" id="home-pub-schedule-btn" type="button">设置时间</button>
                  </div>
                  <div class="card-actions home-pub-mode-status" style="justify-content: space-between; margin-top: 8px; align-items: center">
                    <div class="pill" id="home-pub-schedule-pill">立即发布</div>
                  </div>
                </div>

                <div class="home-pub-export-card" style="margin-top: 12px">
                  <div class="home-pub-export-head">
                    <div class="home-pub-export-head-main">
                      <div class="home-pub-export-title-row">
                        <div class="label" style="margin: 0">一键导出</div>
                        <span class="home-pub-export-badge">成片 + 封面</span>
                      </div>
                      <div class="hint">自动把首页生成的成片和封面整理到同一个新建文件夹中。</div>
                    </div>
                    <span class="pill mono" id="home-pub-export-status">待准备</span>
                  </div>
                  <div class="home-pub-export-grid">
                    <div class="home-pub-export-item">
                      <div class="home-pub-export-label">导出目录</div>
                      <div class="home-pub-export-path is-placeholder" id="home-pub-export-dir">未设置导出目录</div>
                    </div>
                    <div class="home-pub-export-item">
                      <div class="home-pub-export-label">生成文件夹名</div>
                      <div class="home-pub-export-path is-placeholder" id="home-pub-export-folder-name">将使用视频生成时间</div>
                    </div>
                  </div>
                  <div class="home-pub-export-files">
                    <div class="home-pub-export-ready-card">
                      <div class="home-pub-export-ready-label">成片状态</div>
                      <span class="pill is-bad" id="home-pub-export-video-pill">成片未就绪</span>
                    </div>
                    <div class="home-pub-export-ready-card">
                      <div class="home-pub-export-ready-label">封面状态</div>
                      <span class="pill is-bad" id="home-pub-export-cover-pill">封面未就绪</span>
                    </div>
                  </div>
                  <div class="home-pub-export-tip" id="home-pub-export-tip">请先生成成片、封面并设置导出目录。</div>
                  <div class="card-actions home-pub-export-actions">
                    <div class="home-pub-export-actions-secondary">
                      <button class="btn" id="home-pub-export-pick-dir" type="button">选择导出目录</button>
                      <button class="btn" id="home-pub-export-open-dir" type="button">打开目录</button>
                    </div>
                    <button class="btn btn-primary" id="home-pub-export-btn" type="button">一键导出</button>
                  </div>
                </div>

                <div class="card-actions home-pub-foot-actions" style="margin-top: 10px; justify-content: space-between">
                  <button class="btn" id="home-pub-to-center">去发布管理</button>
                  <button class="btn btn-primary" id="home-pub-create">一键发布</button>
                </div>
              </div>
            </section>
          </div>
        </div>

        <div class="overlay" id="overlay" hidden></div>

        <div class="modal-overlay" id="home-pub-sched-overlay" hidden></div>
        <div class="modal pub-sched-modal" id="home-pub-sched-modal" hidden>
          <div class="modal-head">
            <div class="modal-title">定时发布</div>
            <button class="modal-close" id="home-pub-sched-close" title="关闭">×</button>
          </div>
          <div class="modal-body">
            <div class="pub-sched-grid">
              <div class="field">
                <div class="label">选择发布时间</div>
                <input id="home-pub-sched-date" type="date" />
              </div>
              <div class="field">
                <div class="label">选择时间</div>
                <div class="pub-sched-time">
                  <select id="home-pub-sched-hh"></select>
                  <select id="home-pub-sched-mm"></select>
                  <select id="home-pub-sched-ss"></select>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-foot" style="justify-content: space-between">
            <button class="btn" id="home-pub-sched-now">两小时后</button>
            <div class="card-actions">
              <button class="btn" id="home-pub-sched-clear">清除</button>
              <button class="btn btn-primary" id="home-pub-sched-ok">确定</button>
            </div>
          </div>
        </div>

        <div class="modal-overlay" id="extract-modal-overlay" hidden></div>
        <div class="modal" id="extract-modal" hidden>
          <div class="modal-head">
            <div class="modal-title">粘贴视频分享文本 - 快速转写</div>
            <button class="modal-close" id="extract-modal-close" title="关闭">×</button>
          </div>
          <div class="modal-body">
            <div class="field">
              <div class="label">输入内容</div>
              <div class="hint">支持抖音等分享文本、视频链接，或 mp4/mov/webm 等直链</div>
              <textarea id="extract-input" placeholder="请输入分享文本、视频链接，或 mp4/mov/webm 等直链..."></textarea>
            </div>
            <div class="field" style="margin-top: 10px">
              <div class="label">识别到的抖音链接</div>
              <div class="hint" id="extract-douyin-url">未识别到抖音链接</div>
            </div>
            <div class="modal-tip">
              <div class="label">提示</div>
              <ul class="tip-list">
                <li>已支持抖音分享文本、抖音视频链接</li>
                <li>支持直接视频文件URL（如 .mp4、.mov 等）</li>
                <li>快手、小红书、B站、视频号分享链接目前可能提示不支持</li>
                <li>转写会进入任务队列，完成后可用于生成爆款文案</li>
              </ul>
            </div>
          </div>
          <div class="modal-foot">
            <button class="btn" id="extract-cancel">取消</button>
            <button class="btn btn-primary" id="extract-submit">一键转写</button>
          </div>
        </div>

        <div class="modal-overlay" id="home-video-compare-overlay" hidden></div>
        <div class="modal home-video-compare-modal" id="home-video-compare-modal" hidden>
          <div class="modal-head">
            <div class="modal-title">视频对比</div>
            <button class="modal-close" id="home-video-compare-close" title="关闭">×</button>
          </div>
          <div class="modal-body">
            <div class="home-video-compare-toolbar">
              <div class="card-actions" style="justify-content: space-between; flex-wrap: wrap">
                <span class="pill">左侧数字人原视频｜右侧字幕和音乐成片</span>
                <div class="card-actions">
                  <button class="btn" id="home-video-compare-play" type="button">同时播放</button>
                  <button class="btn" id="home-video-compare-pause" type="button">同时暂停</button>
                  <button class="btn" id="home-video-compare-reset" type="button">同步到开头</button>
                </div>
              </div>
              <div class="home-video-compare-tip">支持直接使用视频控件播放、暂停和拖动，另一侧会自动跟随同步。</div>
            </div>
            <div class="home-video-compare-grid" style="margin-top: 12px">
              <div class="home-video-compare-card">
                <div class="home-video-compare-card-head">
                  <div class="home-video-compare-card-meta">
                    <div class="label" style="margin: 0">数字人原视频</div>
                    <div class="home-video-compare-status" id="home-video-compare-base-path">未准备</div>
                  </div>
                  <button class="btn home-video-compare-open" id="home-video-compare-base-open" type="button" disabled hidden>打开文件位置</button>
                </div>
                <div class="home-video-compare-frame">
                  <div class="home-video-compare-empty" id="home-video-compare-base-empty">请先在“音频视频生成”模块选择数字人形象。</div>
                  <video id="home-video-compare-base-video" controls playsinline hidden></video>
                </div>
              </div>
              <div class="home-video-compare-card">
                <div class="home-video-compare-card-head">
                  <div class="home-video-compare-card-meta">
                    <div class="label" style="margin: 0">字幕和音乐成片</div>
                    <div class="home-video-compare-status" id="home-video-compare-out-path">未准备</div>
                  </div>
                  <button class="btn home-video-compare-open" id="home-video-compare-out-open" type="button" disabled hidden>打开文件位置</button>
                </div>
                <div class="home-video-compare-frame">
                  <div class="home-video-compare-empty" id="home-video-compare-out-empty">请先在“字幕和音乐”模块生成成片。</div>
                  <video id="home-video-compare-out-video" controls playsinline hidden></video>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-foot">
            <button class="btn" id="home-video-compare-done">关闭</button>
          </div>
        </div>

        <div class="modal-overlay" id="ipbrain-modal-overlay" hidden></div>
        <div class="modal ipbrain-modal" id="ipbrain-modal" hidden>
          <div class="modal-head">
            <div class="modal-title">添加IP大脑</div>
            <button class="modal-close" id="ipbrain-modal-close" title="关闭">×</button>
          </div>
          <div class="modal-body">
            <div class="field">
              <div class="label">输入内容</div>
              <div class="hint">支持抖音主页链接、用户分享链接、短链接，或包含链接的分享文本</div>
              <textarea id="ipbrain-input" placeholder="例如：https://www.douyin.com/user/... 或 https://v.douyin.com/..."></textarea>
            </div>
            <div class="field" style="margin-top: 10px">
              <div class="label">识别到的抖音链接</div>
              <div class="ipbrain-detected" id="ipbrain-detected">未识别到抖音链接</div>
            </div>
            <div class="modal-tip">
              <div class="label">说明</div>
              <ul class="tip-list">
                <li>采集后将展示该账号最新发布的 5 条标题</li>
                <li>系统会基于最新标题用 AI 生成 5 个新的标题</li>
                <li>标题生成提示词可在“智能体配置-提示词设置”中修改</li>
              </ul>
            </div>
          </div>
          <div class="modal-foot">
            <button class="btn" id="ipbrain-cancel">取消</button>
            <button class="btn btn-primary" id="ipbrain-start" disabled>开始采集</button>
          </div>
        </div>

        <div class="modal-overlay" id="cover-tpl-modal-overlay" hidden></div>
        <div class="modal tpl-gallery-modal" id="cover-tpl-modal" hidden>
          <div class="modal-head">
            <div class="modal-title">选择封面模板</div>
            <button class="modal-close" id="cover-tpl-modal-close" title="关闭">×</button>
          </div>
          <div class="modal-body">
            <div class="tpl-gallery-toolbar">
              <div class="tpl-gallery-toolbar-main">
                <span class="pill">选择后用于自动生成封面</span>
                <span class="tpl-gallery-tip">单击选中，双击直接使用</span>
              </div>
              <button class="btn" id="cover-tpl-manage" type="button">管理封面模板</button>
            </div>
            <div class="tpl-gallery-current" id="cover-tpl-current"></div>
            <div class="tpl-gallery-grid" id="cover-tpl-grid" style="margin-top: 12px"></div>
          </div>
          <div class="modal-foot">
            <button class="btn" id="cover-tpl-cancel">取消</button>
            <button class="btn btn-primary" id="cover-tpl-ok">确定</button>
          </div>
        </div>

        <div class="modal-overlay" id="sub-tpl-modal-overlay" hidden></div>
        <div class="modal tpl-gallery-modal" id="sub-tpl-modal" hidden>
          <div class="modal-head">
            <div class="modal-title">选择字幕模板</div>
            <button class="modal-close" id="sub-tpl-modal-close" title="关闭">×</button>
          </div>
          <div class="modal-body">
            <div class="tpl-gallery-toolbar">
              <div class="tpl-gallery-toolbar-main">
                <span class="pill">选择后用于自动生成字幕和关键词样式</span>
                <span class="tpl-gallery-tip">单击选中，双击直接使用</span>
              </div>
              <button class="btn" id="sub-tpl-manage" type="button">管理字幕模板</button>
            </div>
            <div class="tpl-gallery-current" id="sub-tpl-current"></div>
            <div class="tpl-gallery-grid" id="sub-tpl-grid" style="margin-top: 12px"></div>
          </div>
          <div class="modal-foot">
            <button class="btn" id="sub-tpl-cancel">取消</button>
            <button class="btn btn-primary" id="sub-tpl-ok">确定</button>
          </div>
        </div>

        <div class="modal-overlay" id="hotcopy-modal-overlay" hidden></div>
        <div class="modal hotcopy-modal" id="hotcopy-modal" hidden>
          <div class="modal-head">
            <div class="modal-title">生成爆款文案</div>
            <button class="modal-close" id="hotcopy-modal-close" title="关闭">×</button>
          </div>
          <div class="modal-body">
            <div class="hotcopy-progress" id="hotcopy-progress">
              <div class="spinner"></div>
              <div class="hotcopy-progress-text" id="hotcopy-progress-text">AI 正在创作中...</div>
              <div class="hint" style="text-align: center">将输出 3 个明显不同方向的方案</div>
            </div>
            <div class="hotcopy-options" id="hotcopy-options" hidden></div>
          </div>
          <div class="modal-foot">
            <button class="btn" id="hotcopy-close">关闭</button>
            <button class="btn btn-primary" id="hotcopy-apply" disabled>使用此文案</button>
          </div>
        </div>

        <div class="modal-overlay" id="legal-modal-overlay" hidden></div>
        <div class="modal" id="legal-modal" hidden>
          <div class="modal-head">
            <div class="modal-title">AI 法务审核</div>
            <button class="modal-close" id="legal-modal-close" title="关闭">×</button>
          </div>
          <div class="modal-body">
            <div class="legal-progress">
              <div class="spinner"></div>
              <div class="legal-progress-text" id="legal-progress-text">正在检查违禁词、敏感词、极限词等法律风险...</div>
              <div class="hint" style="text-align: center">完成后将自动打开“AI法务审核报告”</div>
            </div>
          </div>
          <div class="modal-foot">
            <button class="btn" id="legal-cancel">关闭</button>
          </div>
        </div>

        <div class="modal-overlay" id="legal-report-overlay" hidden></div>
        <div class="modal legal-report-modal" id="legal-report-modal" hidden>
          <div class="modal-head">
            <div class="modal-title">AI 法务审核报告</div>
            <button class="modal-close" id="legal-report-close-x" title="关闭">×</button>
          </div>
          <div class="modal-body">
            <div class="legal-report-scroll">
              <div class="legal-banner" id="legal-banner">
                <div class="legal-banner-title" id="legal-banner-title">正在生成报告...</div>
                <div class="legal-banner-sub" id="legal-banner-sub">请稍候</div>
              </div>

              <div class="legal-block">
                <div class="legal-block-title">原文案分析</div>
                <div class="legal-block-body mono legal-text" id="legal-origin"></div>
              </div>

              <div class="legal-block">
                <div class="legal-block-title">优化后文案</div>
                <div class="legal-block-body mono legal-text" id="legal-fixed"></div>
              </div>

              <div class="legal-block">
                <div class="legal-block-title">AI 审核解读</div>
                <div class="legal-block-body" id="legal-analysis"></div>
              </div>

              <div class="legal-block">
                <div class="legal-block-title">风险详情</div>
                <div class="legal-block-body" id="legal-risks"></div>
              </div>
            </div>
          </div>
          <div class="modal-foot">
            <button class="btn" id="legal-report-close">关闭</button>
            <button class="btn btn-primary" id="legal-report-apply">采用优化文案</button>
          </div>
        </div>

        <div class="modal-overlay" id="voice-modal-overlay" hidden></div>
        <div class="modal voice-modal" id="voice-modal" hidden>
          <div class="modal-head">
            <div class="modal-title">音色管理</div>
            <button class="modal-close" id="voice-modal-close" title="关闭">×</button>
          </div>
          <div class="modal-body">
            <div class="voice-top">
              <div class="voice-tabs" id="voice-tabs">
                <button class="voice-tab is-active" data-voice-tab="system">系统音色</button>
                <button class="voice-tab" data-voice-tab="clone">克隆音色</button>
              </div>
              <div class="card-actions">
                <button class="btn" id="btn-refresh-voices">刷新</button>
                <button class="btn btn-primary" id="btn-add-clone-voice" hidden>+ 添加克隆音色</button>
              </div>
            </div>

            <div class="voice-subtabs" id="voice-subtabs">
              <button class="voice-subtab is-active" data-subtab="putonghua">普通话</button>
              <button class="voice-subtab" data-subtab="waiguo">外文</button>
              <button class="voice-subtab" data-subtab="fangyan">方言</button>
            </div>

            <div class="voice-list" id="voice-list"></div>
          </div>
        </div>

        <div class="modal-overlay" id="clone-modal-overlay" hidden></div>
        <div class="modal clone-modal" id="clone-modal" hidden>
          <div class="modal-head">
            <div class="modal-title">添加克隆音色</div>
            <button class="modal-close" id="clone-modal-close" title="关闭">×</button>
          </div>
          <div class="modal-body">
            <div class="grid cols-2" style="gap: 10px">
              <div class="field">
                <div class="label">音色名称</div>
                <input id="clone-name" type="text" placeholder="例如：我的专属音色" />
              </div>
              <div class="field">
                <div class="label">麦克风</div>
                <select id="clone-mic"></select>
              </div>
            </div>
            <div class="field" style="margin-top: 10px">
              <div class="label">参考音频</div>
              <div class="card-actions">
                <button class="btn btn-primary" id="clone-record">开始录制</button>
                <button class="btn" id="clone-stop" disabled>停止</button>
                <button class="btn" id="clone-pick-file">选择音频文件</button>
                <button class="btn" id="clone-preview" disabled>试听</button>
                <span class="pill mono" id="clone-audio-status">未录制</span>
              </div>
              <canvas id="clone-wave" class="clone-wave" width="680" height="64" hidden></canvas>
              <div class="hint">建议10~20 秒，清晰无噪音。可录制或选择本地音频文件。</div>
            </div>
            <div class="field" style="margin-top: 10px">
              <div class="label">克隆模型</div>
              <select id="clone-model-select"></select>
              <div class="hint" id="clone-model-hint">可在这里切换本地模型和云端 CosyVoice；选择云端后会自动上传参考音频。</div>
            </div>
            <div class="field" style="margin-top: 10px">
              <div class="label">参考文字</div>
              <textarea id="clone-ref-text" placeholder="请输入参考文字（用于生成预览音频）..."></textarea>
            </div>
            <div class="field" style="margin-top: 10px">
              <div class="label">生成日志</div>
              <pre class="clone-log" id="clone-log-box"></pre>
            </div>
          </div>
          <div class="modal-foot">
            <button class="btn" id="clone-cancel">取消</button>
            <button class="btn" id="clone-create">一键复刻</button>
            <button class="btn btn-danger" id="clone-cancel-gen" disabled>停止生成</button>
            <button class="btn btn-primary" id="clone-save" disabled>保存</button>
          </div>
        </div>

        <div class="modal-overlay" id="agent-modal-overlay" hidden></div>
        <div class="modal agent-modal" id="agent-modal" hidden>
          <div class="modal-head">
            <div class="modal-title">IP智能体设置</div>
            <button class="modal-close" id="agent-modal-close" title="关闭">×</button>
          </div>
          <div class="modal-body agent-modal-body">
            <div class="seg-tabs agent-tabs" id="agent-tabs">
              <button class="seg-tab is-active" data-agent-tab="model">模型设置</button>
              <button class="seg-tab" data-agent-tab="prompt">提示词设置</button>
              <button class="seg-tab" data-agent-tab="subtitle">字幕设置</button>
              <button class="seg-tab" data-agent-tab="other">其他设置</button>
              <button class="seg-tab" data-agent-tab="pip">画中画设置</button>
            </div>

            <div class="agent-panel is-active" data-agent-panel="model">
              <div class="field">
                <div class="label">文案模型（云端）</div>
                <select id="agent-llm"></select>
              </div>
              <div class="grid cols-2" style="gap: 10px">
                <div class="field">
                  <div class="label">数字人模型权重</div>
                  <select id="agent-videosync-weight">
                    <option value="256m" selected>256m（推荐）</option>
                    <option value="256o">256o（自然）</option>
                    <option value="384m">384m（高清）</option>
                  </select>
                </div>
                <div class="field">
                  <div class="label">batch_size</div>
                  <select id="agent-videosync-batch">
                    <option value="1">1（更省显存）</option>
                    <option value="2" selected>2</option>
                    <option value="4">4</option>
                    <option value="8">8</option>
                  </select>
                </div>
              </div>
              <div class="field">
                <div class="label">weight_type</div>
                <select id="agent-videosync-weight-type">
                  <option value="fp16" selected>fp16（推荐）</option>
                  <option value="fp32">fp32</option>
                </select>
              </div>
            </div>

            <div class="agent-panel" data-agent-panel="prompt">
              <div class="field">
                <div class="label">System Prompt</div>
                <textarea id="agent-system-prompt" placeholder="请输入系统提示词（可选）..."></textarea>
              </div>
              <div class="field">
                <div class="label">文案仿写 Prompt</div>
                <textarea id="agent-rewrite-prompt" placeholder="请输入仿写提示词（可选）..."></textarea>
              </div>
              <div class="field">
                <div class="label">AI法务审核 Prompt</div>
                <textarea id="agent-legal-prompt" placeholder="请输入AI法务审核提示词（可选）..."></textarea>
              </div>
              <div class="field">
                <div class="label">IP大脑标题生成 Prompt</div>
                <textarea id="agent-ipbrain-title-prompt" placeholder="请输入IP大脑标题生成提示词（可选）..."></textarea>
              </div>
              <div class="field">
                <div class="label">IP学习口播生成 Prompt</div>
                <textarea id="agent-ipbrain-speech-prompt" placeholder="请输入IP学习口播生成提示词（可选）..."></textarea>
              </div>
              <div class="field">
                <div class="label">爆款文案生成 Prompt</div>
                <textarea id="agent-hotcopy-prompt" placeholder="请输入爆款文案生成提示词（可选）..."></textarea>
              </div>
              <div class="field">
                <div class="label">标题｜标签｜关键词 Prompt</div>
                <textarea id="agent-meta-prompt" placeholder="请输入标题/标签/关键词生成提示词（可选）..."></textarea>
              </div>
            </div>

            <div class="agent-panel" data-agent-panel="subtitle">
              <div class="grid cols-2" style="gap: 10px">
                <div class="field">
                  <div class="label">启用字幕</div>
                  <label class="chk"><input type="checkbox" id="agent-sub-enable" checked /> 自动生成字幕</label>
                </div>
                <div class="field">
                  <div class="label">字幕位置</div>
                  <select id="agent-sub-pos">
                    <option value="bottom" selected>底部</option>
                    <option value="middle">居中</option>
                    <option value="top">顶部</option>
                  </select>
                </div>
              </div>
              <div class="grid cols-2" style="gap: 10px">
                <div class="field">
                  <div class="label">字号</div>
                  <input id="agent-sub-size" type="text" value="48" />
                </div>
                <div class="field">
                  <div class="label">样式</div>
                  <select id="agent-sub-style">
                    <option value="clean" selected>清爽</option>
                    <option value="bold">加粗</option>
                    <option value="shadow">描边+阴影</option>
                  </select>
                </div>
              </div>
            </div>

            <div class="agent-panel" data-agent-panel="other">
              <div class="grid cols-2" style="gap: 10px">
                <div class="field">
                  <div class="label">输出比例</div>
                  <select id="agent-ratio">
                    <option value="9:16" selected>9:16（竖屏）</option>
                    <option value="16:9">16:9（横屏）</option>
                    <option value="1:1">1:1</option>
                  </select>
                </div>
                <div class="field">
                  <div class="label">输出FPS</div>
                  <select id="agent-fps">
                    <option value="25" selected>25</option>
                    <option value="30">30</option>
                  </select>
                </div>
              </div>
              <div class="field">
                <div class="label">发布前自动审核</div>
                <label class="chk"><input type="checkbox" id="agent-legal" checked /> 自动执行 AI 法务</label>
              </div>
            </div>

            <div class="agent-panel" data-agent-panel="pip">
              <div class="grid cols-2" style="gap: 10px">
                <div class="field">
                  <div class="label">启用画中画</div>
                  <label class="chk"><input type="checkbox" id="agent-pip-enable" /> 开启画中画</label>
                </div>
                <div class="field">
                  <div class="label">位置</div>
                  <select id="agent-pip-pos">
                    <option value="tr" selected>右上</option>
                    <option value="tl">左上</option>
                    <option value="br">右下</option>
                    <option value="bl">左下</option>
                  </select>
                </div>
              </div>
              <div class="grid cols-2" style="gap: 10px">
                <div class="field">
                  <div class="label">缩放</div>
                  <select id="agent-pip-scale">
                    <option value="0.35" selected>0.35</option>
                    <option value="0.45">0.45</option>
                    <option value="0.55">0.55</option>
                  </select>
                </div>
                <div class="field">
                  <div class="label">圆角</div>
                  <input id="agent-pip-radius" type="text" value="16" />
                </div>
              </div>
            </div>
          </div>
          <div class="modal-foot">
            <button class="btn" id="agent-cancel">取消</button>
            <button class="btn btn-primary" id="agent-save">保存</button>
          </div>
        </div>
      </div>
    `);

    const visibilitySyncOptions = {
      cloudObjectName: "qd-shouyecaidanjiemian",
      defaultModules: HOME_MODULE_VISIBILITY_DEFAULTS,
      scene: "desktop"
    };
    const syncHomeModuleVisibility = async ({ silent = true } = {}) => {
      if (!root || typeof root.querySelectorAll !== "function") return null;
      return syncPageModuleVisibility(root, { ...visibilitySyncOptions, silent }).catch(() => null);
    };
    await syncHomeModuleVisibility({ silent: true });
    startPageModuleVisibilityLiveSync(root, { ...visibilitySyncOptions, intervalMs: 4000 });
    if (window.__ipfactoryHomeModuleVisibilityHashListener) {
      try {
        window.removeEventListener("hashchange", window.__ipfactoryHomeModuleVisibilityHashListener);
      } catch {}
      window.__ipfactoryHomeModuleVisibilityHashListener = null;
    }
    window.__ipfactoryHomeModuleVisibilityHashListener = () => {
      const currentHash = String(window.location.hash || "").split("?")[0].trim();
      if (!root?.isConnected) return;
      if (!currentHash || currentHash === "#/home") {
        syncHomeModuleVisibility({ silent: true }).catch(() => null);
      }
    };
    window.addEventListener("hashchange", window.__ipfactoryHomeModuleVisibilityHashListener);

    const toast = (msg) => {
      const el = document.createElement("div");
      el.className = "pill";
      el.style.position = "fixed";
      el.style.right = "16px";
      el.style.bottom = "16px";
      el.style.zIndex = "9999";
      el.textContent = msg;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 1600);
    };

    const extractOverlay = root.querySelector("#extract-modal-overlay");
    const extractModal = root.querySelector("#extract-modal");
    const extractInput = root.querySelector("#extract-input");
    const extractDouyinUrlHint = root.querySelector("#extract-douyin-url");
    const ipStudyResult = root.querySelector("#ip-study-result");
    const btnQuickParse = root.querySelector("#btn-quick-parse");
    const copyEditContent = root.querySelector("#copy-edit-content");
    const copyWordCount = root.querySelector("#copy-word-count");
    const recognizeOverlay = root.querySelector("#recognize-overlay");
    const recognizeSub = root.querySelector("#recognize-sub");
    const btnRewriteCopy = root.querySelector("#btn-rewrite-copy");
    const copyAutoRewriteToggle = root.querySelector("#copy-auto-rewrite-toggle");
    const btnLegalReview = root.querySelector("#btn-legal-review");
    const hotcopyVideoType = root.querySelector("#hotcopy-video-type");
    const hotcopyCopyType = root.querySelector("#hotcopy-copy-type");
    const hotcopyPersona = root.querySelector("#hotcopy-persona");
    const hotcopyProduct = root.querySelector("#hotcopy-product");
    const hotcopySell = root.querySelector("#hotcopy-sell");
    const hotcopyOther = root.querySelector("#hotcopy-other");
    const hotcopyCountRange = root.querySelector("#hotcopy-count-range");
    const hotcopyCount = root.querySelector("#hotcopy-count");
    const btnGenHotcopy = root.querySelector("#btn-gen-hotcopy");
    const hotcopyOverlay = root.querySelector("#hotcopy-modal-overlay");
    const hotcopyModal = root.querySelector("#hotcopy-modal");
    const hotcopyModalClose = root.querySelector("#hotcopy-modal-close");
    const hotcopyClose = root.querySelector("#hotcopy-close");
    const hotcopyApply = root.querySelector("#hotcopy-apply");
    const hotcopyProgress = root.querySelector("#hotcopy-progress");
    const hotcopyProgressText = root.querySelector("#hotcopy-progress-text");
    const hotcopyOptions = root.querySelector("#hotcopy-options");
    const btnVoicePicker = root.querySelector("#btn-voice-picker");
    const voicePickedLabel = root.querySelector("#voice-picked-label");
    const logBox = root.querySelector("#runtime-log-box");
    const logClear = root.querySelector("#log-clear");
    const logCopy = root.querySelector("#log-copy");
    const logAutoScroll = root.querySelector("#log-autoscroll");
    const btnGenMeta = root.querySelector("#btn-gen-meta");
    const metaTitle = root.querySelector("#meta-title");
    const metaTags = root.querySelector("#meta-tags");
    const metaKwTabs = root.querySelector("#meta-kw-tabs");
    const metaKwText = root.querySelector("#meta-kw-text");
    const metaKwCount = root.querySelector("#meta-kw-count");
    const ipStudyTabsEl = root.querySelector('[data-tabs="ip-study-tabs"]');
    const btnIpBrainAdd = root.querySelector("#btn-ipbrain-add");
    const ipbrainCount = root.querySelector("#ipbrain-count");
    const ipbrainAccounts = root.querySelector("#ipbrain-accounts");
    const ipbrainEmpty = root.querySelector("#ipbrain-empty");
    const ipbrainTopicTitle = root.querySelector("#ipbrain-topic-title");
    const ipbrainTopicSub = root.querySelector("#ipbrain-topic-sub");
    const ipbrainTopics = root.querySelector("#ipbrain-topics");
    const ipbrainTopicEmpty = root.querySelector("#ipbrain-topic-empty");
    const ipbrainOverlay = root.querySelector("#ipbrain-modal-overlay");
    const ipbrainModal = root.querySelector("#ipbrain-modal");
    const ipbrainModalClose = root.querySelector("#ipbrain-modal-close");
    const ipbrainCancel = root.querySelector("#ipbrain-cancel");
    const ipbrainStart = root.querySelector("#ipbrain-start");
    const ipbrainInput = root.querySelector("#ipbrain-input");
    const ipbrainDetected = root.querySelector("#ipbrain-detected");

    let recognizeCanceled = false;
    let recognizeStopRequested = false;
    let currentTaskId = "";
    let extractSubmitting = false;
    let logLineCount = 0;
    let rewriting = false;
    let rewriteRunId = 0;
    let rewriteCancelRequested = false;
    let rewriteTaskId = "";
    const isCopyAutoRewriteEnabled = () => copyAutoRewriteToggle?.checked === true;

    const HOME_INPUT_MEM_KEY = "ipfactory.home.inputs.v1";
    let homeInputMemTimer = null;
    const readHomeInputMem = () => {
      try {
        const raw = localStorage.getItem(HOME_INPUT_MEM_KEY);
        const obj = JSON.parse(raw || "{}");
        return obj && typeof obj === "object" ? obj : {};
      } catch {
        return {};
      }
    };
    const writeHomeInputMem = (obj) => {
      try {
        localStorage.setItem(HOME_INPUT_MEM_KEY, JSON.stringify(obj || {}, null, 2));
      } catch {}
    };
    const clampMemText = (v) => {
      const s = String(v ?? "");
      return s.length > 200000 ? s.slice(0, 200000) : s;
    };
    const persistHomeInputEl = (el) => {
      if (!el?.id) return;
      const id = String(el.id || "").trim();
      if (!id) return;
      const mem = readHomeInputMem();
      if (el.tagName === "INPUT" && String(el.type || "").toLowerCase() === "checkbox") mem[id] = el.checked === true;
      else mem[id] = clampMemText(el.value);
      if (homeInputMemTimer) clearTimeout(homeInputMemTimer);
      homeInputMemTimer = setTimeout(() => writeHomeInputMem(mem), 160);
    };
    const restoreHomeInputMem = () => {
      const mem = readHomeInputMem();
      const els = Array.from(root.querySelectorAll("input[id],textarea[id],select[id]") || []);
      els.forEach((el) => {
        const id = String(el?.id || "").trim();
        if (!id) return;
        if (!(id in mem)) return;
        if (el.tagName === "INPUT" && String(el.type || "").toLowerCase() === "checkbox") el.checked = mem[id] === true;
        else el.value = String(mem[id] ?? "");
      });
    };
    const bindHomeInputMem = () => {
      const els = Array.from(root.querySelectorAll("input[id],textarea[id],select[id]") || []);
      els.forEach((el) => {
        const tag = String(el.tagName || "").toUpperCase();
        if (tag === "SELECT") el.addEventListener("change", () => persistHomeInputEl(el));
        else if (tag === "TEXTAREA") el.addEventListener("input", () => persistHomeInputEl(el));
        else if (tag === "INPUT") {
          const t = String(el.type || "").toLowerCase();
          const ev = t === "checkbox" || t === "radio" ? "change" : "input";
          el.addEventListener(ev, () => persistHomeInputEl(el));
        }
      });
    };
    restoreHomeInputMem();
    bindHomeInputMem();

    const SYSTEM_VOICES = [
      { id: "sys_Cherry", title: "芊悦（普通话女声）", aliyunVoiceId: "Cherry" },
      { id: "sys_Serena", title: "苏瑶（普通话女声）", aliyunVoiceId: "Serena" },
      { id: "sys_Ethan", title: "晨煦（普通话男声）", aliyunVoiceId: "Ethan" },
      { id: "sys_Chelsie", title: "千雪（二次元女声）", aliyunVoiceId: "Chelsie" },
      { id: "sys_Momo", title: "茉兔（活泼女声）", aliyunVoiceId: "Momo" },
      { id: "sys_Vivian", title: "十三（个性女声）", aliyunVoiceId: "Vivian" },
      { id: "sys_Moon", title: "月白（率性男声）", aliyunVoiceId: "Moon" },
      { id: "sys_Maia", title: "四月（知性女声）", aliyunVoiceId: "Maia" },
      { id: "sys_Kai", title: "凯（沉浸男声）", aliyunVoiceId: "Kai" },
      { id: "sys_Nofish", title: "不吃鱼（特色男声）", aliyunVoiceId: "Nofish" },
      { id: "sys_Bella", title: "萌宝（萝莉女声）", aliyunVoiceId: "Bella" },
      { id: "sys_Jennifer", title: "詹妮弗（美语女声）", aliyunVoiceId: "Jennifer" },
      { id: "sys_Ryan", title: "甜茶（张力男声）", aliyunVoiceId: "Ryan" },
      { id: "sys_Katerina", title: "卡捷琳娜（御姐女声）", aliyunVoiceId: "Katerina" },
      { id: "sys_Aiden", title: "艾登（美语男声）", aliyunVoiceId: "Aiden" },
      { id: "sys_Arthur", title: "徐大爷（故事男声）", aliyunVoiceId: "Arthur" },
      { id: "sys_Bellona", title: "燕铮莺（洪亮女声）", aliyunVoiceId: "Bellona" },
      { id: "sys_Bunny", title: "萌小姬（萌系女声）", aliyunVoiceId: "Bunny" },
      { id: "sys_Mia", title: "乖小妹（温顺女声）", aliyunVoiceId: "Mia" },
      { id: "sys_Mochi", title: "沙小弥（早慧童声）", aliyunVoiceId: "Mochi" },
      { id: "sys_Neil", title: "阿闻（新闻男声）", aliyunVoiceId: "Neil" },
      { id: "sys_Nini", title: "邻家妹妹（甜美女声）", aliyunVoiceId: "Nini" },
      { id: "sys_Ebona", title: "诡婆婆（惊悚女声）", aliyunVoiceId: "Ebona" },
      { id: "sys_Seren", title: "小婉（助眠女声）", aliyunVoiceId: "Seren" },
      { id: "sys_Pip", title: "顽屁小孩（淘气童声）", aliyunVoiceId: "Pip" },
      { id: "sys_Stella", title: "少女阿月（元气女声）", aliyunVoiceId: "Stella" },
      { id: "sys_Vincent", title: "田叔（烟嗓男声）", aliyunVoiceId: "Vincent" },
      { id: "sys_Radio_Gol", title: "拉迪奥·戈尔（足球解说）", aliyunVoiceId: "Radio Gol" },
      { id: "sys_Jada", title: "上海-阿珍（上海话女声）", aliyunVoiceId: "Jada" },
      { id: "sys_Dylan", title: "北京-晓东（北京话男声）", aliyunVoiceId: "Dylan" },
      { id: "sys_Li", title: "南京-老李（南京话男声）", aliyunVoiceId: "Li" },
      { id: "sys_Marcus", title: "陕西-秦川（陕西话男声）", aliyunVoiceId: "Marcus" },
      { id: "sys_Roy", title: "闽南-阿杰（闽南语男声）", aliyunVoiceId: "Roy" },
      { id: "sys_Peter", title: "天津-李彼得（天津话男声）", aliyunVoiceId: "Peter" },
      { id: "sys_Sunny", title: "四川-晴儿（四川话女声）", aliyunVoiceId: "Sunny" },
      { id: "sys_Eric", title: "四川-程川（四川话男声）", aliyunVoiceId: "Eric" },
      { id: "sys_Rocky", title: "粤语-阿强（粤语男声）", aliyunVoiceId: "Rocky" },
      { id: "sys_Kiki", title: "粤语-阿清（粤语女声）", aliyunVoiceId: "Kiki" },
      { id: "sys_Bodega", title: "博德加（西语男声）", aliyunVoiceId: "Bodega" },
      { id: "sys_Sonrisa", title: "索尼莎（西语女声）", aliyunVoiceId: "Sonrisa" },
      { id: "sys_Alek", title: "阿列克（俄语男声）", aliyunVoiceId: "Alek" },
      { id: "sys_Dolce", title: "多尔切（意语男声）", aliyunVoiceId: "Dolce" },
      { id: "sys_Sohee", title: "素熙（韩语女声）", aliyunVoiceId: "Sohee" },
      { id: "sys_Ono_Anna", title: "小野杏（日语女声）", aliyunVoiceId: "Ono Anna" },
      { id: "sys_Lenn", title: "莱恩（德语男声）", aliyunVoiceId: "Lenn" },
      { id: "sys_Emilien", title: "埃米尔安（法语男声）", aliyunVoiceId: "Emilien" },
      { id: "sys_Andre", title: "安德雷（磁性男声）", aliyunVoiceId: "Andre" }
    ];

    const getSafeCloneVoices = () => {
      return getCloneVoices().filter((item) => {
        const id = String(item?.id || "").trim();
        if (!id) return false;
        const promptWavPath = String(item?.promptWavPath || "").trim();
        const previewWavPath = String(item?.previewWavPath || "").trim();
        const source = String(item?.source || (id.startsWith("clone_") ? "local" : "")).trim() || "local";
        if (source === "cloud") return !!previewWavPath;
        if (!id.startsWith("clone_")) return false;
        return !!(promptWavPath || previewWavPath);
      });
    };
    const sanitizeStoredCloneVoices = () => {
      const raw = getCloneVoices();
      const next = getSafeCloneVoices();
      if (next.length !== raw.length) setCloneVoices(next);
      return next;
    };
    const ensureValidActiveVoice = () => {
      const currentId = String(getActiveVoiceId() || "").trim();
      const hasSystem = SYSTEM_VOICES.some((item) => item.id === currentId);
      const clones = sanitizeStoredCloneVoices();
      const hasClone = clones.some((item) => String(item?.id || "").trim() === currentId);
      if (currentId && (hasSystem || hasClone)) return currentId;
      const fallbackId = String(SYSTEM_VOICES[0]?.id || clones[0]?.id || "").trim();
      setActiveVoiceId(fallbackId);
      return fallbackId;
    };

    const isDirectVideoLink = (text) => {
      const t = (text || "").trim().toLowerCase();
      return /^https?:\/\/\S+\.(mp4|mov|webm)(\?\S*)?$/.test(t);
    };

    const extractDouyinVideoUrl = (text) => {
      const cleaned = String(text || "").replace(/[`'"]/g, " ");
      const patterns = [
        /https?:\/\/v\.douyin\.com\/[A-Za-z0-9_-]+\/?/i,
        /https?:\/\/(?:www\.)?douyin\.com\/video\/\d+/i
      ];
      for (const re of patterns) {
        const m = cleaned.match(re);
        if (m && m[0]) return m[0].replace(/[)\]}>,，。！!]+$/g, "");
      }
      return "";
    };

    const updateDouyinUrlHint = () => {
      const v = extractInput.value.trim();
      const url = extractDouyinVideoUrl(v);
      if (url) {
        extractDouyinUrlHint.textContent = url;
        extractDouyinUrlHint.style.color = "var(--text)";
      } else {
        extractDouyinUrlHint.textContent = "未识别到抖音链接";
        extractDouyinUrlHint.style.color = "var(--muted)";
      }
    };

    const extractFirstSentence = (text) => {
      const t = (text || "").trim();
      if (!t) return "";
      const normalized = t.replace(/\s+/g, " ").replace(/[\r\n]+/g, "\n");
      const parts = normalized.split(/([。！？.!?\n])/).filter(Boolean);
      const first = parts.slice(0, 2).join("").trim();
      if (!first) return normalized.slice(0, 30);
      if (first.length <= 30) return first;
      return first.slice(0, 30);
    };

    const pickLastParagraph = (text) => {
      const t = (text || "").trim();
      if (!t) return "";
      const paras = t.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);
      return paras[paras.length - 1] || "";
    };

    const sanitizeText = (text) => {
      let t = (text || "")
        .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, "")
        .replace(/[★☆✅✔️❌⭕️🔥💥✨🎯🎉🧠🤖]+/g, "")
        .replace(/[^\u4e00-\u9fa5A-Za-z0-9，。！？；：、,.!?;:\n\r \-（）()《》【】“”"'%/]/g, "");
      t = t.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n");
      return t.trim();
    };

    const removeForbidden = (text) => {
      const forbidden = [
        "原文",
        "作者",
        "文章",
        "滚吧",
        "找爸爸去",
        "废物",
        "傻子",
        "垃圾",
        "蠢蛋",
        "这波操作",
        "666"
      ];
      let t = text || "";
      forbidden.forEach((w) => {
        t = t.replaceAll(w, "");
      });
      return t;
    };

    const anonymizeIdentity = (text) => {
      let t = text || "";
      t = t.replace(/(微信|VX|v信|V信|公众号|抖音号|快手号|小红书号|视频号)[：: ]*\S+/g, "");
      t = t.replace(/(手机号|电话|联系方式)[：: ]*\d[\d -]{5,}/g, "");
      return t.trim();
    };

    const rewriteByPrompt = (content, count) => {
      const raw = sanitizeText(content);
      const first = extractFirstSentence(raw);
      const lastPara = anonymizeIdentity(pickLastParagraph(raw));

      let middle = raw;
      if (first) middle = middle.replace(first, "").trim();
      if (lastPara) middle = middle.replace(lastPara, "").trim();

      const synonymRules = [
        [/(其实|实际上)/g, "说白了"],
        [/(很多人|不少人)/g, "太多人"],
        [/(你是不是|你有没)/g, "你是不是也"],
        [/(立刻|马上)/g, "当场"],
        [/(一定要|必须)/g, "真得"],
        [/(不要|别再)/g, "千万别"],
        [/(所以)/g, "于是"],
        [/(然后)/g, "接着"]
      ];

      let body = middle
        .split(/\n+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .join("\n");

      synonymRules.forEach(([re, rep]) => {
        body = body.replace(re, rep);
      });

      let out = [first, body, lastPara].filter(Boolean).join("\n\n");
      out = removeForbidden(out);
      out = sanitizeText(out);

      const target = Number.isFinite(count) ? count : 300;
      const compactLen = (s) => (s || "").replace(/\s+/g, "").length;
      const padFrom = (src) =>
        (src || "")
          .split(/([。！？.!?])/)
          .filter(Boolean)
          .join("")
          .trim();

      const bodyPad = padFrom(body);
      let safety = 0;
      while (compactLen(out) < target && bodyPad && safety < 6) {
        out = `${out}\n${bodyPad}`;
        safety += 1;
        out = sanitizeText(out);
      }

      if (compactLen(out) > target) {
        const noSpace = out.replace(/\s+/g, "");
        const cut = noSpace.slice(0, target);
        out = cut;
      }

      return out;
    };

    const rewritePromptTemplate = `请按照规则完成文本仿写：
1. 开头：沿用原文第一句，该句超30字则在不改变原意前提下截断，整体不超30字。
2. 正文：完整保留全部行为动作，对原文语句做同义替换、角度转换、句式重组，保证内容连贯完整。
3. 结尾：可直接使用原文末尾内容，出现身份信息需做删除或泛化处理。
4. 字数：全文严格控制为{{count}}字。
5. 格式：不得添加表情、特殊符号，无额外前言、说明。
6. 风格：口语接地气，长短句搭配，情感表达饱满。
7. 禁用词汇：原文、作者、文章、滚吧、找爸爸去、废物、傻子、垃圾、蠢蛋、这波操作、666及各类极端、违法词汇，全程不得使用。`;

    const getCompactLen = (s) => (String(s || "").replace(/\s+/g, "").length);

    const DEFAULT_IPBRAIN_TITLE_PROMPT = `参考以下标题，帮我生成5个新的标题。 
 
 要求： 
 1. 保持相似的主题和风格 
 2. 标题简洁有力，吸引眼球 
 3. 不要添加表情符号和#标签 
 4. 每个标题独立成行 
 
 请直接输出5个新标题，不要编号和额外说明。`;

    const DEFAULT_IPBRAIN_SPEECH_PROMPT = `你是一个视频口播专家，擅长根据用户给的主题和关键词生成高质量的口播稿件。 
 请根据以下要求生成口播稿件： 
 
 1. 主题：${"${TITLE}"} 
 2. 字数：大约${"${COUNT}"}字 
 
 请确保稿件内容连贯、有吸引力，并且符合口播的风格。 
 请直接输出生成的口播稿件，无需任何额外说明文字。 
 不要带任何表情和符号。 
 禁止输出的词："原文""作者""文章"等词，攻击性强、侮辱性强的词（滚吧、找爸爸去、废物）、骂人的词（傻子、垃圾、蠢蛋），ai常用词（如"这波操作"、"666"），极限词、违反法律的词汇）`;

    const DEFAULT_HOTCOPY_PROMPT_TEMPLATE = `你是一个爆款短视频文案专家，擅长创作高播放量、高互动的短视频口播文案。 
请根据以下信息输出 3 个不同方向的爆款短视频文案方案。 
【视频类型】${"${videoType}"} 
【文案类型】${"${copyType}"} 
【行业+人设】${"${persona}"}            （可选） 
【产品/业务】${"${product}"}             （可选） 
【卖点+价格】${"${sellingPointAndPrice}"}（可选） 
【其他要求】${"${otherRequirements}"}     （可选） 
 
要求： 
1. 开头3秒必须有强吸引力的钩子，一开口就能留住用户 
2. 内容贴合「${"${copyType}"}」风格特点 
3. 语言自然口语化，适合短视频口播 
4. 结尾要有引导互动的话术（关注、点赞、评论、收藏） 
5. 不使用表情符号和特殊符号 
6. 字数控制在${"${count}"}字左右 
7. 3 个方案要明显区分角度，不要只改几个词 
8. 只返回 JSON，格式必须是 {"options":["方案1","方案2","方案3"]}，不要输出 markdown，不要补充解释`;

    const DEFAULT_META_PROMPT = `你是短视频标题与标签专家。请基于提供的口播文案，生成一个标题和3-4个标签，输出的语言要完全是我们文案的语言格式 
 - 标题不超过15个字，简洁有吸引力，不加引号，不含表情或图标字符。 
 - 标签为2-6个字的中文短词，不含#、空格和表情；以主题词为主，避免冗长句。 
 - 然后从文案里筛选出优秀的的词汇，必须是文案里包含的一字不差的，按照以下分类 
   * 重点词/成语词：文案中的核心词汇、成语、重要概念。 
   * 描述词：文案中用于描述事物特征、状态的优秀词汇。 
   * 行动词：文案中表示动作、行为的优秀词汇。 
   * 情感词：文案中表达情感、情绪的优秀词汇。 
 
 -- 直接输出纯JSON格式，如果没有合适的词，[]格式里面可以留空，不要生凑，不要一个字的词，不要使用markdown代码块（不要用），不要附加任何说明文字。 
 
 - 输出格式为： 
 { 
   "title": "...", 
   "tags": ["...", "...", "...", "..."], 
   "keywords": { 
     "重点词/成语词": ["...", "..."], 
     "描述词": ["..."], 
     "行动词": ["..."], 
     "情感词": ["...",] 
   } 
 }`;

    const META_KW_CATS = ["重点词/成语词", "描述词", "行动词", "情感词"];
    let metaKwActiveCat = META_KW_CATS[0];
    let metaKwMap = Object.fromEntries(META_KW_CATS.map((k) => [k, []]));
    let metaGenerating = false;
    let metaTaskId = "";
    const HOME_META_KW_KEY = "ipfactory.home.meta.kwMap.v1";
    const emitHomeMetaChanged = () => {
      try {
        window.dispatchEvent(
          new CustomEvent("ipfactory:homeKwChanged", {
            detail: {
              title: String(metaTitle?.value || "").trim(),
              tags: String(metaTags?.value || "").trim(),
              kwMap: metaKwMap || {}
            }
          })
        );
      } catch {}
    };
    const persistMetaKwMap = () => {
      try {
        localStorage.setItem(HOME_META_KW_KEY, JSON.stringify(metaKwMap || {}, null, 2));
      } catch {}
      emitHomeMetaChanged();
    };

    const parseHumanList = (text) => {
      const raw = String(text || "");
      const parts = raw
        .split(/[\n\r,，、;；]+/g)
        .map((x) => String(x || "").trim())
        .filter(Boolean);
      const out = [];
      for (const p of parts) {
        if (!out.includes(p)) out.push(p);
      }
      return out;
    };

    const renderMetaKwCount = () => {
      if (!metaKwCount) return;
      const total = META_KW_CATS.reduce((n, k) => n + (Array.isArray(metaKwMap?.[k]) ? metaKwMap[k].length : 0), 0);
      metaKwCount.textContent = `已添加 ${total} 个关键词`;
    };

    const renderMetaKwText = () => {
      if (!metaKwText) return;
      const list = Array.isArray(metaKwMap?.[metaKwActiveCat]) ? metaKwMap[metaKwActiveCat] : [];
      metaKwText.value = list.join("\n");
      renderMetaKwCount();
    };

    const setMetaKwActiveCat = (cat) => {
      const next = META_KW_CATS.includes(cat) ? cat : META_KW_CATS[0];
      metaKwActiveCat = next;
      Array.from(metaKwTabs?.querySelectorAll?.("[data-kw-cat]") || []).forEach((b) => {
        b.classList.toggle("is-active", b.getAttribute("data-kw-cat") === next);
      });
      renderMetaKwText();
    };

    const updateMetaBtnState = () => {
      if (!btnGenMeta) return;
      const text = String(copyEditContent?.value || "").trim();
      const ready = Boolean(text) && text !== "智能改写中...";
      btnGenMeta.disabled = !ready;
      btnGenMeta.textContent = metaGenerating ? "停止生成标题｜标签｜关键词" : "生成标题｜标签｜关键词";
      btnGenMeta.title = metaGenerating ? "再次点击可停止当前生成" : "";
    };

    const IPBRAIN_LEARNED_KEY = "ipfactory.ipbrain.learned";
    let ipbrainSelectedUrl = "";
    let ipbrainCollecting = false;
    let ipbrainLearnedCache = [];
    let ipbrainActiveKey = "";
    let ipbrainActiveTopic = "";
    let ipStudyTab = "video";
    let hotcopyGenerating = false;
    let hotcopyTaskId = "";
    let hotcopySelectedIndex = -1;
    let hotcopyLatestOptions = [];
    let hotcopyLastRaw = "";
    const updateHotcopyBtnState = () => {
      if (!btnGenHotcopy) return;
      btnGenHotcopy.disabled = false;
      btnGenHotcopy.textContent = hotcopyGenerating ? "停止生成爆款文案" : "生成爆款文案";
      btnGenHotcopy.title = hotcopyGenerating ? "再次点击可停止当前生成" : "";
    };

    const setIpStudyTab = (tab) => {
      ipStudyTab = String(tab || "video") || "video";
      if (!copyWordCount) return;
      if (ipStudyTab === "ip") {
        copyWordCount.disabled = false;
        if (!String(copyWordCount.value || "").trim()) copyWordCount.value = "300";
      } else {
        copyWordCount.disabled = true;
        const n = getCompactLen(copyEditContent?.value || "");
        copyWordCount.value = n ? String(n) : "300";
      }
    };

    const readIpBrainLearned = () => {
      try {
        const raw = localStorage.getItem(IPBRAIN_LEARNED_KEY);
        const list = JSON.parse(raw || "[]");
        return Array.isArray(list) ? list : [];
      } catch {
        return [];
      }
    };

    const writeIpBrainLearned = (list) => {
      try {
        localStorage.setItem(IPBRAIN_LEARNED_KEY, JSON.stringify(Array.isArray(list) ? list : [], null, 2));
      } catch {}
    };

    const extractDouyinLinks = (text) => {
      const s = String(text || "");
      const patterns = [
        /https?:\/\/v\.douyin\.com\/[A-Za-z0-9]+\/?/gi,
        /https?:\/\/(?:www\.)?douyin\.com\/video\/\d+[^\s]*/gi,
        /https?:\/\/(?:www\.)?iesdouyin\.com\/share\/video\/\d+[^\s]*/gi,
        /https?:\/\/(?:www\.)?douyin\.com\/user\/[A-Za-z0-9_\-]+[^\s]*/gi,
        /https?:\/\/(?:www\.)?iesdouyin\.com\/share\/user\/\d+[^\s]*/gi
      ];
      const found = [];
      for (const re of patterns) {
        const ms = s.match(re) || [];
        ms.forEach((u) => found.push(u.replace(/[)\]}>,，。！!]+$/g, "")));
      }
      const any = s.match(/https?:\/\/[^\s]+/gi) || [];
      any
        .filter((u) => /douyin\.com|iesdouyin\.com/i.test(u))
        .forEach((u) => found.push(u.replace(/[)\]}>,，。！!]+$/g, "")));
      const uniq = [];
      for (const u of found) {
        const x = String(u || "").trim();
        if (!x) continue;
        if (!uniq.includes(x)) uniq.push(x);
      }
      return uniq;
    };

    const setIpBrainSelectedUrl = (url) => {
      ipbrainSelectedUrl = String(url || "").trim();
      renderIpBrainDetected();
      updateIpBrainStartState();
    };

    const updateIpBrainCount = () => {
      if (!ipbrainCount) return;
      const n = Array.isArray(ipbrainLearnedCache) ? ipbrainLearnedCache.length : 0;
      ipbrainCount.textContent = `已学习 ${n}/5`;
      if (btnIpBrainAdd) btnIpBrainAdd.disabled = n >= 5;
    };

    const getIpBrainKey = (it) => {
      const sid = String(it?.secUid || "").trim();
      if (sid) return sid;
      const name = String(it?.accountName || "").trim();
      if (name) return `name:${name}`;
      return String(it?.id || "");
    };

    const getIpBrainItemByKey = (key) => {
      const k = String(key || "").trim();
      if (!k) return null;
      return (Array.isArray(ipbrainLearnedCache) ? ipbrainLearnedCache : []).find((x) => getIpBrainKey(x) === k) || null;
    };

    const ensureIpBrainActive = () => {
      const list = Array.isArray(ipbrainLearnedCache) ? ipbrainLearnedCache : [];
      if (!list.length) {
        ipbrainActiveKey = "";
        return;
      }
      const exists = ipbrainActiveKey && list.some((x) => getIpBrainKey(x) === ipbrainActiveKey);
      if (!exists) ipbrainActiveKey = getIpBrainKey(list[0]);
    };

    const renderIpBrainTopics = () => {
      if (!ipbrainTopics) return;
      ipbrainTopics.innerHTML = "";
      ensureIpBrainActive();
      const active = getIpBrainItemByKey(ipbrainActiveKey);
      if (ipbrainTopicEmpty) ipbrainTopicEmpty.hidden = Boolean(active);
      const name = String(active?.accountName || "").trim();
      if (ipbrainTopicTitle) ipbrainTopicTitle.textContent = name ? `选题库（${name}）` : "选题库";
      if (ipbrainTopicSub) ipbrainTopicSub.textContent = "展示所选账号最新 5 条标题（AI改写优先）";
      const list = active ? (Array.isArray(active?.aiTitles) && active.aiTitles.length ? active.aiTitles : active?.sourceTitles) : [];
      const titles = Array.isArray(list) ? list.map((x) => String(x || "").trim()).filter(Boolean).slice(0, 5) : [];
      titles.forEach((t) => {
        const div = document.createElement("div");
        div.className = `ipbrain-topic${t === ipbrainActiveTopic ? " is-active" : ""}`;
        div.setAttribute("data-topic", t);
        div.textContent = t;
        ipbrainTopics.appendChild(div);
      });
    };

    const renderIpBrainLearned = () => {
      if (!ipbrainAccounts) return;
      ipbrainAccounts.innerHTML = "";
      const list = Array.isArray(ipbrainLearnedCache) ? ipbrainLearnedCache : [];
      if (ipbrainEmpty) ipbrainEmpty.hidden = list.length > 0;
      updateIpBrainCount();
      ensureIpBrainActive();
      list.forEach((it) => {
        const key = getIpBrainKey(it);
        const name = String(it?.accountName || "抖音账号").trim() || "抖音账号";
        const row = document.createElement("div");
        row.className = `ipbrain-account${key === ipbrainActiveKey ? " is-active" : ""}`;
        row.setAttribute("data-key", key);

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "ipbrain-account-btn";
        btn.setAttribute("data-ipbrain-act", "select");
        btn.textContent = name;

        const del = document.createElement("button");
        del.type = "button";
        del.className = "ipbrain-account-del";
        del.setAttribute("data-ipbrain-act", "remove");
        del.textContent = "删除";

        row.appendChild(btn);
        row.appendChild(del);
        ipbrainAccounts.appendChild(row);
      });
      renderIpBrainTopics();
    };

    const renderIpBrainDetected = () => {
      if (!ipbrainDetected) return;
      ipbrainDetected.innerHTML = "";
      const links = extractDouyinLinks(ipbrainInput?.value || "");
      if (!links.length) {
        ipbrainDetected.textContent = "未识别到抖音链接";
        return;
      }
      if (!ipbrainSelectedUrl) ipbrainSelectedUrl = links[0];
      const wrap = document.createElement("div");
      wrap.className = "ipbrain-link-wrap";
      links.slice(0, 6).forEach((u) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = `pill mono ipbrain-link${u === ipbrainSelectedUrl ? " is-active" : ""}`;
        b.textContent = u;
        b.addEventListener("click", () => setIpBrainSelectedUrl(u));
        wrap.appendChild(b);
      });
      ipbrainDetected.appendChild(wrap);
    };

    const updateIpBrainStartState = () => {
      if (!ipbrainStart) return;
      const n = Array.isArray(ipbrainLearnedCache) ? ipbrainLearnedCache.length : 0;
      ipbrainStart.disabled = !ipbrainSelectedUrl || ipbrainCollecting || n >= 5;
    };

    const openIpBrain = () => {
      if (!ipbrainOverlay || !ipbrainModal) return;
      const n = Array.isArray(ipbrainLearnedCache) ? ipbrainLearnedCache.length : 0;
      if (n >= 5) {
        toast("已达到学习上限（5个）。");
        return;
      }
      ipbrainInput.value = "";
      ipbrainSelectedUrl = "";
      ipbrainCollecting = false;
      ipbrainOverlay.hidden = false;
      ipbrainModal.hidden = false;
      renderIpBrainDetected();
      updateIpBrainStartState();
      ipbrainInput.focus();
    };

    const closeIpBrain = () => {
      if (!ipbrainOverlay || !ipbrainModal) return;
      ipbrainOverlay.hidden = true;
      ipbrainModal.hidden = true;
    };

    const normalizeTitleLines = (text) => {
      const raw = String(text || "")
        .replace(/\r\n/g, "\n")
        .split("\n")
        .map((x) => String(x || "").trim())
        .filter(Boolean)
        .map((x) => x.replace(/^[\-\*\d]+[.)、\s]+/g, "").trim())
        .filter(Boolean);
      const out = [];
      for (const t of raw) {
        if (!out.includes(t)) out.push(t);
        if (out.length >= 5) break;
      }
      return out;
    };

    const openHotcopy = () => {
      if (!hotcopyOverlay || !hotcopyModal) return;
      hotcopyOverlay.hidden = false;
      hotcopyModal.hidden = false;
    };

    const closeHotcopy = ({ force = false } = {}) => {
      if (!hotcopyOverlay || !hotcopyModal) return;
      if (hotcopyGenerating && force !== true) return;
      hotcopyOverlay.hidden = true;
      hotcopyModal.hidden = true;
    };

    const setHotcopyGeneratingUI = (generating, message) => {
      if (hotcopyProgressText) hotcopyProgressText.textContent = message || "AI 正在创作中...";
      if (hotcopyProgress) hotcopyProgress.classList.remove("is-error");
      if (hotcopyProgress) hotcopyProgress.hidden = generating !== true ? true : false;
      if (hotcopyOptions) hotcopyOptions.hidden = generating === true ? true : false;
      if (hotcopyApply) hotcopyApply.disabled = generating === true || hotcopySelectedIndex < 0;
      if (hotcopyModalClose) hotcopyModalClose.disabled = generating === true;
      if (hotcopyClose) hotcopyClose.disabled = generating === true;
      updateHotcopyBtnState();
    };

    const setHotcopyErrorUI = (message) => {
      if (hotcopyProgressText) hotcopyProgressText.textContent = message || "生成失败，请查看运行日志。";
      if (hotcopyProgress) hotcopyProgress.hidden = false;
      if (hotcopyProgress) hotcopyProgress.classList.add("is-error");
      if (hotcopyOptions) hotcopyOptions.hidden = true;
      if (hotcopyApply) hotcopyApply.disabled = true;
      if (hotcopyModalClose) hotcopyModalClose.disabled = false;
      if (hotcopyClose) hotcopyClose.disabled = false;
      updateHotcopyBtnState();
    };

    const buildHotcopyPromptFromTemplate = (template, vars) => {
      const raw = String(template || "").replace(/\r\n/g, "\n").trim();
      const lines = raw.split("\n");
      const out = [];
      for (const lineRaw of lines) {
        const line = String(lineRaw || "");
        const needsPersona = line.includes("${persona}");
        const needsProduct = line.includes("${product}");
        const needsSell = line.includes("${sellingPointAndPrice}");
        const needsOther = line.includes("${otherRequirements}");
        if (needsPersona && !vars.persona) continue;
        if (needsProduct && !vars.product) continue;
        if (needsSell && !vars.sellingPointAndPrice) continue;
        if (needsOther && !vars.otherRequirements) continue;
        out.push(
          line
            .replaceAll("${videoType}", vars.videoType)
            .replaceAll("${copyType}", vars.copyType)
            .replaceAll("${persona}", vars.persona)
            .replaceAll("${product}", vars.product)
            .replaceAll("${sellingPointAndPrice}", vars.sellingPointAndPrice)
            .replaceAll("${otherRequirements}", vars.otherRequirements)
            .replaceAll("${count}", String(vars.count))
        );
      }
      const compact = [];
      for (const l of out) {
        if (!String(l || "").trim()) {
          if (compact.length && !String(compact[compact.length - 1] || "").trim()) continue;
          compact.push("");
          continue;
        }
        compact.push(l);
      }
      return compact.join("\n").trim();
    };

    const extractHotcopyOptionsFromText = (text) => {
      const raw = String(text || "").trim();
      if (!raw) return [];
      const cleaned = raw.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
      const obj = parseJsonLoose(cleaned) || parseJsonLoose(raw);
      const options = Array.isArray(obj?.options) ? obj.options.map((x) => String(x || "").trim()).filter(Boolean) : [];
      if (options.length) return options;

      const blocks = [];
      const re = /方案\s*([123一二三])[\s:：\-]*([\s\S]*?)(?=(?:\n\s*方案\s*[123一二三][\s:：\-]*)|$)/g;
      for (const m of cleaned.matchAll(re)) {
        const body = String(m?.[2] || "").trim();
        if (body) blocks.push(body);
      }
      if (blocks.length) return blocks;

      const paras = cleaned
        .split(/\n{2,}/g)
        .map((x) => String(x || "").trim())
        .filter(Boolean);
      if (paras.length >= 3) return paras.slice(0, 3);

      const lines = cleaned
        .split(/\n+/g)
        .map((x) => String(x || "").trim())
        .filter(Boolean);
      if (lines.length >= 3) return lines.slice(0, 3);
      return lines.length ? [lines.join("\n")] : [];
    };

    const renderHotcopyOptions = (options) => {
      if (!hotcopyOptions) return;
      hotcopyOptions.innerHTML = "";
      const list = Array.isArray(options) ? options : [];
      const wrap = document.createElement("div");
      wrap.className = "hotcopy-option-grid";
      list.slice(0, 3).forEach((text, idx) => {
        const card = document.createElement("button");
        card.type = "button";
        card.className = `hotcopy-option${idx === hotcopySelectedIndex ? " is-active" : ""}`;
        card.setAttribute("data-hotcopy-index", String(idx));
        const head = document.createElement("div");
        head.className = "hotcopy-option-head";
        const title = document.createElement("div");
        title.className = "hotcopy-option-title";
        title.textContent = `方案 ${idx + 1}`;
        const tip = document.createElement("div");
        tip.className = "pill";
        tip.textContent = idx === hotcopySelectedIndex ? "已选择" : "点击选择";
        head.appendChild(title);
        head.appendChild(tip);
        const body = document.createElement("div");
        body.className = "hotcopy-option-body mono";
        body.textContent = String(text || "").trim();
        card.appendChild(head);
        card.appendChild(body);
        wrap.appendChild(card);
      });
      hotcopyOptions.appendChild(wrap);
    };

    const updateCopyWordCount = () => {
      if (ipStudyTab !== "ip") {
        const n = getCompactLen(copyEditContent?.value || "");
        if (copyWordCount) copyWordCount.value = n ? String(n) : "300";
      }
      updateMetaBtnState();
    };
    const syncRecognizedCopyToCopyEditor = (text, { showToast = false, focus = false } = {}) => {
      const next = sanitizeText(text || "");
      if (!next) return false;
      copyEditContent.value = next;
      updateCopyWordCount();
      if (focus) {
        copyEditContent?.focus?.();
        copyEditContent?.scrollIntoView?.({ block: "center" });
      }
      if (showToast) toast("已同步到视频文案编辑。");
      return true;
    };

    const voiceOverlay = root.querySelector("#voice-modal-overlay");
    const voiceModal = root.querySelector("#voice-modal");
    const voiceModalClose = root.querySelector("#voice-modal-close");
    const voiceTabs = root.querySelector("#voice-tabs");
    const voiceSubtabs = root.querySelector("#voice-subtabs");
    const voiceList = root.querySelector("#voice-list");
    const btnRefreshVoices = root.querySelector("#btn-refresh-voices");
    const btnAddCloneVoice = root.querySelector("#btn-add-clone-voice");

    const cloneOverlay = root.querySelector("#clone-modal-overlay");
    const cloneModal = root.querySelector("#clone-modal");
    const cloneModalClose = root.querySelector("#clone-modal-close");
    const cloneCancel = root.querySelector("#clone-cancel");
    const cloneName = root.querySelector("#clone-name");
    const cloneMic = root.querySelector("#clone-mic");
    const cloneRecord = root.querySelector("#clone-record");
    const cloneStop = root.querySelector("#clone-stop");
    const clonePickFile = root.querySelector("#clone-pick-file");
    const clonePreview = root.querySelector("#clone-preview");
    const cloneAudioStatus = root.querySelector("#clone-audio-status");
    const cloneWave = root.querySelector("#clone-wave");
    const cloneModelSelect = root.querySelector("#clone-model-select");
    const cloneModelHint = root.querySelector("#clone-model-hint");
    const cloneRefText = root.querySelector("#clone-ref-text");
    const cloneCreate = root.querySelector("#clone-create");
    const cloneCancelGen = root.querySelector("#clone-cancel-gen");
    const cloneSave = root.querySelector("#clone-save");
    const cloneLogBox = root.querySelector("#clone-log-box");

    const btnAgentConfig = root.querySelector("#btn-agent-config");
    const agentOverlay = root.querySelector("#agent-modal-overlay");
    const agentModal = root.querySelector("#agent-modal");
    const agentModalClose = root.querySelector("#agent-modal-close");
    const agentCancel = root.querySelector("#agent-cancel");
    const agentSave = root.querySelector("#agent-save");
    const agentTabs = root.querySelector("#agent-tabs");
    const agentLlm = root.querySelector("#agent-llm");
    const agentVideoWeight = root.querySelector("#agent-videosync-weight");
    const agentVideoBatch = root.querySelector("#agent-videosync-batch");
    const agentVideoWeightType = root.querySelector("#agent-videosync-weight-type");
    const agentSystemPrompt = root.querySelector("#agent-system-prompt");
    const agentRewritePrompt = root.querySelector("#agent-rewrite-prompt");
    const agentLegalPrompt = root.querySelector("#agent-legal-prompt");
    const agentIpBrainTitlePrompt = root.querySelector("#agent-ipbrain-title-prompt");
    const agentIpBrainSpeechPrompt = root.querySelector("#agent-ipbrain-speech-prompt");
    const agentHotcopyPrompt = root.querySelector("#agent-hotcopy-prompt");
    const agentMetaPrompt = root.querySelector("#agent-meta-prompt");
    const agentSubEnable = root.querySelector("#agent-sub-enable");
    const agentSubPos = root.querySelector("#agent-sub-pos");
    const agentSubSize = root.querySelector("#agent-sub-size");
    const agentSubStyle = root.querySelector("#agent-sub-style");
    const agentRatio = root.querySelector("#agent-ratio");
    const agentFps = root.querySelector("#agent-fps");
    const agentLegal = root.querySelector("#agent-legal");
    const agentPipEnable = root.querySelector("#agent-pip-enable");
    const agentPipPos = root.querySelector("#agent-pip-pos");
    const agentPipScale = root.querySelector("#agent-pip-scale");
    const agentPipRadius = root.querySelector("#agent-pip-radius");

    const audioEmotion = root.querySelector("#audio-emotion");
    const audioLanguage = root.querySelector("#audio-language");
    const audioSpeed = root.querySelector("#audio-speed");
    const homeAsrModel = root.querySelector("#home-asr-model");
    const homeSubBgmAsrModel = root.querySelector("#home-subbgm-asr-model");
    const homeSubBgmAsrField = homeSubBgmAsrModel?.closest(".home-module-model-field") || null;
    const homeSubBgmAsrFieldLabel = homeSubBgmAsrField?.querySelector(".label") || null;
    const homeSubBgmAsrFieldPill = homeSubBgmAsrField?.querySelector(".pill") || null;
    const homeCopyLlm = root.querySelector("#home-copy-llm");
    if (homeSubBgmAsrFieldLabel) homeSubBgmAsrFieldLabel.textContent = "\u5b57\u5e55\u8bc6\u522b\u6a21\u578b";
    if (homeSubBgmAsrFieldPill) homeSubBgmAsrFieldPill.textContent = "\u652f\u6301\u5355\u72ec\u9009\u62e9\u672c\u5730\u6216\u4e91\u7aef\u6a21\u578b";
    if (homeSubBgmAsrModel?.options?.[0]) homeSubBgmAsrModel.options[0].textContent = "\u672c\u5730\u6a21\u578b\uff5c\u7cfb\u7edf\u9ed8\u8ba4 ASR";
    const homeMetaLlm = root.querySelector("#home-meta-llm");
    const homeRunModeSelect = root.querySelector("#home-run-mode");
    const homeRunModeTip = root.querySelector("#home-run-mode-tip");
    const homeTtsModel = root.querySelector("#home-tts-model");
    const homeVideosyncModel = root.querySelector("#home-videosync-model");
    const btnGenAudio = root.querySelector("#btn-gen-audio");
    const audioHistory = root.querySelector("#audio-history");
    const audioRefresh = root.querySelector("#audio-refresh");
    const audioPlayBtn = root.querySelector("#audio-play");
    const audioSeek = root.querySelector("#audio-seek");
    const audioTime = root.querySelector("#audio-time");
    const audioEl = root.querySelector("#audio-el");
    const audioLogBox = root.querySelector("#audio-log-box");
    const homeAvatarSelect = root.querySelector("#home-avatar-select");
    const homeVideoEmpty = root.querySelector("#home-video-empty");
    const homeVideoEl = root.querySelector("#home-video-el");
    const homeVideoGen = root.querySelector("#home-video-gen");
    const homeVideoGenSub = root.querySelector("#home-video-gen-sub");
    const btnGenTalking = root.querySelector("#btn-gen-talking");
    const homeSubAuto = root.querySelector("#home-sub-auto");
    const homeSubSmart = root.querySelector("#home-sub-smart");
    const homeSubTemplate = root.querySelector("#home-sub-template");
    const homeSubTemplatePicker = root.querySelector("#home-sub-template-picker");
    const homeSubTemplateName = root.querySelector("#home-sub-template-name");
    const homeSubTemplateSource = root.querySelector("#home-sub-template-source");
    const homeSubTemplateDesc = root.querySelector("#home-sub-template-desc");
    const homeSubTemplateManage = root.querySelector("#home-sub-template-manage");
    const homeSubPipEnable = root.querySelector("#home-sub-pip-enable");
    const homeSubPipPick = root.querySelector("#home-sub-pip-pick");
    const homeSubPipTip = root.querySelector("#home-sub-pip-tip");
    const homeBgmEnable = root.querySelector("#home-bgm-enable");
    const homeBgmSelect = root.querySelector("#home-bgm-select");
    const homeBgmPicked = root.querySelector("#home-bgm-picked");
    const homeSourceVolume = root.querySelector("#home-source-volume");
    const homeSourceVolumeText = root.querySelector("#home-source-volume-text");
    const homeSourceListen = root.querySelector("#home-source-listen");
    const homeBgmVolume = root.querySelector("#home-bgm-volume");
    const homeBgmVolumeText = root.querySelector("#home-bgm-volume-text");
    const homeBgmListen = root.querySelector("#home-bgm-listen");
    const btnAutoBgm = root.querySelector("#btn-auto-bgm");
    const homeSubBgmPreview = root.querySelector("#home-sub-bgm-preview");
    const homeSubBgmEmpty = root.querySelector("#home-sub-bgm-empty");
    const homeSubBgmVideo = root.querySelector("#home-sub-bgm-video");
    const homeSubBgmCompareBtn = root.querySelector("#home-sub-bgm-compare-btn");
    const homeEditAutoCut = root.querySelector("#home-edit-auto-cut");
    const homeEditGreenToggle = root.querySelector("#home-edit-green-toggle");
    const homeEditPreviewBox = root.querySelector("#home-edit-preview-box");
    const homeEditPreviewEmpty = root.querySelector("#home-edit-preview-empty");
    const homeEditPreviewVideo = root.querySelector("#home-edit-preview-video");
    const btnStartEdit = root.querySelector("#btn-start-edit");
    const btnCoverAuto = root.querySelector("#btn-cover-auto");
    const homeCoverTemplatePicker = root.querySelector("#home-cover-template-picker");
    const homeCoverTemplateName = root.querySelector("#home-cover-template-name");
    const homeCoverTemplateSource = root.querySelector("#home-cover-template-source");
    const homeCoverPicked = root.querySelector("#home-cover-picked");
    const homeCoverPreview = root.querySelector("#home-cover-preview");
    const homeCoverEmpty = root.querySelector("#home-cover-empty");
    const homeCoverImg = root.querySelector("#home-cover-img");
    const homePubPlatform = root.querySelector("#home-pub-platform");
    const homePubManageAccounts = root.querySelector("#home-pub-manage-accounts");
    const homePubAccount = root.querySelector("#home-pub-account");
    const homePubAddAccount = root.querySelector("#home-pub-add-account");
    const homePubClearAccounts = root.querySelector("#home-pub-clear-accounts");
    const homePubTargetList = root.querySelector("#home-pub-target-list");
    const homePubSource = root.querySelector("#home-pub-source");
    const homePubTitle = root.querySelector("#home-pub-title");
    const homePubTags = root.querySelector("#home-pub-tags");
    const homePubModeTabs = root.querySelector("#home-pub-mode-tabs");
    const homePubToCenter = root.querySelector("#home-pub-to-center");
    const homePubCreate = root.querySelector("#home-pub-create");
    const homeVideoCompareOverlay = root.querySelector("#home-video-compare-overlay");
    const homeVideoCompareModal = root.querySelector("#home-video-compare-modal");
    const homeVideoCompareClose = root.querySelector("#home-video-compare-close");
    const homeVideoCompareDone = root.querySelector("#home-video-compare-done");
    const homeVideoComparePlay = root.querySelector("#home-video-compare-play");
    const homeVideoComparePause = root.querySelector("#home-video-compare-pause");
    const homeVideoCompareReset = root.querySelector("#home-video-compare-reset");
    const homeVideoCompareBasePath = root.querySelector("#home-video-compare-base-path");
    const homeVideoCompareBaseOpen = root.querySelector("#home-video-compare-base-open");
    const homeVideoCompareOutPath = root.querySelector("#home-video-compare-out-path");
    const homeVideoCompareOutOpen = root.querySelector("#home-video-compare-out-open");
    const homeVideoCompareBaseEmpty = root.querySelector("#home-video-compare-base-empty");
    const homeVideoCompareOutEmpty = root.querySelector("#home-video-compare-out-empty");
    const homeVideoCompareBaseVideo = root.querySelector("#home-video-compare-base-video");
    const homeVideoCompareOutVideo = root.querySelector("#home-video-compare-out-video");
    const coverTplModalOverlay = root.querySelector("#cover-tpl-modal-overlay");
    const coverTplModal = root.querySelector("#cover-tpl-modal");
    const coverTplModalClose = root.querySelector("#cover-tpl-modal-close");
    const coverTplManage = root.querySelector("#cover-tpl-manage");
    const coverTplCurrent = root.querySelector("#cover-tpl-current");
    const coverTplGrid = root.querySelector("#cover-tpl-grid");
    const coverTplCancel = root.querySelector("#cover-tpl-cancel");
    const coverTplOk = root.querySelector("#cover-tpl-ok");
    const subTplModalOverlay = root.querySelector("#sub-tpl-modal-overlay");
    const subTplModal = root.querySelector("#sub-tpl-modal");
    const subTplModalClose = root.querySelector("#sub-tpl-modal-close");
    const subTplManage = root.querySelector("#sub-tpl-manage");
    const subTplCurrent = root.querySelector("#sub-tpl-current");
    const subTplGrid = root.querySelector("#sub-tpl-grid");
    const subTplCancel = root.querySelector("#sub-tpl-cancel");
    const subTplOk = root.querySelector("#sub-tpl-ok");

    let voiceTab = "system";
    let voiceSubtab = "putonghua";
    let previewAudio = null;
    let previewingVoiceItemId = "";
    let previewingCloneReference = false;
    let micStream = null;
    let mediaRecorder = null;
    let recordChunks = [];
    let recordedBlob = null;
    let pickedPromptFilePath = "";
    let pendingCloneVoice = null;
    let recordingStartAt = 0;
    let recordingTimer = null;
    let waveAudioCtx = null;
    let waveAnalyser = null;
    let waveSrc = null;
    let waveRaf = 0;
    let currentCloneTaskId = "";
    let homeCloneModelId = "";
    let currentAudioTaskId = "";
    let audioHistoryCache = [];
    let homeAvatarCache = [];
    let homeSelectedAudioPath = "";
    let homeSelectedAvatarVideoPath = "";
    let homeTalkingVideoPath = "";
    let homeEditedVideoPath = "";
    let homeSourcePreview = null;
    let homeSourcePreviewCtx = null;
    let homeSourcePreviewGain = null;
    let homeBgmPreview = null;
    let homeSubBgmTaskId = "";
    let homeSubBgmStopping = false;
    let homeSubBgmLastLoggedPct = -1;
    let homeSubBgmLastLoggedMsg = "";
    let homeSubBgmOutPath = "";
    let homeSubPipAssets = [];
    let homeSubPipBindings = {};
    let homeSubPipSegments = [];
    let homeSubPipSegmentsVideoPath = "";
    let homeCoverTemplateId = "system";
    let homeCoverOutPath = "";
    let homeCoverTaskId = "";
    let homeCoverGenerating = false;
    let homeCoverStopping = false;
    let homeVideoTaskId = "";
    let homeVideoGenerating = false;
    let homeVideoStopping = false;
    let homeEditTaskId = "";
    let homeEditGenerating = false;
    let homeEditStopping = false;
    let homePublishRunning = false;
    let homePublishCanceling = false;
    let homePublishRequestId = "";
    let homePublishStopRequested = false;
    let homeVideoCompareSyncing = false;
    let agentActiveTab = "model";
    let homeMediaBundleCatalog = [];
    let homePublishAccountsCache = [];
    let homePublishTargets = [];

    const stopPreviewAudio = () => {
      try {
        previewAudio?.pause?.();
      } catch {}
      previewAudio = null;
      previewingVoiceItemId = "";
      previewingCloneReference = false;
      if (clonePreview) clonePreview.textContent = "试听";
      if (voiceModal?.hidden === false) renderVoiceModal();
    };

    const toFileUrl = (p) => {
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
    };

    const HOME_MEDIA_KEYS = {
      ASR: "asr",
      SUB_BGM_ASR: "subBgmAsr",
      TTS: "tts",
      VideoSync: "videoSync"
    };
    const HOME_RUN_MODE_OPTIONS = {
      custom: "自定义模型运行",
      cloud: "纯云端模型运行",
      local: "纯本地模型运行"
    };
    const HOME_LLM_KEYS = {
      copyEdit: "copyEdit",
      meta: "meta"
    };
    const normalizeHomeRunMode = (value) => {
      const mode = String(value || "").trim().toLowerCase();
      return mode === "cloud" || mode === "local" ? mode : "custom";
    };
    let homeRunMode = normalizeHomeRunMode(getHomeRunMode());
    const readHomeMediaSelectionMap = () => {
      const raw = getHomeMediaSelections();
      return raw && typeof raw === "object" ? raw : {};
    };
    const readHomeLlmSelectionMap = () => {
      const raw = getHomeLlmSelections();
      return raw && typeof raw === "object" ? raw : {};
    };
    const writeHomeMediaSelectionMap = (patch = {}) => {
      const next = { ...readHomeMediaSelectionMap(), ...(patch && typeof patch === "object" ? patch : {}) };
      setHomeMediaSelections(next);
      return next;
    };
    const writeHomeLlmSelectionMap = (patch = {}) => {
      const next = { ...readHomeLlmSelectionMap(), ...(patch && typeof patch === "object" ? patch : {}) };
      setHomeLlmSelections(next);
      return next;
    };
    const writeHomeRunModeValue = (value) => {
      homeRunMode = normalizeHomeRunMode(value);
      setHomeRunMode(homeRunMode);
      return homeRunMode;
    };
    const updateHomeRunModeUi = () => {
      if (homeRunModeSelect) homeRunModeSelect.value = homeRunMode;
      if (!homeRunModeTip) return;
      if (homeRunMode === "cloud") {
        homeRunModeTip.textContent = "当前只显示云端模型，并会为每个模块自动选择一个可用云端模型。";
        return;
      }
      if (homeRunMode === "local") {
        homeRunModeTip.textContent = "当前只显示本地模型，并会为每个模块自动选择一个可用本地模型。";
        return;
      }
      homeRunModeTip.textContent = "默认自定义，可以自由切换本地和云端模型。";
    };
    const escapeAttr = (value) =>
      String(value || "")
        .replaceAll("&", "&amp;")
        .replaceAll('"', "&quot;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
    const getPreferredPublicCloudLlmId = () => {
      const cloudLlms = getCloudLlms().filter((item) => item?.enabled !== false);
      return String(cloudLlms.find((item) => item?.isPublicShared === true)?.id || cloudLlms[0]?.id || "").trim();
    };
    const buildHomeCloudLlmLabel = (item) => {
      const name = String(item?.name || item?.catalogModelLabel || item?.model || item?.id || "未命名模型").trim();
      const provider = String(item?.providerLabel || item?.providerId || "云端").trim();
      const suffix = item?.isPublicShared === true ? "公用云端" : provider;
      return `${name}｜${suffix}`;
    };
    const normalizeCloudMediaTag = (value) => String(value || "").trim().toLowerCase().replace(/\s+/g, "");
    const HOME_CLOUD_MEDIA_RULES = {
      ASR: {
        sceneKey: "asr",
        moduleKeys: ["asr", "speech", "speechtotext", "audiototext", "videototext"],
        abilityKeywords: ["语音识别", "音频识别", "视频识别", "语音转文字", "音频转文字", "视频转文字", "speech", "audio", "video"]
      },
      VideoSync: {
        sceneKey: "videosync",
        moduleKeys: ["videosync", "videosyncgenerate", "talkingvideo", "avatarvideo", "lipsync", "lip-sync"],
        abilityKeywords: ["数字人生成", "口播视频", "视频口播", "口型同步", "视频合成", "数字人", "lip sync", "talking video"]
      }
    };
    const matchCloudMediaModel = (item, type) => {
      const rule = HOME_CLOUD_MEDIA_RULES[type];
      if (!rule || item?.enabled === false) return false;
      const moduleKeys = Array.isArray(item?.moduleKeys) ? item.moduleKeys : [];
      const abilities = Array.isArray(item?.abilities) ? item.abilities : [];
      const textBag = [
        ...moduleKeys,
        ...abilities,
        item?.summary,
        item?.name,
        item?.catalogModelLabel,
        item?.badge
      ]
        .map((x) => normalizeCloudMediaTag(x))
        .filter(Boolean);
      const hasModuleKey = textBag.some((value) => rule.moduleKeys.some((keyword) => value.includes(normalizeCloudMediaTag(keyword))));
      const hasAbility = textBag.some((value) => rule.abilityKeywords.some((keyword) => value.includes(normalizeCloudMediaTag(keyword))));
      return hasModuleKey || hasAbility;
    };
    const buildCloudMediaOption = (item, type) => {
      if (!matchCloudMediaModel(item, type)) return null;
      const label = String(item?.name || item?.catalogModelLabel || item?.model || "云端模型").trim() || "云端模型";
      const providerLabel = String(item?.providerLabel || item?.providerId || "云端平台").trim() || "云端平台";
      return {
        id: `cloud:${type}:${String(item?.id || `${item?.providerId || ""}:${item?.model || ""}`)}`,
        type,
        label,
        sourceLabel: item?.isPublicShared === true ? `公用云端｜${providerLabel}` : providerLabel,
        pendingKey: !(item?.endpoint && item?.model),
        modelChoice: {
          source: "cloud",
          sceneKey: HOME_CLOUD_MEDIA_RULES[type]?.sceneKey || String(type || "").toLowerCase(),
          type,
          providerId: String(item?.providerId || "").trim(),
          providerLabel,
          endpoint: String(item?.endpoint || "").trim(),
          apiKey: String(item?.apiKey || ""),
          model: String(item?.model || "").trim(),
          modelId: String(item?.model || "").trim(),
          label,
          abilities: Array.isArray(item?.abilities) ? item.abilities : [],
          moduleKeys: Array.isArray(item?.moduleKeys) ? item.moduleKeys : [],
          summary: String(item?.summary || "").trim(),
          isPublicShared: item?.isPublicShared === true
        }
      };
    };
    const buildCloudAsrOptions = () => {
      const suffix = "阿里云百炼";
      return [
        {
          id: "cloud:ASR:aliyun-fun-asr",
          type: "ASR",
          label: "fun-asr",
          sourceLabel: suffix,
          pendingKey: false,
          modelChoice: {
            source: "cloud",
            sceneKey: "asr",
            type: "ASR",
            providerId: "aliyun-bailian",
            providerLabel: "阿里云百炼",
            endpoint: "https://dashscope.aliyuncs.com/api/v1/services/audio/asr/transcription",
            model: "fun-asr",
            modelId: "fun-asr",
            label: "fun-asr",
            apiStyle: "aliyun-funasr-filetrans",
            abilities: ["语音识别", "音频识别", "字幕生成", "句级时间戳", "词级时间戳"],
            moduleKeys: ["asr", "speech", "speechtotext", "subtitle"]
          }
        },
        {
          id: "cloud:ASR:aliyun-fun-asr-flash-2026-06-15",
          type: "ASR",
          label: "fun-asr-flash-2026-06-15",
          sourceLabel: suffix,
          pendingKey: false,
          modelChoice: {
            source: "cloud",
            sceneKey: "asr",
            type: "ASR",
            providerId: "aliyun-bailian",
            providerLabel: "阿里云百炼",
            endpoint: "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation",
            model: "fun-asr-flash-2026-06-15",
            modelId: "fun-asr-flash-2026-06-15",
            label: "fun-asr-flash-2026-06-15",
            apiStyle: "aliyun-funasr-flash-sync",
            abilities: ["语音识别", "音频识别", "字幕生成", "极速识别"],
            moduleKeys: ["asr", "speech", "speechtotext", "subtitle"]
          }
        },
        {
          id: "cloud:ASR:aliyun-fun-asr-realtime-2026-02-28",
          type: "ASR",
          label: "fun-asr-realtime-2026-02-28",
          sourceLabel: suffix,
          pendingKey: false,
          modelChoice: {
            source: "cloud",
            sceneKey: "asr",
            type: "ASR",
            providerId: "aliyun-bailian",
            providerLabel: "阿里云百炼",
            endpoint: "wss://dashscope.aliyuncs.com/api-ws/v1/inference/",
            model: "fun-asr-realtime-2026-02-28",
            modelId: "fun-asr-realtime-2026-02-28",
            label: "fun-asr-realtime-2026-02-28",
            apiStyle: "aliyun-funasr-realtime",
            abilities: ["语音识别", "音频识别", "字幕生成", "实时识别", "句级时间戳", "词级时间戳"],
            moduleKeys: ["asr", "speech", "speechtotext", "subtitle"]
          }
        }
      ];
    };
    const createAutoMediaOption = (type) => ({
      id: `local:auto:${type}`,
      type,
      label:
        type === "ASR"
          ? "系统默认 ASR"
          : type === "TTS"
            ? "系统默认 TTS"
            : "系统默认数字人模型",
      sourceLabel: "系统默认",
      modelChoice: {
        source: "local",
        sceneKey: String(type || "").toLowerCase(),
        type,
        useAutoPick: true,
        label:
          type === "ASR"
            ? "系统默认 ASR"
            : type === "TTS"
              ? "系统默认 TTS"
              : "系统默认数字人模型"
      }
    });
    const buildLocalMediaOption = (item, type) => {
      const bundleDir = String(item?.bundleDir || item?.path || "").trim();
      const configPath = String(item?.configPath || "").trim();
      const name = String(item?.name || item?.title || "").trim() || bundleDir || configPath || `本地${type}`;
      if (!bundleDir && !configPath) return null;
      return {
        id: `local:${type}:${bundleDir || configPath}`,
        type,
        label: name,
        sourceLabel: String(item?.kind || "").trim() === "bundle" ? "模型菜单已导入" : "项目模型目录",
        modelChoice: {
          source: "local",
          sceneKey: String(type || "").toLowerCase(),
          type,
          bundleDir,
          configPath,
          label: name
        }
      };
    };
    const buildCloudTtsOptions = () => {
      const suffix = "阿里云百炼";
      return [
        {
          id: "cloud:TTS:aliyun-cosyvoice-plus",
          type: "TTS",
          label: "CosyVoice v3.5 Plus",
          sourceLabel: suffix,
          pendingKey: false,
          modelChoice: {
            source: "cloud",
            sceneKey: "tts",
            type: "TTS",
            providerId: "aliyun-bailian",
            providerLabel: "阿里云百炼",
            endpoint: "https://dashscope.aliyuncs.com/api/v1/services/audio/tts/SpeechSynthesizer",
            model: "cosyvoice-v3.5-plus",
            modelId: "cosyvoice-v3.5-plus",
            label: "CosyVoice v3.5 Plus"
          }
        },
        {
          id: "cloud:TTS:aliyun-cosyvoice-flash",
          type: "TTS",
          label: "CosyVoice v3.5 Flash",
          sourceLabel: suffix,
          pendingKey: false,
          modelChoice: {
            source: "cloud",
            sceneKey: "tts",
            type: "TTS",
            providerId: "aliyun-bailian",
            providerLabel: "阿里云百炼",
            endpoint: "https://dashscope.aliyuncs.com/api/v1/services/audio/tts/SpeechSynthesizer",
            model: "cosyvoice-v3.5-flash",
            modelId: "cosyvoice-v3.5-flash",
            label: "CosyVoice v3.5 Flash"
          }
        }
      ];
    };
    const buildCloudVideoSyncOptions = () => {
      const suffix = "阿里云百炼";
      return [
        {
          id: "cloud:VideoSync:aliyun-videoretalk",
          type: "VideoSync",
          label: "VideoRetalk",
          sourceLabel: suffix,
          pendingKey: false,
          modelChoice: {
            source: "cloud",
            sceneKey: "videosync",
            type: "VideoSync",
            providerId: "aliyun-bailian",
            providerLabel: "阿里云百炼",
            endpoint: "https://dashscope.aliyuncs.com/api/v1/services/aigc/image2video/video-synthesis/",
            model: "videoretalk",
            modelId: "videoretalk",
            label: "VideoRetalk",
            videoExtension: true,
            parameters: {
              video_extension: true
            },
            abilities: ["数字人生成", "口型同步", "视频口播", "视频口型替换"],
            moduleKeys: ["videosync", "talkingvideo", "lipsync"]
          }
        }
      ];
    };
    const loadHomeMediaBundleCatalog = async () => {
      const localModels = getModels()
        .map((item) => {
          const type = String(item?.type || "").trim();
          if (!type || !["ASR", "TTS", "VideoSync"].includes(type)) return null;
          return { ...item, type };
        })
        .filter(Boolean);
      let scanned = [];
      try {
        const res = await window.api?.models?.scanProjectBundles?.();
        scanned = Array.isArray(res?.bundles) ? res.bundles : [];
      } catch {}
      const merged = [];
      const seen = new Set();
      [...localModels, ...scanned].forEach((item) => {
        const type = String(item?.type || "").trim();
        const key = `${type}::${String(item?.bundleDir || item?.path || item?.configPath || "").trim()}`;
        if (!type || seen.has(key)) return;
        seen.add(key);
        merged.push(item);
      });
      homeMediaBundleCatalog = merged;
      return merged;
    };
    const getHomeMediaOptionsByType = (type) => {
      const cloudList = getCloudLlms()
        .map((item) => buildCloudMediaOption(item, type))
        .filter(Boolean);
      const list = (Array.isArray(homeMediaBundleCatalog) ? homeMediaBundleCatalog : [])
        .filter((item) => String(item?.type || "").trim() === type)
        .map((item) => buildLocalMediaOption(item, type))
        .filter(Boolean);
      const merged =
        type === "ASR"
          ? [createAutoMediaOption(type), ...buildCloudAsrOptions(), ...cloudList, ...list]
          : type === "TTS"
          ? [createAutoMediaOption(type), ...buildCloudTtsOptions(), ...list]
          : type === "VideoSync"
            ? [createAutoMediaOption(type), ...buildCloudVideoSyncOptions(), ...cloudList, ...list]
            : [createAutoMediaOption(type), ...cloudList, ...list];
      const seen = new Set();
      const deduped = merged.filter((item) => {
        const choice = item?.modelChoice || {};
        const dedupeKey = [
          String(item?.type || "").trim(),
          String(choice?.source || "").trim(),
          String(choice?.providerId || "").trim(),
          String(choice?.modelId || choice?.model || "").trim(),
          String(choice?.bundleDir || choice?.configPath || "").trim(),
          String(choice?.label || item?.label || "").trim()
        ].join("::");
        if (seen.has(dedupeKey)) return false;
        seen.add(dedupeKey);
        return true;
      });
      const filtered = deduped.filter((item) => {
        if (type !== "ASR") return true;
        const choice = item?.modelChoice && typeof item.modelChoice === "object" ? item.modelChoice : {};
        const providerId = String(choice?.providerId || "").trim().toLowerCase();
        const modelId = String(choice?.modelId || choice?.model || "").trim().toLowerCase();
        return !(providerId === "aliyun-bailian" && modelId === "fun-asr");
      });
      if (homeRunMode === "cloud") return filtered.filter((item) => String(item?.modelChoice?.source || "").trim() === "cloud");
      if (homeRunMode === "local") return filtered.filter((item) => String(item?.modelChoice?.source || "").trim() !== "cloud");
      return filtered;
    };
    const buildHomeMediaOptionLabel = (item) => {
      const choice = item?.modelChoice && typeof item.modelChoice === "object" ? item.modelChoice : {};
      const label = String(item?.label || choice?.label || "").trim() || "\u672a\u547d\u540d\u6a21\u578b";
      const source = String(choice?.source || "").trim().toLowerCase();
      if (source === "cloud") {
        const provider = String(choice?.providerLabel || item?.sourceLabel || "").trim();
        return `\u4e91\u7aef\u6a21\u578b\uff5c${label}${provider ? `\uff5c${provider}` : ""}`;
      }
      return `\u672c\u5730\u6a21\u578b\uff5c${label}`;
    };
    const renderHomeMediaSelect = (selectEl, type, storageKey = HOME_MEDIA_KEYS[type]) => {
      if (!selectEl) return;
      const key = String(storageKey || HOME_MEDIA_KEYS[type] || "").trim();
      const options = getHomeMediaOptionsByType(type);
      if (!options.length) {
        const modeText = homeRunMode === "cloud" ? "云端" : "本地";
        selectEl.innerHTML = `<option value="">当前${modeText}运行模式下暂无可用模型</option>`;
        selectEl.value = "";
        return;
      }
      const selectedId = String(readHomeMediaSelectionMap()?.[key] || "").trim();
      selectEl.innerHTML = options
        .map((item) => `<option value="${item.id}">${buildHomeMediaOptionLabel(item)}</option>`)
        .join("");
      const nextId = options.some((item) => item.id === selectedId) ? selectedId : options[0]?.id || "";
      selectEl.value = nextId;
      if (nextId && nextId !== selectedId) writeHomeMediaSelectionMap({ [key]: nextId });
    };
    const renderHomeMediaSelectors = async () => {
      await loadHomeMediaBundleCatalog();
      renderHomeMediaSelect(homeAsrModel, "ASR", HOME_MEDIA_KEYS.ASR);
      renderHomeMediaSelect(homeSubBgmAsrModel, "ASR", HOME_MEDIA_KEYS.SUB_BGM_ASR);
      renderHomeMediaSelect(homeTtsModel, "TTS", HOME_MEDIA_KEYS.TTS);
      renderHomeMediaSelect(homeVideosyncModel, "VideoSync", HOME_MEDIA_KEYS.VideoSync);
    };
    const getSelectedHomeMediaOption = (type, selectEl = null) => {
      const options = getHomeMediaOptionsByType(type);
      const targetSelect =
        selectEl ||
        (type === "ASR" ? homeAsrModel : type === "TTS" ? homeTtsModel : homeVideosyncModel);
      const id = String(targetSelect?.value || "").trim();
      return options.find((item) => item.id === id) || options[0] || null;
    };
    const getSelectedHomeMediaChoice = (type, selectEl = null) => {
      return getSelectedHomeMediaOption(type, selectEl)?.modelChoice || null;
    };
    const hydrateHomeMediaChoice = async (type, selectEl = null) => {
      const choice = getSelectedHomeMediaChoice(type, selectEl);
      if (!choice || String(choice?.source || "").trim() !== "cloud") return choice;
      if (String(choice?.apiKey || "").trim()) return choice;
      const providerId = String(choice?.providerId || "").trim();
      if (!providerId) return choice;
      const apiKey = await resolveCloudApiKeyByProvider(providerId);
      return apiKey ? { ...choice, apiKey } : choice;
    };
    const bindHomeMediaSelect = (selectEl, type, storageKey = HOME_MEDIA_KEYS[type]) => {
      if (!selectEl) return;
      const key = String(storageKey || HOME_MEDIA_KEYS[type] || "").trim();
      selectEl.addEventListener("change", () => {
        writeHomeMediaSelectionMap({ [key]: String(selectEl.value || "").trim() });
        if (type === "TTS") {
          ensureActiveVoiceMatchesCurrentTts({ showToast: true });
          if (voiceModal?.hidden === false) renderVoiceModal();
        }
      });
    };
    const buildHomeCloudLlmSelectLabel = (item) => {
      const name = String(item?.name || item?.catalogModelLabel || item?.model || item?.id || "").trim() || "\u672a\u547d\u540d\u6a21\u578b";
      const provider = String(item?.providerLabel || item?.providerId || "").trim();
      return `\u4e91\u7aef\u6a21\u578b\uff5c${name}${provider ? `\uff5c${provider}` : ""}`;
    };
    const renderHomeLlmSelect = (selectEl, moduleKey) => {
      if (!selectEl) return;
      if (homeRunMode === "local") {
        selectEl.disabled = true;
        selectEl.innerHTML = `<option value="">纯本地运行模式下不显示云端模型</option>`;
        return;
      }
      selectEl.disabled = false;
      const list = getCloudLlms().filter((item) => item?.enabled !== false);
      if (!list.length) {
        selectEl.innerHTML = `<option value="">未配置云端大模型</option>`;
        selectEl.value = "";
        writeHomeLlmSelectionMap({ [moduleKey]: "" });
        return;
      }
      const selectedId = String(readHomeLlmSelectionMap()?.[moduleKey] || "").trim();
      const defaultId = getPreferredPublicCloudLlmId();
      selectEl.innerHTML = list.map((item) => `<option value="${String(item?.id || "")}">${buildHomeCloudLlmSelectLabel(item)}</option>`).join("");
      const nextId = list.some((item) => String(item?.id || "") === selectedId) ? selectedId : defaultId || String(list[0]?.id || "");
      selectEl.value = nextId;
      if (nextId !== selectedId) writeHomeLlmSelectionMap({ [moduleKey]: nextId });
    };
    const renderHomeLlmSelectors = () => {
      renderHomeLlmSelect(homeCopyLlm, HOME_LLM_KEYS.copyEdit);
      renderHomeLlmSelect(homeMetaLlm, HOME_LLM_KEYS.meta);
    };
    const applyHomeRunMode = async ({ showToast = false } = {}) => {
      updateHomeRunModeUi();
      await renderHomeMediaSelectors();
      renderHomeLlmSelectors();
      renderHomeCloneModelSelect();
      ensureActiveVoiceMatchesCurrentTts({ showToast: false });
      renderVoicePicked();
      if (voiceModal?.hidden === false) renderVoiceModal();
      if (showToast) toast(`已切换为${HOME_RUN_MODE_OPTIONS[homeRunMode]}。`);
    };
    const getSelectedHomeCloudLlm = (moduleKey) => {
      if (homeRunMode === "local") return null;
      const list = getCloudLlms().filter((item) => item?.enabled !== false);
      const selectEl = moduleKey === HOME_LLM_KEYS.meta ? homeMetaLlm : homeCopyLlm;
      const selectedId = String(selectEl?.value || "").trim();
      const defaultId = getPreferredPublicCloudLlmId();
      return list.find((item) => String(item?.id || "") === selectedId) || list.find((item) => String(item?.id || "") === defaultId) || list[0] || null;
    };
    const ensureHomeCloudLlmReady = (moduleKey, tipText) => {
      if (homeRunMode === "local") {
        toast("当前是纯本地运行模式，云端文案模型已隐藏。");
        return null;
      }
      const active = getSelectedHomeCloudLlm(moduleKey);
      if (active?.apiKey && active?.endpoint && active?.model) return active;
      toast(tipText || "请先在“模型-云端大模型”中配置并选择一个云模型。");
      return null;
    };
    const bindHomeLlmSelect = (selectEl, moduleKey) => {
      if (!selectEl) return;
      selectEl.addEventListener("change", () => {
        writeHomeLlmSelectionMap({ [moduleKey]: String(selectEl.value || "").trim() });
      });
    };

    const getVoiceLabelById = (id) => {
      const vid = String(id || "").trim();
      if (!vid) return "选择音色";
      if (vid.startsWith("sys_")) {
        const v = SYSTEM_VOICES.find((x) => x.id === vid);
        return v ? v.title : vid;
      }
      const clones = getSafeCloneVoices();
      const c = clones.find((x) => x.id === vid);
      return c ? c.name : vid;
    };
    const getVoiceCompatibilityState = (voiceId, voiceItem = null, ttsOption = null) => {
      const tts = ttsOption || getSelectedHomeMediaOption("TTS");
      const choice = tts?.modelChoice && typeof tts.modelChoice === "object" ? tts.modelChoice : {};
      const ttsSource = String(choice?.source || "").trim().toLowerCase();
      const ttsProviderId = String(choice?.providerId || "").trim().toLowerCase();
      const ttsModelId = String(choice?.modelId || choice?.model || "").trim().toLowerCase();
      const id = String(voiceId || "").trim();
      if (!id) return { ok: false, reason: "音色 ID 为空" };
      if (id.startsWith("sys_")) {
        if (ttsSource === "local") return { ok: true, reason: "" };
        if (ttsSource === "cloud" && ttsProviderId === "aliyun-bailian") return { ok: true, reason: "" };
        return { ok: false, reason: "当前 TTS 模型不支持这个系统音色" };
      }
      const voice = voiceItem || getSafeCloneVoices().find((item) => String(item?.id || "").trim() === id) || null;
      if (!voice) return { ok: false, reason: "未找到当前克隆音色" };
      const voiceSource = String(voice?.source || (id.startsWith("clone_") ? "local" : "")).trim().toLowerCase() || "local";
      if (ttsSource === "local") {
        if (voiceSource === "local") return { ok: true, reason: "" };
        return { ok: false, reason: "本地 TTS 不能直接使用云端克隆音色" };
      }
      if (ttsSource === "cloud" && ttsProviderId === "aliyun-bailian") {
        if (voiceSource !== "cloud" || String(voice?.providerId || "").trim().toLowerCase() !== "aliyun-bailian") {
          return { ok: false, reason: "当前云端 TTS 只能选择阿里云云端克隆音色" };
        }
        const targetModel = String(voice?.targetModel || "").trim().toLowerCase();
        if (targetModel && ttsModelId && targetModel !== ttsModelId) {
          return { ok: false, reason: `该音色只支持 ${targetModel}` };
        }
        return { ok: true, reason: "" };
      }
      return { ok: false, reason: "当前 TTS 模型与音色不匹配" };
    };
    const pickFirstCompatibleVoiceId = (ttsOption = null) => {
      const option = ttsOption || getSelectedHomeMediaOption("TTS");
      const systemId = SYSTEM_VOICES.find((item) => getVoiceCompatibilityState(item.id, null, option).ok)?.id || "";
      if (systemId) return systemId;
      return String(getSafeCloneVoices().find((item) => getVoiceCompatibilityState(item.id, item, option).ok)?.id || "").trim();
    };
    const ensureActiveVoiceMatchesCurrentTts = ({ showToast = false } = {}) => {
      const currentId = String(getActiveVoiceId() || "").trim();
      if (!currentId) {
        const fallbackId = pickFirstCompatibleVoiceId();
        if (fallbackId) setActiveVoiceId(fallbackId);
        renderVoicePicked();
        return fallbackId;
      }
      const compat = getVoiceCompatibilityState(currentId);
      if (compat.ok) return currentId;
      const fallbackId = pickFirstCompatibleVoiceId();
      if (fallbackId && fallbackId !== currentId) {
        setActiveVoiceId(fallbackId);
        renderVoicePicked();
        if (showToast) toast("当前 TTS 模型与已选音色不匹配，已自动切换到可用音色。");
      }
      return fallbackId;
    };

    const renderVoicePicked = () => {
      const id = getActiveVoiceId();
      if (voicePickedLabel) voicePickedLabel.textContent = getVoiceLabelById(id);
    };

    bindHomeMediaSelect(homeAsrModel, "ASR", HOME_MEDIA_KEYS.ASR);
    bindHomeMediaSelect(homeSubBgmAsrModel, "ASR", HOME_MEDIA_KEYS.SUB_BGM_ASR);
    bindHomeMediaSelect(homeTtsModel, "TTS", HOME_MEDIA_KEYS.TTS);
    bindHomeMediaSelect(homeVideosyncModel, "VideoSync", HOME_MEDIA_KEYS.VideoSync);
    bindHomeLlmSelect(homeCopyLlm, HOME_LLM_KEYS.copyEdit);
    bindHomeLlmSelect(homeMetaLlm, HOME_LLM_KEYS.meta);

    const renderHomeCloneModelSelect = () => {
      if (!cloneModelSelect) return;
      const catalog = buildCloneModelCatalog(homeMediaBundleCatalog).filter((item) => {
        if (homeRunMode === "cloud") return item.source === "cloud";
        if (homeRunMode === "local") return item.source !== "cloud";
        return true;
      });
      const preferredId = String(homeCloneModelId || cloneModelSelect.value || "").trim();
      const cloudOptions = catalog
        .filter((item) => item.source === "cloud")
        .map((item) => {
          const suffix = item.configured === false ? "｜待配置Key" : "";
          return `<option value="${escapeHtml(item.id)}">${escapeHtml(`${item.label}｜${item.sourceLabel}${suffix}`)}</option>`;
        })
        .join("");
      const localOptions = catalog
        .filter((item) => item.source !== "cloud")
        .map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(`${item.label}｜${item.sourceLabel}`)}</option>`)
        .join("");
      const groups = [];
      if (cloudOptions) groups.push(`<optgroup label="云端克隆模型">${cloudOptions}</optgroup>`);
      if (localOptions) groups.push(`<optgroup label="本地克隆模型">${localOptions}</optgroup>`);
      cloneModelSelect.innerHTML = groups.length ? groups.join("") : `<option value="">暂无可用模型</option>`;
      cloneModelSelect.disabled = !catalog.length;
      const nextId = catalog.find((item) => item.id === preferredId)?.id || String(catalog[0]?.id || "");
      cloneModelSelect.value = nextId;
      homeCloneModelId = nextId;
      const selected = catalog.find((item) => item.id === cloneModelSelect.value) || null;
      if (cloneModelHint) {
        if (isAliyunCosyVoiceSelection(selected)) {
          cloneModelHint.textContent = selected?.configured === false
            ? "当前已切换到阿里云 CosyVoice，但当前账号还没有可用 Key。"
            : `当前已切换到阿里云 CosyVoice，开始复刻时会自动上传参考音频后再创建云端音色。百炼文档建议样本音频 10~20 秒，当前最低按 ${getRecommendedCloneMinSeconds(selected)} 秒校验。`;
        } else {
          cloneModelHint.textContent = "当前使用本地 TTS 克隆链路。";
        }
      }
    };

    const openVoiceModal = () => {
      voiceOverlay.hidden = false;
      voiceModal.hidden = false;
      renderVoiceModal();
    };

    const closeVoiceModal = () => {
      voiceOverlay.hidden = true;
      voiceModal.hidden = true;
      stopPreviewAudio();
    };

    const resetCloneModal = () => {
      stopPreviewAudio();
      recordedBlob = null;
      pickedPromptFilePath = "";
      recordChunks = [];
      pendingCloneVoice = null;
      currentCloneTaskId = "";
      cloneName.value = "";
      cloneRefText.value = "";
      cloneAudioStatus.textContent = "未录制";
      cloneAudioStatus.title = "";
      cloneCreate.disabled = false;
      cloneCreate.textContent = "一键复刻";
      cloneCancelGen.disabled = true;
      cloneSave.disabled = true;
      if (cloneLogBox) cloneLogBox.textContent = "";
      renderHomeCloneModelSelect();
      updateClonePreviewBtnState();
    };

    const openCloneModal = async () => {
      resetCloneModal();
      cloneOverlay.hidden = false;
      cloneModal.hidden = false;
      await loadHomeMediaBundleCatalog();
      renderHomeCloneModelSelect();
      await refreshMicDevices();
      cloneName.focus();
    };

    const closeCloneModal = () => {
      cloneOverlay.hidden = true;
      cloneModal.hidden = true;
      try {
        mediaRecorder?.stop?.();
      } catch {}
      mediaRecorder = null;
      recordChunks = [];
      try {
        micStream?.getTracks?.().forEach((t) => t.stop());
      } catch {}
      micStream = null;
      if (recordingTimer) {
        clearInterval(recordingTimer);
        recordingTimer = null;
      }
      stopPreviewAudio();
      stopWave();
      updateClonePreviewBtnState();
    };

    function stopWave() {
      try {
        if (waveRaf) cancelAnimationFrame(waveRaf);
      } catch {}
      waveRaf = 0;
      try {
        waveSrc?.disconnect?.();
      } catch {}
      waveSrc = null;
      try {
        waveAnalyser?.disconnect?.();
      } catch {}
      waveAnalyser = null;
      try {
        waveAudioCtx?.close?.();
      } catch {}
      waveAudioCtx = null;
      if (cloneWave) cloneWave.hidden = true;
    }

    function startWave(stream) {
      stopWave();
      if (!cloneWave) return;
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      waveAudioCtx = new Ctx();
      waveAnalyser = waveAudioCtx.createAnalyser();
      waveAnalyser.fftSize = 2048;
      waveSrc = waveAudioCtx.createMediaStreamSource(stream);
      waveSrc.connect(waveAnalyser);
      const bufferLength = waveAnalyser.fftSize;
      const dataArray = new Uint8Array(bufferLength);
      const ctx = cloneWave.getContext("2d");
      cloneWave.hidden = false;

      const draw = () => {
        waveRaf = requestAnimationFrame(draw);
        waveAnalyser.getByteTimeDomainData(dataArray);
        ctx.clearRect(0, 0, cloneWave.width, cloneWave.height);
        ctx.fillStyle = "rgba(99,102,241,0.08)";
        ctx.fillRect(0, 0, cloneWave.width, cloneWave.height);

        const mid = cloneWave.height / 2;
        ctx.lineWidth = 2;
        ctx.strokeStyle = "rgba(99,102,241,0.95)";
        ctx.beginPath();
        const sliceWidth = cloneWave.width / bufferLength;
        let x = 0;
        for (let i = 0; i < bufferLength; i += 1) {
          const v = dataArray[i] / 128.0;
          const y = v * mid;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
          x += sliceWidth;
        }
        ctx.lineTo(cloneWave.width, mid);
        ctx.stroke();
      };
      draw();
    }

    const pushCloneLog = (level, message) => {
      if (!cloneLogBox) return;
      const now = new Date();
      const ts = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(
        now.getSeconds()
      ).padStart(2, "0")}`;
      const lv = String(level || "info");
      const line = `[${ts}][${lv}] ${String(message || "")}\n`;
      cloneLogBox.textContent += line;
      if (cloneLogBox.textContent.length > 40000) cloneLogBox.textContent = cloneLogBox.textContent.slice(-40000);
      cloneLogBox.scrollTop = cloneLogBox.scrollHeight;
    };

    const clearCloneLog = () => {
      if (!cloneLogBox) return;
      cloneLogBox.textContent = "";
    };

    const pushAudioLog = (level, message) => {
      if (!audioLogBox) return;
      const now = new Date();
      const ts = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(
        now.getSeconds()
      ).padStart(2, "0")}`;
      const lv = String(level || "info");
      const line = `[${ts}][${lv}] ${String(message || "")}\n`;
      audioLogBox.textContent += line;
      if (audioLogBox.textContent.length > 40000) audioLogBox.textContent = audioLogBox.textContent.slice(-40000);
      audioLogBox.scrollTop = audioLogBox.scrollHeight;
    };

    const clearAudioLog = () => {
      if (!audioLogBox) return;
      audioLogBox.textContent = "";
    };

    const formatMMSS = (sec) => {
      const s = Number(sec);
      if (!Number.isFinite(s) || s < 0) return "00:00";
      const m = Math.floor(s / 60);
      const r = Math.floor(s % 60);
      return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
    };

    const setAudioTimeText = () => {
      if (!audioTime || !audioEl) return;
      const cur = formatMMSS(audioEl.currentTime || 0);
      const dur = formatMMSS(audioEl.duration || 0);
      audioTime.textContent = `${cur}/${dur}`;
    };

    const setAudioSeekValueFromEl = () => {
      if (!audioSeek || !audioEl) return;
      const dur = Number(audioEl.duration || 0);
      if (!Number.isFinite(dur) || dur <= 0) {
        audioSeek.value = "0";
        return;
      }
      const v = Math.max(0, Math.min(1000, Math.round((audioEl.currentTime / dur) * 1000)));
      audioSeek.value = String(v);
    };

    const setAudioPlayingUI = (isPlaying) => {
      if (!audioPlayBtn) return;
      audioPlayBtn.textContent = isPlaying ? "⏸" : "▶";
    };

    const setAudioSource = (audioPath) => {
      if (!audioEl) return;
      const url = toFileUrl(audioPath);
      if (!url) return;
      homeSelectedAudioPath = String(audioPath || "").trim();
      try {
        audioEl.pause();
      } catch {}
      audioEl.src = url;
      audioEl.load();
      setAudioPlayingUI(false);
      setAudioTimeText();
      setAudioSeekValueFromEl();
      updateTalkingBtnState();
    };

    const readAudioHistory = () => {
      try {
        return getAudioHistory();
      } catch {
        return [];
      }
    };
    const writeAudioHistory = (list) => {
      try {
        const next = Array.isArray(list) ? list.slice(0, 30) : [];
        setAudioHistory(next);
      } catch {}
    };
    const clearCurrentAudioSelection = () => {
      homeSelectedAudioPath = "";
      if (audioHistory) audioHistory.value = "";
      if (!audioEl) {
        updateTalkingBtnState();
        return;
      }
      try {
        audioEl.pause();
      } catch {}
      audioEl.removeAttribute("src");
      try {
        audioEl.load();
      } catch {}
      setAudioPlayingUI(false);
      setAudioTimeText();
      setAudioSeekValueFromEl();
      updateTalkingBtnState();
    };

    const renderAudioHistory = () => {
      if (!audioHistory) return;
      audioHistoryCache = readAudioHistory();
      const opts = [`<option value="" selected>选择历史音频</option>`].concat(
        audioHistoryCache.map((x) => {
          const createdAt = Number(x?.createdAt || 0);
          const d = createdAt ? new Date(createdAt) : null;
          const ts = d
            ? `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(
                d.getHours()
              ).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
            : "未知时间";
          const vid = String(x?.voiceId || "");
          const vlabel = vid ? getVoiceLabelById(vid) : "未知音色";
          const spd = Number(x?.speed || 1.0) || 1.0;
          const emo = String(x?.emotion || "").trim() || "自然";
          const lan = String(x?.language || "").trim() || "默认";
          const label = `${ts}｜${vlabel}｜${emo}｜${lan}｜x${spd}`;
          return `<option value="${String(x?.id || "")}">${label}</option>`;
        })
      );
      audioHistory.innerHTML = opts.join("");
    };

    const HOME_ACTIVE_AVATAR_KEY = "ipfactory.home.activeAvatarId";

    const setHomeVideoSource = (videoPath, { asBase = false } = {}) => {
      const url = toFileUrl(videoPath);
      if (!homeVideoEl || !homeVideoEmpty) return;
      if (asBase === true) homeSelectedAvatarVideoPath = String(videoPath || "").trim();
      if (!url) {
        homeVideoEl.hidden = true;
        homeVideoEmpty.hidden = false;
        homeVideoEl.removeAttribute("src");
        refreshHomeVideoCompare();
        return;
      }
      homeVideoEmpty.hidden = true;
      homeVideoEl.hidden = false;
      homeVideoEl.src = url;
      homeVideoEl.load();
      refreshHomeVideoCompare();
    };
    const ensureHomeSourcePreviewAudio = () => {
      if (!homeSourcePreview) {
        homeSourcePreview = document.createElement("video");
        homeSourcePreview.preload = "auto";
        homeSourcePreview.playsInline = true;
        homeSourcePreview.crossOrigin = "anonymous";
      }
      if (!homeSourcePreviewCtx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return null;
        homeSourcePreviewCtx = new AudioCtx();
      }
      if (!homeSourcePreviewGain && homeSourcePreviewCtx && homeSourcePreview) {
        const src = homeSourcePreviewCtx.createMediaElementSource(homeSourcePreview);
        const gain = homeSourcePreviewCtx.createGain();
        src.connect(gain);
        gain.connect(homeSourcePreviewCtx.destination);
        homeSourcePreviewGain = gain;
      }
      return homeSourcePreview;
    };
    const getHomeSourcePreviewGain = () => {
      const pct = Math.max(0, Math.min(300, Number(String(homeSourceVolume?.value || "100").trim()) || 100));
      return pct / 100;
    };
    const stopHomeSourcePreview = () => {
      try {
        homeSourcePreview?.pause?.();
      } catch {}
      if (homeSourceListen) homeSourceListen.textContent = "试听原视频";
    };
    const syncHomeSourcePreviewGain = () => {
      if (homeSourcePreviewGain) homeSourcePreviewGain.gain.value = getHomeSourcePreviewGain();
    };
    const stopHomeBgmPreview = () => {
      try {
        homeBgmPreview?.pause?.();
      } catch {}
      if (homeBgmListen) homeBgmListen.textContent = "试听背景音乐";
    };
    const updateQuickParseBtnState = () => {
      if (!btnQuickParse) return;
      const running = recognizeOverlay?.hidden === false;
      btnQuickParse.disabled = false;
      btnQuickParse.textContent = running ? "停止提取文案" : "提取文案";
      btnQuickParse.title = running ? "再次点击可停止当前识别任务" : "";
    };
    const updateAudioGenerateBtnState = () => {
      if (!btnGenAudio) return;
      btnGenAudio.disabled = false;
      btnGenAudio.textContent = currentAudioTaskId ? "停止生成语音" : "克隆声音";
      btnGenAudio.title = currentAudioTaskId ? "再次点击可停止当前语音生成" : "";
    };
    const updateRewriteBtnState = () => {
      if (!btnRewriteCopy) return;
      btnRewriteCopy.disabled = false;
      btnRewriteCopy.textContent = rewriting ? "停止改写" : "智能改写";
      btnRewriteCopy.title = rewriting ? "再次点击可停止当前改写结果写回" : "";
    };
    const updateHomeSubBgmBtnState = () => {
      if (!btnAutoBgm) return;
      if (homeSubBgmStopping) {
        btnAutoBgm.disabled = true;
        btnAutoBgm.textContent = "停止中...";
        btnAutoBgm.title = "正在等待字幕和背景音乐任务退出";
        return;
      }
      btnAutoBgm.disabled = false;
      btnAutoBgm.textContent = homeSubBgmTaskId ? "停止生成字幕和背景音乐" : "自动生成字幕和背景音乐";
      btnAutoBgm.title = homeSubBgmTaskId ? "再次点击可停止当前字幕和背景音乐任务" : "";
    };
    const updateHomeEditBtnState = () => {
      if (!btnStartEdit) return;
      if (homeEditStopping) {
        btnStartEdit.disabled = true;
        btnStartEdit.textContent = "停止中...";
        btnStartEdit.title = "正在等待剪辑进程退出";
        return;
      }
      btnStartEdit.disabled = false;
      btnStartEdit.textContent = homeEditGenerating ? "停止剪辑" : "开始剪辑";
      btnStartEdit.title = homeEditGenerating ? "再次点击可停止当前剪辑任务" : "";
    };
    const updateHomeCoverBtnState = () => {
      if (!btnCoverAuto) return;
      if (homeCoverStopping) {
        btnCoverAuto.disabled = true;
        btnCoverAuto.textContent = "停止中...";
        btnCoverAuto.title = "正在等待封面生成进程退出";
        return;
      }
      btnCoverAuto.disabled = false;
      btnCoverAuto.textContent = homeCoverGenerating ? "停止生成封面" : "自动生成封面";
      btnCoverAuto.title = homeCoverGenerating ? "再次点击可停止当前封面生成" : "";
    };
    const updateHomePublishBtnState = () => {
      if (!homePubCreate) return;
      if (homePublishCanceling) {
        homePubCreate.disabled = true;
        homePubCreate.textContent = "停止中...";
        homePubCreate.title = "正在终止当前发布任务";
        return;
      }
      homePubCreate.disabled = false;
      homePubCreate.textContent = homePublishRunning ? "停止一键发布" : "一键发布";
      homePubCreate.title = homePublishRunning ? "再次点击可停止当前一键发布" : "";
    };
    updateQuickParseBtnState();
    updateAudioGenerateBtnState();
    updateRewriteBtnState();
    updateHomeSubBgmBtnState();
    updateHomeEditBtnState();
    updateHomeCoverBtnState();
    updateHomePublishBtnState();
    updateMetaBtnState();
    updateHotcopyBtnState();
    const setCompareVideoSource = (videoEl, emptyEl, statusEl, openBtnEl, videoPath, emptyText) => {
      if (!videoEl || !emptyEl || !statusEl) return;
      const fp = String(videoPath || "").trim();
      const ready = !!fp;
      statusEl.textContent = ready ? "已准备，可直接对比" : "未准备";
      statusEl.title = ready ? fp : String(emptyText || "");
      statusEl.classList.toggle("is-ready", ready);
      statusEl.classList.toggle("is-empty", !ready);
      if (openBtnEl) {
        openBtnEl.disabled = !ready;
        openBtnEl.hidden = !ready;
        openBtnEl.title = ready ? fp : "";
      }
      const url = toFileUrl(fp);
      if (!url) {
        videoEl.hidden = true;
        emptyEl.hidden = false;
        videoEl.removeAttribute("src");
        return;
      }
      emptyEl.hidden = true;
      videoEl.hidden = false;
      if (videoEl.getAttribute("src") !== url) {
        videoEl.src = url;
        videoEl.load();
      }
    };
    const syncComparePeerTime = (fromVideo, toVideo) => {
      if (!fromVideo || !toVideo || homeVideoCompareSyncing) return;
      const delta = Math.abs((Number(fromVideo.currentTime || 0) || 0) - (Number(toVideo.currentTime || 0) || 0));
      if (delta < 0.2) return;
      homeVideoCompareSyncing = true;
      try {
        toVideo.currentTime = Number(fromVideo.currentTime || 0) || 0;
      } catch {}
      window.setTimeout(() => {
        homeVideoCompareSyncing = false;
      }, 0);
    };
    const bindCompareVideoPair = (fromVideo, toVideo) => {
      if (!fromVideo || !toVideo) return;
      fromVideo.addEventListener("play", () => {
        if (homeVideoCompareSyncing) return;
        homeVideoCompareSyncing = true;
        try {
          syncComparePeerTime(fromVideo, toVideo);
          const promise = toVideo.play?.();
          if (promise && typeof promise.catch === "function") promise.catch(() => {});
        } finally {
          window.setTimeout(() => {
            homeVideoCompareSyncing = false;
          }, 0);
        }
      });
      fromVideo.addEventListener("pause", () => {
        if (homeVideoCompareSyncing) return;
        homeVideoCompareSyncing = true;
        try {
          toVideo.pause?.();
          syncComparePeerTime(fromVideo, toVideo);
        } finally {
          window.setTimeout(() => {
            homeVideoCompareSyncing = false;
          }, 0);
        }
      });
      fromVideo.addEventListener("seeking", () => {
        syncComparePeerTime(fromVideo, toVideo);
      });
      fromVideo.addEventListener("seeked", () => {
        syncComparePeerTime(fromVideo, toVideo);
      });
    };
    bindCompareVideoPair(homeVideoCompareBaseVideo, homeVideoCompareOutVideo);
    bindCompareVideoPair(homeVideoCompareOutVideo, homeVideoCompareBaseVideo);
    const renderVideoCompareTrigger = () => {
      if (!homeSubBgmCompareBtn) return;
      const hasBase = !!String(homeSelectedAvatarVideoPath || "").trim();
      const hasOut = !!String(homeSubBgmOutPath || "").trim();
      homeSubBgmCompareBtn.disabled = !(hasBase && hasOut);
      homeSubBgmCompareBtn.title = hasBase && hasOut ? "" : "需要同时存在数字人原视频和字幕和音乐成片";
    };
    const refreshHomeVideoCompare = () => {
      setCompareVideoSource(
        homeVideoCompareBaseVideo,
        homeVideoCompareBaseEmpty,
        homeVideoCompareBasePath,
        homeVideoCompareBaseOpen,
        homeSelectedAvatarVideoPath,
        "请先在“音频视频生成”模块选择数字人形象。"
      );
      setCompareVideoSource(
        homeVideoCompareOutVideo,
        homeVideoCompareOutEmpty,
        homeVideoCompareOutPath,
        homeVideoCompareOutOpen,
        homeSubBgmOutPath,
        "请先在“字幕和音乐”模块生成成片。"
      );
      renderVideoCompareTrigger();
    };
    const revealCompareVideoPath = async (targetPath) => {
      const fp = String(targetPath || "").trim();
      if (!fp) return;
      try {
        const res = await window.api?.shell?.reveal?.({ path: fp });
        if (!res?.ok) toast("打开文件位置失败。");
      } catch {
        toast("打开文件位置失败。");
      }
    };
    const openHomeVideoCompareModal = () => {
      refreshHomeVideoCompare();
      const hasBase = !!String(homeSelectedAvatarVideoPath || "").trim();
      const hasOut = !!String(homeSubBgmOutPath || "").trim();
      if (!hasBase || !hasOut) {
        toast("请先准备好数字人原视频和字幕和音乐成片。");
        return;
      }
      openModal(homeVideoCompareOverlay, homeVideoCompareModal);
    };
    const closeHomeVideoCompareModal = () => {
      try {
        homeVideoCompareBaseVideo?.pause?.();
        homeVideoCompareOutVideo?.pause?.();
      } catch {}
      closeModal(homeVideoCompareOverlay, homeVideoCompareModal);
    };
    homeSubBgmCompareBtn?.addEventListener("click", openHomeVideoCompareModal);
    homeVideoCompareClose?.addEventListener("click", closeHomeVideoCompareModal);
    homeVideoCompareDone?.addEventListener("click", closeHomeVideoCompareModal);
    homeVideoCompareOverlay?.addEventListener("click", closeHomeVideoCompareModal);
    homeVideoComparePlay?.addEventListener("click", async () => {
      try {
        syncComparePeerTime(homeVideoCompareBaseVideo, homeVideoCompareOutVideo);
        syncComparePeerTime(homeVideoCompareOutVideo, homeVideoCompareBaseVideo);
        await Promise.all([homeVideoCompareBaseVideo?.play?.(), homeVideoCompareOutVideo?.play?.()].filter(Boolean));
      } catch {}
    });
    homeVideoComparePause?.addEventListener("click", () => {
      try {
        homeVideoCompareBaseVideo?.pause?.();
        homeVideoCompareOutVideo?.pause?.();
      } catch {}
    });
    homeVideoCompareBaseOpen?.addEventListener("click", () => revealCompareVideoPath(homeSelectedAvatarVideoPath));
    homeVideoCompareOutOpen?.addEventListener("click", () => revealCompareVideoPath(homeSubBgmOutPath));
    homeVideoCompareReset?.addEventListener("click", () => {
      try {
        if (homeVideoCompareBaseVideo) homeVideoCompareBaseVideo.currentTime = 0;
        if (homeVideoCompareOutVideo) homeVideoCompareOutVideo.currentTime = 0;
      } catch {}
    });
    refreshHomeVideoCompare();

    const setHomeVideoGeneratingUI = (isGenerating, message) => {
      homeVideoGenerating = isGenerating === true;
      if (homeVideoGen) homeVideoGen.hidden = !homeVideoGenerating;
      if (homeVideoGenSub) homeVideoGenSub.textContent = String(message || "准备启动数字人模型...");
      if (homeVideoEl) {
        if (homeVideoGenerating) {
          homeVideoEl.hidden = true;
        } else {
          const hasSrc = !!homeVideoEl.getAttribute("src");
          homeVideoEl.hidden = !hasSrc;
        }
      }
      if (homeVideoEmpty) {
        const hasVideo = homeVideoEl && !!homeVideoEl.getAttribute("src");
        homeVideoEmpty.hidden = homeVideoGenerating || hasVideo;
      }
    };

    const updateTalkingBtnState = () => {
      if (!btnGenTalking) return;
      if (homeVideoStopping) {
        btnGenTalking.disabled = true;
        btnGenTalking.textContent = "停止中...";
        btnGenTalking.title = "正在等待后台进程完全停止";
        return;
      }
      if (homeVideoGenerating) {
        btnGenTalking.disabled = false;
        btnGenTalking.textContent = "生成中";
        btnGenTalking.title = "再次点击可停止生成";
        return;
      }
      const hasAudio = !!homeSelectedAudioPath;
      const hasAvatar = !!String(homeAvatarSelect?.value || "").trim();
      btnGenTalking.disabled = !(hasAudio && hasAvatar);
      btnGenTalking.textContent = "生成口播视频";
      btnGenTalking.title = "";
    };

    const renderHomeAvatars = (items) => {
      homeAvatarCache = Array.isArray(items) ? items : [];
      const activeId = String(localStorage.getItem(HOME_ACTIVE_AVATAR_KEY) || "");
      const options = [`<option value="" ${!activeId ? "selected" : ""}>选择数字人形象</option>`].concat(
        homeAvatarCache.map((x) => {
          const id = String(x?.id || "");
          const name = String(x?.name || "").trim() || "未命名";
          const selected = id && id === activeId ? "selected" : "";
          return `<option value="${id}" ${selected}>${name}</option>`;
        })
      );
      if (homeAvatarSelect) homeAvatarSelect.innerHTML = options.join("");
      const pickedId = String(homeAvatarSelect?.value || activeId || "");
      const picked = homeAvatarCache.find((x) => String(x?.id || "") === pickedId) || null;
      setHomeVideoSource(String(picked?.videoPath || ""), { asBase: true });
      updateTalkingBtnState();
    };

    const refreshHomeAvatars = async () => {
      try {
        const res = await window.api?.avatar?.list?.();
        renderHomeAvatars(res?.items || []);
      } catch {
        renderHomeAvatars([]);
      }
    };

    async function refreshMicDevices() {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const mics = devices.filter((d) => d.kind === "audioinput");
        cloneMic.innerHTML = mics
          .map((d, idx) => `<option value="${d.deviceId}">${d.label || `麦克风 ${idx + 1}`}</option>`)
          .join("");
        if (!mics.length) cloneMic.innerHTML = `<option value="" selected>未检测到麦克风</option>`;
      } catch {
        cloneMic.innerHTML = `<option value="" selected>无法获取麦克风列表</option>`;
      }
    }

    const classifySystemVoice = (title) => {
      const t = String(title || "");
      if (/(上海|北京|南京|陕西|闽南|天津|四川|粤语|上海话|北京话|南京话|陕西话|闽南语|天津话|四川话)/.test(t)) return "fangyan";
      if (/(美语|西语|俄语|意语|韩语|日语|德语|法语)/.test(t)) return "waiguo";
      return "putonghua";
    };

    const renderVoiceModal = () => {
      btnAddCloneVoice.hidden = voiceTab !== "clone";
      voiceSubtabs.hidden = voiceTab !== "system";

      Array.from(voiceTabs.querySelectorAll("[data-voice-tab]")).forEach((b) => {
        b.classList.toggle("is-active", b.getAttribute("data-voice-tab") === voiceTab);
      });
      Array.from(voiceSubtabs.querySelectorAll("[data-subtab]")).forEach((b) => {
        b.classList.toggle("is-active", b.getAttribute("data-subtab") === voiceSubtab);
      });

      const activeId = getActiveVoiceId();

      if (voiceTab === "system") {
        const list = SYSTEM_VOICES.filter((v) => classifySystemVoice(v.title) === voiceSubtab);
        voiceList.innerHTML = list
          .map((v) => {
            const isActive = v.id === activeId;
            const isPreviewing = previewingVoiceItemId === v.id;
            return `
              <div class="voice-item" data-id="${v.id}">
                <div class="voice-item-left">
                  <div class="voice-item-title">${v.title}${isActive ? ` <span class="pill">已选</span>` : ""}</div>
                  <div class="voice-item-sub mono">音色ID：${v.aliyunVoiceId}</div>
                </div>
                <div class="voice-item-actions">
                  <button class="btn" data-act="preview">${isPreviewing ? "停止" : "试听"}</button>
                  <button class="btn btn-primary" data-act="select" ${getVoiceCompatibilityState(v.id, null).ok ? "" : `disabled title="${escapeAttr(getVoiceCompatibilityState(v.id, null).reason)}"`}>选择</button>
                </div>
              </div>
            `;
          })
          .join("");
        if (!list.length) voiceList.innerHTML = `<div class="empty">暂无音色。</div>`;
        return;
      }

      const clones = getSafeCloneVoices();
      if (!clones.length) {
        voiceList.innerHTML = `<div class="empty">暂无克隆音色。</div>`;
        return;
      }
      voiceList.innerHTML = clones
        .map((c) => {
          const isActive = c.id === activeId;
          const isPreviewing = previewingVoiceItemId === c.id;
          return `
            <div class="voice-item" data-id="${c.id}">
              <div class="voice-item-left">
                <div class="voice-item-title">${c.name}${isActive ? ` <span class="pill">已选</span>` : ""}</div>
                <div class="voice-item-sub mono">${c.id}</div>
              </div>
              <div class="voice-item-actions">
                <button class="btn" data-act="preview">${isPreviewing ? "停止" : "试听"}</button>
                <button class="btn btn-primary" data-act="select" ${getVoiceCompatibilityState(c.id, c).ok ? "" : `disabled title="${escapeAttr(getVoiceCompatibilityState(c.id, c).reason)}"`}>选择</button>
                <button class="btn btn-danger" data-act="remove">删除</button>
              </div>
            </div>
          `;
        })
        .join("");
    };

    const playSystemVoice = async (voiceId) => {
      stopPreviewAudio();
      let url = "";
      let failMessage = "无法试听。";
      try {
        const res = await window.api?.voice?.resolvePreviewPath?.({ voiceId });
        failMessage = String(res?.message || failMessage);
        url = toFileUrl(res?.filePath || "");
      } catch {}
      if (!url) {
        toast(failMessage);
        return;
      }
      previewAudio = new Audio(url);
      previewAudio.volume = 1.0;
      previewingVoiceItemId = voiceId;
      previewAudio.onended = () => stopPreviewAudio();
      previewAudio.onerror = () => {
        stopPreviewAudio();
        toast(failMessage);
      };
      if (voiceModal?.hidden === false) renderVoiceModal();
      previewAudio.play().catch(() => {
        stopPreviewAudio();
        toast(failMessage);
      });
    };

    const playCloneVoice = async (voiceId) => {
      stopPreviewAudio();
      let url = "";
      let failMessage = "无法试听。";
      try {
        const res = await window.api?.voice?.resolvePreviewPath?.({ voiceId });
        failMessage = String(res?.message || failMessage);
        url = toFileUrl(res?.filePath || "");
      } catch {}
      if (!url) {
        toast(failMessage);
        return;
      }
      previewAudio = new Audio(url);
      previewAudio.volume = 1.0;
      previewingVoiceItemId = voiceId;
      previewAudio.onended = () => stopPreviewAudio();
      previewAudio.onerror = () => {
        stopPreviewAudio();
        toast(failMessage);
      };
      if (voiceModal?.hidden === false) renderVoiceModal();
      previewAudio.play().catch(() => {
        stopPreviewAudio();
        toast(failMessage);
      });
    };

    const updateClonePreviewBtnState = () => {
      if (!clonePreview) return;
      clonePreview.disabled = !recordedBlob && !pickedPromptFilePath;
      clonePreview.textContent = previewingCloneReference ? "停止" : "试听";
    };

    const playCloneReferenceAudio = async () => {
      if (previewingCloneReference) {
        stopPreviewAudio();
        return;
      }
      let url = "";
      if (recordedBlob) {
        url = URL.createObjectURL(recordedBlob);
      } else if (pickedPromptFilePath) {
        url = toFileUrl(pickedPromptFilePath);
      }
      if (!url) {
        toast("请先录制或选择参考音频。");
        return;
      }
      stopPreviewAudio();
      previewAudio = new Audio(url);
      previewingCloneReference = true;
      updateClonePreviewBtnState();
      previewAudio.onended = () => {
        if (url.startsWith("blob:")) {
          try {
            URL.revokeObjectURL(url);
          } catch {}
        }
        stopPreviewAudio();
      };
      previewAudio.onerror = () => {
        if (url.startsWith("blob:")) {
          try {
            URL.revokeObjectURL(url);
          } catch {}
        }
        stopPreviewAudio();
      };
      previewAudio.play().catch(() => {
        if (url.startsWith("blob:")) {
          try {
            URL.revokeObjectURL(url);
          } catch {}
        }
        stopPreviewAudio();
        toast("无法试听当前参考音频。");
      });
    };

    const selectVoice = (voiceId) => {
      setActiveVoiceId(voiceId);
      renderVoicePicked();
      renderVoiceModal();
      closeVoiceModal();
    };

    voiceTabs.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-voice-tab]");
      if (!btn) return;
      voiceTab = btn.getAttribute("data-voice-tab") || "system";
      renderVoiceModal();
    });

    voiceSubtabs.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-subtab]");
      if (!btn) return;
      voiceSubtab = btn.getAttribute("data-subtab") || "putonghua";
      renderVoiceModal();
    });

    voiceList.addEventListener("click", async (e) => {
      const item = e.target.closest(".voice-item");
      if (!item) return;
      const id = item.getAttribute("data-id") || "";
      const act = e.target.closest("[data-act]")?.getAttribute("data-act") || "";
      if (!id || !act) return;
      if (act === "preview") {
        if (previewingVoiceItemId === id) {
          stopPreviewAudio();
          return;
        }
        if (id.startsWith("sys_")) playSystemVoice(id);
        else playCloneVoice(id);
        return;
      }
      if (act === "select") {
        selectVoice(id);
        return;
      }
      if (act === "remove") {
        const next = getSafeCloneVoices().filter((x) => x.id !== id);
        await saveCloneVoicesToJsonAndLocal(next);
        if (getActiveVoiceId() === id) setActiveVoiceId("");
        renderVoicePicked();
        renderVoiceModal();
      }
    });

    btnAddCloneVoice.addEventListener("click", openCloneModal);
    btnRefreshVoices?.addEventListener("click", async () => {
      stopPreviewAudio();
      try {
        await syncCloneVoicesFromJsonToLocal();
        ensureActiveVoiceMatchesCurrentTts({ showToast: false });
        renderVoicePicked();
        renderVoiceModal();
        toast("音色列表已刷新。");
      } catch (e) {
        toast(String(e?.message || e || "音色列表刷新失败。"));
      }
    });
    voiceOverlay.addEventListener("click", closeVoiceModal);
    voiceModalClose.addEventListener("click", closeVoiceModal);

    cloneOverlay.addEventListener("click", closeCloneModal);
    cloneModalClose.addEventListener("click", closeCloneModal);
    cloneCancel.addEventListener("click", closeCloneModal);
    cloneModelSelect?.addEventListener("change", () => {
      homeCloneModelId = String(cloneModelSelect?.value || "").trim();
      renderHomeCloneModelSelect();
    });
    homeRunModeSelect?.addEventListener("change", async () => {
      const nextMode = writeHomeRunModeValue(homeRunModeSelect.value);
      await applyHomeRunMode({ showToast: !!nextMode });
    });

    clonePickFile.addEventListener("click", async () => {
      const res = await window.api?.openFile?.();
      if (!res || res.canceled) return;
      const fp = String(res.filePaths?.[0] || "").trim();
      if (!fp) return;
      const selectedCloneModel = resolveSelectedCloneModel(homeCloneModelId || cloneModelSelect?.value, homeMediaBundleCatalog);
      const minSeconds = getRecommendedCloneMinSeconds(selectedCloneModel);
      try {
        const check = await validateCloneReferenceDuration({
          filePath: fp,
          minSeconds
        });
        if (!check?.ok) {
          pickedPromptFilePath = "";
          recordedBlob = null;
          cloneAudioStatus.textContent = `音频不足 ${minSeconds} 秒`;
          cloneAudioStatus.title = "";
          updateClonePreviewBtnState();
          toast(String(check?.message || `最少录制时间要达到${minSeconds}秒`));
          return;
        }
      } catch {
        toast("无法读取参考音频时长。");
        return;
      }
      pickedPromptFilePath = fp;
      recordedBlob = null;
      cloneAudioStatus.textContent = "已选择文件";
      cloneAudioStatus.title = fp;
      updateClonePreviewBtnState();
    });

    cloneRecord.addEventListener("click", async () => {
      if (mediaRecorder) return;
      stopPreviewAudio();
      recordedBlob = null;
      pickedPromptFilePath = "";
      recordChunks = [];
      cloneAudioStatus.textContent = "录制中...";
      cloneAudioStatus.title = "";
      updateClonePreviewBtnState();
      try {
        const deviceId = cloneMic.value || undefined;
        micStream = await navigator.mediaDevices.getUserMedia({
          audio: deviceId ? { deviceId: { exact: deviceId } } : true
        });
        startWave(micStream);
        mediaRecorder = new MediaRecorder(micStream);
        mediaRecorder.ondataavailable = (ev) => {
          if (ev.data && ev.data.size > 0) recordChunks.push(ev.data);
        };
        mediaRecorder.onstop = async () => {
          recordedBlob = new Blob(recordChunks, { type: mediaRecorder?.mimeType || "audio/webm" });
          recordChunks = [];
          const selectedCloneModel = resolveSelectedCloneModel(homeCloneModelId || cloneModelSelect?.value, homeMediaBundleCatalog);
          const minSeconds = getRecommendedCloneMinSeconds(selectedCloneModel);
          try {
            const fallbackDuration = Math.max(0, (Date.now() - recordingStartAt) / 1000);
            const check = await validateCloneReferenceDuration({
              blob: recordedBlob,
              fallbackDuration,
              minSeconds
            });
            if (!check?.ok) {
              recordedBlob = null;
              cloneAudioStatus.textContent = `录制不足 ${minSeconds} 秒`;
              cloneAudioStatus.title = "";
              toast(String(check?.message || `最少录制时间要达到${minSeconds}秒`));
            } else {
              cloneAudioStatus.textContent = `已录制 ${Math.floor(Number(check.duration || 0))}s`;
              cloneAudioStatus.title = "";
            }
          } catch {
            const fallbackDuration = Math.max(0, (Date.now() - recordingStartAt) / 1000);
            if (fallbackDuration + 0.05 >= minSeconds) {
              cloneAudioStatus.textContent = `已录制 ${Math.floor(fallbackDuration)}s`;
              cloneAudioStatus.title = "";
            } else {
              recordedBlob = null;
              cloneAudioStatus.textContent = `录制不足 ${minSeconds} 秒`;
              cloneAudioStatus.title = "";
              toast(`最少录制时间要达到${minSeconds}秒`);
            }
          }
          cloneAudioStatus.title = "";
          updateClonePreviewBtnState();
          try {
            micStream?.getTracks?.().forEach((t) => t.stop());
          } catch {}
          micStream = null;
          mediaRecorder = null;
          cloneRecord.disabled = false;
          cloneStop.disabled = true;
          stopWave();
          if (recordingTimer) {
            clearInterval(recordingTimer);
            recordingTimer = null;
          }
        };
        mediaRecorder.start();
        recordingStartAt = Date.now();
        cloneRecord.disabled = true;
        cloneStop.disabled = false;
        recordingTimer = setInterval(() => {
          const sec = Math.floor((Date.now() - recordingStartAt) / 1000);
          cloneAudioStatus.textContent = `录制中 ${sec}s`;
        }, 400);
      } catch {
        cloneAudioStatus.textContent = "录制失败";
        cloneRecord.disabled = false;
        cloneStop.disabled = true;
        stopWave();
        try {
          micStream?.getTracks?.().forEach((t) => t.stop());
        } catch {}
        micStream = null;
        mediaRecorder = null;
      }
    });

    cloneStop.addEventListener("click", () => {
      try {
        mediaRecorder?.stop?.();
      } catch {}
    });
    clonePreview?.addEventListener("click", () => {
      playCloneReferenceAudio().catch(() => {
        stopPreviewAudio();
        toast("无法试听当前参考音频。");
      });
    });

    cloneCreate.addEventListener("click", async () => {
      const name = String(cloneName.value || "").trim();
      const refText = String(cloneRefText.value || "").trim();
      const selectedCloneModel = resolveSelectedCloneModel(homeCloneModelId || cloneModelSelect?.value, homeMediaBundleCatalog);
      if (!name) {
        toast("请输入音色名称。");
        cloneName.focus();
        return;
      }
      if (!refText) {
        toast("请输入参考文字。");
        cloneRefText.focus();
        return;
      }
      if (!recordedBlob && !pickedPromptFilePath) {
        toast("请录制或选择参考音频。");
        return;
      }
      if (!selectedCloneModel) {
        toast("当前暂无可用克隆模型。");
        return;
      }
      try {
        const check = await validateCloneReferenceDuration({
          blob: recordedBlob,
          filePath: pickedPromptFilePath,
          minSeconds: getRecommendedCloneMinSeconds(selectedCloneModel)
        });
        if (!check?.ok) {
          toast(String(check?.message || `最少录制时间要达到${getRecommendedCloneMinSeconds(selectedCloneModel)}秒`));
          return;
        }
      } catch {
        toast("无法读取参考音频时长。");
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
      try {
        const isCloudClone = isAliyunCosyVoiceSelection(selectedCloneModel);
        let cloudCloneSelection = selectedCloneModel;
        let publicAudioUrl = "";
        if (isCloudClone) {
          cloudCloneSelection = await resolveSelectedCloneModel(cloneModelSelect?.value, homeMediaBundleCatalog);
          const apiKey = await resolveCloudApiKeyByProvider("aliyun-bailian");
          if (!apiKey) {
            toast("当前账号还没有可用的阿里云百炼 Key。");
            pushCloneLog("warn", "当前账号还没有可用的阿里云百炼 Key。");
            cloneCreate.disabled = false;
            cloneCreate.textContent = "一键复刻";
            cloneCancelGen.disabled = true;
            return;
          }
          publicAudioUrl = "";
          const uploadRes = await uploadCloneReferenceAudio({
            recordedBlob,
            filePath: pickedPromptFilePath,
            setStatus: (label, detail) => {
              pushCloneLog("info", detail ? `${label}：${detail}` : label);
            }
          });
          if (!uploadRes?.ok || !uploadRes?.url) {
            toast(String(uploadRes?.message || "云端参考音频上传失败。"));
            pushCloneLog("warn", String(uploadRes?.message || "云端参考音频上传失败"));
            cloneCreate.disabled = false;
            cloneCreate.textContent = "一键复刻";
            cloneCancelGen.disabled = true;
            return;
          }
          publicAudioUrl = String(uploadRes.url || "").trim();
          cloudCloneSelection = {
            ...selectedCloneModel,
            modelChoice: {
              ...(selectedCloneModel?.modelChoice || {}),
              apiKey
            }
          };
          pushCloneLog("info", `当前克隆模型：${String(cloudCloneSelection?.label || "").trim() || "阿里云 CosyVoice"}`);
        } else {
          pushCloneLog("info", `当前克隆模型：${String(selectedCloneModel?.label || "").trim() || "本地模型"}`);
        }
        let res = null;
        if (pickedPromptFilePath) {
          res = await window.api?.voice?.cloneCreateFromFile?.({
            name,
            refText,
            filePath: pickedPromptFilePath,
            taskId: currentCloneTaskId,
            publicAudioUrl,
            modelChoice: (cloudCloneSelection || selectedCloneModel)?.modelChoice || null
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
            modelChoice: (cloudCloneSelection || selectedCloneModel)?.modelChoice || null
          });
        }

        if (!res?.ok || !res?.voice) {
          toast("复刻失败，请查看运行日志。");
          appendLogLine({ taskId: currentTaskId, level: "warn", message: String(res?.message || "") });
          pushCloneLog("warn", String(res?.message || "复刻失败"));
          cloneCreate.disabled = false;
          cloneCreate.textContent = "一键复刻";
          cloneCancelGen.disabled = true;
          return;
        }

        pendingCloneVoice = res.voice;
        cloneAudioStatus.textContent = "已生成预览";
        cloneAudioStatus.title = String(res.voice.previewWavPath || "");
        cloneSave.disabled = false;
        cloneCreate.disabled = false;
        cloneCreate.textContent = "一键复刻";
        cloneCancelGen.disabled = true;
        toast("复刻完成，请点击保存。");
      } catch (e) {
        toast("复刻失败，请查看运行日志。");
        appendLogLine({ taskId: currentTaskId, level: "error", message: String(e?.message || e) });
        pushCloneLog("error", String(e?.message || e));
        cloneCreate.disabled = false;
        cloneCreate.textContent = "一键复刻";
        cloneCancelGen.disabled = true;
      }
    });

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
        cloneCreate.textContent = "一键复刻";
      }
    });

    cloneSave.addEventListener("click", async () => {
      if (!pendingCloneVoice?.id) return;
      await upsertCloneVoiceToStorage(pendingCloneVoice);
      setActiveVoiceId(pendingCloneVoice.id);
      renderVoicePicked();
      closeCloneModal();
      voiceTab = "clone";
      renderVoiceModal();
      toast("已保存克隆音色。");
    });

    const startGenerateAudio = async () => {
      const voiceId = String(getActiveVoiceId() || "").trim();
      const activeCloneVoice = getSafeCloneVoices().find((item) => String(item?.id || "").trim() === voiceId) || null;
      if (!voiceId) {
        toast("请先选择音色。");
        return;
      }
      const text = String(copyEditContent?.value || "").trim();
      if (!text) {
        toast("请先在“视频文案编辑”填写文案内容。");
        return;
      }
      if (!window.api?.voice?.generateSpeech) {
        toast("语音生成能力未就绪，请检查模型包或重启软件。");
        return;
      }

      const speed = Number(audioSpeed?.value || 1.0) || 1.0;
      const emotion = String(audioEmotion?.value || "").trim();
      const language = String(audioLanguage?.value || "").trim();
      const ttsOption = getSelectedHomeMediaOption("TTS");
      let effectiveModelChoice = ttsOption?.modelChoice || null;
      if (String(ttsOption?.modelChoice?.source || "").trim() === "cloud" && String(ttsOption?.modelChoice?.providerId || "").trim() === "aliyun-bailian") {
        const apiKey = await resolveCloudApiKeyByProvider("aliyun-bailian");
        if (!apiKey) {
          toast("当前登录账号下还没有可用的阿里云百炼 Key，请先到模型菜单确认已保存到当前软件账号。");
          return;
        }
        if (voiceId.startsWith("sys_")) {
          const sysVoice = SYSTEM_VOICES.find((item) => item.id === voiceId) || null;
          if (!sysVoice?.aliyunVoiceId) {
            toast("当前系统音色没有匹配到云端 CosyVoice 音色。");
            return;
          }
          effectiveModelChoice = {
            ...(ttsOption?.modelChoice || {}),
            apiKey,
            voice: sysVoice.aliyunVoiceId
          };
        } else if (String(activeCloneVoice?.source || "").trim() === "cloud" && String(activeCloneVoice?.providerId || "").trim() === "aliyun-bailian") {
          const targetModel = String(activeCloneVoice?.targetModel || "").trim();
          const currentModel = String(ttsOption?.modelChoice?.modelId || ttsOption?.modelChoice?.model || "").trim();
          if (targetModel && currentModel && targetModel !== currentModel) {
            toast(`当前云端克隆音色绑定的是 ${targetModel}，请把 TTS 模型切换为相同模型后再生成。`);
            return;
          }
          effectiveModelChoice = {
            ...(ttsOption?.modelChoice || {}),
            apiKey,
            voice: String(activeCloneVoice?.id || "").trim()
          };
        } else {
          toast("当前所选云端 TTS 仅支持系统音色或阿里云云端克隆音色。");
          return;
        }
      } else if (String(activeCloneVoice?.source || "").trim() === "cloud") {
        toast("当前选中的云端克隆音色需要切换到云端 TTS 模型后再生成。");
        return;
      }

      currentAudioTaskId = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
      clearAudioLog();
      pushAudioLog("info", `任务已创建：${currentAudioTaskId}`);
      updateAudioGenerateBtnState();

      const thisTaskId = currentAudioTaskId;
      try {
        const res = await window.api.voice.generateSpeech({
          taskId: thisTaskId,
          voiceId,
          text,
          speed,
          emotion,
          language,
          modelChoice: effectiveModelChoice
        });

        if (thisTaskId !== currentAudioTaskId) return;
        if (res?.canceled) {
          pushAudioLog("warn", "已停止当前语音生成。");
          return;
        }
        if (!res?.ok || !res?.audioPath) {
          toast("生成失败，请查看运行日志。");
          pushAudioLog("warn", String(res?.message || "生成失败"));
          return;
        }

        const item = {
          id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
          createdAt: Date.now(),
          audioPath: String(res.audioPath || ""),
          voiceId,
          speed,
          emotion,
          language
        };
        const list = [item, ...readAudioHistory()];
        writeAudioHistory(list);
        renderAudioHistory();
        setAudioSource(item.audioPath);
        toast("语音已生成，可直接播放试听。");
      } catch (e) {
        if (thisTaskId !== currentAudioTaskId) return;
        const message = String(e?.message || e);
        if (!/canceled/i.test(message)) toast("生成失败，请查看运行日志。");
        pushAudioLog(/canceled/i.test(message) ? "warn" : "error", message);
      } finally {
        if (thisTaskId === currentAudioTaskId) currentAudioTaskId = "";
        updateAudioGenerateBtnState();
      }
    };
    const cancelCurrentAudioGenerate = async ({ showToast = true } = {}) => {
      const taskId = String(currentAudioTaskId || "").trim();
      if (!taskId) return false;
      pushAudioLog("warn", "正在请求停止生成...");
      try {
        const res = await window.api?.voice?.cancel?.(taskId);
        if (!res?.ok) pushAudioLog("warn", String(res?.message || "停止失败"));
        else if (showToast) toast("已请求停止语音生成。");
      } catch (e) {
        pushAudioLog("error", String(e?.message || e));
      }
      return true;
    };
    btnGenAudio?.addEventListener("click", () => {
      if (currentAudioTaskId) {
        cancelCurrentAudioGenerate().catch(() => {});
        return;
      }
      startGenerateAudio();
    });

    audioPlayBtn?.addEventListener("click", async () => {
      if (!audioEl || !audioEl.src) {
        toast("请先生成或选择一条历史音频。");
        return;
      }
      try {
        if (audioEl.paused) {
          await audioEl.play();
          setAudioPlayingUI(true);
        } else {
          audioEl.pause();
          setAudioPlayingUI(false);
        }
      } catch {
        toast("无法播放音频。");
      }
    });

    audioEl?.addEventListener("loadedmetadata", () => {
      setAudioTimeText();
      setAudioSeekValueFromEl();
    });
    audioEl?.addEventListener("timeupdate", () => {
      setAudioTimeText();
      setAudioSeekValueFromEl();
    });
    audioEl?.addEventListener("ended", () => {
      setAudioPlayingUI(false);
      setAudioTimeText();
      setAudioSeekValueFromEl();
    });

    audioSeek?.addEventListener("input", () => {
      if (!audioEl) return;
      const dur = Number(audioEl.duration || 0);
      if (!Number.isFinite(dur) || dur <= 0) return;
      const v = Number(audioSeek.value || 0);
      const t = Math.max(0, Math.min(dur, (v / 1000) * dur));
      audioEl.currentTime = t;
      setAudioTimeText();
    });

    audioHistory?.addEventListener("change", () => {
      const id = String(audioHistory.value || "");
      if (!id) return;
      const item = (audioHistoryCache || []).find((x) => String(x?.id || "") === id);
      if (!item?.audioPath) return;
      setAudioSource(item.audioPath);
    });
    audioRefresh?.addEventListener("click", renderAudioHistory);
    renderAudioHistory();

    homeAvatarSelect?.addEventListener("change", () => {
      const id = String(homeAvatarSelect.value || "").trim();
      const item = (homeAvatarCache || []).find((x) => String(x?.id || "") === id) || null;
      localStorage.setItem(HOME_ACTIVE_AVATAR_KEY, id);
      setHomeVideoSource(String(item?.videoPath || ""), { asBase: true });
      updateTalkingBtnState();
    });
    refreshHomeAvatars();

    const AGENT_CFG_KEY = "ipfactory.agent.config";

    const readAgentCfg = () => {
      try {
        const raw = localStorage.getItem(AGENT_CFG_KEY);
        const obj = JSON.parse(raw || "{}");
        return obj && typeof obj === "object" ? obj : {};
      } catch {
        return {};
      }
    };

    const writeAgentCfg = (cfg) => {
      try {
        localStorage.setItem(AGENT_CFG_KEY, JSON.stringify(cfg || {}, null, 2));
      } catch {}
    };

    const setAgentTab = (tab) => {
      const t = String(tab || "model");
      agentActiveTab = t;
      Array.from(agentTabs?.querySelectorAll?.("[data-agent-tab]") || []).forEach((b) => {
        b.classList.toggle("is-active", b.getAttribute("data-agent-tab") === t);
      });
      Array.from(agentModal?.querySelectorAll?.("[data-agent-panel]") || []).forEach((p) => {
        p.classList.toggle("is-active", p.getAttribute("data-agent-panel") === t);
      });
    };

    const renderAgentCfg = () => {
      const cfg = readAgentCfg();
      const cloudLlms = getCloudLlms();
      const activeCloudId = getActiveCloudLlmId();
      const options = cloudLlms.length
        ? cloudLlms
            .map((x) => {
              const id = String(x?.id || "");
              const label = String(x?.name || x?.model || id || "未命名");
              return `<option value="${id}">${label}</option>`;
            })
            .join("")
        : `<option value="" selected>未配置云端模型（去“模型”页添加）</option>`;
      if (agentLlm) agentLlm.innerHTML = options;
      if (agentLlm && cloudLlms.length) {
        const saved = String(cfg?.llmId || "");
        agentLlm.value = saved || activeCloudId || cloudLlms[0]?.id || "";
      }
      if (agentVideoWeight) agentVideoWeight.value = String(cfg?.videosync?.human_weight || "256m");
      if (agentVideoBatch) agentVideoBatch.value = String(cfg?.videosync?.batch_size || "2");
      if (agentVideoWeightType) agentVideoWeightType.value = String(cfg?.videosync?.weight_type || "fp16");

      const selectedLlmId = String(agentLlm?.value || cfg?.llmId || activeCloudId || cloudLlms[0]?.id || "");
      const selectedCloud = cloudLlms.find((x) => x?.id === selectedLlmId) || null;
      if (agentSystemPrompt) agentSystemPrompt.value = String(cfg?.prompts?.system || selectedCloud?.systemPrompt || "");
      if (agentRewritePrompt) agentRewritePrompt.value = String(cfg?.prompts?.rewrite || rewritePromptTemplate || "");
      if (agentLegalPrompt) agentLegalPrompt.value = String(cfg?.prompts?.legal || legalPromptTemplate || "");
      if (agentIpBrainTitlePrompt) agentIpBrainTitlePrompt.value = String(cfg?.prompts?.ipbrainTitle || DEFAULT_IPBRAIN_TITLE_PROMPT || "");
      if (agentIpBrainSpeechPrompt)
        agentIpBrainSpeechPrompt.value = String(cfg?.prompts?.ipbrainSpeech || DEFAULT_IPBRAIN_SPEECH_PROMPT || "");
      if (agentHotcopyPrompt) agentHotcopyPrompt.value = String(cfg?.prompts?.hotcopy || DEFAULT_HOTCOPY_PROMPT_TEMPLATE || "");
      if (agentMetaPrompt) agentMetaPrompt.value = String(cfg?.prompts?.meta || DEFAULT_META_PROMPT || "");

      if (agentSubEnable) agentSubEnable.checked = cfg?.subtitle?.enable !== false;
      if (agentSubPos) agentSubPos.value = String(cfg?.subtitle?.pos || "bottom");
      if (agentSubSize) agentSubSize.value = String(cfg?.subtitle?.size || "48");
      if (agentSubStyle) agentSubStyle.value = String(cfg?.subtitle?.style || "clean");

      if (agentRatio) agentRatio.value = String(cfg?.other?.ratio || "9:16");
      if (agentFps) agentFps.value = String(cfg?.other?.fps || "25");
      if (agentLegal) agentLegal.checked = cfg?.other?.legal !== false;

      if (agentPipEnable) agentPipEnable.checked = cfg?.pip?.enable === true;
      if (agentPipPos) agentPipPos.value = String(cfg?.pip?.pos || "tr");
      if (agentPipScale) agentPipScale.value = String(cfg?.pip?.scale || "0.35");
      if (agentPipRadius) agentPipRadius.value = String(cfg?.pip?.radius || "16");
    };

    const openAgent = () => {
      if (!agentOverlay || !agentModal) return;
      agentOverlay.hidden = false;
      agentModal.hidden = false;
      renderAgentCfg();
      setAgentTab(agentActiveTab || "model");
    };

    const closeAgent = () => {
      if (!agentOverlay || !agentModal) return;
      agentOverlay.hidden = true;
      agentModal.hidden = true;
    };

    btnAgentConfig?.addEventListener("click", openAgent);
    agentOverlay?.addEventListener("click", closeAgent);
    agentModalClose?.addEventListener("click", closeAgent);
    agentCancel?.addEventListener("click", closeAgent);
    agentTabs?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-agent-tab]");
      if (!btn) return;
      setAgentTab(btn.getAttribute("data-agent-tab"));
    });
    agentSave?.addEventListener("click", () => {
      const next = {
        llmId: String(agentLlm?.value || ""),
        videosync: {
          human_weight: String(agentVideoWeight?.value || "256m"),
          batch_size: Number(agentVideoBatch?.value || 2) || 2,
          weight_type: String(agentVideoWeightType?.value || "fp16")
        },
        prompts: {
          system: String(agentSystemPrompt?.value || ""),
          rewrite: String(agentRewritePrompt?.value || ""),
          legal: String(agentLegalPrompt?.value || ""),
          ipbrainTitle: String(agentIpBrainTitlePrompt?.value || ""),
          ipbrainSpeech: String(agentIpBrainSpeechPrompt?.value || ""),
          hotcopy: String(agentHotcopyPrompt?.value || ""),
          meta: String(agentMetaPrompt?.value || "")
        },
        subtitle: {
          enable: agentSubEnable?.checked !== false,
          pos: String(agentSubPos?.value || "bottom"),
          size: Number(agentSubSize?.value || 48) || 48,
          style: String(agentSubStyle?.value || "clean")
        },
        other: {
          ratio: String(agentRatio?.value || "9:16"),
          fps: Number(agentFps?.value || 25) || 25,
          legal: agentLegal?.checked !== false
        },
        pip: {
          enable: agentPipEnable?.checked === true,
          pos: String(agentPipPos?.value || "tr"),
          scale: Number(agentPipScale?.value || 0.35) || 0.35,
          radius: Number(agentPipRadius?.value || 16) || 16
        }
      };
      writeAgentCfg(next);
      closeAgent();
      toast("已保存智能体配置。");
    });

    if (window.__ipfactoryAvatarChangedUnsub) {
      try {
        window.removeEventListener("ipfactory:avatarChanged", window.__ipfactoryAvatarChangedUnsub);
      } catch {}
      window.__ipfactoryAvatarChangedUnsub = null;
    }
    window.__ipfactoryAvatarChangedUnsub = () => {
      refreshHomeAvatars();
    };
    window.addEventListener("ipfactory:avatarChanged", window.__ipfactoryAvatarChangedUnsub);

    const startTalkingVideo = async () => {
      if (homeVideoGenerating) {
        const tid = String(homeVideoTaskId || "").trim();
        if (!tid) return;
        if (homeVideoStopping) return;
        homeVideoStopping = true;
        updateTalkingBtnState();
        try {
          const res = await window.api?.video?.cancel?.(tid);
          if (!res?.ok) {
            toast("停止失败，请查看运行日志。");
            homeVideoStopping = false;
            updateTalkingBtnState();
            return;
          }
        } catch {}
        homeVideoTaskId = "";
        homeTalkingVideoPath = "";
        setHomeVideoGeneratingUI(false, "");
        setHomeVideoSource(homeSelectedAvatarVideoPath, { asBase: true });
        homeVideoStopping = false;
        updateTalkingBtnState();
        return;
      }

      if (homeVideoStopping) return;
      const avatarId = String(homeAvatarSelect?.value || "").trim();
      if (!avatarId) return;
      const avatar = (homeAvatarCache || []).find((x) => String(x?.id || "") === avatarId) || null;
      const videoPath = String(avatar?.videoPath || "").trim();
      const audioPath = String(homeSelectedAudioPath || "").trim();
      if (!audioPath) {
        toast("请先选择音频。");
        return;
      }
      if (!videoPath) {
        toast("请先选择数字人形象。");
        return;
      }
      if (!window.api?.video?.generateTalkingVideo) {
        toast("数字人生成能力未就绪，请检查 video_sync_bundle。");
        return;
      }

      const currentHomeVideoTaskId = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
      homeVideoTaskId = currentHomeVideoTaskId;
      setHomeVideoGeneratingUI(true, "正在启动数字人模型...");
      updateTalkingBtnState();

      const baseVideo = videoPath;
      try {
        const modelChoice = await hydrateHomeMediaChoice("VideoSync");
        const res = await window.api.video.generateTalkingVideo({
          taskId: currentHomeVideoTaskId,
          videoPath,
          audioPath,
          modelChoice
        });
        if (String(res?.taskId || "") !== String(currentHomeVideoTaskId || "")) {
          return;
        }
        if (res?.canceled) {
          setHomeVideoGeneratingUI(false, "");
          setHomeVideoSource(baseVideo, { asBase: true });
          updateTalkingBtnState();
          return;
        }
        if (!res?.ok || !res?.videoPath) {
          toast("生成失败，请查看运行日志。");
          setHomeVideoGeneratingUI(false, "");
          setHomeVideoSource(baseVideo, { asBase: true });
          updateTalkingBtnState();
          return;
        }
        homeTalkingVideoPath = String(res.videoPath || "");
        setHomeVideoGeneratingUI(false, "");
        setHomeVideoSource(homeTalkingVideoPath);
        updateTalkingBtnState();
        toast("口播视频已生成。");
      } catch (e) {
        const msg = String(e?.message || e);
        if (!/canceled/i.test(msg)) toast("生成失败，请查看运行日志。");
        setHomeVideoGeneratingUI(false, "");
        setHomeVideoSource(baseVideo, { asBase: true });
        updateTalkingBtnState();
      } finally {
        if (!homeVideoTaskId || homeVideoTaskId === currentHomeVideoTaskId) {
          setHomeVideoGeneratingUI(false, "");
          homeVideoTaskId = "";
          homeVideoStopping = false;
        }
        homeVideoGenerating = false;
        updateTalkingBtnState();
      }
    };

    btnGenTalking?.addEventListener("click", startTalkingVideo);

    if (window.__ipfactoryVideoProgressUnsub) {
      try {
        window.__ipfactoryVideoProgressUnsub();
      } catch {}
      window.__ipfactoryVideoProgressUnsub = null;
    }
    window.__ipfactoryVideoProgressUnsub = window.api?.video?.onProgress?.((data) => {
      const taskId = String(data?.taskId || "");
      if (!taskId) return;
      if (!homeVideoGenerating) return;
      if (homeVideoTaskId && taskId !== homeVideoTaskId) return;
      const p = Number(data?.progress || 0) || 0;
      const m = String(data?.message || "");
      if (homeVideoGenSub) homeVideoGenSub.textContent = m ? `${m}${p ? `（${p}%）` : ""}` : `${p ? `进度 ${p}%` : "生成中..."}`;
    });

    if (window.__ipfactoryVideoLogUnsub) {
      try {
        window.__ipfactoryVideoLogUnsub();
      } catch {}
      window.__ipfactoryVideoLogUnsub = null;
    }
    window.__ipfactoryVideoLogUnsub = window.api?.video?.onLog?.((data) => {
      const taskId = String(data?.taskId || "");
      if (!taskId) return;
      if (homeVideoTaskId && taskId !== homeVideoTaskId) return;
      const level = data?.level || "info";
      const message = data?.message || "";
      appendLogLine({ taskId: `video:${taskId}`, level, message });
      if (homeVideoGenerating && homeVideoGenSub && message) {
        const s = String(message || "").trim();
        if (s) homeVideoGenSub.textContent = s.length > 80 ? `${s.slice(0, 80)}...` : s;
      }
    });

    if (window.__ipfactoryVoiceLogUnsub) {
      try {
        window.__ipfactoryVoiceLogUnsub();
      } catch {}
      window.__ipfactoryVoiceLogUnsub = null;
    }
    window.__ipfactoryVoiceLogUnsub = window.api?.voice?.onLog?.((data) => {
      const taskId = String(data?.taskId || "");
      if (!taskId) return;
      const level = data?.level || "info";
      const message = data?.message || "";
      if (currentCloneTaskId && taskId === currentCloneTaskId) pushCloneLog(level, message);
      if (currentAudioTaskId && taskId === currentAudioTaskId) pushAudioLog(level, message);
      if (
        (currentCloneTaskId && taskId === currentCloneTaskId) ||
        (currentAudioTaskId && taskId === currentAudioTaskId) ||
        (!currentCloneTaskId && !currentAudioTaskId)
      ) {
        appendLogLine({ taskId: `voice:${taskId}`, level, message });
      }
    });

    if (window.__ipfactorySubBgmProgressUnsub) {
      try {
        window.__ipfactorySubBgmProgressUnsub();
      } catch {}
      window.__ipfactorySubBgmProgressUnsub = null;
    }
    window.__ipfactorySubBgmProgressUnsub = window.api?.subBgm?.onProgress?.((data) => {
      const taskId = String(data?.taskId || "");
      if (!taskId) return;
      if (homeSubBgmTaskId && taskId !== homeSubBgmTaskId) return;
      const p = Math.max(0, Math.min(100, Number(data?.progress || 0) || 0));
      const m = String(data?.message || "").trim();
      if (btnAutoBgm && homeSubBgmTaskId && !homeSubBgmStopping) btnAutoBgm.textContent = `停止生成字幕和背景音乐${p ? ` ${p}%` : ""}`;
      const pct = Math.floor(p);
      const msg = m || (pct ? `合成进度 ${pct}%` : "");
      const shouldLogByMsg = msg && msg !== homeSubBgmLastLoggedMsg;
      const shouldLogByPct = pct > 0 && pct < 100 && (homeSubBgmLastLoggedPct < 0 || pct - homeSubBgmLastLoggedPct >= 5);
      if (shouldLogByMsg || shouldLogByPct) {
        appendLogLine({ taskId: `subbgm:${taskId}`, level: "info", message: msg || `合成进度 ${pct}%` });
        homeSubBgmLastLoggedPct = pct;
        homeSubBgmLastLoggedMsg = msg;
      }
    });

    if (window.__ipfactorySubBgmLogUnsub) {
      try {
        window.__ipfactorySubBgmLogUnsub();
      } catch {}
      window.__ipfactorySubBgmLogUnsub = null;
    }
    window.__ipfactorySubBgmLogUnsub = window.api?.subBgm?.onLog?.((data) => {
      const taskId = String(data?.taskId || "");
      if (!taskId) return;
      if (homeSubBgmTaskId && taskId !== homeSubBgmTaskId) return;
      const level = data?.level || "info";
      const message = data?.message || "";
      appendLogLine({ taskId: `subbgm:${taskId}`, level, message });
    });

    const runRewrite = async ({ content, count = 300, source = "auto" } = {}) => {
      if (rewriting) return;
      const prevContent = String(copyEditContent?.value || "");
      rewriting = true;
      rewriteCancelRequested = false;
      rewriteRunId += 1;
      const thisRunId = rewriteRunId;
      rewriteTaskId = `rewrite_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      updateRewriteBtnState();
      try {
        const cfg = readAgentCfg();
        const active = ensureHomeCloudLlmReady(HOME_LLM_KEYS.copyEdit, "请先在“模型-云端大模型”中配置文案处理模型。");
        if (!active) return;
        const systemPrompt = String(cfg?.prompts?.system || "").trim() || String(active?.systemPrompt || "").trim();

        let base = sanitizeText(content || "");
        let finalPrompt = String(cfg?.prompts?.rewrite || "").trim() || rewritePromptTemplate;
        let finalCount = Number(count || 0) || 300;

        if (ipStudyTab === "ip") {
          const theme = String(ipbrainActiveTopic || "").trim();
          if (!theme) {
            toast("请先在选题库选择一个标题。");
            return;
          }
          const desired = Number(String(copyWordCount?.value || "").trim());
          finalCount = Number.isFinite(desired) && desired > 30 ? desired : 300;
          base = theme;
          finalPrompt = String(cfg?.prompts?.ipbrainSpeech || "").trim() || DEFAULT_IPBRAIN_SPEECH_PROMPT;
          finalPrompt = finalPrompt.replaceAll("${TITLE}", theme).replaceAll("${COUNT}", String(finalCount));
        } else {
          if (!base) {
            toast("没有可改写的内容。");
            return;
          }
        }

        appendLogLine({ taskId: currentTaskId, level: "info", message: `开始智能改写（${source}，目标字数 ${finalCount}）` });
        copyEditContent.value = "智能改写中...";

        const res = await window.api?.llm?.rewrite?.({
          taskId: rewriteTaskId,
          content: base,
          count: finalCount,
          prompt: finalPrompt,
          model: active?.model || "",
          endpoint: active?.endpoint || "",
          apiKey: active?.apiKey || "",
          systemPrompt
        });

        if (thisRunId !== rewriteRunId) return;
        if (rewriteCancelRequested || res?.canceled) {
          if (copyEditContent.value === "智能改写中...") copyEditContent.value = prevContent || base;
          updateCopyWordCount();
          appendLogLine({ taskId: rewriteTaskId || currentTaskId, level: "warn", message: "已停止当前改写任务。" });
          return;
        }

        if (res?.ok && res?.content) {
          const out = sanitizeText(res.content);
          copyEditContent.value = out || (ipStudyTab === "ip" ? base : rewriteByPrompt(base, finalCount));
          updateCopyWordCount();
          appendLogLine({
            taskId: currentTaskId,
            level: "info",
            message: `智能改写完成（输出字数 ${getCompactLen(copyEditContent.value)}）`
          });
          return;
        }

        appendLogLine({
          taskId: currentTaskId,
          level: "warn",
          message: `大模型改写失败：${String(res?.message || "")}`
        });
      } catch (e) {
        if (thisRunId !== rewriteRunId) return;
        if (copyEditContent.value === "智能改写中...") copyEditContent.value = prevContent || String(content || "");
        updateCopyWordCount();
        appendLogLine({
          taskId: rewriteTaskId || currentTaskId,
          level: /canceled/i.test(String(e?.message || e)) ? "warn" : "error",
          message: `大模型改写异常：${String(e?.message || e)}`
        });
      } finally {
        if (thisRunId === rewriteRunId) {
          rewriting = false;
          rewriteCancelRequested = false;
          rewriteTaskId = "";
          updateRewriteBtnState();
        }
      }
    };

    const legalOverlay = root.querySelector("#legal-modal-overlay");
    const legalModal = root.querySelector("#legal-modal");
    const legalProgressText = root.querySelector("#legal-progress-text");
    const legalReportOverlay = root.querySelector("#legal-report-overlay");
    const legalReportModal = root.querySelector("#legal-report-modal");
    const legalBanner = root.querySelector("#legal-banner");
    const legalBannerTitle = root.querySelector("#legal-banner-title");
    const legalBannerSub = root.querySelector("#legal-banner-sub");
    const legalOrigin = root.querySelector("#legal-origin");
    const legalFixed = root.querySelector("#legal-fixed");
    const legalAnalysis = root.querySelector("#legal-analysis");
    const legalRisks = root.querySelector("#legal-risks");
    const legalReportClose = root.querySelector("#legal-report-close");
    const legalReportCloseX = root.querySelector("#legal-report-close-x");
    const legalReportApply = root.querySelector("#legal-report-apply");
    let lastLegalFixedText = "";

    const openLegal = (text) => {
      legalProgressText.textContent = text || "正在检查违禁词、敏感词、极限词等法律风险...";
      legalOverlay.hidden = false;
      legalModal.hidden = false;
    };

    const closeLegal = () => {
      legalOverlay.hidden = true;
      legalModal.hidden = true;
    };

    root.querySelector("#legal-modal-close").addEventListener("click", closeLegal);
    root.querySelector("#legal-cancel").addEventListener("click", closeLegal);
    legalOverlay.addEventListener("click", closeLegal);

    const escapeHtml = (s) => {
      return String(s || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    };

    const highlight = (text, words) => {
      const src = String(text || "");
      const list = Array.from(new Set((words || []).map((w) => String(w || "").trim()).filter(Boolean)));
      if (!src) return "";
      if (!list.length) return escapeHtml(src);
      const escaped = list
        .sort((a, b) => b.length - a.length)
        .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
      const re = new RegExp(`(${escaped.join("|")})`, "g");
      return escapeHtml(src).replace(re, `<span class="risk-mark">$1</span>`);
    };

    const openLegalReport = ({ originalText, report, modelName }) => {
      const risks = Array.isArray(report?.risks) ? report.risks : [];
      const hasRisk = Boolean(report?.hasRisk);
      const fixedText = String(report?.fixedText || "").trim();
      lastLegalFixedText = fixedText;

      legalBanner.classList.toggle("is-risk", hasRisk);
      legalBanner.classList.toggle("is-safe", !hasRisk);
      legalBannerTitle.textContent = hasRisk ? "发现风险" : "未发现明显风险";
      legalBannerSub.textContent = hasRisk
        ? `共发现 ${risks.length} 处风险${modelName ? `｜模型：${modelName}` : ""}`
        : `建议人工复核${modelName ? `｜模型：${modelName}` : ""}`;

      const words = risks.map((r) => r?.word).filter(Boolean);
      legalOrigin.innerHTML = highlight(originalText || "", words) || "（空）";
      legalFixed.innerHTML = escapeHtml(fixedText || "") || "（空）";
      legalAnalysis.textContent = String(report?.analysis || "") || "（空）";

      if (!risks.length) {
        legalRisks.innerHTML = `<div class="empty">无风险项。</div>`;
      } else {
        legalRisks.innerHTML = `
          <table class="table">
            <thead>
              <tr>
                <th style="width: 120px">风险词</th>
                <th style="width: 160px">建议替换</th>
                <th>原因</th>
              </tr>
            </thead>
            <tbody>
              ${risks
                .map(
                  (r) => `
                    <tr>
                      <td class="mono"><span class="risk-chip">${escapeHtml(r?.word || "")}</span></td>
                      <td class="mono">${escapeHtml(r?.recommendation || "")}</td>
                      <td>${escapeHtml(r?.reason || "")}</td>
                    </tr>
                  `
                )
                .join("")}
            </tbody>
          </table>
        `;
      }

      legalReportOverlay.hidden = false;
      legalReportModal.hidden = false;
    };

    const closeLegalReport = () => {
      legalReportOverlay.hidden = true;
      legalReportModal.hidden = true;
      lastLegalFixedText = "";
    };

    legalReportOverlay.addEventListener("click", closeLegalReport);
    legalReportClose.addEventListener("click", closeLegalReport);
    legalReportCloseX.addEventListener("click", closeLegalReport);
    legalReportApply.addEventListener("click", () => {
      const text = String(lastLegalFixedText || "").trim();
      if (text) {
        copyEditContent.value = text;
        updateCopyWordCount();
        toast("已应用优化文案。");
      }
      closeLegalReport();
    });

    const parseJsonLoose = (text) => {
      const raw = String(text || "").trim();
      if (!raw) return null;
      const s = raw.indexOf("{");
      const e = raw.lastIndexOf("}");
      if (s < 0 || e < 0 || e <= s) return null;
      try {
        return JSON.parse(raw.slice(s, e + 1));
      } catch {
        return null;
      }
    };

    const legalPromptTemplate = `你是一名专业的短视频法务审核专家。请审核以下短视频的文案是否存在违禁词、敏感词、虚假宣传、极限词（如"第一"、"最好"）等法律风险以及短视频平台常见的违禁词，避免绝对化表述和违禁词，避免负向，消极的立场，对大健康，医疗等重点行业要严格审核。

【待审核文案】
${"${R.value}"}

【审核要求】
1. 找出文案中的所有违禁词/敏感词。
2. 为每个违禁词提供一个合规的替换词（如果建议直接删除，替换词为空字符串）。
3. 说明每个违禁词的违规原因。
4. 给出整体审核意见。
5. 给出修正后的完整优化文案。

【输出格式】
请直接返回 JSON 格式：
{
  "risks": [
    {
      "word": "违禁词原文",
      "recommendation": "替换词",
      "reason": "违规原因"
    }
  ],
  "analysis": "整体审核意见",
  "fixedText": "修正后的完整文案",
  "hasRisk": true/false
}

除 JSON 外不要输出任何其他内容。`;

    const openRecognize = (subText) => {
      recognizeCanceled = false;
      recognizeStopRequested = false;
      if (subText) recognizeSub.textContent = subText;
      recognizeOverlay.hidden = false;
      updateQuickParseBtnState();
    };

    const closeRecognize = () => {
      recognizeOverlay.hidden = true;
      extractSubmitting = false;
      updateQuickParseBtnState();
    };

    const openExtract = () => {
      if (extractModal.hidden === false) return;
      extractInput.value = localStorage.getItem("ipfactory.extract.lastInput") || "";
      extractOverlay.hidden = false;
      extractModal.hidden = false;
      updateDouyinUrlHint();
      extractInput.focus();
    };

    const closeExtract = () => {
      if (extractModal.hidden === true) return;
      extractOverlay.hidden = true;
      extractModal.hidden = true;
    };

    const formatTime = (d) => {
      const pad = (n, w = 2) => String(n).padStart(w, "0");
      return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
    };

    const appendLogLine = ({ taskId, level, message }) => {
      if (!logBox) return;
      const ts = formatTime(new Date());
      const lvl = String(level || "info").toLowerCase();
      const tid = taskId ? String(taskId).slice(0, 8) : "";
      const prefix = tid ? `[${ts}][${tid}][${lvl}] ` : `[${ts}][${lvl}] `;
      const text = `${prefix}${String(message || "").replace(/\r\n/g, "\n")}`;

      const lines = text.split("\n");
      const nearBottom = logBox.scrollHeight - (logBox.scrollTop + logBox.clientHeight) < 30;

      const frag = document.createDocumentFragment();
      for (const ln of lines) {
        const div = document.createElement("div");
        div.className = `log-line level-${lvl}`;
        div.textContent = ln;
        frag.appendChild(div);
        logLineCount += 1;
      }
      logBox.appendChild(frag);

      if (logLineCount > 800) {
        const toRemove = Math.min(200, logBox.children.length);
        for (let i = 0; i < toRemove; i += 1) logBox.firstChild?.remove?.();
        logLineCount = logBox.children.length;
      }

      if (logAutoScroll?.checked && (nearBottom || logBox.children.length < 6)) {
        logBox.scrollTop = logBox.scrollHeight;
      }
    };

    logClear?.addEventListener("click", () => {
      if (!logBox) return;
      logBox.innerHTML = "";
      logLineCount = 0;
      appendLogLine({ taskId: "", level: "info", message: "日志已清空" });
    });

    logCopy?.addEventListener("click", async () => {
      if (!logBox) return;
      const text = Array.from(logBox.querySelectorAll(".log-line"))
        .map((n) => n.textContent || "")
        .join("\n")
        .trim();
      if (!text) {
        toast("日志为空。");
        return;
      }
      try {
        await navigator.clipboard.writeText(text);
        toast("已复制日志。");
      } catch {
        toast("复制失败。");
      }
    });

    const requestStopRecognize = async ({ showToast = true } = {}) => {
      if (recognizeOverlay?.hidden !== false) return false;
      recognizeCanceled = true;
      if (currentTaskId) {
        try {
          await window.api?.workflow?.cancel?.(currentTaskId);
        } catch {}
      } else {
        recognizeStopRequested = true;
      }
      closeRecognize();
      if (showToast) toast("已取消识别。");
      return true;
    };
    root.querySelector("#btn-quick-parse").addEventListener("click", () => {
      if (recognizeOverlay?.hidden === false) {
        requestStopRecognize().catch(() => {});
        return;
      }
      openExtract();
    });
    const requestStopRewrite = async ({ showToast = true } = {}) => {
      if (!rewriting) return false;
      rewriteCancelRequested = true;
      if (rewriteTaskId) {
        try {
          await window.api?.llm?.cancel?.(rewriteTaskId);
        } catch {}
      }
      if (showToast) toast("已请求停止改写。");
      return true;
    };
    btnRewriteCopy?.addEventListener("click", () => {
      if (rewriting) {
        requestStopRewrite().catch(() => {});
        return;
      }
      const current = (copyEditContent.value || "").trim();
      const sourceText = current && current !== "智能改写中..." ? current : ipStudyResult.value;
      runRewrite({ content: sourceText, count: 300, source: "manual" });
    });
    btnLegalReview?.addEventListener("click", async () => {
      const text = (copyEditContent.value || "").trim();
      if (!text) {
        toast("请先填写文案内容。");
        return;
      }
      const cfg = readAgentCfg();
      const active = ensureHomeCloudLlmReady(HOME_LLM_KEYS.copyEdit, "请先在“模型-云端大模型”中配置文案处理模型。");
      if (!active) return;
      openLegal();
      try {
        legalProgressText.textContent = "正在检查违禁词、敏感词、极限词等法律风险...";
        const legalPromptRaw = String(cfg?.prompts?.legal || "").trim() || legalPromptTemplate;
        const systemPrompt = String(cfg?.prompts?.system || "").trim() || String(active?.systemPrompt || "").trim();
        const prompt = legalPromptRaw.replaceAll("${R.value}", text);
        const res = await window.api?.llm?.legalReview?.({
          endpoint: active.endpoint,
          apiKey: active.apiKey,
          model: active.model,
          systemPrompt,
          prompt
        });
        if (!res?.ok) {
          closeLegal();
          toast("AI法务审核失败，请查看运行日志。");
          appendLogLine({ taskId: currentTaskId, level: "warn", message: String(res?.message || "") });
          return;
        }
        const report = res?.report || parseJsonLoose(res?.raw || "");
        if (!report) {
          closeLegal();
          toast("AI法务审核返回格式异常，请查看运行日志。");
          appendLogLine({ taskId: currentTaskId, level: "warn", message: String(res?.raw || "") });
          return;
        }
        localStorage.setItem(
          "ipfactory.legal.latest",
          JSON.stringify({ originalText: text, report, createdAt: Date.now(), model: active.model }, null, 2)
        );
        closeLegal();
        openLegalReport({ originalText: text, report, modelName: active.model });
      } catch (e) {
        closeLegal();
        toast("AI法务审核失败，请查看运行日志。");
        appendLogLine({ taskId: currentTaskId, level: "error", message: String(e?.message || e) });
      }
    });
    const HOME_EDIT_KEY = "ipfactory.home.videoEdit.v1";
    const readHomeEditState = () => {
      try {
        const raw = localStorage.getItem(HOME_EDIT_KEY);
        const obj = JSON.parse(raw || "{}");
        return obj && typeof obj === "object" ? obj : {};
      } catch {
        return {};
      }
    };
    const writeHomeEditState = (next) => {
      try {
        localStorage.setItem(HOME_EDIT_KEY, JSON.stringify(next || {}, null, 2));
      } catch {}
    };
    const setHomeEditPreview = (videoPath) => {
      const p = String(videoPath || "").trim();
      homeEditedVideoPath = p;
      writeHomeEditState({ outputVideo: p });
      const url = toFileUrl(p);
      if (!homeEditPreviewVideo || !homeEditPreviewEmpty) return;
      if (!url) {
        homeEditPreviewVideo.hidden = true;
        homeEditPreviewEmpty.hidden = false;
        homeEditPreviewVideo.removeAttribute("src");
        return;
      }
      homeEditPreviewEmpty.hidden = true;
      homeEditPreviewVideo.hidden = false;
      homeEditPreviewVideo.src = url;
      try {
        homeEditPreviewVideo.load();
      } catch {}
    };
    (() => {
      const st = readHomeEditState();
      const p = String(st?.outputVideo || "").trim();
      if (p) setHomeEditPreview(p);
    })();

    const pickHomeEditInputVideo = async () => {
      const prefer = String(homeTalkingVideoPath || "").trim() || String(homeSelectedAvatarVideoPath || "").trim();
      if (prefer) return prefer;
      const res = await window.api?.openFile?.();
      if (res?.canceled) return "";
      const fp = Array.isArray(res?.filePaths) ? String(res.filePaths[0] || "").trim() : "";
      return fp;
    };

    btnStartEdit?.addEventListener("click", async () => {
      const autoCut = homeEditAutoCut?.checked === true;
      if (!autoCut) {
        window.location.hash = "#/video";
        return;
      }
      if (homeEditGenerating) {
        const taskId = String(homeEditTaskId || "").trim();
        if (!taskId || homeEditStopping) return;
        homeEditStopping = true;
        updateHomeEditBtnState();
        try {
          await window.api?.videoEdit?.cancel?.({ taskId });
        } catch {}
        toast("已请求停止剪辑。");
        return;
      }
      if (!window.api?.videoEdit?.processSilenceDetection) {
        toast("当前版本未接入自动剪气口能力。");
        return;
      }
      const inputVideo = await pickHomeEditInputVideo();
      if (!inputVideo) {
        toast("请选择要剪辑的视频。");
        return;
      }

      homeEditTaskId = `edit_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      homeEditGenerating = true;
      homeEditStopping = false;
      updateHomeEditBtnState();
      try {
        const res = await window.api.videoEdit.processSilenceDetection({
          taskId: homeEditTaskId,
          inputVideo,
          silenceDuration: 1,
          silenceThreshold: -40,
          minPauseDuration: 0.15
        });
        if (res?.canceled) {
          appendLogLine({ taskId: homeEditTaskId, level: "warn", message: "已停止当前剪辑任务。" });
          toast("已停止剪辑。");
          return;
        }
        if (!res?.ok || !res?.outputVideo) {
          toast("剪辑失败，请查看运行日志。");
          appendLogLine({ taskId: homeEditTaskId || currentTaskId, level: "warn", message: String(res?.message || "自动剪气口失败") });
          return;
        }
        homeEditedVideoPath = String(res.outputVideo || "");
        setHomeEditPreview(homeEditedVideoPath);
        toast("剪辑完成。");
        appendLogLine({ taskId: homeEditTaskId || currentTaskId, level: "info", message: `自动剪气口输出：${homeEditedVideoPath}` });
      } catch (e) {
        const message = String(e?.message || e);
        if (!/canceled/i.test(message)) toast("剪辑失败，请查看运行日志。");
        appendLogLine({ taskId: homeEditTaskId || currentTaskId, level: /canceled/i.test(message) ? "warn" : "error", message });
      } finally {
        homeEditTaskId = "";
        homeEditGenerating = false;
        homeEditStopping = false;
        updateHomeEditBtnState();
      }
    });
    btnGenMeta?.addEventListener("click", async () => {
      if (metaGenerating) {
        if (metaTaskId) {
          try {
            await window.api?.llm?.cancel?.(metaTaskId);
          } catch {}
        }
        toast("已请求停止标题生成。");
        return;
      }
      const text = String(copyEditContent?.value || "").trim();
      if (!text || text === "智能改写中...") {
        toast("请先在“视频文案编辑”中生成文案。");
        return;
      }

      const cfg = readAgentCfg();
      const active = ensureHomeCloudLlmReady(HOME_LLM_KEYS.meta, "请先在“模型-云端大模型”中配置标题处理模型。");
      if (!active) return;

      const prompt = String(cfg?.prompts?.meta || "").trim() || DEFAULT_META_PROMPT;
      const systemPrompt = String(cfg?.prompts?.system || "").trim() || String(active?.systemPrompt || "").trim();

      metaGenerating = true;
      metaTaskId = `meta_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      updateMetaBtnState();
      appendLogLine({ taskId: currentTaskId, level: "info", message: "开始生成标题｜标签｜关键词（基于当前文案）" });
      try {
        const res = await window.api?.llm?.rewrite?.({
          taskId: metaTaskId,
          content: text,
          count: 300,
          prompt,
          model: active.model,
          endpoint: active.endpoint,
          apiKey: active.apiKey,
          systemPrompt
        });
        if (res?.canceled) {
          appendLogLine({ taskId: metaTaskId || currentTaskId, level: "warn", message: "已停止当前标题生成任务。" });
          toast("已停止标题生成。");
          return;
        }
        if (!res?.ok || !res?.content) {
          toast("生成失败，请查看运行日志。");
          appendLogLine({ taskId: currentTaskId, level: "warn", message: String(res?.message || "") });
          return;
        }

        const json = parseJsonLoose(res.content);
        if (!json) {
          toast("返回格式异常（未解析到JSON），请查看运行日志。");
          appendLogLine({ taskId: currentTaskId, level: "warn", message: String(res.content || "") });
          return;
        }

        const title = String(json?.title || "").trim();
        const tags = Array.isArray(json?.tags) ? json.tags.map((x) => String(x || "").trim()).filter(Boolean) : [];
        const kwObj = json?.keywords && typeof json.keywords === "object" ? json.keywords : {};

        if (metaTitle) metaTitle.value = title;
        if (metaTags) metaTags.value = tags.join("，");

        const nextKwMap = {};
        for (const k of META_KW_CATS) {
          const arr = Array.isArray(kwObj?.[k]) ? kwObj[k] : [];
          nextKwMap[k] = arr.map((x) => String(x || "").trim()).filter(Boolean);
        }
        metaKwMap = { ...Object.fromEntries(META_KW_CATS.map((k) => [k, []])), ...nextKwMap };
        persistMetaKwMap();

        const firstNonEmpty = META_KW_CATS.find((k) => (metaKwMap?.[k] || []).length > 0) || META_KW_CATS[0];
        setMetaKwActiveCat(firstNonEmpty);
        toast("已生成标题｜标签｜关键词。");
        appendLogLine({ taskId: currentTaskId, level: "info", message: "标题｜标签｜关键词生成完成" });
      } catch (e) {
        const message = String(e?.message || e);
        if (!/canceled/i.test(message)) toast("生成失败，请查看运行日志。");
        appendLogLine({ taskId: metaTaskId || currentTaskId, level: /canceled/i.test(message) ? "warn" : "error", message });
      } finally {
        metaGenerating = false;
        metaTaskId = "";
        updateMetaBtnState();
      }
    });
    const HOME_SUB_BGM_KEY = "ipfactory.home.subBgm.v1";
    const readSubBgmState = () => {
      try {
        const raw = localStorage.getItem(HOME_SUB_BGM_KEY);
        const obj = JSON.parse(raw || "{}");
        return obj && typeof obj === "object" ? obj : {};
      } catch {
        return {};
      }
    };
    const writeSubBgmState = (next) => {
      try {
        localStorage.setItem(HOME_SUB_BGM_KEY, JSON.stringify(next || {}, null, 2));
      } catch {}
    };

    const renderBgmOptions = (items) => {
      if (!homeBgmSelect) return;
      const cur = String(homeBgmSelect.value || "").trim();
      homeBgmSelect.innerHTML = "";
      const opt0 = document.createElement("option");
      opt0.value = "";
      opt0.textContent = "选择背景音乐";
      homeBgmSelect.appendChild(opt0);
      (Array.isArray(items) ? items : []).forEach((it) => {
        const o = document.createElement("option");
        o.value = String(it?.path || "");
        o.textContent = String(it?.name || it?.path || "");
        homeBgmSelect.appendChild(o);
      });
      if (cur) homeBgmSelect.value = cur;
      if (homeBgmPicked) {
        const label = homeBgmSelect.selectedOptions?.[0]?.textContent || "";
        homeBgmPicked.textContent = label && homeBgmSelect.value ? `系统背景音乐：${label}` : "未选择背景音乐";
      }
    };

    const SUBTITLE_TPL_KEY = "ipfactory.subtitle.templates.v1";
    const templateMatchesId = (tpl, wantedId) => {
      const wanted = String(wantedId || "").trim();
      if (!wanted) return false;
      const ids = new Set([
        String(tpl?.id || "").trim(),
        String(tpl?.templateId || "").trim(),
        String(tpl?.cloudTemplateId || "").trim()
      ]);
      if (String(tpl?.cloudTemplateId || "").trim()) ids.add(`cloud:${String(tpl?.cloudTemplateId || "").trim()}`);
      return ids.has(wanted);
    };
    const getTemplateSource = (tpl) => {
      const source = String(tpl?.templateSource || tpl?.source || "").trim();
      if (source) return source;
      return String(tpl?.id || "").trim() === "system" ? "system" : "local";
    };
    const getTemplateSourceMeta = (tpl) => {
      const source = getTemplateSource(tpl);
      if (source === "cloud") return { label: "云端模板", badgeClass: "is-cloud", desc: "云端模板" };
      if (source === "local") return { label: "本地模板", badgeClass: "is-local", desc: "本地模板" };
      return { label: "系统模板", badgeClass: "is-system", desc: "系统模板" };
    };
    const readSubtitleTplStore = () => {
      try {
        const raw = localStorage.getItem(SUBTITLE_TPL_KEY);
        const parsed = JSON.parse(raw || "{}");
        const templates = Array.isArray(parsed?.templates) ? parsed.templates : [];
        return templates.filter((t) => t && typeof t === "object");
      } catch {
        return [];
      }
    };
    let homeSubtitleTplList = [];
    let homeCoverTplList = [];
    const loadHomeTemplateList = async (type, { syncCloud = false } = {}) => {
      const localList = type === "subtitle" ? readSubtitleTplStore() : readCoverTplStore();
      let cloudList = getTemplateCloudCache(type)?.templates || [];
      if (syncCloud) {
        try {
          const res = await fetchCloudTemplates(type);
          if (res?.ok && Array.isArray(res.templates)) cloudList = res.templates;
        } catch {}
      }
      return mergeTemplateCollections(localList, cloudList);
    };
    const resolveTemplateSelectionId = (list, wantedId, fallbackId = "system") => {
      const hit = (Array.isArray(list) ? list : []).find((tpl) => templateMatchesId(tpl, wantedId));
      return String(hit?.id || fallbackId || "system");
    };
    const getSubtitleTplById = (id) => {
      return homeSubtitleTplList.find((tpl) => templateMatchesId(tpl, id)) || homeSubtitleTplList[0] || { id: "system", name: "系统模板（默认）" };
    };
    const getCoverTplById = (id) => {
      return homeCoverTplList.find((tpl) => templateMatchesId(tpl, id)) || homeCoverTplList[0] || { id: "system", name: "系统封面模板（默认）" };
    };
    const buildTemplateFeatures = (type, tpl) => {
      if (type === "subtitle") {
        const title = tpl?.title && typeof tpl.title === "object" ? tpl.title : {};
        const kw = tpl?.keywordFx && typeof tpl.keywordFx === "object" ? tpl.keywordFx : {};
        return [
          title.enable === false ? "无标题" : `标题${Math.max(1, Number(title.lineCount || 2) || 2)}行`,
          kw.enable === true ? "关键词特效" : "标准字幕"
        ];
      }
      const sub = tpl?.sub && typeof tpl.sub === "object" ? tpl.sub : {};
      const mask = tpl?.mask && typeof tpl.mask === "object" ? tpl.mask : {};
      return [sub.enable === true ? "带副标题" : "纯主标题", mask.enable === true ? "蒙版" : "无蒙版"];
    };
    const buildTemplatePreview = (type, tpl) => {
      try {
        if (type === "subtitle") {
          return createSubtitleTemplatePreviewDataUrl(tpl, {
            titleText: getMetaTitleText() || "参考同行-红白封面",
            bodyText: String(copyEditContent?.value || "").trim() || "保持浮夸与震撼，认知为王",
            keywordPreview: true
          });
        }
        const coverTexts = deriveCoverTexts(tpl);
        return createCoverTemplatePreviewDataUrl(tpl, {
          mainText: coverTexts.titleText || "素材封面模板",
          subText: coverTexts.subTitleText || "副标题示例"
        });
      } catch {
        return "";
      }
    };
    const renderTemplatePickerSummary = (type) => {
      if (type === "subtitle") {
        const tpl = getSubtitleTplById(homeSubTemplate?.value || "system");
        const meta = getTemplateSourceMeta(tpl);
        if (homeSubTemplateName) homeSubTemplateName.textContent = String(tpl?.name || tpl?.id || "系统模板（默认）");
        if (homeSubTemplateSource) homeSubTemplateSource.textContent = meta.label;
        if (homeSubTemplateDesc) homeSubTemplateDesc.textContent = `${meta.desc}｜${buildTemplateFeatures("subtitle", tpl).join("｜")}`;
        return;
      }
      const tpl = getCoverTplById(homeCoverTemplateId);
      const meta = getTemplateSourceMeta(tpl);
      if (homeCoverPicked) homeCoverPicked.textContent = `已选模板：${String(tpl?.name || tpl?.id || "system")}`;
      if (homeCoverTemplateName) homeCoverTemplateName.textContent = String(tpl?.name || tpl?.id || "系统封面模板（默认）");
      if (homeCoverTemplateSource) homeCoverTemplateSource.textContent = meta.label;
    };
    const renderSubtitleTplOptions = async ({ syncCloud = false } = {}) => {
      if (!homeSubTemplate) return;
      const cur = String(homeSubTemplate.value || "").trim();
      homeSubtitleTplList = await loadHomeTemplateList("subtitle", { syncCloud });
      homeSubTemplate.innerHTML = "";
      homeSubtitleTplList.forEach((t) => {
        const o = document.createElement("option");
        o.value = String(t?.id || "");
        o.textContent = String(t?.name || t?.id || "");
        homeSubTemplate.appendChild(o);
      });
      homeSubTemplate.value = resolveTemplateSelectionId(homeSubtitleTplList, cur || "system", "system");
      renderTemplatePickerSummary("subtitle");
    };

    (async () => {
      const st = readSubBgmState();
      await renderSubtitleTplOptions({ syncCloud: true });
      if (homeSubAuto) homeSubAuto.checked = st.subAuto !== false;
      if (homeSubSmart) homeSubSmart.checked = st.subSmart === true;
      if (homeSubTemplate) {
        const prefer = String(st.subTemplate || "system");
        homeSubTemplate.value = resolveTemplateSelectionId(homeSubtitleTplList, prefer, "system");
        renderTemplatePickerSummary("subtitle");
      }
      if (homeSubPipEnable) homeSubPipEnable.checked = st.pipEnable === true;
      homeSubPipAssets = Array.isArray(st.pipAssets) ? st.pipAssets.filter((x) => x && typeof x === "object") : [];
      homeSubPipBindings = st.pipBindings && typeof st.pipBindings === "object" ? st.pipBindings : {};
      homeSubPipSegments = Array.isArray(st.pipSegments) ? st.pipSegments.filter((x) => x && typeof x === "object") : [];
      homeSubPipSegmentsVideoPath = String(st.pipSegmentsVideoPath || "");
      if (homeBgmEnable) homeBgmEnable.checked = st.bgmEnable !== false;
      if (homeSourceVolume) homeSourceVolume.value = String(Math.max(0, Math.min(300, Number(st.sourceVolPct ?? 100) || 100)));
      if (homeSourceVolumeText) homeSourceVolumeText.value = `${String(homeSourceVolume?.value || "100").trim()}%`;
      if (homeBgmVolume) homeBgmVolume.value = String(Number(st.bgmVolPct ?? 10) || 10);
      if (homeBgmVolumeText) homeBgmVolumeText.value = `${String(homeBgmVolume?.value || "10").trim()}%`;
      homeSubBgmOutPath = String(st.lastOutPath || "").trim();

      try {
        const res = await window.api?.media?.listBgms?.();
        const items = res?.ok && Array.isArray(res.items) ? res.items : [];
        renderBgmOptions(items);
        if (homeBgmSelect && st.bgmPath) homeBgmSelect.value = String(st.bgmPath || "");
      } catch {
        renderBgmOptions([]);
      }
      if (homeBgmPicked) {
        const label = homeBgmSelect?.selectedOptions?.[0]?.textContent || "";
        homeBgmPicked.textContent = label && homeBgmSelect?.value ? `系统背景音乐：${label}` : "未选择背景音乐";
      }
      syncHomeSubPipUi();
      renderPublishSource();
    })();

    function getHomeSubPipBoundCount() {
      try {
        return Object.keys(homeSubPipBindings && typeof homeSubPipBindings === "object" ? homeSubPipBindings : {}).length;
      } catch {
        return 0;
      }
    }
    function syncHomeSubPipUi() {
      const enabled = homeSubPipEnable?.checked === true;
      if (homeSubPipPick) homeSubPipPick.hidden = !enabled;
      const count = getHomeSubPipBoundCount();
      if (homeSubPipTip) {
        homeSubPipTip.hidden = !enabled;
        homeSubPipTip.textContent = count > 0 ? `已绑定 ${count} 段分镜` : "未绑定分镜";
      }
    }

    homeSubTemplateManage?.addEventListener("click", () => {
      window.location.hash = "#/subtitle-templates";
    });
    window.addEventListener("ipfactory:subtitleTemplatesChanged", () => {
      const cur = String(homeSubTemplate?.value || "system");
      renderSubtitleTplOptions().then(() => {
        if (homeSubTemplate) homeSubTemplate.value = resolveTemplateSelectionId(homeSubtitleTplList, cur, "system");
        renderTemplatePickerSummary("subtitle");
        persistSubBgm();
      });
    });

    const HOME_COVER_KEY = "ipfactory.home.cover.v1";
    const COVER_TPL_KEY = "ipfactory.cover.templates.v1";
    const readCoverState = () => {
      try {
        const raw = localStorage.getItem(HOME_COVER_KEY);
        const obj = JSON.parse(raw || "{}");
        return obj && typeof obj === "object" ? obj : {};
      } catch {
        return {};
      }
    };
    const writeCoverState = (next) => {
      try {
        localStorage.setItem(HOME_COVER_KEY, JSON.stringify(next || {}, null, 2));
      } catch {}
    };
    const readCoverTplStore = () => {
      try {
        const raw = localStorage.getItem(COVER_TPL_KEY);
        const parsed = JSON.parse(raw || "{}");
        const templates = Array.isArray(parsed?.templates) ? parsed.templates : [];
        return templates.filter((t) => t && typeof t === "object");
      } catch {
        return [];
      }
    };
    const persistCover = () => {
      writeCoverState({ templateId: homeCoverTemplateId, outPath: homeCoverOutPath });
    };
    const renderCoverTplOptions = async ({ syncCloud = false } = {}) => {
      homeCoverTplList = await loadHomeTemplateList("cover", { syncCloud });
      homeCoverTemplateId = resolveTemplateSelectionId(homeCoverTplList, homeCoverTemplateId || "system", "system");
      renderTemplatePickerSummary("cover");
    };
    const setCoverPreview = (p) => {
      const fp = String(p || "").trim();
      homeCoverOutPath = fp;
      persistCover();
      try {
        window.dispatchEvent(new CustomEvent("ipfactory:homeExportRefresh"));
      } catch {}
      if (!homeCoverImg || !homeCoverEmpty) return;
      if (!fp) {
        homeCoverImg.hidden = true;
        homeCoverImg.removeAttribute("src");
        homeCoverEmpty.hidden = false;
        if (homeCoverPreview) homeCoverPreview.style.aspectRatio = "3 / 4";
        return;
      }
      const url = toFileUrl(fp);
      homeCoverImg.onload = () => {
        try {
          const w = Number(homeCoverImg.naturalWidth || 0) || 0;
          const h = Number(homeCoverImg.naturalHeight || 0) || 0;
          if (w > 0 && h > 0 && homeCoverPreview) homeCoverPreview.style.aspectRatio = `${w} / ${h}`;
        } catch {}
      };
      homeCoverImg.src = url;
      homeCoverImg.hidden = false;
      homeCoverEmpty.hidden = true;
    };

    const readHomeInputsMem = () => {
      try {
        const raw = localStorage.getItem("ipfactory.home.inputs.v1");
        const obj = JSON.parse(raw || "{}");
        return obj && typeof obj === "object" ? obj : {};
      } catch {
        return {};
      }
    };
    const getMetaTitleText = () => {
      const v = String(metaTitle?.value || "").trim();
      if (v) return v;
      const mem = readHomeInputsMem();
      return String(mem?.["meta-title"] || "").trim();
    };
    const getMetaTagsText = () => {
      const v = String(metaTags?.value || "").trim();
      if (v) return v;
      const mem = readHomeInputsMem();
      return String(mem?.["meta-tags"] || "").trim();
    };
    const getMetaFirstTag = () => {
      const raw = getMetaTagsText();
      if (!raw) return "";
      return raw
        .split(/[，,]/g)
        .map((x) => String(x || "").trim())
        .filter(Boolean)[0] || "";
    };
    const readKwMap = () => {
      try {
        const raw = localStorage.getItem("ipfactory.home.meta.kwMap.v1");
        const obj = JSON.parse(raw || "{}");
        return obj && typeof obj === "object" ? obj : {};
      } catch {
        return {};
      }
    };
    const pickKw = () => {
      const km = readKwMap();
      const order = ["行动词", "情感词", "描述词", "重点词/成语词"];
      for (const k of order) {
        const arr = Array.isArray(km?.[k]) ? km[k] : [];
        const hit = arr.map((x) => String(x || "").trim()).filter(Boolean)[0];
        if (hit) return hit;
      }
      const anyKey = Object.keys(km || {}).find((k) => (Array.isArray(km?.[k]) ? km[k] : []).length > 0);
      if (!anyKey) return "";
      const arr = Array.isArray(km?.[anyKey]) ? km[anyKey] : [];
      return arr.map((x) => String(x || "").trim()).filter(Boolean)[0] || "";
    };
    const wrapLines = (text, maxChars, lineCount) => {
      const raw = String(text || "").trim();
      if (!raw) return [];
      const max = Math.max(4, Math.min(30, Number(maxChars || 8) || 8));
      const linesN = Math.max(1, Math.min(6, Number(lineCount || 2) || 2));
      const out = [];
      let buf = "";
      for (const ch of raw) {
        buf += ch;
        if (buf.length >= max) {
          out.push(buf);
          buf = "";
          if (out.length >= linesN) break;
        }
      }
      if (out.length < linesN && buf) out.push(buf);
      return out.filter(Boolean);
    };
    const deriveCoverTexts = (tpl) => {
      const titleRaw = getMetaTitleText();
      const main = tpl?.main && typeof tpl.main === "object" ? tpl.main : {};
      const mainMax = Number(main?.maxChars || 8) || 8;
      const mainLinesN = Number(main?.lineCount || 2) || 2;
      const mainLines = wrapLines(titleRaw, mainMax, mainLinesN);
      const hasSecondLine = mainLinesN >= 2 ? mainLines.length >= 2 : mainLines.length >= 1;

      const sub = tpl?.sub && typeof tpl.sub === "object" ? tpl.sub : {};
      const subEnabledByTpl = sub?.enable === true;
      const subCandidate = getMetaFirstTag() || pickKw();
      const subText = subEnabledByTpl && hasSecondLine ? String(subCandidate || "").trim() : "";

      return { titleText: String(titleRaw || "").trim(), subTitleText: subText };
    };

    const buildTemplateCurrentHtml = (type, tpl) => {
      const meta = getTemplateSourceMeta(tpl);
      const features = buildTemplateFeatures(type, tpl)
        .map((item) => `<span class="tpl-chip">${escapeHtml(item)}</span>`)
        .join("");
      return `
        <div class="tpl-gallery-current-card">
          <div class="tpl-gallery-current-copy">
            <div class="tpl-gallery-current-label">${type === "subtitle" ? "当前字幕模板" : "当前封面模板"}</div>
            <div class="tpl-gallery-current-name">${escapeHtml(String(tpl?.name || tpl?.id || "系统模板"))}</div>
            <div class="tpl-gallery-current-desc">${escapeHtml(meta.desc)}，选择后会直接用于首页当前流程。</div>
          </div>
          <div class="tpl-gallery-current-side">
            <div class="tpl-gallery-current-tags">
              <span class="tpl-chip">${escapeHtml(meta.label)}</span>
              ${features}
            </div>
          </div>
        </div>
      `;
    };
    const buildTemplateCardHtml = (type, tpl, selectedId) => {
      const id = String(tpl?.id || "");
      const meta = getTemplateSourceMeta(tpl);
      const preview = buildTemplatePreview(type, tpl);
      const features = buildTemplateFeatures(type, tpl)
        .map((item) => `<span class="tpl-chip is-muted">${escapeHtml(item)}</span>`)
        .join("");
      return `
        <button class="tpl-gallery-card${id === selectedId ? " is-active" : ""}" type="button" data-template-id="${escapeHtml(id)}">
          <div class="tpl-gallery-card-media">
            <div class="cover-tpl-thumb">${preview ? `<img src="${preview}" alt="${escapeHtml(String(tpl?.name || id || "模板"))}" />` : ""}</div>
            <span class="tpl-gallery-source-badge ${meta.badgeClass}">${escapeHtml(meta.label)}</span>
            ${id === selectedId ? '<span class="tpl-gallery-selected-mark">已选中</span>' : ""}
          </div>
          <div class="tpl-gallery-card-copy">
            <div class="tpl-gallery-card-title">${escapeHtml(String(tpl?.name || id || "模板"))}</div>
            <div class="tpl-gallery-card-desc">${escapeHtml(String(tpl?.cloudTemplateId || tpl?.templateId || tpl?.id || ""))}</div>
            <div class="tpl-gallery-card-features">${features}</div>
          </div>
        </button>
      `;
    };
    const buildTemplateSectionsHtml = (type, list, selectedId) => {
      const groups = splitTemplatesBySource(Array.isArray(list) ? list : []);
      const sections = [
        { title: "系统模板", items: groups.systemTemplates },
        { title: "云端模板", items: groups.cloudTemplates },
        { title: "本地模板", items: groups.localTemplates }
      ];
      return sections
        .map((section) => {
          const cards = (Array.isArray(section.items) ? section.items : [])
            .map((tpl) => buildTemplateCardHtml(type, tpl, selectedId))
            .join("");
          return `
            <section class="tpl-gallery-section">
              <div class="tpl-gallery-section-head">
                <div class="tpl-gallery-section-title">${section.title}</div>
                <span class="pill">${(Array.isArray(section.items) ? section.items : []).length}</span>
              </div>
              ${
                cards
                  ? `<div class="tpl-gallery-cards">${cards}</div>`
                  : '<div class="tpl-gallery-empty">当前分组暂无模板</div>'
              }
            </section>
          `;
        })
        .join("");
    };
    const openTemplateGalleryModal = async ({
      type,
      overlay,
      modal,
      currentEl,
      gridEl,
      closeBtn,
      cancelBtn,
      okBtn,
      manageBtn,
      onManage,
      selectedId,
      onConfirm
    }) => {
      if (!overlay || !modal || !gridEl || !currentEl) return;
      const list = await loadHomeTemplateList(type, { syncCloud: true });
      if (type === "subtitle") homeSubtitleTplList = list;
      else homeCoverTplList = list;
      let pickedId = resolveTemplateSelectionId(list, selectedId || "system", "system");
      const render = () => {
        const active = (Array.isArray(list) ? list : []).find((tpl) => templateMatchesId(tpl, pickedId)) || list[0] || {};
        currentEl.innerHTML = buildTemplateCurrentHtml(type, active);
        gridEl.innerHTML = buildTemplateSectionsHtml(type, list, pickedId);
        Array.from(gridEl.querySelectorAll("[data-template-id]")).forEach((el) => {
          el.addEventListener("click", () => {
            pickedId = String(el.getAttribute("data-template-id") || "system");
            render();
          });
          el.addEventListener("dblclick", () => {
            pickedId = String(el.getAttribute("data-template-id") || "system");
            onConfirm?.(pickedId);
            overlay.hidden = true;
            modal.hidden = true;
          });
        });
      };
      const close = () => {
        overlay.hidden = true;
        modal.hidden = true;
      };
      overlay.hidden = false;
      modal.hidden = false;
      render();
      closeBtn?.addEventListener("click", close, { once: true });
      cancelBtn?.addEventListener("click", close, { once: true });
      okBtn?.addEventListener(
        "click",
        () => {
          onConfirm?.(pickedId);
          close();
        },
        { once: true }
      );
      manageBtn?.addEventListener(
        "click",
        () => {
          close();
          onManage?.();
        },
        { once: true }
      );
      overlay?.addEventListener("click", close, { once: true });
    };
    const openSubtitleTplModal = async () => {
      await openTemplateGalleryModal({
        type: "subtitle",
        overlay: subTplModalOverlay,
        modal: subTplModal,
        currentEl: subTplCurrent,
        gridEl: subTplGrid,
        closeBtn: subTplModalClose,
        cancelBtn: subTplCancel,
        okBtn: subTplOk,
        manageBtn: subTplManage,
        onManage: () => {
          window.location.hash = "#/subtitle-templates";
        },
        selectedId: String(homeSubTemplate?.value || "system"),
        onConfirm: (id) => {
          if (homeSubTemplate) homeSubTemplate.value = resolveTemplateSelectionId(homeSubtitleTplList, id, "system");
          renderTemplatePickerSummary("subtitle");
          persistSubBgm();
        }
      });
    };
    const openCoverTplModal = async () => {
      await openTemplateGalleryModal({
        type: "cover",
        overlay: coverTplModalOverlay,
        modal: coverTplModal,
        currentEl: coverTplCurrent,
        gridEl: coverTplGrid,
        closeBtn: coverTplModalClose,
        cancelBtn: coverTplCancel,
        okBtn: coverTplOk,
        manageBtn: coverTplManage,
        onManage: () => {
          window.location.hash = "#/cover-templates";
        },
        selectedId: homeCoverTemplateId || "system",
        onConfirm: (id) => {
          homeCoverTemplateId = resolveTemplateSelectionId(homeCoverTplList, id, "system");
          renderTemplatePickerSummary("cover");
          persistCover();
        }
      });
    };

    (async () => {
      const st = readCoverState();
      homeCoverTemplateId = String(st?.templateId || "system") || "system";
      await renderCoverTplOptions({ syncCloud: true });
      if (st?.outPath) setCoverPreview(String(st.outPath || ""));
    })();

    homeSubTemplatePicker?.addEventListener("click", () => {
      openSubtitleTplModal().catch(() => {});
    });
    homeCoverTemplatePicker?.addEventListener("click", () => {
      openCoverTplModal().catch(() => {});
    });
    window.addEventListener("ipfactory:coverTemplatesChanged", () => {
      renderCoverTplOptions().then(() => {
        renderTemplatePickerSummary("cover");
      });
    });

    btnCoverAuto?.addEventListener("click", async () => {
      if (homeCoverGenerating) {
        const taskId = String(homeCoverTaskId || "").trim();
        if (!taskId || homeCoverStopping) return;
        homeCoverStopping = true;
        updateHomeCoverBtnState();
        try {
          await window.api?.cover?.cancel?.({ taskId });
        } catch {}
        toast("已请求停止封面生成。");
        return;
      }
      const sourceVideoForCover = String(homeEditedVideoPath || "").trim();
      if (!sourceVideoForCover) {
        toast("请先在“视频编辑”模块点击“开始剪辑”生成剪辑视频（无字幕底图）。");
        return;
      }
      const tpl = getCoverTplById(homeCoverTemplateId);
      const { titleText, subTitleText } = deriveCoverTexts(tpl);
      if (!titleText) {
        toast("请先在“标题｜话题｜关键词”模块生成标题。");
        return;
      }
      const taskId = `cover_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      appendLogLine({
        taskId,
        level: "info",
        message: "开始生成封面：抽取开头5秒内随机帧 + 套用封面模板（来源：视频编辑剪辑视频）"
      });
      homeCoverTaskId = taskId;
      homeCoverGenerating = true;
      homeCoverStopping = false;
      updateHomeCoverBtnState();
      try {
        const res = await window.api?.cover?.generate?.({
          taskId,
          videoPath: sourceVideoForCover,
          template: tpl,
          titleText,
          subTitleText
        });
        if (res?.canceled) {
          appendLogLine({ taskId, level: "warn", message: "已停止当前封面生成任务。" });
          toast("已停止封面生成。");
          return;
        }
        if (!res?.ok) {
          appendLogLine({ taskId, level: "warn", message: String(res?.message || "生成失败") });
          toast("生成失败，请查看运行日志。");
          return;
        }
        setCoverPreview(String(res.outPath || ""));
        appendLogLine({ taskId, level: "info", message: `封面输出：${String(res.outPath || "")}` });
        toast("封面已生成。");
      } catch (e) {
        appendLogLine({ taskId, level: "error", message: String(e?.message || e) });
        toast("生成失败，请查看运行日志。");
      } finally {
        homeCoverTaskId = "";
        homeCoverGenerating = false;
        homeCoverStopping = false;
        updateHomeCoverBtnState();
      }
    });

    const HOME_PUB_SCHEDULE_KEY = "ipfactory.home.publish.scheduleAt.v1";
    const HOME_PUB_MODE_KEY = "ipfactory.home.publish.mode.v1";
    const readHomePubSchedule = () => {
      try {
        return String(localStorage.getItem(HOME_PUB_SCHEDULE_KEY) || "").trim();
      } catch {
        return "";
      }
    };
    const writeHomePubSchedule = (v) => {
      try {
        localStorage.setItem(HOME_PUB_SCHEDULE_KEY, String(v || "").trim());
      } catch {}
    };
    const readHomePubMode = () => {
      try {
        const raw = String(localStorage.getItem(HOME_PUB_MODE_KEY) || "").trim();
        if (raw === "schedule" || raw === "immediate") return raw;
      } catch {}
      return readHomePubSchedule() ? "schedule" : "immediate";
    };
    const writeHomePubMode = (mode) => {
      const next = mode === "schedule" ? "schedule" : "immediate";
      try {
        localStorage.setItem(HOME_PUB_MODE_KEY, next);
      } catch {}
      return next;
    };
    const HOME_PUB_TARGETS_KEY = "ipfactory.home.publish.targets.v1";
    const PUBLISH_PLATFORM_ORDER = ["douyin", "kuaishou", "xiaohongshu", "shipinhao"];
    const readHomePubTargets = () => {
      try {
        const raw = localStorage.getItem(HOME_PUB_TARGETS_KEY);
        const parsed = JSON.parse(raw || "[]");
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    };
    const writeHomePubTargets = (list) => {
      try {
        localStorage.setItem(HOME_PUB_TARGETS_KEY, JSON.stringify(Array.isArray(list) ? list : [], null, 2));
      } catch {}
    };
    const platformLabel = (platform) => {
      const v = String(platform || "").trim();
      if (v === "douyin") return "抖音";
      if (v === "kuaishou") return "快手";
      if (v === "xiaohongshu") return "小红书";
      if (v === "shipinhao") return "视频号";
      return v || "平台";
    };
    const renderPublishPlatforms = () => {
      if (!homePubPlatform) return;
      const cur = String(homePubPlatform.value || "").trim();
      const platforms = Array.from(new Set(homePublishAccountsCache.map((item) => String(item?.platform || "").trim()).filter(Boolean)));
      platforms.sort((a, b) => {
        const ia = PUBLISH_PLATFORM_ORDER.indexOf(a);
        const ib = PUBLISH_PLATFORM_ORDER.indexOf(b);
        if (ia >= 0 && ib >= 0) return ia - ib;
        if (ia >= 0) return -1;
        if (ib >= 0) return 1;
        return a.localeCompare(b);
      });
      homePubPlatform.innerHTML = `<option value="">选择平台</option>${platforms
        .map((platform) => `<option value="${platform}">${platformLabel(platform)}</option>`)
        .join("")}`;
      homePubPlatform.value = platforms.includes(cur) ? cur : platforms[0] || "";
    };
    const renderPublishAccounts = () => {
      if (!homePubAccount) return;
      const platform = String(homePubPlatform?.value || "").trim();
      const cur = String(homePubAccount.value || "").trim();
      const items = platform ? homePublishAccountsCache.filter((item) => String(item?.platform || "").trim() === platform) : [];
      homePubAccount.innerHTML = `<option value="">${platform ? "选择账号" : "请先选择平台"}</option>${items
        .map((it) => {
          const id = String(it?.id || "");
          const name = String(it?.name || "").trim() || id;
          const saved = Number(it?.cookieCount || 0) > 0 ? "已保存" : "未保存";
          return `<option value="${id}">${name}｜${saved}</option>`;
        })
        .join("")}`;
      homePubAccount.value = items.some((item) => String(item?.id || "") === cur) ? cur : "";
    };
    const renderPublishTargetList = () => {
      if (!homePubTargetList) return;
      if (!homePublishTargets.length) {
        homePubTargetList.textContent = "未添加账号";
        homePubTargetList.classList.add("is-empty");
        return;
      }
      homePubTargetList.classList.remove("is-empty");
      homePubTargetList.innerHTML = homePublishTargets
        .map((item) => {
          const id = String(item?.accountId || "");
          const platform = String(item?.platform || "");
          const name = String(item?.name || id || "未命名账号");
          return `
            <button class="home-pub-target-chip" type="button" data-home-pub-remove="${platform}::${id}">
              <span>${platformLabel(platform)}｜${name}</span>
              <span class="home-pub-target-chip-x">移除</span>
            </button>
          `;
        })
        .join("");
    };
    const loadPublishAccounts = async () => {
      try {
        const res = await window.api?.accounts?.list?.();
        const items = res?.ok && Array.isArray(res.items) ? res.items : [];
        homePublishAccountsCache = items.map((item) => (item && typeof item === "object" ? item : {})).filter((item) => String(item?.id || "").trim());
      } catch {
        homePublishAccountsCache = [];
      }
      renderPublishPlatforms();
      renderPublishAccounts();
      homePublishTargets = readHomePubTargets().filter((target) =>
        homePublishAccountsCache.some(
          (item) => String(item?.id || "") === String(target?.accountId || "") && String(item?.platform || "") === String(target?.platform || "")
        )
      );
      renderPublishTargetList();
    };
    const addCurrentPublishTarget = () => {
      const platform = String(homePubPlatform?.value || "").trim();
      const accountId = String(homePubAccount?.value || "").trim();
      if (!platform) {
        toast("请先选择平台。");
        return false;
      }
      if (!accountId) {
        toast("请先选择账号。");
        return false;
      }
      const found = homePublishAccountsCache.find(
        (item) => String(item?.id || "") === accountId && String(item?.platform || "") === platform
      );
      if (!found) {
        toast("未找到该账号，请重新选择。");
        return false;
      }
      const exists = homePublishTargets.some(
        (item) => String(item?.accountId || "") === accountId && String(item?.platform || "") === platform
      );
      if (exists) {
        toast("该账号已加入待发布列表。");
        return false;
      }
      homePublishTargets = [
        ...homePublishTargets,
        { platform, accountId, name: String(found?.name || found?.id || "").trim() || String(found?.id || "") }
      ];
      writeHomePubTargets(homePublishTargets);
      renderPublishTargetList();
      return true;
    };
    const ensureAccountReadyForPublish = async (platform, accountId) => {
      try {
        const res = await window.api?.accounts?.test?.({ id: accountId });
        if (res?.ok && res?.valid) return true;
      } catch {}
      toast(`账号校验失败：${platformLabel(platform)} 当前账号未登录或 Cookie 已失效。`);
      return false;
    };
    const toTagArray = (raw) =>
      String(raw || "")
        .replace(/[，\n\r]/g, ",")
        .split(",")
        .map((item) => String(item || "").trim())
        .filter(Boolean)
        .slice(0, 5);
    const collectHomePublishPayload = () => {
      const publishTimeMode = readHomePubMode() === "schedule" ? "schedule" : "now";
      const scheduleAt = publishTimeMode === "schedule" ? String(readHomePubSchedule() || "").trim() : "";
      const coverPath = String(homeCoverOutPath || "").trim();
      return {
        videoPath: String(homeSubBgmOutPath || "").trim(),
        coverPath,
        title: String(homePubTitle?.value || "").trim() || String(metaTitle?.value || "").trim(),
        desc: "",
        tags: toTagArray(String(homePubTags?.value || "").trim() || String(metaTags?.value || "").trim()),
        scheduleAt,
        publishTimeMode,
        coverHint: coverPath ? { path: coverPath, source: "home" } : null
      };
    };
    const validateHomePublishPayload = (payload) => {
      const videoPath = String(payload?.videoPath || "").trim();
      if (!videoPath) {
        toast("请先在“字幕和音乐”模块合成成片。");
        return false;
      }
      const title = String(payload?.title || "").trim();
      if (!title) {
        toast("请先生成标题，或在发布模块手动填写标题。");
        return false;
      }
      if (String(payload?.publishTimeMode || "") === "schedule") {
        const scheduleAt = String(payload?.scheduleAt || "").trim();
        const p = parseSchedule(scheduleAt);
        const pickTs = partsToTs(p);
        const minTs = partsToTs(minScheduleParts());
        if (!pickTs || pickTs < minTs) {
          toast("抖音定时发布需至少晚于当前时间 2 小时，请重新设置定时发布时间。");
          openHomeSchedulePicker();
          return false;
        }
      }
      return true;
    };
    const runHomeOneClickPublish = async () => {
      if (!homePublishTargets.length) {
        toast("请先添加至少一个发布账号。");
        return;
      }
      const payload = collectHomePublishPayload();
      if (!validateHomePublishPayload(payload)) return;
      homePublishRunning = true;
      homePublishCanceling = false;
      homePublishStopRequested = false;
      homePublishRequestId = "";
      updateHomePublishBtnState();
      if (homePubAddAccount) homePubAddAccount.disabled = true;
      if (homePubClearAccounts) homePubClearAccounts.disabled = true;
      try {
        for (let i = 0; i < homePublishTargets.length; i += 1) {
          if (homePublishStopRequested) {
            appendLogLine({ taskId: "publish:home", level: "warn", message: "首页一键发布已被手动停止。" });
            toast("已停止一键发布。");
            return;
          }
          const item = homePublishTargets[i] || {};
          const platform = String(item?.platform || "").trim();
          const accountId = String(item?.accountId || "").trim();
          const accountName = String(item?.name || accountId || "").trim() || accountId;
          const ready = await ensureAccountReadyForPublish(platform, accountId);
          if (!ready) return;
          const requestId = `home_publish_${Date.now()}_${i}_${Math.random().toString(16).slice(2)}`;
          homePublishRequestId = requestId;
          const label = `${platformLabel(platform)}｜${accountName}`;
          appendLogLine({ taskId: `publish:${requestId}`, level: "info", message: `开始一键发布：${label}` });
          const res = await window.api?.publishWeb?.syncExternal?.({
            platform,
            accountId,
            payload: {
              ...payload,
              webTest: {
                action: "oneclick",
                stages: { video: false, cover: false, fill: false },
                fill: {},
                requestId
              }
            }
          });
          homePublishRequestId = "";
          homePublishCanceling = false;
          if (homePublishStopRequested || res?.cancelled) {
            appendLogLine({ taskId: `publish:${requestId}`, level: "warn", message: `${label} 已停止` });
            toast("已停止一键发布。");
            return;
          }
          if (!res?.ok) {
            const message = String(res?.message || `${label} 发布失败`);
            appendLogLine({ taskId: `publish:${requestId}`, level: "error", message });
            toast(message);
            return;
          }
          appendLogLine({ taskId: `publish:${requestId}`, level: "info", message: `${label} 发布完成` });
        }
        toast("已完成首页待发布账号的一键发布。");
      } catch (e) {
        const message = String(e?.message || e);
        appendLogLine({ taskId: "publish:home", level: "error", message });
        toast(`一键发布失败：${message}`);
      } finally {
        homePublishRunning = false;
        homePublishCanceling = false;
        homePublishRequestId = "";
        homePublishStopRequested = false;
        updateHomePublishBtnState();
        if (homePubAddAccount) homePubAddAccount.disabled = false;
        if (homePubClearAccounts) homePubClearAccounts.disabled = false;
      }
    };
    const removePublishTarget = (platform, accountId) => {
      const p = String(platform || "").trim();
      const a = String(accountId || "").trim();
      homePublishTargets = homePublishTargets.filter(
        (item) => !(String(item?.platform || "").trim() === p && String(item?.accountId || "").trim() === a)
      );
      writeHomePubTargets(homePublishTargets);
      renderPublishTargetList();
    };
    const renderPublishSource = () => {
      if (!homePubSource) return;
      const p = String(homeSubBgmOutPath || "").trim();
      homePubSource.textContent = p ? "字幕和音乐模块合成视频" : "未生成成片";
      homePubSource.title = p || "";
    };
    const homePubScheduleBtn = root.querySelector("#home-pub-schedule-btn");
    const homePubSchedulePill = root.querySelector("#home-pub-schedule-pill");
    const homePubSchedOverlay = root.querySelector("#home-pub-sched-overlay");
    const homePubSchedModal = root.querySelector("#home-pub-sched-modal");
    const homePubSchedClose = root.querySelector("#home-pub-sched-close");
    const homePubSchedDate = root.querySelector("#home-pub-sched-date");
    const homePubSchedHh = root.querySelector("#home-pub-sched-hh");
    const homePubSchedMm = root.querySelector("#home-pub-sched-mm");
    const homePubSchedSs = root.querySelector("#home-pub-sched-ss");
    const homePubSchedNow = root.querySelector("#home-pub-sched-now");
    const homePubSchedOk = root.querySelector("#home-pub-sched-ok");
    const homePubSchedClear = root.querySelector("#home-pub-sched-clear");

    const openModal = (overlay, modal) => {
      if (!overlay || !modal) return;
      overlay.hidden = false;
      modal.hidden = false;
    };
    const closeModal = (overlay, modal) => {
      if (!overlay || !modal) return;
      overlay.hidden = true;
      modal.hidden = true;
    };
    const pad2 = (n) => String(n).padStart(2, "0");
    const fmtSchedule = (d, hh, mm, ss) => `${String(d || "").trim()} ${pad2(hh)}:${pad2(mm)}:${pad2(ss)}`;
    const parseSchedule = (s) => {
      const t = String(s || "").trim();
      const m = t.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}):(\d{2})(?::(\d{2}))?$/);
      if (!m) return null;
      return { date: m[1], hh: m[2], mm: m[3], ss: m[4] || "00" };
    };
    const partsToTs = (p) => {
      if (!p) return 0;
      const date = String(p.date || "").trim();
      const hh = Number(String(p.hh || "0")) || 0;
      const mm = Number(String(p.mm || "0")) || 0;
      const ss = Number(String(p.ss || "0")) || 0;
      const m = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!m) return 0;
      const y = Number(m[1]) || 0;
      const mo = (Number(m[2]) || 1) - 1;
      const d = Number(m[3]) || 1;
      const dt = new Date(y, mo, d, hh, mm, ss, 0);
      const ts = dt.getTime();
      return Number.isFinite(ts) ? ts : 0;
    };
    const tsToParts = (ts) => {
      const d = new Date(Number(ts || 0) || 0);
      return {
        date: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`,
        hh: pad2(d.getHours()),
        mm: pad2(d.getMinutes()),
        ss: pad2(d.getSeconds())
      };
    };
    const minScheduleParts = () => {
      const minTs = Date.now() + 2 * 60 * 60 * 1000;
      const d = new Date(minTs);
      d.setSeconds(0, 0);
      return tsToParts(d.getTime());
    };
    const clampToMinSchedule = (p) => {
      const curTs = partsToTs(p);
      const minP = minScheduleParts();
      const minTs = partsToTs(minP);
      if (!curTs || curTs < minTs) return minP;
      return p;
    };
    const nowParts = () => {
      const d = new Date();
      return {
        date: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`,
        hh: pad2(d.getHours()),
        mm: pad2(d.getMinutes()),
        ss: pad2(d.getSeconds())
      };
    };
    const fillSelect = (sel, max) => {
      if (!sel) return;
      sel.innerHTML = "";
      for (let i = 0; i <= max; i += 1) {
        const o = document.createElement("option");
        o.value = pad2(i);
        o.textContent = pad2(i);
        sel.appendChild(o);
      }
    };
    fillSelect(homePubSchedHh, 23);
    fillSelect(homePubSchedMm, 59);
    fillSelect(homePubSchedSs, 59);

    const renderHomePubMode = () => {
      const mode = readHomePubMode();
      Array.from(homePubModeTabs?.querySelectorAll("[data-pub-mode]") || []).forEach((btn) => {
        btn.classList.toggle("is-active", String(btn.getAttribute("data-pub-mode") || "") === mode);
      });
      if (homePubScheduleBtn) {
        homePubScheduleBtn.hidden = mode !== "schedule";
        homePubScheduleBtn.textContent = "设置时间";
      }
      return mode;
    };
    const renderHomePubSchedule = () => {
      if (!homePubSchedulePill) return;
      const mode = renderHomePubMode();
      const v = readHomePubSchedule();
      if (mode === "schedule") {
        homePubSchedulePill.textContent = v ? v : "未设置";
        homePubSchedulePill.title = v;
      } else {
        homePubSchedulePill.textContent = "立即发布";
        homePubSchedulePill.title = "";
      }
    };
    renderHomePubSchedule();

    const openHomeSchedulePicker = () => {
      const cur = clampToMinSchedule(parseSchedule(readHomePubSchedule()) || minScheduleParts());
      if (homePubSchedDate) homePubSchedDate.value = cur.date;
      if (homePubSchedHh) homePubSchedHh.value = cur.hh;
      if (homePubSchedMm) homePubSchedMm.value = cur.mm;
      if (homePubSchedSs) homePubSchedSs.value = cur.ss;
      openModal(homePubSchedOverlay, homePubSchedModal);
    };
    homePubScheduleBtn?.addEventListener("click", openHomeSchedulePicker);
    homePubSchedulePill?.addEventListener("click", () => {
      if (readHomePubMode() === "schedule") openHomeSchedulePicker();
    });
    Array.from(homePubModeTabs?.querySelectorAll("[data-pub-mode]") || []).forEach((btn) => {
      btn.addEventListener("click", () => {
        const nextMode = String(btn.getAttribute("data-pub-mode") || "immediate");
        if (nextMode === "schedule") {
          writeHomePubMode("schedule");
          renderHomePubSchedule();
          if (!readHomePubSchedule()) openHomeSchedulePicker();
          return;
        }
        writeHomePubMode("immediate");
        writeHomePubSchedule("");
        renderHomePubSchedule();
      });
    });
    homePubSchedClose?.addEventListener("click", () => closeModal(homePubSchedOverlay, homePubSchedModal));
    homePubSchedOverlay?.addEventListener("click", () => closeModal(homePubSchedOverlay, homePubSchedModal));
    homePubSchedNow?.addEventListener("click", () => {
      const cur = minScheduleParts();
      if (homePubSchedDate) homePubSchedDate.value = cur.date;
      if (homePubSchedHh) homePubSchedHh.value = cur.hh;
      if (homePubSchedMm) homePubSchedMm.value = cur.mm;
      if (homePubSchedSs) homePubSchedSs.value = cur.ss;
    });
    homePubSchedClear?.addEventListener("click", () => {
      writeHomePubSchedule("");
      writeHomePubMode("immediate");
      renderHomePubSchedule();
      closeModal(homePubSchedOverlay, homePubSchedModal);
      toast("已切换为立即发布。");
    });
    homePubSchedOk?.addEventListener("click", () => {
      const d = String(homePubSchedDate?.value || "").trim();
      if (!d) {
        toast("请选择发布日期。");
        return;
      }
      const pick = { date: d, hh: String(homePubSchedHh?.value || "00"), mm: String(homePubSchedMm?.value || "00"), ss: String(homePubSchedSs?.value || "00") };
      const minP = minScheduleParts();
      const pickTs = partsToTs(pick);
      const minTs = partsToTs(minP);
      if (!pickTs || pickTs < minTs) {
        if (homePubSchedDate) homePubSchedDate.value = minP.date;
        if (homePubSchedHh) homePubSchedHh.value = minP.hh;
        if (homePubSchedMm) homePubSchedMm.value = minP.mm;
        if (homePubSchedSs) homePubSchedSs.value = minP.ss;
        toast("抖音定时发布需至少晚于当前时间 2 小时。已自动调整到最早可用时间。");
        return;
      }
      const v = fmtSchedule(pick.date, pick.hh, pick.mm, pick.ss);
      writeHomePubMode("schedule");
      writeHomePubSchedule(v);
      renderHomePubSchedule();
      closeModal(homePubSchedOverlay, homePubSchedModal);
      toast("已设置定时发布时间。");
    });
    const syncPublishInputsFromHome = () => {
      if (homePubTitle) {
        homePubTitle.value = getMetaTitleText();
      }
      if (homePubTags) {
        homePubTags.value = getMetaTagsText();
      }
    };
    renderPublishSource();
    syncPublishInputsFromHome();
    renderPublishAccounts();
    await syncCloneVoicesFromJsonToLocal();
    await applyHomeRunMode({ showToast: false });
    await loadPublishAccounts();
    window.addEventListener("ipfactory:modelsChanged", () => {
      renderHomeMediaSelectors().catch(() => {});
      renderHomeCloneModelSelect();
    });
    window.addEventListener("ipfactory:accountsChanged", () => {
      loadPublishAccounts().catch(() => {});
    });
    window.addEventListener("ipfactory:cloneVoicesChanged", () => {
      ensureValidActiveVoice();
      ensureActiveVoiceMatchesCurrentTts({ showToast: false });
      renderVoicePicked();
      if (voiceModal?.hidden === false) renderVoiceModal();
    });
    if (window.__ipfactoryHomeAuthChanged) {
      try {
        window.removeEventListener("ipfactory:authChanged", window.__ipfactoryHomeAuthChanged);
      } catch {}
    }
    window.__ipfactoryHomeAuthChanged = async () => {
      clearCurrentAudioSelection();
      renderAudioHistory();
      try {
        await syncCloneVoicesFromJsonToLocal();
      } catch {}
      ensureValidActiveVoice();
      await applyHomeRunMode({ showToast: false });
    };
    window.addEventListener("ipfactory:authChanged", window.__ipfactoryHomeAuthChanged);
    const homeExportController = await mountShouyeYijianDaochu({
      root,
      toast,
      getVideoPath: () => String(homeSubBgmOutPath || "").trim(),
      getCoverPath: () => String(homeCoverOutPath || "").trim(),
      getTitle: () => String(metaTitle?.value || "").trim() || String(homePubTitle?.value || "").trim()
    });
    window.addEventListener("ipfactory:homeKwChanged", () => {
      syncPublishInputsFromHome();
      homeExportController?.refresh?.();
    });

    homePubManageAccounts?.addEventListener("click", () => {
      window.location.hash = "#/accounts";
    });
    homePubPlatform?.addEventListener("change", () => {
      renderPublishAccounts();
    });
    homePubAddAccount?.addEventListener("click", () => {
      addCurrentPublishTarget();
    });
    homePubClearAccounts?.addEventListener("click", () => {
      homePublishTargets = [];
      writeHomePubTargets(homePublishTargets);
      renderPublishTargetList();
    });
    homePubTargetList?.addEventListener("click", (e) => {
      const btn = e.target?.closest?.("[data-home-pub-remove]");
      if (!btn) return;
      const raw = String(btn.getAttribute("data-home-pub-remove") || "");
      const [platform, accountId] = raw.split("::");
      removePublishTarget(platform, accountId);
    });
    homePubToCenter?.addEventListener("click", () => {
      window.location.hash = "#/publish";
    });
    const cancelHomeOneClickPublish = async () => {
      if (!homePublishRunning) return false;
      homePublishStopRequested = true;
      const requestId = String(homePublishRequestId || "").trim();
      if (!requestId) {
        toast("已请求停止一键发布。");
        return true;
      }
      homePublishCanceling = true;
      updateHomePublishBtnState();
      try {
        await window.api?.publishWeb?.cancelSyncExternal?.({ requestId, reason: "首页手动停止一键发布" });
        toast("已请求停止一键发布。");
      } catch {}
      return true;
    };
    homePubCreate?.addEventListener("click", () => {
      if (homePublishRunning) {
        cancelHomeOneClickPublish().catch(() => {});
        return;
      }
      runHomeOneClickPublish();
    });

    function persistSubBgm() {
      const next = {
        subAuto: homeSubAuto?.checked === true,
        subSmart: homeSubSmart?.checked === true,
        subTemplate: String(homeSubTemplate?.value || "system"),
        pipEnable: homeSubPipEnable?.checked === true,
        pipAssets: Array.isArray(homeSubPipAssets) ? homeSubPipAssets : [],
        pipBindings: homeSubPipBindings && typeof homeSubPipBindings === "object" ? homeSubPipBindings : {},
        pipSegments: Array.isArray(homeSubPipSegments) ? homeSubPipSegments : [],
        pipSegmentsVideoPath: String(homeSubPipSegmentsVideoPath || ""),
        bgmEnable: homeBgmEnable?.checked === true,
        bgmPath: String(homeBgmSelect?.value || ""),
        sourceVolPct: Math.max(0, Math.min(300, Number(String(homeSourceVolume?.value || "100").trim()) || 100)),
        bgmVolPct: Math.max(0, Math.min(100, Number(String(homeBgmVolume?.value || "10").trim()) || 10)),
        lastOutPath: String(homeSubBgmOutPath || "").trim()
      };
      writeSubBgmState(next);
    }

    homeSubAuto?.addEventListener("change", () => {
      persistSubBgm();
    });
    homeSubSmart?.addEventListener("change", persistSubBgm);
    homeSubTemplate?.addEventListener("change", () => {
      renderTemplatePickerSummary("subtitle");
      persistSubBgm();
    });
    homeSubPipEnable?.addEventListener("change", () => {
      syncHomeSubPipUi();
      persistSubBgm();
    });
    homeSubPipPick?.addEventListener("click", async () => {
      const sourceVideo = String(homeEditedVideoPath || "").trim();
      if (!sourceVideo) {
        toast("请先在“视频编辑”模块生成剪辑视频。");
        return;
      }
      if (homeSubPipEnable?.checked !== true) {
        toast("请先勾选“画中画”。");
        return;
      }
      const subtitleEnable = homeSubAuto?.checked === true;
      if (!subtitleEnable) {
        toast("请先勾选“自动生成字幕”，才能按分段绑定素材。");
        return;
      }
      let preferredSubtitleText = "";
      if (homeSubSmart?.checked === true) {
        const v = String(copyEditContent?.value || "").trim();
        if (v && v !== "智能改写中...") preferredSubtitleText = v;
      }
      const subtitleTemplateId = String(homeSubTemplate?.value || "system").trim() || "system";
      const pickedSubtitleTpl = getSubtitleTplById(subtitleTemplateId);
      const subtitleTemplate = subtitleTemplateId === "system" ? null : pickedSubtitleTpl || null;
      const asrModelChoice = await hydrateHomeMediaChoice("ASR", homeSubBgmAsrModel);
      const agentCfg = readAgentCfg();
      const res = await openShouyeHuazhonghuaFenjingModal({
        toast,
        videoPath: sourceVideo,
        preferredSubtitleText,
        subtitleTemplate,
        asrModelChoice,
        pipConfig: agentCfg?.pip && typeof agentCfg.pip === "object" ? agentCfg.pip : null,
        initialAssets: homeSubPipAssets,
        initialBindings: homeSubPipBindings,
        initialSegments: homeSubPipSegments,
        initialSegmentsVideoPath: homeSubPipSegmentsVideoPath
      });
      if (!res?.ok) return;
      homeSubPipAssets = Array.isArray(res?.assets) ? res.assets : [];
      homeSubPipBindings = res?.bindings && typeof res.bindings === "object" ? res.bindings : {};
      homeSubPipSegments = Array.isArray(res?.segments) ? res.segments : [];
      homeSubPipSegmentsVideoPath = String(res?.segmentsVideoPath || "");
      syncHomeSubPipUi();
      persistSubBgm();
    });

    homeBgmEnable?.addEventListener("change", () => {
      persistSubBgm();
    });
    homeBgmSelect?.addEventListener("change", () => {
      persistSubBgm();
      if (homeBgmPicked) {
        const label = homeBgmSelect.selectedOptions?.[0]?.textContent || "";
        homeBgmPicked.textContent = label && homeBgmSelect.value ? `系统背景音乐：${label}` : "未选择背景音乐";
      }
    });
    homeSourceVolume?.addEventListener("input", () => {
      const v = Math.max(0, Math.min(300, Number(String(homeSourceVolume.value || "100").trim()) || 100));
      homeSourceVolume.value = String(v);
      if (homeSourceVolumeText) homeSourceVolumeText.value = `${v}%`;
      syncHomeSourcePreviewGain();
      persistSubBgm();
    });
    homeSourceVolumeText?.addEventListener("input", () => {
      const raw = String(homeSourceVolumeText.value || "").replace(/[^\d]/g, "");
      const v = Math.max(0, Math.min(300, Number(raw || "0")));
      homeSourceVolumeText.value = `${v}%`;
      if (homeSourceVolume) homeSourceVolume.value = String(v);
      syncHomeSourcePreviewGain();
      persistSubBgm();
    });
    homeBgmVolume?.addEventListener("input", () => {
      const v = Math.max(0, Math.min(100, Number(String(homeBgmVolume.value || "10").trim()) || 10));
      homeBgmVolume.value = String(v);
      if (homeBgmVolumeText) homeBgmVolumeText.value = `${v}%`;
      if (homeBgmPreview) homeBgmPreview.volume = v / 100;
      persistSubBgm();
    });
    homeBgmVolumeText?.addEventListener("input", () => {
      const raw = String(homeBgmVolumeText.value || "").replace(/[^\d]/g, "");
      const v = Math.max(0, Math.min(100, Number(raw || "0")));
      homeBgmVolumeText.value = `${v}%`;
      if (homeBgmVolume) homeBgmVolume.value = String(v);
      if (homeBgmPreview) homeBgmPreview.volume = v / 100;
      persistSubBgm();
    });

    homeSourceListen?.addEventListener("click", async () => {
      const p = String(homeEditedVideoPath || "").trim();
      if (!p) {
        toast("请先在“视频编辑”模块生成剪辑视频。");
        return;
      }
      try {
        const preview = ensureHomeSourcePreviewAudio();
        if (!preview) {
          toast("当前环境不支持原视频试听。");
          return;
        }
        if (preview.paused === false) {
          stopHomeSourcePreview();
          return;
        }
        const url = toFileUrl(p);
        if (!url) {
          toast("原视频路径无效。");
          return;
        }
        if (homeSourcePreviewCtx?.state === "suspended") {
          try {
            await homeSourcePreviewCtx.resume();
          } catch {}
        }
        syncHomeSourcePreviewGain();
        if (preview.src !== url) preview.src = url;
        preview.currentTime = 0;
        preview.onended = () => {
          if (homeSourceListen) homeSourceListen.textContent = "试听原视频";
        };
        await preview.play();
        if (homeSourceListen) homeSourceListen.textContent = "停止原视频";
      } catch {
        toast("原视频试听失败。");
      }
    });
    homeBgmListen?.addEventListener("click", async () => {
      const enable = homeBgmEnable?.checked === true;
      const p = String(homeBgmSelect?.value || "").trim();
      if (!enable) {
        toast("请先勾选“添加背景音乐”。");
        return;
      }
      if (!p) {
        toast("请先选择背景音乐。");
        return;
      }
      try {
        if (homeBgmPreview && homeBgmPreview.paused === false) {
          stopHomeBgmPreview();
          return;
        }
        const url = toFileUrl(p);
        if (!homeBgmPreview) homeBgmPreview = new Audio();
        if (homeBgmPreview.src !== url) homeBgmPreview.src = url;
        homeBgmPreview.currentTime = 0;
        const v = Math.max(0, Math.min(100, Number(String(homeBgmVolume?.value || "10").trim()) || 10));
        homeBgmPreview.volume = v / 100;
        homeBgmPreview.onended = () => {
          if (homeBgmListen) homeBgmListen.textContent = "试听背景音乐";
        };
        await homeBgmPreview.play();
        homeBgmListen.textContent = "停止背景音乐";
      } catch {
        toast("试听失败。");
      }
    });

    const setSubBgmPreviewSource = (videoPath) => {
      const p = String(videoPath || "").trim();
      const url = toFileUrl(p);
      if (!homeSubBgmVideo || !homeSubBgmEmpty) return;
      if (!url) {
        homeSubBgmVideo.hidden = true;
        homeSubBgmEmpty.hidden = false;
        homeSubBgmVideo.removeAttribute("src");
        homeSubBgmOutPath = "";
        renderPublishSource();
        refreshHomeVideoCompare();
        return;
      }
      homeSubBgmEmpty.hidden = true;
      homeSubBgmVideo.hidden = false;
      homeSubBgmVideo.src = url;
      homeSubBgmOutPath = p;
      renderPublishSource();
      try {
        homeSubBgmVideo.load();
      } catch {}
      refreshHomeVideoCompare();
    };

    btnAutoBgm?.addEventListener("click", async () => {
      if (homeSubBgmTaskId) {
        const taskId = String(homeSubBgmTaskId || "").trim();
        if (!taskId || homeSubBgmStopping) return;
        homeSubBgmStopping = true;
        updateHomeSubBgmBtnState();
        try {
          await window.api?.subBgm?.cancel?.({ taskId });
        } catch {}
        toast("已请求停止字幕和背景音乐生成。");
        return;
      }
      const sourceVideo = String(homeEditedVideoPath || "").trim();
      if (!sourceVideo) {
        toast("请先在“视频编辑”模块生成剪辑视频。");
        return;
      }
      if (!window.api?.subBgm?.render) {
        toast("当前版本未接入 FFmpeg 合成能力。");
        return;
      }

      homeSubBgmTaskId = `subbgm_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      homeSubBgmLastLoggedPct = -1;
      homeSubBgmLastLoggedMsg = "";
      appendLogLine({ taskId: `subbgm:${homeSubBgmTaskId}`, level: "info", message: "开始合成（FFmpeg 字幕烧录 + BGM 混音）" });

      const bgmEnable = homeBgmEnable?.checked === true;
      const bgmPath = String(homeBgmSelect?.value || "").trim();
      const bgmVolPct = Math.max(0, Math.min(100, Number(String(homeBgmVolume?.value || "10").trim()) || 10));
      const subtitleEnable = homeSubAuto?.checked === true;
      let preferredSubtitleText = "";
      if (subtitleEnable && homeSubSmart?.checked === true) {
        const v = String(copyEditContent?.value || "").trim();
        if (v && v !== "智能改写中...") preferredSubtitleText = v;
      }
      const subtitleTemplateId = String(homeSubTemplate?.value || "system").trim() || "system";
      const pickedSubtitleTpl = getSubtitleTplById(subtitleTemplateId);
      const subtitleTemplate = subtitleTemplateId === "system" ? null : pickedSubtitleTpl || null;
      const titleTextFromHome = String(metaTitle?.value || "").trim();
      let keywordMap = null;
      try {
        const raw = localStorage.getItem("ipfactory.home.meta.kwMap.v1");
        const obj = JSON.parse(raw || "{}");
        keywordMap = obj && typeof obj === "object" ? obj : null;
      } catch {
        keywordMap = null;
      }

      homeSubBgmStopping = false;
      updateHomeSubBgmBtnState();
      try {
        const asrModelChoice = await hydrateHomeMediaChoice("ASR", homeSubBgmAsrModel);
        const pipEnable = homeSubPipEnable?.checked === true;
        let storyboard = null;
        let segmentsOverride = null;
        if (pipEnable) {
          const assets = (Array.isArray(homeSubPipAssets) ? homeSubPipAssets : []).filter((x) => x && typeof x === "object");
          const bindings = homeSubPipBindings && typeof homeSubPipBindings === "object" ? homeSubPipBindings : {};
          const boundCount = Object.keys(bindings).length;
          const segOk = String(homeSubPipSegmentsVideoPath || "") === String(sourceVideo || "") && Array.isArray(homeSubPipSegments) && homeSubPipSegments.length > 0;
          if (!assets.length) {
            toast("画中画已启用，但未上传素材。");
            return;
          }
          if (!boundCount) {
            toast("画中画已启用，但未绑定任何分段字幕。");
            return;
          }
          if (!segOk) {
            toast("画中画分段字幕未就绪，请先在“素材选择”里生成分段字幕并完成绑定。");
            return;
          }
          storyboard = { enable: true, assets, bindings };
          segmentsOverride = homeSubPipSegments;
        }
        const agentCfg = readAgentCfg();
        const pipConfig = agentCfg?.pip && typeof agentCfg.pip === "object" ? agentCfg.pip : null;
        const res = await window.api.subBgm.render({
          taskId: homeSubBgmTaskId,
          videoPath: sourceVideo,
          subtitleEnable,
          bgmEnable,
          bgmPath,
          sourceVolPct: Math.max(0, Math.min(300, Number(String(homeSourceVolume?.value || "100").trim()) || 100)),
          bgmVolPct,
          preferredSubtitleText,
          subtitleTemplate,
          titleText: titleTextFromHome,
          keywordMap,
          asrModelChoice,
          segmentsOverride,
          storyboard,
          pipConfig
        });
        if (res?.canceled) {
          appendLogLine({ taskId: `subbgm:${homeSubBgmTaskId}`, level: "warn", message: "已停止当前字幕和背景音乐任务。" });
          toast("已停止字幕和背景音乐生成。");
          return;
        }
        if (!res?.ok || !res?.outPath) {
          toast("合成失败，请查看运行日志。");
          appendLogLine({ taskId: `subbgm:${homeSubBgmTaskId}`, level: "warn", message: String(res?.message || "合成失败") });
          return;
        }
        homeSubBgmOutPath = String(res.outPath || "").trim();
        setSubBgmPreviewSource(String(res.outPath || ""));
        try {
          window.dispatchEvent(new CustomEvent("ipfactory:homeExportRefresh"));
        } catch {}
        if (homeSubBgmPreview) homeSubBgmPreview.scrollIntoView({ behavior: "smooth", block: "nearest" });
        toast("合成完成。");
        appendLogLine({ taskId: `subbgm:${homeSubBgmTaskId}`, level: "info", message: `合成输出：${String(res.outPath || "")}` });
        persistSubBgm();
      } catch (e) {
        const message = String(e?.message || e);
        if (!/canceled/i.test(message)) toast("合成失败，请查看运行日志。");
        appendLogLine({ taskId: `subbgm:${homeSubBgmTaskId}`, level: /canceled/i.test(message) ? "warn" : "error", message });
      } finally {
        homeSubBgmStopping = false;
        updateHomeSubBgmBtnState();
        homeSubBgmTaskId = "";
        updateHomeSubBgmBtnState();
      }
    });
    root.querySelector("#btn-auto").addEventListener("click", () => {
      toast("已开启自动创作模式（占位）。");
      window.location.hash = "#/tasks";
    });
    root.querySelector("#btn-init-files")?.addEventListener("click", async () => {
      const btn = root.querySelector("#btn-init-files");
      if (!btn) return;
      const oldText = btn.textContent || "文件初始化";
      btn.disabled = true;
      btn.textContent = "初始化中...";
      try {
        const res = await window.api?.app?.initializeInstallFiles?.();
        if (!res?.ok) {
          toast(String(res?.message || "文件初始化失败。"));
          return;
        }
        const summary = String(res.summary || "").trim();
        toast(summary || "文件初始化完成。");
      } catch (e) {
        toast(String(e?.message || e || "文件初始化失败。"));
      } finally {
        btn.disabled = false;
        btn.textContent = oldText;
      }
    });
    root.querySelector("#btn-stop").addEventListener("click", () => toast("已停止任务（占位）。"));
    root.querySelector("#btn-clean").addEventListener("click", () => toast("已清除数据（占位）。"));

    const wireTabs = (tabsEl) => {
      const tabsName = tabsEl.getAttribute("data-tabs");
      const host = tabsEl.closest(".module-card") || root;
      const buttons = Array.from(tabsEl.querySelectorAll(".seg-tab[data-tab]"));
      const panels = Array.from(host.querySelectorAll(".tab-panel[data-tab-panel]"));
      const setActive = (tab) => {
        buttons.forEach((b) => b.classList.toggle("is-active", b.getAttribute("data-tab") === tab));
        panels.forEach((p) => p.classList.toggle("is-active", p.getAttribute("data-tab-panel") === tab));
      };
      buttons.forEach((b) => {
        b.addEventListener("click", () => setActive(b.getAttribute("data-tab")));
      });
      const defaultTab = buttons.find((b) => b.classList.contains("is-active"))?.getAttribute("data-tab");
      if (defaultTab) setActive(defaultTab);
      return tabsName;
    };

    root.querySelectorAll(".seg-tabs[data-tabs]").forEach((tabsEl) => wireTabs(tabsEl));

    const MODULE_COLLAPSE_KEY = "ipfactory.home.moduleCollapse";
    const readModuleCollapseMap = () => {
      try {
        const raw = localStorage.getItem(MODULE_COLLAPSE_KEY);
        const obj = JSON.parse(raw || "{}");
        return obj && typeof obj === "object" ? obj : {};
      } catch {
        return {};
      }
    };
    const writeModuleCollapseMap = (obj) => {
      try {
        localStorage.setItem(MODULE_COLLAPSE_KEY, JSON.stringify(obj || {}, null, 2));
      } catch {}
    };

    const moduleCollapseMap = readModuleCollapseMap();
    const setCardCollapsed = (card, collapsed, { persist = true } = {}) => {
      if (!card) return;
      const key = String(card.getAttribute("data-module") || "").trim();
      card.classList.toggle("is-collapsed", collapsed === true);
      Array.from(card.children || []).forEach((ch) => {
        if (ch?.classList?.contains?.("module-head")) return;
        ch.hidden = collapsed === true;
      });
      if (persist && key) {
        moduleCollapseMap[key] = collapsed === true;
        writeModuleCollapseMap(moduleCollapseMap);
      }
    };

    root.querySelectorAll(".module-card[data-module]").forEach((card) => {
      const key = String(card.getAttribute("data-module") || "").trim();
      setCardCollapsed(card, moduleCollapseMap[key] === true, { persist: false });
    });

    const overlay = root.querySelector("#overlay");
    let maximizedCard = null;

    const closeMax = () => {
      if (!maximizedCard) return;
      maximizedCard.classList.remove("is-maximized");
      maximizedCard = null;
      overlay.hidden = true;
      document.body.classList.remove("has-overlay");
    };

    const onEsc = (e) => {
      if (root.hidden) return;
      if (e.key !== "Escape") return;
      if (extractModal.hidden === false) closeExtract();
      else if (hotcopyModal && hotcopyModal.hidden === false) closeHotcopy();
      else if (ipbrainModal && ipbrainModal.hidden === false) closeIpBrain();
      else if (legalReportModal.hidden === false) closeLegalReport();
      else if (legalModal.hidden === false) closeLegal();
      else if (cloneModal.hidden === false) closeCloneModal();
      else if (voiceModal.hidden === false) closeVoiceModal();
      else if (agentModal && agentModal.hidden === false) closeAgent();
      else closeMax();
    };

    overlay.addEventListener("click", closeMax);
    document.addEventListener("keydown", onEsc);

    root.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      const action = btn.getAttribute("data-action");
      if (action === "menu") {
        toast("菜单（占位）。");
        return;
      }
      if (action === "collapse") {
        const card = btn.closest(".module-card");
        if (!card) return;
        const next = !card.classList.contains("is-collapsed");
        setCardCollapsed(card, next);
        return;
      }
      if (action !== "maximize") return;
      const card = btn.closest(".module-card");
      if (!card) return;
      if (card.classList.contains("is-collapsed")) setCardCollapsed(card, false);
      if (card.classList.contains("is-maximized")) {
        closeMax();
        return;
      }
      if (maximizedCard) maximizedCard.classList.remove("is-maximized");
      maximizedCard = card;
      card.classList.add("is-maximized");
      overlay.hidden = false;
      document.body.classList.add("has-overlay");
    });

    extractOverlay.addEventListener("click", closeExtract);
    root.querySelector("#extract-modal-close").addEventListener("click", closeExtract);
    root.querySelector("#extract-cancel").addEventListener("click", closeExtract);
    extractInput.addEventListener("input", updateDouyinUrlHint);
    const handleMissingModelGuide = async (message) => {
      const msg = String(message || "").trim();
      if (!/未找到\s+(ASR|TTS|Video Sync)\s+模型包/i.test(msg)) return false;
      const ok = await confirmDialog({
        title: "缺少本地模型包",
        message: `${msg}\n\n是否立即跳转到“模型”页面处理？`,
        confirmText: "前往模型页",
        cancelText: "暂不处理",
        tone: "warn"
      });
      if (ok) window.location.hash = "#/models";
      return true;
    };

    root.querySelector("#extract-submit").addEventListener("click", async () => {
      if (extractSubmitting || recognizeOverlay?.hidden === false) {
        toast("当前已有提取文案任务在执行。");
        return;
      }
      const v = extractInput.value.trim();
      if (!v) {
        toast("请输入分享文本或链接。");
        extractInput.focus();
        return;
      }
      const douyinUrl = extractDouyinVideoUrl(v);
      if (!douyinUrl && !isDirectVideoLink(v)) {
        toast("未识别到抖音链接。");
        extractInput.focus();
        return;
      }
      localStorage.setItem("ipfactory.extract.lastInput", v);
      extractSubmitting = true;
      closeExtract();
      appendLogLine({ taskId: "", level: "info", message: "---------------- 开始新任务 ----------------" });
      openRecognize(isDirectVideoLink(v) ? "正在解析视频直链..." : "正在解析分享文本/链接...");
      currentTaskId = "";
      recognizeStopRequested = false;

      window.api?.workflow
        ?.extractCopyFromDouyin?.({
          input: douyinUrl || v,
          modelChoice: await hydrateHomeMediaChoice("ASR")
        })
        ?.then((res) => {
          if (recognizeCanceled) return;
          if (!res?.ok) {
            closeRecognize();
            handleMissingModelGuide(res?.message).then((handled) => {
              if (!handled) toast(res?.message || "识别失败。");
            });
            return;
          }
          currentTaskId = res.taskId || "";
          const recognized = sanitizeText(res.recognizedText || "");
          ipStudyResult.value = recognized;
          closeRecognize();
          toast(res?.cacheHit ? "识别完成，已直接复用提取文案缓存。" : res?.videoPath ? "识别完成，视频已写入提取文案缓存。" : "识别完成。");
          if (isCopyAutoRewriteEnabled()) {
            appendLogLine({
              taskId: currentTaskId,
              level: "info",
              message: "已开启“提取后自动智能改写”，开始自动改写视频文案。"
            });
            runRewrite({ content: recognized, count: 300, source: "auto" });
          } else if (syncRecognizedCopyToCopyEditor(recognized)) {
            appendLogLine({
              taskId: currentTaskId,
              level: "info",
              message: "未开启提取后自动智能改写，已将识别文案直接同步到视频文案编辑。"
            });
          }
        })
        .catch((e) => {
          appendLogLine({ taskId: currentTaskId, level: "error", message: String(e?.message || e) });
          closeRecognize();
          toast("处理失败，请查看运行日志。");
        });
    });

    hotcopyOverlay?.addEventListener("click", closeHotcopy);
    hotcopyModalClose?.addEventListener("click", closeHotcopy);
    hotcopyClose?.addEventListener("click", closeHotcopy);
    hotcopyOptions?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-hotcopy-index]");
      if (!btn) return;
      const idx = Number(btn.getAttribute("data-hotcopy-index"));
      if (!Number.isFinite(idx)) return;
      hotcopySelectedIndex = idx;
      renderHotcopyOptions(hotcopyLatestOptions);
      if (hotcopyApply) hotcopyApply.disabled = hotcopySelectedIndex < 0;
    });
    hotcopyApply?.addEventListener("click", () => {
      const text = String(hotcopyLatestOptions?.[hotcopySelectedIndex] || "").trim();
      if (!text) return;
      copyEditContent.value = text;
      updateCopyWordCount();
      closeHotcopy({ force: true });
      copyEditContent?.focus?.();
      copyEditContent?.scrollIntoView?.({ block: "center" });
      toast("已应用到视频文案编辑。");
    });

    const syncHotcopyCount = (from) => {
      const raw = String(from === "range" ? hotcopyCountRange?.value : hotcopyCount?.value || "").trim();
      const v = Number(raw);
      const next = Number.isFinite(v) ? Math.min(800, Math.max(100, v)) : 300;
      if (hotcopyCountRange) hotcopyCountRange.value = String(next);
      if (hotcopyCount) hotcopyCount.value = String(next);
    };
    hotcopyCountRange?.addEventListener("input", () => syncHotcopyCount("range"));
    hotcopyCount?.addEventListener("input", () => {
      const cleaned = String(hotcopyCount.value || "").replace(/[^\d]/g, "");
      hotcopyCount.value = cleaned;
      syncHotcopyCount("text");
    });

    btnGenHotcopy?.addEventListener("click", async () => {
      if (hotcopyGenerating) {
        if (hotcopyTaskId) {
          try {
            await window.api?.llm?.cancel?.(hotcopyTaskId);
          } catch {}
        }
        toast("已请求停止爆款文案生成。");
        return;
      }
      const videoType = String(hotcopyVideoType?.value || "").trim();
      const copyType = String(hotcopyCopyType?.value || "").trim();
      if (!videoType || !copyType) {
        toast("请选择视频类型和文案类型。");
        return;
      }

      const vars = {
        videoType,
        copyType,
        persona: String(hotcopyPersona?.value || "").trim(),
        product: String(hotcopyProduct?.value || "").trim(),
        sellingPointAndPrice: String(hotcopySell?.value || "").trim(),
        otherRequirements: String(hotcopyOther?.value || "").trim(),
        count: Number(String(hotcopyCount?.value || "300").trim()) || 300
      };

      const cfg = readAgentCfg();
      const template = String(cfg?.prompts?.hotcopy || "").trim() || DEFAULT_HOTCOPY_PROMPT_TEMPLATE;
      const prompt = buildHotcopyPromptFromTemplate(template, vars);
      if (!prompt) {
        toast("提示词为空，请检查智能体配置。");
        return;
      }

      const cloudLlms = getCloudLlms();
      const activeCloudId = getActiveCloudLlmId();
      const preferId = String(cfg?.llmId || "").trim();
      const activeId = preferId || activeCloudId;
      const active = cloudLlms.find((x) => x?.id === activeId) || cloudLlms.find((x) => x?.id === activeCloudId) || cloudLlms[0] || null;
      if (!active?.apiKey || !active?.endpoint || !active?.model) {
        toast("请先在“模型-云端大模型”中配置并选择一个云模型。");
        return;
      }
      const systemPrompt = String(cfg?.prompts?.system || "").trim() || String(active?.systemPrompt || "").trim();

      hotcopyGenerating = true;
      hotcopyTaskId = `hotcopy_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      hotcopySelectedIndex = -1;
      hotcopyLatestOptions = [];
      renderHotcopyOptions([]);
      if (hotcopyApply) hotcopyApply.disabled = true;
      openHotcopy();
      setHotcopyGeneratingUI(true, "AI 正在创作中...");
      appendLogLine({ taskId: currentTaskId, level: "info", message: "开始生成爆款文案（3个方案）" });
      try {
        const res = await window.api?.llm?.rewrite?.({
          taskId: hotcopyTaskId,
          content: "请按提示生成。",
          count: vars.count,
          prompt,
          model: active.model,
          endpoint: active.endpoint,
          apiKey: active.apiKey,
          systemPrompt
        });
        if (res?.canceled) {
          appendLogLine({ taskId: hotcopyTaskId || currentTaskId, level: "warn", message: "已停止当前爆款文案生成任务。" });
          setHotcopyErrorUI("已停止当前爆款文案生成。");
          return;
        }
        if (!res?.ok || !res?.content) {
          toast("生成失败，请查看运行日志。");
          appendLogLine({ taskId: currentTaskId, level: "warn", message: `爆款文案生成失败：${String(res?.message || "")}` });
          setHotcopyErrorUI("生成失败，请查看运行日志。");
          return;
        }
        hotcopyLastRaw = String(res.content || "");
        const options = extractHotcopyOptionsFromText(hotcopyLastRaw).map((x) => String(x || "").trim()).filter(Boolean);
        if (!options.length) {
          toast("返回格式异常，请查看运行日志。");
          appendLogLine({ taskId: currentTaskId, level: "warn", message: String(res.content || "") });
          setHotcopyErrorUI("返回格式异常：未解析到可用方案，请查看运行日志。");
          return;
        }
        hotcopyLatestOptions = options.slice(0, 3);
        renderHotcopyOptions(hotcopyLatestOptions);
        setHotcopyGeneratingUI(false, "");
      } catch (e) {
        const message = String(e?.message || e);
        if (!/canceled/i.test(message)) toast("生成失败，请查看运行日志。");
        appendLogLine({ taskId: hotcopyTaskId || currentTaskId, level: /canceled/i.test(message) ? "warn" : "error", message: `爆款文案生成异常：${message}` });
        setHotcopyErrorUI(/canceled/i.test(message) ? "已停止当前爆款文案生成。" : "生成失败，请查看运行日志。");
      } finally {
        hotcopyGenerating = false;
        hotcopyTaskId = "";
        if (!hotcopyProgress?.classList?.contains?.("is-error")) setHotcopyGeneratingUI(false, "");
        updateHotcopyBtnState();
      }
    });

    ipbrainLearnedCache = readIpBrainLearned();
    renderIpBrainLearned();
    updateIpBrainStartState();
    btnIpBrainAdd?.addEventListener("click", openIpBrain);
    ipbrainOverlay?.addEventListener("click", closeIpBrain);
    ipbrainModalClose?.addEventListener("click", closeIpBrain);
    ipbrainCancel?.addEventListener("click", closeIpBrain);
    ipbrainInput?.addEventListener("input", () => {
      ipbrainSelectedUrl = "";
      renderIpBrainDetected();
      updateIpBrainStartState();
    });
    ipbrainStart?.addEventListener("click", async () => {
      const n = Array.isArray(ipbrainLearnedCache) ? ipbrainLearnedCache.length : 0;
      if (n >= 5) {
        toast("已达到学习上限（5个）。");
        return;
      }
      const input = String(ipbrainInput?.value || "").trim();
      if (!input) {
        toast("请输入抖音链接或分享文本。");
        ipbrainInput?.focus?.();
        return;
      }
      if (!ipbrainSelectedUrl) {
        toast("未识别到抖音链接。");
        return;
      }
      if (!window.api?.ipbrain?.collect) {
        toast("IP大脑采集能力未就绪。");
        return;
      }
      if (ipbrainCollecting) return;
      ipbrainCollecting = true;
      const oldText = ipbrainStart.textContent;
      ipbrainStart.textContent = "采集中...";
      updateIpBrainStartState();
      try {
        const res = await window.api.ipbrain.collect({ input });
        if (!res?.ok) {
          toast("采集失败，请检查链接或稍后重试。");
          appendLogLine({ taskId: currentTaskId, level: "warn", message: `IP大脑采集失败：${String(res?.message || "")}` });
          return;
        }
        const sourceTitles = Array.isArray(res?.titles) ? res.titles.map((x) => String(x || "").trim()).filter(Boolean) : [];
        if (!sourceTitles.length) {
          toast("未采集到标题，请换一个链接。");
          appendLogLine({ taskId: currentTaskId, level: "warn", message: "IP大脑采集返回标题为空" });
          return;
        }

        const cfg = readAgentCfg();
        const cloudLlms = getCloudLlms();
        const activeCloudId = getActiveCloudLlmId();
        const preferId = String(cfg?.llmId || "").trim();
        const activeId = preferId || activeCloudId;
        const active = cloudLlms.find((x) => x?.id === activeId) || cloudLlms.find((x) => x?.id === activeCloudId) || cloudLlms[0] || null;
        let aiTitles = [];
        if (active?.apiKey && active?.endpoint && active?.model) {
          const prompt = String(cfg?.prompts?.ipbrainTitle || "").trim() || DEFAULT_IPBRAIN_TITLE_PROMPT;
          const systemPrompt = String(cfg?.prompts?.system || "").trim() || String(active?.systemPrompt || "").trim();
          const content = sourceTitles.slice(0, 5).join("\n");
          const aiOut = await window.api?.llm?.rewrite?.({
            content,
            count: 120,
            prompt,
            model: active.model,
            endpoint: active.endpoint,
            apiKey: active.apiKey,
            systemPrompt
          });
          aiTitles = aiOut?.ok && aiOut?.content ? normalizeTitleLines(aiOut.content) : [];
        } else {
          appendLogLine({ taskId: currentTaskId, level: "warn", message: "未配置云端大模型，已仅保存原始标题（未生成新标题）。" });
        }

        const secUid = String(res?.secUid || "").trim();
        const nextItem = {
          id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
          secUid,
          accountName: String(res?.accountName || "").trim() || "抖音账号",
          sourceUrl: String(res?.sourceUrl || "").trim(),
          sourceTitles: sourceTitles.slice(0, 5),
          aiTitles,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };

        const prev = Array.isArray(ipbrainLearnedCache) ? ipbrainLearnedCache : [];
        const key = secUid ? secUid : `name:${String(nextItem.accountName || "").trim()}`;
        const existed = prev.find((x) => {
          const sid = String(x?.secUid || "").trim();
          if (secUid && sid) return sid === secUid;
          const nm = String(x?.accountName || "").trim();
          if (nm && nextItem.accountName) return nm === nextItem.accountName;
          return false;
        });
        const merged = existed
          ? { ...existed, ...nextItem, id: existed.id || nextItem.id, createdAt: existed.createdAt || nextItem.createdAt }
          : nextItem;

        ipbrainLearnedCache = [merged, ...prev.filter((x) => x !== existed)].slice(0, 5);
        ipbrainActiveKey = key;
        writeIpBrainLearned(ipbrainLearnedCache);
        renderIpBrainLearned();
        closeIpBrain();
        toast(aiTitles.length ? "已完成采集并生成新标题。" : "已完成采集（未生成新标题）。");
      } catch (e) {
        toast("采集失败，请查看运行日志。");
        appendLogLine({ taskId: currentTaskId, level: "error", message: `IP大脑采集异常：${String(e?.message || e)}` });
      } finally {
        ipbrainCollecting = false;
        ipbrainStart.textContent = oldText;
        updateIpBrainStartState();
      }
    });
    ipbrainAccounts?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-ipbrain-act]");
      if (!btn) return;
      const act = btn.getAttribute("data-ipbrain-act");
      const row = btn.closest("[data-key]");
      const key = String(row?.getAttribute("data-key") || "").trim();
      if (!key) return;
      if (act === "select") {
        ipbrainActiveKey = key;
        ipbrainActiveTopic = "";
        renderIpBrainLearned();
        return;
      }
      if (act === "remove") {
        const next = (Array.isArray(ipbrainLearnedCache) ? ipbrainLearnedCache : []).filter((x) => getIpBrainKey(x) !== key);
        ipbrainLearnedCache = next;
        if (ipbrainActiveKey === key) ipbrainActiveKey = "";
        if (ipbrainActiveKey === "") ipbrainActiveTopic = "";
        writeIpBrainLearned(ipbrainLearnedCache);
        renderIpBrainLearned();
        toast("已删除对标。");
      }
    });

    ipbrainTopics?.addEventListener("click", (e) => {
      const el = e.target.closest("[data-topic]");
      if (!el) return;
      const t = String(el.getAttribute("data-topic") || "").trim();
      if (!t) return;
      ipbrainActiveTopic = t;
      renderIpBrainTopics();
    });

    root.querySelector("#recognize-cancel").addEventListener("click", () => {
      requestStopRecognize().catch(() => {});
    });

    if (window.__ipfactoryWorkflowUnsub) {
      try {
        window.__ipfactoryWorkflowUnsub();
      } catch {}
      window.__ipfactoryWorkflowUnsub = null;
    }

    window.__ipfactoryWorkflowUnsub = window.api?.workflow?.onProgress?.((data) => {
      const taskId = data?.taskId || "";
      if (!taskId) return;
      if (currentTaskId && taskId !== currentTaskId) return;
      if (!currentTaskId) currentTaskId = taskId;
      if (recognizeStopRequested) {
        recognizeStopRequested = false;
        try {
          window.api?.workflow?.cancel?.(taskId);
        } catch {}
        return;
      }
      if (recognizeOverlay.hidden) return;
      const msg = data?.message || "";
      if (msg) recognizeSub.textContent = msg;
    });

    if (window.__ipfactoryWorkflowLogUnsub) {
      try {
        window.__ipfactoryWorkflowLogUnsub();
      } catch {}
      window.__ipfactoryWorkflowLogUnsub = null;
    }

    window.__ipfactoryWorkflowLogUnsub = window.api?.workflow?.onLog?.((data) => {
      const taskId = data?.taskId || "";
      const level = data?.level || "info";
      const message = data?.message || "";
      appendLogLine({ taskId, level, message });
    });

    if (window.__ipfactoryApplyCopyUnsub) {
      try {
        window.removeEventListener("ipfactory:applyOptimizedCopy", window.__ipfactoryApplyCopyUnsub);
      } catch {}
      window.__ipfactoryApplyCopyUnsub = null;
    }
    window.__ipfactoryApplyCopyUnsub = (e) => {
      const text = String(e?.detail?.text || "");
      if (!text) return;
      copyEditContent.value = text;
      updateCopyWordCount();
      toast("已应用优化文案。");
    };
    window.addEventListener("ipfactory:applyOptimizedCopy", window.__ipfactoryApplyCopyUnsub);

    copyEditContent.addEventListener("input", updateCopyWordCount);
    updateCopyWordCount();

    ipStudyTabsEl?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-tab]");
      if (!btn) return;
      setIpStudyTab(btn.getAttribute("data-tab"));
      updateCopyWordCount();
    });
    const defaultIpTab = ipStudyTabsEl?.querySelector?.(".seg-tab.is-active")?.getAttribute?.("data-tab");
    setIpStudyTab(defaultIpTab || "video");
    copyWordCount?.addEventListener?.("input", () => {
      if (ipStudyTab !== "ip") return;
      const v = String(copyWordCount.value || "").replace(/[^\d]/g, "");
      copyWordCount.value = v ? String(Math.min(5000, Math.max(30, Number(v) || 300))) : "";
    });

    metaKwTabs?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-kw-cat]");
      if (!btn) return;
      setMetaKwActiveCat(btn.getAttribute("data-kw-cat"));
    });
    metaTitle?.addEventListener("input", () => {
      emitHomeMetaChanged();
    });
    metaTags?.addEventListener("input", () => {
      emitHomeMetaChanged();
    });
    metaKwText?.addEventListener("input", () => {
      metaKwMap[metaKwActiveCat] = parseHumanList(metaKwText.value);
      renderMetaKwCount();
      persistMetaKwMap();
    });
    setMetaKwActiveCat(metaKwActiveCat);

    btnVoicePicker?.addEventListener("click", openVoiceModal);
    ensureValidActiveVoice();
    renderVoicePicked();

    return root;
  }
};
