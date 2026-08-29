import { confirmDialog, elFromHTML, inputChoiceDialog, pageHeader, topToast } from "../ui.js";
import { compressDataUrlImage, createSubtitleTemplatePreviewDataUrl, pickImageAsDataUrl } from "../gongneng/mobanyulan.js";
import { buildTemplateFontCss, createTemplatePreviewScheduler, decodeTemplateFontValue, ensureProjectTemplateFonts, mergeTemplatePatch } from "../gongneng/mubanyulantongbu.js";
import { createTemplateHistoryManager } from "../gongneng/mobanlishi.js";
import { ensureTonghangSubtitleTemplateStore } from "../gongneng/tonghangmoban.js";
import { analyzeSubtitleTemplateReferenceImages, pickSubtitleTemplateReferenceImages } from "../gongneng/zimutemobanshibie.js";
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
  path: "/subtitle-templates",
  title: "字幕模板",
  async render() {
    const PAGE_PATH = "/subtitle-templates";
    const root = elFromHTML(`
      <div class="sticky-page-layout">
        ${pageHeader({
          title: "字幕模板",
          subtitle: "自定义字幕样式｜标题字幕（自动读取首页标题）｜分行预览与逐行样式",
          actionsHTML: `
            <button class="btn" id="stpl-add">新增模板</button>
            <button class="btn" id="stpl-dup" disabled>复制</button>
            <button class="btn btn-danger" id="stpl-del" disabled>删除</button>
            <button class="btn btn-primary" id="stpl-save" disabled>保存</button>
          `
        })}

        <div class="sticky-page-body">
          <div class="stpl">
          <div class="card stpl-side">
            <div class="card-title">
              <h3>模板列表</h3>
              <span class="pill" id="stpl-count">0</span>
            </div>
            <div class="stpl-list" id="stpl-list"></div>
            <div class="divider" style="margin-top: 10px"></div>
            <div class="field" style="margin-top: 10px">
              <div class="label">从首页读取标题</div>
              <div class="card-actions" style="justify-content: space-between">
                <span class="pill" id="stpl-home-title">未读取</span>
                <button class="btn" id="stpl-reload-title">重新加载</button>
              </div>
            </div>
          </div>

          <div class="card stpl-preview-card">
            <div class="card-title">
              <h3>实时预览</h3>
              <span class="pill" id="stpl-preview-hint">拖动参数即可实时刷新</span>
            </div>
            <div class="card-actions" style="justify-content: space-between; flex-wrap: wrap">
              <span class="pill">模板封面与底图</span>
              <div class="card-actions" style="gap: 8px">
                <button class="btn" id="stpl-bg-upload" type="button">上传背景图</button>
                <button class="btn" id="stpl-bg-clear" type="button">清空背景图</button>
                <button class="btn btn-primary" id="stpl-cover-capture" type="button">设为当前画面封面</button>
                <button class="btn" id="stpl-cover-clear" type="button">清空模板封面</button>
                <button class="btn btn-primary" id="stpl-upload-cloud" type="button" hidden>上传到云端</button>
              </div>
            </div>
            <div class="stpl-stage">
              <div class="stpl-phone">
                <div class="stpl-phone-inner" id="stpl-preview">
                  <div class="stpl-title" id="stpl-preview-title" hidden></div>
                  <div class="stpl-sub" id="stpl-preview-sub">示例字幕文字（底部字幕）</div>
                </div>
              </div>
              <div class="stpl-cover-meta">
                <div class="stpl-cover-thumb" id="stpl-cover-thumb"></div>
                <div class="stpl-cover-text">
                  <div class="stpl-cover-title">模板选择封面</div>
                  <div class="stpl-cover-sub" id="stpl-cover-status">未设置模板封面，将使用当前模板实时生成预览。</div>
                </div>
              </div>
              <div class="stpl-stage-foot">
                <span class="pill" id="stpl-active-id">未选择模板</span>
                <span class="pill" id="stpl-active-updated">—</span>
              </div>
            </div>
          </div>

          <div class="card stpl-editor">
            <div class="card-title">
              <h3>模板设置</h3>
              <div class="card-actions" style="gap: 8px; flex-wrap: wrap">
                <span class="pill">标题字幕 + 底部字幕</span>
                <button class="btn btn-small" id="stpl-undo" type="button" disabled>撤销</button>
                <button class="btn btn-small" id="stpl-redo" type="button" disabled>恢复</button>
              </div>
            </div>

            <div class="stpl-editor-body">
              <div class="stpl-nav" id="stpl-nav">
                <button class="stpl-nav-item is-active" type="button" data-sec="base">基础设置</button>
                <button class="stpl-nav-item" type="button" data-sec="sub">底部字幕</button>
                <button class="stpl-nav-item" type="button" data-sec="keyword">关键词特效</button>
                <button class="stpl-nav-item" type="button" data-sec="title">标题字幕</button>
              </div>

              <div class="stpl-scroll" id="stpl-scroll">
                <div class="stpl-section" data-sec="base">
                  <div class="field">
                    <div class="label">模板名称</div>
                    <input id="stpl-name" type="text" placeholder="例如：红黑标题 + 白字描边" />
                  </div>
                  <div class="grid cols-2" style="gap: 10px; margin-top: 10px">
                    <div class="field">
                      <div class="label">画布分辨率（用于统一预览与输出比例）</div>
                      <select id="stpl-base-res">
                        <option value="1080x1920" selected>1080×1920（竖屏常用）</option>
                        <option value="720x1280">720×1280</option>
                        <option value="1080x1440">1080×1440（3:4）</option>
                        <option value="1080x1350">1080×1350（4:5）</option>
                        <option value="custom">自定义</option>
                      </select>
                    </div>
                    <div class="field">
                      <div class="label">自定义分辨率</div>
                      <div class="grid cols-2" style="gap: 10px">
                        <input id="stpl-base-w" type="text" value="1080" />
                        <input id="stpl-base-h" type="text" value="1920" />
                      </div>
                    </div>
                  </div>
                </div>

                <div class="stpl-section" data-sec="sub" hidden>
                  <div class="stpl-sec-head">
                    <div class="stpl-sec-title">底部字幕（ASR 字幕样式）</div>
                    <div class="stpl-sec-sub">用于“字幕和音乐”合成时的主体字幕</div>
                  </div>
                  <div class="grid cols-2" style="gap: 10px; margin-top: 10px">
                    <div class="field">
                      <div class="label">字幕位置</div>
                      <div class="seg-tabs stpl-seg" id="stpl-sub-pos">
                        <button class="seg-tab" data-pos="top" type="button">上</button>
                        <button class="seg-tab" data-pos="middle" type="button">中</button>
                        <button class="seg-tab is-active" data-pos="bottom" type="button">下</button>
                      </div>
                    </div>
                    <div class="field">
                      <div class="label">字体大小</div>
                      <div class="stpl-range">
                        <input id="stpl-sub-size" type="range" min="18" max="96" step="1" value="44" />
                        <input id="stpl-sub-size-text" type="text" value="44" />
                      </div>
                    </div>
                  </div>
                  <div class="grid cols-2" style="gap: 10px; margin-top: 10px">
                    <div class="field">
                      <div class="label">分行预设</div>
                      <select id="stpl-sub-lines">
                        <option value="1">1 行</option>
                        <option value="2" selected>2 行</option>
                        <option value="3">3 行</option>
                      </select>
                    </div>
                    <div class="field">
                      <div class="label">每行最大字符数</div>
                      <div class="stpl-range">
                        <input id="stpl-sub-maxchars" type="range" min="6" max="24" step="1" value="14" />
                        <input id="stpl-sub-maxchars-text" type="text" value="14" />
                      </div>
                    </div>
                  </div>
                  <div class="grid cols-2" style="gap: 10px; margin-top: 10px">
                    <div class="field">
                      <div class="label">行间距（%）</div>
                      <div class="stpl-range">
                        <input id="stpl-sub-gap" type="range" min="0" max="30" step="1" value="4" />
                        <input id="stpl-sub-gap-text" type="text" value="4" />
                      </div>
                    </div>
                    <div class="field">
                      <div class="label">字间距（px）</div>
                      <div class="stpl-range">
                        <input id="stpl-sub-spacing" type="range" min="0" max="20" step="1" value="0" />
                        <input id="stpl-sub-spacing-text" type="text" value="0" />
                      </div>
                    </div>
                  </div>
                  <div class="grid cols-2" style="gap: 10px; margin-top: 10px">
                    <div class="field">
                      <div class="label">字体</div>
                      <select id="stpl-sub-font"></select>
                      <div class="hint">来自：字体库（ziti）或系统字体（若为空则使用系统字体名）</div>
                    </div>
                    <div class="field">
                      <div class="label">样式</div>
                      <div class="inline-flags">
                        <label class="chk"><input type="checkbox" id="stpl-sub-bold" checked /> 加粗</label>
                        <label class="chk"><input type="checkbox" id="stpl-sub-shadow" checked /> 阴影</label>
                      </div>
                    </div>
                  </div>
                  <div class="grid cols-2" style="gap: 10px; margin-top: 10px">
                    <div class="field">
                      <div class="label">文字颜色</div>
                      <div class="stpl-color">
                        <input id="stpl-sub-color" type="color" value="#ffffff" />
                        <input id="stpl-sub-color-text" type="text" value="#ffffff" />
                      </div>
                    </div>
                    <div class="field">
                      <div class="label">描边颜色</div>
                      <div class="stpl-color">
                        <input id="stpl-sub-outline-color" type="color" value="#000000" />
                        <input id="stpl-sub-outline-color-text" type="text" value="#000000" />
                      </div>
                    </div>
                  </div>
                  <div class="grid cols-2" style="gap: 10px; margin-top: 10px">
                    <div class="field">
                      <div class="label">描边宽度</div>
                      <div class="stpl-range">
                        <input id="stpl-sub-outline" type="range" min="0" max="8" step="1" value="3" />
                        <input id="stpl-sub-outline-text" type="text" value="3" />
                      </div>
                    </div>
                    <div class="field">
                      <div class="label">底部边距（%）</div>
                      <div class="stpl-range">
                        <input id="stpl-sub-margin" type="range" min="0" max="60" step="1" value="34" />
                        <input id="stpl-sub-margin-text" type="text" value="34" />
                      </div>
                    </div>
                  </div>
                </div>

                <div class="stpl-section" data-sec="keyword" hidden>
                  <div class="stpl-sec-head">
                    <div class="stpl-sec-title">关键词智能识别与特效（用于底部字幕强调）</div>
                    <div class="stpl-sec-sub">自动读取首页“标题｜话题｜关键词”模块的关键词分类，并对字幕内命中的关键词应用样式</div>
                  </div>
                  <div class="field" style="margin-top: 10px">
                    <div class="inline-flags" style="justify-content: space-between">
                      <label class="chk"><input type="checkbox" id="stpl-kw-enable" /> 启用关键词特效</label>
                      <button class="btn" id="stpl-kw-reload" type="button">重新加载关键词</button>
                    </div>
                  </div>
                  <div class="field" style="margin-top: 8px">
                    <span class="pill" id="stpl-kw-status" hidden></span>
                  </div>
                  <div class="field" style="margin-top: 10px">
                    <div class="label">关键词预览</div>
                    <div class="stpl-kw-groups" id="stpl-kw-groups"></div>
                  </div>
                  <div class="field" style="margin-top: 10px">
                    <div class="label">分类样式（4类分别配置）</div>
                    <div class="stpl-kw-editor" id="stpl-kw-editor"></div>
                  </div>
                </div>

                <div class="stpl-section" data-sec="title" hidden>
                  <div class="stpl-sec-head">
                    <div class="stpl-sec-title">标题字幕（自动读取“标题｜话题｜关键词”模块标题）</div>
                    <div class="stpl-sec-sub">可设置分行、行间距、顶部边距，并支持逐行样式</div>
                  </div>

                  <div class="field" style="margin-top: 10px">
                    <div class="inline-flags" style="justify-content: space-between">
                      <label class="chk"><input type="checkbox" id="stpl-title-enable" checked /> 启用标题字幕</label>
                      <button class="btn" id="stpl-title-load" type="button">从首页标题导入</button>
                    </div>
                  </div>

                  <div class="field" style="margin-top: 10px">
                    <div class="label">当前标题</div>
                    <textarea id="stpl-title-text" rows="2" placeholder="标题字幕内容"></textarea>
                  </div>

                  <div class="grid cols-2" style="gap: 10px; margin-top: 10px">
                    <div class="field">
                      <div class="label">分行预设（默认2行）</div>
                      <select id="stpl-title-lines">
                        <option value="1">1 行</option>
                        <option value="2" selected>2 行</option>
                        <option value="3">3 行</option>
                      </select>
                    </div>
                    <div class="field">
                      <div class="label">每行最大字符数</div>
                      <div class="stpl-range">
                        <input id="stpl-title-maxchars" type="range" min="8" max="20" step="1" value="12" />
                        <input id="stpl-title-maxchars-text" type="text" value="12" />
                      </div>
                    </div>
                  </div>

                  <div class="grid cols-2" style="gap: 10px; margin-top: 10px">
                    <div class="field">
                      <div class="label">行间距（%）</div>
                      <div class="stpl-range">
                        <input id="stpl-title-gap" type="range" min="0" max="30" step="1" value="5" />
                        <input id="stpl-title-gap-text" type="text" value="5" />
                      </div>
                    </div>
                    <div class="field">
                      <div class="label">顶部边距（%）</div>
                      <div class="stpl-range">
                        <input id="stpl-title-top" type="range" min="0" max="30" step="1" value="10" />
                        <input id="stpl-title-top-text" type="text" value="10" />
                      </div>
                    </div>
                  </div>
                  <div class="field" style="margin-top: 10px">
                    <div class="label">字间距（px）</div>
                    <div class="stpl-range">
                      <input id="stpl-title-spacing" type="range" min="0" max="20" step="1" value="0" />
                      <input id="stpl-title-spacing-text" type="text" value="0" />
                    </div>
                  </div>

                  <div class="field" style="margin-top: 10px">
                    <div class="label">分行预览</div>
                    <div class="stpl-lines" id="stpl-lines-preview"></div>
                  </div>

                  <div class="field" style="margin-top: 10px">
                    <div class="label">逐行样式</div>
                    <div class="stpl-line-editor" id="stpl-line-editor"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    `);

    const KEY_STORE = "ipfactory.subtitle.templates.v1";
    const HOME_INPUT_MEM_KEY = "ipfactory.home.inputs.v1";
    const HOME_META_KW_KEY = "ipfactory.home.meta.kwMap.v1";

    const stplList = root.querySelector("#stpl-list");
    const stplCount = root.querySelector("#stpl-count");
    let stplRecognize = root.querySelector("#stpl-recognize");
    const stplAdd = root.querySelector("#stpl-add");
    const stplDup = root.querySelector("#stpl-dup");
    const stplDel = root.querySelector("#stpl-del");
    const stplSave = root.querySelector("#stpl-save");
    const pageHeaderActions = root.querySelector(".page-header .card-actions");
    if (pageHeaderActions && !root.querySelector("#stpl-recognize")) {
      const recognizeBtn = document.createElement("button");
      recognizeBtn.className = "btn";
      recognizeBtn.id = "stpl-recognize";
      recognizeBtn.type = "button";
      recognizeBtn.textContent = "模板识别";
      pageHeaderActions.insertBefore(recognizeBtn, stplAdd || null);
      stplRecognize = recognizeBtn;
    }

    if (!root.querySelector("#stpl-rec-modal")) {
      root.insertAdjacentHTML(
        "beforeend",
        `
          <div class="stpl-rec-modal" id="stpl-rec-modal" hidden>
            <div class="stpl-rec-backdrop" data-close="1"></div>
            <div class="card stpl-rec-dialog">
              <div class="card-title">
                <h3>字幕模板识别</h3>
                <div class="card-actions" style="gap:8px;flex-wrap:wrap">
                  <span class="pill" id="stpl-rec-count">请先上传 1-9 张参考图</span>
                  <button class="btn" id="stpl-rec-close" type="button">关闭</button>
                </div>
              </div>
              <div class="stpl-rec-layout">
                <div class="stpl-rec-side">
                  <div class="field">
                    <div class="label">参考截图</div>
                    <div class="card-actions" style="justify-content:space-between">
                      <button class="btn" id="stpl-rec-upload" type="button">上传图片</button>
                      <button class="btn" id="stpl-rec-clear" type="button">清空</button>
                    </div>
                    <div class="hint">支持 1-9 张图片，建议上传同行视频截图，识别后可直接生成模板初始参数。</div>
                  </div>
                  <div class="stpl-rec-thumbs" id="stpl-rec-thumbs"></div>
                  <div class="field" style="margin-top:10px">
                    <div class="label">识别结果摘要</div>
                    <div class="stpl-rec-summary" id="stpl-rec-summary"></div>
                  </div>
                  <div class="field" style="margin-top:10px">
                    <div class="label">模板微调</div>
                    <div class="stpl-rec-editor-body">
                      <div class="stpl-nav stpl-rec-nav" id="stpl-rec-nav">
                        <button class="stpl-nav-item is-active" type="button" data-rec-sec="base">基础设置</button>
                        <button class="stpl-nav-item" type="button" data-rec-sec="sub">底部字幕</button>
                        <button class="stpl-nav-item" type="button" data-rec-sec="keyword">关键词特效</button>
                        <button class="stpl-nav-item" type="button" data-rec-sec="title">标题字幕</button>
                      </div>
                      <div class="stpl-scroll stpl-rec-scroll" id="stpl-rec-scroll">
                        <div class="stpl-section" data-rec-sec="base">
                          <div class="field">
                            <div class="label">新模板名称</div>
                            <input id="stpl-rec-new-name" type="text" placeholder="例如：同行识别模板（新）" />
                            <div class="hint">点击“生成新的字幕模板”时，会按这里的名称生成一个新的本地字幕模板。</div>
                          </div>
                          <div class="field" style="margin-top:10px">
                            <div class="label">标题分行预览</div>
                            <div class="stpl-lines" id="stpl-rec-title-lines-preview"></div>
                          </div>
                        </div>

                        <div class="stpl-section" data-rec-sec="sub" hidden>
                          <div class="grid cols-2" style="gap:10px">
                            <div class="field">
                              <div class="label">正文字号</div>
                              <div class="stpl-range">
                                <input id="stpl-rec-body-size" type="range" min="24" max="120" step="1" value="44" />
                                <input id="stpl-rec-body-size-text" type="text" value="44" />
                              </div>
                            </div>
                            <div class="field">
                              <div class="label">正文垂直边距</div>
                              <div class="stpl-range">
                                <input id="stpl-rec-body-margin" type="range" min="0" max="60" step="1" value="34" />
                                <input id="stpl-rec-body-margin-text" type="text" value="34" />
                              </div>
                            </div>
                          </div>
                          <div class="grid cols-2" style="gap:10px;margin-top:10px">
                            <div class="field">
                              <div class="label">正文左右偏移</div>
                              <div class="stpl-range">
                                <input id="stpl-rec-body-offset-x" type="range" min="-40" max="40" step="1" value="0" />
                                <input id="stpl-rec-body-offset-x-text" type="text" value="0" />
                              </div>
                            </div>
                            <div class="field">
                              <div class="label">正文上下偏移</div>
                              <div class="stpl-range">
                                <input id="stpl-rec-body-offset-y" type="range" min="-40" max="40" step="1" value="0" />
                                <input id="stpl-rec-body-offset-y-text" type="text" value="0" />
                              </div>
                            </div>
                          </div>
                          <div class="field" style="margin-top:10px">
                            <div class="label">正文位置</div>
                            <div class="seg-tabs stpl-seg stpl-rec-body-pos" id="stpl-rec-body-pos">
                              <button class="seg-tab" data-pos="top" type="button">上</button>
                              <button class="seg-tab" data-pos="middle" type="button">中</button>
                              <button class="seg-tab is-active" data-pos="bottom" type="button">下</button>
                            </div>
                          </div>
                          <div class="field" style="margin-top:10px">
                            <div class="label">正文分行预览</div>
                            <div class="stpl-lines" id="stpl-rec-body-lines-preview"></div>
                          </div>
                          <div class="field" style="margin-top:10px">
                            <div class="label">正文逐行样式</div>
                            <div class="stpl-line-editor" id="stpl-rec-body-line-editor"></div>
                          </div>
                        </div>

                        <div class="stpl-section" data-rec-sec="keyword" hidden>
                          <div class="field">
                            <div class="inline-flags" style="justify-content:space-between;gap:10px;flex-wrap:wrap">
                              <label class="chk"><input type="checkbox" id="stpl-rec-kw-enable" /> 启用关键词特效</label>
                              <span class="pill">识别预览中的关键词样式可单独微调</span>
                            </div>
                          </div>
                          <div class="field" style="margin-top:10px">
                            <div class="label">关键词分类预览</div>
                            <div class="stpl-kw-groups" id="stpl-rec-kw-groups"></div>
                          </div>
                          <div class="field" style="margin-top:10px">
                            <div class="label">分类样式（4类分别配置）</div>
                            <div class="stpl-kw-editor" id="stpl-rec-kw-editor"></div>
                          </div>
                        </div>

                        <div class="stpl-section" data-rec-sec="title" hidden>
                          <div class="grid cols-2" style="gap:10px">
                            <div class="field">
                              <div class="label">标题分行</div>
                              <select id="stpl-rec-title-lines">
                                <option value="1">1 行</option>
                                <option value="2" selected>2 行</option>
                                <option value="3">3 行</option>
                              </select>
                            </div>
                            <div class="field">
                              <div class="label">每行最大字数</div>
                              <div class="stpl-range">
                                <input id="stpl-rec-title-maxchars" type="range" min="8" max="20" step="1" value="12" />
                                <input id="stpl-rec-title-maxchars-text" type="text" value="12" />
                              </div>
                            </div>
                          </div>
                          <div class="grid cols-2" style="gap:10px;margin-top:10px">
                            <div class="field">
                              <div class="label">标题字号</div>
                              <div class="stpl-range">
                                <input id="stpl-rec-title-size" type="range" min="28" max="160" step="1" value="68" />
                                <input id="stpl-rec-title-size-text" type="text" value="68" />
                              </div>
                            </div>
                            <div class="field">
                              <div class="label">标题行间距（%）</div>
                              <div class="stpl-range">
                                <input id="stpl-rec-title-gap" type="range" min="0" max="30" step="1" value="5" />
                                <input id="stpl-rec-title-gap-text" type="text" value="5" />
                              </div>
                            </div>
                          </div>
                          <div class="grid cols-2" style="gap:10px;margin-top:10px">
                            <div class="field">
                              <div class="label">标题顶部边距</div>
                              <div class="stpl-range">
                                <input id="stpl-rec-title-top" type="range" min="0" max="30" step="1" value="10" />
                                <input id="stpl-rec-title-top-text" type="text" value="10" />
                              </div>
                            </div>
                            <div class="field">
                              <div class="label">标题左右偏移</div>
                              <div class="stpl-range">
                                <input id="stpl-rec-title-offset-x" type="range" min="-40" max="40" step="1" value="0" />
                                <input id="stpl-rec-title-offset-x-text" type="text" value="0" />
                              </div>
                            </div>
                          </div>
                          <div class="field" style="margin-top:10px">
                            <div class="label">标题上下偏移</div>
                            <div class="stpl-range">
                              <input id="stpl-rec-title-offset-y" type="range" min="-40" max="40" step="1" value="0" />
                              <input id="stpl-rec-title-offset-y-text" type="text" value="0" />
                            </div>
                          </div>
                          <div class="field" style="margin-top:10px">
                            <div class="label">标题逐行样式</div>
                            <div class="stpl-line-editor" id="stpl-rec-title-line-editor"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="card-actions" style="margin-top:12px;justify-content:space-between;flex-wrap:wrap;gap:8px">
                    <button class="btn" id="stpl-rec-run" type="button">开始识别</button>
                    <div class="card-actions" style="gap:8px;flex-wrap:wrap">
                      <button class="btn" id="stpl-rec-create" type="button" disabled>生成新的字幕模板</button>
                      <button class="btn btn-primary" id="stpl-rec-apply" type="button" disabled>应用到当前模板</button>
                    </div>
                  </div>
                </div>
                <div class="stpl-rec-main">
                  <div class="stpl-rec-compare">
                    <div class="stpl-rec-panel">
                      <div class="card-title"><h3>参考截图</h3><span class="pill" id="stpl-rec-ref-name">未选择图片</span></div>
                      <div class="stpl-rec-stage" id="stpl-rec-ref-stage"></div>
                    </div>
                    <div class="stpl-rec-panel">
                      <div class="card-title"><h3>识别预览</h3><span class="pill" id="stpl-rec-preview-hint">识别后会实时生成模板预览</span></div>
                      <div class="stpl-rec-stage stpl-rec-stage-preview">
                        <div class="stpl-phone">
                          <div class="stpl-phone-inner" id="stpl-rec-preview-stage"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `
      );
    }

    const stplName = root.querySelector("#stpl-name");
    const stplHomeTitle = root.querySelector("#stpl-home-title");
    const stplReloadTitle = root.querySelector("#stpl-reload-title");

    const previewTitle = root.querySelector("#stpl-preview-title");
    const previewSub = root.querySelector("#stpl-preview-sub");
    const previewBox = root.querySelector("#stpl-preview");
    const stplPreviewHint = root.querySelector("#stpl-preview-hint");
    const stplUndo = root.querySelector("#stpl-undo");
    const stplRedo = root.querySelector("#stpl-redo");
    const stplBgUpload = root.querySelector("#stpl-bg-upload");
    const stplBgClear = root.querySelector("#stpl-bg-clear");
    const stplCoverCapture = root.querySelector("#stpl-cover-capture");
    const stplCoverClear = root.querySelector("#stpl-cover-clear");
    const stplUploadCloud = root.querySelector("#stpl-upload-cloud");
    const stplCoverThumb = root.querySelector("#stpl-cover-thumb");
    const stplCoverStatus = root.querySelector("#stpl-cover-status");
    const activeIdPill = root.querySelector("#stpl-active-id");
    const activeUpdatedPill = root.querySelector("#stpl-active-updated");

    const baseRes = root.querySelector("#stpl-base-res");
    const baseW = root.querySelector("#stpl-base-w");
    const baseH = root.querySelector("#stpl-base-h");

    const subPos = root.querySelector("#stpl-sub-pos");
    const subSize = root.querySelector("#stpl-sub-size");
    const subSizeText = root.querySelector("#stpl-sub-size-text");
    const subLines = root.querySelector("#stpl-sub-lines");
    const subMaxChars = root.querySelector("#stpl-sub-maxchars");
    const subMaxCharsText = root.querySelector("#stpl-sub-maxchars-text");
    const subGap = root.querySelector("#stpl-sub-gap");
    const subGapText = root.querySelector("#stpl-sub-gap-text");
    const subSpacing = root.querySelector("#stpl-sub-spacing");
    const subSpacingText = root.querySelector("#stpl-sub-spacing-text");
    const subFont = root.querySelector("#stpl-sub-font");
    const subBold = root.querySelector("#stpl-sub-bold");
    const subShadow = root.querySelector("#stpl-sub-shadow");
    const subColor = root.querySelector("#stpl-sub-color");
    const subColorText = root.querySelector("#stpl-sub-color-text");
    const subOutlineColor = root.querySelector("#stpl-sub-outline-color");
    const subOutlineColorText = root.querySelector("#stpl-sub-outline-color-text");
    const subOutline = root.querySelector("#stpl-sub-outline");
    const subOutlineText = root.querySelector("#stpl-sub-outline-text");
    const subMargin = root.querySelector("#stpl-sub-margin");
    const subMarginText = root.querySelector("#stpl-sub-margin-text");

    const kwEnable = root.querySelector("#stpl-kw-enable");
    const kwReload = root.querySelector("#stpl-kw-reload");
    const kwStatus = root.querySelector("#stpl-kw-status");
    const kwGroups = root.querySelector("#stpl-kw-groups");
    const kwEditor = root.querySelector("#stpl-kw-editor");

    const titleEnable = root.querySelector("#stpl-title-enable");
    const titleLoad = root.querySelector("#stpl-title-load");
    const titleText = root.querySelector("#stpl-title-text");
    const titleLines = root.querySelector("#stpl-title-lines");
    const titleMaxChars = root.querySelector("#stpl-title-maxchars");
    const titleMaxCharsText = root.querySelector("#stpl-title-maxchars-text");
    const titleGap = root.querySelector("#stpl-title-gap");
    const titleGapText = root.querySelector("#stpl-title-gap-text");
    const titleTop = root.querySelector("#stpl-title-top");
    const titleTopText = root.querySelector("#stpl-title-top-text");
    const titleSpacing = root.querySelector("#stpl-title-spacing");
    const titleSpacingText = root.querySelector("#stpl-title-spacing-text");
    const linesPreview = root.querySelector("#stpl-lines-preview");
    const lineEditor = root.querySelector("#stpl-line-editor");

    const recModal = root.querySelector("#stpl-rec-modal");
    const recClose = root.querySelector("#stpl-rec-close");
    const recCount = root.querySelector("#stpl-rec-count");
    const recUpload = root.querySelector("#stpl-rec-upload");
    const recClear = root.querySelector("#stpl-rec-clear");
    const recThumbs = root.querySelector("#stpl-rec-thumbs");
    const recSummary = root.querySelector("#stpl-rec-summary");
    const recRun = root.querySelector("#stpl-rec-run");
    const recApply = root.querySelector("#stpl-rec-apply");
    const recRefName = root.querySelector("#stpl-rec-ref-name");
    const recRefStage = root.querySelector("#stpl-rec-ref-stage");
    const recPreviewStage = root.querySelector("#stpl-rec-preview-stage");
    const recPreviewHint = root.querySelector("#stpl-rec-preview-hint");
    const recNav = root.querySelector("#stpl-rec-nav");
    const recScroll = root.querySelector("#stpl-rec-scroll");
    const recNewName = root.querySelector("#stpl-rec-new-name");
    const recCreate = root.querySelector("#stpl-rec-create");
    const recTitleSize = root.querySelector("#stpl-rec-title-size");
    const recTitleSizeText = root.querySelector("#stpl-rec-title-size-text");
    const recTitleLines = root.querySelector("#stpl-rec-title-lines");
    const recTitleMaxChars = root.querySelector("#stpl-rec-title-maxchars");
    const recTitleMaxCharsText = root.querySelector("#stpl-rec-title-maxchars-text");
    const recTitleGap = root.querySelector("#stpl-rec-title-gap");
    const recTitleGapText = root.querySelector("#stpl-rec-title-gap-text");
    const recBodySize = root.querySelector("#stpl-rec-body-size");
    const recBodySizeText = root.querySelector("#stpl-rec-body-size-text");
    const recTitleTop = root.querySelector("#stpl-rec-title-top");
    const recTitleTopText = root.querySelector("#stpl-rec-title-top-text");
    const recTitleOffsetX = root.querySelector("#stpl-rec-title-offset-x");
    const recTitleOffsetXText = root.querySelector("#stpl-rec-title-offset-x-text");
    const recTitleOffsetY = root.querySelector("#stpl-rec-title-offset-y");
    const recTitleOffsetYText = root.querySelector("#stpl-rec-title-offset-y-text");
    const recBodyMargin = root.querySelector("#stpl-rec-body-margin");
    const recBodyMarginText = root.querySelector("#stpl-rec-body-margin-text");
    const recBodyOffsetX = root.querySelector("#stpl-rec-body-offset-x");
    const recBodyOffsetXText = root.querySelector("#stpl-rec-body-offset-x-text");
    const recBodyOffsetY = root.querySelector("#stpl-rec-body-offset-y");
    const recBodyOffsetYText = root.querySelector("#stpl-rec-body-offset-y-text");
    const recKwEnable = root.querySelector("#stpl-rec-kw-enable");
    const recKwGroups = root.querySelector("#stpl-rec-kw-groups");
    const recKwEditor = root.querySelector("#stpl-rec-kw-editor");
    const recBodyPos = root.querySelector("#stpl-rec-body-pos");
    const recTitleLinesPreview = root.querySelector("#stpl-rec-title-lines-preview");
    const recTitleLineEditor = root.querySelector("#stpl-rec-title-line-editor");
    const recBodyLinesPreview = root.querySelector("#stpl-rec-body-lines-preview");
    const recBodyLineEditor = root.querySelector("#stpl-rec-body-line-editor");

    const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
    const nowTs = () => Date.now();
    const uid = () => `stpl_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const toast = (msg, type) => topToast(msg, { type: type || "success" });
    let previewHintTimer = 0;
    const setPreviewHint = (text, { autoReset = false } = {}) => {
      if (!stplPreviewHint) return;
      stplPreviewHint.textContent = String(text || "拖动参数即可实时刷新");
      if (!autoReset) return;
      if (previewHintTimer) window.clearTimeout(previewHintTimer);
      previewHintTimer = window.setTimeout(() => {
        if (stplPreviewHint) stplPreviewHint.textContent = "拖动参数即可实时刷新";
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
    const syncMergedTemplates = (cloudTemplates = []) => {
      const localTemplates = normalizeTemplateList(extractLocalTemplates(state?.templates || []));
      state.templates = normalizeTemplateList(mergeTemplateCollections(localTemplates, cloudTemplates));
      activeId = resolveTemplateSelectionId(state.templates, activeId) || String(state.templates[0]?.id || "system");
      state.activeId = activeId;
      writeStore(state.templates, activeId);
      active = state.templates.find((t) => String(t?.id || "") === String(activeId || "")) || state.templates[0] || null;
    };
    const refreshUploadBtnVisibility = () => {
      if (!stplUploadCloud) return;
      stplUploadCloud.hidden = !canUploadTemplateByIdentity();
    };

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
        window.dispatchEvent(new CustomEvent("ipfactory:subtitleTemplatesChanged"));
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

    const readHomeTitle = () => {
      try {
        const raw = localStorage.getItem(HOME_INPUT_MEM_KEY);
        const parsed = JSON.parse(raw || "{}");
        const t = String(parsed?.["meta-title"] || "").trim();
        return t;
      } catch {
        return "";
      }
    };

    const readHomeKeywordMap = () => {
      try {
        const raw = localStorage.getItem(HOME_META_KW_KEY);
        const parsed = JSON.parse(raw || "{}");
        return parsed && typeof parsed === "object" ? parsed : {};
      } catch {
        return {};
      }
    };

    const normalizeHex = (v, fallback = "#ffffff") => {
      const s = String(v || "").trim();
      if (/^#[0-9a-fA-F]{6}$/.test(s)) return s.toLowerCase();
      return fallback;
    };

    const defaultLineStyle = (idx) => ({
      font: "Microsoft YaHei",
      fontSize: idx === 0 ? 64 : 56,
      bold: true,
      shadow: true,
      color: idx === 0 ? "#b30b08" : "#ffffff",
      outlineColor: "#000000",
      outline: 4
    });

    const defaultTitleBackground = () => ({
      enable: false,
      color: "#202020",
      alpha: 0.82,
      radius: 16,
      paddingX: 22,
      paddingY: 10
    });

    const defaultTemplate = () => ({
      id: "system",
      name: "系统模板（默认）",
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
        offsetXPct: 0,
        offsetYPct: 0
      },
      keywordFx: {
        enable: false,
        groups: {
          "重点词/成语词": { font: "Microsoft YaHei", fontSize: 52, bold: true, shadow: true, color: "#b30b08", outlineColor: "#000000", outline: 4 },
          描述词: { font: "Microsoft YaHei", fontSize: 48, bold: true, shadow: true, color: "#5a8cff", outlineColor: "#000000", outline: 4 },
          行动词: { font: "Microsoft YaHei", fontSize: 48, bold: true, shadow: true, color: "#22c55e", outlineColor: "#000000", outline: 4 },
          情感词: { font: "Microsoft YaHei", fontSize: 48, bold: true, shadow: true, color: "#f59e0b", outlineColor: "#000000", outline: 4 }
        }
      },
      title: {
        enable: true,
        text: "",
        lineCount: 2,
        maxChars: 12,
        lineGapPct: 5,
        letterSpacing: 0,
        topMarginPct: 10,
        offsetXPct: 0,
        offsetYPct: 0,
        background: defaultTitleBackground(),
        lines: [defaultLineStyle(0), defaultLineStyle(1)]
      }
    });

    const normalizeKeywordGroups = (groups = {}) => {
      const seedGroups = defaultTemplate().keywordFx.groups || {};
      const srcGroups = groups && typeof groups === "object" ? groups : {};
      const next = { ...seedGroups };
      Object.keys(srcGroups).forEach((key) => {
        const src = srcGroups[key] && typeof srcGroups[key] === "object" ? srcGroups[key] : {};
        const base = seedGroups[key] && typeof seedGroups[key] === "object" ? seedGroups[key] : defaultLineStyle(0);
        next[key] = { ...base, ...src };
      });
      return next;
    };

    const normalizeTemplateShape = (tpl = {}) => {
      const seed = defaultTemplate();
      const src = tpl && typeof tpl === "object" ? tpl : {};
      const baseRes = src.baseRes && typeof src.baseRes === "object" ? src.baseRes : {};
      const body = src.body && typeof src.body === "object" ? src.body : {};
      const keywordFx = src.keywordFx && typeof src.keywordFx === "object" ? src.keywordFx : {};
      const title = src.title && typeof src.title === "object" ? src.title : {};
      const titleBackground = title.background && typeof title.background === "object" ? title.background : {};
      const desiredLines = clamp(Number(title.lineCount || seed.title.lineCount) || seed.title.lineCount, 1, 3);
      const rawLines = Array.isArray(title.lines) ? title.lines.slice() : [];
      const nextLines = rawLines.map((line, idx) => ({ ...defaultLineStyle(idx), ...(line && typeof line === "object" ? line : {}) }));
      while (nextLines.length < desiredLines) nextLines.push(defaultLineStyle(nextLines.length));
      if (nextLines.length > desiredLines) nextLines.length = desiredLines;
      return {
        ...seed,
        ...src,
        baseRes: { ...seed.baseRes, ...baseRes },
        body: { ...seed.body, ...body },
        keywordFx: {
          ...seed.keywordFx,
          ...keywordFx,
          groups: normalizeKeywordGroups(keywordFx.groups)
        },
        title: {
          ...seed.title,
          ...title,
          background: { ...defaultTitleBackground(), ...titleBackground },
          lineCount: desiredLines,
          lines: nextLines
        }
      };
    };

    const normalizeTemplateList = (list = []) => (Array.isArray(list) ? list : []).map((item) => normalizeTemplateShape(item));

    const ensureStore = () => {
      const { templates, activeId } = readStore();
      let next = normalizeTemplateList(templates);
      let changed = false;
      if (!next.some((t) => String(t?.id || "") === "system")) {
        next = [defaultTemplate(), ...next];
        changed = true;
      }
      const seeded = ensureTonghangSubtitleTemplateStore();
      if (Array.isArray(seeded?.templates) && seeded.templates.length !== next.length) {
        next = normalizeTemplateList(seeded.templates);
        changed = true;
      }
      const cloudCached = getTemplateCloudCache("subtitle");
      const merged = normalizeTemplateList(mergeTemplateCollections(next, cloudCached?.templates || []));
      const resolvedActiveId = resolveTemplateSelectionId(merged, activeId || "system") || "system";
      if (changed) writeStore(next, activeId || "system");
      return { templates: merged, activeId: resolvedActiveId };
    };

    const wrapTextToLines = (text, maxChars) => {
      const max = clamp(Number(maxChars || 12) || 12, 1, 80);
      const raw = String(text || "").replace(/\r\n/g, "\n").trim();
      if (!raw) return [];
      const normalized = raw.replace(/[ \t]+/g, " ").replace(/\n+/g, " ").trim();
      if (!normalized) return [];
      const asciiLen = normalized.replace(/[^\x00-\x7F]/g, "").length;
      const mostlyAscii = normalized.length > 0 ? asciiLen / normalized.length > 0.6 : false;
      const hasSpace = /\s/.test(normalized);
      if (mostlyAscii && hasSpace) {
        const words = normalized.split(/\s+/).filter(Boolean);
        const lines = [];
        let cur = "";
        for (const w of words) {
          const next = cur ? `${cur} ${w}` : w;
          if (next.length <= max) {
            cur = next;
            continue;
          }
          if (cur) lines.push(cur);
          cur = w.length > max ? w.slice(0, max) : w;
        }
        if (cur) lines.push(cur);
        return lines;
      }
      const chars = Array.from(normalized.replace(/\s+/g, ""));
      const lines = [];
      for (let i = 0; i < chars.length; i += max) lines.push(chars.slice(i, i + max).join(""));
      return lines.filter((x) => String(x || "").trim());
    };

    let fonts = [];
    const loadFonts = async () => {
      const res = await window.api?.media?.listFonts?.();
      const items = Array.isArray(res?.items) ? res.items : [];
      fonts = items.map((x) => ({ name: String(x?.name || ""), path: String(x?.path || "") })).filter((x) => x.name);
      await ensureProjectTemplateFonts(fonts);
      const opts = [`<option value="Microsoft YaHei" selected>Microsoft YaHei（系统）</option>`].concat(
        fonts.map((f) => `<option value="${encodeURIComponent(f.name)}">${f.name}</option>`)
      );
      subFont.innerHTML = opts.join("");
      renderLineEditors();
      requestPreviewRender("fonts-loaded");
    };

    let state = ensureStore();
    let activeId = String(state.activeId || "system");
    let active = normalizeTemplateShape(state.templates.find((t) => String(t?.id || "") === activeId) || state.templates[0] || null);
    let dirty = false;
    const templateHistory = createTemplateHistoryManager({ limit: 120, mergeWindowMs: 900 });
    const cloneTemplate = (tpl) => JSON.parse(JSON.stringify(tpl || defaultTemplate()));
    const syncHistoryButtons = () => {
      const historyState = templateHistory.state();
      if (stplUndo) stplUndo.disabled = !active || historyState.canUndo !== true;
      if (stplRedo) stplRedo.disabled = !active || historyState.canRedo !== true;
    };
    const resetTemplateHistory = () => {
      templateHistory.reset(cloneTemplate(active));
      syncHistoryButtons();
    };
    const previewScheduler = createTemplatePreviewScheduler({
      render: () => applyPreview(),
      onRendered: ({ latencyMs }) => {
        if (latencyMs > 0) setPreviewHint(`实时同步 ${latencyMs}ms`, { autoReset: true });
      }
    });
    const requestPreviewRender = (reason = "") => previewScheduler.requestRender(reason);
    const flushPreviewRender = () => previewScheduler.flushRender();
    let homeKeywordMap = readHomeKeywordMap();
    let kwAvailable = true;
    refreshUploadBtnVisibility();
    const syncCloudTemplateList = async ({ silent = false } = {}) => {
      const res = await fetchCloudTemplates("subtitle");
      if (!res?.ok) {
        if (!silent) toast(String(res?.errMsg || "字幕模板云同步失败。"), "warn");
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
              title: "保存字幕模板",
              message: "当前字幕模板已修改，确认后会自动保存并跳转到目标页面。",
              confirmText: "保存并离开",
              cancelText: "继续编辑",
              extraText: "不保存并退出",
              tone: "warn",
              onConfirm: async () => saveActiveTemplate({ showToast: true, successMessage: "字幕模板已自动保存。", skipIfClean: false }),
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
                  window.dispatchEvent(new CustomEvent("ipfactory:subtitleTemplatesChanged"));
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
        if (shouldCompactStoredImage(bgSrc, 260000)) {
          const compactBg = await compressDataUrlImage(bgSrc, {
            maxWidth: 360,
            maxHeight: 640,
            quality: 0.72,
            mimeType: "image/webp"
          });
          if (compactBg && compactBg.length < bgSrc.length) {
            nextTpl.previewBackground = compactBg;
            changed = true;
          }
        }
        const coverSrc = String(nextTpl?.previewCover || "").trim();
        if (shouldCompactStoredImage(coverSrc, 140000)) {
          const compactCover = await compressDataUrlImage(coverSrc, {
            maxWidth: 260,
            maxHeight: 462,
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
      const isCloudTemplate = getTemplateSource(active) === "cloud";
      stplSave.disabled = !active || !dirty || (isCloudTemplate && !canUploadTemplateByIdentity());
    };
    const syncActiveRecord = ({ updateTimestamp = true, persist = false, refreshList = false } = {}) => {
      if (!active) return;
      if (updateTimestamp) active.updatedAt = nowTs();
      const idx = state.templates.findIndex((t) => String(t?.id || "") === String(active.id || ""));
      if (idx >= 0) state.templates[idx] = active;
      if (persist) scheduleStoreWrite();
      if (refreshList) scheduleListRender();
    };

    const saveActiveTemplate = async ({ showToast = true, successMessage = "保存成功。", skipIfClean = true, uploadCloud = true } = {}) => {
      if (!active) return false;
      if (skipIfClean && !dirty) return true;
      const isCloudTemplate = getTemplateSource(active) === "cloud";
      if (isCloudTemplate && !canUploadTemplateByIdentity()) {
        if (showToast) toast("当前是云端模板，只有超级管理员可以直接保存到云端。请先复制为本地模板后再保存。", "warn");
        return false;
      }
      active.name = String(stplName.value || active.name || "").trim() || "未命名模板";
      syncActiveRecord({ updateTimestamp: true });
      const storeRes = flushStoreWrite({ warn: true });
      if (storeRes?.ok === false) {
        toast("模板保存失败，请先缩小模板底图或模板封面后再重试。", "warn");
        return false;
      }
      const oldLabel = stplSave.textContent;
      stplSave.disabled = true;
      stplSave.textContent = "保存中...";
      try {
        const res = await window.api?.templateStore?.saveSubtitleTemplate?.({ template: active });
        let localWarn = "";
        if (!res?.ok) {
          localWarn = `已保存到本地缓存，但写入文件失败：${String(res?.message || "")}`;
        }
        if (isCloudTemplate && uploadCloud !== false) {
          const cloudRes = await saveCloudSubtitleTemplate(active);
          if (!cloudRes?.ok) {
            if (showToast) toast(String(cloudRes?.errMsg || "云端字幕模板保存失败。"), "warn");
            renderList();
            renderEditor();
            return false;
          }
          setDirty(false);
          try {
            savedStoreRaw = localStorage.getItem(KEY_STORE) || "";
          } catch {}
          renderList();
          renderEditor();
          if (showToast) toast(localWarn ? `云端模板已保存，但本地文件写入失败：${localWarn.replace(/^已保存到本地缓存，但写入文件失败：/, "")}` : "云端模板已保存。", localWarn ? "warn" : "success");
          return true;
        }
        if (localWarn) {
          if (showToast) toast(localWarn, "warn");
        } else if (showToast) {
          toast(isCloudTemplate ? "云端模板本地缓存已同步。" : successMessage, "success");
        }
        setDirty(false);
        try {
          savedStoreRaw = localStorage.getItem(KEY_STORE) || "";
        } catch {}
        renderList();
        renderEditor();
        return true;
      } catch (e) {
        const message = String(e?.message || e);
        if (isCloudTemplate) {
          if (showToast) toast(`云端模板保存失败：${message}`, "warn");
          renderList();
          renderEditor();
          return false;
        }
        if (showToast) toast(`已保存到本地，但写入文件失败：${message}`, "warn");
        setDirty(false);
        try {
          savedStoreRaw = localStorage.getItem(KEY_STORE) || "";
        } catch {}
        renderList();
        renderEditor();
        return true;
      } finally {
        stplSave.textContent = oldLabel;
        renderEditor();
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

    const computeTitleLines = (tpl) => {
      const t = String(tpl?.title?.text || "").trim();
      const maxChars = clamp(Number(tpl?.title?.maxChars || 12) || 12, 8, 20);
      const desired = clamp(Number(tpl?.title?.lineCount || 2) || 2, 1, 3);
      const lines = wrapTextToLines(t, maxChars);
      const out = lines.slice(0, desired);
      while (out.length < desired) out.push("");
      return out;
    };
    const computeBodyLines = (tpl, sampleText = "示例字幕文字（底部字幕）") => {
      const text = String(sampleText || "").trim();
      const lineCount = clamp(Number(tpl?.body?.lineCount || 2) || 2, 1, 3);
      const maxChars = clamp(Number(tpl?.body?.maxChars || 14) || 14, 6, 24);
      const lines = wrapTextToLines(text, maxChars).slice(0, lineCount);
      return lines.length ? lines : [text];
    };

    const hexToRgba = (hex, alpha = 1) => {
      const safe = normalizeHex(hex, "#000000");
      const raw = safe.slice(1);
      const r = parseInt(raw.slice(0, 2), 16);
      const g = parseInt(raw.slice(2, 4), 16);
      const b = parseInt(raw.slice(4, 6), 16);
      const a = clamp(Number(alpha || 0) || 0, 0, 1);
      return `rgba(${r}, ${g}, ${b}, ${a})`;
    };

    const buildPreviewTextShadow = (outlinePx, outlineColor, withShadow = true) => {
      const o = Math.max(0, Math.round(outlinePx || 0));
      const oc = normalizeHex(outlineColor, "#000000");
      const ss = [];
      if (o > 0) {
        ss.push(`-${o}px 0 0 ${oc}`, `${o}px 0 0 ${oc}`, `0 -${o}px 0 ${oc}`, `0 ${o}px 0 ${oc}`);
        ss.push(`-${o}px -${o}px 0 ${oc}`, `${o}px -${o}px 0 ${oc}`, `-${o}px ${o}px 0 ${oc}`, `${o}px ${o}px 0 ${oc}`);
      }
      if (withShadow) ss.push("0 6px 12px rgba(0,0,0,0.35)");
      return ss.join(",");
    };

    const buildKeywordPreviewHtml = (rawText, keywordFx, scale = 1) => {
      const fx = keywordFx && typeof keywordFx === "object" ? keywordFx : {};
      if (fx.enable !== true) return escapeHtml(rawText);
      const groups = fx.groups && typeof fx.groups === "object" ? fx.groups : {};
      const catOrder = ["重点词/成语词", "描述词", "行动词", "情感词"];
      const catLabels = {
        "重点词/成语词": "重点词",
        描述词: "描述词",
        行动词: "行动词",
        情感词: "情感词"
      };
      const renderStyle = (s) => {
        const fs = clamp(Number(s?.fontSize || 48) || 48, 10, 260) * scale;
        const bold = s?.bold !== false;
        const shadow = s?.shadow !== false;
        const color = normalizeHex(s?.color, "#ffffff");
        const oc = normalizeHex(s?.outlineColor, "#000000");
        const outline = clamp(Number(s?.outline || 4) || 0, 0, 30) * scale;
        return [
          `font-family:${buildTemplateFontCss(s?.font || "Microsoft YaHei")}`,
          `font-size:${Math.round(fs)}px`,
          `font-weight:${bold ? 900 : 700}`,
          `color:${color}`,
          `text-shadow:${buildPreviewTextShadow(outline, oc, shadow)}`
        ].join(";");
      };
      const parts = [`<span>${escapeHtml(rawText)}</span>`];
      catOrder.forEach((cat) => {
        const style = groups?.[cat];
        if (!style) return;
        parts.push(`<span style="${renderStyle(style)}">${escapeHtml(catLabels[cat] || cat)}</span>`);
      });
      return parts.join(" ");
    };

    const getSubtitleCardPreview = (tpl) => {
      const t = tpl && typeof tpl === "object" ? tpl : {};
      return (
        String(t.previewCover || "").trim() ||
        createSubtitleTemplatePreviewDataUrl(t, {
          titleText: String(t?.title?.text || "").trim() || readHomeTitle() || "标题示例",
          bodyText: "示例字幕文字",
          keywordPreview: true
        })
      );
    };

    const recognizeState = {
      visible: false,
      items: [],
      selectedId: "",
      analyzing: false,
      summary: null,
      workingTemplate: null,
      drag: null,
      newTemplateName: "",
      activeSec: "base",
      focusRole: "",
      focusTitleLineIdx: 0,
      focusBodyLineIdx: 0
    };

    const recognizeHistory = createTemplateHistoryManager({ limit: 120, mergeWindowMs: 900 });
    const resetRecognizeHistory = () => {
      if (!recognizeState.workingTemplate) return;
      recognizeHistory.reset(cloneTemplate(recognizeState.workingTemplate));
    };
    const applyRecognizeHistorySnapshot = (snapshot) => {
      if (!snapshot || !recognizeState.workingTemplate) return;
      recognizeState.workingTemplate = normalizeTemplateShape(snapshot);
      syncRecognizeControlsFromTemplate();
      renderRecognizeTitleLinesPreview();
      renderRecognizeBodyLinesPreview();
      renderRecognizeTitleLineEditors();
      renderRecognizeBodyLineEditors();
      renderRecognizeKeywordFxUi();
      renderRecognizePreview();
      if (recApply) recApply.disabled = !recognizeState.summary;
    };

    const getRecognizeSelectedItem = () =>
      recognizeState.items.find((item) => String(item?.id || "") === String(recognizeState.selectedId || "")) || recognizeState.items[0] || null;

    const buildRecognizeTemplateName = (baseName = "") => {
      const base = String(baseName || "").trim() || "新字幕模板";
      return /（识别）$/.test(base) ? base : `${base}（识别）`;
    };

    const syncRecognizeNameInput = () => {
      if (!recNewName) return;
      const wanted = String(recognizeState.newTemplateName || "").trim() || buildRecognizeTemplateName(active?.name || recognizeState.workingTemplate?.name || "");
      recognizeState.newTemplateName = wanted;
      if (recNewName.value !== wanted) recNewName.value = wanted;
    };

    const setRecBodyPosValue = (value) => {
      const next = ["top", "middle", "bottom"].includes(String(value || "")) ? String(value || "") : "bottom";
      Array.from(recBodyPos?.querySelectorAll(".seg-tab[data-pos]") || []).forEach((btn) => {
        btn.classList.toggle("is-active", String(btn.getAttribute("data-pos") || "") === next);
      });
    };

    const setRecognizeSection = (value = "base") => {
      const next = ["base", "sub", "keyword", "title"].includes(String(value || "")) ? String(value || "") : "base";
      recognizeState.activeSec = next;
      Array.from(recNav?.querySelectorAll(".stpl-nav-item[data-rec-sec]") || []).forEach((btn) => {
        btn.classList.toggle("is-active", String(btn.getAttribute("data-rec-sec") || "") === next);
      });
      Array.from(recScroll?.querySelectorAll(".stpl-section[data-rec-sec]") || []).forEach((sec) => {
        sec.hidden = String(sec.getAttribute("data-rec-sec") || "") !== next;
      });
      try {
        recScroll?.scrollTo?.({ top: 0 });
      } catch {}
    };

    const buildRecognizeDemoLine = (seed, maxChars, idx = 0) => {
      const limit = clamp(Number(maxChars || 0) || 0, 4, 24);
      const seeds = Array.isArray(seed) ? seed : [String(seed || "").trim()].filter(Boolean);
      const fallbackSeeds = seeds.length ? seeds : ["没有考不上的公务员", "只要避开这3个雷区", "缺考人数将近80万", "普通字幕", "重点词", "描述词", "行动词", "情感词"];
      let out = "";
      let cursor = idx % fallbackSeeds.length;
      while (Array.from(out).length < limit) {
        out += fallbackSeeds[cursor] || fallbackSeeds[0];
        cursor = (cursor + 1) % fallbackSeeds.length;
      }
      return Array.from(out).slice(0, limit).join("");
    };

    const buildRecognizePreviewTexts = (tpl, selected) => {
      const titleLineCount = clamp(Number(tpl?.title?.lineCount || 2) || 2, 1, 3);
      const titleMaxChars = clamp(Number(tpl?.title?.maxChars || 12) || 12, 6, 20);
      const bodyLineCount = clamp(Number(tpl?.body?.lineCount || 2) || 2, 1, 3);
      const bodyMaxChars = clamp(Number(tpl?.body?.maxChars || 14) || 14, 6, 24);
      const titleSeeds = ["没有考不上的公务员", "只要避开这3个雷区", "短视频文案拆解", "标题识别结果预览"];
      const bodySeeds = ["普通字幕", "重点词", "描述词", "行动词", "情感词", "关键信息", "字幕样式", "实时预览"];
      const titleLines = Array.from({ length: titleLineCount }, (_, idx) => buildRecognizeDemoLine(titleSeeds, titleMaxChars, idx));
      const bodyLines = Array.from({ length: bodyLineCount }, (_, idx) => {
        if (idx === 0 && tpl?.keywordFx?.enable === true) return buildRecognizeDemoLine(["普通字幕", "重点词", "描述词"], bodyMaxChars, idx);
        if (idx === 1 && tpl?.keywordFx?.enable === true) return buildRecognizeDemoLine(["行动词", "情感词", "关键词"], bodyMaxChars, idx);
        return buildRecognizeDemoLine(bodySeeds, bodyMaxChars, idx);
      });
      return {
        titleText: titleLines.join(""),
        bodyText: bodyLines.join(""),
        titleLines,
        bodyLines,
        backgroundImage: String(selected?.dataUrl || "").trim()
      };
    };

    const syncRecognizeControlsFromTemplate = () => {
      const tpl = recognizeState.workingTemplate;
      if (!tpl) return;
      const titleLine = Array.isArray(tpl?.title?.lines) ? tpl.title.lines[0] || defaultLineStyle(0) : defaultLineStyle(0);
      if (recTitleLines) recTitleLines.value = String(clamp(tpl?.title?.lineCount || 2, 1, 3));
      if (recTitleMaxChars) recTitleMaxChars.value = String(clamp(tpl?.title?.maxChars || 12, 8, 20));
      if (recTitleMaxCharsText) recTitleMaxCharsText.value = recTitleMaxChars?.value || "12";
      if (recTitleSize) recTitleSize.value = String(clamp(titleLine.fontSize || 68, 28, 160));
      if (recTitleSizeText) recTitleSizeText.value = recTitleSize?.value || "68";
      if (recTitleGap) recTitleGap.value = String(clamp(tpl?.title?.lineGapPct || 5, 0, 30));
      if (recTitleGapText) recTitleGapText.value = recTitleGap?.value || "5";
      if (recBodySize) recBodySize.value = String(clamp(tpl?.body?.fontSize || 44, 24, 120));
      if (recBodySizeText) recBodySizeText.value = recBodySize?.value || "44";
      if (recTitleTop) recTitleTop.value = String(clamp(tpl?.title?.topMarginPct || 10, 0, 30));
      if (recTitleTopText) recTitleTopText.value = recTitleTop?.value || "10";
      if (recBodyMargin) recBodyMargin.value = String(clamp(tpl?.body?.marginVPct || 34, 0, 60));
      if (recBodyMarginText) recBodyMarginText.value = recBodyMargin?.value || "34";
      if (recTitleOffsetX) recTitleOffsetX.value = String(clamp(tpl?.title?.offsetXPct || 0, -40, 40));
      if (recTitleOffsetXText) recTitleOffsetXText.value = recTitleOffsetX?.value || "0";
      if (recTitleOffsetY) recTitleOffsetY.value = String(clamp(tpl?.title?.offsetYPct || 0, -40, 40));
      if (recTitleOffsetYText) recTitleOffsetYText.value = recTitleOffsetY?.value || "0";
      if (recBodyOffsetX) recBodyOffsetX.value = String(clamp(tpl?.body?.offsetXPct || 0, -40, 40));
      if (recBodyOffsetXText) recBodyOffsetXText.value = recBodyOffsetX?.value || "0";
      if (recBodyOffsetY) recBodyOffsetY.value = String(clamp(tpl?.body?.offsetYPct || 0, -40, 40));
      if (recBodyOffsetYText) recBodyOffsetYText.value = recBodyOffsetY?.value || "0";
      if (recKwEnable) recKwEnable.checked = tpl?.keywordFx?.enable === true;
      setRecBodyPosValue(String(tpl?.body?.pos || "bottom"));
    };

    const renderRecognizeTitleLinesPreview = () => {
      if (!recTitleLinesPreview) return;
      const tpl = recognizeState.workingTemplate;
      if (!tpl) {
        recTitleLinesPreview.innerHTML = `<div class="empty">识别后这里会显示标题分行效果。</div>`;
        return;
      }
      const previewTexts = buildRecognizePreviewTexts(tpl, getRecognizeSelectedItem());
      const maxChars = clamp(Number(tpl?.title?.maxChars || 12) || 12, 8, 20);
      recTitleLinesPreview.innerHTML = previewTexts.titleLines
        .map((line, idx) => {
          const len = Array.from(String(line || "")).length;
          return `<div class="stpl-line-pill" data-rec-title-line-idx="${idx}">
            <span class="stpl-line-idx">第${idx + 1}行</span>
            <span class="stpl-line-text">${escapeHtml(line || "（空）")}</span>
            <span class="stpl-line-len">${len}/${maxChars}</span>
          </div>`;
        })
        .join("");
      Array.from(recTitleLinesPreview.querySelectorAll(".stpl-line-pill[data-rec-title-line-idx]")).forEach((pill) => {
        pill.addEventListener("click", () => {
          const idx = Number(pill.getAttribute("data-rec-title-line-idx") || 0);
          recognizeState.focusRole = "title";
          recognizeState.focusTitleLineIdx = clamp(idx, 0, 2);
          setRecognizeSection("title");
          focusRecognizeTitleLineEditor(recognizeState.focusTitleLineIdx);
          syncRecognizeFocusStyles();
        });
      });
    };

    const defaultBodyLineStyle = (idx, bodyCfg = {}) => {
      const b = bodyCfg && typeof bodyCfg === "object" ? bodyCfg : {};
      return {
        font: String(b.font || "Microsoft YaHei"),
        fontSize: clamp(Number(b.fontSize || 44) || 44, 10, 200),
        color: normalizeHex(b.color, "#ffffff"),
        outlineColor: normalizeHex(b.outlineColor, "#000000"),
        outline: clamp(Number(b.outline || 3) || 0, 0, 24),
        bold: b.bold !== false,
        shadow: b.shadow !== false
      };
    };

    const renderRecognizeBodyLinesPreview = () => {
      if (!recBodyLinesPreview) return;
      const tpl = recognizeState.workingTemplate;
      if (!tpl) {
        recBodyLinesPreview.innerHTML = `<div class="empty">识别后这里会显示正文分行效果。</div>`;
        return;
      }
      const previewTexts = buildRecognizePreviewTexts(tpl, getRecognizeSelectedItem());
      const maxChars = clamp(Number(tpl?.body?.maxChars || 14) || 14, 6, 24);
      recBodyLinesPreview.innerHTML = previewTexts.bodyLines
        .map((line, idx) => {
          const len = Array.from(String(line || "")).length;
          return `<div class="stpl-line-pill" data-rec-body-line-idx="${idx}">
            <span class="stpl-line-idx">第${idx + 1}行</span>
            <span class="stpl-line-text">${escapeHtml(line || "（空）")}</span>
            <span class="stpl-line-len">${len}/${maxChars}</span>
          </div>`;
        })
        .join("");
      Array.from(recBodyLinesPreview.querySelectorAll(".stpl-line-pill[data-rec-body-line-idx]")).forEach((pill) => {
        pill.addEventListener("click", () => {
          const idx = Number(pill.getAttribute("data-rec-body-line-idx") || 0);
          recognizeState.focusRole = "body";
          recognizeState.focusBodyLineIdx = clamp(idx, 0, 2);
          setRecognizeSection("sub");
          focusRecognizeBodyLineEditor(recognizeState.focusBodyLineIdx);
          syncRecognizeFocusStyles();
        });
      });
    };

    const renderRecognizeBodyLineEditors = () => {
      if (!recBodyLineEditor) return;
      const tpl = recognizeState.workingTemplate;
      if (!tpl) {
        recBodyLineEditor.innerHTML = `<div class="empty">识别后可单独调整正文每一行的样式。</div>`;
        return;
      }
      const bodyCfg = tpl.body || {};
      const desired = clamp(Number(bodyCfg.lineCount || 2) || 2, 1, 3);
      const lines = Array.isArray(bodyCfg.lines) ? bodyCfg.lines.slice(0, desired) : [];
      while (lines.length < desired) lines.push(defaultBodyLineStyle(lines.length, bodyCfg));
      const fontOptionsHtml = [`<option value="Microsoft YaHei">Microsoft YaHei（系统）</option>`]
        .concat(fonts.map((f) => `<option value="${encodeURIComponent(f.name)}">${f.name}</option>`))
        .join("");
      const openedIdx = clamp(Number(recognizeState.focusBodyLineIdx || 0) || 0, 0, desired - 1);
      const previewTexts = buildRecognizePreviewTexts(tpl, getRecognizeSelectedItem());
      recBodyLineEditor.innerHTML = lines
        .map((line, idx) => {
          const base = defaultBodyLineStyle(idx, bodyCfg);
          const cur = { ...base, ...(line && typeof line === "object" ? line : {}) };
          const fs = clamp(Number(cur.fontSize || 44) || 44, 10, 200);
          const color = normalizeHex(cur.color, "#ffffff");
          const outlineColor = normalizeHex(cur.outlineColor, "#000000");
          const outline = clamp(Number(cur.outline || 3) || 0, 0, 24);
          const bold = cur.bold !== false;
          const shadow = cur.shadow !== false;
          return `<details class="stpl-line-card" ${idx === openedIdx ? "open" : ""}>
            <summary class="stpl-line-sum">
              <div class="stpl-line-sum-left">
                <span class="pill">第${idx + 1}行</span>
                <span class="stpl-line-sum-text">${escapeHtml(previewTexts.bodyLines[idx] || "（空）")}</span>
              </div>
              <span class="pill">展开</span>
            </summary>
            <div class="stpl-line-body" data-rec-body-line-idx="${idx}">
              <div class="grid cols-2" style="gap: 10px">
                <div class="field">
                  <div class="label">字体</div>
                  <select class="stpl-rec-body-font">${fontOptionsHtml}</select>
                </div>
                <div class="field">
                  <div class="label">字体大小</div>
                  <div class="stpl-range">
                    <input class="stpl-rec-body-font-size" type="range" min="10" max="200" step="1" value="${fs}" />
                    <input class="stpl-rec-body-font-size-text" type="text" value="${fs}" />
                  </div>
                </div>
              </div>
              <div class="grid cols-2" style="gap: 10px; margin-top: 10px">
                <div class="field">
                  <div class="label">文字颜色</div>
                  <div class="stpl-color">
                    <input class="stpl-rec-body-color" type="color" value="${color}" />
                    <input class="stpl-rec-body-color-text" type="text" value="${color}" />
                  </div>
                </div>
                <div class="field">
                  <div class="label">描边颜色</div>
                  <div class="stpl-color">
                    <input class="stpl-rec-body-ocolor" type="color" value="${outlineColor}" />
                    <input class="stpl-rec-body-ocolor-text" type="text" value="${outlineColor}" />
                  </div>
                </div>
              </div>
              <div class="grid cols-2" style="gap: 10px; margin-top: 10px">
                <div class="field">
                  <div class="label">描边宽度</div>
                  <div class="stpl-range">
                    <input class="stpl-rec-body-outline" type="range" min="0" max="24" step="1" value="${outline}" />
                    <input class="stpl-rec-body-outline-text" type="text" value="${outline}" />
                  </div>
                </div>
                <div class="field">
                  <div class="label">样式</div>
                  <div class="inline-flags">
                    <label class="chk"><input class="stpl-rec-body-bold" type="checkbox" ${bold ? "checked" : ""} /> 加粗</label>
                    <label class="chk"><input class="stpl-rec-body-shadow" type="checkbox" ${shadow ? "checked" : ""} /> 阴影</label>
                  </div>
                </div>
              </div>
            </div>
          </details>`;
        })
        .join("");

      Array.from(recBodyLineEditor.querySelectorAll(".stpl-line-body[data-rec-body-line-idx]")).forEach((bodyEl) => {
        const idx = Number(bodyEl.getAttribute("data-rec-body-line-idx") || -1);
        if (!Number.isFinite(idx) || idx < 0) return;
        const pick = (sel) => bodyEl.querySelector(sel);
        const fontSel = pick(".stpl-rec-body-font");
        const sizeRange = pick(".stpl-rec-body-font-size");
        const sizeText = pick(".stpl-rec-body-font-size-text");
        const colorInput = pick(".stpl-rec-body-color");
        const colorText = pick(".stpl-rec-body-color-text");
        const oColorInput = pick(".stpl-rec-body-ocolor");
        const oColorText = pick(".stpl-rec-body-ocolor-text");
        const oRange = pick(".stpl-rec-body-outline");
        const oText = pick(".stpl-rec-body-outline-text");
        const boldChk = pick(".stpl-rec-body-bold");
        const shadowChk = pick(".stpl-rec-body-shadow");
        const readCurrentLine = () => {
          const latestBody = recognizeState.workingTemplate?.body || {};
          const latestLines = Array.isArray(latestBody?.lines) ? latestBody.lines : [];
          const base = defaultBodyLineStyle(idx, latestBody);
          const cur = latestLines[idx] && typeof latestLines[idx] === "object" ? latestLines[idx] : {};
          return { ...base, ...cur };
        };
        const setFontValue = () => {
          const cur = readCurrentLine();
          const decoded = getFontLabel(cur.font);
          const encoded = encodeURIComponent(decoded);
          const exists = Array.from(fontSel.options || []).some((o) => o.value === encoded);
          fontSel.value = exists ? encoded : decoded;
        };
        const applyLine = (next, { trackHistory = true } = {}) => {
          const latestBody = recognizeState.workingTemplate?.body || {};
          const latestLines = Array.isArray(latestBody?.lines)
            ? latestBody.lines.map((item) => ({ ...(item && typeof item === "object" ? item : {}) }))
            : [];
          latestLines[idx] = { ...readCurrentLine(), ...next };
          applyRecognizeQuickPatch(
            { body: { lines: latestLines } },
            { refreshEditors: false, trackHistory, groupKey: `rec-body-line-${idx}` }
          );
        };
        setFontValue();
        fontSel?.addEventListener("change", () => applyLine({ font: String(fontSel.value || "Microsoft YaHei") }));
        sizeRange?.addEventListener("input", () => {
          const v = clamp(Number(sizeRange.value || 44) || 44, 10, 200);
          sizeRange.value = String(v);
          if (sizeText) sizeText.value = String(v);
          applyLine({ fontSize: v });
        });
        wireNumericText(sizeText, (raw) => {
          const v = clamp(Number(raw || 0) || 0, 10, 200);
          sizeText.value = String(v);
          if (sizeRange) sizeRange.value = String(v);
          applyLine({ fontSize: v });
        });
        const wireColor = (picker, text, key, fallback) => {
          const apply = (hex) => applyLine({ [key]: normalizeHex(hex, fallback) });
          picker?.addEventListener("input", () => {
            const v = normalizeHex(picker.value, fallback);
            picker.value = v;
            if (text) text.value = v;
            apply(v);
          });
          text?.addEventListener("input", () => {
            const v = normalizeHex(text.value, fallback);
            text.value = v;
            if (picker) picker.value = v;
            apply(v);
          });
        };
        wireColor(colorInput, colorText, "color", "#ffffff");
        wireColor(oColorInput, oColorText, "outlineColor", "#000000");
        oRange?.addEventListener("input", () => {
          const v = clamp(Number(oRange.value || 0) || 0, 0, 24);
          oRange.value = String(v);
          if (oText) oText.value = String(v);
          applyLine({ outline: v });
        });
        wireNumericText(oText, (raw) => {
          const v = clamp(Number(raw || 0) || 0, 0, 24);
          oText.value = String(v);
          if (oRange) oRange.value = String(v);
          applyLine({ outline: v });
        }, { allowDecimal: false });
        boldChk?.addEventListener("change", () => applyLine({ bold: boldChk.checked === true }));
        shadowChk?.addEventListener("change", () => applyLine({ shadow: shadowChk.checked === true }));
      });
    };

    const renderRecognizeTitleLineEditors = () => {
      if (!recTitleLineEditor) return;
      const tpl = recognizeState.workingTemplate;
      if (!tpl) {
        recTitleLineEditor.innerHTML = `<div class="empty">识别后可单独调整标题每一行的样式。</div>`;
        return;
      }
      const titleCfg = tpl.title || {};
      const desired = clamp(Number(titleCfg.lineCount || 2) || 2, 1, 3);
      const lines = Array.isArray(titleCfg.lines) ? titleCfg.lines.slice(0, desired) : [];
      while (lines.length < desired) lines.push(defaultLineStyle(lines.length));
      const fontOptionsHtml = [`<option value="Microsoft YaHei">Microsoft YaHei（系统）</option>`]
        .concat(fonts.map((f) => `<option value="${encodeURIComponent(f.name)}">${f.name}</option>`))
        .join("");
      const openedIdx = clamp(Number(recognizeState.focusTitleLineIdx || 0) || 0, 0, desired - 1);
      recTitleLineEditor.innerHTML = lines
        .map((line, idx) => {
          const cur = { ...defaultLineStyle(idx), ...(line && typeof line === "object" ? line : {}) };
          const fs = clamp(Number(cur.fontSize || (idx === 0 ? 64 : 56)) || 60, 18, 160);
          const color = normalizeHex(cur.color, idx === 0 ? "#b30b08" : "#ffffff");
          const outlineColor = normalizeHex(cur.outlineColor, "#000000");
          const outline = clamp(Number(cur.outline || 4) || 0, 0, 12);
          const bold = cur.bold !== false;
          const shadow = cur.shadow !== false;
          return `<details class="stpl-line-card" ${idx === openedIdx ? "open" : ""}>
            <summary class="stpl-line-sum">
              <div class="stpl-line-sum-left">
                <span class="pill">第${idx + 1}行</span>
                <span class="stpl-line-sum-text">${escapeHtml(buildRecognizePreviewTexts(tpl, getRecognizeSelectedItem()).titleLines[idx] || "（空）")}</span>
              </div>
              <span class="pill">展开</span>
            </summary>
            <div class="stpl-line-body" data-rec-line-idx="${idx}">
              <div class="grid cols-2" style="gap: 10px">
                <div class="field">
                  <div class="label">字体</div>
                  <select class="stpl-rec-title-font">${fontOptionsHtml}</select>
                </div>
                <div class="field">
                  <div class="label">字体大小</div>
                  <div class="stpl-range">
                    <input class="stpl-rec-title-font-size" type="range" min="18" max="160" step="1" value="${fs}" />
                    <input class="stpl-rec-title-font-size-text" type="text" value="${fs}" />
                  </div>
                </div>
              </div>
              <div class="grid cols-2" style="gap: 10px; margin-top: 10px">
                <div class="field">
                  <div class="label">文字颜色</div>
                  <div class="stpl-color">
                    <input class="stpl-rec-title-color" type="color" value="${color}" />
                    <input class="stpl-rec-title-color-text" type="text" value="${color}" />
                  </div>
                </div>
                <div class="field">
                  <div class="label">描边颜色</div>
                  <div class="stpl-color">
                    <input class="stpl-rec-title-ocolor" type="color" value="${outlineColor}" />
                    <input class="stpl-rec-title-ocolor-text" type="text" value="${outlineColor}" />
                  </div>
                </div>
              </div>
              <div class="grid cols-2" style="gap: 10px; margin-top: 10px">
                <div class="field">
                  <div class="label">描边宽度</div>
                  <div class="stpl-range">
                    <input class="stpl-rec-title-outline" type="range" min="0" max="12" step="1" value="${outline}" />
                    <input class="stpl-rec-title-outline-text" type="text" value="${outline}" />
                  </div>
                </div>
                <div class="field">
                  <div class="label">样式</div>
                  <div class="inline-flags">
                    <label class="chk"><input class="stpl-rec-title-bold" type="checkbox" ${bold ? "checked" : ""} /> 加粗</label>
                    <label class="chk"><input class="stpl-rec-title-shadow" type="checkbox" ${shadow ? "checked" : ""} /> 阴影</label>
                  </div>
                </div>
              </div>
            </div>
          </details>`;
        })
        .join("");
      Array.from(recTitleLineEditor.querySelectorAll(".stpl-line-body[data-rec-line-idx]")).forEach((bodyEl) => {
        const idx = Number(bodyEl.getAttribute("data-rec-line-idx") || -1);
        if (!Number.isFinite(idx) || idx < 0) return;
        const pick = (sel) => bodyEl.querySelector(sel);
        const fontSel = pick(".stpl-rec-title-font");
        const sizeRange = pick(".stpl-rec-title-font-size");
        const sizeText = pick(".stpl-rec-title-font-size-text");
        const colorInput = pick(".stpl-rec-title-color");
        const colorText = pick(".stpl-rec-title-color-text");
        const oColorInput = pick(".stpl-rec-title-ocolor");
        const oColorText = pick(".stpl-rec-title-ocolor-text");
        const oRange = pick(".stpl-rec-title-outline");
        const oText = pick(".stpl-rec-title-outline-text");
        const boldChk = pick(".stpl-rec-title-bold");
        const shadowChk = pick(".stpl-rec-title-shadow");
        const readCurrentLine = () => {
          const latestLines = Array.isArray(recognizeState.workingTemplate?.title?.lines) ? recognizeState.workingTemplate.title.lines : [];
          return latestLines[idx] && typeof latestLines[idx] === "object" ? latestLines[idx] : defaultLineStyle(idx);
        };
        const setFontValue = () => {
          const cur = readCurrentLine();
          const decoded = getFontLabel(cur.font);
          const encoded = encodeURIComponent(decoded);
          const exists = Array.from(fontSel.options || []).some((o) => o.value === encoded);
          fontSel.value = exists ? encoded : decoded;
        };
        const applyLine = (next) => {
          const cur = readCurrentLine();
          const nextLines = Array.isArray(recognizeState.workingTemplate?.title?.lines)
            ? recognizeState.workingTemplate.title.lines.map((item) => ({ ...(item && typeof item === "object" ? item : {}) }))
            : [];
          nextLines[idx] = { ...defaultLineStyle(idx), ...cur, ...next };
          applyRecognizeQuickPatch({ title: { lines: nextLines } }, { refreshEditors: false, groupKey: `rec-title-line-${idx}` });
        };
        setFontValue();
        fontSel?.addEventListener("change", () => applyLine({ font: String(fontSel.value || "Microsoft YaHei") }));
        sizeRange?.addEventListener("input", () => {
          const v = clamp(Number(sizeRange.value || 60) || 60, 18, 160);
          sizeRange.value = String(v);
          if (sizeText) sizeText.value = String(v);
          applyLine({ fontSize: v });
        });
        wireNumericText(sizeText, (raw) => {
          const v = clamp(Number(raw || 0) || 0, 18, 160);
          sizeText.value = String(v);
          if (sizeRange) sizeRange.value = String(v);
          applyLine({ fontSize: v });
        });
        const wireColor = (picker, text, key, fallback) => {
          const apply = (hex) => applyLine({ [key]: normalizeHex(hex, fallback) });
          picker?.addEventListener("input", () => {
            const v = normalizeHex(picker.value, fallback);
            picker.value = v;
            if (text) text.value = v;
            apply(v);
          });
          text?.addEventListener("input", () => {
            const v = normalizeHex(text.value, fallback);
            text.value = v;
            if (picker) picker.value = v;
            apply(v);
          });
        };
        wireColor(colorInput, colorText, "color", idx === 0 ? "#b30b08" : "#ffffff");
        wireColor(oColorInput, oColorText, "outlineColor", "#000000");
        oRange?.addEventListener("input", () => {
          const v = clamp(Number(oRange.value || 0) || 0, 0, 12);
          oRange.value = String(v);
          if (oText) oText.value = String(v);
          applyLine({ outline: v });
        });
        wireNumericText(oText, (raw) => {
          const v = clamp(Number(raw || 0) || 0, 0, 12);
          oText.value = String(v);
          if (oRange) oRange.value = String(v);
          applyLine({ outline: v });
        }, { allowDecimal: false });
        boldChk?.addEventListener("change", () => applyLine({ bold: boldChk.checked === true }));
        shadowChk?.addEventListener("change", () => applyLine({ shadow: shadowChk.checked === true }));
      });
    };

    const KEYWORD_CATS = ["重点词/成语词", "描述词", "行动词", "情感词"];
    const KEYWORD_SAMPLE_MAP = {
      "重点词/成语词": ["重点词"],
      描述词: ["描述词"],
      行动词: ["行动词"],
      情感词: ["情感词"]
    };
    const buildKeywordPreviewMap = (sourceMap, { useSampleFallback = false } = {}) => {
      const map = sourceMap && typeof sourceMap === "object" ? sourceMap : {};
      const next = {};
      KEYWORD_CATS.forEach((cat) => {
        const list = Array.isArray(map?.[cat]) ? map[cat].map((x) => String(x || "").trim()).filter(Boolean) : [];
        next[cat] = list.length ? list : (useSampleFallback ? KEYWORD_SAMPLE_MAP[cat].slice() : []);
      });
      return next;
    };
    const buildKeywordChipsHtml = (list) => {
      const arr = Array.isArray(list) ? list.map((x) => String(x || "").trim()).filter(Boolean) : [];
      if (!arr.length) return `<span class="pill">无</span>`;
      return arr.map((w) => `<span class="pill stpl-kw-chip">${escapeHtml(w)}</span>`).join("");
    };
    const buildKeywordFontOptionsHtml = () => {
      const base = [`<option value="Microsoft YaHei">Microsoft YaHei（系统）</option>`];
      base.push(...fonts.map((f) => `<option value="${encodeURIComponent(f.name)}">${f.name}</option>`));
      return base.join("");
    };
    const renderKeywordFxEditor = ({
      groupsWrapEl,
      editorWrapEl,
      keywordMap = {},
      readGroup,
      onApplyGroup,
      defaultOpenIndex = 0
    } = {}) => {
      if (!groupsWrapEl || !editorWrapEl || typeof readGroup !== "function" || typeof onApplyGroup !== "function") return;
      groupsWrapEl.innerHTML = KEYWORD_CATS
        .map((cat) => {
          const list = Array.isArray(keywordMap?.[cat]) ? keywordMap[cat] : [];
          return `<div class="stpl-kw-group">
            <div class="stpl-kw-head">
              <span class="stpl-kw-title">${escapeHtml(cat)}</span>
              <span class="pill">${String(list.length)}</span>
            </div>
            <div class="stpl-kw-chips">${buildKeywordChipsHtml(list)}</div>
          </div>`;
        })
        .join("");

      const fontOptionsHtml = buildKeywordFontOptionsHtml();
      editorWrapEl.innerHTML = KEYWORD_CATS
        .map((cat, idx) => {
          const s0 = readGroup(cat);
          const fs = clamp(Number(s0?.fontSize || 48) || 48, 10, 260);
          const color = normalizeHex(s0?.color, "#ffffff");
          const outlineColor = normalizeHex(s0?.outlineColor, "#000000");
          const outline = clamp(Number(s0?.outline || 4) || 0, 0, 12);
          const bold = s0?.bold !== false;
          const shadow = s0?.shadow !== false;
          const list = Array.isArray(keywordMap?.[cat]) ? keywordMap[cat] : [];
          return `<details class="stpl-kw-card" ${idx === defaultOpenIndex ? "open" : ""}>
            <summary class="stpl-kw-sum">
              <div class="stpl-kw-sum-left">
                <span class="pill">${escapeHtml(cat)}</span>
                <span class="pill">${String(list.length)} 词</span>
              </div>
              <span class="pill">展开</span>
            </summary>
            <div class="stpl-kw-body" data-kw-cat="${escapeHtml(cat)}">
              <div class="grid cols-2" style="gap: 10px">
                <div class="field">
                  <div class="label">字体</div>
                  <select class="stpl-kw-font">${fontOptionsHtml}</select>
                </div>
                <div class="field">
                  <div class="label">字体大小</div>
                  <div class="stpl-range">
                    <input class="stpl-kw-size" type="range" min="10" max="260" step="1" value="${fs}" />
                    <input class="stpl-kw-size-text" type="text" value="${fs}" />
                  </div>
                </div>
              </div>
              <div class="grid cols-2" style="gap: 10px; margin-top: 10px">
                <div class="field">
                  <div class="label">文字颜色</div>
                  <div class="stpl-color">
                    <input class="stpl-kw-color" type="color" value="${color}" />
                    <input class="stpl-kw-color-text" type="text" value="${color}" />
                  </div>
                </div>
                <div class="field">
                  <div class="label">描边颜色</div>
                  <div class="stpl-color">
                    <input class="stpl-kw-ocolor" type="color" value="${outlineColor}" />
                    <input class="stpl-kw-ocolor-text" type="text" value="${outlineColor}" />
                  </div>
                </div>
              </div>
              <div class="grid cols-2" style="gap: 10px; margin-top: 10px">
                <div class="field">
                  <div class="label">描边宽度</div>
                  <div class="stpl-range">
                    <input class="stpl-kw-outline" type="range" min="0" max="12" step="1" value="${outline}" />
                    <input class="stpl-kw-outline-text" type="text" value="${outline}" />
                  </div>
                </div>
                <div class="field">
                  <div class="label">样式</div>
                  <div class="inline-flags">
                    <label class="chk"><input class="stpl-kw-bold" type="checkbox" ${bold ? "checked" : ""} /> 加粗</label>
                    <label class="chk"><input class="stpl-kw-shadow" type="checkbox" ${shadow ? "checked" : ""} /> 阴影</label>
                  </div>
                </div>
              </div>
            </div>
          </details>`;
        })
        .join("");

      Array.from(editorWrapEl.querySelectorAll(".stpl-kw-body[data-kw-cat]")).forEach((bodyEl) => {
        const cat = String(bodyEl.getAttribute("data-kw-cat") || "");
        if (!cat) return;
        const readCurrentGroup = () => readGroup(cat);
        const pick = (sel) => bodyEl.querySelector(sel);
        const fontSel = pick(".stpl-kw-font");
        const sizeRange = pick(".stpl-kw-size");
        const sizeText = pick(".stpl-kw-size-text");
        const colorInput = pick(".stpl-kw-color");
        const colorText = pick(".stpl-kw-color-text");
        const oColorInput = pick(".stpl-kw-ocolor");
        const oColorText = pick(".stpl-kw-ocolor-text");
        const oRange = pick(".stpl-kw-outline");
        const oText = pick(".stpl-kw-outline-text");
        const boldChk = pick(".stpl-kw-bold");
        const shadowChk = pick(".stpl-kw-shadow");

        const setFontValue = () => {
          const cur = readCurrentGroup();
          const decoded = getFontLabel(cur.font);
          const encoded = encodeURIComponent(decoded);
          const exists = Array.from(fontSel.options || []).some((o) => o.value === encoded);
          fontSel.value = exists ? encoded : decoded;
        };
        const applyGroup = (next) => {
          onApplyGroup(cat, { ...readCurrentGroup(), ...next });
        };
        setFontValue();

        fontSel?.addEventListener("change", () => applyGroup({ font: String(fontSel.value || "Microsoft YaHei") }));
        sizeRange?.addEventListener("input", () => {
          const v = clamp(Number(sizeRange.value || 48) || 48, 10, 260);
          sizeRange.value = String(v);
          if (sizeText) sizeText.value = String(v);
          applyGroup({ fontSize: v });
        });
        wireNumericText(sizeText, (raw) => {
          const v = clamp(Number(raw || 0) || 0, 10, 260);
          sizeText.value = String(v);
          if (sizeRange) sizeRange.value = String(v);
          applyGroup({ fontSize: v });
        });

        const wireColor = (picker, text, key, fallback) => {
          const apply = (hex) => applyGroup({ [key]: normalizeHex(hex, fallback) });
          picker?.addEventListener("input", () => {
            const v = normalizeHex(picker.value, fallback);
            picker.value = v;
            if (text) text.value = v;
            apply(v);
          });
          text?.addEventListener("input", () => {
            const v = normalizeHex(text.value, fallback);
            text.value = v;
            if (picker) picker.value = v;
            apply(v);
          });
        };
        wireColor(colorInput, colorText, "color", "#ffffff");
        wireColor(oColorInput, oColorText, "outlineColor", "#000000");

        oRange?.addEventListener("input", () => {
          const v = clamp(Number(oRange.value || 0) || 0, 0, 12);
          oRange.value = String(v);
          if (oText) oText.value = String(v);
          applyGroup({ outline: v });
        });
        wireNumericText(oText, (raw) => {
          const v = clamp(Number(raw || 0) || 0, 0, 12);
          oText.value = String(v);
          if (oRange) oRange.value = String(v);
          applyGroup({ outline: v });
        }, { allowDecimal: false });
        boldChk?.addEventListener("change", () => applyGroup({ bold: boldChk.checked === true }));
        shadowChk?.addEventListener("change", () => applyGroup({ shadow: shadowChk.checked === true }));
      });
    };

    let lastRecognizePreviewTitleKey = "";
    let lastRecognizePreviewBodyKey = "";
    const applyRecognizePreviewLayout = () => {
      if (!recPreviewStage) return;
      const tpl = recognizeState.workingTemplate;
      if (!tpl) return;
      const titleEl = recPreviewStage.querySelector('[data-drag-role="title"]');
      const bodyEl = recPreviewStage.querySelector('[data-drag-role="body"]');
      if (!titleEl || !bodyEl) return;
      const base = tpl.baseRes && typeof tpl.baseRes === "object" ? tpl.baseRes : { w: 1080, h: 1920 };
      const bw = clamp(Number(base.w || 1080) || 1080, 240, 99999);
      const bh = clamp(Number(base.h || 1920) || 1920, 240, 99999);
      const ph = clamp(Number(recPreviewStage.clientHeight || 0) || 0, 1, 99999);
      const scale = ph > 0 ? ph / bh : 1;
      const previewTexts = buildRecognizePreviewTexts(tpl, getRecognizeSelectedItem());
      const title = tpl.title || {};
      const body = tpl.body || {};
      const titleBg = title.background && typeof title.background === "object" ? title.background : defaultTitleBackground();
      const titleOffsetXPx = Math.round((clamp(Number(title.offsetXPct || 0) || 0, -40, 40) / 100) * bw * scale);
      const titleOffsetYPx = Math.round((clamp(Number(title.offsetYPct || 0) || 0, -40, 40) / 100) * bh * scale);
      const bodyOffsetXPx = Math.round((clamp(Number(body.offsetXPct || 0) || 0, -40, 40) / 100) * bw * scale);
      const bodyOffsetYPx = Math.round((clamp(Number(body.offsetYPct || 0) || 0, -40, 40) / 100) * bh * scale);
      recPreviewStage.style.backgroundImage = previewTexts.backgroundImage
        ? `linear-gradient(180deg, rgba(0,0,0,0.06), rgba(0,0,0,0.10)), url("${previewTexts.backgroundImage}")`
        : "linear-gradient(135deg, rgba(245, 232, 210, 0.98), rgba(210, 188, 160, 0.98))";
      recPreviewStage.style.backgroundSize = "cover";
      recPreviewStage.style.backgroundPosition = "center center";
      recPreviewStage.style.backgroundRepeat = "no-repeat";

      const nextTitleKey = JSON.stringify({
        titleLines: previewTexts.titleLines,
        title,
        titleBg,
        scale,
        bw,
        bh,
        titleOffsetXPx,
        titleOffsetYPx
      });
      if (nextTitleKey !== lastRecognizePreviewTitleKey) {
        const lineEls = Array.from(titleEl.querySelectorAll("[data-title-line-idx]"));
        previewTexts.titleLines.forEach((line, idx) => {
          const el = lineEls[idx];
          const wrap = el?.closest?.(".stpl-title-line");
          if (!el || !wrap) return;
          wrap.style.display = "";
          const style = Array.isArray(title.lines) ? title.lines[idx] || defaultLineStyle(idx) : defaultLineStyle(idx);
          const fs = clamp(Number(style.fontSize || (idx === 0 ? 64 : 56)) || 60, 10, 260) * scale;
          const c = normalizeHex(style.color, idx === 0 ? "#b30b08" : "#ffffff");
          const oc = normalizeHex(style.outlineColor, "#000000");
          const o = clamp(Number(style.outline || 4) || 0, 0, 30) * scale;
          const bgStyle =
            titleBg.enable === true
              ? `background:${hexToRgba(titleBg.color || "#202020", titleBg.alpha ?? 0.82)};border-radius:${Math.round(
                  clamp(titleBg.radius || 16, 0, 60) * scale
                )}px;padding:${Math.round(clamp(titleBg.paddingY || 10, 0, 80) * scale)}px ${Math.round(
                  clamp(titleBg.paddingX || 22, 0, 140) * scale
                )}px;`
              : "";
          el.style.cssText = [
            bgStyle,
            `font-family:${buildTemplateFontCss(style.font || "Microsoft YaHei")}`,
            `font-size:${Math.round(fs)}px`,
            `font-weight:${style.bold !== false ? 900 : 700}`,
            `color:${c}`,
            `text-shadow:${buildPreviewTextShadow(o, oc, style.shadow !== false)}`,
            `line-height:1.05`,
            `letter-spacing:${Math.round(clamp(Number(title.letterSpacing || 0) || 0, 0, 20) * scale)}px`
          ].join(";");
          el.textContent = line || " ";
        });
        for (let i = previewTexts.titleLines.length; i < lineEls.length; i += 1) {
          const el = lineEls[i];
          const wrap = el?.closest?.(".stpl-title-line");
          if (!el || !wrap) continue;
          wrap.style.display = "none";
          el.textContent = "";
        }
        titleEl.style.top = `${Math.round((clamp(Number(title.topMarginPct || 10) || 10, 0, 30) / 100) * bh * scale) + titleOffsetYPx}px`;
        titleEl.style.left = `calc(50% + ${titleOffsetXPx}px)`;
        titleEl.style.transform = "translateX(-50%)";
        titleEl.style.gap = `${Math.round((clamp(Number(title.lineGapPct || 5) || 5, 0, 30) / 100) * bh * scale)}px`;
        lastRecognizePreviewTitleKey = nextTitleKey;
      }

      const nextBodyKey = JSON.stringify({
        bodyLines: previewTexts.bodyLines,
        body,
        keywordFx: tpl.keywordFx,
        scale,
        bw,
        bh,
        bodyOffsetXPx,
        bodyOffsetYPx
      });
      if (nextBodyKey !== lastRecognizePreviewBodyKey) {
        const bodyMarginPx = Math.round((clamp(Number(body.marginVPct || 34) || 34, 0, 60) / 100) * bh * scale);
        bodyEl.style.left = `calc(50% + ${bodyOffsetXPx}px)`;
        bodyEl.style.width = "92%";
        bodyEl.style.display = "grid";
        bodyEl.style.justifyItems = "center";
        bodyEl.style.gap = `${Math.round((clamp(Number(body.lineGapPct || 4) || 4, 0, 30) / 100) * bh * scale)}px`;
        bodyEl.style.letterSpacing = `${Math.round(clamp(Number(body.letterSpacing || 0) || 0, 0, 20) * scale)}px`;
        bodyEl.style.top = "auto";
        bodyEl.style.bottom = "auto";
        bodyEl.style.transform = "translateX(-50%)";
        if (String(body.pos || "bottom") === "top") bodyEl.style.top = `${bodyMarginPx + bodyOffsetYPx}px`;
        else if (String(body.pos || "bottom") === "middle") {
          bodyEl.style.top = `calc(50% + ${bodyOffsetYPx}px)`;
          bodyEl.style.transform = "translate(-50%, -50%)";
        } else bodyEl.style.bottom = `${bodyMarginPx - bodyOffsetYPx}px`;

        const bodyLineEls = Array.from(bodyEl.querySelectorAll("[data-body-line-idx]"));
        previewTexts.bodyLines.forEach((line, idx) => {
          const el = bodyLineEls[idx];
          if (!el) return;
          el.style.display = "";
          const base = defaultBodyLineStyle(idx, body);
          const override = Array.isArray(body.lines) && body.lines[idx] && typeof body.lines[idx] === "object" ? body.lines[idx] : {};
          const cur = { ...base, ...override };
          const fs = clamp(Number(cur.fontSize || 44) || 44, 10, 200) * scale;
          const c = normalizeHex(cur.color, normalizeHex(body.color, "#ffffff"));
          const oc = normalizeHex(cur.outlineColor, normalizeHex(body.outlineColor, "#000000"));
          const o = clamp(Number(cur.outline || 3) || 0, 0, 24) * scale;
          el.style.cssText = [
            `font-family:${buildTemplateFontCss(cur.font || body.font || "Microsoft YaHei")}`,
            `font-size:${Math.round(fs)}px`,
            `font-weight:${cur.bold !== false ? 900 : 700}`,
            `color:${c}`,
            `text-shadow:${buildPreviewTextShadow(o, oc, cur.shadow !== false)}`,
            `line-height:1`
          ].join(";");
          el.innerHTML = buildKeywordPreviewHtml(line, tpl.keywordFx, scale);
        });
        for (let i = previewTexts.bodyLines.length; i < bodyLineEls.length; i += 1) {
          const el = bodyLineEls[i];
          if (!el) continue;
          el.style.display = "none";
          el.innerHTML = "";
        }
        lastRecognizePreviewBodyKey = nextBodyKey;
      }
      if (recPreviewHint) recPreviewHint.textContent = "可直接拖动右侧预览里的标题或正文，手动校准位置。";
    };

    const ensureRecognizePreviewMounted = () => {
      if (!recPreviewStage) return;
      const hasTitle = recPreviewStage.querySelector('[data-drag-role="title"]');
      const hasBody = recPreviewStage.querySelector('[data-drag-role="body"]');
      if (hasTitle && hasBody) return;
      recPreviewStage.innerHTML = `
        <div class="stpl-rec-drag-tip">拖动标题或正文可直接调整位置</div>
        <div class="stpl-title stpl-rec-draggable" data-drag-role="title">
          <div class="stpl-title-line"><span class="stpl-rec-title-line-fill" data-title-line-idx="0"></span></div>
          <div class="stpl-title-line"><span class="stpl-rec-title-line-fill" data-title-line-idx="1"></span></div>
          <div class="stpl-title-line"><span class="stpl-rec-title-line-fill" data-title-line-idx="2"></span></div>
        </div>
        <div class="stpl-sub stpl-rec-draggable" data-drag-role="body">
          <div data-body-line-idx="0"></div>
          <div data-body-line-idx="1"></div>
          <div data-body-line-idx="2"></div>
        </div>
      `;
      lastRecognizePreviewTitleKey = "";
      lastRecognizePreviewBodyKey = "";
    };

    const syncRecognizeFocusStyles = () => {
      if (!recPreviewStage) return;
      const role = String(recognizeState.focusRole || "");
      Array.from(recPreviewStage.querySelectorAll('.stpl-rec-draggable[data-drag-role]')).forEach((el) => {
        const r = String(el.getAttribute("data-drag-role") || "");
        el.classList.toggle("is-selected", role && r === role);
      });
      const titleIdx = Number(recognizeState.focusTitleLineIdx || 0);
      const bodyIdx = Number(recognizeState.focusBodyLineIdx || 0);
      Array.from(recPreviewStage.querySelectorAll("[data-title-line-idx]")).forEach((el) => {
        const idx = Number(el.getAttribute("data-title-line-idx") || -1);
        el.classList.toggle("is-line-selected", role === "title" && idx === titleIdx);
      });
      Array.from(recPreviewStage.querySelectorAll("[data-body-line-idx]")).forEach((el) => {
        const idx = Number(el.getAttribute("data-body-line-idx") || -1);
        el.classList.toggle("is-line-selected", role === "body" && idx === bodyIdx);
      });
    };

    const focusRecognizeTitleLineEditor = (idx) => {
      if (!recTitleLineEditor) return;
      const bodyEl = recTitleLineEditor.querySelector(`.stpl-line-body[data-rec-line-idx="${idx}"]`);
      const card = bodyEl?.closest?.("details");
      if (card) card.open = true;
      try {
        card?.scrollIntoView?.({ block: "nearest" });
      } catch {}
    };

    const focusRecognizeBodyLineEditor = (idx) => {
      if (!recBodyLineEditor) return;
      const bodyEl = recBodyLineEditor.querySelector(`.stpl-line-body[data-rec-body-line-idx="${idx}"]`);
      const card = bodyEl?.closest?.("details");
      if (card) card.open = true;
      try {
        card?.scrollIntoView?.({ block: "nearest" });
      } catch {}
    };

    const renderRecognizePreview = () => {
      if (!recPreviewStage) return;
      const tpl = recognizeState.workingTemplate;
      if (!tpl) {
        recPreviewStage.style.backgroundImage = "";
        recPreviewStage.innerHTML = `<div class="empty">识别后这里会生成实时预览。</div>`;
        if (recPreviewHint) recPreviewHint.textContent = "识别后会实时生成模板预览";
        return;
      }
      ensureRecognizePreviewMounted();
      applyRecognizePreviewLayout();
      syncRecognizeFocusStyles();
    };

    const renderRecognizeReference = () => {
      if (!recRefStage || !recRefName) return;
      const selected = getRecognizeSelectedItem();
      if (!selected) {
        recRefName.textContent = "未选择图片";
        recRefStage.innerHTML = `<div class="empty">上传图片后，可在这里对比任意一张参考截图。</div>`;
        return;
      }
      recRefName.textContent = String(selected.name || "参考图");
      recRefStage.innerHTML = `<img src="${escapeHtml(selected.dataUrl || "")}" alt="${escapeHtml(selected.name || "参考图")}" />`;
    };

    const renderRecognizeSummary = () => {
      if (!recSummary) return;
      const summary = recognizeState.summary;
      if (!summary) {
        recSummary.innerHTML = `<span class="pill">等待识别</span>`;
        return;
      }
      const pills = [
        `<span class="pill">参考图 ${Number(summary.imageCount || 0)} 张</span>`,
        `<span class="pill">识别到标题 ${Number(summary.titleDetectedCount || 0)} 张</span>`,
        `<span class="pill">正文位置：${escapeHtml(String(summary.bodyPos || "bottom"))}</span>`,
        `<span class="pill">标题背景：${summary.titleBgEnabled ? "已识别" : "未识别"}</span>`
      ];
      const accentColors = Array.isArray(summary.accentColors) ? summary.accentColors : [];
      accentColors.forEach((color) => {
        const hex = normalizeHex(color, "#f59e0b");
        pills.push(`<span class="pill"><span class="stpl-rec-color-dot" style="background:${hex}"></span>${hex}</span>`);
      });
      recSummary.innerHTML = pills.join("");
    };

    const renderRecognizeThumbs = () => {
      if (!recThumbs) return;
      if (!recognizeState.items.length) {
        recThumbs.innerHTML = `<div class="empty">当前还没有参考截图。</div>`;
        return;
      }
      recThumbs.innerHTML = recognizeState.items
        .map((item, idx) => {
          const activeCls = String(item?.id || "") === String(recognizeState.selectedId || "") ? " is-active" : "";
          return `
            <button class="stpl-rec-thumb${activeCls}" type="button" data-rec-id="${escapeHtml(String(item?.id || ""))}">
              <span class="stpl-rec-thumb-img">${item?.dataUrl ? `<img src="${escapeHtml(item.dataUrl)}" alt="${escapeHtml(item?.name || `参考图${idx + 1}`)}" />` : ""}</span>
              <span class="stpl-rec-thumb-name">${escapeHtml(String(item?.name || `参考图${idx + 1}`))}</span>
            </button>
          `;
        })
        .join("");
      Array.from(recThumbs.querySelectorAll(".stpl-rec-thumb[data-rec-id]")).forEach((btn) => {
        btn.addEventListener("click", () => {
          recognizeState.selectedId = String(btn.getAttribute("data-rec-id") || "");
          renderRecognizeThumbs();
          renderRecognizeReference();
          renderRecognizePreview();
        });
      });
    };

    const renderRecognizeModal = () => {
      if (!recModal) return;
      recModal.hidden = recognizeState.visible !== true;
      if (recCount) {
        recCount.textContent = recognizeState.items.length
          ? `已上传 ${recognizeState.items.length} 张参考图`
          : "请先上传 1-9 张参考图";
      }
      if (recRun) recRun.disabled = recognizeState.items.length < 1 || recognizeState.analyzing === true;
      if (recApply) recApply.disabled = !recognizeState.workingTemplate || !recognizeState.summary;
      syncRecognizeNameInput();
      if (recCreate) recCreate.disabled = !recognizeState.workingTemplate || !String(recognizeState.newTemplateName || "").trim();
      setRecognizeSection(recognizeState.activeSec || "base");
      syncRecognizeControlsFromTemplate();
      renderRecognizeTitleLinesPreview();
      renderRecognizeBodyLinesPreview();
      renderRecognizeTitleLineEditors();
      renderRecognizeBodyLineEditors();
      renderRecognizeKeywordFxUi();
      renderRecognizeThumbs();
      renderRecognizeReference();
      renderRecognizeSummary();
      renderRecognizePreview();
    };

    const openRecognizeModal = () => {
      recognizeState.visible = true;
      if (!recognizeState.workingTemplate) {
        recognizeState.workingTemplate = normalizeTemplateShape(cloneTemplate(active || defaultTemplate()));
        syncRecognizeControlsFromTemplate();
      }
      recognizeState.activeSec = "base";
      recognizeState.focusRole = "";
      recognizeState.focusTitleLineIdx = 0;
      recognizeState.focusBodyLineIdx = 0;
      recognizeState.newTemplateName = buildRecognizeTemplateName(active?.name || recognizeState.workingTemplate?.name || "");
      resetRecognizeHistory();
      renderRecognizeModal();
    };

    const closeRecognizeModal = () => {
      recognizeState.visible = false;
      renderRecognizeModal();
    };

    const applyRecognizeQuickPatch = (patch, { refreshEditors = false, groupKey = "", trackHistory = true } = {}) => {
      if (!recognizeState.workingTemplate) {
        recognizeState.workingTemplate = normalizeTemplateShape(cloneTemplate(active || defaultTemplate()));
      }
      const prev = trackHistory ? cloneTemplate(recognizeState.workingTemplate) : null;
      recognizeState.workingTemplate = normalizeTemplateShape(mergeTemplatePatch(recognizeState.workingTemplate, patch || {}));
      if (trackHistory) {
        recognizeHistory.record(prev, cloneTemplate(recognizeState.workingTemplate), { groupKey: String(groupKey || "rec-patch") });
      }
      syncRecognizeControlsFromTemplate();
      renderRecognizeTitleLinesPreview();
      renderRecognizeBodyLinesPreview();
      if (refreshEditors) {
        renderRecognizeTitleLineEditors();
        renderRecognizeBodyLineEditors();
      }
      renderRecognizeKeywordFxUi();
      renderRecognizePreview();
      if (recApply) recApply.disabled = !recognizeState.summary;
    };

    const renderTemplateCoverMeta = () => {
      if (!stplCoverThumb || !stplCoverStatus) return;
      if (!active) {
        stplCoverThumb.innerHTML = "";
        stplCoverStatus.textContent = "未选择模板。";
        return;
      }
      const previewUrl = getSubtitleCardPreview(active);
      stplCoverThumb.innerHTML = previewUrl ? `<img src="${escapeHtml(previewUrl)}" alt="模板封面预览" />` : "";
      const hasCustomCover = !!String(active.previewCover || "").trim();
      const hasBg = !!String(active.previewBackground || "").trim();
      stplCoverStatus.textContent = hasCustomCover
        ? hasBg
          ? "已保存模板封面，且已设置模板底图。首页模板选择会直接显示这张封面。"
          : "已保存模板封面。首页模板选择会直接显示这张封面。"
        : hasBg
          ? "已设置模板底图，当前会按模板参数实时生成选择卡片。"
          : "未设置模板封面，将使用当前模板实时生成预览。";
    };

    const applyPreview = () => {
      if (!active) return;
      const body = active.body || {};
      const title = active.title || {};
      const keywordFx = active.keywordFx || {};
      const base = active.baseRes && typeof active.baseRes === "object" ? active.baseRes : { w: 1080, h: 1920 };
      const bw = clamp(Number(base.w || 1080) || 1080, 240, 99999);
      const bh = clamp(Number(base.h || 1920) || 1920, 240, 99999);
      const ph = clamp(Number(previewBox?.clientHeight || 0) || 0, 1, 99999);
      const scale = ph > 0 ? ph / bh : 1;

      const buildTextShadow = (outlinePx, outlineColor, withShadow) => {
        const o = Math.max(0, Math.round(outlinePx || 0));
        const oc = normalizeHex(outlineColor, "#000000");
        const ss = [];
        if (o > 0) {
          ss.push(`-${o}px 0 0 ${oc}`, `${o}px 0 0 ${oc}`, `0 -${o}px 0 ${oc}`, `0 ${o}px 0 ${oc}`);
          ss.push(`-${o}px -${o}px 0 ${oc}`, `${o}px -${o}px 0 ${oc}`, `-${o}px ${o}px 0 ${oc}`, `${o}px ${o}px 0 ${oc}`);
        }
        if (withShadow) ss.push(`0 ${Math.round(6 * scale)}px ${Math.round(12 * scale)}px rgba(0,0,0,0.35)`);
        return ss.join(",");
      };

      const renderKeywordPreviewHtml = (rawText) => {
        if (!keywordFx || keywordFx.enable !== true) return escapeHtml(rawText);
        const groups = keywordFx?.groups && typeof keywordFx.groups === "object" ? keywordFx.groups : {};
        const catOrder = ["重点词/成语词", "描述词", "行动词", "情感词"];

        const renderStyle = (s) => {
          const fs = clamp(Number(s?.fontSize || 48) || 48, 10, 260) * scale;
          const bold = s?.bold !== false;
          const shadow = s?.shadow !== false;
          const color = normalizeHex(s?.color, "#ffffff");
          const oc = normalizeHex(s?.outlineColor, "#000000");
          const outline = clamp(Number(s?.outline || 4) || 0, 0, 30) * scale;
          const css = [
            `font-family:${buildTemplateFontCss(s?.font || "Microsoft YaHei")}`,
            `font-size:${Math.round(fs)}px`,
            `font-weight:${bold ? 900 : 700}`,
            `color:${color}`,
            `text-shadow:${buildTextShadow(outline, oc, shadow)}`
          ].join(";");
          return css;
        };
        const parts = [`<span>${escapeHtml(rawText)}</span>`];
        const catLabels = {
          "重点词/成语词": "重点词",
          描述词: "描述词",
          行动词: "行动词",
          情感词: "情感词"
        };
        catOrder.forEach((cat) => {
          const style = groups?.[cat];
          if (!style) return;
          parts.push(`<span style="${renderStyle(style)}">${escapeHtml(catLabels[cat] || cat)}</span>`);
        });
        return parts.join(" ");
      };

      const bodySize = clamp(Number(body.fontSize || 44) || 44, 10, 200) * scale;
      const bodyColor = normalizeHex(body.color, "#ffffff");
      const bodyOutlineColor = normalizeHex(body.outlineColor, "#000000");
      const bodyOutline = clamp(Number(body.outline || 3) || 0, 0, 24) * scale;
      const bodyBold = body.bold !== false;
      const bodyShadow = body.shadow !== false;
      const bodyPos = String(body.pos || "bottom");
      const bodyMarginPct = clamp(Number(body.marginVPct || 34) || 34, 0, 60);
      const bodyOffsetXPx = Math.round((clamp(Number(body.offsetXPct || 0) || 0, -40, 40) / 100) * bw * scale);
      const bodyOffsetYPx = Math.round((clamp(Number(body.offsetYPct || 0) || 0, -40, 40) / 100) * bh * scale);
      const bodyGapPx = Math.round((clamp(Number(body.lineGapPct || 4) || 4, 0, 30) / 100) * bh * scale);
      const bodyLetterSpacingPx = Math.round(clamp(Number(body.letterSpacing || 0) || 0, 0, 20) * scale);
      const titleBg = title.background && typeof title.background === "object" ? title.background : defaultTitleBackground();
      const titleOffsetXPx = Math.round((clamp(Number(title.offsetXPct || 0) || 0, -40, 40) / 100) * bw * scale);
      const titleOffsetYPx = Math.round((clamp(Number(title.offsetYPct || 0) || 0, -40, 40) / 100) * bh * scale);

      if (previewBox) {
        const bgUrl = String(active.previewBackground || "").trim();
        previewBox.style.backgroundImage = bgUrl
          ? `linear-gradient(180deg, rgba(0,0,0,0.06), rgba(0,0,0,0.10)), url("${bgUrl}")`
          : "linear-gradient(135deg, rgba(245, 232, 210, 0.98), rgba(210, 188, 160, 0.98))";
        previewBox.style.backgroundSize = bgUrl ? "cover" : "";
        previewBox.style.backgroundPosition = bgUrl ? "center center" : "";
      }

      previewSub.style.fontFamily = buildTemplateFontCss(body.font);
      previewSub.style.fontSize = `${Math.round(bodySize)}px`;
      previewSub.style.fontWeight = bodyBold ? "900" : "600";
      previewSub.style.color = bodyColor;
      previewSub.style.left = `calc(50% + ${bodyOffsetXPx}px)`;
      previewSub.style.right = "auto";
      previewSub.style.width = "92%";
      previewSub.style.textShadow = buildTextShadow(bodyOutline, bodyOutlineColor, bodyShadow);
      previewSub.style.display = "grid";
      previewSub.style.justifyItems = "center";
      previewSub.style.gap = `${bodyGapPx}px`;
      previewSub.style.lineHeight = "1";
      previewSub.style.letterSpacing = `${bodyLetterSpacingPx}px`;
      previewSub.style.top = "auto";
      previewSub.style.bottom = "auto";
      previewSub.style.transform = "translateX(-50%)";

      const marginPx = Math.round((bodyMarginPct / 100) * bh * scale);
      if (bodyPos === "top") previewSub.style.top = `${marginPx + bodyOffsetYPx}px`;
      else if (bodyPos === "middle") {
        previewSub.style.top = `calc(50% + ${bodyOffsetYPx}px)`;
        previewSub.style.transform = "translate(-50%, -50%)";
      } else previewSub.style.bottom = `${marginPx - bodyOffsetYPx}px`;

      previewSub.innerHTML = computeBodyLines(active).map((line) => `<div>${renderKeywordPreviewHtml(line)}</div>`).join("");

      const titleOn = title.enable !== false && String(title.text || "").trim();
      if (!titleOn) {
        previewTitle.hidden = true;
        previewTitle.innerHTML = "";
        renderTemplateCoverMeta();
        return;
      }

      const lines = computeTitleLines(active);
      previewTitle.hidden = false;
      previewTitle.innerHTML = lines
        .map((ln, idx) => {
          const s = Array.isArray(title.lines) ? title.lines[idx] || defaultLineStyle(idx) : defaultLineStyle(idx);
          const fs = clamp(Number(s.fontSize || 60) || 60, 10, 260) * scale;
          const c = normalizeHex(s.color, "#ffffff");
          const oc = normalizeHex(s.outlineColor, "#000000");
          const o = clamp(Number(s.outline || 4) || 0, 0, 30) * scale;
          const b = s.bold !== false;
          const sh = s.shadow !== false;
          const style = [
            `font-family:${buildTemplateFontCss(s.font)}`,
            `font-size:${Math.round(fs)}px`,
            `font-weight:${b ? 900 : 700}`,
            `color:${c}`,
            `text-shadow:${buildTextShadow(o, oc, sh)}`,
            `line-height:1.05`,
            `letter-spacing:${Math.round(clamp(Number(title.letterSpacing || 0) || 0, 0, 20) * scale)}px`
          ].join(";");
          const bgStyle =
            titleBg.enable === true
              ? [
                  `background:${hexToRgba(titleBg.color || "#202020", titleBg.alpha ?? 0.82)}`,
                  `border-radius:${Math.round(clamp(titleBg.radius || 16, 0, 60) * scale)}px`,
                  `padding:${Math.round(clamp(titleBg.paddingY || 10, 0, 80) * scale)}px ${Math.round(
                    clamp(titleBg.paddingX || 22, 0, 140) * scale
                  )}px`
                ].join(";")
              : "";
          const t = ln || " ";
          return `<div class="stpl-title-line"><span class="stpl-title-line-fill" style="${bgStyle};${style}">${escapeHtml(t)}</span></div>`;
        })
        .join("");

      const topPct = clamp(Number(title.topMarginPct || 10) || 10, 0, 30);
      const gapPct = clamp(Number(title.lineGapPct || 5) || 5, 0, 30);
      previewTitle.style.left = `calc(50% + ${titleOffsetXPx}px)`;
      previewTitle.style.transform = "translateX(-50%)";
      previewTitle.style.top = `${Math.round((topPct / 100) * bh * scale) + titleOffsetYPx}px`;
      previewTitle.style.gap = `${Math.round((gapPct / 100) * bh * scale)}px`;
      renderTemplateCoverMeta();
    };

    const escapeHtml = (s) =>
      String(s || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");

    const renderList = () => {
      const { templates } = state;
      if (stplCount) stplCount.textContent = String(templates.length);
      const { systemTemplates, cloudTemplates, localTemplates } = splitTemplatesBySource(templates);
      const groups = [
        { title: "系统模板", items: systemTemplates, emptyText: "" },
        { title: "云端模板", items: cloudTemplates, emptyText: "当前暂无云端模板" },
        { title: "本地模板", items: localTemplates, emptyText: "当前暂无本地模板" }
      ];
      stplList.innerHTML = groups
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
              const thumb = getSubtitleCardPreview(t);
              const sourceText = getTemplateSource(t) === "cloud" ? "云端同步" : getTemplateSource(t) === "system" ? "系统默认" : "本地保存";
              return `<button class="stpl-item${activeCls}" type="button" data-id="${escapeHtml(id)}">
                <div class="stpl-item-thumb">${thumb ? `<img src="${escapeHtml(thumb)}" alt="${escapeHtml(name)}" />` : ""}</div>
                <div class="stpl-item-title">${escapeHtml(name)}</div>
                <div class="stpl-item-sub">${escapeHtml(sourceText)} · ${escapeHtml(recordId)}</div>
              </button>`;
            })
            .join("");
          return `<div class="field" style="margin-bottom:10px">
            <div class="card-actions" style="justify-content:space-between;margin-bottom:8px">
              <span class="label">${group.title}</span>
              <span class="pill">${String(group.items.length)}</span>
            </div>
            <div class="stpl-item-grid">${cards}</div>
          </div>`;
        })
        .join("");

      Array.from(stplList.querySelectorAll(".stpl-item[data-id]")).forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.getAttribute("data-id");
          if (!id) return;
          selectTemplate(id);
        });
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

    const renderEditor = () => {
      if (!active) {
        stplDup.disabled = true;
        stplDel.disabled = true;
        stplSave.disabled = true;
        if (activeIdPill) activeIdPill.textContent = "未选择模板";
        if (activeUpdatedPill) activeUpdatedPill.textContent = "—";
        return;
      }
      active = normalizeTemplateShape(active);
      const activeIndex = state.templates.findIndex((t) => String(t?.id || "") === String(active?.id || ""));
      if (activeIndex >= 0) state.templates[activeIndex] = active;

      stplDup.disabled = false;
      stplDel.disabled = active.id === "system" || (getTemplateSource(active) === "cloud" && !canUploadTemplateByIdentity());
      stplSave.disabled = !dirty || (getTemplateSource(active) === "cloud" && !canUploadTemplateByIdentity());
      stplSave.textContent = getTemplateSource(active) === "cloud" ? "保存云端" : "保存";
      stplDel.textContent = getTemplateSource(active) === "cloud" ? "删除云端" : "删除";

      if (activeIdPill) activeIdPill.textContent = `ID：${getTemplateRecordId(active) || active.id}｜${getTemplateSource(active) === "cloud" ? "云端模板" : getTemplateSource(active) === "system" ? "系统模板" : "本地模板"}`;
      if (activeUpdatedPill) activeUpdatedPill.textContent = `更新：${fmtDate(active.updatedAt)}`;
      if (stplPreviewHint) {
        stplPreviewHint.textContent =
          getTemplateSource(active) === "cloud" ? "当前为云端模板，超级管理员可直接覆盖上传或删除云端模板；普通用户可复制后另存为本地。" : "拖动参数即可实时刷新";
      }

      stplName.value = String(active.name || "");
      if (!active.baseRes || typeof active.baseRes !== "object") active.baseRes = { w: 1080, h: 1920 };
      if (!active.keywordFx || typeof active.keywordFx !== "object") active.keywordFx = defaultTemplate().keywordFx;
      const b = active.body || {};
      const t = active.title || {};
      const br = active.baseRes || { w: 1080, h: 1920 };

      const bw = clamp(Number(br.w || 1080) || 1080, 240, 99999);
      const bh = clamp(Number(br.h || 1920) || 1920, 240, 99999);
      if (baseW) baseW.value = String(bw);
      if (baseH) baseH.value = String(bh);
      if (baseRes) {
        const key = `${bw}x${bh}`;
        const known = ["1080x1920", "720x1280", "1080x1440", "1080x1350"];
        baseRes.value = known.includes(key) ? key : "custom";
      }
      if (kwEnable) kwEnable.checked = active.keywordFx?.enable === true;

      const markPos = (pos) => {
        Array.from(subPos.querySelectorAll(".seg-tab")).forEach((x) => x.classList.toggle("is-active", x.getAttribute("data-pos") === pos));
      };
      markPos(String(b.pos || "bottom"));

      subSize.value = String(clamp(Number(b.fontSize || 44) || 44, 18, 96));
      subSizeText.value = String(subSize.value);
      subBold.checked = b.bold !== false;
      subShadow.checked = b.shadow !== false;

      subColor.value = normalizeHex(b.color, "#ffffff");
      subColorText.value = subColor.value;
      subOutlineColor.value = normalizeHex(b.outlineColor, "#000000");
      subOutlineColorText.value = subOutlineColor.value;
      subOutline.value = String(clamp(Number(b.outline || 3) || 3, 0, 8));
      subOutlineText.value = String(subOutline.value);
      subMargin.value = String(clamp(Number(b.marginVPct || 34) || 34, 0, 60));
      subMarginText.value = String(subMargin.value);

      const setFontSelect = (sel, fontKey) => {
        const key = String(fontKey || "").trim();
        if (!key) {
          sel.value = "Microsoft YaHei";
          return;
        }
        const decoded = getFontLabel(key);
        const encodedName = encodeURIComponent(decoded);
        const exists = Array.from(sel.options || []).some((o) => o.value === encodedName);
        sel.value = exists ? encodedName : decoded;
      };
      setFontSelect(subFont, b.font);

      titleEnable.checked = t.enable !== false;
      titleText.value = String(t.text || "");
      titleLines.value = String(clamp(Number(t.lineCount || 2) || 2, 1, 3));
      titleMaxChars.value = String(clamp(Number(t.maxChars || 12) || 12, 8, 20));
      titleMaxCharsText.value = String(titleMaxChars.value);
      titleGap.value = String(clamp(Number(t.lineGapPct || 5) || 5, 0, 30));
      titleGapText.value = String(titleGap.value);
      titleTop.value = String(clamp(Number(t.topMarginPct || 10) || 10, 0, 30));
      titleTopText.value = String(titleTop.value);
      titleSpacing.value = String(clamp(Number(t.letterSpacing || 0) || 0, 0, 20));
      titleSpacingText.value = String(titleSpacing.value);

      subLines.value = String(clamp(Number(b.lineCount || 2) || 2, 1, 3));
      subMaxChars.value = String(clamp(Number(b.maxChars || 14) || 14, 6, 24));
      subMaxCharsText.value = String(subMaxChars.value);
      subGap.value = String(clamp(Number(b.lineGapPct || 4) || 4, 0, 30));
      subGapText.value = String(subGap.value);
      subSpacing.value = String(clamp(Number(b.letterSpacing || 0) || 0, 0, 20));
      subSpacingText.value = String(subSpacing.value);

      renderLinesPreview();
      renderLineEditors();
      renderKeywordFxUi();
      syncHistoryButtons();
      flushPreviewRender();
    };

    const renderLinesPreview = () => {
      if (!active) return;
      const lines = computeTitleLines(active);
      const maxChars = clamp(Number(active?.title?.maxChars || 12) || 12, 8, 20);
      const html = lines
        .map((ln, idx) => {
          const text = String(ln || "");
          const len = Array.from(text).length;
          const over = len > maxChars;
          return `<div class="stpl-line-pill${over ? " is-over" : ""}">
            <span class="stpl-line-idx">第${idx + 1}行</span>
            <span class="stpl-line-text">${escapeHtml(text || "（空）")}</span>
            <span class="stpl-line-len">${len}/${maxChars}</span>
          </div>`;
        })
        .join("");
      linesPreview.innerHTML = html || `<div class="empty">请输入标题内容后即可看到分行预览。</div>`;
    };

    const renderLineEditors = () => {
      if (!active) return;
      const t = active.title || {};
      const desired = clamp(Number(t.lineCount || 2) || 2, 1, 3);
      const lines = Array.isArray(t.lines) ? t.lines.slice() : [];
      while (lines.length < desired) lines.push(defaultLineStyle(lines.length));
      if (lines.length > desired) lines.length = desired;
      active.title.lines = lines;

      const fontOptionsHtml = (() => {
        const base = [`<option value="Microsoft YaHei">Microsoft YaHei（系统）</option>`];
        base.push(...fonts.map((f) => `<option value="${encodeURIComponent(f.name)}">${f.name}</option>`));
        return base.join("");
      })();

      lineEditor.innerHTML = lines
        .map((s, idx) => {
          const fontKey = String(s?.font || "Microsoft YaHei");
          const decoded = getFontLabel(fontKey);
          const encoded = encodeURIComponent(decoded);
          const fs = clamp(Number(s?.fontSize || (idx === 0 ? 64 : 56)) || 60, 18, 140);
          const color = normalizeHex(s?.color, idx === 0 ? "#b30b08" : "#ffffff");
          const outlineColor = normalizeHex(s?.outlineColor, "#000000");
          const outline = clamp(Number(s?.outline || 4) || 0, 0, 10);
          const bold = s?.bold !== false;
          const shadow = s?.shadow !== false;
          return `<details class="stpl-line-card" ${idx === 0 ? "open" : ""}>
            <summary class="stpl-line-sum">
              <div class="stpl-line-sum-left">
                <span class="pill">第${idx + 1}行</span>
                <span class="stpl-line-sum-text">${escapeHtml(computeTitleLines(active)[idx] || "（空）")}</span>
              </div>
              <span class="pill">展开</span>
            </summary>
            <div class="stpl-line-body" data-line-idx="${idx}">
              <div class="grid cols-2" style="gap: 10px">
                <div class="field">
                  <div class="label">字体</div>
                  <select class="stpl-title-font">${fontOptionsHtml}</select>
                </div>
                <div class="field">
                  <div class="label">字体大小</div>
                  <div class="stpl-range">
                    <input class="stpl-title-size" type="range" min="18" max="140" step="1" value="${fs}" />
                    <input class="stpl-title-size-text" type="text" value="${fs}" />
                  </div>
                </div>
              </div>
              <div class="grid cols-2" style="gap: 10px; margin-top: 10px">
                <div class="field">
                  <div class="label">文字颜色</div>
                  <div class="stpl-color">
                    <input class="stpl-title-color" type="color" value="${color}" />
                    <input class="stpl-title-color-text" type="text" value="${color}" />
                  </div>
                </div>
                <div class="field">
                  <div class="label">描边颜色</div>
                  <div class="stpl-color">
                    <input class="stpl-title-ocolor" type="color" value="${outlineColor}" />
                    <input class="stpl-title-ocolor-text" type="text" value="${outlineColor}" />
                  </div>
                </div>
              </div>
              <div class="grid cols-2" style="gap: 10px; margin-top: 10px">
                <div class="field">
                  <div class="label">描边宽度</div>
                  <div class="stpl-range">
                    <input class="stpl-title-outline" type="range" min="0" max="12" step="1" value="${outline}" />
                    <input class="stpl-title-outline-text" type="text" value="${outline}" />
                  </div>
                </div>
                <div class="field">
                  <div class="label">样式</div>
                  <div class="inline-flags">
                    <label class="chk"><input class="stpl-title-bold" type="checkbox" ${bold ? "checked" : ""} /> 加粗</label>
                    <label class="chk"><input class="stpl-title-shadow" type="checkbox" ${shadow ? "checked" : ""} /> 阴影</label>
                  </div>
                </div>
              </div>
            </div>
          </details>`;
        })
        .join("");

      Array.from(lineEditor.querySelectorAll(".stpl-line-body[data-line-idx]")).forEach((bodyEl) => {
        const idx = Number(bodyEl.getAttribute("data-line-idx") || -1);
        if (!Number.isFinite(idx) || idx < 0) return;
        const readCurrentLine = () => {
          const latestLines = Array.isArray(active?.title?.lines) ? active.title.lines : [];
          return latestLines[idx] && typeof latestLines[idx] === "object" ? latestLines[idx] : defaultLineStyle(idx);
        };

        const pick = (sel) => bodyEl.querySelector(sel);
        const fontSel = pick(".stpl-title-font");
        const sizeRange = pick(".stpl-title-size");
        const sizeText = pick(".stpl-title-size-text");
        const colorInput = pick(".stpl-title-color");
        const colorText = pick(".stpl-title-color-text");
        const oColorInput = pick(".stpl-title-ocolor");
        const oColorText = pick(".stpl-title-ocolor-text");
        const oRange = pick(".stpl-title-outline");
        const oText = pick(".stpl-title-outline-text");
        const boldChk = pick(".stpl-title-bold");
        const shadowChk = pick(".stpl-title-shadow");

        const setFontValue = () => {
          const cur = readCurrentLine();
          const decoded = getFontLabel(cur.font);
          const encoded = encodeURIComponent(decoded);
          const exists = Array.from(fontSel.options || []).some((o) => o.value === encoded);
          fontSel.value = exists ? encoded : decoded;
        };
        setFontValue();

        const applyLine = (next) => {
          const cur = readCurrentLine();
          const nextLines = Array.isArray(active?.title?.lines) ? active.title.lines.map((item) => ({ ...(item && typeof item === "object" ? item : {}) })) : [];
          nextLines[idx] = { ...defaultLineStyle(idx), ...cur, ...next };
          updateActive({ title: { ...(active.title || {}), lines: nextLines } }, { refreshList: true, groupKey: `title-line-${idx}` });
        };

        fontSel?.addEventListener("change", () => {
          const v = String(fontSel.value || "").trim();
          applyLine({ font: v || "Microsoft YaHei" });
        });
        sizeRange?.addEventListener("input", () => {
          const v = clamp(Number(sizeRange.value || 60) || 60, 18, 140);
          sizeRange.value = String(v);
          if (sizeText) sizeText.value = String(v);
          applyLine({ fontSize: v });
        });
        wireNumericText(sizeText, (raw) => {
          const v = clamp(Number(raw || 0) || 0, 18, 140);
          sizeText.value = String(v);
          if (sizeRange) sizeRange.value = String(v);
          applyLine({ fontSize: v });
        });

        const wireColor = (picker, text, key, fallback) => {
          const apply = (hex) => applyLine({ [key]: normalizeHex(hex, fallback) });
          picker?.addEventListener("input", () => {
            const v = normalizeHex(picker.value, fallback);
            picker.value = v;
            if (text) text.value = v;
            apply(v);
          });
          text?.addEventListener("input", () => {
            const v = normalizeHex(text.value, fallback);
            text.value = v;
            if (picker) picker.value = v;
            apply(v);
          });
        };
        wireColor(colorInput, colorText, "color", idx === 0 ? "#b30b08" : "#ffffff");
        wireColor(oColorInput, oColorText, "outlineColor", "#000000");

        oRange?.addEventListener("input", () => {
          const v = clamp(Number(oRange.value || 0) || 0, 0, 12);
          oRange.value = String(v);
          if (oText) oText.value = String(v);
          applyLine({ outline: v });
        });
        wireNumericText(oText, (raw) => {
          const v = clamp(Number(raw || 0) || 0, 0, 12);
          oText.value = String(v);
          if (oRange) oRange.value = String(v);
          applyLine({ outline: v });
        }, { allowDecimal: false });
        boldChk?.addEventListener("change", () => applyLine({ bold: boldChk.checked === true }));
        shadowChk?.addEventListener("change", () => applyLine({ shadow: shadowChk.checked === true }));
      });
    };

    function renderKeywordFxUi() {
      if (!active) return;
      if (!kwGroups || !kwEditor) return;

      if (!active.keywordFx || typeof active.keywordFx !== "object") active.keywordFx = defaultTemplate().keywordFx;
      if (!active.keywordFx.groups || typeof active.keywordFx.groups !== "object") active.keywordFx.groups = defaultTemplate().keywordFx.groups;

      const map = buildKeywordPreviewMap(homeKeywordMap);
      const total = KEYWORD_CATS.reduce((n, k) => n + (Array.isArray(map?.[k]) ? map[k].filter(Boolean).length : 0), 0);
      kwAvailable = total > 0;

      if (!kwAvailable) {
        if (kwEnable) {
          kwEnable.checked = false;
          kwEnable.disabled = true;
        }
        if (kwStatus) {
          kwStatus.hidden = false;
          kwStatus.textContent = "首页关键词为空：关键词特效已隐藏";
        }
        if (kwGroups) {
          kwGroups.innerHTML = "";
          kwGroups.style.display = "none";
        }
        if (kwEditor) {
          kwEditor.innerHTML = "";
          kwEditor.style.display = "none";
        }
        return;
      }

      if (kwEnable) kwEnable.disabled = false;
      if (kwStatus) kwStatus.hidden = true;
      if (kwGroups) kwGroups.style.display = "";
      if (kwEditor) kwEditor.style.display = "";
      renderKeywordFxEditor({
        groupsWrapEl: kwGroups,
        editorWrapEl: kwEditor,
        keywordMap: map,
        readGroup: (cat) => {
          const latestGroups = active?.keywordFx?.groups && typeof active.keywordFx.groups === "object" ? active.keywordFx.groups : {};
          const latest = latestGroups?.[cat];
          const fallbackGroups = defaultTemplate().keywordFx.groups || {};
          return latest && typeof latest === "object" ? latest : fallbackGroups?.[cat] || defaultLineStyle(0);
        },
        onApplyGroup: (cat, nextGroup) => {
          const nextGroups = {
            ...(active.keywordFx?.groups && typeof active.keywordFx.groups === "object" ? active.keywordFx.groups : {}),
            [cat]: nextGroup
          };
          updateActive({ keywordFx: { ...(active.keywordFx || {}), groups: nextGroups } }, { refreshList: true, groupKey: `kw-${cat}` });
        }
      });
    }

    function renderRecognizeKeywordFxUi() {
      const tpl = recognizeState.workingTemplate;
      if (!tpl || !recKwGroups || !recKwEditor) return;
      if (!tpl.keywordFx || typeof tpl.keywordFx !== "object") tpl.keywordFx = defaultTemplate().keywordFx;
      if (!tpl.keywordFx.groups || typeof tpl.keywordFx.groups !== "object") tpl.keywordFx.groups = defaultTemplate().keywordFx.groups;
      if (recKwEnable) recKwEnable.checked = tpl.keywordFx.enable === true;
      renderKeywordFxEditor({
        groupsWrapEl: recKwGroups,
        editorWrapEl: recKwEditor,
        keywordMap: buildKeywordPreviewMap(homeKeywordMap, { useSampleFallback: true }),
        readGroup: (cat) => {
          const latestGroups = tpl?.keywordFx?.groups && typeof tpl.keywordFx.groups === "object" ? tpl.keywordFx.groups : {};
          const latest = latestGroups?.[cat];
          const fallbackGroups = defaultTemplate().keywordFx.groups || {};
          return latest && typeof latest === "object" ? latest : fallbackGroups?.[cat] || defaultLineStyle(0);
        },
        onApplyGroup: (cat, nextGroup) => {
          const nextGroups = {
            ...(tpl.keywordFx?.groups && typeof tpl.keywordFx.groups === "object" ? tpl.keywordFx.groups : {}),
            [cat]: nextGroup
          };
          applyRecognizeQuickPatch({
            keywordFx: {
              ...(tpl.keywordFx || {}),
              enable: recKwEnable?.checked === true,
              groups: nextGroups
            }
          });
        }
      });
    }

    const selectTemplate = (id) => {
      const nextId = String(id || "").trim();
      if (!nextId) return;
      activeId = nextId;
      active = normalizeTemplateShape(state.templates.find((t) => String(t?.id || "") === activeId) || null);
      state.activeId = activeId;
      const idx = state.templates.findIndex((t) => String(t?.id || "") === activeId);
      if (idx >= 0 && active) state.templates[idx] = active;
      setDirty(false);
      renderList();
      renderEditor();
      resetTemplateHistory();
    };

    const updateActive = (patch, { immediateSync = false, refreshList = false, refreshEditor = false, groupKey = "", trackHistory = true } = {}) => {
      if (!active) return;
      const previous = cloneTemplate(active);
      active = mergeTemplatePatch(active, patch || {});
      active = normalizeTemplateShape(active);
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
      renderLinesPreview();
      requestPreviewRender("update-active");
    };

    const ensureTitleLinesArr = () => {
      if (!active) return;
      const t = active.title || {};
      const desired = clamp(Number(t.lineCount || 2) || 2, 1, 3);
      const arr = Array.isArray(t.lines) ? t.lines.slice() : [];
      while (arr.length < desired) arr.push(defaultLineStyle(arr.length));
      if (arr.length > desired) arr.length = desired;
      active.title = { ...t, lines: arr, lineCount: desired };
    };

    const wireNumericText = (inputEl, onCommit, { allowDecimal = true, allowNegative = false } = {}) => {
      if (!inputEl || typeof onCommit !== "function") return;
      const sanitize = () => {
        const pattern = allowDecimal ? (allowNegative ? /[^\d.-]/g : /[^\d.]/g) : (allowNegative ? /[^\d-]/g : /[^\d]/g);
        let next = String(inputEl.value || "").replace(pattern, "");
        if (allowNegative) next = next.replace(/(?!^)-/g, "");
        else next = next.replace(/-/g, "");
        if (allowDecimal) {
          const firstDot = next.indexOf(".");
          if (firstDot >= 0) next = `${next.slice(0, firstDot + 1)}${next.slice(firstDot + 1).replaceAll(".", "")}`;
        } else next = next.replaceAll(".", "");
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

    const wireRange = (rangeEl, textEl, onValue, { min, max, allowNegative = false } = {}) => {
      const apply = (raw) => {
        const v = clamp(Number(raw) || 0, Number(min ?? -1e9), Number(max ?? 1e9));
        rangeEl.value = String(v);
        if (textEl) textEl.value = String(v);
        onValue(v);
      };
      rangeEl.addEventListener("input", () => apply(rangeEl.value));
      wireNumericText(textEl, apply, { allowNegative });
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

    const commitRecognizeDrag = (role, nextXPct, nextYPct, { silent = false } = {}) => {
      if (!recognizeState.workingTemplate) return;
      const patch =
        role === "title"
          ? { title: { offsetXPct: clamp(nextXPct, -40, 40), offsetYPct: clamp(nextYPct, -40, 40) } }
          : { body: { offsetXPct: clamp(nextXPct, -40, 40), offsetYPct: clamp(nextYPct, -40, 40) } };
      recognizeState.workingTemplate = normalizeTemplateShape(mergeTemplatePatch(recognizeState.workingTemplate, patch));
      applyRecognizePreviewLayout();
      syncRecognizeFocusStyles();
      if (!silent) syncRecognizeControlsFromTemplate();
      if (recApply) recApply.disabled = !recognizeState.summary;
    };

    const endRecognizeDrag = () => {
      const drag = recognizeState.drag;
      if (drag?.startSnapshot) {
        try {
          recognizeHistory.record(drag.startSnapshot, cloneTemplate(recognizeState.workingTemplate), { groupKey: `rec-drag-${drag.role}` });
        } catch {}
      }
      recognizeState.drag = null;
      recPreviewStage?.classList.remove("is-dragging");
      Array.from(recPreviewStage?.querySelectorAll(".stpl-rec-draggable") || []).forEach((el) => el.classList.remove("is-dragging"));
      syncRecognizeControlsFromTemplate();
    };

    window.addEventListener("pointermove", (event) => {
      const drag = recognizeState.drag;
      if (!drag || !recognizeState.workingTemplate || !recPreviewStage) return;
      const base = recognizeState.workingTemplate.baseRes && typeof recognizeState.workingTemplate.baseRes === "object"
        ? recognizeState.workingTemplate.baseRes
        : { w: 1080, h: 1920 };
      const bw = clamp(Number(base.w || 1080) || 1080, 240, 99999);
      const bh = clamp(Number(base.h || 1920) || 1920, 240, 99999);
      const scale = Math.max(0.0001, (Number(recPreviewStage.clientHeight || 0) || 1) / bh);
      const dxPct = ((Number(event.clientX || 0) - drag.startClientX) / (bw * scale)) * 100;
      const dyPct = ((Number(event.clientY || 0) - drag.startClientY) / (bh * scale)) * 100;
      commitRecognizeDrag(drag.role, drag.startXPct + dxPct, drag.startYPct + dyPct, { silent: true });
    });
    window.addEventListener("pointerup", endRecognizeDrag);
    window.addEventListener("pointercancel", endRecognizeDrag);
    recPreviewStage?.addEventListener("pointerdown", (event) => {
      const target = event.target?.closest?.(".stpl-rec-draggable[data-drag-role]");
      const role = String(target?.getAttribute?.("data-drag-role") || "").trim();
      if (!role || !recognizeState.workingTemplate) return;
      event.preventDefault();
      const titleIdx = Number(event.target?.closest?.("[data-title-line-idx]")?.getAttribute?.("data-title-line-idx") || 0);
      const bodyIdx = Number(event.target?.closest?.("[data-body-line-idx]")?.getAttribute?.("data-body-line-idx") || 0);
      recognizeState.focusRole = role;
      if (role === "title") {
        recognizeState.focusTitleLineIdx = clamp(titleIdx, 0, 2);
        setRecognizeSection("title");
        focusRecognizeTitleLineEditor(recognizeState.focusTitleLineIdx);
      } else if (role === "body") {
        recognizeState.focusBodyLineIdx = clamp(bodyIdx, 0, 2);
        setRecognizeSection("sub");
        focusRecognizeBodyLineEditor(recognizeState.focusBodyLineIdx);
      }
      syncRecognizeFocusStyles();
      const source = role === "title" ? recognizeState.workingTemplate.title || {} : recognizeState.workingTemplate.body || {};
      recognizeState.drag = {
        role,
        startClientX: Number(event.clientX || 0),
        startClientY: Number(event.clientY || 0),
        startXPct: clamp(Number(source.offsetXPct || 0) || 0, -40, 40),
        startYPct: clamp(Number(source.offsetYPct || 0) || 0, -40, 40),
        startSnapshot: cloneTemplate(recognizeState.workingTemplate)
      };
      recPreviewStage.classList.add("is-dragging");
      Array.from(recPreviewStage.querySelectorAll(".stpl-rec-draggable")).forEach((el) => {
        el.classList.toggle("is-dragging", el === target);
      });
    });

    stplRecognize?.addEventListener("click", () => {
      recognizeState.workingTemplate = normalizeTemplateShape(cloneTemplate(active || defaultTemplate()));
      if (!recognizeState.summary) {
        recognizeState.items = [];
        recognizeState.selectedId = "";
      }
      syncRecognizeControlsFromTemplate();
      openRecognizeModal();
    });
    recClose?.addEventListener("click", closeRecognizeModal);
    recModal?.addEventListener("click", (event) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.getAttribute("data-close") === "1") closeRecognizeModal();
    });
    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && recognizeState.visible) closeRecognizeModal();
    });
    const onRecognizeHistoryKeydown = (e) => {
      if (!recognizeState.visible || !recognizeState.workingTemplate) return;
      const target = e.target;
      if (target instanceof HTMLElement) {
        const tag = String(target.tagName || "").toLowerCase();
        if (tag === "input" || tag === "textarea" || target.isContentEditable) return;
      }
      const key = String(e.key || "").toLowerCase();
      if (!(e.ctrlKey || e.metaKey)) return;
      if (!e.shiftKey && key === "z") {
        e.preventDefault();
        e.stopImmediatePropagation();
        const res = recognizeHistory.undo(cloneTemplate(recognizeState.workingTemplate));
        if (res?.ok) applyRecognizeHistorySnapshot(res.value);
        return;
      }
      if (key === "y" || (e.shiftKey && key === "z")) {
        e.preventDefault();
        e.stopImmediatePropagation();
        const res = recognizeHistory.redo(cloneTemplate(recognizeState.workingTemplate));
        if (res?.ok) applyRecognizeHistorySnapshot(res.value);
      }
    };
    window.addEventListener("keydown", onRecognizeHistoryKeydown);
    recUpload?.addEventListener("click", async () => {
      const remain = Math.max(0, 9 - recognizeState.items.length);
      if (remain < 1) {
        toast("参考图最多上传 9 张。", "warn");
        return;
      }
      const picked = await pickSubtitleTemplateReferenceImages({ maxCount: remain });
      if (!picked.length) return;
      recognizeState.items = recognizeState.items.concat(picked).slice(0, 9);
      if (!recognizeState.selectedId) recognizeState.selectedId = String(recognizeState.items[0]?.id || "");
      renderRecognizeModal();
    });
    recClear?.addEventListener("click", () => {
      recognizeState.items = [];
      recognizeState.selectedId = "";
      recognizeState.summary = null;
      recognizeState.workingTemplate = normalizeTemplateShape(cloneTemplate(active || defaultTemplate()));
      syncRecognizeControlsFromTemplate();
      renderRecognizeModal();
    });
    recRun?.addEventListener("click", async () => {
      if (recognizeState.items.length < 1) {
        toast("请先上传至少 1 张参考图。", "warn");
        return;
      }
      recognizeState.analyzing = true;
      if (recRun) recRun.textContent = "识别中...";
      renderRecognizeModal();
      try {
        const res = await analyzeSubtitleTemplateReferenceImages(recognizeState.items);
        if (!res?.ok) {
          toast(String(res?.message || "模板识别失败。"), "warn");
          return;
        }
        recognizeState.items = Array.isArray(res.items)
          ? res.items.map((item) => ({
              id: String(item?.id || ""),
              name: String(item?.name || ""),
              dataUrl: String(item?.dataUrl || ""),
              analysis: item?.analysis || null,
              width: Number(item?.width || 0) || 0,
              height: Number(item?.height || 0) || 0
            }))
          : recognizeState.items;
        recognizeState.selectedId = String(recognizeState.selectedId || recognizeState.items[0]?.id || "");
        recognizeState.summary = res.summary || null;
        const baseTemplate = normalizeTemplateShape(cloneTemplate(active || defaultTemplate()));
        recognizeState.workingTemplate = normalizeTemplateShape(mergeTemplatePatch(baseTemplate, res.patch || {}));
        syncRecognizeControlsFromTemplate();
        renderRecognizeModal();
        toast("模板识别完成，已生成可微调的初始参数。", "success");
      } catch (error) {
        toast(`模板识别失败：${String(error?.message || error)}`, "warn");
      } finally {
        recognizeState.analyzing = false;
        if (recRun) recRun.textContent = "开始识别";
        renderRecognizeModal();
      }
    });
    recApply?.addEventListener("click", async () => {
      if (!active || !recognizeState.workingTemplate) {
        toast("当前没有可应用的识别结果。", "warn");
        return;
      }
      const nextTemplate = normalizeTemplateShape(cloneTemplate(recognizeState.workingTemplate));
      nextTemplate.id = active.id;
      nextTemplate.templateId = active.templateId;
      nextTemplate.cloudTemplateId = active.cloudTemplateId;
      nextTemplate.cloudId = active.cloudId;
      nextTemplate.name = String(active.name || nextTemplate.name || "未命名模板");
      nextTemplate.templateSource = active.templateSource;
      nextTemplate.source = active.source;
      updateActive(nextTemplate, { immediateSync: true, refreshList: true, refreshEditor: true, groupKey: "recognize-apply" });
      toast("识别结果已应用到当前模板。", "success");
    });
    recCreate?.addEventListener("click", () => {
      if (!recognizeState.workingTemplate) {
        toast("当前没有可生成的新模板。", "warn");
        return;
      }
      const wantedName = buildUniqueLocalSubtitleTemplateName(
        String(recognizeState.newTemplateName || "").trim() || buildRecognizeTemplateName(recognizeState.workingTemplate?.name || active?.name || "")
      );
      const id = uid();
      const nextTemplate = cloneSubtitleTemplate(recognizeState.workingTemplate);
      nextTemplate.id = id;
      nextTemplate.templateId = id;
      nextTemplate.cloudTemplateId = "";
      nextTemplate.cloudId = "";
      nextTemplate.templateSource = "local";
      nextTemplate.source = "local";
      nextTemplate.name = wantedName;
      nextTemplate.updatedAt = nowTs();
      state.templates = [nextTemplate, ...state.templates];
      state.activeId = id;
      activeId = id;
      active = nextTemplate;
      flushStoreWrite({ warn: true });
      setDirty(false);
      recognizeState.newTemplateName = buildRecognizeTemplateName(wantedName);
      renderList();
      renderEditor();
      resetTemplateHistory();
      closeRecognizeModal();
      toast(`已根据识别参数生成新的字幕模板：${wantedName}`, "success");
    });
    recBodyPos?.addEventListener("click", (event) => {
      const btn = event.target?.closest?.(".seg-tab[data-pos]");
      const pos = String(btn?.getAttribute?.("data-pos") || "").trim();
      if (!pos) return;
      applyRecognizeQuickPatch({ body: { pos } });
    });
    recKwEnable?.addEventListener("change", () => {
      const currentKeywordFx =
        recognizeState.workingTemplate?.keywordFx && typeof recognizeState.workingTemplate.keywordFx === "object"
          ? recognizeState.workingTemplate.keywordFx
          : defaultTemplate().keywordFx;
      applyRecognizeQuickPatch({ keywordFx: { ...currentKeywordFx, enable: recKwEnable.checked === true } });
    });
    recNav?.addEventListener("click", (event) => {
      const btn = event.target?.closest?.(".stpl-nav-item[data-rec-sec]");
      if (!btn) return;
      setRecognizeSection(String(btn.getAttribute("data-rec-sec") || "base"));
    });
    recNewName?.addEventListener("input", () => {
      recognizeState.newTemplateName = String(recNewName.value || "").trim();
      if (recCreate) recCreate.disabled = !recognizeState.workingTemplate || !String(recognizeState.newTemplateName || "").trim();
    });
    recTitleLines?.addEventListener("change", () => {
      const desired = clamp(Number(recTitleLines.value || 2) || 2, 1, 3);
      const currentLines = Array.isArray(recognizeState.workingTemplate?.title?.lines) ? recognizeState.workingTemplate.title.lines.slice() : [];
      while (currentLines.length < desired) currentLines.push(defaultLineStyle(currentLines.length));
      if (currentLines.length > desired) currentLines.length = desired;
      applyRecognizeQuickPatch({ title: { lineCount: desired, lines: currentLines } }, { refreshEditors: true });
    });
    wireRange(recTitleMaxChars, recTitleMaxCharsText, (v) => applyRecognizeQuickPatch({ title: { maxChars: v } }, { refreshEditors: true }), { min: 8, max: 20 });
    wireRange(recTitleGap, recTitleGapText, (v) => applyRecognizeQuickPatch({ title: { lineGapPct: v } }), { min: 0, max: 30 });
    wireRange(recTitleSize, recTitleSizeText, (v) => {
      const latestLines = Array.isArray(recognizeState.workingTemplate?.title?.lines) ? recognizeState.workingTemplate.title.lines.slice() : [];
      const line0 = { ...defaultLineStyle(0), ...(latestLines[0] && typeof latestLines[0] === "object" ? latestLines[0] : {}) };
      latestLines[0] = { ...line0, fontSize: v };
      if (latestLines[1]) {
        latestLines[1] = {
          ...defaultLineStyle(1),
          ...(latestLines[1] && typeof latestLines[1] === "object" ? latestLines[1] : {}),
          fontSize: clamp(Math.round(v * 0.88), 24, 140)
        };
      }
      applyRecognizeQuickPatch({ title: { lines: latestLines } }, { refreshEditors: true });
    }, { min: 28, max: 160 });
    wireRange(recBodySize, recBodySizeText, (v) => applyRecognizeQuickPatch({ body: { fontSize: v } }), { min: 24, max: 120 });
    wireRange(recTitleTop, recTitleTopText, (v) => applyRecognizeQuickPatch({ title: { topMarginPct: v } }), { min: 0, max: 30 });
    wireRange(recBodyMargin, recBodyMarginText, (v) => applyRecognizeQuickPatch({ body: { marginVPct: v } }), { min: 0, max: 60 });
    wireRange(recTitleOffsetX, recTitleOffsetXText, (v) => applyRecognizeQuickPatch({ title: { offsetXPct: v } }), { min: -40, max: 40, allowNegative: true });
    wireRange(recTitleOffsetY, recTitleOffsetYText, (v) => applyRecognizeQuickPatch({ title: { offsetYPct: v } }), { min: -40, max: 40, allowNegative: true });
    wireRange(recBodyOffsetX, recBodyOffsetXText, (v) => applyRecognizeQuickPatch({ body: { offsetXPct: v } }), { min: -40, max: 40, allowNegative: true });
    wireRange(recBodyOffsetY, recBodyOffsetYText, (v) => applyRecognizeQuickPatch({ body: { offsetYPct: v } }), { min: -40, max: 40, allowNegative: true });
    const parseResStr = (s) => {
      const m = String(s || "").trim().match(/^(\d{2,5})x(\d{2,5})$/i);
      if (!m) return null;
      const w = clamp(Number(m[1] || 1080) || 1080, 240, 99999);
      const h = clamp(Number(m[2] || 1920) || 1920, 240, 99999);
      return { w, h };
    };
    baseRes?.addEventListener("change", () => {
      if (!active) return;
      const v = String(baseRes.value || "");
      const r = parseResStr(v);
      if (r) updateActive({ baseRes: r });
    });
    const syncCustomRes = () => {
      if (!active) return;
      const w = clamp(Number(String(baseW?.value || "").replace(/[^\d]/g, "") || 0) || 0, 240, 99999);
      const h = clamp(Number(String(baseH?.value || "").replace(/[^\d]/g, "") || 0) || 0, 240, 99999);
      if (baseW) baseW.value = String(w);
      if (baseH) baseH.value = String(h);
      updateActive({ baseRes: { w, h } });
    };
    wireNumericText(baseW, () => {
      if (String(baseRes?.value || "") !== "custom") baseRes.value = "custom";
      syncCustomRes();
    }, { allowDecimal: false });
    wireNumericText(baseH, () => {
      if (String(baseRes?.value || "") !== "custom") baseRes.value = "custom";
      syncCustomRes();
    }, { allowDecimal: false });

    kwEnable?.addEventListener("change", () => {
      if (!active) return;
      const currentKeywordFx = active.keywordFx && typeof active.keywordFx === "object" ? active.keywordFx : defaultTemplate().keywordFx;
      updateActive({ keywordFx: { ...currentKeywordFx, enable: kwEnable.checked === true } });
    });
    kwReload?.addEventListener("click", () => {
      homeKeywordMap = readHomeKeywordMap();
      renderKeywordFxUi();
      requestPreviewRender("keyword-reload");
    });

    window.addEventListener("ipfactory:homeKwChanged", (e) => {
      const km = e?.detail?.kwMap;
      homeKeywordMap = km && typeof km === "object" ? km : readHomeKeywordMap();
      renderKeywordFxUi();
      requestPreviewRender("home-keyword-change");
    });

    subPos?.addEventListener("click", (e) => {
      const btn = e.target?.closest?.(".seg-tab[data-pos]");
      const pos = btn?.getAttribute?.("data-pos");
      if (!pos || !active) return;
      updateActive({ body: { ...(active.body || {}), pos } });
    });

    wireRange(subSize, subSizeText, (v) => updateActive({ body: { ...(active.body || {}), fontSize: v } }, { groupKey: "body-size" }), { min: 18, max: 96 });
    wireRange(subMaxChars, subMaxCharsText, (v) => updateActive({ body: { ...(active.body || {}), maxChars: v } }, { groupKey: "body-maxchars" }), { min: 6, max: 24 });
    wireRange(subGap, subGapText, (v) => updateActive({ body: { ...(active.body || {}), lineGapPct: v } }, { groupKey: "body-gap" }), { min: 0, max: 30 });
    wireRange(subSpacing, subSpacingText, (v) => updateActive({ body: { ...(active.body || {}), letterSpacing: v } }, { groupKey: "body-spacing" }), { min: 0, max: 20 });
    wireHex(subColor, subColorText, (v) => updateActive({ body: { ...(active.body || {}), color: v } }, { groupKey: "body-color" }), "#ffffff");
    wireHex(subOutlineColor, subOutlineColorText, (v) => updateActive({ body: { ...(active.body || {}), outlineColor: v } }, { groupKey: "body-ocolor" }), "#000000");
    wireRange(subOutline, subOutlineText, (v) => updateActive({ body: { ...(active.body || {}), outline: v } }, { groupKey: "body-outline" }), { min: 0, max: 8 });
    wireRange(subMargin, subMarginText, (v) => updateActive({ body: { ...(active.body || {}), marginVPct: v } }, { groupKey: "body-margin" }), { min: 0, max: 60 });

    subLines?.addEventListener("change", () => updateActive({ body: { ...(active.body || {}), lineCount: Number(subLines.value || 2) || 2 } }, { groupKey: "body-lines" }));
    subBold?.addEventListener("change", () => updateActive({ body: { ...(active.body || {}), bold: subBold.checked === true } }, { groupKey: "body-bold" }));
    subShadow?.addEventListener("change", () => updateActive({ body: { ...(active.body || {}), shadow: subShadow.checked === true } }, { groupKey: "body-shadow" }));
    subFont?.addEventListener("change", () => updateActive({ body: { ...(active.body || {}), font: String(subFont.value || "Microsoft YaHei") } }, { groupKey: "body-font" }));

    titleEnable?.addEventListener("change", () => updateActive({ title: { ...(active.title || {}), enable: titleEnable.checked === true } }, { groupKey: "title-enable" }));
    titleText?.addEventListener("input", () => updateActive({ title: { ...(active.title || {}), text: String(titleText.value || "") } }, { groupKey: "title-text" }));
    titleLines?.addEventListener("change", () => {
      ensureTitleLinesArr();
      updateActive({ title: { ...(active.title || {}), lineCount: Number(titleLines.value || 2) || 2 } }, { groupKey: "title-lines" });
      ensureTitleLinesArr();
      renderLineEditors();
      renderLinesPreview();
      requestPreviewRender("title-line-count");
    });
    wireRange(titleMaxChars, titleMaxCharsText, (v) => updateActive({ title: { ...(active.title || {}), maxChars: v } }, { groupKey: "title-maxchars" }), { min: 8, max: 20 });
    wireRange(titleGap, titleGapText, (v) => updateActive({ title: { ...(active.title || {}), lineGapPct: v } }, { groupKey: "title-gap" }), { min: 0, max: 30 });
    wireRange(titleTop, titleTopText, (v) => updateActive({ title: { ...(active.title || {}), topMarginPct: v } }, { groupKey: "title-top" }), { min: 0, max: 30 });
    wireRange(titleSpacing, titleSpacingText, (v) => updateActive({ title: { ...(active.title || {}), letterSpacing: v } }, { groupKey: "title-spacing" }), {
      min: 0,
      max: 20
    });

    const refreshHomeTitle = () => {
      const t = readHomeTitle();
      if (stplHomeTitle) stplHomeTitle.textContent = t ? (t.length > 18 ? `${t.slice(0, 18)}...` : t) : "未读取";
      stplHomeTitle.title = t || "";
      return t;
    };

    stplReloadTitle?.addEventListener("click", () => refreshHomeTitle());
    titleLoad?.addEventListener("click", () => {
      const t = refreshHomeTitle();
      if (!active) return;
      updateActive({ title: { ...(active.title || {}), text: t || String(active.title?.text || "") } }, { groupKey: "title-text" });
    });
    stplBgUpload?.addEventListener("click", async () => {
      if (!active) return;
      const dataUrl = await pickImageAsDataUrl({ maxWidth: 360, maxHeight: 640, quality: 0.72, mimeType: "image/webp" });
      if (!dataUrl) return;
      updateActive({ previewBackground: dataUrl }, { immediateSync: true, refreshList: true });
    });
    stplBgClear?.addEventListener("click", () => {
      if (!active) return;
      updateActive({ previewBackground: "" }, { immediateSync: true, refreshList: true });
    });
    stplCoverCapture?.addEventListener("click", async () => {
      if (!active) return;
      const rawPreview = createSubtitleTemplatePreviewDataUrl(active, {
        titleText: String(active?.title?.text || "").trim() || refreshHomeTitle() || "标题示例",
        bodyText: "示例字幕文字",
        keywordPreview: true
      });
      const compactPreview =
        (await compressDataUrlImage(rawPreview, {
          maxWidth: 260,
          maxHeight: 462,
          quality: 0.72,
          mimeType: "image/webp",
          backgroundColor: "#ffffff"
        })) || rawPreview;
      updateActive({
        previewCover: compactPreview
      }, { immediateSync: true, refreshList: true });
      toast("已将当前字幕模板画面保存为模板封面。", "success");
    });
    stplCoverClear?.addEventListener("click", () => {
      if (!active) return;
      updateActive({ previewCover: "" }, { immediateSync: true, refreshList: true });
    });
    const resolveSubtitleCloudConflictPlan = async (cloudTemplates = [], workingTemplate = {}, conflictTemplate = null) => {
      let working = normalizeTemplateShape(ensureTemplateCloudIdentity("subtitle", workingTemplate));
      let conflict = conflictTemplate || findCloudTemplateNameConflict(cloudTemplates, working, String(working?.cloudTemplateId || working?.templateId || working?.id || "").trim());
      while (conflict) {
        const picked = await inputChoiceDialog({
          title: "云端模板名称重复",
          message: `云端已存在字幕模板“${String(conflict?.templateName || conflict?.name || "未命名模板")}”。可直接覆盖该模板，或输入一个新的云端名称后另存。`,
          inputLabel: "新的云端模板名称",
          value: buildUniqueCloudTemplateName(cloudTemplates, String(working?.name || "").trim(), "字幕模板"),
          placeholder: "请输入新的字幕模板名称",
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
          toast("请输入新的字幕模板名称。", "warn");
          continue;
        }
        working = { ...working, name: nextName, templateName: nextName };
        conflict = findCloudTemplateNameConflict(cloudTemplates, working, String(working?.cloudTemplateId || working?.templateId || working?.id || "").trim());
        if (conflict) toast("该名称在云端已存在，请重新命名。", "warn");
      }
      return {
        template: working,
        uploadOptions: { templateName: String(working?.name || "").trim() || buildUniqueCloudTemplateName(cloudTemplates, "", "字幕模板") }
      };
    };

    const cloneSubtitleTemplate = (tpl) => normalizeTemplateShape(JSON.parse(JSON.stringify(tpl || defaultTemplate())));
    const buildUniqueLocalSubtitleTemplateName = (baseName = "") => {
      const sourceName = String(baseName || "").trim() || "新字幕模板";
      const exists = new Set((Array.isArray(state?.templates) ? state.templates : []).map((item) => String(item?.name || "").trim()).filter(Boolean));
      if (!exists.has(sourceName)) return sourceName;
      let idx = 2;
      while (idx < 9999) {
        const next = `${sourceName}（${idx}）`;
        if (!exists.has(next)) return next;
        idx += 1;
      }
      return `${sourceName}_${Date.now()}`;
    };
    const commitSubtitleTemplateBeforeUpload = async () => {
      try {
        document.activeElement?.blur?.();
      } catch {}
      const saved = await saveActiveTemplate({ showToast: false, skipIfClean: false, uploadCloud: false });
      if (!saved || !active) return null;
      return cloneSubtitleTemplate(active);
    };

    const resolveSubtitleCloudUploadPlan = async (sourceTemplate) => {
      const uploadSource = sourceTemplate && typeof sourceTemplate === "object" ? sourceTemplate : active;
      if (!uploadSource) return null;
      const cloudRes = await fetchCloudTemplates("subtitle");
      const cloudTemplates = cloudRes?.ok === true ? (cloudRes.templates || []) : (getTemplateCloudCache("subtitle").templates || []);
      const pageInputName = String(stplName?.value || uploadSource?.name || "").trim();
      let working = normalizeTemplateShape(ensureTemplateCloudIdentity("subtitle", { ...cloneSubtitleTemplate(uploadSource), name: pageInputName || uploadSource?.name || "" }));
      let fallbackName = buildUniqueCloudTemplateName(cloudTemplates, String(working?.name || "").trim(), "字幕模板");
      const pickedName = await inputChoiceDialog({
        title: "设置云端模板名称",
        message: "上传到云端前，请先确认本次云端模板名称。",
        inputLabel: "云端模板名称",
        value: String(working?.name || "").trim() || fallbackName,
        placeholder: "请输入字幕模板名称",
        confirmText: "确认名称并上传",
        alternateText: "",
        cancelText: "取消上传"
      });
      if (pickedName.action === "cancel") return null;
      const chosenName = String(pickedName.value || "").trim();
      if (!chosenName) {
        toast("请输入字幕模板名称。", "warn");
        return null;
      }
      working = { ...working, name: chosenName, templateName: chosenName };
      return resolveSubtitleCloudConflictPlan(cloudTemplates, working);
    };
    const saveCloudSubtitleTemplate = async (template) => {
      const current = cloneSubtitleTemplate(template || active);
      if (!current) return { ok: false, errMsg: "当前没有可保存的云端模板。" };
      const currentName = String(current?.name || "").trim() || "未命名模板";
      const currentTemplateId = String(current?.cloudTemplateId || current?.templateId || getTemplateRecordId(current) || "").trim();
      const res = await uploadTemplateToCloud("subtitle", current, {
        overwriteByName: true,
        cloudTemplateId: currentTemplateId,
        templateName: currentName
      });
      if (!res?.ok) return res;
      updateActive(
        {
          name: currentName,
          templateId: String(res?.templateId || currentTemplateId || current?.templateId || ""),
          cloudTemplateId: String(res?.templateId || currentTemplateId || current?.cloudTemplateId || "")
        },
        { immediateSync: true, refreshList: true, trackHistory: false }
      );
      await syncCloudTemplateList({ silent: true });
      return { ok: true, templateId: String(res?.templateId || currentTemplateId || "") };
    };
    stplUploadCloud?.addEventListener("click", async () => {
      if (!active) return;
      const oldLabel = stplUploadCloud.textContent;
      stplUploadCloud.disabled = true;
      stplUploadCloud.textContent = "上传中...";
      try {
        const uploadSnapshot = await commitSubtitleTemplateBeforeUpload();
        if (!uploadSnapshot) {
          toast("当前字幕模板保存失败，未能上传到云端。", "warn");
          return;
        }
        let plan = await resolveSubtitleCloudUploadPlan(uploadSnapshot);
        while (plan) {
          const current = cloneSubtitleTemplate(plan.template);
          const res = await uploadTemplateToCloud("subtitle", current, plan.uploadOptions);
          if (res?.ok) {
            updateActive({
              name: String(current.name || "未命名模板"),
              cloudTemplateId: String(res?.templateId || current.cloudTemplateId || "")
            }, { immediateSync: true, refreshList: true, trackHistory: false });
            setDirty(false);
            await syncCloudTemplateList({ silent: true });
            toast("字幕模板已上传到云端。", "success");
            return;
          }
          if (String(res?.errCode || "") === "TEMPLATE_NAME_EXISTS") {
            const latestRes = await fetchCloudTemplates("subtitle");
            const latestCloudTemplates = latestRes?.ok === true ? (latestRes.templates || []) : (getTemplateCloudCache("subtitle").templates || []);
            const existing = res?.existingTemplate || findCloudTemplateNameConflict(latestCloudTemplates, current);
            plan = await resolveSubtitleCloudConflictPlan(latestCloudTemplates, current, existing || null);
            continue;
          }
          toast(String(res?.errMsg || "上传字幕模板到云端失败。"), "warn");
          return;
        }
      } finally {
        stplUploadCloud.disabled = false;
        stplUploadCloud.textContent = oldLabel;
      }
    });

    stplAdd?.addEventListener("click", () => {
      const base = defaultTemplate();
      const id = uid();
      const next = { ...base, id, templateId: id, cloudTemplateId: "", cloudId: "", templateSource: "local", source: "local", name: "新字幕模板", updatedAt: nowTs() };
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

    stplDup?.addEventListener("click", () => {
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

    stplDel?.addEventListener("click", async () => {
      if (!active || active.id === "system") return;
      const id = String(active.id || "");
      const source = getTemplateSource(active);
      const ok = await confirmDialog({
        title: source === "cloud" ? "删除云端模板" : "删除本地模板",
        message:
          source === "cloud"
            ? `确认删除云端字幕模板“${active.name || id}”？删除后会同步从云数据中移除。`
            : `确认删除本地字幕模板“${active.name || id}”？`,
        confirmText: source === "cloud" ? "确认删除云端" : "确认删除",
        cancelText: "取消",
        tone: "warn"
      });
      if (!ok) return;
      if (source === "cloud") {
        const res = await deleteTemplateFromCloud("subtitle", active);
        if (!res?.ok) {
          toast(String(res?.errMsg || "删除云端字幕模板失败。"), "warn");
          return;
        }
        activeId = "system";
        state.activeId = activeId;
        await syncCloudTemplateList({ silent: true });
        toast("云端字幕模板已删除。", "success");
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

    stplSave?.addEventListener("click", async () => {
      if (!active || !dirty) return;
      await saveActiveTemplate();
    });

    stplName?.addEventListener("input", () => {
      if (!active) return;
      updateActive({ name: String(stplName.value || "") }, { refreshList: true, groupKey: "base-name" });
    });

    const applyHistorySnapshot = (snapshot) => {
      if (!snapshot || !active) return;
      active = normalizeTemplateShape(snapshot);
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
    stplUndo?.addEventListener("click", triggerUndo);
    stplRedo?.addEventListener("click", triggerRedo);
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

    const nav = root.querySelector("#stpl-nav");
    const scroll = root.querySelector("#stpl-scroll");
    if (nav && scroll) {
      const buttons = Array.from(nav.querySelectorAll(".stpl-nav-item[data-sec]"));
      const sections = Array.from(scroll.querySelectorAll(".stpl-section[data-sec]"));
      const secById = Object.fromEntries(sections.map((s) => [String(s.getAttribute("data-sec") || ""), s]));
      const setActiveSec = (sec) => {
        const id = String(sec || "").trim();
        buttons.forEach((b) => b.classList.toggle("is-active", String(b.getAttribute("data-sec") || "") === id));
        sections.forEach((s) => (s.hidden = String(s.getAttribute("data-sec") || "") !== id));
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
