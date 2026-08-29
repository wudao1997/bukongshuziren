// 发布管理页面：负责发布草稿编辑、网页填表自动化按钮区、发布日志与交互编排。
import { elFromHTML, pageHeader, topToast } from "../ui.js";
import { syncPageModuleVisibility, startPageModuleVisibilityLiveSync } from "../gongneng/yemianmokuaiyunkong.js";
import { chuangjianDakaiChromeFabuyeHandler } from "../gongneng/fabuguanli/dakaichromefabuye.js";
import { chuangjianDakaiEdgeFabuyeHandler } from "../gongneng/fabuguanli/dakaiedgefabuye.js";
import { chuangjianTongBuBiaoTiHandler } from "../gongneng/fabuguanli/tongbutiaoti.js";
import { chuangjianTongBuJianJieHandler } from "../gongneng/fabuguanli/tongbujianjie.js";
import { chuangjianTongBuHuaTiHandler } from "../gongneng/fabuguanli/tongbuhuati.js";
import { chuangjianTongBuShiPinHandler } from "../gongneng/fabuguanli/tongbushipin.js";
import { chuangjianTongBuFengMianHandler } from "../gongneng/fabuguanli/tongbufengmian.js";
import { chuangjianTongBuFaBuShiJianHandler } from "../gongneng/fabuguanli/tongbufabushijian.js";
import { chuangjianBaoCunQuanXianSheZhiHandler } from "../gongneng/fabuguanli/baocunquanxianshezhi.js";

export const route = {
  path: "/publish",
  title: "发布管理",
  async render() {
    const PUBLISH_MODULE_VISIBILITY_DEFAULTS = {
      draftEditor: true,
      publishLog: true,
      webAutomation: true
    };
    const root = elFromHTML(`
      <div>
        ${pageHeader({
          title: `发布管理 <span class="pill" id="pub-net-speed">网速：--</span>`,
          subtitle: "多平台账号与发布队列：草稿/定时/失败重试/发布日志",
          actionsHTML: `
            <button class="btn btn-primary" id="btn-new">新建发布</button>
            <button class="btn" id="btn-sync">同步首页</button>
            <button class="btn" id="btn-accounts">账号管理</button>
          `
        })}

        <div class="grid cols-2">
          <div class="card" data-cloud-module="draftEditor">
            <div class="card-title"><h3>发布草稿</h3><span class="pill" id="pub-draft-status">未加载</span></div>
            <div class="form">
              <div class="field">
                <div class="inline-flags" style="justify-content: space-between">
                  <div class="label">账号</div>
                  <button class="module-link" id="pub-to-accounts" type="button">去账号管理</button>
                </div>
                <div class="grid cols-2" style="gap: 10px; margin-top: 8px">
                  <div class="field" style="margin: 0">
                    <div class="label">平台</div>
                    <select id="pub-platform"></select>
                  </div>
                  <div class="field" style="margin: 0">
                    <div class="label">账号</div>
                    <select id="pub-account"></select>
                  </div>
                </div>
              </div>
              <div class="field" style="margin-top: 10px">
                <div class="inline-flags" style="justify-content: space-between">
                  <div class="label">视频</div>
                  <div class="inline-flags" style="gap: 8px">
                    <span class="pill" id="pub-video-source-pill">来源：未选择</span>
                  </div>
                </div>
                <div class="pub-media-row" style="margin-top: 8px">
                  <input id="pub-video" type="text" placeholder="点击“添加视频”选择来源（首页/本地）" />
                  <button class="btn btn-primary" id="pub-video-add" type="button">添加视频</button>
                </div>
                <div class="pub-media-sub" id="pub-video-sub">建议：从首页获取可自动同步封面；本地上传可自动截帧或上传封面图。</div>
              </div>

              <div class="field" style="margin-top: 12px">
                <div class="inline-flags" style="justify-content: space-between">
                  <div class="label">封面</div>
                  <div class="inline-flags" style="gap: 8px">
                    <span class="pill" id="pub-cover-source-pill">来源：未设置</span>
                    <button class="btn" id="pub-cover-open" type="button" disabled>打开位置</button>
                  </div>
                </div>

                <div class="pub-cover-grid" style="margin-top: 10px">
                  <div class="pub-cover-preview" id="pub-cover-preview">
                    <div class="pub-cover-empty" id="pub-cover-empty">暂无封面预览：先添加视频，再选择同步/截帧/上传</div>
                    <img id="pub-cover-img" hidden />
                  </div>

                  <div class="pub-cover-ops">
                    <div class="seg-tabs" id="pub-cover-tabs">
                      <button class="seg-tab is-active" data-mode="auto" type="button">自动截帧</button>
                      <button class="seg-tab" data-mode="upload" type="button">本地上传</button>
                    </div>

                    <div class="pub-cover-panel" id="pub-cover-panel-home" hidden>
                      <div class="pub-cover-home-tip">
                        <div class="pill">视频来自首页：封面同步首页“封面制作”输出</div>
                        <button class="btn" id="pub-cover-to-home" type="button">去首页封面制作</button>
                        <button class="btn" id="pub-cover-sync-home" type="button">立即同步</button>
                      </div>
                    </div>

                    <div class="pub-cover-panel" id="pub-cover-panel-local">
                      <div class="pub-cover-actions" id="pub-cover-actions-auto">
                        <button class="select-like" id="pub-cover-tpl" type="button">
                          <span id="pub-cover-tpl-label">封面模板：系统封面模板（默认）</span>
                          <span class="caret">▾</span>
                        </button>
                        <div class="pub-cover-btns">
                          <button class="btn" id="pub-cover-manage" type="button">管理模板</button>
                          <button class="btn btn-primary" id="pub-cover-generate" type="button">截帧生成</button>
                        </div>
                      </div>

                      <div class="pub-cover-actions" id="pub-cover-actions-upload" hidden>
                        <div class="pub-cover-upload-tip">选择本地图片作为封面（支持 png/jpg/webp 等）</div>
                        <div class="pub-cover-btns">
                          <button class="btn" id="pub-cover-clear" type="button">清除封面</button>
                          <button class="btn btn-primary" id="pub-cover-upload" type="button">上传封面</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="grid cols-2" style="gap: 10px; margin-top: 10px">
                <div class="field">
                  <div class="label">标题</div>
                  <input id="pub-title" type="text" placeholder="标题" />
                </div>
                <div class="field">
                  <div class="label">话题/标签</div>
                  <input id="pub-tags" type="text" placeholder="逗号分隔" />
                </div>
              </div>
              <div class="field" style="margin-top: 10px">
                <div class="label">作品简介</div>
                <textarea id="pub-desc" placeholder="用于网页填表/一键发布自动填表（可选）"></textarea>
              </div>
              <div class="grid cols-2" style="gap: 10px; margin-top: 10px">
                <div class="field">
                  <div class="inline-flags" style="justify-content: space-between">
                    <div class="label">发布时间</div>
                    <div class="seg-tabs pub-time-tabs" id="pub-time-tabs">
                      <button class="seg-tab is-active" data-mode="now" type="button">立即发布</button>
                      <button class="seg-tab" data-mode="schedule" type="button">定时发布</button>
                    </div>
                  </div>
                  <div class="pub-time-row" style="margin-top: 8px">
                    <input id="pub-schedule" type="text" placeholder="立即发布" readonly />
                    <button class="btn" id="pub-schedule-pick" type="button">设置时间</button>
                  </div>
                </div>
                <div class="field">
                  <div class="label">备注</div>
                  <input id="pub-note" type="text" placeholder="例如：测试号/矩阵1" />
                </div>
              </div>
              <div class="card-actions" style="margin-top: 12px; justify-content: space-between">
                <div class="pub-draft-filebar">
                  <button class="btn" id="pub-save" type="button">保存草稿</button>
                  <div class="pub-draft-loadbar">
                    <select id="pub-file-draft-select"></select>
                    <button class="btn" id="pub-file-draft-load" type="button">读取草稿</button>
                    <button class="btn" id="pub-file-draft-open" type="button" title="打开草稿文件夹">打开</button>
                    <button class="btn" id="pub-file-draft-refresh" type="button" title="刷新草稿列表">↻</button>
                  </div>
                </div>
                <div class="card-actions">
                  <button class="btn btn-primary" id="pub-oneclick" type="button">一键发布</button>
                </div>
              </div>
            </div>
          </div>

          <div class="card" data-cloud-module="publishLog">
            <div class="card-title"><h3>发布日志</h3><span class="pill">可观测性</span></div>
            <div class="log-box" id="pub-log" style="height: 420px"></div>
            <div class="card-actions" style="margin-top: 10px; justify-content: space-between">
              <button class="btn" id="pub-log-clear">清空</button>
              <button class="btn" id="pub-log-copy">复制</button>
            </div>
          </div>

          <div class="card pub-webtest" style="margin-top: 12px" data-cloud-module="webAutomation">
            <div class="card-title"><h3>网页填表</h3><span class="pill">逐项测试</span></div>
            <div class="pub-webtest-notice">
              <span class="pub-webtest-chip">简介同步：先清空后逐字输入</span>
              <span class="pub-webtest-chip">编辑器兼容：过滤隐藏占位字符</span>
              <span class="pub-webtest-chip">话题同步：极致模拟真人删除与慢速输入</span>
              <span class="pub-webtest-chip">封面弹窗：按精确选择器优先自动关闭</span>
              <span class="pub-webtest-chip">封面选择：无系统文件框</span>
              <span class="pub-webtest-chip">格式：#话题 空格</span>
              <span class="pub-webtest-chip">节奏：每个字符间隔500ms</span>
            </div>
            <div class="pub-webtest-grid">
              <button class="btn btn-primary" id="pub-web-open" type="button">打开Chrome发布页</button>
              <button class="btn btn-soft" id="pub-web-open-edge" type="button">打开Edge发布页</button>
              <button class="btn" id="pub-web-speed" type="button">网速测试</button>
              <button class="btn" id="pub-web-title" type="button">同步标题</button>
              <button class="btn" id="pub-web-desc" type="button">同步简介</button>
              <button class="btn" id="pub-web-tags" type="button">同步话题</button>
              <button class="btn" id="pub-web-video" type="button">同步视频</button>
              <button class="btn" id="pub-web-cover" type="button">同步封面</button>
              <button class="btn" id="pub-web-schedule" type="button">同步发布时间</button>
              <button class="btn btn-danger" id="pub-web-publish" type="button">发布</button>
              <button class="btn" id="pub-web-close" type="button">关闭网页</button>
              <button class="btn" id="pub-web-saveperm" type="button">保存权限设置</button>
            </div>
            <div class="empty" style="margin-top: 10px">说明：先用 Chrome 或 Edge 打开并建立网页会话，再逐项验证自动化。快手已接入：同步视频、同步话题（标题+简介+前3个话题）、同步封面、同步发布时间、发布；视频号已接入：同步视频、同步封面、同步话题（标题+简介+话题）、同步发布时间、发布；其中快手和视频号的“同步标题/同步简介/保存权限设置”按钮不单独执行，请使用“同步话题”统一写入。</div>
          </div>
        </div>

        <div class="modal-overlay" id="pub-sched-overlay" hidden></div>
        <div class="modal pub-sched-modal" id="pub-sched-modal" hidden>
          <div class="modal-head">
            <div class="modal-title">定时发布</div>
            <button class="modal-close" id="pub-sched-close" title="关闭">×</button>
          </div>
          <div class="modal-body">
            <div class="pub-sched-grid">
              <div class="field">
                <div class="label">选择发布时间</div>
                <input id="pub-sched-date" type="date" />
              </div>
              <div class="field">
                <div class="label">选择时间</div>
                <div class="pub-sched-time">
                  <select id="pub-sched-hh"></select>
                  <select id="pub-sched-mm"></select>
                  <select id="pub-sched-ss"></select>
                </div>
              </div>
            </div>
            <div class="pub-sched-tip" id="pub-sched-tip"></div>
          </div>
          <div class="modal-foot" style="justify-content: space-between">
            <div class="card-actions">
              <button class="btn" id="pub-sched-now">最早(2小时后)</button>
              <button class="btn" id="pub-sched-max">最晚(14天)</button>
            </div>
            <div class="card-actions">
              <button class="btn" id="pub-sched-clear">清除</button>
              <button class="btn btn-primary" id="pub-sched-ok">确定</button>
            </div>
          </div>
        </div>

        <div class="modal-overlay" id="pub-video-overlay" hidden></div>
        <div class="modal pub-video-modal" id="pub-video-modal" hidden>
          <div class="modal-head">
            <div class="modal-title">添加视频</div>
            <button class="modal-close" id="pub-video-close" title="关闭">×</button>
          </div>
          <div class="modal-body">
            <div class="pub-video-pick-grid">
              <div class="pub-video-pick-card">
                <div class="pub-video-pick-title">从首页获取</div>
                <div class="pub-video-pick-sub">自动带入首页“字幕和音乐”合成成片路径，并同步首页“封面制作”封面</div>
                <button class="btn btn-primary" id="pub-video-from-home" type="button">选择</button>
              </div>
              <div class="pub-video-pick-card">
                <div class="pub-video-pick-title">从本地上传</div>
                <div class="pub-video-pick-sub">选择本地视频文件；封面可自动截帧（前5秒随机一帧+模板）或本地上传</div>
                <button class="btn" id="pub-video-from-local" type="button">选择</button>
              </div>
            </div>
          </div>
          <div class="modal-foot">
            <button class="btn" id="pub-video-cancel">取消</button>
          </div>
        </div>

        <div class="modal-overlay" id="pub-cover-tpl-overlay" hidden></div>
        <div class="modal pub-cover-tpl-modal" id="pub-cover-tpl-modal" hidden>
          <div class="modal-head">
            <div class="modal-title">选择封面模板</div>
            <button class="modal-close" id="pub-cover-tpl-close" title="关闭">×</button>
          </div>
          <div class="modal-body">
            <div class="card-actions" style="justify-content: space-between">
              <span class="pill">选择后用于“自动截帧生成”</span>
              <button class="btn" id="pub-cover-tpl-to-manage" type="button">管理封面模板</button>
            </div>
            <div class="cover-tpl-grid" id="pub-cover-tpl-grid" style="margin-top: 12px"></div>
          </div>
          <div class="modal-foot" style="justify-content: space-between">
            <button class="btn" id="pub-cover-tpl-cancel">取消</button>
            <button class="btn btn-primary" id="pub-cover-tpl-ok">确定</button>
          </div>
        </div>

        <div class="modal-overlay" id="pub-save-overlay" hidden></div>
        <div class="modal pub-save-modal" id="pub-save-modal" hidden>
          <div class="modal-head">
            <div class="modal-title">保存草稿</div>
            <button class="modal-close" id="pub-save-close" title="关闭">×</button>
          </div>
          <div class="modal-body">
            <div class="field">
              <div class="label">草稿名称</div>
              <input id="pub-save-name" type="text" placeholder="例如：2026-06-04_标题" />
              <div class="pub-save-sub" id="pub-save-sub">默认：日期 + 标题；保存后会写入本地草稿目录。</div>
            </div>
          </div>
          <div class="modal-foot" style="justify-content: space-between">
            <button class="btn" id="pub-save-cancel" type="button">取消</button>
            <button class="btn btn-primary" id="pub-save-ok" type="button">保存</button>
          </div>
        </div>
      </div>
    `);
    const visibilitySyncOptions = {
      cloudObjectName: "fabuguanlicaidanyemian",
      defaultModules: PUBLISH_MODULE_VISIBILITY_DEFAULTS,
      scene: "desktop"
    };
    await syncPageModuleVisibility(root, visibilitySyncOptions);
    startPageModuleVisibilityLiveSync(root, { ...visibilitySyncOptions, intervalMs: 4000 });

    const toast = (msg, type) => topToast(msg, { type: type || "info" });
    const appendTestLog = (level, message) => {
      try {
        const p = window.api?.testLog?.append?.({ source: "发布管理", level: String(level || "info"), message: String(message || "") });
        if (p && typeof p.catch === "function") p.catch(() => {});
      } catch {}
    };
    const logBox = root.querySelector("#pub-log");
    const pushLog = (level, message) => {
      const now = new Date();
      const pad = (n) => String(n).padStart(2, "0");
      const ts = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
      const line = document.createElement("div");
      line.className = `log-line level-${String(level || "info")}`;
      line.textContent = `[${ts}][${String(level || "info")}] ${String(message || "")}`;
      logBox.appendChild(line);
      logBox.scrollTop = logBox.scrollHeight;
      appendTestLog(level, message);
    };
    const feedback = (message, type, level) => {
      const lv = String(level || (type === "error" ? "error" : type === "warn" ? "warn" : "info"));
      pushLog(lv, message);
      toast(message, type || "info");
    };
    try {
      const p = window.api?.testLog?.ensure?.();
      if (p && typeof p.catch === "function") p.catch(() => {});
    } catch {}

    root.querySelector("#btn-new").addEventListener("click", () => {
      localStorage.removeItem("ipfactory.publish.draft.v1");
      toast("已清空草稿。", "success");
      window.location.reload();
    });
    const btnSync = root.querySelector("#btn-sync");
    root.querySelector("#btn-accounts").addEventListener("click", () => {
      window.location.hash = "#/accounts";
    });
    root.querySelector("#pub-to-accounts").addEventListener("click", () => (window.location.hash = "#/accounts"));

    const KEY = "ipfactory.publish.draft.v1";
    const draftStatus = root.querySelector("#pub-draft-status");
    const platformSel = root.querySelector("#pub-platform");
    const accSel = root.querySelector("#pub-account");
    const videoInput = root.querySelector("#pub-video");
    const videoSub = root.querySelector("#pub-video-sub");
    const videoSourcePill = root.querySelector("#pub-video-source-pill");
    const btnVideoAdd = root.querySelector("#pub-video-add");
    const titleInput = root.querySelector("#pub-title");
    const tagsInput = root.querySelector("#pub-tags");
    const descInput = root.querySelector("#pub-desc");
    const scheduleInput = root.querySelector("#pub-schedule");
    const btnSchedulePick = root.querySelector("#pub-schedule-pick");
    const timeTabs = root.querySelector("#pub-time-tabs");
    const noteInput = root.querySelector("#pub-note");
    const btnSave = root.querySelector("#pub-save");
    const btnOneClick = root.querySelector("#pub-oneclick");
    const fileDraftSelect = root.querySelector("#pub-file-draft-select");
    const btnFileDraftLoad = root.querySelector("#pub-file-draft-load");
    const btnFileDraftOpen = root.querySelector("#pub-file-draft-open");
    const btnFileDraftRefresh = root.querySelector("#pub-file-draft-refresh");
    const btnLogClear = root.querySelector("#pub-log-clear");
    const btnLogCopy = root.querySelector("#pub-log-copy");
    const coverSourcePill = root.querySelector("#pub-cover-source-pill");
    const coverPreview = root.querySelector("#pub-cover-preview");
    const coverEmpty = root.querySelector("#pub-cover-empty");
    const coverImg = root.querySelector("#pub-cover-img");
    const btnCoverOpen = root.querySelector("#pub-cover-open");
    const coverTabs = root.querySelector("#pub-cover-tabs");
    const coverPanelHome = root.querySelector("#pub-cover-panel-home");
    const coverPanelLocal = root.querySelector("#pub-cover-panel-local");
    const btnCoverToHome = root.querySelector("#pub-cover-to-home");
    const btnCoverSyncHome = root.querySelector("#pub-cover-sync-home");
    const btnCoverTpl = root.querySelector("#pub-cover-tpl");
    const coverTplLabel = root.querySelector("#pub-cover-tpl-label");
    const btnCoverManage = root.querySelector("#pub-cover-manage");
    const btnCoverGenerate = root.querySelector("#pub-cover-generate");
    const coverActionsAuto = root.querySelector("#pub-cover-actions-auto");
    const coverActionsUpload = root.querySelector("#pub-cover-actions-upload");
    const btnCoverUpload = root.querySelector("#pub-cover-upload");
    const btnCoverClear = root.querySelector("#pub-cover-clear");
    const pubVideoOverlay = root.querySelector("#pub-video-overlay");
    const pubVideoModal = root.querySelector("#pub-video-modal");
    const pubVideoClose = root.querySelector("#pub-video-close");
    const pubVideoCancel = root.querySelector("#pub-video-cancel");
    const pubVideoFromHome = root.querySelector("#pub-video-from-home");
    const pubVideoFromLocal = root.querySelector("#pub-video-from-local");
    const pubCoverTplOverlay = root.querySelector("#pub-cover-tpl-overlay");
    const pubCoverTplModal = root.querySelector("#pub-cover-tpl-modal");
    const pubCoverTplClose = root.querySelector("#pub-cover-tpl-close");
    const pubCoverTplCancel = root.querySelector("#pub-cover-tpl-cancel");
    const pubCoverTplOk = root.querySelector("#pub-cover-tpl-ok");
    const pubCoverTplGrid = root.querySelector("#pub-cover-tpl-grid");
    const pubCoverTplToManage = root.querySelector("#pub-cover-tpl-to-manage");
    const pubSaveOverlay = root.querySelector("#pub-save-overlay");
    const pubSaveModal = root.querySelector("#pub-save-modal");
    const pubSaveClose = root.querySelector("#pub-save-close");
    const pubSaveCancel = root.querySelector("#pub-save-cancel");
    const pubSaveOk = root.querySelector("#pub-save-ok");
    const pubSaveName = root.querySelector("#pub-save-name");

    const readDraft = () => {
      try {
        const raw = localStorage.getItem(KEY);
        const obj = JSON.parse(raw || "{}");
        return obj && typeof obj === "object" ? obj : {};
      } catch {
        return {};
      }
    };
    const writeDraft = (obj) => {
      try {
        localStorage.setItem(KEY, JSON.stringify(obj || {}, null, 2));
      } catch {}
    };

    const HOME_SUB_BGM_KEY = "ipfactory.home.subBgm.v1";
    const HOME_INPUTS_KEY = "ipfactory.home.inputs.v1";
    const HOME_SCHEDULE_KEY = "ipfactory.home.publish.scheduleAt.v1";
    const HOME_COVER_KEY = "ipfactory.home.cover.v1";
    const HOME_EDIT_KEY = "ipfactory.home.videoEdit.v1";
    const COVER_TPL_KEY = "ipfactory.cover.templates.v1";
    const readJson = (k, fallback) => {
      try {
        const raw = localStorage.getItem(String(k || ""));
        const obj = JSON.parse(raw || "null");
        return obj === null || obj === undefined ? fallback : obj;
      } catch {
        return fallback;
      }
    };
    const readHomeLastVideoPath = () => {
      const st = readJson(HOME_SUB_BGM_KEY, {});
      return String(st?.lastOutPath || "").trim();
    };
    const readHomeEditedVideoPath = () => {
      const st = readJson(HOME_EDIT_KEY, {});
      return String(st?.outputVideo || "").trim();
    };
    const readHomeMetaTitle = () => {
      const mem = readJson(HOME_INPUTS_KEY, {});
      return String(mem?.["meta-title"] || "").trim();
    };
    const readHomeMetaTags = () => {
      const mem = readJson(HOME_INPUTS_KEY, {});
      return String(mem?.["meta-tags"] || "").trim();
    };
    const normalizeTags = (raw) => {
      return String(raw || "")
        .replace(/[，\n\r]/g, ",")
        .split(",")
        .map((x) => String(x || "").trim())
        .filter(Boolean)
        .join(",");
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

    const readHomeCoverState = () => {
      try {
        const raw = localStorage.getItem(HOME_COVER_KEY);
        const obj = JSON.parse(raw || "{}");
        return obj && typeof obj === "object" ? obj : {};
      } catch {
        return {};
      }
    };
    const writeHomeCoverState = (obj) => {
      try {
        localStorage.setItem(HOME_COVER_KEY, JSON.stringify(obj || {}, null, 2));
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
    const ensureCoverTplList = () => {
      const templates = readCoverTplStore();
      const sys = templates.find((t) => String(t?.id || "") === "system") || { id: "system", name: "系统封面模板（默认）" };
      return [sys, ...templates.filter((t) => String(t?.id || "") !== "system")];
    };
    const getCoverTplById = (id) => {
      const list = ensureCoverTplList();
      const hit = list.find((t) => String(t?.id || "") === String(id || ""));
      return hit || list[0] || { id: "system", name: "系统封面模板（默认）" };
    };
    const getFirstTag = () => {
      const raw = String(tagsInput?.value || "").trim();
      if (!raw) return "";
      return raw
        .split(/[，,]/g)
        .map((x) => String(x || "").trim())
        .filter(Boolean)[0] || "";
    };

    let videoSource = "";
    let coverMode = "auto";
    let coverSource = "";
    let coverPath = "";
    let coverTemplateId = "system";
    let coverGenerating = false;
    let fileDraftItems = [];
    let fileDraftSelectedId = "";
    let accountsCache = [];
    let publishTimeMode = "now";

    const setVideoSource = (src) => {
      videoSource = String(src || "").trim();
      if (videoSourcePill) {
        const map = { home: "来源：首页", local: "来源：本地" };
        videoSourcePill.textContent = map[videoSource] || "来源：未选择";
      }
      renderCoverMode();
    };
    const setCoverSource = (src) => {
      coverSource = String(src || "").trim();
      if (coverSourcePill) {
        const map = { home: "来源：首页同步", auto: "来源：自动截帧", upload: "来源：本地上传" };
        coverSourcePill.textContent = map[coverSource] || (coverPath ? "来源：已设置" : "来源：未设置");
      }
    };
    const setCoverPreview = (p, src) => {
      const fp = String(p || "").trim();
      coverPath = fp;
      if (src !== undefined) setCoverSource(src);
      if (!coverImg || !coverEmpty) return;
      if (!fp) {
        coverImg.hidden = true;
        coverImg.removeAttribute("src");
        coverEmpty.hidden = false;
        if (coverPreview) coverPreview.style.aspectRatio = "9 / 16";
        if (btnCoverOpen) btnCoverOpen.disabled = true;
        return;
      }
      const url = toFileUrl(fp);
      coverImg.onload = () => {
        try {
          const w = Number(coverImg.naturalWidth || 0) || 0;
          const h = Number(coverImg.naturalHeight || 0) || 0;
          if (w > 0 && h > 0 && coverPreview) coverPreview.style.aspectRatio = `${w} / ${h}`;
        } catch {}
      };
      coverImg.src = url;
      coverImg.hidden = false;
      coverEmpty.hidden = true;
      if (btnCoverOpen) btnCoverOpen.disabled = false;
    };
    const setCoverTemplate = (id) => {
      coverTemplateId = String(id || "system") || "system";
      const tpl = getCoverTplById(coverTemplateId);
      if (coverTplLabel) coverTplLabel.textContent = `封面模板：${String(tpl?.name || tpl?.id || "system")}`;
    };

    const renderCoverMode = () => {
      const isHome = videoSource === "home";
      if (coverPanelHome) coverPanelHome.hidden = !isHome;
      if (coverPanelLocal) coverPanelLocal.hidden = false;
      if (coverTabs) coverTabs.style.opacity = "1";
      if (coverActionsAuto) coverActionsAuto.hidden = coverMode !== "auto";
      if (coverActionsUpload) coverActionsUpload.hidden = coverMode !== "upload";
      if (btnCoverGenerate) btnCoverGenerate.disabled = !String(videoInput?.value || "").trim();
      if (btnCoverUpload) btnCoverUpload.disabled = false;
      if (btnCoverClear) btnCoverClear.disabled = !coverPath;
    };

    const loadAccounts = async () => {
      try {
        const res = await window.api?.accounts?.list?.();
        const items = res?.ok && Array.isArray(res.items) ? res.items : [];
        accountsCache = items.map((x) => (x && typeof x === "object" ? x : {})).filter((x) => String(x.id || "").trim());
      } catch {}
      renderPlatformOptions();
      renderAccountOptions();
    };
    const refreshAccountsKeepingSelection = async (platform, accountId) => {
      const plat = String(platform || "").trim();
      const acc = String(accountId || "").trim();
      await loadAccounts();
      if (plat && platformSel) platformSel.value = plat;
      renderAccountOptions();
      if (acc && accSel) accSel.value = acc;
    };
    const ensureAccountReadyForPublish = async (platform, accountId) => {
      const plat = String(platform || "").trim();
      const acc = String(accountId || "").trim();
      if (!plat || !acc) return false;
      try {
        const res = await window.api?.accounts?.test?.({ id: acc });
        if (res?.ok && res?.valid) return true;
        await refreshAccountsKeepingSelection(plat, acc);
        clearWebTestSession();
        const msg = "当前发布页检测到该账号未登录，请先回到账号管理重新登入账号。";
        pushLog("warn", msg);
        toast(msg, "warn");
        return false;
      } catch (e) {
        const msg = `账号校验失败：${String(e?.message || e)}`;
        pushLog("error", msg);
        toast(msg, "error");
        return false;
      }
    };

    const platformLabel = (p) => {
      const v = String(p || "").trim();
      if (v === "douyin") return "抖音";
      if (v === "kuaishou") return "快手";
      if (v === "xiaohongshu") return "小红书";
      if (v === "shipinhao") return "视频号";
      return v || "—";
    };

    const getSelectedPlatform = () => String(platformSel?.value || "").trim();

    const renderPlatformOptions = () => {
      if (!platformSel) return;
      const cur = String(platformSel.value || "").trim();
      const plats = Array.from(new Set(accountsCache.map((x) => String(x.platform || "").trim()).filter(Boolean)));
      const order = ["douyin", "kuaishou", "xiaohongshu", "shipinhao"];
      plats.sort((a, b) => {
        const ia = order.indexOf(a);
        const ib = order.indexOf(b);
        if (ia >= 0 && ib >= 0) return ia - ib;
        if (ia >= 0) return -1;
        if (ib >= 0) return 1;
        return a.localeCompare(b);
      });
      platformSel.innerHTML = "";
      const o0 = document.createElement("option");
      o0.value = "";
      o0.textContent = "选择平台";
      platformSel.appendChild(o0);
      plats.forEach((p) => {
        const o = document.createElement("option");
        o.value = p;
        o.textContent = platformLabel(p);
        platformSel.appendChild(o);
      });
      const next = cur && plats.includes(cur) ? cur : "";
      platformSel.value = next;
    };

    const renderAccountOptions = () => {
      if (!accSel) return;
      const cur = String(accSel.value || "").trim();
      const plat = getSelectedPlatform();
      const list = plat ? accountsCache.filter((x) => String(x.platform || "").trim() === plat) : [];
      accSel.innerHTML = "";
      const o0 = document.createElement("option");
      o0.value = "";
      o0.textContent = plat ? "选择账号" : "请先选择平台";
      accSel.appendChild(o0);
      list.forEach((it) => {
        const o = document.createElement("option");
        o.value = String(it.id || "");
        o.textContent = String(it.name || it.id || "").trim() || String(it.id || "");
        accSel.appendChild(o);
      });
      const next = cur && list.some((x) => String(x.id || "") === cur) ? cur : "";
      accSel.value = next;
    };

    const applyDraftToUi = (d) => {
      const has = Boolean(d && (d.accountId || d.videoPath || d.title || d.tags));
      draftStatus.textContent = has ? "已加载" : "空草稿";
      if (d.platform && platformSel) platformSel.value = String(d.platform || "");
      renderAccountOptions();
      if (d.accountId) accSel.value = String(d.accountId || "");
      if (d.videoPath) videoInput.value = String(d.videoPath || "");
      if (d.title) titleInput.value = String(d.title || "");
      if (d.tags) tagsInput.value = String(d.tags || "");
      if (d.desc) descInput.value = String(d.desc || "");
      if (d.publishTimeMode) setPublishTimeMode(String(d.publishTimeMode || "now"), { silent: true });
      else if (String(d.scheduleAt || "").trim()) setPublishTimeMode("schedule", { silent: true });
      else setPublishTimeMode("now", { silent: true });
      if (String(d.scheduleAt || "").trim()) scheduleInput.value = String(d.scheduleAt || "");
      if (d.note) noteInput.value = String(d.note || "");
      setVideoSource(d.videoSource || "");
      setCoverTemplate(d.coverTemplateId || "system");
      if (d.coverPath) setCoverPreview(String(d.coverPath || ""), d.coverSource || "");
      if (d.coverMode) setCoverMode(String(d.coverMode || "auto"));
    };

    const buildDraftFromUi = () => {
      const scheduleAt = publishTimeMode === "schedule" ? String(scheduleInput?.value || "").trim() : "";
      return {
        createdAt: Date.now(),
        platform: String(platformSel?.value || "").trim(),
        accountId: String(accSel.value || ""),
        videoPath: String(videoInput.value || "").trim(),
        videoSource: String(videoSource || ""),
        coverPath: String(coverPath || "").trim(),
        coverSource: String(coverSource || ""),
        coverTemplateId: String(coverTemplateId || "system"),
        coverMode: String(coverMode || "auto"),
        title: String(titleInput.value || "").trim(),
        tags: String(tagsInput.value || "").trim(),
        desc: String(descInput?.value || "").trim(),
        publishTimeMode: String(publishTimeMode || "now"),
        scheduleAt,
        note: String(noteInput.value || "").trim()
      };
    };

    const fmtDate = (d) => {
      const pad = (n) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    };
    const defaultDraftName = () => {
      const date = fmtDate(new Date());
      const t = String(titleInput?.value || "").trim() || readHomeMetaTitle();
      const base = t ? `${date}_${t}` : `${date}_发布草稿`;
      return base.replace(/\s+/g, " ").trim();
    };
    const openSaveModal = () => {
      if (!pubSaveOverlay || !pubSaveModal || !pubSaveName) return;
      pubSaveName.value = defaultDraftName();
      openModal(pubSaveOverlay, pubSaveModal);
      try {
        pubSaveName.focus();
        pubSaveName.select();
      } catch {}
    };
    const closeSaveModal = () => closeModal(pubSaveOverlay, pubSaveModal);

    const renderFileDraftSelect = () => {
      if (!fileDraftSelect) return;
      const cur = String(fileDraftSelectedId || fileDraftSelect.value || "").trim();
      fileDraftSelect.innerHTML = "";
      const o0 = document.createElement("option");
      o0.value = "";
      o0.textContent = fileDraftItems.length ? "选择已保存草稿…" : "暂无已保存草稿";
      fileDraftSelect.appendChild(o0);
      fileDraftItems.forEach((it) => {
        const o = document.createElement("option");
        o.value = String(it.id || "");
        o.textContent = String(it.name || it.id || "");
        fileDraftSelect.appendChild(o);
      });
      const next = cur && fileDraftItems.some((x) => String(x.id || "") === cur) ? cur : "";
      fileDraftSelectedId = next;
      fileDraftSelect.value = next;
      if (btnFileDraftLoad) btnFileDraftLoad.disabled = !fileDraftSelect.value;
      if (btnFileDraftOpen) btnFileDraftOpen.disabled = !fileDraftSelect.value;
    };
    const refreshFileDrafts = async (preferSelectId) => {
      try {
        const res = await window.api?.publishDraft?.list?.();
        const items = res?.ok && Array.isArray(res.items) ? res.items : [];
        fileDraftItems = items.map((x) => (x && typeof x === "object" ? x : {}));
        if (preferSelectId) fileDraftSelectedId = String(preferSelectId || "").trim();
      } catch {
        fileDraftItems = [];
      }
      renderFileDraftSelect();
    };

    btnSave?.addEventListener("click", openSaveModal);
    pubSaveClose?.addEventListener("click", closeSaveModal);
    pubSaveCancel?.addEventListener("click", closeSaveModal);
    pubSaveOverlay?.addEventListener("click", closeSaveModal);
    pubSaveOk?.addEventListener("click", async () => {
      const name = String(pubSaveName?.value || "").trim() || defaultDraftName();
      const next = buildDraftFromUi();
      writeDraft(next);
      try {
        const res = await window.api?.publishDraft?.save?.({ name, draft: next });
        if (!res?.ok) {
          toast(String(res?.message || "保存失败"), "error");
          return;
        }
        draftStatus.textContent = "已保存";
        toast("草稿已保存。", "success");
        pushLog("info", `草稿已保存到本地：${String(res?.name || name)}`);
        await refreshFileDrafts(String(res?.id || ""));
        closeSaveModal();
      } catch (e) {
        toast("保存失败。", "error");
        pushLog("error", String(e?.message || e));
      }
    });

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
    const maxScheduleParts = () => {
      const maxTs = Date.now() + 14 * 24 * 60 * 60 * 1000;
      const d = new Date(maxTs);
      d.setSeconds(0, 0);
      return tsToParts(d.getTime());
    };
    const clampToScheduleRange = (p) => {
      const curTs = partsToTs(p);
      const minP = minScheduleParts();
      const minTs = partsToTs(minP);
      const maxP = maxScheduleParts();
      const maxTs = partsToTs(maxP);
      if (!curTs || curTs < minTs) return minP;
      if (maxTs && curTs > maxTs) return maxP;
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

    const schedOverlay = root.querySelector("#pub-sched-overlay");
    const schedModal = root.querySelector("#pub-sched-modal");
    const schedClose = root.querySelector("#pub-sched-close");
    const schedDate = root.querySelector("#pub-sched-date");
    const schedHh = root.querySelector("#pub-sched-hh");
    const schedMm = root.querySelector("#pub-sched-mm");
    const schedSs = root.querySelector("#pub-sched-ss");
    const schedNow = root.querySelector("#pub-sched-now");
    const schedMax = root.querySelector("#pub-sched-max");
    const schedOk = root.querySelector("#pub-sched-ok");
    const schedClear = root.querySelector("#pub-sched-clear");
    const schedTip = root.querySelector("#pub-sched-tip");
    const fillSelect = (sel, max) => {
      sel.innerHTML = "";
      for (let i = 0; i <= max; i += 1) {
        const o = document.createElement("option");
        o.value = pad2(i);
        o.textContent = pad2(i);
        sel.appendChild(o);
      }
    };
    fillSelect(schedHh, 23);
    fillSelect(schedMm, 59);
    fillSelect(schedSs, 59);

    const fmtRangeTip = () => {
      const minP = minScheduleParts();
      const maxP = maxScheduleParts();
      return `可选范围：${fmtSchedule(minP.date, minP.hh, minP.mm, "00")} ~ ${fmtSchedule(maxP.date, maxP.hh, maxP.mm, "00")}（不超过14天）`;
    };
    const validateSchedPick = (opts) => {
      const silent = !!opts?.silent;
      const d = String(schedDate?.value || "").trim();
      const pick = d ? { date: d, hh: String(schedHh?.value || "00"), mm: String(schedMm?.value || "00"), ss: "00" } : null;
      const minP = minScheduleParts();
      const maxP = maxScheduleParts();
      const pickTs = partsToTs(pick);
      const minTs = partsToTs(minP);
      const maxTs = partsToTs(maxP);
      const ok = !!pickTs && pickTs >= minTs && (!maxTs || pickTs <= maxTs);
      if (schedTip) {
        schedTip.textContent = fmtRangeTip();
        schedTip.classList.toggle("is-warn", !ok);
      }
      if (schedOk) schedOk.disabled = !ok;
      if (!silent && d && !ok) toast("定时发布时间需在 2 小时后 ~ 14 天内。", "warn");
      return { ok, pickTs, minTs, maxTs, minP, maxP };
    };

    const openSchedulePicker = () => {
      if (publishTimeMode !== "schedule") setPublishTimeMode("schedule");
      const cur = clampToScheduleRange(parseSchedule(scheduleInput.value) || minScheduleParts());
      const minP = minScheduleParts();
      const maxP = maxScheduleParts();
      schedDate.value = cur.date;
      schedHh.value = cur.hh;
      schedMm.value = cur.mm;
      schedSs.value = cur.ss;
      try {
        schedDate.min = String(minP.date || "");
        schedDate.max = String(maxP.date || "");
      } catch {}
      if (schedTip) schedTip.textContent = fmtRangeTip();
      openModal(schedOverlay, schedModal);
      validateSchedPick({ silent: true });
    };
    const saveDraftFromUi = () => {
      const next = buildDraftFromUi();
      writeDraft(next);
    };

    const setPublishTimeMode = (mode, opts) => {
      const m = String(mode || "now");
      publishTimeMode = m === "schedule" ? "schedule" : "now";
      if (timeTabs) {
        Array.from(timeTabs.querySelectorAll(".seg-tab[data-mode]")).forEach((b) => {
          b.classList.toggle("is-active", String(b.getAttribute("data-mode") || "") === publishTimeMode);
        });
      }
      if (publishTimeMode === "now") {
        if (scheduleInput) scheduleInput.value = "";
        if (scheduleInput) scheduleInput.placeholder = "立即发布";
        if (btnSchedulePick) btnSchedulePick.disabled = true;
      } else {
        if (!String(scheduleInput?.value || "").trim()) scheduleInput.placeholder = "未设置";
        if (btnSchedulePick) btnSchedulePick.disabled = false;
      }
      if (!opts?.silent) saveDraftFromUi();
    };

    timeTabs?.addEventListener("click", (e) => {
      const btn = e?.target?.closest?.(".seg-tab[data-mode]");
      const mode = String(btn?.getAttribute?.("data-mode") || "");
      if (!mode) return;
      setPublishTimeMode(mode);
    });

    platformSel?.addEventListener("change", () => {
      renderAccountOptions();
      saveDraftFromUi();
    });
    accSel?.addEventListener("change", () => {
      const id = String(accSel.value || "").trim();
      const hit = accountsCache.find((x) => String(x.id || "") === id) || null;
      const plat = String(hit?.platform || "").trim();
      if (plat && platformSel && String(platformSel.value || "").trim() !== plat) {
        platformSel.value = plat;
        renderAccountOptions();
        accSel.value = id;
      }
      saveDraftFromUi();
    });
    btnSchedulePick?.addEventListener("click", openSchedulePicker);
    scheduleInput?.addEventListener("click", openSchedulePicker);
    schedClose?.addEventListener("click", () => closeModal(schedOverlay, schedModal));
    schedOverlay?.addEventListener("click", () => closeModal(schedOverlay, schedModal));
    schedNow?.addEventListener("click", () => {
      const cur = minScheduleParts();
      schedDate.value = cur.date;
      schedHh.value = cur.hh;
      schedMm.value = cur.mm;
      schedSs.value = cur.ss;
      validateSchedPick({ silent: true });
    });
    schedMax?.addEventListener("click", () => {
      const cur = maxScheduleParts();
      schedDate.value = cur.date;
      schedHh.value = cur.hh;
      schedMm.value = cur.mm;
      schedSs.value = cur.ss;
      validateSchedPick({ silent: true });
    });
    schedClear?.addEventListener("click", () => {
      scheduleInput.value = "";
      setPublishTimeMode("now");
      saveDraftFromUi();
      closeModal(schedOverlay, schedModal);
      toast("已切换为立即发布。", "success");
    });
    schedOk?.addEventListener("click", () => {
      const d = String(schedDate.value || "").trim();
      if (!d) {
        toast("请选择发布日期。", "warn");
        return;
      }
      const pick = { date: d, hh: String(schedHh.value || "00"), mm: String(schedMm.value || "00"), ss: "00" };
      if (schedSs) schedSs.value = "00";
      const minP = minScheduleParts();
      const maxP = maxScheduleParts();
      const pickTs = partsToTs(pick);
      const minTs = partsToTs(minP);
      const maxTs = partsToTs(maxP);
      if (!pickTs || pickTs < minTs) {
        schedDate.value = minP.date;
        schedHh.value = minP.hh;
        schedMm.value = minP.mm;
        schedSs.value = minP.ss;
        toast("抖音定时发布需至少晚于当前时间 2 小时。已自动调整到最早可用时间。", "warn");
        return;
      }
      if (maxTs && pickTs > maxTs) {
        schedDate.value = maxP.date;
        schedHh.value = maxP.hh;
        schedMm.value = maxP.mm;
        schedSs.value = maxP.ss;
        toast("定时发布最晚不超过 14 天。已自动调整到最晚可用时间。", "warn");
        return;
      }
      setPublishTimeMode("schedule");
      scheduleInput.value = fmtSchedule(pick.date, pick.hh, pick.mm, pick.ss);
      saveDraftFromUi();
      closeModal(schedOverlay, schedModal);
      toast("已设置定时发布时间。", "success");
    });

    schedDate?.addEventListener("change", () => validateSchedPick());
    schedHh?.addEventListener("change", () => validateSchedPick());
    schedMm?.addEventListener("change", () => validateSchedPick());

    btnSync?.addEventListener("click", () => {
      const videoPath = readHomeLastVideoPath();
      const title = readHomeMetaTitle();
      const tags = normalizeTags(readHomeMetaTags());
      const scheduleAt = String(readJson(HOME_SCHEDULE_KEY, "") || "").trim();
      if (!videoPath) {
        feedback("首页最终视频没有合成", "warn", "warn");
        return;
      }
      videoInput.value = videoPath;
      setVideoSource("home");
      feedback(`已加载首页最终视频：${videoPath}`, "success", "info");
      if (title) titleInput.value = title;
      if (tags) tagsInput.value = tags;
      if (scheduleAt) {
        setPublishTimeMode("schedule", { silent: true });
        scheduleInput.value = scheduleAt;
      } else {
        setPublishTimeMode("now", { silent: true });
        scheduleInput.value = "";
      }
      const hc = readHomeCoverState();
      const outPath = String(hc?.outPath || "").trim();
      const tplId = String(hc?.templateId || "").trim();
      if (tplId) setCoverTemplate(tplId);
      if (outPath) setCoverPreview(outPath, "home");
      saveDraftFromUi();
      draftStatus.textContent = "已同步";
      feedback("已从首页同步：成片路径/标题/话题/定时/封面（若存在）", "success", "info");
    });

    const toTagArray = (raw) => {
      return String(raw || "")
        .replace(/[，\n\r]/g, ",")
        .split(",")
        .map((x) => String(x || "").trim())
        .filter(Boolean);
    };

    const collectWebPayload = () => {
      const title = String(titleInput?.value || "").trim();
      const desc = String(descInput?.value || "").trim();
      const tags = toTagArray(tagsInput?.value || "").slice(0, 5);
      const scheduleAt = String(scheduleInput?.value || "").trim();
      const scheduleAtForWeb = (() => {
        if (publishTimeMode !== "schedule") return "";
        const p = parseSchedule(scheduleAt);
        if (!p) return scheduleAt;
        return fmtSchedule(p.date, p.hh, p.mm, "00");
      })();
      const homeCover = readHomeCoverState();
      const homeCoverPath = String(homeCover?.outPath || "").trim();
      const coverPathForWeb = coverMode === "upload" && homeCoverPath ? homeCoverPath : String(coverPath || "").trim();
      const coverHintForWeb = coverMode === "upload" && homeCoverPath ? { path: homeCoverPath, source: "home" } : coverPath ? { path: coverPath } : null;
      return {
        videoPath: String(videoInput?.value || "").trim(),
        coverPath: coverPathForWeb,
        title,
        desc,
        tags,
        scheduleAt: publishTimeMode === "schedule" ? scheduleAtForWeb : "",
        publishTimeMode,
        coverHint: coverHintForWeb
      };
    };

    let webTestSession = { id: "", platform: "", accountId: "" };
    let webTestTask = { requestId: "", btn: null, oldText: "", label: "", cancelling: false };
    const cancelledWebRequestIds = new Set();
    const clearWebTestSession = () => {
      webTestSession = { id: "", platform: "", accountId: "" };
    };
    const setWebTestSession = (platform, accountId, id) => {
      webTestSession = { id: String(id || "").trim(), platform: String(platform || "").trim(), accountId: String(accountId || "").trim() };
    };
    const getWebTestSessionId = (platform, accountId) => {
      const p = String(platform || "").trim();
      const a = String(accountId || "").trim();
      if (!webTestSession.id) return "";
      if (webTestSession.platform !== p) return "";
      if (webTestSession.accountId !== a) return "";
      return webTestSession.id;
    };
    const makeWebRequestId = () => `webreq_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const webLiveStatus = document.getElementById("global-live-status");
    let videoLiveTimer = 0;
    let videoLiveStartedAt = 0;
    let coverLiveTimer = 0;
    let coverLiveStartedAt = 0;
    let coverLiveHideTimer = 0;
    const autoCloseTimers = new Map();
    const scheduleWebLiveHide = (ms = 1200) => {
      try { clearTimeout(coverLiveHideTimer); } catch {}
      coverLiveHideTimer = window.setTimeout(() => hideWebLiveStatus(), Math.max(0, Number(ms || 0) || 0));
    };
    const hideWebLiveStatus = () => {
      try { clearInterval(videoLiveTimer); } catch {}
      try { clearInterval(coverLiveTimer); } catch {}
      try { clearTimeout(coverLiveHideTimer); } catch {}
      videoLiveTimer = 0;
      videoLiveStartedAt = 0;
      coverLiveTimer = 0;
      coverLiveHideTimer = 0;
      coverLiveStartedAt = 0;
      if (!webLiveStatus) return;
      webLiveStatus.hidden = true;
      webLiveStatus.textContent = "";
      webLiveStatus.className = "global-live-status";
    };
    const showWebLiveStatus = (message, type) => {
      if (!webLiveStatus) return;
      webLiveStatus.hidden = false;
      webLiveStatus.textContent = String(message || "");
      webLiveStatus.className = `global-live-status is-${String(type || "info")}`;
    };
    const clearAutoCloseTimer = (sessionId) => {
      const sid = String(sessionId || "").trim();
      if (!sid) return;
      const state = autoCloseTimers.get(sid) || null;
      if (!state) return;
      try { clearTimeout(state.warnTimer); } catch {}
      try { clearTimeout(state.closeTimer); } catch {}
      autoCloseTimers.delete(sid);
    };
    const scheduleAutoCloseAfterPublish = ({ platform, accountId, sessionId }) => {
      const sid = String(sessionId || "").trim();
      const plat = String(platform || "").trim();
      const acc = String(accountId || "").trim();
      if (!sid || !plat || !acc) return;
      clearAutoCloseTimer(sid);
      const platText = platformLabel(plat);
      pushLog("info", `${platText}账号发布完成，2分钟后自动关闭当前发布页。`);
      if (!webTestTask.requestId) {
        showWebLiveStatus(`${platText}账号已完成发布，2分钟后自动关闭当前发布页`, "success");
        scheduleWebLiveHide(3200);
      }
      const warnTimer = window.setTimeout(() => {
        pushLog("info", `${platText}账号发布页将在10秒后自动关闭。`);
        if (!webTestTask.requestId) {
          showWebLiveStatus(`${platText}发布页将在10秒后自动关闭`, "warn");
          scheduleWebLiveHide(4200);
        }
      }, 110000);
      const closeTimer = window.setTimeout(async () => {
        try {
          if (!webTestTask.requestId) showWebLiveStatus(`正在自动关闭${platText}发布页`, "info");
          const res = await window.api?.publishWeb?.syncExternal?.({
            platform: plat,
            accountId: acc,
            payload: {
              webTest: {
                action: "close",
                sessionId: sid,
                requestId: `autoclose_${Date.now()}_${Math.random().toString(16).slice(2)}`
              }
            }
          });
          if (String(getWebTestSessionId(plat, acc) || "") === sid) clearWebTestSession();
          if (res?.ok && Number(res?.closed || 0) > 0) {
            pushLog("info", `${platText}账号发布页已自动关闭，避免网页堆积。`);
            if (!webTestTask.requestId) {
              showWebLiveStatus(`${platText}发布页已自动关闭`, "success");
              scheduleWebLiveHide(2600);
            }
          } else {
            const msg = String(res?.message || "未找到可关闭网页或网页已被手动关闭");
            pushLog("warn", `${platText}账号发布页自动关闭未执行成功：${msg}`);
            if (!webTestTask.requestId) {
              showWebLiveStatus(`${platText}发布页自动关闭未执行成功`, "warn");
              scheduleWebLiveHide(3000);
            }
          }
        } catch (e) {
          pushLog("error", `${platText}账号发布页自动关闭异常：${String(e?.message || e)}`);
          if (!webTestTask.requestId) {
            showWebLiveStatus(`${platText}发布页自动关闭异常`, "warn");
            scheduleWebLiveHide(3200);
          }
        } finally {
          clearAutoCloseTimer(sid);
        }
      }, 120000);
      autoCloseTimers.set(sid, { warnTimer, closeTimer, platform: plat, accountId: acc });
    };
    const toUserFriendlyStatusText = (rawMsg) => {
      const msg = String(rawMsg || "").trim();
      if (!msg) return "";
      const mapped = [
        [/开始执行|正在执行/, "正在执行，请稍候"],
        [/打开发布页面|打开发布页/, "正在打开发布页"],
        [/已打开发布页面|已打开发布页/, "已打开发布页"],
        [/同步标题/, "正在同步标题"],
        [/同步简介/, "正在同步简介"],
        [/同步话题/, "正在同步话题"],
        [/同步发布时间/, "正在同步发布时间"],
        [/保存权限设置/, "正在保存权限设置"],
        [/关闭网页/, "正在关闭网页"],
        [/网速测试/, "正在测试网速"],
        [/发布未确认触发|发布失败/, "发布失败"],
        [/执行失败|失败/, "执行失败，请稍后重试"],
        [/工作流完成|执行完成/, "执行完成"]
      ];
      for (const [pattern, text] of mapped) {
        if (pattern.test(msg)) return text;
      }
      const pureCn = msg
        .replace(/[A-Za-z0-9_./:=#?&-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      return /[\u4e00-\u9fa5]/.test(pureCn) ? pureCn : "";
    };
    const startVideoLiveStatus = () => {
      hideWebLiveStatus();
      videoLiveStartedAt = Date.now();
      showWebLiveStatus("等待上传视频，已等待0秒", "info");
      videoLiveTimer = window.setInterval(() => {
        const sec = Math.max(0, Math.floor((Date.now() - videoLiveStartedAt) / 1000));
        showWebLiveStatus(`等待上传视频，已等待${sec}秒`, "info");
      }, 1000);
    };
    const finishVideoLiveStatus = (ok, message) => {
      try { clearInterval(videoLiveTimer); } catch {}
      videoLiveTimer = 0;
      videoLiveStartedAt = 0;
      if (!webLiveStatus) return;
      if (ok) {
        showWebLiveStatus(String(message || "已上传视频"), "success");
        scheduleWebLiveHide(1800);
      } else if (message) {
        showWebLiveStatus(String(message), "warn");
        scheduleWebLiveHide(2200);
      } else {
        hideWebLiveStatus();
      }
    };
    const startCoverLiveStatus = () => {
      hideWebLiveStatus();
      coverLiveStartedAt = Date.now();
      showWebLiveStatus("正在上传封面中，已等待0秒", "info");
      coverLiveTimer = window.setInterval(() => {
        const sec = Math.max(0, Math.floor((Date.now() - coverLiveStartedAt) / 1000));
        showWebLiveStatus(`正在上传封面中，已等待${sec}秒`, "info");
      }, 1000);
    };
    const finishCoverLiveStatus = (ok) => {
      try { clearInterval(coverLiveTimer); } catch {}
      coverLiveTimer = 0;
      if (!webLiveStatus) return;
      if (ok) {
        showWebLiveStatus("已经上传封面", "success");
        scheduleWebLiveHide(1800);
      } else {
        hideWebLiveStatus();
      }
    };
    const updateLiveStatusByStep = (rawMsg) => {
      const msg = String(rawMsg || "").trim();
      if (!msg) return false;
      if (videoLiveTimer) {
        if (/ks:video:done|完成视频同步|同步视频检测通过|信号已发出 video_done/i.test(msg)) {
          finishVideoLiveStatus(true, "已上传视频");
          return true;
        }
        if (/video upload failed|同步视频未确认完成|set video file failed|form not ready after upload|上传失败|上传出错/i.test(msg)) {
          finishVideoLiveStatus(false, "视频同步失败");
          return true;
        }
        return true;
      }
      if (coverLiveTimer) {
        if (/ks:cover:done|完成封面同步|同步封面检测通过|信号已发出 cover_done/i.test(msg)) {
          finishCoverLiveStatus(true);
          return true;
        }
        if (/同步封面未确认完成|封面设置需要视频已上传完成|封面上传失败|cover failed/i.test(msg)) {
          hideWebLiveStatus();
          return true;
        }
        return true;
      }
      if (/快手一键发布：开始 打开发布页/.test(msg)) {
        showWebLiveStatus("正在打开发布页", "info");
        return true;
      }
      if (/快手一键发布：打开发布页检测通过/.test(msg)) {
        showWebLiveStatus("已打开发布页", "success");
        return true;
      }
      if (/快手一键发布：开始 同步视频/.test(msg)) {
        startVideoLiveStatus();
        return true;
      }
      if (/快手一键发布：开始 同步封面/.test(msg)) {
        showWebLiveStatus("正在上传封面", "info");
        return true;
      }
      if (/快手一键发布：同步封面检测通过/.test(msg)) {
        showWebLiveStatus("已上传封面", "success");
        return true;
      }
      if (/快手一键发布：开始 同步话题/.test(msg)) {
        showWebLiveStatus("正在同步话题", "info");
        return true;
      }
      if (/快手一键发布：同步话题检测通过/.test(msg)) {
        showWebLiveStatus("已同步话题", "success");
        return true;
      }
      if (/快手一键发布：开始 同步发布时间/.test(msg)) {
        showWebLiveStatus("正在同步发布时间", "info");
        return true;
      }
      if (/快手一键发布：同步发布时间检测通过/.test(msg)) {
        showWebLiveStatus("已同步发布时间", "success");
        return true;
      }
      if (/快手一键发布：开始 发布/.test(msg)) {
        showWebLiveStatus("正在发布作品", "info");
        return true;
      }
      if (/快手一键发布：发布检测通过/.test(msg)) {
        showWebLiveStatus("已触发发布", "success");
        return true;
      }
      if (/快手一键发布：工作流完成/.test(msg)) {
        showWebLiveStatus("一键发布执行完成", "success");
        scheduleWebLiveHide(1800);
        return true;
      }
      if (/ks:video:done|完成视频同步/i.test(msg)) {
        finishVideoLiveStatus(true, "已上传视频");
        return true;
      }
      return false;
    };
    const beginWebTestTask = (btn, label, requestId) => {
      webTestTask = {
        requestId: String(requestId || "").trim(),
        btn: btn || null,
        oldText: String(btn?.textContent || ""),
        label: String(label || ""),
        cancelling: false
      };
      if (btn) {
        btn.classList.add("is-running");
        btn.textContent = "停止执行";
      }
      showWebLiveStatus(`正在执行：${String(label || "")}`, "info");
    };
    const finishWebTestTask = (requestId, force) => {
      const rid = String(requestId || "").trim();
      if (!rid) return;
      if (!force && webTestTask.requestId !== rid) return;
      const label = String(webTestTask.label || "");
      const btn = webTestTask.btn;
      const old = webTestTask.oldText;
      webTestTask = { requestId: "", btn: null, oldText: "", label: "", cancelling: false };
      if (btn) {
        btn.classList.remove("is-running", "is-stopping");
        btn.textContent = old || btn.textContent;
      }
      if (label === "一键发布") hideWebLiveStatus();
      else {
        scheduleWebLiveHide(1200);
      }
    };

    try {
      if (window.__ipfactoryPublishWebStepUnsub) window.__ipfactoryPublishWebStepUnsub();
    } catch {}
    window.__ipfactoryPublishWebStepUnsub = window.api?.publishWeb?.onStep?.((data) => {
      const rid = String(data?.requestId || "").trim();
      if (!rid) return;
      if (rid !== String(webTestTask.requestId || "").trim()) return;
      const msg = String(data?.msg || "").trim();
      if (!msg) return;
      pushLog("info", `实时：${msg}`);
      if (!updateLiveStatusByStep(msg)) {
        const text = toUserFriendlyStatusText(msg);
        if (text) showWebLiveStatus(text, "info");
      }
    });

    const runWebTestAction = async (action, opts, requestId) => {
      const hasLiveSteps = typeof window.api?.publishWeb?.onStep === "function";
      const actionLabelMap = {
        open: "打开发布页面",
        netspeed: "网速测试",
        oneclick: "一键发布",
        title: "标题同步",
        desc: "简介同步",
        tags: "话题同步",
        video: "视频同步",
        cover: "封面同步",
        schedule: "发布时间同步",
        publish: "发布",
        close: "关闭网页",
        saveperm: "保存权限设置"
      };
      const doneText = (() => {
        const key = String(action || "").trim();
        if (key === "open") return "已打开发布页面";
        const label = String(actionLabelMap[key] || key || "执行");
        return `完成${label}`;
      })();
      const accountId = String(accSel?.value || "").trim();
      const platform = String(platformSel?.value || "").trim();
      if (!platform) {
        toast("请先选择平台。", "warn");
        return null;
      }
      if (!accountId) {
        toast("请先选择账号。", "warn");
        return null;
      }
      if (!["douyin", "xiaohongshu", "kuaishou", "shipinhao"].includes(platform)) {
        toast("当前仅接入抖音/快手/小红书/视频号发布页同步。", "warn");
        return null;
      }
      if ((String(action || "").trim() === "open" || String(action || "").trim() === "publish") && !(await ensureAccountReadyForPublish(platform, accountId))) {
        return null;
      }
      const payload = collectWebPayload();
      const sessionId = getWebTestSessionId(platform, accountId);
      const actionKey = String(action || "").trim();
      const isCoverAction = actionKey === "cover";
      const isVideoAction = actionKey === "video";
      payload.webTest = {
        action: actionKey,
        stages: opts?.stages && typeof opts.stages === "object" ? opts.stages : {},
        fill: opts?.fill && typeof opts.fill === "object" ? opts.fill : {},
        browserPreference: String(opts?.browserPreference || "").trim(),
        sessionId,
        requestId: String(requestId || "").trim()
      };
      let finalRes = null;
      if (isVideoAction) startVideoLiveStatus();
      if (isCoverAction) startCoverLiveStatus();
      try {
        const res = await window.api?.publishWeb?.syncExternal?.({ platform, accountId, payload });
        finalRes = res || null;
        if (requestId && cancelledWebRequestIds.has(String(requestId))) return { ok: false, cancelled: true };
        if (!hasLiveSteps) {
          try {
            const steps = Array.isArray(res?.steps) ? res.steps : [];
            steps.forEach((it) => {
              const msg = typeof it === "string" ? it : String(it?.msg || "");
              if (msg) pushLog("info", `同步到网页：${msg}`);
            });
          } catch {}
        }
        if (!res?.ok) {
          toast(String(res?.message || "执行失败"), "error");
          if (res?.result || res?.debug) pushLog("error", JSON.stringify({ result: res?.result || null, debug: res?.debug || null }, null, 2));
        } else {
          if (actionKey === "netspeed") {
            const down = Number(res?.result?.downloadMbps || 0) || 0;
            const up = Number(res?.result?.uploadMbps || 0) || 0;
            if (netSpeedPill) netSpeedPill.textContent = `网速：↓${down}Mbps ↑${up}Mbps`;
            pushLog("info", `网速测试：下载↓${down}Mbps，上传↑${up}Mbps`);
          }
          if (actionKey === "oneclick") {
            pushLog("info", "一键发布：工作流已完成");
          }
          feedback(doneText, "success", "info");
        }
        const sid = String(res?.sessionId || "").trim();
        if (sid) setWebTestSession(platform, accountId, sid);
        if (actionKey === "close") {
          clearAutoCloseTimer(sid || sessionId);
        }
        if (res?.ok && sid && (actionKey === "publish" || actionKey === "oneclick")) {
          scheduleAutoCloseAfterPublish({ platform, accountId, sessionId: sid });
        }
        if (String(action || "").trim() === "open" && !sid) clearWebTestSession();
        return res || null;
      } catch (e) {
        if (requestId && cancelledWebRequestIds.has(String(requestId))) return { ok: false, cancelled: true };
        toast("执行失败。", "error");
        pushLog("error", String(e?.message || e));
        if (String(action || "").trim() === "open") clearWebTestSession();
        return null;
      } finally {
        if (isVideoAction) finishVideoLiveStatus(!!(finalRes && finalRes.ok));
        if (isCoverAction) finishCoverLiveStatus(!!(finalRes && finalRes.ok));
      }
    };

    const btnWebOpen = root.querySelector("#pub-web-open");
    const btnWebOpenEdge = root.querySelector("#pub-web-open-edge");
    const btnWebSpeed = root.querySelector("#pub-web-speed");
    const btnWebTitle = root.querySelector("#pub-web-title");
    const btnWebDesc = root.querySelector("#pub-web-desc");
    const btnWebTags = root.querySelector("#pub-web-tags");
    const btnWebVideo = root.querySelector("#pub-web-video");
    const btnWebCover = root.querySelector("#pub-web-cover");
    const btnWebSchedule = root.querySelector("#pub-web-schedule");
    const btnWebPublish = root.querySelector("#pub-web-publish");
    const btnWebClose = root.querySelector("#pub-web-close");
    const btnWebSavePerm = root.querySelector("#pub-web-saveperm");
    const netSpeedPill = root.querySelector("#pub-net-speed");

    const bindWebTestBtn = (btn, label, fn) => {
      if (!btn) return;
      btn.addEventListener("click", async () => {
        if (webTestTask.requestId && webTestTask.btn === btn) {
          if (webTestTask.cancelling) return;
          webTestTask.cancelling = true;
          btn.classList.add("is-stopping");
          btn.textContent = "停止中...";
          cancelledWebRequestIds.add(webTestTask.requestId);
          pushLog("warn", `网页填表：${label}，正在停止执行`);
          try {
            await window.api?.publishWeb?.cancelSyncExternal?.({ requestId: webTestTask.requestId, reason: `用户停止：${label}` });
          } catch {}
          finishWebTestTask(webTestTask.requestId, true);
          toast("已停止执行。", "success");
          return;
        }
        if (webTestTask.requestId) {
          toast(`正在执行：${webTestTask.label}，请先停止当前任务。`, "warn");
          return;
        }
        const requestId = makeWebRequestId();
        beginWebTestTask(btn, label, requestId);
        pushLog("info", `网页填表：${label}`);
        toast(`${label}开始执行。`, "info");
        try {
          await fn(requestId);
        } finally {
          finishWebTestTask(requestId);
          cancelledWebRequestIds.delete(requestId);
        }
      });
    };

    platformSel?.addEventListener("change", clearWebTestSession);
    accSel?.addEventListener("change", clearWebTestSession);

    bindWebTestBtn(btnOneClick, "一键发布", async (requestId) => {
      const platform = String(platformSel?.value || "").trim();
      const accountId = String(accSel?.value || "").trim();
      if (!platform) {
        toast("请先选择平台。", "warn");
        return;
      }
      if (!accountId) {
        toast("请先选择账号。", "warn");
        return;
      }
      if (!["douyin", "xiaohongshu", "kuaishou", "shipinhao"].includes(platform)) {
        toast("当前仅接入抖音/快手/小红书/视频号发布页同步。", "warn");
        return;
      }
      if (!(await ensureAccountReadyForPublish(platform, accountId))) return;
      const payload = collectWebPayload();
      if (!String(payload?.title || "").trim()) {
        toast("请先填写标题。", "warn");
        return;
      }
      if (!String(payload?.desc || "").trim()) {
        toast("请先填写作品简介。", "warn");
        return;
      }
      if (!Array.isArray(payload?.tags) || payload.tags.length === 0) {
        toast("请先填写话题/标签（逗号分隔）。", "warn");
        return;
      }
      if (!String(payload?.videoPath || "").trim()) {
        toast("请先添加视频。", "warn");
        return;
      }
      if (!String(payload?.coverPath || "").trim()) {
        toast("请先设置封面。", "warn");
        return;
      }
      if (String(payload?.publishTimeMode || "") === "schedule") {
        const p = parseSchedule(String(payload?.scheduleAt || "").trim());
        const pickTs = partsToTs(p);
        const minTs = partsToTs(minScheduleParts());
        const maxTs = partsToTs(maxScheduleParts());
        if (!pickTs || pickTs < minTs) {
          toast("抖音定时发布需至少晚于当前时间 2 小时，请重新设置定时发布时间。", "warn");
          openSchedulePicker();
          return;
        }
        if (maxTs && pickTs > maxTs) {
          toast("抖音定时发布最晚不超过 14 天，请重新设置定时发布时间。", "warn");
          openSchedulePicker();
          return;
        }
      }
      await runWebTestAction("oneclick", { stages: { video: false, cover: false, fill: false }, fill: {} }, requestId);
    });

    bindWebTestBtn(btnWebOpen, "打开Chrome发布页", chuangjianDakaiChromeFabuyeHandler({ runWebTestAction }));
    bindWebTestBtn(btnWebOpenEdge, "打开Edge发布页", chuangjianDakaiEdgeFabuyeHandler({ runWebTestAction }));
    bindWebTestBtn(btnWebSpeed, "网速测试", async (requestId) => {
      await runWebTestAction("netspeed", { stages: { video: false, cover: false, fill: false }, fill: {} }, requestId);
    });
    bindWebTestBtn(btnWebTitle, "同步标题", chuangjianTongBuBiaoTiHandler({ titleInput, toast, runWebTestAction }));
    bindWebTestBtn(btnWebDesc, "同步简介", chuangjianTongBuJianJieHandler({ descInput, toast, runWebTestAction }));
    bindWebTestBtn(btnWebTags, "同步话题", chuangjianTongBuHuaTiHandler({ tagsInput, toTagArray, toast, runWebTestAction }));
    bindWebTestBtn(btnWebVideo, "同步视频", chuangjianTongBuShiPinHandler({ videoInput, toast, runWebTestAction }));
    bindWebTestBtn(btnWebCover, "同步封面", chuangjianTongBuFengMianHandler({ getCoverPath: () => coverPath, toast, runWebTestAction }));
    bindWebTestBtn(
      btnWebSchedule,
      "同步发布时间",
      chuangjianTongBuFaBuShiJianHandler({ scheduleInput, getPublishTimeMode: () => publishTimeMode, toast, runWebTestAction })
    );
    bindWebTestBtn(btnWebPublish, "发布", async (requestId) => {
      await runWebTestAction("publish", { stages: { video: false, cover: false, fill: false }, fill: {} }, requestId);
    });
    bindWebTestBtn(btnWebClose, "关闭网页", async (requestId) => {
      await runWebTestAction("close", { stages: { video: false, cover: false, fill: false }, fill: {} }, requestId);
    });
    bindWebTestBtn(btnWebSavePerm, "保存权限设置", chuangjianBaoCunQuanXianSheZhiHandler({ runWebTestAction }));

    const openAddVideoModal = () => openModal(pubVideoOverlay, pubVideoModal);
    const closeAddVideoModal = () => closeModal(pubVideoOverlay, pubVideoModal);
    btnVideoAdd?.addEventListener("click", openAddVideoModal);
    pubVideoClose?.addEventListener("click", closeAddVideoModal);
    pubVideoCancel?.addEventListener("click", closeAddVideoModal);
    pubVideoOverlay?.addEventListener("click", closeAddVideoModal);

    const syncCoverFromHome = () => {
      const hc = readHomeCoverState();
      const outPath = String(hc?.outPath || "").trim();
      const tplId = String(hc?.templateId || "").trim();
      if (tplId) setCoverTemplate(tplId);
      if (!outPath) {
        feedback("首页暂无封面输出，请先在首页“封面制作”生成封面。", "warn", "warn");
        return false;
      }
      setCoverPreview(outPath, "home");
      saveDraftFromUi();
      feedback(`封面已从首页同步：${outPath}`, "success", "info");
      return true;
    };

    pubVideoFromHome?.addEventListener("click", () => {
      const p = readHomeLastVideoPath();
      if (!p) {
        toast("首页暂无成片输出，请先在首页“字幕和音乐”合成成片。", "warn");
        return;
      }
      videoInput.value = p;
      setVideoSource("home");
      const hc = readHomeCoverState();
      const tplId = String(hc?.templateId || "").trim();
      if (tplId) setCoverTemplate(tplId);
      const outPath = String(hc?.outPath || "").trim();
      if (outPath) setCoverPreview(outPath, "home");
      saveDraftFromUi();
      pushLog("info", "已选择视频来源：首页");
      closeAddVideoModal();
      toast("已从首页带入视频。", "success");
    });

    pubVideoFromLocal?.addEventListener("click", async () => {
      try {
        const res = await window.api?.openFile?.();
        if (res?.canceled) return;
        const p = String(res?.filePaths?.[0] || "").trim();
        if (!p) return;
        if (!/\.(mp4|mov|mkv|avi|webm|m4v)$/i.test(p)) {
          toast("请选择视频文件（mp4/mov/mkv/avi/webm）。", "warn");
          return;
        }
        videoInput.value = p;
        setVideoSource("local");
        setCoverPreview("", "");
        setCoverSource("");
        const hc = readHomeCoverState();
        const tplId = String(hc?.templateId || "").trim();
        if (tplId) setCoverTemplate(tplId);
        saveDraftFromUi();
        pushLog("info", "已选择视频来源：本地上传");
        closeAddVideoModal();
        toast("已选择本地视频。", "success");
      } catch {
        toast("选择失败。", "error");
      }
    });

    const setCoverMode = (mode) => {
      coverMode = String(mode || "auto");
      if (coverTabs) {
        Array.from(coverTabs.querySelectorAll(".seg-tab")).forEach((b) => {
          const m = String(b.getAttribute("data-mode") || "");
          b.classList.toggle("is-active", m === coverMode);
        });
      }
      renderCoverMode();
    };
    coverTabs?.addEventListener("click", (e) => {
      const btn = e?.target?.closest?.(".seg-tab[data-mode]");
      const mode = String(btn?.getAttribute?.("data-mode") || "");
      if (!mode) return;
      setCoverMode(mode);
    });

    fileDraftSelect?.addEventListener("change", () => {
      fileDraftSelectedId = String(fileDraftSelect.value || "").trim();
      if (btnFileDraftLoad) btnFileDraftLoad.disabled = !fileDraftSelectedId;
      if (btnFileDraftOpen) btnFileDraftOpen.disabled = !fileDraftSelectedId;
    });
    btnFileDraftRefresh?.addEventListener("click", () => refreshFileDrafts(fileDraftSelectedId));
    btnFileDraftLoad?.addEventListener("click", async () => {
      const id = String(fileDraftSelect?.value || "").trim();
      if (!id) return;
      try {
        const res = await window.api?.publishDraft?.load?.({ id });
        if (!res?.ok) {
          toast(String(res?.message || "读取失败"), "error");
          return;
        }
        const d = res?.draft && typeof res.draft === "object" ? res.draft : {};
        writeDraft(d);
        applyDraftToUi(d);
        saveDraftFromUi();
        toast("草稿已读取。", "success");
        pushLog("info", `已读取草稿：${String(res?.name || id)}`);
      } catch (e) {
        toast("读取失败。", "error");
        pushLog("error", String(e?.message || e));
      }
    });
    btnFileDraftOpen?.addEventListener("click", async () => {
      const id = String(fileDraftSelect?.value || "").trim();
      if (!id) return;
      try {
        const res = await window.api?.publishDraft?.reveal?.({ id });
        if (!res?.ok) toast(String(res?.message || "打开失败"), "warn");
      } catch {}
    });

    btnCoverToHome?.addEventListener("click", () => {
      window.location.hash = "#/home";
    });
    btnCoverSyncHome?.addEventListener("click", () => {
      syncCoverFromHome();
    });

    btnCoverOpen?.addEventListener("click", async () => {
      const p = String(coverPath || "").trim();
      if (!p) return;
      try {
        await window.api?.shell?.reveal?.({ path: p });
      } catch {
        toast("打开失败。", "error");
      }
    });

    const openCoverTplModal = () => {
      if (!pubCoverTplOverlay || !pubCoverTplModal || !pubCoverTplGrid) return;
      let selectedId = coverTemplateId || "system";
      const list = ensureCoverTplList();
      const buildThumb = (t) => {
        const id = String(t?.id || "");
        const name = String(t?.name || id || "");
        return `<div class="cover-tpl-thumb">
          <div class="cover-tpl-mini">
            <div class="cover-tpl-mini-bg"></div>
            <div class="cover-tpl-mini-dim" style="opacity: 0.12"></div>
            <div class="cover-tpl-mini-main" style="left:50%;top:12%;transform:translate(-50%,0);color:#f5c400;font-weight:900;font-size:14px;letter-spacing:0.2px;text-shadow:0 2px 6px rgba(0,0,0,0.35)">标题</div>
            <div class="cover-tpl-mini-sub" style="left:50%;top:78%;transform:translate(-50%,0);color:#ffffff;font-weight:800;font-size:11px;text-shadow:0 2px 6px rgba(0,0,0,0.35)">标签</div>
          </div>
        </div>
        <div class="cover-tpl-name">${name}</div>
        <div class="cover-tpl-sub">${id}</div>`;
      };
      const render = () => {
        pubCoverTplGrid.innerHTML = list
          .map((t) => {
            const id = String(t?.id || "");
            const cls = id === selectedId ? "cover-tpl-card is-active" : "cover-tpl-card";
            return `<div class="${cls}" data-id="${id}">${buildThumb(t)}</div>`;
          })
          .join("");
        Array.from(pubCoverTplGrid.querySelectorAll(".cover-tpl-card[data-id]")).forEach((el) => {
          el.addEventListener("click", () => {
            selectedId = String(el.getAttribute("data-id") || "system");
            render();
          });
          el.addEventListener("dblclick", () => {
            selectedId = String(el.getAttribute("data-id") || "system");
            setCoverTemplate(selectedId);
            saveDraftFromUi();
            closeModal(pubCoverTplOverlay, pubCoverTplModal);
          });
        });
      };
      render();
      const close = () => closeModal(pubCoverTplOverlay, pubCoverTplModal);
      const ok = () => {
        setCoverTemplate(selectedId);
        saveDraftFromUi();
        close();
      };
      openModal(pubCoverTplOverlay, pubCoverTplModal);
      pubCoverTplClose?.addEventListener("click", close, { once: true });
      pubCoverTplCancel?.addEventListener("click", close, { once: true });
      pubCoverTplOk?.addEventListener("click", ok, { once: true });
      pubCoverTplToManage?.addEventListener(
        "click",
        () => {
          close();
          window.location.hash = "#/cover-templates";
        },
        { once: true }
      );
      pubCoverTplOverlay?.addEventListener("click", close, { once: true });
    };

    btnCoverTpl?.addEventListener("click", () => {
      if (videoSource === "home") return;
      openCoverTplModal();
    });
    btnCoverManage?.addEventListener("click", () => (window.location.hash = "#/cover-templates"));

    btnCoverClear?.addEventListener("click", () => {
      setCoverPreview("", "");
      setCoverSource("");
      saveDraftFromUi();
      toast("封面已清除。", "success");
      renderCoverMode();
    });

    btnCoverUpload?.addEventListener("click", async () => {
      if (videoSource === "home") return;
      try {
        const res = await window.api?.openFile?.();
        if (res?.canceled) return;
        const p = String(res?.filePaths?.[0] || "").trim();
        if (!p) return;
        if (!/\.(png|jpg|jpeg|webp|gif)$/i.test(p)) {
          toast("请选择图片文件（png/jpg/webp）。", "warn");
          return;
        }
        setCoverPreview(p, "upload");
        saveDraftFromUi();
        toast("封面已设置。", "success");
        renderCoverMode();
      } catch {
        toast("选择失败。", "error");
      }
    });

    btnCoverGenerate?.addEventListener("click", async () => {
      if (coverGenerating) return;
      let videoPath = String(videoInput?.value || "").trim();
      let sourceText = "发布管理所选视频";
      let nextCoverSource = "auto";
      let tplId = coverTemplateId;
      if (videoSource === "home") {
        videoPath = readHomeEditedVideoPath();
        sourceText = "首页“自动生成封面”同源视频";
        nextCoverSource = "home";
        const hc0 = readHomeCoverState();
        tplId = String(hc0?.templateId || coverTemplateId || "system").trim() || "system";
        if (tplId) setCoverTemplate(tplId);
      }
      if (!videoPath) {
        if (videoSource === "home") feedback("首页剪辑视频未生成，请先在首页“视频编辑”模块生成剪辑视频。", "warn", "warn");
        else toast("请先添加视频。", "warn");
        return;
      }
      const tpl = getCoverTplById(tplId);
      const titleText = String(titleInput?.value || "").trim() || readHomeMetaTitle();
      if (!titleText) {
        toast("请先填写标题。", "warn");
        return;
      }
      const subTitleText = getFirstTag();
      const taskId = `pub_cover_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      const oldLabel = btnCoverGenerate.textContent;
      coverGenerating = true;
      btnCoverGenerate.disabled = true;
      btnCoverGenerate.textContent = "生成中...";
      pushLog("info", `开始生成封面：抽取开头5秒内随机帧 + 套用封面模板（来源：${sourceText}）`);
      try {
        const res = await window.api?.cover?.generate?.({ taskId, videoPath, template: tpl, titleText, subTitleText });
        if (!res?.ok) {
          toast(String(res?.message || "生成失败"), "error");
          pushLog("warn", String(res?.message || "封面生成失败"));
          return;
        }
        const out = String(res.outPath || "").trim();
        setCoverPreview(out, nextCoverSource);
        if (videoSource === "home") {
          const hc = readHomeCoverState();
          writeHomeCoverState({ ...(hc || {}), templateId: tplId, outPath: out });
        }
        saveDraftFromUi();
        if (videoSource === "home") feedback(`已同步最新首页封面：${out}`, "success", "info");
        else {
          toast("封面已生成。", "success");
          pushLog("info", `封面输出：${out}`);
        }
      } catch (e) {
        toast("生成失败。", "error");
        pushLog("error", String(e?.message || e));
      } finally {
        coverGenerating = false;
        btnCoverGenerate.disabled = false;
        btnCoverGenerate.textContent = oldLabel;
        renderCoverMode();
      }
    });

    videoInput?.addEventListener("input", () => {
      const p = String(videoInput.value || "").trim();
      if (!p) {
        setVideoSource("");
        return;
      }
      if (!videoSource) setVideoSource("local");
      renderCoverMode();
    });

    btnLogClear.addEventListener("click", () => {
      logBox.innerHTML = "";
      pushLog("info", "日志已清空");
    });
    btnLogCopy.addEventListener("click", async () => {
      const text = Array.from(logBox.querySelectorAll(".log-line"))
        .map((n) => n.textContent || "")
        .join("\n")
        .trim();
      if (!text) {
        toast("日志为空。", "warn");
        return;
      }
      try {
        await navigator.clipboard.writeText(text);
        toast("已复制日志。", "success");
      } catch {
        toast("复制失败。", "error");
      }
    });

    await loadAccounts();
    (() => {
      const d = readDraft();
      const next = { ...(d || {}) };
      if (!String(next.videoSource || "").trim() && String(next.videoPath || "").trim()) {
        const homeVideo = readHomeLastVideoPath();
        next.videoSource = String(next.videoPath || "").trim() && String(next.videoPath || "").trim() === String(homeVideo || "").trim() ? "home" : "local";
      }
      if (String(next.videoSource || "") === "home") {
        const hc = readHomeCoverState();
        if (!String(next.coverTemplateId || "").trim() && String(hc?.templateId || "").trim()) next.coverTemplateId = String(hc.templateId || "");
        if (!String(next.coverPath || "").trim() && String(hc?.outPath || "").trim()) {
          next.coverPath = String(hc.outPath || "");
          next.coverSource = "home";
        }
      }
      if (JSON.stringify(next || {}) !== JSON.stringify(d || {})) writeDraft(next);
      applyDraftToUi(next);
    })();
    if (!String(readDraft()?.coverMode || "").trim()) setCoverMode("auto");
    await refreshFileDrafts();
    pushLog("info", "发布管理已就绪。");

    return root;
  }
};
