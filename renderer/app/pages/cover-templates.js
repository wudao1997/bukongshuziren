import { confirmDialog, elFromHTML, inputChoiceDialog, pageHeader, topToast } from "../ui.js";
import { compressDataUrlImage, createCoverTemplatePreviewDataUrl, pickImageAsDataUrl } from "../gongneng/mobanyulan.js";
import { buildTemplateFontCss, createTemplatePreviewScheduler, decodeTemplateFontValue, ensureProjectTemplateFonts, mergeTemplatePatch } from "../gongneng/mubanyulantongbu.js";
import { createTemplateHistoryManager } from "../gongneng/mobanlishi.js";
import { ensureTonghangCoverTemplateStore } from "../gongneng/tonghangmoban.js";
import {
  buildUniqueCloudTemplateName,
  canUploadTemplateByIdentity,
  deleteTemplateFromCloud,
  ensureTemplateCloudIdentity,
  fetchCloudTemplates,
  findCloudTemplateNameConflict,
  getTemplateCloudCache,
  mergeTemplateCollections,
  splitTemplatesBySource,
  uploadTemplateToCloud
} from "../gongneng/mubanyuntongbu.js";

export const route = {
  path: "/cover-templates",
  title: "封面模板",
  async render() {
    const PAGE_PATH = "/cover-templates";
    const root = elFromHTML(`
      <div class="sticky-page-layout">
        ${pageHeader({
          title: "封面模板",
          subtitle: "模板管理｜主标题/副标题｜背景/蒙版｜用于首页“封面制作”一键套用",
          actionsHTML: `
            <button class="btn" id="ctpl-add">新增模板</button>
            <button class="btn" id="ctpl-dup" disabled>复制</button>
            <button class="btn btn-danger" id="ctpl-del" disabled>删除</button>
            <button class="btn btn-primary" id="ctpl-save" disabled>保存</button>
          `
        })}

        <div class="sticky-page-body">
          <div class="ctpl">
          <div class="card ctpl-side">
            <div class="card-title">
              <h3>模板列表</h3>
              <span class="pill" id="ctpl-count">0</span>
            </div>
            <div class="ctpl-list" id="ctpl-list"></div>
            <div class="divider" style="margin-top: 10px"></div>
            <div class="field" style="margin-top: 10px">
              <div class="label">从首页读取标题</div>
              <div class="card-actions" style="justify-content: space-between">
                <span class="pill" id="ctpl-home-title">未读取</span>
                <button class="btn" id="ctpl-reload-title">重新加载</button>
              </div>
            </div>
          </div>

          <div class="card ctpl-preview-card">
            <div class="card-title">
              <h3>实时预览</h3>
              <span class="pill" id="ctpl-preview-hint">拖拽标题/副标题/蒙版可快速定位</span>
            </div>
            <div class="card-actions" style="justify-content: space-between; flex-wrap: wrap">
              <span class="pill">模板封面与底图</span>
              <div class="card-actions" style="gap: 8px">
                <button class="btn" id="ctpl-bg-upload" type="button">上传背景图</button>
                <button class="btn" id="ctpl-bg-clear" type="button">清空背景图</button>
                <button class="btn btn-primary" id="ctpl-cover-capture" type="button">设为当前画面封面</button>
                <button class="btn" id="ctpl-cover-clear" type="button">清空模板封面</button>
                <button class="btn btn-primary" id="ctpl-upload-cloud" type="button" hidden>上传到云端</button>
              </div>
            </div>
            <div class="ctpl-stage">
              <div class="ctpl-phone">
                <div class="ctpl-phone-inner" id="ctpl-preview">
                  <div class="ctpl-bg" id="ctpl-bg"></div>
                  <div class="ctpl-mask" id="ctpl-mask" hidden></div>
                  <div class="ctpl-text ctpl-main" id="ctpl-main">主标题示例</div>
                  <div class="ctpl-text ctpl-sub" id="ctpl-sub" hidden>副标题示例</div>
                </div>
              </div>
              <div class="ctpl-cover-meta">
                <div class="ctpl-cover-thumb" id="ctpl-cover-thumb"></div>
                <div class="ctpl-cover-text">
                  <div class="ctpl-cover-title">模板选择封面</div>
                  <div class="ctpl-cover-sub" id="ctpl-cover-status">未设置模板封面，将使用当前模板实时生成预览。</div>
                </div>
              </div>
              <div class="ctpl-stage-foot">
                <span class="pill" id="ctpl-active-id">未选择模板</span>
                <span class="pill" id="ctpl-active-updated">—</span>
              </div>
            </div>
          </div>

          <div class="card ctpl-editor">
            <div class="card-title">
              <h3>模板设置</h3>
              <div class="card-actions" style="gap: 8px; flex-wrap: wrap">
                <span class="pill">基础/背景/蒙版/主标题/副标题</span>
                <button class="btn btn-small" id="ctpl-undo" type="button" disabled>撤销</button>
                <button class="btn btn-small" id="ctpl-redo" type="button" disabled>恢复</button>
              </div>
            </div>

            <div class="ctpl-editor-body">
              <div class="ctpl-nav" id="ctpl-nav">
                <button class="ctpl-nav-item is-active" type="button" data-sec="base">基础设置</button>
                <button class="ctpl-nav-item" type="button" data-sec="background">背景设置</button>
                <button class="ctpl-nav-item" type="button" data-sec="mask">蒙版设置</button>
                <button class="ctpl-nav-item" type="button" data-sec="main">主标题设置</button>
                <button class="ctpl-nav-item" type="button" data-sec="sub">副标题设置</button>
              </div>

              <div class="ctpl-scroll" id="ctpl-scroll">
                <div class="ctpl-section" data-sec="base">
                  <div class="field">
                    <div class="label">模板名称</div>
                    <input id="ctpl-name" type="text" placeholder="例如：黄字大字报 + 黑描边" />
                  </div>

                  <div class="grid cols-2" style="gap: 10px; margin-top: 10px">
                    <div class="field">
                      <div class="label">画布分辨率（基准）</div>
                      <select id="ctpl-base-res">
                        <option value="1080x1440" selected>1080×1440（竖封面 3:4｜抖音推荐）</option>
                        <option value="720x1280">720×1280</option>
                        <option value="1080x1920">1080×1920（9:16）</option>
                        <option value="1080x1350">1080×1350（4:5）</option>
                        <option value="custom">自定义</option>
                      </select>
                    </div>
                    <div class="field">
                      <div class="label">自定义分辨率</div>
                      <div class="grid cols-2" style="gap: 10px">
                        <input id="ctpl-base-w" type="text" value="1080" />
                        <input id="ctpl-base-h" type="text" value="1440" />
                      </div>
                    </div>
                  </div>
                </div>

                <div class="divider" style="margin-top: 12px"></div>

                <div class="ctpl-section" data-sec="background">
                  <div class="ctpl-sec-head">
                    <div class="ctpl-sec-title">背景设置</div>
                    <div class="ctpl-sec-sub">用于截帧底图的模糊/压暗效果（预览为近似效果）</div>
                  </div>
                  <div class="grid cols-2" style="gap: 10px; margin-top: 10px">
                    <div class="field">
                      <div class="label">背景模糊</div>
                      <div class="ctpl-range">
                        <input id="ctpl-bg-blur" type="range" min="0" max="20" step="1" value="0" />
                        <input id="ctpl-bg-blur-text" type="text" value="0" />
                      </div>
                    </div>
                    <div class="field">
                      <div class="label">背景压暗（%）</div>
                      <div class="ctpl-range">
                        <input id="ctpl-bg-dim" type="range" min="0" max="80" step="1" value="10" />
                        <input id="ctpl-bg-dim-text" type="text" value="10" />
                      </div>
                    </div>
                  </div>
                </div>

                <div class="divider" style="margin-top: 12px"></div>

                <div class="ctpl-section" data-sec="mask">
                  <div class="ctpl-sec-head">
                    <div class="ctpl-sec-title">蒙版设置</div>
                    <div class="ctpl-sec-sub">用于承载文字的半透明区域（可拖拽调整位置）</div>
                  </div>
                  <div class="field" style="margin-top: 10px">
                    <label class="chk"><input type="checkbox" id="ctpl-mask-enable" /> 启用蒙版</label>
                  </div>
                  <div class="grid cols-2" style="gap: 10px; margin-top: 10px">
                    <div class="field">
                      <div class="label">蒙版颜色</div>
                      <div class="ctpl-color">
                        <input id="ctpl-mask-color" type="color" value="#000000" />
                        <input id="ctpl-mask-color-text" type="text" value="#000000" />
                      </div>
                    </div>
                    <div class="field">
                      <div class="label">透明度（%）</div>
                      <div class="ctpl-range">
                        <input id="ctpl-mask-alpha" type="range" min="0" max="80" step="1" value="25" />
                        <input id="ctpl-mask-alpha-text" type="text" value="25" />
                      </div>
                    </div>
                  </div>
                  <div class="grid cols-4" style="gap: 10px; margin-top: 10px">
                    <div class="field">
                      <div class="label">X（%）</div>
                      <input id="ctpl-mask-x" type="text" value="6" />
                    </div>
                    <div class="field">
                      <div class="label">Y（%）</div>
                      <input id="ctpl-mask-y" type="text" value="60" />
                    </div>
                    <div class="field">
                      <div class="label">宽（%）</div>
                      <input id="ctpl-mask-w" type="text" value="88" />
                    </div>
                    <div class="field">
                      <div class="label">高（%）</div>
                      <input id="ctpl-mask-h" type="text" value="22" />
                    </div>
                  </div>
                </div>

                <div class="divider" style="margin-top: 12px"></div>

                <div class="ctpl-section" data-sec="main">
                  <div class="ctpl-sec-head">
                    <div class="ctpl-sec-title">主标题设置</div>
                    <div class="ctpl-sec-sub">默认套用首页“标题”内容（可拖拽调整位置）</div>
                  </div>
                  <div class="field" style="margin-top: 10px">
                    <div class="label">预览主标题文本</div>
                    <input id="ctpl-main-preview-text" type="text" placeholder="不填则使用首页标题" />
                    <div class="hint">仅用于本页实时预览，不会写入模板</div>
                  </div>
                  <div class="grid cols-2" style="gap: 10px; margin-top: 10px">
                    <div class="field">
                      <div class="label">对齐</div>
                      <select id="ctpl-main-align">
                        <option value="left">左对齐</option>
                        <option value="center" selected>居中</option>
                        <option value="right">右对齐</option>
                      </select>
                    </div>
                    <div class="field">
                      <div class="label">字体</div>
                      <select id="ctpl-main-font"></select>
                    </div>
                  </div>
                  <div class="grid cols-2" style="gap: 10px; margin-top: 10px">
                    <div class="field">
                      <div class="label">字号</div>
                      <div class="ctpl-range">
                        <input id="ctpl-main-size" type="range" min="20" max="180" step="1" value="98" />
                        <input id="ctpl-main-size-text" type="text" value="98" />
                      </div>
                    </div>
                    <div class="field">
                      <div class="label">位置（%）</div>
                      <div class="grid cols-2" style="gap: 10px">
                        <input id="ctpl-main-x" type="text" value="50" />
                        <input id="ctpl-main-y" type="text" value="10" />
                      </div>
                      <div class="hint">X/Y 为百分比（X 为对齐锚点位置）</div>
                    </div>
                  </div>
                  <div class="grid cols-2" style="gap: 10px; margin-top: 10px">
                    <div class="field">
                      <div class="label">文字颜色</div>
                      <div class="ctpl-color">
                        <input id="ctpl-main-color" type="color" value="#f5c400" />
                        <input id="ctpl-main-color-text" type="text" value="#f5c400" />
                      </div>
                    </div>
                    <div class="field">
                      <div class="label">描边颜色</div>
                      <div class="ctpl-color">
                        <input id="ctpl-main-ocolor" type="color" value="#000000" />
                        <input id="ctpl-main-ocolor-text" type="text" value="#000000" />
                      </div>
                    </div>
                  </div>
                  <div class="grid cols-2" style="gap: 10px; margin-top: 10px">
                    <div class="field">
                      <div class="label">描边宽度</div>
                      <div class="ctpl-range">
                        <input id="ctpl-main-outline" type="range" min="0" max="16" step="1" value="6" />
                        <input id="ctpl-main-outline-text" type="text" value="6" />
                      </div>
                    </div>
                    <div class="field">
                      <div class="label">样式</div>
                      <div class="inline-flags">
                        <label class="chk"><input type="checkbox" id="ctpl-main-bold" checked /> 加粗</label>
                        <label class="chk"><input type="checkbox" id="ctpl-main-shadow" checked /> 阴影</label>
                      </div>
                    </div>
                  </div>
                  <div class="grid cols-2" style="gap: 10px; margin-top: 10px">
                    <div class="field">
                      <div class="label">每行最大字符数</div>
                      <div class="ctpl-range">
                        <input id="ctpl-main-maxchars" type="range" min="6" max="18" step="1" value="8" />
                        <input id="ctpl-main-maxchars-text" type="text" value="8" />
                      </div>
                    </div>
                    <div class="field">
                      <div class="label">最多行数</div>
                      <select id="ctpl-main-lines">
                        <option value="1">1 行</option>
                        <option value="2" selected>2 行</option>
                        <option value="3">3 行</option>
                      </select>
                    </div>
                  </div>
                  <div class="grid cols-2" style="gap: 10px; margin-top: 10px">
                    <div class="field">
                      <div class="label">行间距（%）</div>
                      <div class="ctpl-range">
                        <input id="ctpl-main-gap" type="range" min="0" max="30" step="1" value="4" />
                        <input id="ctpl-main-gap-text" type="text" value="4" />
                      </div>
                    </div>
                    <div class="field">
                      <div class="label">字间距（px）</div>
                      <div class="ctpl-range">
                        <input id="ctpl-main-spacing" type="range" min="0" max="20" step="1" value="0" />
                        <input id="ctpl-main-spacing-text" type="text" value="0" />
                      </div>
                    </div>
                  </div>
                </div>

                <div class="divider" style="margin-top: 12px"></div>

                <div class="ctpl-section" data-sec="sub">
                  <div class="ctpl-sec-head">
                    <div class="ctpl-sec-title">副标题设置</div>
                    <div class="ctpl-sec-sub">可选展示，默认用于短句补充（可拖拽调整位置）</div>
                  </div>
                  <div class="field" style="margin-top: 10px">
                    <label class="chk"><input type="checkbox" id="ctpl-sub-enable" /> 启用副标题</label>
                  </div>
                  <div class="field" style="margin-top: 10px">
                    <div class="label">预览副标题文本</div>
                    <input id="ctpl-sub-preview-text" type="text" placeholder="不填则使用默认示例" />
                    <div class="hint">仅用于本页实时预览，不会写入模板</div>
                  </div>
                  <div class="grid cols-2" style="gap: 10px; margin-top: 10px">
                    <div class="field">
                      <div class="label">对齐</div>
                      <select id="ctpl-sub-align">
                        <option value="left">左对齐</option>
                        <option value="center" selected>居中</option>
                        <option value="right">右对齐</option>
                      </select>
                    </div>
                    <div class="field">
                      <div class="label">字体</div>
                      <select id="ctpl-sub-font"></select>
                    </div>
                  </div>
                  <div class="grid cols-2" style="gap: 10px; margin-top: 10px">
                    <div class="field">
                      <div class="label">字号</div>
                      <div class="ctpl-range">
                        <input id="ctpl-sub-size" type="range" min="16" max="120" step="1" value="54" />
                        <input id="ctpl-sub-size-text" type="text" value="54" />
                      </div>
                    </div>
                    <div class="field">
                      <div class="label">位置（%）</div>
                      <div class="grid cols-2" style="gap: 10px">
                        <input id="ctpl-sub-x" type="text" value="50" />
                        <input id="ctpl-sub-y" type="text" value="76" />
                      </div>
                    </div>
                  </div>
                  <div class="grid cols-2" style="gap: 10px; margin-top: 10px">
                    <div class="field">
                      <div class="label">每行最大字符数</div>
                      <div class="ctpl-range">
                        <input id="ctpl-sub-maxchars" type="range" min="6" max="24" step="1" value="14" />
                        <input id="ctpl-sub-maxchars-text" type="text" value="14" />
                      </div>
                    </div>
                    <div class="field">
                      <div class="label">最多行数</div>
                      <select id="ctpl-sub-lines">
                        <option value="1">1 行</option>
                        <option value="2" selected>2 行</option>
                        <option value="3">3 行</option>
                      </select>
                    </div>
                  </div>
                  <div class="grid cols-2" style="gap: 10px; margin-top: 10px">
                    <div class="field">
                      <div class="label">文字颜色</div>
                      <div class="ctpl-color">
                        <input id="ctpl-sub-color" type="color" value="#ffffff" />
                        <input id="ctpl-sub-color-text" type="text" value="#ffffff" />
                      </div>
                    </div>
                    <div class="field">
                      <div class="label">描边颜色</div>
                      <div class="ctpl-color">
                        <input id="ctpl-sub-ocolor" type="color" value="#000000" />
                        <input id="ctpl-sub-ocolor-text" type="text" value="#000000" />
                      </div>
                    </div>
                  </div>
                  <div class="grid cols-2" style="gap: 10px; margin-top: 10px">
                    <div class="field">
                      <div class="label">描边宽度</div>
                      <div class="ctpl-range">
                        <input id="ctpl-sub-outline" type="range" min="0" max="16" step="1" value="4" />
                        <input id="ctpl-sub-outline-text" type="text" value="4" />
                      </div>
                    </div>
                    <div class="field">
                      <div class="label">样式</div>
                      <div class="inline-flags">
                        <label class="chk"><input type="checkbox" id="ctpl-sub-bold" checked /> 加粗</label>
                        <label class="chk"><input type="checkbox" id="ctpl-sub-shadow" checked /> 阴影</label>
                      </div>
                    </div>
                  </div>
                  <div class="grid cols-2" style="gap: 10px; margin-top: 10px">
                    <div class="field">
                      <div class="label">行间距（%）</div>
                      <div class="ctpl-range">
                        <input id="ctpl-sub-gap" type="range" min="0" max="30" step="1" value="4" />
                        <input id="ctpl-sub-gap-text" type="text" value="4" />
                      </div>
                    </div>
                    <div class="field">
                      <div class="label">字间距（px）</div>
                      <div class="ctpl-range">
                        <input id="ctpl-sub-spacing" type="range" min="0" max="20" step="1" value="0" />
                        <input id="ctpl-sub-spacing-text" type="text" value="0" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    `);

    const KEY_STORE = "ipfactory.cover.templates.v1";
    const HOME_INPUT_MEM_KEY = "ipfactory.home.inputs.v1";

    const ctplList = root.querySelector("#ctpl-list");
    const ctplCount = root.querySelector("#ctpl-count");
    const btnAdd = root.querySelector("#ctpl-add");
    const btnDup = root.querySelector("#ctpl-dup");
    const btnDel = root.querySelector("#ctpl-del");
    const btnSave = root.querySelector("#ctpl-save");

    const nameInput = root.querySelector("#ctpl-name");
    const homeTitlePill = root.querySelector("#ctpl-home-title");
    const reloadTitleBtn = root.querySelector("#ctpl-reload-title");

    const preview = root.querySelector("#ctpl-preview");
    const bgEl = root.querySelector("#ctpl-bg");
    const maskEl = root.querySelector("#ctpl-mask");
    const mainEl = root.querySelector("#ctpl-main");
    const subEl = root.querySelector("#ctpl-sub");
    const ctplPreviewHint = root.querySelector("#ctpl-preview-hint");
    const ctplUndo = root.querySelector("#ctpl-undo");
    const ctplRedo = root.querySelector("#ctpl-redo");
    const ctplBgUpload = root.querySelector("#ctpl-bg-upload");
    const ctplBgClear = root.querySelector("#ctpl-bg-clear");
    const ctplCoverCapture = root.querySelector("#ctpl-cover-capture");
    const ctplCoverClear = root.querySelector("#ctpl-cover-clear");
    const ctplUploadCloud = root.querySelector("#ctpl-upload-cloud");
    const ctplCoverThumb = root.querySelector("#ctpl-cover-thumb");
    const ctplCoverStatus = root.querySelector("#ctpl-cover-status");
    const activeIdPill = root.querySelector("#ctpl-active-id");
    const activeUpdatedPill = root.querySelector("#ctpl-active-updated");

    const baseResSel = root.querySelector("#ctpl-base-res");
    const baseW = root.querySelector("#ctpl-base-w");
    const baseH = root.querySelector("#ctpl-base-h");

    const bgBlur = root.querySelector("#ctpl-bg-blur");
    const bgBlurText = root.querySelector("#ctpl-bg-blur-text");
    const bgDim = root.querySelector("#ctpl-bg-dim");
    const bgDimText = root.querySelector("#ctpl-bg-dim-text");

    const maskEnable = root.querySelector("#ctpl-mask-enable");
    const maskColor = root.querySelector("#ctpl-mask-color");
    const maskColorText = root.querySelector("#ctpl-mask-color-text");
    const maskAlpha = root.querySelector("#ctpl-mask-alpha");
    const maskAlphaText = root.querySelector("#ctpl-mask-alpha-text");
    const maskX = root.querySelector("#ctpl-mask-x");
    const maskY = root.querySelector("#ctpl-mask-y");
    const maskW = root.querySelector("#ctpl-mask-w");
    const maskH = root.querySelector("#ctpl-mask-h");

    const mainAlign = root.querySelector("#ctpl-main-align");
    const mainFont = root.querySelector("#ctpl-main-font");
    const mainSize = root.querySelector("#ctpl-main-size");
    const mainSizeText = root.querySelector("#ctpl-main-size-text");
    const mainX = root.querySelector("#ctpl-main-x");
    const mainY = root.querySelector("#ctpl-main-y");
    const mainColor = root.querySelector("#ctpl-main-color");
    const mainColorText = root.querySelector("#ctpl-main-color-text");
    const mainOColor = root.querySelector("#ctpl-main-ocolor");
    const mainOColorText = root.querySelector("#ctpl-main-ocolor-text");
    const mainOutline = root.querySelector("#ctpl-main-outline");
    const mainOutlineText = root.querySelector("#ctpl-main-outline-text");
    const mainBold = root.querySelector("#ctpl-main-bold");
    const mainShadow = root.querySelector("#ctpl-main-shadow");
    const mainMaxChars = root.querySelector("#ctpl-main-maxchars");
    const mainMaxCharsText = root.querySelector("#ctpl-main-maxchars-text");
    const mainLines = root.querySelector("#ctpl-main-lines");
    const mainGap = root.querySelector("#ctpl-main-gap");
    const mainGapText = root.querySelector("#ctpl-main-gap-text");
    const mainSpacing = root.querySelector("#ctpl-main-spacing");
    const mainSpacingText = root.querySelector("#ctpl-main-spacing-text");
    const mainPreviewText = root.querySelector("#ctpl-main-preview-text");

    const subEnable = root.querySelector("#ctpl-sub-enable");
    const subAlign = root.querySelector("#ctpl-sub-align");
    const subFont = root.querySelector("#ctpl-sub-font");
    const subSize = root.querySelector("#ctpl-sub-size");
    const subSizeText = root.querySelector("#ctpl-sub-size-text");
    const subX = root.querySelector("#ctpl-sub-x");
    const subY = root.querySelector("#ctpl-sub-y");
    const subMaxChars = root.querySelector("#ctpl-sub-maxchars");
    const subMaxCharsText = root.querySelector("#ctpl-sub-maxchars-text");
    const subLines = root.querySelector("#ctpl-sub-lines");
    const subColor = root.querySelector("#ctpl-sub-color");
    const subColorText = root.querySelector("#ctpl-sub-color-text");
    const subOColor = root.querySelector("#ctpl-sub-ocolor");
    const subOColorText = root.querySelector("#ctpl-sub-ocolor-text");
    const subOutline = root.querySelector("#ctpl-sub-outline");
    const subOutlineText = root.querySelector("#ctpl-sub-outline-text");
    const subBold = root.querySelector("#ctpl-sub-bold");
    const subShadow = root.querySelector("#ctpl-sub-shadow");
    const subGap = root.querySelector("#ctpl-sub-gap");
    const subGapText = root.querySelector("#ctpl-sub-gap-text");
    const subSpacing = root.querySelector("#ctpl-sub-spacing");
    const subSpacingText = root.querySelector("#ctpl-sub-spacing-text");
    const subPreviewText = root.querySelector("#ctpl-sub-preview-text");

    const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
    const nowTs = () => Date.now();
    const uid = () => `ctpl_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const toast = (msg, type) => topToast(msg, { type: type || "success" });
    const PREFERRED_COVER_FONT_NAMES = ["黑体.ttf", "阿里普惠体-Regular.otf", "思源黑体 Normal.otf", "MaokenAssortedSans-Lite.ttf"];
    const SYSTEM_FONT_ALIAS_KEYS = new Set([
      "microsoft yahei",
      "microsoftyahei",
      "微软雅黑",
      "microsoft yahei ui",
      "microsoft yahei ui light",
      "microsoft yahei light",
      "simhei",
      "黑体",
      "simsun",
      "宋体"
    ]);
    const normalizeFontAliasKey = (value) =>
      String(value || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ")
        .replace(/[()（）]/g, "");
    const isSystemFontAlias = (value) => SYSTEM_FONT_ALIAS_KEYS.has(normalizeFontAliasKey(value));
    let previewHintTimer = 0;
    const setPreviewHint = (text, { autoReset = false } = {}) => {
      if (!ctplPreviewHint) return;
      ctplPreviewHint.textContent = String(text || "拖拽标题/副标题/蒙版可快速定位");
      if (!autoReset) return;
      if (previewHintTimer) window.clearTimeout(previewHintTimer);
      previewHintTimer = window.setTimeout(() => {
        if (ctplPreviewHint) ctplPreviewHint.textContent = "拖拽标题/副标题/蒙版可快速定位";
      }, 1200);
    };
    const getTemplateSource = (tpl) => {
      const source = String(tpl?.templateSource || tpl?.source || "").trim();
      if (source) return source;
      return String(tpl?.id || "") === "system" ? "system" : "local";
    };
    const getTemplateRecordId = (tpl) => String(tpl?.cloudTemplateId || tpl?.templateId || tpl?.id || "").trim();
    const resolveTemplateSelectionId = (list, wantedId) => {
      const wanted = String(wantedId || "").trim();
      if (!wanted) return "";
      const hit = (Array.isArray(list) ? list : []).find(
        (item) => String(item?.id || "").trim() === wanted || getTemplateRecordId(item) === wanted
      );
      return String(hit?.id || wanted).trim();
    };
    const extractLocalTemplates = (list) =>
      (Array.isArray(list) ? list : []).filter((item) => getTemplateSource(item) !== "cloud");
    const refreshUploadBtnVisibility = () => {
      if (!ctplUploadCloud) return;
      ctplUploadCloud.hidden = !canUploadTemplateByIdentity();
    };

    const normalizeHex = (v, fallback = "#ffffff") => {
      const s = String(v || "").trim();
      if (/^#[0-9a-fA-F]{6}$/.test(s)) return s.toLowerCase();
      return fallback;
    };
    const escapeHtml = (s) =>
      String(s || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");

    const readHomeTitle = () => {
      try {
        const raw = localStorage.getItem(HOME_INPUT_MEM_KEY);
        const parsed = JSON.parse(raw || "{}");
        return String(parsed?.["meta-title"] || "").trim();
      } catch {
        return "";
      }
    };
    const refreshHomeTitle = () => {
      const t = readHomeTitle();
      if (homeTitlePill) homeTitlePill.textContent = t ? (t.length > 18 ? `${t.slice(0, 18)}...` : t) : "未读取";
      if (homeTitlePill) homeTitlePill.title = t || "";
      return t;
    };
    const resolvePreferredTemplateFontName = () => {
      const list = Array.isArray(fonts) ? fonts : [];
      for (const wanted of PREFERRED_COVER_FONT_NAMES) {
        if (list.some((item) => String(item?.name || "").trim().toLowerCase() === wanted.toLowerCase())) return wanted;
      }
      return PREFERRED_COVER_FONT_NAMES[0];
    };
    const resolvePreferredTemplateFontValue = () => {
      const preferred = resolvePreferredTemplateFontName();
      const hasPreferred = (Array.isArray(fonts) ? fonts : []).some(
        (item) => String(item?.name || "").trim().toLowerCase() === preferred.toLowerCase()
      );
      return hasPreferred ? encodeURIComponent(preferred) : "Microsoft YaHei";
    };
    const normalizeSystemCoverTemplateFonts = (tpl) => {
      const target = tpl && typeof tpl === "object" ? { ...tpl } : {};
      if (String(target?.id || "").trim() !== "system") return { template: target, changed: false };
      const preferredFont = resolvePreferredTemplateFontName();
      let changed = false;
      const fixBlockFont = (block) => {
        const next = block && typeof block === "object" ? { ...block } : {};
        const current = String(next.font || "").trim();
        if (!current || isSystemFontAlias(current)) {
          next.font = preferredFont;
          changed = true;
        }
        return next;
      };
      target.main = fixBlockFont(target.main);
      target.sub = fixBlockFont(target.sub);
      return { template: target, changed };
    };

    const defaultTemplate = () => ({
      id: "system",
      name: "系统封面模板（默认）",
      updatedAt: nowTs(),
      baseRes: { w: 1080, h: 1440 },
      background: { blur: 0, dimPct: 10 },
      mask: { enable: true, xPct: 6, yPct: 60, wPct: 88, hPct: 22, color: "#000000", alphaPct: 25 },
      main: {
        align: "center",
        xPct: 50,
        yPct: 10,
        font: resolvePreferredTemplateFontName(),
        fontSize: 98,
        bold: true,
        shadow: true,
        color: "#f5c400",
        outlineColor: "#000000",
        outline: 6,
        maxChars: 8,
        lineCount: 2,
        lineGapPct: 4,
        letterSpacing: 0
      },
      sub: {
        enable: true,
        align: "center",
        xPct: 50,
        yPct: 76,
        font: resolvePreferredTemplateFontName(),
        fontSize: 54,
        bold: true,
        shadow: true,
        color: "#ffffff",
        outlineColor: "#000000",
        outline: 4,
        maxChars: 14,
        lineCount: 2,
        lineGapPct: 4,
        letterSpacing: 0
      }
    });

    const readStore = () => {
      try {
        const raw = localStorage.getItem(KEY_STORE);
        const parsed = JSON.parse(raw || "{}");
        const templates = Array.isArray(parsed?.templates) ? parsed.templates.filter((item) => getTemplateSource(item) !== "cloud") : [];
        const activeId = String(parsed?.activeId || "").trim() || "system";
        return { templates, activeId };
      } catch {
        return { templates: [], activeId: "system" };
      }
    };
    let storeSyncTimer = null;
    let storeSyncWarned = false;
    let savedStoreRaw = "";
    const writeStore = (templates, activeId) => {
      try {
        const localTemplates = extractLocalTemplates(templates);
        localStorage.setItem(KEY_STORE, JSON.stringify({ templates: localTemplates, activeId }, null, 2));
      } catch (e) {
        return { ok: false, message: String(e?.message || e) };
      }
      try {
        window.dispatchEvent(new CustomEvent("ipfactory:coverTemplatesChanged"));
      } catch {}
      return { ok: true };
    };
    const flushStoreWrite = ({ warn = true } = {}) => {
      const res = writeStore(state.templates, activeId);
      if (!res?.ok && warn) {
        if (!storeSyncWarned) {
          toast("模板图片过大，已超出本地缓存上限。当前会继续保留编辑态，但请重新上传更小的模板底图/封面。", "warn");
          storeSyncWarned = true;
        }
      } else if (res?.ok) {
        storeSyncWarned = false;
      }
      return res;
    };
    const scheduleStoreWrite = ({ immediate = false, warn = true } = {}) => {
      if (storeSyncTimer) {
        clearTimeout(storeSyncTimer);
        storeSyncTimer = null;
      }
      if (immediate) return flushStoreWrite({ warn });
      storeSyncTimer = setTimeout(() => {
        storeSyncTimer = null;
        flushStoreWrite({ warn });
      }, 140);
      return { ok: true, delayed: true };
    };
    const migrateTemplatesToDouyin34 = (templatesIn) => {
      const list = Array.isArray(templatesIn) ? templatesIn : [];
      let changed = false;
      const scaleNum = (n, scale, min, max) => clamp(Math.round((Number(n || 0) || 0) * scale), min, max);
      const next = list.map((tpl) => {
        const t = tpl && typeof tpl === "object" ? { ...tpl } : {};
        const br = t.baseRes && typeof t.baseRes === "object" ? t.baseRes : null;
        const w = Number(br?.w || 0) || 0;
        const h = Number(br?.h || 0) || 0;
        if (w === 1080 && h === 1920) {
          const scale = 1440 / 1920;
          t.baseRes = { w: 1080, h: 1440 };
          if (t.main && typeof t.main === "object") {
            t.main = {
              ...t.main,
              fontSize: scaleNum(t.main.fontSize ?? 98, scale, 10, 260),
              outline: Math.max(0, Math.round((Number(t.main.outline ?? 0) || 0) * scale))
            };
          }
          if (t.sub && typeof t.sub === "object") {
            t.sub = {
              ...t.sub,
              fontSize: scaleNum(t.sub.fontSize ?? 54, scale, 10, 200),
              outline: Math.max(0, Math.round((Number(t.sub.outline ?? 0) || 0) * scale))
            };
          }
          t.updatedAt = nowTs();
          changed = true;
        }
        return t;
      });
      return { templates: next, changed };
    };
    const ensureStore = () => {
      const { templates, activeId } = readStore();
      const migrated = migrateTemplatesToDouyin34(templates);
      let next = migrated.templates;
      let didChange = migrated.changed;
      next = next.map((tpl) => {
        const normalized = normalizeSystemCoverTemplateFonts(tpl);
        if (normalized.changed) didChange = true;
        return normalized.template;
      });
      if (!next.some((t) => String(t?.id || "") === "system")) {
        next = [defaultTemplate(), ...next];
        didChange = true;
      }
      const seeded = ensureTonghangCoverTemplateStore();
      if (Array.isArray(seeded?.templates) && seeded.templates.length !== next.length) {
        next = seeded.templates;
        didChange = true;
      }
      const cloudCached = getTemplateCloudCache("cover");
      const merged = mergeTemplateCollections(next, cloudCached?.templates || []);
      const resolvedActiveId = resolveTemplateSelectionId(merged, activeId || "system") || "system";
      if (didChange) writeStore(next, activeId || "system");
      return { templates: merged, activeId: resolvedActiveId };
    };

    let fonts = [];
    const loadFonts = async () => {
      const res = await window.api?.media?.listFonts?.();
      const items = Array.isArray(res?.items) ? res.items : [];
      fonts = items.map((x) => ({ name: String(x?.name || ""), path: String(x?.path || "") })).filter((x) => x.name);
      await ensureProjectTemplateFonts(fonts);
      const preferredFontName = resolvePreferredTemplateFontName();
      const preferredFontExists = fonts.some((f) => String(f?.name || "").trim().toLowerCase() === preferredFontName.toLowerCase());
      const restFonts = fonts.filter((f) => String(f?.name || "").trim().toLowerCase() !== preferredFontName.toLowerCase());
      const opts = []
        .concat(
          preferredFontExists ? [`<option value="${encodeURIComponent(preferredFontName)}">${preferredFontName}（内置推荐）</option>`] : [],
          [`<option value="Microsoft YaHei">Microsoft YaHei（系统）</option>`],
          restFonts.map((f) => `<option value="${encodeURIComponent(f.name)}">${f.name}</option>`)
        );
      mainFont.innerHTML = opts.join("");
      subFont.innerHTML = opts.join("");
      requestPreviewRender("fonts-loaded");
    };

    let state = ensureStore();
    let activeId = String(state.activeId || "system");
    let active = state.templates.find((t) => String(t?.id || "") === activeId) || state.templates[0] || null;
    let dirty = false;
    const templateHistory = createTemplateHistoryManager({ limit: 120, mergeWindowMs: 900 });
    const cloneTemplate = (tpl) => JSON.parse(JSON.stringify(tpl || defaultTemplate()));
    const syncHistoryButtons = () => {
      const historyState = templateHistory.state();
      if (ctplUndo) ctplUndo.disabled = !active || historyState.canUndo !== true;
      if (ctplRedo) ctplRedo.disabled = !active || historyState.canRedo !== true;
    };
    const resetTemplateHistory = () => {
      templateHistory.reset(cloneTemplate(active));
      syncHistoryButtons();
    };
    let previewMainTextValue = "";
    let previewSubTextValue = "";
    const previewScheduler = createTemplatePreviewScheduler({
      render: () => applyPreview(),
      onRendered: ({ latencyMs }) => {
        if (latencyMs > 0) setPreviewHint(`实时同步 ${latencyMs}ms`, { autoReset: true });
      }
    });
    const requestPreviewRender = (reason = "") => previewScheduler.requestRender(reason);
    const flushPreviewRender = () => previewScheduler.flushRender();
    mainPreviewText?.addEventListener("input", () => {
      previewMainTextValue = String(mainPreviewText.value || "");
      requestPreviewRender("main-preview-text");
    });
    subPreviewText?.addEventListener("input", () => {
      previewSubTextValue = String(subPreviewText.value || "");
      requestPreviewRender("sub-preview-text");
    });
    refreshUploadBtnVisibility();
    const syncMergedTemplates = (cloudTemplates = []) => {
      const localTemplates = extractLocalTemplates(state?.templates || []);
      state.templates = mergeTemplateCollections(localTemplates, cloudTemplates);
      activeId = resolveTemplateSelectionId(state.templates, activeId) || String(state.templates[0]?.id || "system");
      state.activeId = activeId;
      writeStore(state.templates, activeId);
      active = state.templates.find((t) => String(t?.id || "") === String(activeId || "")) || state.templates[0] || null;
    };
    const syncCloudTemplateList = async ({ silent = false } = {}) => {
      const res = await fetchCloudTemplates("cover");
      if (!res?.ok) {
        if (!silent) toast(String(res?.errMsg || "封面模板云同步失败。"), "warn");
        return false;
      }
      syncMergedTemplates(res.templates || []);
      renderList();
      renderEditor();
      return true;
    };
    try {
      const guards =
        window.__ipfactoryRouteLeaveGuards && typeof window.__ipfactoryRouteLeaveGuards === "object"
          ? window.__ipfactoryRouteLeaveGuards
          : (window.__ipfactoryRouteLeaveGuards = {});
      guards[PAGE_PATH] = () =>
        dirty
          ? {
              title: "保存封面模板",
              message: "当前封面模板已修改，确认后会自动保存并跳转到目标页面。",
              confirmText: "保存并离开",
              cancelText: "继续编辑",
              extraText: "不保存并退出",
              tone: "warn",
              onConfirm: async () => saveActiveTemplate({ showToast: true, successMessage: "封面模板已自动保存。", skipIfClean: false }),
              onExtra: async () => {
                try {
                  if (storeSyncTimer) {
                    clearTimeout(storeSyncTimer);
                    storeSyncTimer = null;
                  }
                } catch {}
                try {
                  if (savedStoreRaw) localStorage.setItem(KEY_STORE, savedStoreRaw);
                } catch {}
                try {
                  window.dispatchEvent(new CustomEvent("ipfactory:coverTemplatesChanged"));
                } catch {}
                setDirty(false);
                return true;
              }
            }
          : "";
    } catch {}

    const isDataUrlImage = (value) => /^data:image\//i.test(String(value || "").trim());
    const shouldCompactStoredImage = (value, maxLength) => {
      const src = String(value || "").trim();
      if (!isDataUrlImage(src)) return false;
      return !/^data:image\/webp/i.test(src) || src.length > Number(maxLength || 0);
    };
    const compactStoredTemplateMedia = async () => {
      const templates = Array.isArray(state.templates) ? state.templates : [];
      if (!templates.length) return false;
      let changed = false;
      const nextTemplates = [];
      for (const item of templates) {
        const tpl = item && typeof item === "object" ? { ...item } : item;
        let nextTpl = tpl;
        const bgSrc = String(tpl?.previewBackground || "").trim();
        if (shouldCompactStoredImage(bgSrc, 240000)) {
          const compactBg = await compressDataUrlImage(bgSrc, {
            maxWidth: 360,
            maxHeight: 480,
            quality: 0.72,
            mimeType: "image/webp"
          });
          if (compactBg && compactBg.length < bgSrc.length) {
            nextTpl.previewBackground = compactBg;
            changed = true;
          }
        }
        const coverSrc = String(nextTpl?.previewCover || "").trim();
        if (shouldCompactStoredImage(coverSrc, 120000)) {
          const compactCover = await compressDataUrlImage(coverSrc, {
            maxWidth: 260,
            maxHeight: 348,
            quality: 0.72,
            mimeType: "image/webp",
            backgroundColor: "#ffffff"
          });
          if (compactCover && compactCover.length < coverSrc.length) {
            nextTpl.previewCover = compactCover;
            changed = true;
          }
        }
        nextTemplates.push(nextTpl);
      }
      if (!changed) return false;
      state.templates = nextTemplates;
      state.activeId = activeId;
      active = state.templates.find((t) => String(t?.id || "") === String(activeId || "")) || state.templates[0] || null;
      flushStoreWrite({ warn: true });
      return true;
    };

    const setDirty = (v) => {
      dirty = v === true;
      btnSave.disabled = !active || !dirty;
    };
    const syncActiveRecord = ({ updateTimestamp = true, persist = false, refreshList = false } = {}) => {
      if (!active) return;
      if (updateTimestamp) active.updatedAt = nowTs();
      const idx = state.templates.findIndex((t) => String(t?.id || "") === String(active.id || ""));
      if (idx >= 0) state.templates[idx] = active;
      if (persist) scheduleStoreWrite();
      if (refreshList) scheduleListRender();
    };
    const saveActiveTemplate = async ({ showToast = true, successMessage = "保存成功。", skipIfClean = true } = {}) => {
      if (!active) return false;
      if (skipIfClean && !dirty) return true;
      active.name = String(nameInput.value || active.name || "").trim() || "未命名模板";
      syncActiveRecord({ updateTimestamp: true });
      const storeRes = flushStoreWrite({ warn: true });
      if (storeRes?.ok === false) {
        toast("模板保存失败，请先缩小模板底图或模板封面后再重试。", "warn");
        return false;
      }
      const oldLabel = btnSave.textContent;
      btnSave.disabled = true;
      btnSave.textContent = "保存中...";
      try {
        const res = await window.api?.templateStore?.saveCoverTemplate?.({ template: active });
        if (!res?.ok) {
          if (showToast) toast(`已保存到本地，但写入文件失败：${String(res?.message || "")}`, "warn");
        } else if (showToast) {
          toast(successMessage, "success");
        }
        setDirty(false);
        try {
          savedStoreRaw = localStorage.getItem(KEY_STORE) || "";
        } catch {}
        renderList();
        renderEditor();
        return true;
      } catch (e) {
        if (showToast) toast(`已保存到本地，但写入文件失败：${String(e?.message || e)}`, "warn");
        setDirty(false);
        try {
          savedStoreRaw = localStorage.getItem(KEY_STORE) || "";
        } catch {}
        renderList();
        renderEditor();
        return true;
      } finally {
        btnSave.disabled = false;
        btnSave.textContent = oldLabel;
      }
    };
    const fmtDate = (ts) => {
      const d = new Date(Number(ts || 0) || 0);
      if (!Number.isFinite(d.getTime()) || d.getTime() <= 0) return "—";
      const pad = (n) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };
    const getFontLabel = (fontKey) => {
      return decodeTemplateFontValue(fontKey);
    };

    const parseResStr = (s) => {
      const m = String(s || "").trim().match(/^(\d{2,5})x(\d{2,5})$/i);
      if (!m) return null;
      return { w: clamp(Number(m[1] || 1080) || 1080, 240, 99999), h: clamp(Number(m[2] || 1440) || 1440, 240, 99999) };
    };

    const getCoverCardPreview = (tpl) => {
      const t = tpl && typeof tpl === "object" ? tpl : {};
      return (
        String(t.previewCover || "").trim() ||
        createCoverTemplatePreviewDataUrl(t, {
          mainText: refreshHomeTitle() || "主标题示例",
          subText: "副标题示例"
        })
      );
    };

    const renderTemplateCoverMeta = () => {
      if (!ctplCoverThumb || !ctplCoverStatus) return;
      if (!active) {
        ctplCoverThumb.innerHTML = "";
        ctplCoverStatus.textContent = "未选择模板。";
        return;
      }
      const previewUrl = getCoverCardPreview(active);
      ctplCoverThumb.innerHTML = previewUrl ? `<img src="${escapeHtml(previewUrl)}" alt="模板封面预览" />` : "";
      const hasCustomCover = !!String(active.previewCover || "").trim();
      const hasBg = !!String(active.previewBackground || "").trim();
      ctplCoverStatus.textContent = hasCustomCover
        ? hasBg
          ? "已保存模板封面，且已设置模板底图。首页模板选择会直接显示这张封面。"
          : "已保存模板封面。首页模板选择会直接显示这张封面。"
        : hasBg
          ? "已设置模板底图，当前会按模板参数实时生成选择卡片。"
          : "未设置模板封面，将使用当前模板实时生成预览。";
    };

    const applyPreview = () => {
      if (!active) return;
      const base = active.baseRes && typeof active.baseRes === "object" ? active.baseRes : { w: 1080, h: 1440 };
      const bw = clamp(Number(base.w || 1080) || 1080, 240, 99999);
      const bh = clamp(Number(base.h || 1440) || 1440, 240, 99999);
      const ph = clamp(Number(preview?.clientHeight || 0) || 0, 1, 99999);
      const scale = ph > 0 ? ph / bh : 1;

      const bg = active.background || {};
      const blur = clamp(Number(bg.blur || 0) || 0, 0, 20);
      const dimPct = clamp(Number(bg.dimPct || 10) || 10, 0, 80);
      bgEl.style.filter = `blur(${Math.round(blur * scale)}px)`;
      bgEl.style.opacity = "1";
      bgEl.style.transform = "scale(1.03)";
      const bgUrl = String(active.previewBackground || "").trim();
      bgEl.style.background = bgUrl
        ? `url("${bgUrl}") center center / cover no-repeat`
        : `radial-gradient(circle at 30% 20%, rgba(109, 70, 255, 0.18), transparent 60%),
        radial-gradient(circle at 70% 30%, rgba(90, 167, 255, 0.16), transparent 60%),
        linear-gradient(135deg, rgba(245, 232, 210, 0.92), rgba(140, 170, 190, 0.60))`;
      bgEl.style.boxShadow = `inset 0 0 0 9999px rgba(0,0,0,${(dimPct / 100) * 0.9})`;

      const m = active.mask || {};
      const mOn = m.enable === true;
      maskEl.hidden = !mOn;
      if (mOn) {
        const mx = clamp(Number(m.xPct || 0) || 0, 0, 100);
        const my = clamp(Number(m.yPct || 0) || 0, 0, 100);
        const mw = clamp(Number(m.wPct || 0) || 0, 0, 100);
        const mh = clamp(Number(m.hPct || 0) || 0, 0, 100);
        maskEl.style.left = `${(mx / 100) * 100}%`;
        maskEl.style.top = `${(my / 100) * 100}%`;
        maskEl.style.width = `${(mw / 100) * 100}%`;
        maskEl.style.height = `${(mh / 100) * 100}%`;
        maskEl.style.background = normalizeHex(m.color, "#000000");
        maskEl.style.opacity = String(clamp(Number(m.alphaPct || 25) || 25, 0, 80) / 100);
      }

      const buildShadow = (outlinePx, outlineColor, withShadow) => {
        const o = Math.max(0, Math.round(outlinePx || 0));
        const oc = normalizeHex(outlineColor, "#000000");
        const ss = [];
        if (o > 0) ss.push(`0 0 0 ${oc}`, `0 0 0 ${oc}`, `0 0 0 ${oc}`);
        if (withShadow) ss.push(`0 ${Math.round(10 * scale)}px ${Math.round(18 * scale)}px rgba(0,0,0,0.35)`);
        return ss.join(",");
      };

      const homeT = refreshHomeTitle();
      const main = active.main || {};
      const splitLines = (text, maxChars0, lineCount0) => {
        const maxChars = clamp(Number(maxChars0 || 8) || 8, 4, 30);
        const lineCount = clamp(Number(lineCount0 || 2) || 2, 1, 3);
        const chars = Array.from(String(text || "").replace(/\s+/g, ""));
        const lines = [];
        for (let i = 0; i < chars.length; i += maxChars) lines.push(chars.slice(i, i + maxChars).join(""));
        return lines.slice(0, lineCount);
      };
      const mt = String(previewMainTextValue || "").trim() || homeT || "主标题示例";
      mainEl.innerHTML = splitLines(mt, main.maxChars, main.lineCount)
        .map((x) => `<div>${escapeHtml(x || " ")}</div>`)
        .join("");

      const align = String(main.align || "center");
      const mx = clamp(Number(main.xPct || 50) || 50, 0, 100);
      const my = clamp(Number(main.yPct || 10) || 10, 0, 100);
      const fs = clamp(Number(main.fontSize || 98) || 98, 10, 260) * scale;
      mainEl.style.fontFamily = buildTemplateFontCss(main.font);
      mainEl.style.fontSize = `${Math.round(fs)}px`;
      mainEl.style.fontWeight = main.bold !== false ? "900" : "700";
      mainEl.style.color = normalizeHex(main.color, "#f5c400");
      mainEl.style.textShadow = buildShadow(clamp(Number(main.outline || 6) || 0, 0, 30) * scale, main.outlineColor, main.shadow !== false);
      mainEl.style.left = `${mx}%`;
      mainEl.style.top = `${my}%`;
      mainEl.style.transform = align === "left" ? "translate(0,0)" : align === "right" ? "translate(-100%,0)" : "translate(-50%,0)";
      mainEl.style.textAlign = align;
      mainEl.style.display = "grid";
      mainEl.style.gap = `${Math.round((clamp(Number(main.lineGapPct || 4) || 4, 0, 30) / 100) * bh * scale)}px`;
      mainEl.style.lineHeight = "1";
      mainEl.style.letterSpacing = `${Math.round(clamp(Number(main.letterSpacing || 0) || 0, 0, 20) * scale)}px`;

      const s = active.sub || {};
      const sOn = s.enable === true;
      subEl.hidden = !sOn;
      if (sOn) {
        const st = String(previewSubTextValue || "").trim() || "副标题示例";
        subEl.innerHTML = splitLines(st, s.maxChars, s.lineCount)
          .map((x) => `<div>${escapeHtml(x || " ")}</div>`)
          .join("");
        const sx = clamp(Number(s.xPct || 50) || 50, 0, 100);
        const sy = clamp(Number(s.yPct || 76) || 76, 0, 100);
        const sfs = clamp(Number(s.fontSize || 54) || 54, 10, 200) * scale;
        const sa = String(s.align || "center");
        subEl.style.fontFamily = buildTemplateFontCss(s.font);
        subEl.style.fontSize = `${Math.round(sfs)}px`;
        subEl.style.fontWeight = s.bold !== false ? "900" : "700";
        subEl.style.color = normalizeHex(s.color, "#ffffff");
        subEl.style.textShadow = buildShadow(clamp(Number(s.outline || 4) || 0, 0, 30) * scale, s.outlineColor, s.shadow !== false);
        subEl.style.left = `${sx}%`;
        subEl.style.top = `${sy}%`;
        subEl.style.transform = sa === "left" ? "translate(0,0)" : sa === "right" ? "translate(-100%,0)" : "translate(-50%,0)";
        subEl.style.textAlign = sa;
        subEl.style.display = "grid";
        subEl.style.gap = `${Math.round((clamp(Number(s.lineGapPct || 4) || 4, 0, 30) / 100) * bh * scale)}px`;
        subEl.style.lineHeight = "1";
        subEl.style.letterSpacing = `${Math.round(clamp(Number(s.letterSpacing || 0) || 0, 0, 20) * scale)}px`;
      }
      renderTemplateCoverMeta();
    };

    const renderList = () => {
      const templates = Array.isArray(state.templates) ? state.templates : [];
      if (ctplCount) ctplCount.textContent = String(templates.length);
      const { systemTemplates, cloudTemplates, localTemplates } = splitTemplatesBySource(templates);
      const groups = [
        { title: "系统模板", items: systemTemplates, emptyText: "" },
        { title: "云端模板", items: cloudTemplates, emptyText: "当前暂无云端模板" },
        { title: "本地模板", items: localTemplates, emptyText: "当前暂无本地模板" }
      ];
      ctplList.innerHTML = groups
        .map((group) => {
          if (!Array.isArray(group.items) || !group.items.length) {
            return group.emptyText
              ? `<div class="field" style="margin-bottom:10px"><div class="label">${group.title}</div><div class="hint">${group.emptyText}</div></div>`
              : "";
          }
          const cards = group.items
            .map((t) => {
              const id = String(t?.id || "");
              const recordId = getTemplateRecordId(t) || id;
              const name = String(t?.name || id || "未命名");
              const activeCls = id === activeId ? " is-active" : "";
              const thumb = getCoverCardPreview(t);
              const sourceText = getTemplateSource(t) === "cloud" ? "云端同步" : getTemplateSource(t) === "system" ? "系统默认" : "本地保存";
              return `<button class="ctpl-item${activeCls}" type="button" data-id="${escapeHtml(id)}">
                <div class="ctpl-item-thumb">${thumb ? `<img src="${escapeHtml(thumb)}" alt="${escapeHtml(name)}" />` : ""}</div>
                <div class="ctpl-item-title">${escapeHtml(name)}</div>
                <div class="ctpl-item-sub">${escapeHtml(sourceText)} · ${escapeHtml(recordId)}</div>
              </button>`;
            })
            .join("");
          return `<div class="field" style="margin-bottom:10px">
            <div class="card-actions" style="justify-content:space-between;margin-bottom:8px">
              <span class="label">${group.title}</span>
              <span class="pill">${String(group.items.length)}</span>
            </div>
            <div class="ctpl-item-grid">${cards}</div>
          </div>`;
        })
        .join("");
      Array.from(ctplList.querySelectorAll(".ctpl-item[data-id]")).forEach((btn) => {
        btn.addEventListener("click", () => selectTemplate(btn.getAttribute("data-id")));
      });
    };
    let listRenderTimer = null;
    const scheduleListRender = () => {
      if (listRenderTimer) clearTimeout(listRenderTimer);
      listRenderTimer = setTimeout(() => {
        listRenderTimer = null;
        renderList();
      }, 80);
    };

    const setFontSelect = (sel, fontKey) => {
      const key = String(fontKey || "").trim();
      if (!key) {
        sel.value = resolvePreferredTemplateFontValue();
        return;
      }
      const decoded = getFontLabel(key);
      const encodedName = encodeURIComponent(decoded);
      const exists = Array.from(sel.options || []).some((o) => o.value === encodedName);
      sel.value = exists ? encodedName : decoded;
    };

    const renderEditor = () => {
      if (!active) {
        btnDup.disabled = true;
        btnDel.disabled = true;
        btnSave.disabled = true;
        if (activeIdPill) activeIdPill.textContent = "未选择模板";
        if (activeUpdatedPill) activeUpdatedPill.textContent = "—";
        return;
      }
      btnDup.disabled = false;
      btnDel.disabled = String(active.id || "") === "system" || (getTemplateSource(active) === "cloud" && !canUploadTemplateByIdentity());
      btnSave.disabled = !dirty;
      btnDel.textContent = getTemplateSource(active) === "cloud" ? "删除云端" : "删除";
      if (activeIdPill) activeIdPill.textContent = `ID：${getTemplateRecordId(active) || active.id}｜${getTemplateSource(active) === "cloud" ? "云端模板" : getTemplateSource(active) === "system" ? "系统模板" : "本地模板"}`;
      if (activeUpdatedPill) activeUpdatedPill.textContent = `更新：${fmtDate(active.updatedAt)}`;

      nameInput.value = String(active.name || "");
      if (mainPreviewText) mainPreviewText.value = String(previewMainTextValue || "");
      if (subPreviewText) subPreviewText.value = String(previewSubTextValue || "");
      if (!active.baseRes || typeof active.baseRes !== "object") active.baseRes = { w: 1080, h: 1440 };
      if (!active.background || typeof active.background !== "object") active.background = { blur: 0, dimPct: 10 };
      if (!active.mask || typeof active.mask !== "object") active.mask = defaultTemplate().mask;
      if (!active.main || typeof active.main !== "object") active.main = defaultTemplate().main;
      if (!active.sub || typeof active.sub !== "object") active.sub = defaultTemplate().sub;

      const br = active.baseRes;
      const bw = clamp(Number(br.w || 1080) || 1080, 240, 99999);
      const bh = clamp(Number(br.h || 1440) || 1440, 240, 99999);
      baseW.value = String(bw);
      baseH.value = String(bh);
      const key = `${bw}x${bh}`;
      baseResSel.value = ["1080x1440", "720x1280", "1080x1920", "1080x1350"].includes(key) ? key : "custom";

      bgBlur.value = String(clamp(Number(active.background.blur || 0) || 0, 0, 20));
      bgBlurText.value = String(bgBlur.value);
      bgDim.value = String(clamp(Number(active.background.dimPct || 10) || 10, 0, 80));
      bgDimText.value = String(bgDim.value);

      maskEnable.checked = active.mask.enable === true;
      maskColor.value = normalizeHex(active.mask.color, "#000000");
      maskColorText.value = maskColor.value;
      maskAlpha.value = String(clamp(Number(active.mask.alphaPct || 25) || 25, 0, 80));
      maskAlphaText.value = String(maskAlpha.value);
      maskX.value = String(clamp(Number(active.mask.xPct || 6) || 6, 0, 100));
      maskY.value = String(clamp(Number(active.mask.yPct || 60) || 60, 0, 100));
      maskW.value = String(clamp(Number(active.mask.wPct || 88) || 88, 0, 100));
      maskH.value = String(clamp(Number(active.mask.hPct || 22) || 22, 0, 100));

      mainAlign.value = String(active.main.align || "center");
      setFontSelect(mainFont, active.main.font);
      mainSize.value = String(clamp(Number(active.main.fontSize || 98) || 98, 20, 180));
      mainSizeText.value = String(mainSize.value);
      mainX.value = String(clamp(Number(active.main.xPct || 50) || 50, 0, 100));
      mainY.value = String(clamp(Number(active.main.yPct || 10) || 10, 0, 100));
      mainColor.value = normalizeHex(active.main.color, "#f5c400");
      mainColorText.value = mainColor.value;
      mainOColor.value = normalizeHex(active.main.outlineColor, "#000000");
      mainOColorText.value = mainOColor.value;
      mainOutline.value = String(clamp(Number(active.main.outline || 6) || 6, 0, 16));
      mainOutlineText.value = String(mainOutline.value);
      mainBold.checked = active.main.bold !== false;
      mainShadow.checked = active.main.shadow !== false;
      mainMaxChars.value = String(clamp(Number(active.main.maxChars || 8) || 8, 6, 18));
      mainMaxCharsText.value = String(mainMaxChars.value);
      mainLines.value = String(clamp(Number(active.main.lineCount || 2) || 2, 1, 3));
      mainGap.value = String(clamp(Number(active.main.lineGapPct || 4) || 4, 0, 30));
      mainGapText.value = String(mainGap.value);
      mainSpacing.value = String(clamp(Number(active.main.letterSpacing || 0) || 0, 0, 20));
      mainSpacingText.value = String(mainSpacing.value);

      subEnable.checked = active.sub.enable === true;
      subAlign.value = String(active.sub.align || "center");
      setFontSelect(subFont, active.sub.font);
      subSize.value = String(clamp(Number(active.sub.fontSize || 54) || 54, 16, 120));
      subSizeText.value = String(subSize.value);
      subX.value = String(clamp(Number(active.sub.xPct || 50) || 50, 0, 100));
      subY.value = String(clamp(Number(active.sub.yPct || 76) || 76, 0, 100));
      subMaxChars.value = String(clamp(Number(active.sub.maxChars || 14) || 14, 6, 24));
      subMaxCharsText.value = String(subMaxChars.value);
      subLines.value = String(clamp(Number(active.sub.lineCount || 2) || 2, 1, 3));
      subColor.value = normalizeHex(active.sub.color, "#ffffff");
      subColorText.value = subColor.value;
      subOColor.value = normalizeHex(active.sub.outlineColor, "#000000");
      subOColorText.value = subOColor.value;
      subOutline.value = String(clamp(Number(active.sub.outline || 4) || 4, 0, 16));
      subOutlineText.value = String(subOutline.value);
      subBold.checked = active.sub.bold !== false;
      subShadow.checked = active.sub.shadow !== false;
      subGap.value = String(clamp(Number(active.sub.lineGapPct || 4) || 4, 0, 30));
      subGapText.value = String(subGap.value);
      subSpacing.value = String(clamp(Number(active.sub.letterSpacing || 0) || 0, 0, 20));
      subSpacingText.value = String(subSpacing.value);

      syncHistoryButtons();
      flushPreviewRender();
    };

    const selectTemplate = (id) => {
      const nextId = String(id || "").trim();
      if (!nextId) return;
      activeId = nextId;
      active = state.templates.find((t) => String(t?.id || "") === activeId) || null;
      state.activeId = activeId;
      setDirty(false);
      renderList();
      renderEditor();
      resetTemplateHistory();
    };

    const updateActive = (patch, { immediateSync = false, refreshList = false, refreshEditor = false, groupKey = "", trackHistory = true } = {}) => {
      if (!active) return;
      const previous = cloneTemplate(active);
      active = mergeTemplatePatch(active, patch || {});
      active.updatedAt = nowTs();
      const idx = state.templates.findIndex((t) => String(t?.id || "") === String(active.id || ""));
      if (idx >= 0) state.templates[idx] = active;
      if (trackHistory) templateHistory.record(previous, active, { groupKey });
      setDirty(true);
      scheduleStoreWrite({ immediate: immediateSync });
      syncHistoryButtons();
      if (refreshList) scheduleListRender();
      if (refreshEditor) {
        renderEditor();
        return;
      }
      requestPreviewRender("update-active");
    };

    const wireNumericText = (inputEl, onCommit, { allowDecimal = true } = {}) => {
      if (!inputEl || typeof onCommit !== "function") return;
      const sanitize = () => {
        const next = String(inputEl.value || "").replace(allowDecimal ? /[^\d.]/g : /[^\d]/g, "");
        if (inputEl.value !== next) inputEl.value = next;
        return next;
      };
      const commit = () => onCommit(sanitize());
      inputEl.addEventListener("input", sanitize);
      inputEl.addEventListener("blur", commit);
      inputEl.addEventListener("change", commit);
      inputEl.addEventListener("keydown", (e) => {
        if (e.key !== "Enter") return;
        e.preventDefault();
        commit();
        inputEl.blur();
      });
    };

    const wireRange = (rangeEl, textEl, onValue, { min, max } = {}) => {
      const apply = (raw) => {
        const v = clamp(Number(raw) || 0, Number(min ?? -1e9), Number(max ?? 1e9));
        rangeEl.value = String(v);
        if (textEl) textEl.value = String(v);
        onValue(v);
      };
      rangeEl.addEventListener("input", () => apply(rangeEl.value));
      wireNumericText(textEl, apply);
    };
    const wireHex = (picker, text, onValue, fallback) => {
      const apply = (raw) => {
        const v = normalizeHex(raw, fallback);
        picker.value = v;
        if (text) text.value = v;
        onValue(v);
      };
      picker.addEventListener("input", () => apply(picker.value));
      text?.addEventListener("input", () => apply(text.value));
    };

    baseResSel?.addEventListener("change", () => {
      if (!active) return;
      const r = parseResStr(baseResSel.value);
      if (r) updateActive({ baseRes: r });
    });
    const syncCustomRes = () => {
      if (!active) return;
      const w = clamp(Number(String(baseW.value || "").replace(/[^\d]/g, "") || 0) || 0, 240, 99999);
      const h = clamp(Number(String(baseH.value || "").replace(/[^\d]/g, "") || 0) || 0, 240, 99999);
      baseW.value = String(w);
      baseH.value = String(h);
      baseResSel.value = "custom";
      updateActive({ baseRes: { w, h } });
    };
    wireNumericText(baseW, syncCustomRes, { allowDecimal: false });
    wireNumericText(baseH, syncCustomRes, { allowDecimal: false });

    wireRange(bgBlur, bgBlurText, (v) => updateActive({ background: { ...(active.background || {}), blur: v } }), { min: 0, max: 20 });
    wireRange(bgDim, bgDimText, (v) => updateActive({ background: { ...(active.background || {}), dimPct: v } }), { min: 0, max: 80 });

    maskEnable?.addEventListener("change", () => updateActive({ mask: { ...(active.mask || {}), enable: maskEnable.checked === true } }));
    wireHex(maskColor, maskColorText, (v) => updateActive({ mask: { ...(active.mask || {}), color: v } }), "#000000");
    wireRange(maskAlpha, maskAlphaText, (v) => updateActive({ mask: { ...(active.mask || {}), alphaPct: v } }), { min: 0, max: 80 });
    const wirePct = (el, key) => {
      wireNumericText(el, (raw) => {
        const v = clamp(Number(raw || 0) || 0, 0, 100);
        el.value = String(v);
        updateActive({ mask: { ...(active.mask || {}), [key]: v } });
      });
    };
    wirePct(maskX, "xPct");
    wirePct(maskY, "yPct");
    wirePct(maskW, "wPct");
    wirePct(maskH, "hPct");

    mainAlign?.addEventListener("change", () => updateActive({ main: { ...(active.main || {}), align: String(mainAlign.value || "center") } }));
    mainFont?.addEventListener("change", () =>
      updateActive({ main: { ...(active.main || {}), font: String(mainFont.value || resolvePreferredTemplateFontName()) } })
    );
    wireRange(mainSize, mainSizeText, (v) => updateActive({ main: { ...(active.main || {}), fontSize: v } }, { groupKey: "main-size" }), { min: 20, max: 180 });
    const wirePos = (el, key) => {
      wireNumericText(el, (raw) => {
        const v = clamp(Number(raw || 0) || 0, 0, 100);
        el.value = String(v);
        updateActive({ main: { ...(active.main || {}), [key]: v } }, { groupKey: `main-${key}` });
      });
    };
    wirePos(mainX, "xPct");
    wirePos(mainY, "yPct");
    wireHex(mainColor, mainColorText, (v) => updateActive({ main: { ...(active.main || {}), color: v } }, { groupKey: "main-color" }), "#f5c400");
    wireHex(mainOColor, mainOColorText, (v) => updateActive({ main: { ...(active.main || {}), outlineColor: v } }, { groupKey: "main-ocolor" }), "#000000");
    wireRange(mainOutline, mainOutlineText, (v) => updateActive({ main: { ...(active.main || {}), outline: v } }, { groupKey: "main-outline" }), { min: 0, max: 16 });
    mainBold?.addEventListener("change", () => updateActive({ main: { ...(active.main || {}), bold: mainBold.checked === true } }, { groupKey: "main-bold" }));
    mainShadow?.addEventListener("change", () => updateActive({ main: { ...(active.main || {}), shadow: mainShadow.checked === true } }, { groupKey: "main-shadow" }));
    wireRange(mainMaxChars, mainMaxCharsText, (v) => updateActive({ main: { ...(active.main || {}), maxChars: v } }, { groupKey: "main-maxchars" }), { min: 6, max: 18 });
    mainLines?.addEventListener("change", () => updateActive({ main: { ...(active.main || {}), lineCount: Number(mainLines.value || 2) || 2 } }, { groupKey: "main-lines" }));
    wireRange(mainGap, mainGapText, (v) => updateActive({ main: { ...(active.main || {}), lineGapPct: v } }, { groupKey: "main-gap" }), { min: 0, max: 30 });
    wireRange(mainSpacing, mainSpacingText, (v) => updateActive({ main: { ...(active.main || {}), letterSpacing: v } }, { groupKey: "main-spacing" }), { min: 0, max: 20 });

    subEnable?.addEventListener("change", () => updateActive({ sub: { ...(active.sub || {}), enable: subEnable.checked === true } }, { groupKey: "sub-enable" }));
    subAlign?.addEventListener("change", () => updateActive({ sub: { ...(active.sub || {}), align: String(subAlign.value || "center") } }, { groupKey: "sub-align" }));
    subFont?.addEventListener("change", () =>
      updateActive({ sub: { ...(active.sub || {}), font: String(subFont.value || resolvePreferredTemplateFontName()) } }, { groupKey: "sub-font" })
    );
    wireRange(subSize, subSizeText, (v) => updateActive({ sub: { ...(active.sub || {}), fontSize: v } }, { groupKey: "sub-size" }), { min: 16, max: 120 });
    wireRange(subMaxChars, subMaxCharsText, (v) => updateActive({ sub: { ...(active.sub || {}), maxChars: v } }, { groupKey: "sub-maxchars" }), { min: 6, max: 24 });
    subLines?.addEventListener("change", () => updateActive({ sub: { ...(active.sub || {}), lineCount: Number(subLines.value || 2) || 2 } }, { groupKey: "sub-lines" }));
    wireRange(subGap, subGapText, (v) => updateActive({ sub: { ...(active.sub || {}), lineGapPct: v } }, { groupKey: "sub-gap" }), { min: 0, max: 30 });
    wireRange(subSpacing, subSpacingText, (v) => updateActive({ sub: { ...(active.sub || {}), letterSpacing: v } }, { groupKey: "sub-spacing" }), { min: 0, max: 20 });
    const wireSubPos = (el, key) => {
      wireNumericText(el, (raw) => {
        const v = clamp(Number(raw || 0) || 0, 0, 100);
        el.value = String(v);
        updateActive({ sub: { ...(active.sub || {}), [key]: v } }, { groupKey: `sub-${key}` });
      });
    };
    wireSubPos(subX, "xPct");
    wireSubPos(subY, "yPct");
    wireHex(subColor, subColorText, (v) => updateActive({ sub: { ...(active.sub || {}), color: v } }, { groupKey: "sub-color" }), "#ffffff");
    wireHex(subOColor, subOColorText, (v) => updateActive({ sub: { ...(active.sub || {}), outlineColor: v } }, { groupKey: "sub-ocolor" }), "#000000");
    wireRange(subOutline, subOutlineText, (v) => updateActive({ sub: { ...(active.sub || {}), outline: v } }, { groupKey: "sub-outline" }), { min: 0, max: 16 });
    subBold?.addEventListener("change", () => updateActive({ sub: { ...(active.sub || {}), bold: subBold.checked === true } }, { groupKey: "sub-bold" }));
    subShadow?.addEventListener("change", () => updateActive({ sub: { ...(active.sub || {}), shadow: subShadow.checked === true } }, { groupKey: "sub-shadow" }));

    nameInput?.addEventListener("input", () => {
      if (!active) return;
      updateActive({ name: String(nameInput.value || "") }, { refreshList: true, groupKey: "base-name" });
    });

    btnAdd?.addEventListener("click", () => {
      const base = defaultTemplate();
      const id = uid();
      const next = { ...base, id, templateId: id, cloudTemplateId: "", cloudId: "", templateSource: "local", source: "local", name: "新封面模板", updatedAt: nowTs() };
      state.templates = [next, ...state.templates];
      state.activeId = id;
      activeId = id;
      flushStoreWrite({ warn: true });
      activeId = id;
      active = next;
      setDirty(false);
      renderList();
      renderEditor();
      resetTemplateHistory();
    });

    btnDup?.addEventListener("click", () => {
      if (!active) return;
      const id = uid();
      const next = JSON.parse(JSON.stringify({
        ...active,
        id,
        templateId: id,
        cloudTemplateId: "",
        cloudId: "",
        templateSource: "local",
        source: "local",
        name: `${active.name || "模板"}（复制）`,
        updatedAt: nowTs()
      }));
      state.templates = [next, ...state.templates];
      state.activeId = id;
      activeId = id;
      flushStoreWrite({ warn: true });
      activeId = id;
      active = next;
      setDirty(false);
      renderList();
      renderEditor();
      resetTemplateHistory();
    });

    btnDel?.addEventListener("click", async () => {
      if (!active || String(active.id || "") === "system") return;
      const id = String(active.id || "");
      const source = getTemplateSource(active);
      const ok = await confirmDialog({
        title: source === "cloud" ? "删除云端模板" : "删除本地模板",
        message:
          source === "cloud"
            ? `确认删除云端封面模板“${active.name || id}”？删除后会同步从云数据中移除。`
            : `确认删除本地封面模板“${active.name || id}”？`,
        confirmText: source === "cloud" ? "确认删除云端" : "确认删除",
        cancelText: "取消",
        tone: "warn"
      });
      if (!ok) return;
      if (source === "cloud") {
        const res = await deleteTemplateFromCloud("cover", active);
        if (!res?.ok) {
          toast(String(res?.errMsg || "删除云端封面模板失败。"), "warn");
          return;
        }
        activeId = "system";
        state.activeId = activeId;
        await syncCloudTemplateList({ silent: true });
        toast("云端封面模板已删除。", "success");
        return;
      }
      state.templates = state.templates.filter((t) => String(t?.id || "") !== id);
      const nextActive = state.templates[0]?.id || "system";
      state.activeId = nextActive;
      activeId = nextActive;
      flushStoreWrite({ warn: true });
      active = state.templates.find((t) => String(t?.id || "") === activeId) || state.templates[0] || null;
      setDirty(false);
      renderList();
      renderEditor();
      resetTemplateHistory();
    });

    btnSave?.addEventListener("click", async () => {
      if (!active || !dirty) return;
      await saveActiveTemplate();
    });

    reloadTitleBtn?.addEventListener("click", () => refreshHomeTitle());
    ctplBgUpload?.addEventListener("click", async () => {
      if (!active) return;
      const dataUrl = await pickImageAsDataUrl({ maxWidth: 360, maxHeight: 480, quality: 0.72, mimeType: "image/webp" });
      if (!dataUrl) return;
      updateActive({ previewBackground: dataUrl }, { immediateSync: true, refreshList: true });
    });
    ctplBgClear?.addEventListener("click", () => {
      if (!active) return;
      updateActive({ previewBackground: "" }, { immediateSync: true, refreshList: true });
    });
    ctplCoverCapture?.addEventListener("click", async () => {
      if (!active) return;
      const rawPreview = createCoverTemplatePreviewDataUrl(active, {
        mainText: refreshHomeTitle() || "主标题示例",
        subText: "副标题示例"
      });
      const compactPreview =
        (await compressDataUrlImage(rawPreview, {
          maxWidth: 260,
          maxHeight: 348,
          quality: 0.72,
          mimeType: "image/webp",
          backgroundColor: "#ffffff"
        })) || rawPreview;
      updateActive({
        previewCover: compactPreview
      }, { immediateSync: true, refreshList: true });
      toast("已将当前封面模板画面保存为模板封面。", "success");
    });
    ctplCoverClear?.addEventListener("click", () => {
      if (!active) return;
      updateActive({ previewCover: "" }, { immediateSync: true, refreshList: true });
    });
    const resolveCoverCloudConflictPlan = async (cloudTemplates = [], workingTemplate = {}, conflictTemplate = null) => {
      let working = ensureTemplateCloudIdentity("cover", workingTemplate);
      let conflict = conflictTemplate || findCloudTemplateNameConflict(cloudTemplates, working, String(working?.cloudTemplateId || working?.templateId || working?.id || "").trim());
      while (conflict) {
        const picked = await inputChoiceDialog({
          title: "云端模板名称重复",
          message: `云端已存在封面模板“${String(conflict?.templateName || conflict?.name || "未命名模板")}”。可直接覆盖该模板，或输入一个新的云端名称后另存。`,
          inputLabel: "新的云端模板名称",
          value: buildUniqueCloudTemplateName(cloudTemplates, String(working?.name || "").trim(), "封面模板"),
          placeholder: "请输入新的封面模板名称",
          confirmText: "覆盖同名模板",
          alternateText: "改名后上传",
          cancelText: "取消上传"
        });
        if (picked.action === "cancel") return null;
        if (picked.action === "confirm") {
          const targetId = String(conflict?.cloudTemplateId || conflict?.templateId || conflict?.id || "").trim();
          const targetName = String(conflict?.templateName || conflict?.name || working?.name || "未命名模板").trim() || "未命名模板";
          return {
            template: { ...working, name: targetName, templateName: targetName, cloudTemplateId: targetId || working.cloudTemplateId, templateId: targetId || working.templateId },
            uploadOptions: { overwriteByName: true, cloudTemplateId: targetId, templateName: targetName }
          };
        }
        const nextName = String(picked.value || "").trim();
        if (!nextName) {
          toast("请输入新的封面模板名称。", "warn");
          continue;
        }
        working = { ...working, name: nextName, templateName: nextName };
        conflict = findCloudTemplateNameConflict(cloudTemplates, working, String(working?.cloudTemplateId || working?.templateId || working?.id || "").trim());
        if (conflict) toast("该名称在云端已存在，请重新命名。", "warn");
      }
      return {
        template: working,
        uploadOptions: { templateName: String(working?.name || "").trim() || buildUniqueCloudTemplateName(cloudTemplates, "", "封面模板") }
      };
    };

    const cloneCoverTemplate = (tpl) => JSON.parse(JSON.stringify(tpl || defaultTemplate()));
    const commitCoverTemplateBeforeUpload = async () => {
      try {
        document.activeElement?.blur?.();
      } catch {}
      const saved = await saveActiveTemplate({ showToast: false, skipIfClean: false });
      if (!saved || !active) return null;
      return cloneCoverTemplate(active);
    };

    const resolveCoverCloudUploadPlan = async (sourceTemplate) => {
      const uploadSource = sourceTemplate && typeof sourceTemplate === "object" ? sourceTemplate : active;
      if (!uploadSource) return null;
      const cloudRes = await fetchCloudTemplates("cover");
      const cloudTemplates = cloudRes?.ok === true ? (cloudRes.templates || []) : (getTemplateCloudCache("cover").templates || []);
      const pageInputName = String(nameInput?.value || uploadSource?.name || "").trim();
      let working = ensureTemplateCloudIdentity("cover", { ...cloneCoverTemplate(uploadSource), name: pageInputName || uploadSource?.name || "" });
      let fallbackName = buildUniqueCloudTemplateName(cloudTemplates, String(working?.name || "").trim(), "封面模板");
      const pickedName = await inputChoiceDialog({
        title: "设置云端模板名称",
        message: "上传到云端前，请先确认本次云端模板名称。",
        inputLabel: "云端模板名称",
        value: String(working?.name || "").trim() || fallbackName,
        placeholder: "请输入封面模板名称",
        confirmText: "确认名称并上传",
        alternateText: "",
        cancelText: "取消上传"
      });
      if (pickedName.action === "cancel") return null;
      const chosenName = String(pickedName.value || "").trim();
      if (!chosenName) {
        toast("请输入封面模板名称。", "warn");
        return null;
      }
      working = { ...working, name: chosenName, templateName: chosenName };
      return resolveCoverCloudConflictPlan(cloudTemplates, working);
    };
    ctplUploadCloud?.addEventListener("click", async () => {
      if (!active) return;
      const oldLabel = ctplUploadCloud.textContent;
      ctplUploadCloud.disabled = true;
      ctplUploadCloud.textContent = "上传中...";
      try {
        const uploadSnapshot = await commitCoverTemplateBeforeUpload();
        if (!uploadSnapshot) {
          toast("当前封面模板保存失败，未能上传到云端。", "warn");
          return;
        }
        let plan = await resolveCoverCloudUploadPlan(uploadSnapshot);
        while (plan) {
          const current = cloneCoverTemplate(plan.template);
          const res = await uploadTemplateToCloud("cover", current, plan.uploadOptions);
          if (res?.ok) {
            updateActive({
              name: String(current.name || "未命名模板"),
              cloudTemplateId: String(res?.templateId || current.cloudTemplateId || "")
            }, { immediateSync: true, refreshList: true, trackHistory: false });
            setDirty(false);
            await syncCloudTemplateList({ silent: true });
            toast("封面模板已上传到云端。", "success");
            return;
          }
          if (String(res?.errCode || "") === "TEMPLATE_NAME_EXISTS") {
            const latestRes = await fetchCloudTemplates("cover");
            const latestCloudTemplates = latestRes?.ok === true ? (latestRes.templates || []) : (getTemplateCloudCache("cover").templates || []);
            const existing = res?.existingTemplate || findCloudTemplateNameConflict(latestCloudTemplates, current);
            plan = await resolveCoverCloudConflictPlan(latestCloudTemplates, current, existing || null);
            continue;
          }
          toast(String(res?.errMsg || "上传封面模板到云端失败。"), "warn");
          return;
        }
      } finally {
        ctplUploadCloud.disabled = false;
        ctplUploadCloud.textContent = oldLabel;
      }
    });

    const enableDrag = (el, onMove) => {
      let dragging = false;
      let start = null;
      const onDown = (e) => {
        if (!active) return;
        dragging = true;
        el.setPointerCapture?.(e.pointerId);
        start = { x: e.clientX, y: e.clientY };
        e.preventDefault();
      };
      const onMoveEv = (e) => {
        if (!dragging || !start) return;
        const dx = e.clientX - start.x;
        const dy = e.clientY - start.y;
        start = { x: e.clientX, y: e.clientY };
        const rect = preview.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const dpX = (dx / rect.width) * 100;
        const dpY = (dy / rect.height) * 100;
        onMove(dpX, dpY);
      };
      const onUp = () => {
        dragging = false;
        start = null;
      };
      el.addEventListener("pointerdown", onDown);
      window.addEventListener("pointermove", onMoveEv);
      window.addEventListener("pointerup", onUp);
    };

    enableDrag(mainEl, (dx, dy) => {
      const mx = clamp(Number(active.main?.xPct || 50) || 50, 0, 100) + dx;
      const my = clamp(Number(active.main?.yPct || 10) || 10, 0, 100) + dy;
      mainX.value = String(clamp(mx, 0, 100).toFixed(1));
      mainY.value = String(clamp(my, 0, 100).toFixed(1));
      updateActive({ main: { ...(active.main || {}), xPct: Number(mainX.value), yPct: Number(mainY.value) } }, { groupKey: "main-drag" });
    });
    enableDrag(subEl, (dx, dy) => {
      const sx = clamp(Number(active.sub?.xPct || 50) || 50, 0, 100) + dx;
      const sy = clamp(Number(active.sub?.yPct || 76) || 76, 0, 100) + dy;
      subX.value = String(clamp(sx, 0, 100).toFixed(1));
      subY.value = String(clamp(sy, 0, 100).toFixed(1));
      updateActive({ sub: { ...(active.sub || {}), xPct: Number(subX.value), yPct: Number(subY.value) } }, { groupKey: "sub-drag" });
    });
    enableDrag(maskEl, (dx, dy) => {
      const mx = clamp(Number(active.mask?.xPct || 6) || 6, 0, 100) + dx;
      const my = clamp(Number(active.mask?.yPct || 60) || 60, 0, 100) + dy;
      maskX.value = String(clamp(mx, 0, 100).toFixed(1));
      maskY.value = String(clamp(my, 0, 100).toFixed(1));
      updateActive({ mask: { ...(active.mask || {}), xPct: Number(maskX.value), yPct: Number(maskY.value) } }, { groupKey: "mask-drag" });
    });

    const applyHistorySnapshot = (snapshot) => {
      if (!snapshot || !active) return;
      active = snapshot;
      active.updatedAt = nowTs();
      const idx = state.templates.findIndex((t) => String(t?.id || "") === String(active.id || ""));
      if (idx >= 0) state.templates[idx] = active;
      setDirty(true);
      scheduleStoreWrite();
      scheduleListRender();
      renderEditor();
    };
    const triggerUndo = () => {
      if (!active) return;
      const res = templateHistory.undo(cloneTemplate(active));
      syncHistoryButtons();
      if (res?.ok) applyHistorySnapshot(res.value);
    };
    const triggerRedo = () => {
      if (!active) return;
      const res = templateHistory.redo(cloneTemplate(active));
      syncHistoryButtons();
      if (res?.ok) applyHistorySnapshot(res.value);
    };
    ctplUndo?.addEventListener("click", triggerUndo);
    ctplRedo?.addEventListener("click", triggerRedo);
    const onHistoryKeydown = (e) => {
      if (!root?.isConnected || !active) return;
      const key = String(e.key || "").toLowerCase();
      if (!(e.ctrlKey || e.metaKey)) return;
      if (!e.shiftKey && key === "z") {
        e.preventDefault();
        triggerUndo();
        return;
      }
      if (key === "y" || (e.shiftKey && key === "z")) {
        e.preventDefault();
        triggerRedo();
      }
    };
    window.addEventListener("keydown", onHistoryKeydown);

    const nav = root.querySelector("#ctpl-nav");
    const scroll = root.querySelector("#ctpl-scroll");
    if (nav && scroll) {
      const buttons = Array.from(nav.querySelectorAll(".ctpl-nav-item[data-sec]"));
      const sections = Array.from(scroll.querySelectorAll(".ctpl-section[data-sec]"));
      const dividers = Array.from(scroll.querySelectorAll(".divider"));
      const secById = Object.fromEntries(sections.map((s) => [String(s.getAttribute("data-sec") || ""), s]));
      const setActiveSec = (sec) => {
        const id = String(sec || "").trim();
        buttons.forEach((b) => b.classList.toggle("is-active", String(b.getAttribute("data-sec") || "") === id));
        sections.forEach((s) => (s.hidden = String(s.getAttribute("data-sec") || "") !== id));
        dividers.forEach((d) => (d.hidden = true));
        try {
          scroll.scrollTo({ top: 0 });
        } catch {}
      };
      buttons.forEach((b) => {
        b.addEventListener("click", () => {
          const id = String(b.getAttribute("data-sec") || "").trim();
          if (!id || !secById[id]) return;
          setActiveSec(id);
        });
      });
      setActiveSec(String(buttons[0]?.getAttribute("data-sec") || "base"));
    }

    await compactStoredTemplateMedia();
    await loadFonts();
    await syncCloudTemplateList({ silent: true });
    try {
      savedStoreRaw = localStorage.getItem(KEY_STORE) || "";
    } catch {}
    refreshHomeTitle();
    renderList();
    renderEditor();
    resetTemplateHistory();
    window.addEventListener("ipfactory:authChanged", refreshUploadBtnVisibility);

    return root;
  }
};
