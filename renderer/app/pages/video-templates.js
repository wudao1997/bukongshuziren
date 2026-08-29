import { elFromHTML, pageHeader } from "../ui.js";

export const route = {
  path: "/video-templates",
  title: "画中画素材",
  async render() {
    const root = elFromHTML(`
      <div class="sticky-page-layout vt-assets-page">
        ${pageHeader({
          title: "画中画素材",
          subtitle: "用于集中管理图片 / 视频 / GIF 素材，只保留上传、删除、分组和参数维护，整体风格简约大方。",
          actionsHTML: `
            <button class="btn" id="vt-refresh">刷新</button>
          `
        })}

        <div class="sticky-page-body">
          <div class="vtm">
            <div class="card vtm-head-card">
              <div class="vtm-head">
                <div class="vtm-head-main">
                  <div class="vtm-head-title">素材管理台</div>
                  <div class="vtm-head-sub">上传素材、删除素材、素材分组与基础参数维护都集中在这里完成。</div>
                </div>
                <div class="vtm-head-meta">
                  <span class="pill">工程数 <span id="vt-count">0</span></span>
                  <span class="pill" id="vt-active-meta">—</span>
                </div>
              </div>
              <div class="vtm-toolbar">
                <div class="vtm-toolbar-left">
                  <div class="accm-select vtm-project-select">
                    <span class="pill">当前工程</span>
                    <select id="vt-template-select">
                      <option value="">未选择</option>
                    </select>
                  </div>
                  <div class="accm-select">
                    <span class="pill">分组筛选</span>
                    <select id="vt-layer-category-filter">
                      <option value="">全部分组</option>
                    </select>
                  </div>
                  <div class="vtm-current-project">
                    <span class="pill">当前工程</span>
                    <span class="vtm-current-project-name" id="vt-props-title">未选择</span>
                  </div>
                </div>
                <div class="vtm-toolbar-right">
                  <button class="btn btn-primary" id="vt-add-layer" disabled>上传素材</button>
                  <button class="btn" id="vt-open-dir" disabled>打开目录</button>
                  <button class="btn btn-danger" id="vt-delete" disabled>删除工程</button>
                </div>
              </div>
            </div>

            <div class="card vtm-empty-shell" id="vt-empty-shell" hidden>
              <div class="vtm-empty-icon">素材</div>
              <div class="vtm-empty-title">正在准备素材库</div>
              <div class="vtm-empty-desc">系统会自动准备默认的画中画素材库，准备完成后即可直接上传图片、动图和视频素材，不需要先生成口播视频。</div>
            </div>

            <div class="vtm-content" id="vt-main-content">
              <div class="card vtm-assets-card">
                <div class="card-title">
                  <h3>素材列表</h3>
                  <span class="pill">支持图片 / 视频 / GIF</span>
                </div>
                <div class="vtm-assets-tip">素材上传后可直接删除、分组和维护位置缩放参数，页面只保留素材管理所需能力。</div>
                <div class="vt2-layer-list" id="vt-layer-list"></div>
                <div class="empty" id="vt-layer-empty" style="margin-top: 10px">当前工程还没有素材，点击右上角“上传素材”开始添加。</div>
              </div>

              <aside class="card vtm-detail-card">
                <div class="card-title">
                  <h3>素材设置</h3>
                  <span class="pill" id="vt-layer-picked">未选择</span>
                </div>
                <div class="vtm-detail-preview" id="vt-layer-preview">
                  <div class="vtm-detail-preview-empty" id="vt-layer-preview-empty">选中素材后，这里显示素材缩略预览。</div>
                </div>
                <div class="field">
                  <div class="label">缩放</div>
                  <input id="vt-layer-scale" type="text" value="0.35" />
                </div>
                <div class="grid cols-2" style="gap: 10px">
                  <div class="field">
                    <div class="label">X（0~1）</div>
                    <input id="vt-layer-x" type="text" value="1" />
                  </div>
                  <div class="field">
                    <div class="label">Y（0~1）</div>
                    <input id="vt-layer-y" type="text" value="0" />
                  </div>
                </div>
                <div class="field">
                  <div class="label">素材分组</div>
                  <input id="vt-layer-category" type="text" placeholder="例如：办公室 / 花草 / 科技感 / 产品特写" />
                  <div class="hint">这里只做分组管理，后续 AI 自动匹配也会直接读取这里的标签。</div>
                </div>
                <div class="field">
                  <div class="label">显示状态</div>
                  <label class="chk"><input type="checkbox" id="vt-layer-enable" checked /> 启用该素材</label>
                </div>
                <div class="field">
                  <div class="label">绿幕抠像</div>
                  <label class="chk"><input type="checkbox" id="vt-layer-key" /> 启用绿幕抠像</label>
                </div>
                <div class="card-actions" style="margin-top: 10px">
                  <button class="btn btn-danger" id="vt-layer-remove" disabled>删除素材</button>
                </div>
              </aside>
            </div>

            <div class="vt-assets-runtime" hidden>
              <div id="vt-active-label"></div>
              <div id="vt-list"></div>
              <div id="vt-empty"></div>
              <div class="vt2-stage" id="vt-stage">
                <div class="empty" id="vt-preview-empty">请选择一个模板进行预览。支持拖拽文件到预览中导入素材。</div>
                <div class="vt2-canvas" id="vt-canvas" hidden>
                  <video id="vt-video" controls playsinline></video>
                  <div class="vt2-overlay" id="vt-overlay"></div>
                  <div class="vt2-subwrap" id="vt-sub"></div>
                </div>
              </div>
              <audio id="vt-music-audio" hidden></audio>
              <button class="btn" id="vt-import-main" disabled>导入主视频</button>

              <div class="seg-tabs" id="vt-props-tabs">
                <button class="seg-tab is-active" data-props-tab="pip">素材</button>
                <button class="seg-tab" data-props-tab="sub">字幕</button>
                <button class="seg-tab" data-props-tab="music">背景音乐</button>
                <button class="seg-tab" data-props-tab="export">导出</button>
              </div>
              <div class="vt2-panel is-active" data-props-panel="pip"></div>
              <div class="vt2-panel" data-props-panel="sub">
                <button class="btn" id="vt-rec-sub" disabled>识别字幕</button>
                <button class="btn btn-primary" id="vt-add-sub" disabled>添加字幕</button>
                <div class="vt2-layer-list" id="vt-sub-list"></div>
                <div class="empty" id="vt-sub-empty">暂无字幕轨道。</div>
                <div class="hint" id="vt-sub-picked">未选择</div>
                <label class="chk"><input type="checkbox" id="vt-sub-enable" /> 显示字幕</label>
                <textarea id="vt-sub-text"></textarea>
                <select id="vt-font"></select>
                <input id="vt-sub-size" type="text" value="48" />
                <input id="vt-sub-x" type="text" value="0.5" />
                <input id="vt-sub-y" type="text" value="0.9" />
                <button class="btn btn-danger" id="vt-sub-remove" disabled>删除字幕</button>
              </div>
              <div class="vt2-panel" data-props-panel="music">
                <label class="chk"><input type="checkbox" id="vt-music-enable" /> 叠加背景音乐</label>
                <select id="vt-music"></select>
                <input id="vt-music-volume" type="text" value="0.35" />
              </div>
              <div class="vt2-panel" data-props-panel="export">
                <button class="btn btn-primary" id="vt-render" disabled>生成模板视频</button>
                <button class="btn btn-danger" id="vt-cancel" disabled>停止渲染</button>
                <span class="pill" id="vt-status">待命</span>
                <pre class="clone-log" id="vt-log"></pre>
              </div>
              <div class="vt2-ruler" id="vt-ruler"></div>
              <div class="vt2-timeline" id="vt-timeline"></div>
              <div class="vt-renders" id="vt-renders"></div>
              <div class="empty" id="vt-renders-empty">暂无渲染输出。</div>
              <span class="pill" id="vt-render-count">0</span>
            </div>
          </div>
        </div>
      </div>
    `);

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

    const escapeHtmlAttr = (s) =>
      String(s || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const escapeHtml = (s) => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const toFileUrl = (p) => {
      const raw = String(p || "").trim();
      if (!raw) return "";
      if (/^file:\/\//i.test(raw)) return raw;

      const encodePathParts = (s) =>
        String(s || "")
          .split("/")
          .map((seg) => (seg === "" ? "" : encodeURIComponent(seg)))
          .join("/");

      const norm = raw.replace(/\\/g, "/");
      if (/^[a-zA-Z]:\//.test(norm)) {
        const drive = norm.slice(0, 2);
        const rest = norm.slice(2);
        return `file:///${drive}${encodePathParts(rest)}`;
      }

      if (raw.startsWith("\\\\")) {
        const unc = norm.replace(/^\/\//, "");
        const parts = unc.split("/").filter((x) => x !== "");
        const host = parts.shift() || "";
        const pathPart = parts.map((seg) => encodeURIComponent(seg)).join("/");
        return `file://${host}/${pathPart}`;
      }

      try {
        return new URL(raw, window.location.href).toString();
      } catch {
        return raw;
      }
    };

    const btnRefresh = root.querySelector("#vt-refresh");
    const vtCount = root.querySelector("#vt-count");
    const templateSelect = root.querySelector("#vt-template-select");
    const mainContent = root.querySelector("#vt-main-content");
    const emptyShell = root.querySelector("#vt-empty-shell");
    const vtList = root.querySelector("#vt-list");
    const vtEmpty = root.querySelector("#vt-empty");
    const vtActiveLabel = root.querySelector("#vt-active-label");
    const vtActiveMeta = root.querySelector("#vt-active-meta");
    const btnImportMain = root.querySelector("#vt-import-main");
    const vtVideo = root.querySelector("#vt-video");
    const vtPreviewEmpty = root.querySelector("#vt-preview-empty");
    const vtCanvas = root.querySelector("#vt-canvas");
    const vtOverlay = root.querySelector("#vt-overlay");
    const vtSub = root.querySelector("#vt-sub");
    const vtStage = root.querySelector("#vt-stage");
    const vtMusicAudio = root.querySelector("#vt-music-audio");
    const btnOpenDir = root.querySelector("#vt-open-dir");
    const btnDelete = root.querySelector("#vt-delete");
    const vtRenders = root.querySelector("#vt-renders");
    const vtRendersEmpty = root.querySelector("#vt-renders-empty");
    const vtRenderCount = root.querySelector("#vt-render-count");
    const vtRuler = root.querySelector("#vt-ruler");
    const vtTimeline = root.querySelector("#vt-timeline");

    const propsTabs = root.querySelector("#vt-props-tabs");
    const propsTitle = root.querySelector("#vt-props-title");

    const btnAddLayer = root.querySelector("#vt-add-layer");
    const layerList = root.querySelector("#vt-layer-list");
    const layerEmpty = root.querySelector("#vt-layer-empty");
    const layerPicked = root.querySelector("#vt-layer-picked");
    const layerScale = root.querySelector("#vt-layer-scale");
    const layerEnable = root.querySelector("#vt-layer-enable");
    const layerX = root.querySelector("#vt-layer-x");
    const layerY = root.querySelector("#vt-layer-y");
    const layerKey = root.querySelector("#vt-layer-key");
    const layerCategory = root.querySelector("#vt-layer-category");
    const layerCategoryFilter = root.querySelector("#vt-layer-category-filter");
    const btnLayerRemove = root.querySelector("#vt-layer-remove");
    const layerPreview = root.querySelector("#vt-layer-preview");
    const layerPreviewEmpty = root.querySelector("#vt-layer-preview-empty");

    const btnRecSub = root.querySelector("#vt-rec-sub");
    const btnAddSub = root.querySelector("#vt-add-sub");
    const subList = root.querySelector("#vt-sub-list");
    const subEmpty = root.querySelector("#vt-sub-empty");
    const subPicked = root.querySelector("#vt-sub-picked");
    const subEnable = root.querySelector("#vt-sub-enable");
    const subText = root.querySelector("#vt-sub-text");
    const fontSelect = root.querySelector("#vt-font");
    const subSize = root.querySelector("#vt-sub-size");
    const subX = root.querySelector("#vt-sub-x");
    const subY = root.querySelector("#vt-sub-y");
    const btnSubRemove = root.querySelector("#vt-sub-remove");

    const musicEnable = root.querySelector("#vt-music-enable");
    const musicSelect = root.querySelector("#vt-music");
    const musicVolume = root.querySelector("#vt-music-volume");

    const btnRender = root.querySelector("#vt-render");
    const btnCancel = root.querySelector("#vt-cancel");
    const vtStatus = root.querySelector("#vt-status");
    const vtLog = root.querySelector("#vt-log");

    let templates = [];
    let activeId = "";
    let activeTemplate = null;
    let renderTaskId = "";
    let rendering = false;
    let fonts = [];
    let bgms = [];
    let selectedLayerId = "";
    let selectedSubId = "";
    let selectedLayerCategoryFilter = "";
    let configSaveTimer = null;
    let baseDurationSec = 0;
    let baseVideoSize = { w: 0, h: 0 };
    const TIMELINE_PX_PER_SEC = 100;
    const quant01 = (n) => Math.round((Number(n) || 0) * 100) / 100;

    const defaultConfig = () => ({
      baseVideoPath: "",
      main: { startSec: 0, endSec: 0 },
      pipLayers: [],
      subtitleLayers: [],
      music: { enable: false, filePath: "", volume: 0.35 }
    });

    const readActiveConfig = () => {
      const base = defaultConfig();
      const edit = activeTemplate?.edit && typeof activeTemplate.edit === "object" ? activeTemplate.edit : {};
      const main = edit?.main && typeof edit.main === "object" ? edit.main : {};
      const pipLayers = Array.isArray(edit?.pipLayers) ? edit.pipLayers : [];
      const subtitleLayers = Array.isArray(edit?.subtitleLayers) ? edit.subtitleLayers : [];
      const music = edit?.music && typeof edit.music === "object" ? edit.music : {};
      return {
        baseVideoPath: String(edit?.baseVideoPath || ""),
        main: {
          startSec: Number(main?.startSec ?? base.main.startSec) || 0,
          endSec: Number(main?.endSec ?? base.main.endSec) || 0
        },
        pipLayers: pipLayers.map((l) => ({
          id: String(l?.id || ""),
          enable: l?.enable !== false,
          type: String(l?.type || ""),
          path: String(l?.path || ""),
          category: String(l?.category || ""),
          scale: Number(l?.scale ?? 0.35) || 0.35,
          xPct: Number(l?.xPct ?? 1) || 1,
          yPct: Number(l?.yPct ?? 0) || 0,
          startSec: Number(l?.startSec ?? 0) || 0,
          endSec: Number(l?.endSec ?? 0) || 0,
          chromaKey: l?.chromaKey === true
        })),
        subtitleLayers: subtitleLayers.map((s) => ({
          id: String(s?.id || ""),
          enable: s?.enable !== false,
          text: String(s?.text || ""),
          fontPath: String(s?.fontPath || ""),
          fontSize: Number(s?.fontSize ?? 48) || 48,
          xPct: Number(s?.xPct ?? 0.5) || 0.5,
          yPct: Number(s?.yPct ?? 0.9) || 0.9,
          startSec: Number(s?.startSec ?? 0) || 0,
          endSec: Number(s?.endSec ?? 0) || 0
        })),
        music: {
          enable: music?.enable === true,
          filePath: String(music?.filePath || ""),
          volume: Number(music?.volume ?? base.music.volume) || base.music.volume
        }
      };
    };

    const writeActiveConfig = (next) => {
      if (!activeTemplate) return;
      activeTemplate.edit = next;
      if (configSaveTimer) clearTimeout(configSaveTimer);
      configSaveTimer = setTimeout(async () => {
        const id = String(activeTemplate?.id || "").trim();
        if (!id) return;
        await window.api?.videoTemplate?.saveConfig?.({ id, config: activeTemplate.edit || {} });
      }, 220);
    };

    const fmtTime = (ts) => {
      const n = Number(ts || 0);
      if (!n) return "未知时间";
      const d = new Date(n);
      const pad = (x) => String(x).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    };

    const setVideoSrc = (p) => {
      const videoPath = String(p || "").trim();
      const url = toFileUrl(videoPath);
      if (!url) {
        vtPreviewEmpty.hidden = false;
        if (vtCanvas) vtCanvas.hidden = true;
        vtVideo.removeAttribute("src");
        return;
      }
      vtPreviewEmpty.hidden = true;
      if (vtCanvas) vtCanvas.hidden = false;
      try {
        vtVideo.pause();
      } catch {}
      vtVideo.src = url;
      vtVideo.load();
    };

    if (vtVideo && vtVideo.__vtMetaBound !== true) {
      vtVideo.__vtMetaBound = true;
      vtVideo.addEventListener("loadedmetadata", () => {
        const dur = Number(vtVideo.duration || 0);
        baseDurationSec = Number.isFinite(dur) && dur > 0 ? dur : baseDurationSec;
        const w = Number(vtVideo.videoWidth || 0);
        const h = Number(vtVideo.videoHeight || 0);
        baseVideoSize = { w, h };
        if (vtCanvas && w > 0 && h > 0) {
          vtCanvas.style.aspectRatio = `${w} / ${h}`;
        }
        if (activeId && activeTemplate) {
          const cfg = readActiveConfig();
          const end = Number(cfg?.main?.endSec || 0);
          const start = Number(cfg?.main?.startSec || 0);
          if (baseDurationSec > 0 && (!Number.isFinite(end) || end <= 0 || end > baseDurationSec || end <= start)) {
            writeActiveConfig({ ...cfg, main: { ...cfg.main, startSec: Math.max(0, start || 0), endSec: baseDurationSec } });
          }
        }
        renderAll();
      });
      vtVideo.addEventListener("error", () => {
        const err = vtVideo?.error;
        toast("预览加载失败。");
        appendLog(
          `预览加载失败：code=${String(err?.code || "")} src=${String(vtVideo?.currentSrc || vtVideo?.src || "")}`
        );
      });
    }

    const setRenderingUI = (isRendering, text) => {
      rendering = isRendering === true;
      if (vtStatus) vtStatus.textContent = text || (rendering ? "渲染中..." : "待命");
      if (btnRender) btnRender.disabled = !activeId || rendering;
      if (btnCancel) btnCancel.disabled = !rendering;
      if (btnImportMain) btnImportMain.disabled = !activeId || rendering;
      if (btnOpenDir) btnOpenDir.disabled = !activeId || rendering;
      if (btnDelete) btnDelete.disabled = !activeId || rendering;
      if (btnRefresh) btnRefresh.disabled = rendering;
      if (btnAddLayer) btnAddLayer.disabled = !activeId || rendering;
      if (btnAddSub) btnAddSub.disabled = !activeId || rendering;
      if (btnRecSub) btnRecSub.disabled = !activeId || rendering;
    };

    const appendLog = (line) => {
      if (!vtLog) return;
      const s = String(line || "").trim();
      if (!s) return;
      const next = `${s}\n`;
      vtLog.textContent = (vtLog.textContent || "") + next;
      if (vtLog.textContent.length > 200000) vtLog.textContent = vtLog.textContent.slice(-200000);
      vtLog.scrollTop = vtLog.scrollHeight;
    };

    const clearLog = () => {
      if (vtLog) vtLog.textContent = "";
    };

    const renderTemplateList = () => {
      if (!vtList) return;
      vtList.innerHTML = "";
      const list = Array.isArray(templates) ? templates : [];
      if (vtCount) vtCount.textContent = String(list.length);
      if (vtEmpty) vtEmpty.hidden = list.length > 0;
      if (templateSelect) {
        templateSelect.innerHTML = `<option value="">未选择</option>${list
          .map((it) => {
            const id = String(it?.id || "");
            const name = String(it?.name || id || "未命名工程");
            return `<option value="${escapeHtmlAttr(id)}">${escapeHtml(name)}</option>`;
          })
          .join("")}`;
        templateSelect.value = list.some((it) => String(it?.id || "") === String(activeId || "")) ? String(activeId || "") : "";
      }
      if (emptyShell) emptyShell.hidden = list.length > 0;
      if (mainContent) mainContent.hidden = list.length <= 0;
      list.forEach((it) => {
        const id = String(it?.id || "");
        const name = String(it?.name || id || "未命名工程");
        const createdAt = Number(it?.createdAt || 0);
        const row = document.createElement("div");
        row.className = "vt2-item-row";

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `vt2-item${id === activeId ? " is-active" : ""}`;
        btn.setAttribute("data-id", id);
        btn.innerHTML = `
          <div class="vt2-item-title">${escapeHtml(name)}</div>
          <div class="vt2-item-sub">${fmtTime(createdAt)}</div>
        `;

        const del = document.createElement("button");
        del.type = "button";
        del.className = "btn btn-danger vt2-item-del";
        del.textContent = "删除";
        del.addEventListener("click", async (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!window.confirm(`确定删除工程：${name} 吗？`)) return;
          const res = await window.api?.videoTemplate?.remove?.({ id });
          if (!res?.ok) {
            toast("删除失败。");
            return;
          }
          toast("已删除。");
          if (String(activeId || "") === id) activeId = "";
          await refresh({ keepActive: false });
        });

        row.appendChild(btn);
        row.appendChild(del);
        vtList.appendChild(row);
      });
    };

    const renderRendersList = (item) => {
      if (!vtRenders) return;
      vtRenders.innerHTML = "";
      const rs = Array.isArray(item?.renders) ? item.renders : [];
      if (vtRenderCount) vtRenderCount.textContent = String(rs.length);
      if (vtRendersEmpty) vtRendersEmpty.hidden = rs.length > 0;
      rs.forEach((r) => {
        const p = String(r?.videoPath || "");
        const name = String(r?.name || "");
        const row = document.createElement("div");
        row.className = "vt-render-row";
        const left = document.createElement("div");
        left.className = "vt-render-name mono";
        left.textContent = name || p;
        const right = document.createElement("div");
        right.className = "card-actions";
        const btnPreview = document.createElement("button");
        btnPreview.className = "btn";
        btnPreview.type = "button";
        btnPreview.textContent = "预览";
        btnPreview.addEventListener("click", () => setVideoSrc(p));
        right.appendChild(btnPreview);
        row.appendChild(left);
        row.appendChild(right);
        vtRenders.appendChild(row);
      });
    };

    const setPropsTab = (tab) => {
      const t = String(tab || "pip");
      Array.from(propsTabs?.querySelectorAll?.("[data-props-tab]") || []).forEach((b) => {
        b.classList.toggle("is-active", b.getAttribute("data-props-tab") === t);
      });
      Array.from(root.querySelectorAll("[data-props-panel]") || []).forEach((p) => {
        p.classList.toggle("is-active", p.getAttribute("data-props-panel") === t);
      });
    };

    const renderFontOptions = () => {
      if (!fontSelect) return;
      const opts = [`<option value="" selected>默认字体</option>`].concat(
        fonts.map((f) => `<option value="${escapeHtmlAttr(f.path)}">${escapeHtmlAttr(f.name)}</option>`)
      );
      fontSelect.innerHTML = opts.join("");
    };

    const renderMusicOptions = () => {
      if (!musicSelect) return;
      const opts = [`<option value="" selected>选择背景音乐</option>`].concat(
        bgms.map((f) => `<option value="${escapeHtmlAttr(f.path)}">${escapeHtmlAttr(f.name)}</option>`)
      );
      musicSelect.innerHTML = opts.join("");
    };

    const ensureFontFace = (fontPath) => {
      const p = String(fontPath || "").trim();
      if (!p) return "";
      const id = `vtfont_${btoa(unescape(encodeURIComponent(p))).replace(/[^a-zA-Z0-9]/g, "").slice(0, 24)}`;
      let styleEl = root.querySelector(`#${id}`);
      if (!styleEl) {
        styleEl = document.createElement("style");
        styleEl.id = id;
        root.appendChild(styleEl);
      }
      const url = toFileUrl(p);
      const family = `VTFont_${id}`;
      styleEl.textContent = `@font-face{font-family:'${family}';src:url('${url}')}`;
      return family;
    };

    const renderLayers = () => {
      if (!vtOverlay) return;
      const cfg = readActiveConfig();
      const layers = Array.isArray(cfg?.pipLayers) ? cfg.pipLayers : [];
      const categories = Array.from(
        new Set(
          layers
            .map((l) => String(l?.category || "").trim())
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b, "zh-CN"));
      if (layerCategoryFilter) {
        const keep = selectedLayerCategoryFilter;
        layerCategoryFilter.innerHTML = `<option value="">全部分组</option>${categories
          .map((cat) => `<option value="${escapeHtml(cat)}">${escapeHtml(cat)}</option>`)
          .join("")}`;
        layerCategoryFilter.value = categories.includes(keep) ? keep : "";
        selectedLayerCategoryFilter = String(layerCategoryFilter.value || "");
      }
      vtOverlay.innerHTML = "";
      vtOverlay.hidden = !activeId;
      const visibleRows = selectedLayerCategoryFilter
        ? layers.filter((l) => String(l?.category || "").trim() === selectedLayerCategoryFilter)
        : layers;
      if (layerEmpty) layerEmpty.hidden = visibleRows.length > 0;
      if (layerList) layerList.innerHTML = "";

      layers.forEach((l, idx) => {
        const id = String(l?.id || "");
        const enable = l?.enable !== false;
        const path = String(l?.path || "").trim();
        const type = String(l?.type || "");
        const category = String(l?.category || "").trim();
        const scale = Math.max(0.05, Math.min(1.0, Number(l?.scale ?? 0.35) || 0.35));
        const xPct = Math.max(0, Math.min(1.0, Number(l?.xPct ?? 1) || 1));
        const yPct = Math.max(0, Math.min(1.0, Number(l?.yPct ?? 0) || 0));
        if (layerList && (!selectedLayerCategoryFilter || category === selectedLayerCategoryFilter)) {
          const row = document.createElement("button");
          row.type = "button";
          row.className = `vt2-layer-item vt2-asset-card${id === selectedLayerId ? " is-active" : ""}`;
          row.setAttribute("data-layer-id", id);
          const thumbUrl = toFileUrl(path);
          const typeLabel = type === "video" ? "视频" : type === "gif" ? "动图" : "图片";
          row.innerHTML = `
            <div class="vt2-asset-thumb">
              ${
                type === "video"
                  ? `<video muted playsinline loop autoplay src="${escapeHtmlAttr(thumbUrl)}"></video>`
                  : `<img draggable="false" src="${escapeHtmlAttr(thumbUrl)}" alt="" />`
              }
            </div>
            <div class="vt2-asset-body">
              <div class="vt2-layer-title">${escapeHtml(path ? path.split(/[/\\\\]/).pop() : `素材${idx + 1}`)}</div>
              <div class="vt2-layer-sub">${escapeHtml(typeLabel)}${category ? `｜${escapeHtml(category)}` : "｜未分组"}</div>
              <div class="vt2-asset-metrics">
                <span class="pill">缩放 ${Math.round(scale * 100)}%</span>
                <span class="pill">X ${Math.round(xPct * 100)}%</span>
                <span class="pill">Y ${Math.round(yPct * 100)}%</span>
              </div>
              <div class="vt2-asset-actions">
                <span class="pill">${enable ? "启用中" : "已禁用"}</span>
                <button class="btn btn-danger vt2-asset-remove" type="button" data-layer-remove-id="${escapeHtmlAttr(id)}">删除</button>
              </div>
            </div>
          `;
          layerList.appendChild(row);
        }

        if (!enable || !path) return;
        const wrap = document.createElement("div");
        wrap.className = `vt2-ov-item${id === selectedLayerId ? " is-active" : ""}`;
        wrap.setAttribute("data-ov-id", id);
        wrap.setAttribute("data-start-sec", String(Number(l?.startSec || 0) || 0));
        wrap.setAttribute("data-end-sec", String(Number(l?.endSec || 0) || 0));
        wrap.style.left = `${xPct * 100}%`;
        wrap.style.top = `${yPct * 100}%`;
        wrap.style.width = `${Math.round(scale * 100)}%`;
        wrap.style.zIndex = String(1000 - idx);
        const ext = path.toLowerCase();
        if (type === "image" || /\.(png|jpg|jpeg|webp|gif)$/i.test(ext)) {
          const img = document.createElement("img");
          img.draggable = false;
          img.src = toFileUrl(path);
          wrap.appendChild(img);
        } else {
          const v = document.createElement("video");
          v.muted = true;
          v.playsInline = true;
          v.loop = true;
          v.src = toFileUrl(path);
          v.load();
          wrap.appendChild(v);
        }
        if (id === selectedLayerId) {
          ["tl", "tr", "bl", "br"].forEach((pos) => {
            const h = document.createElement("div");
            h.className = `vt2-handle ${pos}`;
            h.setAttribute("data-handle", pos);
            wrap.appendChild(h);
          });
        }
        vtOverlay.appendChild(wrap);
      });
    };

    const renderSubtitles = () => {
      const cfg = readActiveConfig();
      const subs = Array.isArray(cfg?.subtitleLayers) ? cfg.subtitleLayers : [];
      if (subEmpty) subEmpty.hidden = subs.length > 0;
      if (subList) subList.innerHTML = "";
      if (vtSub) vtSub.innerHTML = "";

      subs.forEach((s, idx) => {
        const id = String(s?.id || "");
        const enable = s?.enable !== false && String(s?.text || "").trim();
        const text = String(s?.text || "");
        const fontPath = String(s?.fontPath || "");
        const fontSize = Math.max(18, Math.min(120, Number(s?.fontSize || 48) || 48));
        const xPct = Math.max(0, Math.min(1.0, Number(s?.xPct ?? 0.5) || 0.5));
        const yPct = Math.max(0, Math.min(1.0, Number(s?.yPct ?? 0.9) || 0.9));

        if (subList) {
          const row = document.createElement("button");
          row.type = "button";
          row.className = `vt2-layer-item${id === selectedSubId ? " is-active" : ""}`;
          row.setAttribute("data-sub-id", id);
          row.innerHTML = `
            <div class="vt2-layer-title">${escapeHtml(text ? text.slice(0, 28) : `字幕${idx + 1}`)}</div>
            <div class="vt2-layer-sub">字幕</div>
          `;
          subList.appendChild(row);
        }

        if (!enable || !vtSub) return;
        const div = document.createElement("div");
        div.className = `vt2-sub${id === selectedSubId ? " is-active" : ""}`;
        div.setAttribute("data-sub-ov-id", id);
        div.setAttribute("data-start-sec", String(Number(s?.startSec || 0) || 0));
        div.setAttribute("data-end-sec", String(Number(s?.endSec || 0) || 0));
        div.style.left = `${xPct * 100}%`;
        div.style.top = `${yPct * 100}%`;
        div.style.zIndex = String(2000 - idx);
        const family = ensureFontFace(fontPath);
        div.style.fontFamily = family ? `'${family}', system-ui, -apple-system, "Segoe UI", Arial` : "";
        div.style.fontSize = `${fontSize}px`;
        div.textContent = text;
        vtSub.appendChild(div);
      });
    };

    const syncPreviewPlayback = () => {
      if (!vtVideo) return;
      if (vtVideo.__vtBound === true) return;
      vtVideo.__vtBound = true;
      const base = vtVideo;
      const aud = vtMusicAudio;

      const updateVisibility = () => {
        const t = Number(base.currentTime || 0);
        const total = getTimelineTotalSec(readActiveConfig());
        const isInRange = (startRaw, endRaw) => {
          const s = Math.max(0, Number(startRaw || 0) || 0);
          const e = Number(endRaw || 0) || 0;
          const ee = e > 0 ? e : total;
          return t >= s && t <= ee;
        };
        Array.from(vtOverlay?.querySelectorAll?.("[data-ov-id]") || []).forEach((el) => {
          const ok = isInRange(el.getAttribute("data-start-sec"), el.getAttribute("data-end-sec"));
          el.style.display = ok ? "" : "none";
        });
        Array.from(vtSub?.querySelectorAll?.("[data-sub-ov-id]") || []).forEach((el) => {
          const ok = isInRange(el.getAttribute("data-start-sec"), el.getAttribute("data-end-sec"));
          el.style.display = ok ? "" : "none";
        });
      };

      const syncTime = () => {
        const t = Number(base.currentTime || 0);
        const overlayVideos = Array.from(vtOverlay?.querySelectorAll?.("video") || []);
        overlayVideos.forEach((v) => {
          try {
            const dur = Number(v.duration || 0);
            v.currentTime = dur > 0 ? Math.min(Math.max(0, t % dur), Math.max(0, dur - 0.1)) : t;
          } catch {}
        });
        if (aud && !aud.paused && Number.isFinite(aud.duration) && aud.duration > 0) {
          try {
            aud.currentTime = t % aud.duration;
          } catch {}
        }
      };

      base.addEventListener("seeking", syncTime);
      base.addEventListener("seeked", syncTime);
      base.addEventListener("timeupdate", updateVisibility);
      base.addEventListener("play", () => {
        const overlayVideos = Array.from(vtOverlay?.querySelectorAll?.("video") || []);
        overlayVideos.forEach((v) => {
          try {
            v.playbackRate = base.playbackRate || 1;
            v.play().catch(() => {});
          } catch {}
        });
        const cfg = readActiveConfig();
        const music = cfg.music || {};
        const enable = music?.enable === true && String(music?.filePath || "").trim();
        if (enable && aud) {
          const url = toFileUrl(String(music.filePath || ""));
          if (url && aud.src !== url) aud.src = url;
          aud.volume = Math.max(0, Math.min(1, Number(music.volume ?? 0.35) || 0.35));
          aud.loop = true;
          aud.play().catch(() => {});
          syncTime();
        }
        updateVisibility();
      });
      base.addEventListener("pause", () => {
        const overlayVideos = Array.from(vtOverlay?.querySelectorAll?.("video") || []);
        overlayVideos.forEach((v) => {
          try {
            v.pause();
          } catch {}
        });
        try {
          aud?.pause?.();
        } catch {}
      });
      base.addEventListener("ratechange", () => {
        const overlayVideos = Array.from(vtOverlay?.querySelectorAll?.("video") || []);
        overlayVideos.forEach((v) => {
          try {
            v.playbackRate = base.playbackRate || 1;
          } catch {}
        });
      });
    };

    const mkEmptyBlock = (text) => {
      const b = document.createElement("div");
      b.className = "vt2-block is-muted";
      b.textContent = text;
      b.style.left = "10px";
      b.style.width = "120px";
      return b;
    };

    const getTimelineTotalSec = (cfg) => {
      const mainStart = Math.max(0, Number(cfg?.main?.startSec || 0) || 0);
      const mainEndRaw = Number(cfg?.main?.endSec || 0) || 0;
      const mainEnd = mainEndRaw > 0 ? mainEndRaw : baseDurationSec;
      const total = Math.max(0, (Number.isFinite(mainEnd) ? mainEnd : 0) - mainStart);
      if (total > 0) return total;
      if (baseDurationSec > 0) return baseDurationSec;
      return 60;
    };

    const renderRuler = () => {
      if (!vtRuler) return;
      const cfg = readActiveConfig();
      const totalSec = getTimelineTotalSec(cfg);
      const widthPx = Math.max(320, Math.ceil(totalSec * TIMELINE_PX_PER_SEC));
      vtRuler.innerHTML = "";
      vtRuler.style.width = `${widthPx}px`;

      const tickEvery = totalSec > 120 ? 10 : 5;
      for (let t = 0; t <= Math.ceil(totalSec); t += 1) {
        const x = t * TIMELINE_PX_PER_SEC;
        const div = document.createElement("div");
        div.className = `vt2-tick${t % tickEvery === 0 ? " is-major" : ""}`;
        div.style.left = `${x}px`;
        if (t % tickEvery === 0) {
          const lab = document.createElement("div");
          lab.className = "vt2-tick-label";
          lab.textContent = `${t}s`;
          div.appendChild(lab);
        }
        vtRuler.appendChild(div);
      }
    };

    const renderTimeline = () => {
      if (!vtTimeline) return;
      const cfg = readActiveConfig();
      const totalSec = getTimelineTotalSec(cfg);
      const widthPx = Math.max(320, Math.ceil(totalSec * TIMELINE_PX_PER_SEC));
      const layers = Array.isArray(cfg?.pipLayers) ? cfg.pipLayers : [];
      const subs = Array.isArray(cfg?.subtitleLayers) ? cfg.subtitleLayers : [];
      const music = cfg.music || {};
      vtTimeline.innerHTML = "";

      const mkRow = (label, type, index, contentEl) => {
        const row = document.createElement("div");
        row.className = "vt2-track";
        const left = document.createElement("div");
        left.className = "vt2-track-name";
        left.textContent = label;
        const right = document.createElement("div");
        right.className = "vt2-track-lane";
        right.style.width = `${widthPx}px`;
        if (type) right.setAttribute("data-track-type", type);
        if (typeof index === "number") right.setAttribute("data-track-index", String(index));
        if (contentEl) right.appendChild(contentEl);
        row.appendChild(left);
        row.appendChild(right);
        vtTimeline.appendChild(row);
      };

      const mkTimeBlock = ({ type, id, label, startSec, endSec, active, muted }) => {
        const s = Math.max(0, Number(startSec || 0) || 0);
        const eRaw = Number(endSec || 0) || 0;
        const e = eRaw > 0 ? eRaw : totalSec;
        const ee = Math.max(s + 0.2, Math.min(totalSec, e));
        const leftPx = s * TIMELINE_PX_PER_SEC;
        const width = Math.max(16, (ee - s) * TIMELINE_PX_PER_SEC);

        const b = document.createElement("button");
        b.type = "button";
        b.draggable = type === "pip" || type === "sub";
        b.className = `vt2-block${active ? " is-active" : ""}${muted ? " is-muted" : ""}`;
        b.style.left = `${leftPx}px`;
        b.style.width = `${width}px`;
        b.setAttribute("data-block-type", type);
        if (type === "pip") b.setAttribute("data-layer-id", String(id || ""));
        if (type === "sub") b.setAttribute("data-sub-id", String(id || ""));
        b.innerHTML = `
          <span class="vt2-block-text">${escapeHtml(label || "")}</span>
          <span class="vt2-block-handle left" data-time-handle="start"></span>
          <span class="vt2-block-handle right" data-time-handle="end"></span>
        `;
        return b;
      };

      mkRow(
        "主轨",
        "base",
        0,
        mkTimeBlock({
          type: "base",
          id: "base",
          label: "主视频",
          startSec: 0,
          endSec: totalSec,
          active: false,
          muted: false
        })
      );

      if (!layers.length) mkRow("画中画", "pip", 0, mkEmptyBlock("无素材"));
      layers.forEach((l, idx) => {
        const name = String(l?.path || "").split(/[/\\\\]/).pop() || `画中画${idx + 1}`;
        mkRow(
          `画中画${idx + 1}`,
          "pip",
          idx,
          mkTimeBlock({
            type: "pip",
            id: String(l?.id || ""),
            label: name,
            startSec: l?.startSec || 0,
            endSec: l?.endSec || 0,
            active: String(l?.id || "") === selectedLayerId,
            muted: l?.enable === false
          })
        );
      });

      if (!subs.length) mkRow("字幕", "sub", 0, mkEmptyBlock("无字幕"));
      subs.forEach((s, idx) => {
        const text = String(s?.text || "").trim();
        mkRow(
          `字幕${idx + 1}`,
          "sub",
          idx,
          mkTimeBlock({
            type: "sub",
            id: String(s?.id || ""),
            label: text ? text.slice(0, 18) : `字幕${idx + 1}`,
            startSec: s?.startSec || 0,
            endSec: s?.endSec || 0,
            active: String(s?.id || "") === selectedSubId,
            muted: s?.enable === false || !text
          })
        );
      });

      mkRow(
        "音乐",
        "music",
        0,
        mkTimeBlock({
          type: "music",
          id: "music",
          label: music?.enable === true ? "背景音乐" : "关闭",
          startSec: 0,
          endSec: totalSec,
          active: false,
          muted: music?.enable !== true
        })
      );
    };

    const renderAll = () => {
      renderLayers();
      renderSubtitles();
      renderRuler();
      renderTimeline();
      syncPreviewPlayback();
    };

    const updateLayerEditor = () => {
      const cfg = readActiveConfig();
      const layers = Array.isArray(cfg?.pipLayers) ? cfg.pipLayers : [];
      const cur = layers.find((l) => String(l?.id || "") === String(selectedLayerId || "")) || null;
      if (layerPicked) layerPicked.textContent = cur?.path ? String(cur.path).split(/[/\\\\]/).pop() : "未选择";
      if (btnLayerRemove) btnLayerRemove.disabled = !cur;
      if (layerScale) layerScale.value = cur ? String(cur.scale ?? 0.35) : "0.35";
      if (layerEnable) layerEnable.checked = cur ? cur.enable !== false : true;
      if (layerX) layerX.value = cur ? String(cur.xPct ?? 1) : "1";
      if (layerY) layerY.value = cur ? String(cur.yPct ?? 0) : "0";
      if (layerKey) layerKey.checked = cur ? cur.chromaKey === true : false;
      if (layerCategory) layerCategory.value = cur ? String(cur.category || "") : "";
      if (propsTitle) propsTitle.textContent = String(activeTemplate?.name || activeId || "未选择");
      if (layerPreview) {
        const filePath = String(cur?.path || "").trim();
        const url = toFileUrl(filePath);
        layerPreview.innerHTML = `<div class="vtm-detail-preview-empty" id="vt-layer-preview-empty">选中素材后，这里显示素材缩略预览。</div>`;
        if (filePath && url) {
          layerPreview.innerHTML = cur?.type === "video"
            ? `<video src="${escapeHtmlAttr(url)}" muted playsinline loop autoplay controls></video>`
            : `<img src="${escapeHtmlAttr(url)}" alt="" draggable="false" />`;
        }
      }
    };

    const selectLayer = (id) => {
      selectedLayerId = String(id || "").trim();
      renderAll();
      updateLayerEditor();
    };

    const applyLayerEdits = () => {
      const cfg = readActiveConfig();
      const layers = Array.isArray(cfg?.pipLayers) ? cfg.pipLayers : [];
      const idx = layers.findIndex((l) => String(l?.id || "") === String(selectedLayerId || ""));
      if (idx < 0) return;
      const next = layers.slice();
      const cur = { ...next[idx] };
      const s = Number(String(layerScale?.value || "").trim());
      const x = Number(String(layerX?.value || "").trim());
      const y = Number(String(layerY?.value || "").trim());
      cur.scale = Number.isFinite(s) ? Math.max(0.05, Math.min(1.0, s)) : cur.scale;
      cur.xPct = Number.isFinite(x) ? Math.max(0, Math.min(1.0, x)) : cur.xPct;
      cur.yPct = Number.isFinite(y) ? Math.max(0, Math.min(1.0, y)) : cur.yPct;
      cur.enable = layerEnable?.checked !== false;
      cur.chromaKey = layerKey?.checked === true;
      cur.category = String(layerCategory?.value || "").trim();
      next[idx] = cur;
      writeActiveConfig({ ...cfg, pipLayers: next });
      renderAll();
    };

    const updateSubEditor = () => {
      const cfg = readActiveConfig();
      const subs = Array.isArray(cfg?.subtitleLayers) ? cfg.subtitleLayers : [];
      const cur = subs.find((s) => String(s?.id || "") === String(selectedSubId || "")) || null;
      if (subPicked) subPicked.textContent = cur?.text ? String(cur.text).slice(0, 28) : "未选择";
      if (btnSubRemove) btnSubRemove.disabled = !cur;
      if (subEnable) subEnable.checked = cur ? cur.enable !== false : false;
      if (subText) subText.value = cur ? String(cur.text || "") : "";
      if (subSize) subSize.value = cur ? String(cur.fontSize || 48) : "48";
      if (fontSelect) fontSelect.value = cur ? String(cur.fontPath || "") : "";
      if (subX) subX.value = cur ? String(cur.xPct ?? 0.5) : "0.5";
      if (subY) subY.value = cur ? String(cur.yPct ?? 0.9) : "0.9";
    };

    const selectSub = (id) => {
      selectedSubId = String(id || "").trim();
      renderAll();
      updateSubEditor();
    };

    const applySubEdits = () => {
      const cfg = readActiveConfig();
      const subs = Array.isArray(cfg?.subtitleLayers) ? cfg.subtitleLayers : [];
      const idx = subs.findIndex((s) => String(s?.id || "") === String(selectedSubId || ""));
      if (idx < 0) return;
      const next = subs.slice();
      const cur = { ...next[idx] };
      cur.enable = subEnable?.checked !== false;
      cur.text = String(subText?.value || "");
      const sizeN = Number(String(subSize?.value || "").trim());
      cur.fontSize = Number.isFinite(sizeN) ? Math.max(18, Math.min(120, sizeN)) : cur.fontSize;
      cur.fontPath = String(fontSelect?.value || "");
      const xN = Number(String(subX?.value || "").trim());
      const yN = Number(String(subY?.value || "").trim());
      cur.xPct = Number.isFinite(xN) ? Math.max(0, Math.min(1.0, xN)) : cur.xPct;
      cur.yPct = Number.isFinite(yN) ? Math.max(0, Math.min(1.0, yN)) : cur.yPct;
      next[idx] = cur;
      writeActiveConfig({ ...cfg, subtitleLayers: next });
      renderAll();
    };

    const addLayerFromPath = (filePath) => {
      const p = String(filePath || "").trim();
      if (!p) return;
      const ext = p.toLowerCase();
      const isImage = /\.(png|jpg|jpeg|webp)$/i.test(ext);
      const isGif = /\.gif$/i.test(ext);
      const isVideo = /\.(mp4|mov|webm|mkv)$/i.test(ext);
      const isAudio = /\.(mp3|wav|m4a|aac|flac)$/i.test(ext);
      const isFont = /\.(ttf|otf|ttc)$/i.test(ext);

      const cfg = readActiveConfig();
      if (isAudio) {
        writeActiveConfig({ ...cfg, music: { ...cfg.music, enable: true, filePath: p } });
        if (musicEnable) musicEnable.checked = true;
        if (musicSelect) musicSelect.value = p;
        renderAll();
        return;
      }
      if (isFont) {
        const subs = Array.isArray(cfg?.subtitleLayers) ? cfg.subtitleLayers : [];
        const idx = subs.findIndex((s) => String(s?.id || "") === String(selectedSubId || ""));
        if (idx >= 0) {
          const next = subs.slice();
          next[idx] = { ...next[idx], enable: true, fontPath: p };
          writeActiveConfig({ ...cfg, subtitleLayers: next });
          selectedSubId = String(next[idx].id || "");
        } else if (subs.length) {
          const next = subs.slice();
          next[0] = { ...next[0], enable: true, fontPath: p };
          writeActiveConfig({ ...cfg, subtitleLayers: next });
          selectedSubId = String(next[0].id || "");
        } else {
          const total = getTimelineTotalSec(cfg);
          const playhead = clamp(Number(vtVideo?.currentTime || 0) || 0, 0, total);
          const end = Math.min(total, playhead + 5);
          const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
          const next = [{ id, enable: true, text: "字幕", fontPath: p, fontSize: 48, xPct: 0.5, yPct: 0.9, startSec: playhead, endSec: end }];
          writeActiveConfig({ ...cfg, subtitleLayers: next });
          selectedSubId = id;
        }
        updateSubEditor();
        renderAll();
        return;
      }
      if (!isImage && !isGif && !isVideo) return;

      const layers = Array.isArray(cfg?.pipLayers) ? cfg.pipLayers : [];
      const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
      const total = getTimelineTotalSec(cfg);
      const playhead = clamp(Number(vtVideo?.currentTime || 0) || 0, 0, total);
      const end = Math.min(total, playhead + 5);
      const next = [
        {
          id,
          enable: true,
          type: isImage ? "image" : isGif ? "gif" : "video",
          path: p,
          category: "",
          scale: 0.35,
          xPct: 0.8,
          yPct: 0.2,
          startSec: playhead,
          endSec: end,
          chromaKey: false
        },
        ...layers
      ];
      writeActiveConfig({ ...cfg, pipLayers: next });
      selectLayer(id);
    };

    const removeLayerById = (id) => {
      const targetId = String(id || "").trim();
      if (!targetId) return;
      const cfg = readActiveConfig();
      const layers = Array.isArray(cfg?.pipLayers) ? cfg.pipLayers : [];
      const next = layers.filter((l) => String(l?.id || "") !== targetId);
      if (String(selectedLayerId || "") === targetId) selectedLayerId = "";
      writeActiveConfig({ ...cfg, pipLayers: next });
      renderAll();
      updateLayerEditor();
    };

    const setActiveTemplate = (id) => {
      activeId = String(id || "").trim();
      activeTemplate = (Array.isArray(templates) ? templates : []).find((x) => String(x?.id || "") === activeId) || null;
      if (vtActiveLabel) vtActiveLabel.textContent = String(activeTemplate?.name || activeId || "未选择");
      if (vtActiveMeta) vtActiveMeta.textContent = activeTemplate ? fmtTime(activeTemplate?.createdAt || 0) : "—";
      if (propsTitle) propsTitle.textContent = String(activeTemplate?.name || activeId || "未选择");
      if (templateSelect) templateSelect.value = activeId || "";
      if (btnOpenDir) btnOpenDir.disabled = !activeId || rendering;
      if (btnDelete) btnDelete.disabled = !activeId || rendering;
      if (btnRender) btnRender.disabled = !activeId || rendering;
      if (btnAddLayer) btnAddLayer.disabled = !activeId || rendering;
      if (btnAddSub) btnAddSub.disabled = !activeId || rendering;
      if (btnRecSub) btnRecSub.disabled = !activeId || rendering;
      if (btnImportMain) btnImportMain.disabled = !activeId || rendering;
      selectedLayerId = "";
      selectedSubId = "";
      renderTemplateList();
      renderRendersList(activeTemplate);

      const cfg = readActiveConfig();
      const mainPath = String(cfg.baseVideoPath || activeTemplate?.videoPath || "");
      setVideoSrc(mainPath);
      const subs = Array.isArray(cfg?.subtitleLayers) ? cfg.subtitleLayers : [];
      selectedSubId = subs.length ? String(subs[0]?.id || "") : "";
      updateSubEditor();
      if (musicEnable) musicEnable.checked = cfg.music?.enable === true;
      if (musicSelect) musicSelect.value = String(cfg.music?.filePath || "");
      if (musicVolume) musicVolume.value = String(cfg.music?.volume ?? 0.35);

      if (vtOverlay) vtOverlay.hidden = !activeId;
      updateLayerEditor();
      renderAll();
    };

    const refresh = async ({ keepActive = true } = {}) => {
      const res = await window.api?.videoTemplate?.list?.();
      if (!res?.ok) {
        toast("加载失败，请查看运行日志。");
        return;
      }
      templates = Array.isArray(res?.items) ? res.items : [];
      if (!templates.length) {
        setActiveTemplate("");
        renderTemplateList();
        renderRendersList(null);
        setVideoSrc("");
        return;
      }
      const nextId = keepActive && activeId && templates.some((x) => String(x?.id || "") === activeId) ? activeId : String(templates[0]?.id || "");
      renderTemplateList();
      setActiveTemplate(nextId);
    };

    vtList?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-id]");
      if (!btn) return;
      const id = String(btn.getAttribute("data-id") || "").trim();
      if (!id) return;
      setActiveTemplate(id);
    });

    templateSelect?.addEventListener("change", (e) => {
      const id = String(e.target.value || "").trim();
      setActiveTemplate(id);
    });

    propsTabs?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-props-tab]");
      if (!btn) return;
      setPropsTab(btn.getAttribute("data-props-tab"));
    });

    layerList?.addEventListener("click", (e) => {
      const removeBtn = e.target.closest("[data-layer-remove-id]");
      if (removeBtn) {
        e.preventDefault();
        e.stopPropagation();
        const id = String(removeBtn.getAttribute("data-layer-remove-id") || "").trim();
        if (!id) return;
        if (!window.confirm("确定删除这个素材吗？")) return;
        removeLayerById(id);
        return;
      }
      const btn = e.target.closest("[data-layer-id]");
      if (!btn) return;
      selectLayer(btn.getAttribute("data-layer-id"));
    });

    subList?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-sub-id]");
      if (!btn) return;
      selectSub(btn.getAttribute("data-sub-id"));
      setPropsTab("sub");
    });

    vtTimeline?.addEventListener("click", (e) => {
      const pip = e.target.closest("[data-layer-id]");
      if (pip) {
        selectLayer(pip.getAttribute("data-layer-id"));
        setPropsTab("pip");
        return;
      }
      const sub = e.target.closest("[data-sub-id]");
      if (sub) {
        selectSub(sub.getAttribute("data-sub-id"));
        setPropsTab("sub");
      }
    });

    const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

    const getLaneFromEvent = (e) => e.target.closest(".vt2-track-lane");

    let timelineEdit = null;
    let timelineRaf = 0;
    let timelineLastClientX = 0;
    vtTimeline?.addEventListener("mousedown", (e) => {
      const block = e.target.closest("[data-block-type]");
      if (!block) return;
      const lane = getLaneFromEvent(e);
      if (!lane) return;
      const type = String(block.getAttribute("data-block-type") || "");
      const handle = e.target.closest("[data-time-handle]")?.getAttribute?.("data-time-handle") || "";
      const cfg = readActiveConfig();
      const totalSec = getTimelineTotalSec(cfg);
      const laneRect = lane.getBoundingClientRect();
      const blockRect = block.getBoundingClientRect();
      const scroller = vtTimeline?.closest?.(".vt2-bottom") || vtTimeline?.parentElement || null;

      if (type === "pip") {
        const id = String(block.getAttribute("data-layer-id") || "").trim();
        if (!id) return;
        selectLayer(id);
      } else if (type === "sub") {
        const id = String(block.getAttribute("data-sub-id") || "").trim();
        if (!id) return;
        selectSub(id);
      }

      if (type === "music") return;

      const scrollLeft = Number(scroller?.scrollLeft || 0) || 0;
      const pointerSec = quant01((scrollLeft + (e.clientX - laneRect.left)) / TIMELINE_PX_PER_SEC);
      const leftSec = Number(block.style.left.replace("px", "")) / TIMELINE_PX_PER_SEC || 0;
      const widthSec = Number(block.style.width.replace("px", "")) / TIMELINE_PX_PER_SEC || 0;
      const offsetSec = clamp(pointerSec - leftSec, 0, Math.max(0, widthSec));

      timelineEdit = {
        type,
        id: type === "pip" ? String(block.getAttribute("data-layer-id") || "") : type === "sub" ? String(block.getAttribute("data-sub-id") || "") : "base",
        mode: handle ? `resize-${handle}` : "move",
        lane,
        laneRect,
        totalSec,
        block,
        startLeftSec: leftSec,
        startWidthSec: widthSec,
        offsetSec
      };

      if (type === "base" && timelineEdit.mode === "move") timelineEdit.mode = "noop";
      if (timelineEdit.mode === "noop") return;

      e.preventDefault();
      const prevUserSelect = document.body.style.userSelect;
      const prevCursor = document.body.style.cursor;
      document.body.style.userSelect = "none";
      document.body.style.cursor = "grabbing";
      const applyMove = () => {
        if (!timelineEdit) return;
        const tr = timelineEdit.lane.getBoundingClientRect();
        const sl = Number((scroller || {}).scrollLeft || 0) || 0;
        const s = quant01((sl + (timelineLastClientX - tr.left)) / TIMELINE_PX_PER_SEC);
        const minLen = 0.01;
        let newLeft = timelineEdit.startLeftSec;
        let newWidth = timelineEdit.startWidthSec;

        if (timelineEdit.type === "base") {
          if (timelineEdit.mode === "resize-start") {
            const nextWidth = clamp(timelineEdit.startWidthSec - s, minLen, timelineEdit.totalSec);
            newLeft = 0;
            newWidth = nextWidth;
          } else if (timelineEdit.mode === "resize-end") {
            newLeft = 0;
            newWidth = clamp(s, minLen, timelineEdit.totalSec);
          }
        } else if (timelineEdit.mode === "move") {
          const dur = Math.max(minLen, timelineEdit.startWidthSec);
          newLeft = clamp(s - timelineEdit.offsetSec, 0, Math.max(0, timelineEdit.totalSec - dur));
          newWidth = dur;
        } else if (timelineEdit.mode === "resize-start") {
          const right = timelineEdit.startLeftSec + timelineEdit.startWidthSec;
          newLeft = clamp(s, 0, Math.max(0, right - minLen));
          newWidth = clamp(right - newLeft, minLen, timelineEdit.totalSec);
        } else if (timelineEdit.mode === "resize-end") {
          const left = timelineEdit.startLeftSec;
          const end = clamp(s, left + minLen, timelineEdit.totalSec);
          newLeft = left;
          newWidth = end - left;
        }

        newLeft = quant01(newLeft);
        newWidth = quant01(newWidth);
        timelineEdit.block.style.left = `${Math.round(newLeft * TIMELINE_PX_PER_SEC)}px`;
        timelineEdit.block.style.width = `${Math.round(newWidth * TIMELINE_PX_PER_SEC)}px`;
      };
      const onMove = (ev) => {
        timelineLastClientX = ev.clientX;
        if (timelineRaf) return;
        timelineRaf = requestAnimationFrame(() => {
          timelineRaf = 0;
          applyMove();
        });
      };

      const onUp = () => {
        if (!timelineEdit) return;
        if (timelineRaf) {
          cancelAnimationFrame(timelineRaf);
          timelineRaf = 0;
        }
        document.body.style.userSelect = prevUserSelect;
        document.body.style.cursor = prevCursor;
        const cfg2 = readActiveConfig();
        const total2 = getTimelineTotalSec(cfg2);
        const leftSec2 = quant01(Number(timelineEdit.block.style.left.replace("px", "")) / TIMELINE_PX_PER_SEC || 0);
        const widthSec2 = quant01(Number(timelineEdit.block.style.width.replace("px", "")) / TIMELINE_PX_PER_SEC || 0);
        const start = quant01(clamp(leftSec2, 0, total2));
        const end = quant01(clamp(leftSec2 + Math.max(0.01, widthSec2), 0.01, total2));

        if (timelineEdit.type === "pip") {
          const layers = Array.isArray(cfg2?.pipLayers) ? cfg2.pipLayers : [];
          const idx = layers.findIndex((l) => String(l?.id || "") === String(timelineEdit.id || ""));
          if (idx >= 0) {
            const next = layers.slice();
            next[idx] = { ...next[idx], startSec: start, endSec: end };
            writeActiveConfig({ ...cfg2, pipLayers: next });
          }
          updateLayerEditor();
        } else if (timelineEdit.type === "sub") {
          const subs = Array.isArray(cfg2?.subtitleLayers) ? cfg2.subtitleLayers : [];
          const idx = subs.findIndex((s) => String(s?.id || "") === String(timelineEdit.id || ""));
          if (idx >= 0) {
            const next = subs.slice();
            next[idx] = { ...next[idx], startSec: start, endSec: end };
            writeActiveConfig({ ...cfg2, subtitleLayers: next });
          }
          updateSubEditor();
        } else if (timelineEdit.type === "base") {
          const srcStart = Math.max(0, Number(cfg2?.main?.startSec || 0) || 0);
          const srcEndRaw = Number(cfg2?.main?.endSec || 0) || 0;
          const srcEnd = srcEndRaw > 0 ? srcEndRaw : baseDurationSec;
          if (timelineEdit.mode === "resize-start") {
            const delta = clamp(total2 - (end - start), 0, total2);
            const nextStart = clamp(srcStart + delta, 0, Math.max(0, srcEnd - 0.01));
            writeActiveConfig({ ...cfg2, main: { startSec: nextStart, endSec: srcEndRaw } });
          } else if (timelineEdit.mode === "resize-end") {
            const nextEnd = clamp(srcStart + (end - start), srcStart + 0.01, baseDurationSec || srcStart + (end - start));
            writeActiveConfig({ ...cfg2, main: { startSec: srcStart, endSec: nextEnd } });
          }
        }

        timelineEdit = null;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        renderAll();
      };

      timelineLastClientX = e.clientX;
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    });

    const moveItem = (arr, fromIndex, toIndex) => {
      const list = Array.isArray(arr) ? arr.slice() : [];
      const from = Number(fromIndex);
      const to = Number(toIndex);
      if (!Number.isFinite(from) || !Number.isFinite(to)) return list;
      if (from < 0 || from >= list.length) return list;
      const clampedTo = Math.max(0, Math.min(list.length - 1, to));
      if (from === clampedTo) return list;
      const [item] = list.splice(from, 1);
      list.splice(clampedTo, 0, item);
      return list;
    };

    let timelineDrag = null;
    vtTimeline?.addEventListener("dragstart", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      const type = String(btn.getAttribute("data-block-type") || "").trim();
      if (type === "pip") {
        const id = String(btn.getAttribute("data-layer-id") || "").trim();
        if (!id) return;
        timelineDrag = { type: "pip", id };
        try {
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", `pip:${id}`);
        } catch {}
      } else if (type === "sub") {
        const id = String(btn.getAttribute("data-sub-id") || "").trim();
        if (!id) return;
        timelineDrag = { type: "sub", id };
        try {
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", `sub:${id}`);
        } catch {}
      }
    });

    vtTimeline?.addEventListener("dragover", (e) => {
      const lane = e.target.closest("[data-track-type][data-track-index]");
      if (!lane) return;
      const type = String(lane.getAttribute("data-track-type") || "");
      if (type !== "pip" && type !== "sub") return;
      e.preventDefault();
      try {
        e.dataTransfer.dropEffect = "move";
      } catch {}
    });

    vtTimeline?.addEventListener("drop", (e) => {
      const lane = e.target.closest("[data-track-type][data-track-index]");
      if (!lane) return;
      const type = String(lane.getAttribute("data-track-type") || "");
      const toIndex = Number(lane.getAttribute("data-track-index"));
      if (!Number.isFinite(toIndex)) return;
      const drag = timelineDrag;
      timelineDrag = null;
      if (!drag || drag.type !== type) return;

      const cfg = readActiveConfig();
      if (type === "pip") {
        const layers = Array.isArray(cfg?.pipLayers) ? cfg.pipLayers : [];
        const fromIndex = layers.findIndex((l) => String(l?.id || "") === String(drag.id || ""));
        if (fromIndex < 0) return;
        const next = moveItem(layers, fromIndex, toIndex);
        writeActiveConfig({ ...cfg, pipLayers: next });
        renderAll();
        updateLayerEditor();
        return;
      }
      if (type === "sub") {
        const subs = Array.isArray(cfg?.subtitleLayers) ? cfg.subtitleLayers : [];
        const fromIndex = subs.findIndex((s) => String(s?.id || "") === String(drag.id || ""));
        if (fromIndex < 0) return;
        const next = moveItem(subs, fromIndex, toIndex);
        writeActiveConfig({ ...cfg, subtitleLayers: next });
        renderAll();
        updateSubEditor();
      }
    });

    btnOpenDir?.addEventListener("click", async () => {
      if (!activeId) return;
      await window.api?.videoTemplate?.reveal?.({ id: activeId });
    });

    btnDelete?.addEventListener("click", async () => {
      if (!activeId) return;
      if (!window.confirm("确定删除该模板及其渲染输出吗？")) return;
      const res = await window.api?.videoTemplate?.remove?.({ id: activeId });
      if (!res?.ok) {
        toast("删除失败。");
        return;
      }
      toast("已删除。");
      activeId = "";
      await refresh({ keepActive: false });
    });

    const pickFiles = async () => {
      const res = await window.api?.openFile?.({
        title: "选择画中画素材",
        properties: ["openFile", "multiSelections"],
        filters: [
          { name: "画中画素材", extensions: ["png", "jpg", "jpeg", "webp", "gif", "mp4", "mov", "webm", "mkv"] }
        ]
      });
      if (res?.canceled) return "";
      return Array.isArray(res?.filePaths) ? res.filePaths.map((x) => String(x || "").trim()).filter(Boolean) : [];
    };

    btnImportMain?.addEventListener("click", async () => {
      if (!activeId) return;
      const filePaths = await pickFiles();
      const fp = Array.isArray(filePaths) ? String(filePaths[0] || "").trim() : "";
      if (!fp) return;
      const res = await window.api?.videoTemplate?.importMainVideo?.({ id: activeId, filePath: fp });
      if (!res?.ok || !res?.videoPath) {
        toast("导入失败，请查看运行日志。");
        return;
      }
      const cfg = readActiveConfig();
      writeActiveConfig({ ...cfg, baseVideoPath: String(res.videoPath || ""), main: { startSec: 0, endSec: 0 } });
      setVideoSrc(String(res.videoPath || ""));
      toast("已导入主视频。");
    });

    btnRecSub?.addEventListener("click", async () => {
      if (!activeId) return;
      const res = await window.api?.videoTemplate?.loadRecognizedSubtitles?.({ id: activeId });
      const items = res?.ok && Array.isArray(res.items) ? res.items : [];
      if (!items.length) {
        toast("未找到已识别字幕。");
        return;
      }
      const cfg = readActiveConfig();
      const next = items
        .map((x) => ({
          id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
          enable: true,
          text: String(x?.text || "").trim(),
          fontPath: String(fontSelect?.value || ""),
          fontSize: Number(String(subSize?.value || "").trim()) || 48,
          xPct: 0.5,
          yPct: 0.9,
          startSec: Number(x?.startSec || 0) || 0,
          endSec: Number(x?.endSec || 0) || 0
        }))
        .filter((x) => x.text);
      if (!next.length) {
        toast("字幕数据为空。");
        return;
      }
      writeActiveConfig({ ...cfg, subtitleLayers: next });
      selectedSubId = String(next[0]?.id || "");
      updateSubEditor();
      renderAll();
      setPropsTab("sub");
      toast("已加载识别字幕。");
    });

    const addImportedAssets = (items) => {
      const imported = Array.isArray(items) ? items : [];
      if (!imported.length) return;
      imported.forEach((item) => addLayerFromPath(item?.path || ""));
    };

    const importAssetFiles = async (filePaths) => {
      const list = Array.isArray(filePaths) ? filePaths.map((x) => String(x || "").trim()).filter(Boolean) : [];
      if (!list.length) return;
      const res = await window.api?.videoTemplate?.importAssets?.({ id: activeId, filePaths: list });
      if (!res?.ok) {
        toast("素材导入失败。");
        return;
      }
      if (res?.id) {
        await refresh({ keepActive: false });
        setActiveTemplate(String(res.id || "").trim());
      }
      if (res?.id && String(activeId || "") !== String(res.id || "")) {
        activeId = String(res.id || "").trim();
        activeTemplate = (Array.isArray(templates) ? templates : []).find((x) => String(x?.id || "") === activeId) || activeTemplate;
      }
      addImportedAssets(res.items);
      if (Array.isArray(res.items) && res.items.length) {
        toast(`已导入 ${res.items.length} 个素材。`);
      }
    };

    btnAddLayer?.addEventListener("click", async () => {
      const filePaths = await pickFiles();
      if (!Array.isArray(filePaths) || !filePaths.length) return;
      await importAssetFiles(filePaths);
    });

    btnAddSub?.addEventListener("click", () => {
      if (!activeId) return;
      const cfg = readActiveConfig();
      const subs = Array.isArray(cfg?.subtitleLayers) ? cfg.subtitleLayers : [];
      const total = getTimelineTotalSec(cfg);
      const playhead = clamp(Number(vtVideo?.currentTime || 0) || 0, 0, total);
      const end = Math.min(total, playhead + 3);
      const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
      const next = [{ id, enable: true, text: "字幕", fontPath: "", fontSize: 48, xPct: 0.5, yPct: 0.9, startSec: playhead, endSec: end }, ...subs];
      writeActiveConfig({ ...cfg, subtitleLayers: next });
      selectedSubId = id;
      updateSubEditor();
      renderAll();
    });

    btnSubRemove?.addEventListener("click", () => {
      const cfg = readActiveConfig();
      const subs = Array.isArray(cfg?.subtitleLayers) ? cfg.subtitleLayers : [];
      const next = subs.filter((s) => String(s?.id || "") !== String(selectedSubId || ""));
      selectedSubId = "";
      writeActiveConfig({ ...cfg, subtitleLayers: next });
      updateSubEditor();
      renderAll();
    });

    btnLayerRemove?.addEventListener("click", () => {
      if (!selectedLayerId) return;
      if (!window.confirm("确定删除当前选中的素材吗？")) return;
      removeLayerById(selectedLayerId);
    });

    [layerScale, layerEnable, layerX, layerY, layerKey, layerCategory].forEach((el) => {
      el?.addEventListener?.("input", applyLayerEdits);
      el?.addEventListener?.("change", applyLayerEdits);
    });
    layerCategoryFilter?.addEventListener("change", () => {
      selectedLayerCategoryFilter = String(layerCategoryFilter.value || "");
      renderLayers();
    });

    [subEnable, subText, subSize, fontSelect, subX, subY].forEach((el) => {
      el?.addEventListener?.("input", applySubEdits);
      el?.addEventListener?.("change", applySubEdits);
    });

    musicEnable?.addEventListener("change", () => {
      const cfg = readActiveConfig();
      writeActiveConfig({ ...cfg, music: { ...cfg.music, enable: musicEnable.checked === true } });
      renderAll();
    });
    musicSelect?.addEventListener("change", () => {
      const cfg = readActiveConfig();
      writeActiveConfig({ ...cfg, music: { ...cfg.music, filePath: String(musicSelect.value || "") } });
      renderAll();
    });
    musicVolume?.addEventListener("input", () => {
      const cleaned = String(musicVolume.value || "").replace(/[^\d.]/g, "");
      musicVolume.value = cleaned;
      const n = Number(cleaned);
      const cfg = readActiveConfig();
      writeActiveConfig({ ...cfg, music: { ...cfg.music, volume: Number.isFinite(n) ? n : cfg.music.volume } });
      renderAll();
    });

    const enableStageDrop = () => {
      if (!vtStage) return;
      vtStage.addEventListener("dragover", (e) => {
        e.preventDefault();
        vtStage.classList.add("is-dragover");
      });
      vtStage.addEventListener("dragleave", () => {
        vtStage.classList.remove("is-dragover");
      });
      vtStage.addEventListener("drop", (e) => {
        e.preventDefault();
        vtStage.classList.remove("is-dragover");
        const files = Array.from(e.dataTransfer?.files || []);
        const filePaths = files
          .slice(0, 20)
          .map((f) => String(f?.path || "").trim())
          .filter(Boolean);
        if (!filePaths.length) return;
        importAssetFiles(filePaths);
      });
    };
    enableStageDrop();

    const enableOverlayDrag = () => {
      if (!vtOverlay || !vtStage) return;

      const clampCenter = (xPct, yPct, halfW, halfH) => {
        const xMin = Math.max(0, Math.min(1, halfW));
        const xMax = Math.max(0, Math.min(1, 1 - halfW));
        const yMin = Math.max(0, Math.min(1, halfH));
        const yMax = Math.max(0, Math.min(1, 1 - halfH));
        const x = Math.max(xMin, Math.min(xMax, xPct));
        const y = Math.max(yMin, Math.min(yMax, yPct));
        return { x, y };
      };

      let mode = "";
      let targetId = "";
      let handle = "";
      let startClientX = 0;
      let startClientY = 0;
      let startScale = 0.35;
      let startXPct = 0.5;
      let startYPct = 0.5;
      let overlayRect = null;
      let startElemW = 0;
      let startElemH = 0;
      let liveXPct = 0.5;
      let liveYPct = 0.5;
      let liveScale = 0.35;

      const getOverlayRect = () => (vtCanvas ? vtCanvas.getBoundingClientRect() : vtStage.getBoundingClientRect());

      const setOvStyle = (id, { xPct, yPct, scale }) => {
        const el = vtOverlay.querySelector(`[data-ov-id="${CSS.escape(String(id))}"]`);
        if (!el) return;
        if (typeof xPct === "number") {
          el.style.left = `${xPct * 100}%`;
          el.style.top = `${yPct * 100}%`;
        }
        if (typeof scale === "number") el.style.width = `${Math.round(scale * 100)}%`;
      };

      const setSubStyle = (id, { xPct, yPct }) => {
        const el = vtSub?.querySelector?.(`[data-sub-ov-id="${CSS.escape(String(id))}"]`);
        if (!el) return;
        if (typeof xPct === "number") {
          el.style.left = `${xPct * 100}%`;
          el.style.top = `${yPct * 100}%`;
        }
      };

      let rafMove = 0;
      let lastPt = null;
      const applyMove = (pt) => {
        if (!mode || !targetId) return;
        if (!overlayRect) overlayRect = getOverlayRect();
        const dx = pt.x - startClientX;
        const dy = pt.y - startClientY;
        const relX = (pt.x - overlayRect.left) / overlayRect.width;
        const relY = (pt.y - overlayRect.top) / overlayRect.height;

        if (mode === "pip-move") {
          const halfW = (startElemW / overlayRect.width) / 2;
          const halfH = (startElemH / overlayRect.height) / 2;
          const c = clampCenter(relX, relY, halfW, halfH);
          liveXPct = c.x;
          liveYPct = c.y;
          setOvStyle(targetId, { xPct: liveXPct, yPct: liveYPct });
          if (layerX) layerX.value = String(Math.round(liveXPct * 1000) / 1000);
          if (layerY) layerY.value = String(Math.round(liveYPct * 1000) / 1000);
          return;
        }

        if (mode === "pip-resize") {
          const dirX = handle.includes("l") ? -1 : 1;
          const dirY = handle.includes("t") ? -1 : 1;
          const delta = Math.max(dirX * dx / overlayRect.width, dirY * dy / overlayRect.width);
          liveScale = Math.max(0.05, Math.min(1.0, startScale + delta));
          setOvStyle(targetId, { scale: liveScale });
          const el = vtOverlay.querySelector(`[data-ov-id="${CSS.escape(String(targetId))}"]`);
          const r = el ? el.getBoundingClientRect() : null;
          const w = r ? r.width : startElemW;
          const h = r ? r.height : startElemH;
          const halfW = (w / overlayRect.width) / 2;
          const halfH = (h / overlayRect.height) / 2;
          const c = clampCenter(liveXPct, liveYPct, halfW, halfH);
          liveXPct = c.x;
          liveYPct = c.y;
          setOvStyle(targetId, { xPct: liveXPct, yPct: liveYPct });
          if (layerScale) layerScale.value = String(Math.round(liveScale * 1000) / 1000);
          if (layerX) layerX.value = String(Math.round(liveXPct * 1000) / 1000);
          if (layerY) layerY.value = String(Math.round(liveYPct * 1000) / 1000);
          return;
        }

        if (mode === "sub-move") {
          const el = vtSub?.querySelector?.(`[data-sub-ov-id="${CSS.escape(String(targetId))}"]`);
          const r = el ? el.getBoundingClientRect() : null;
          const w = r ? r.width : 0;
          const h = r ? r.height : 0;
          const halfW = w ? (w / overlayRect.width) / 2 : 0;
          const halfH = h ? (h / overlayRect.height) / 2 : 0;
          const c = clampCenter(relX, relY, halfW, halfH);
          liveXPct = c.x;
          liveYPct = c.y;
          setSubStyle(targetId, { xPct: liveXPct, yPct: liveYPct });
          if (subX) subX.value = String(Math.round(liveXPct * 1000) / 1000);
          if (subY) subY.value = String(Math.round(liveYPct * 1000) / 1000);
        }
      };

      const onMove = (e) => {
        lastPt = { x: e.clientX, y: e.clientY };
        if (rafMove) return;
        rafMove = requestAnimationFrame(() => {
          rafMove = 0;
          if (!lastPt) return;
          applyMove(lastPt);
        });
      };

      const stop = () => {
        if (!mode || !targetId) return;
        const cfg = readActiveConfig();
        if (mode.startsWith("pip")) {
          const layers = Array.isArray(cfg?.pipLayers) ? cfg.pipLayers : [];
          const idx = layers.findIndex((l) => String(l?.id || "") === String(targetId));
          if (idx >= 0) {
            const next = layers.slice();
            const cur = { ...next[idx] };
            cur.xPct = liveXPct;
            cur.yPct = liveYPct;
            if (mode === "pip-resize") cur.scale = liveScale;
            next[idx] = cur;
            writeActiveConfig({ ...cfg, pipLayers: next });
          }
          updateLayerEditor();
        } else if (mode === "sub-move") {
          const subs = Array.isArray(cfg?.subtitleLayers) ? cfg.subtitleLayers : [];
          const idx = subs.findIndex((s) => String(s?.id || "") === String(targetId));
          if (idx >= 0) {
            const next = subs.slice();
            next[idx] = { ...next[idx], xPct: liveXPct, yPct: liveYPct };
            writeActiveConfig({ ...cfg, subtitleLayers: next });
          }
          updateSubEditor();
        }

        mode = "";
        targetId = "";
        handle = "";
        overlayRect = null;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", stop);
        renderAll();
      };

      vtOverlay.addEventListener("mousedown", (e) => {
        const ov = e.target.closest("[data-ov-id]");
        if (!ov) return;
        const id = String(ov.getAttribute("data-ov-id") || "").trim();
        if (!id) return;
        const h = e.target.closest("[data-handle]")?.getAttribute?.("data-handle") || "";
        selectLayer(id);
        mode = h ? "pip-resize" : "pip-move";
        targetId = id;
        handle = String(h || "");
        startClientX = e.clientX;
        startClientY = e.clientY;
        overlayRect = getOverlayRect();
        const cfg = readActiveConfig();
        const layers = Array.isArray(cfg?.pipLayers) ? cfg.pipLayers : [];
        const cur = layers.find((l) => String(l?.id || "") === id) || {};
        startScale = Math.max(0.05, Math.min(1.0, Number(cur?.scale ?? 0.35) || 0.35));
        startXPct = Math.max(0, Math.min(1.0, Number(cur?.xPct ?? 0.5) || 0.5));
        startYPct = Math.max(0, Math.min(1.0, Number(cur?.yPct ?? 0.5) || 0.5));
        liveXPct = startXPct;
        liveYPct = startYPct;
        liveScale = startScale;
        const r = ov.getBoundingClientRect();
        startElemW = r.width;
        startElemH = r.height;
        e.preventDefault();
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", stop);
      });

      vtSub?.addEventListener?.("mousedown", (e) => {
        const el = e.target.closest("[data-sub-ov-id]");
        if (!el) return;
        const id = String(el.getAttribute("data-sub-ov-id") || "").trim();
        if (!id) return;
        selectSub(id);
        mode = "sub-move";
        targetId = id;
        startClientX = e.clientX;
        startClientY = e.clientY;
        overlayRect = getOverlayRect();
        const cfg = readActiveConfig();
        const subs = Array.isArray(cfg?.subtitleLayers) ? cfg.subtitleLayers : [];
        const cur = subs.find((s) => String(s?.id || "") === id) || {};
        startXPct = Math.max(0, Math.min(1.0, Number(cur?.xPct ?? 0.5) || 0.5));
        startYPct = Math.max(0, Math.min(1.0, Number(cur?.yPct ?? 0.9) || 0.9));
        liveXPct = startXPct;
        liveYPct = startYPct;
        e.preventDefault();
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", stop);
      });
    };
    enableOverlayDrag();

    const normNum = (v, def) => {
      const n = Number(String(v ?? "").trim());
      return Number.isFinite(n) ? n : def;
    };

    btnRender?.addEventListener("click", async () => {
      if (!activeId) return;
      if (rendering) return;
      clearLog();
      const item = (Array.isArray(templates) ? templates : []).find((x) => String(x?.id || "") === activeId) || null;
      if (!item?.videoPath) return;

      renderTaskId = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
      setRenderingUI(true, "渲染中...");
      appendLog(`开始渲染任务：${renderTaskId}`);

      const cfg = readActiveConfig();
      const payload = { taskId: renderTaskId, id: activeId, baseVideoPath: String(item.videoPath || ""), config: cfg };

      try {
        const res = await window.api?.videoTemplate?.render?.(payload);
        if (!res?.ok) {
          toast("渲染失败，请查看日志。");
          appendLog(String(res?.message || "渲染失败"));
          setRenderingUI(false, "失败");
          return;
        }
        toast("渲染完成。");
        appendLog(`输出：${String(res?.outPath || "")}`);
        setRenderingUI(false, "完成");
        await refresh({ keepActive: true });
        if (res?.outPath) setVideoSrc(res.outPath);
      } catch (e) {
        toast("渲染失败，请查看日志。");
        appendLog(String(e?.message || e));
        setRenderingUI(false, "失败");
      }
    });

    btnCancel?.addEventListener("click", async () => {
      const tid = String(renderTaskId || "").trim();
      if (!tid) return;
      try {
        await window.api?.video?.cancel?.(tid);
      } catch {}
      appendLog("已请求停止。");
      setRenderingUI(false, "已停止");
    });

    if (window.__ipfactoryVideoTemplateLogUnsub) {
      try {
        window.__ipfactoryVideoTemplateLogUnsub();
      } catch {}
      window.__ipfactoryVideoTemplateLogUnsub = null;
    }
    window.__ipfactoryVideoTemplateLogUnsub = window.api?.video?.onLog?.((data) => {
      const tid = String(data?.taskId || "");
      if (!tid || tid !== String(renderTaskId || "")) return;
      const lvl = String(data?.level || "info").toLowerCase();
      const msg = String(data?.message || "");
      appendLog(`[${lvl}] ${msg}`);
    });

    btnRefresh?.addEventListener("click", () => refresh({ keepActive: true }));
    setRenderingUI(false, "待命");
    const fontRes = await window.api?.media?.listFonts?.();
    fonts = fontRes?.ok && Array.isArray(fontRes.items) ? fontRes.items : [];
    const bgmRes = await window.api?.media?.listBgms?.();
    bgms = bgmRes?.ok && Array.isArray(bgmRes.items) ? bgmRes.items : [];
    renderFontOptions();
    renderMusicOptions();
    setPropsTab("pip");
    await refresh({ keepActive: false });

    return root;
  }
};
