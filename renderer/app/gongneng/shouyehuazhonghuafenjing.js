import { elFromHTML } from "../ui.js";

const MAX_STORYBOARD_SCALE = 2.2;
const DEFAULT_STAGE_RATIO = 9 / 16;
const DEFAULT_ASSET_RATIO = 3 / 4;

function safeJsonClone(v, fallback) {
  try {
    return JSON.parse(JSON.stringify(v));
  } catch {
    return fallback;
  }
}

function pickExtLower(p) {
  const s = String(p || "").trim();
  const i = s.lastIndexOf(".");
  return i >= 0 ? s.slice(i).toLowerCase() : "";
}

function defaultToast(toast, message) {
  if (typeof toast === "function") toast(String(message || "").trim() || "操作完成。");
}

function toFileUrl(p) {
  const raw = String(p || "").trim();
  if (!raw) return "";
  return `file://${raw.replace(/\\/g, "/")}`;
}

function bindingAssetId(value) {
  if (value && typeof value === "object") return String(value.assetId || "").trim();
  return String(value || "").trim();
}

function normalizeBindingMap(src) {
  const data = src && typeof src === "object" ? src : {};
  const out = {};
  Object.keys(data).forEach((k) => {
    const assetId = bindingAssetId(data[k]);
    if (!assetId) return;
    out[String(k)] = { assetId };
  });
  return out;
}

function resolvePlacementFromPipConfig(pipConfig) {
  const pos = String(pipConfig?.pos || "tr").trim() || "tr";
  const scale = Math.max(0.1, Math.min(MAX_STORYBOARD_SCALE, Number(pipConfig?.scale ?? 0.35) || 0.35));
  const xPct = pos.includes("r") ? 1 : 0;
  const yPct = pos.includes("b") ? 1 : 0;
  return { scale, xPct, yPct };
}

function normalizeAssetItem(item, fallbackPlacement) {
  const base = fallbackPlacement && typeof fallbackPlacement === "object" ? fallbackPlacement : { scale: 0.35, xPct: 1, yPct: 0 };
  const ext = pickExtLower(item?.path || "");
  const typeByExt = [".mp4", ".mov", ".webm", ".mkv"].includes(ext) ? "video" : ext === ".gif" ? "gif" : "image";
  return {
    id: String(item?.id || item?.path || ""),
    path: String(item?.path || ""),
    name: String(item?.name || ""),
    type: String(item?.type || typeByExt || "image"),
    category: String(item?.category || ""),
    scale: Math.max(0.1, Math.min(MAX_STORYBOARD_SCALE, Number(item?.scale ?? base.scale) || base.scale)),
    xPct: Math.max(0, Math.min(1, Number(item?.xPct ?? base.xPct) || base.xPct)),
    yPct: Math.max(0, Math.min(1, Number(item?.yPct ?? base.yPct) || base.yPct))
  };
}

export async function openShouyeHuazhonghuaFenjingModal({
  toast,
  videoPath,
  preferredSubtitleText,
  subtitleTemplate,
  asrModelChoice,
  pipConfig,
  initialAssets,
  initialBindings,
  initialSegments,
  initialSegmentsVideoPath
} = {}) {
  const showToast = (message) => defaultToast(toast, message);
  const vPath = String(videoPath || "").trim();
  const fallbackPlacement = resolvePlacementFromPipConfig(pipConfig);
  const ratioCache = new Map();
  const ratioPending = new Map();
  const state = {
    assets: Array.isArray(initialAssets)
      ? safeJsonClone(initialAssets, [])
          .filter((x) => x && typeof x === "object")
          .map((x) => normalizeAssetItem(x, fallbackPlacement))
      : [],
    bindings: normalizeBindingMap(safeJsonClone(initialBindings, {})),
    segments: Array.isArray(initialSegments) ? safeJsonClone(initialSegments, []).filter((x) => x && typeof x === "object") : [],
    segmentsVideoPath: String(initialSegmentsVideoPath || ""),
    activeAssetId: "",
    loadingSegments: false,
    importing: false
  };
  if (state.assets.length) state.activeAssetId = String(state.assets[0]?.id || state.assets[0]?.path || "");

  const overlay = elFromHTML(`<div class="modal-overlay stbd-overlay"></div>`);
  const modal = elFromHTML(`
    <div class="modal stbd-modal">
      <div class="modal-head">
        <div>
          <div class="modal-title">分镜配置</div>
          <div class="modal-subtitle">BINDING SEGMENTS TO STORYBOARD</div>
        </div>
        <button class="modal-close stbd-close" title="关闭">×</button>
      </div>
      <div class="modal-body stbd-body">
        <div class="stbd-top">
          <div class="stbd-section">
            <div class="stbd-section-head">
              <div class="label" style="margin:0">选择分镜素材</div>
              <div class="stbd-actions">
                <button class="btn" id="stbd-upload" type="button">上传素材</button>
                <button class="btn btn-danger" id="stbd-clear" type="button">清空绑定</button>
              </div>
            </div>
            <div class="stbd-grid" id="stbd-grid"></div>
            <div class="hint" id="stbd-grid-tip" style="margin-top: 8px">先选中素材，再在下方分段字幕里选择要显示该素材的片段。支持图片、视频、动图。</div>
          </div>
          <div class="stbd-section stbd-inspector">
            <div class="stbd-section-head">
              <div class="label" style="margin:0">显示设置</div>
              <div class="stbd-pill" id="stbd-asset-pill">未选择素材</div>
            </div>
            <div class="stbd-inspector-body">
              <div class="stbd-mini-stage" id="stbd-mini-stage"></div>
              <div class="stbd-stage-tip">拖拽右侧素材即可直接定位，下面的数值用于精细微调。</div>
              <div class="grid cols-2 stbd-controls">
                <div class="field">
                  <div class="label">缩放比例</div>
                  <input id="stbd-scale" type="range" min="0.10" max="2.20" step="0.01" value="0.35" />
                  <input id="stbd-scale-text" type="text" value="0.35" />
                </div>
                <div class="field">
                  <div class="label">横向位置 X</div>
                  <input id="stbd-x" type="range" min="0" max="1" step="0.01" value="1" />
                  <input id="stbd-x-text" type="text" value="1" />
                </div>
                <div class="field">
                  <div class="label">纵向位置 Y</div>
                  <input id="stbd-y" type="range" min="0" max="1" step="0.01" value="0" />
                  <input id="stbd-y-text" type="text" value="0" />
                </div>
                <div class="field">
                  <div class="label">素材分类</div>
                  <input id="stbd-category" type="text" placeholder="例如：人物特写 / 办公室 / 产品特写" />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="stbd-section" style="margin-top: 14px">
          <div class="stbd-section-head">
            <div class="label" style="margin:0">脚本分段</div>
            <div class="stbd-pill" id="stbd-seg-pill">准备中...</div>
          </div>
          <div class="stbd-seglist" id="stbd-seglist"></div>
        </div>
      </div>
      <div class="modal-foot stbd-foot">
        <button class="btn" id="stbd-cancel" type="button">取消</button>
        <button class="btn btn-primary" id="stbd-save" type="button">完成</button>
      </div>
    </div>
  `);

  const btnClose = modal.querySelector(".stbd-close");
  const btnUpload = modal.querySelector("#stbd-upload");
  const btnClear = modal.querySelector("#stbd-clear");
  const grid = modal.querySelector("#stbd-grid");
  const gridTip = modal.querySelector("#stbd-grid-tip");
  const segPill = modal.querySelector("#stbd-seg-pill");
  const segList = modal.querySelector("#stbd-seglist");
  const assetPill = modal.querySelector("#stbd-asset-pill");
  const miniStage = modal.querySelector("#stbd-mini-stage");
  const scaleInput = modal.querySelector("#stbd-scale");
  const scaleText = modal.querySelector("#stbd-scale-text");
  const xInput = modal.querySelector("#stbd-x");
  const xText = modal.querySelector("#stbd-x-text");
  const yInput = modal.querySelector("#stbd-y");
  const yText = modal.querySelector("#stbd-y-text");
  const categoryInput = modal.querySelector("#stbd-category");
  const btnCancel = modal.querySelector("#stbd-cancel");
  const btnSave = modal.querySelector("#stbd-save");

  const dispose = () => {
    try {
      overlay.remove();
    } catch {}
    try {
      modal.remove();
    } catch {}
  };

  const renderGrid = () => {
    if (!grid) return;
    grid.innerHTML = "";
    const list = Array.isArray(state.assets) ? state.assets : [];
    if (!list.length) {
      const empty = elFromHTML(`<div class="stbd-empty">未上传素材</div>`);
      grid.appendChild(empty);
      if (gridTip) gridTip.textContent = "先上传图片素材，然后再绑定到下方分段字幕。";
      return;
    }
    if (gridTip) gridTip.textContent = "先选中素材，再在下方分段字幕里选择要显示该素材的片段。";

    list.forEach((it) => {
      const id = String(it?.id || it?.path || "");
      const p = String(it?.path || "");
      const extType = [".mp4", ".mov", ".webm", ".mkv"].includes(pickExtLower(p))
        ? "video"
        : pickExtLower(p) === ".gif"
          ? "gif"
          : "image";
      const type = String(it?.type || extType);
      const category = String(it?.category || "").trim();
      const active = id && id === state.activeAssetId;
      const card = elFromHTML(`
        <button class="stbd-card ${active ? "is-active" : ""}" type="button" data-id="${encodeURIComponent(id)}">
          <div class="stbd-thumb">
            <div class="stbd-thumb-inner"></div>
          </div>
          <div class="stbd-card-foot">
            <div class="stbd-card-meta">
              <div class="stbd-card-name"></div>
              <div class="stbd-card-sub"></div>
            </div>
            <button class="stbd-del" type="button" title="移除">×</button>
          </div>
        </button>
      `);
      const thumbInner = card.querySelector(".stbd-thumb-inner");
      const url = p ? `file://${p.replace(/\\/g, "/")}` : "";
      if (thumbInner) {
        if (type === "video") {
          const video = document.createElement("video");
          video.muted = true;
          video.playsInline = true;
          video.loop = true;
          video.autoplay = true;
          video.src = url;
          thumbInner.appendChild(video);
        } else {
          const img = document.createElement("img");
          img.draggable = false;
          img.src = url;
          thumbInner.appendChild(img);
        }
      }
      const nameEl = card.querySelector(".stbd-card-name");
      const subEl = card.querySelector(".stbd-card-sub");
      if (nameEl) {
        const prefix = type === "video" ? "视频" : type === "gif" ? "动图" : "图片";
        nameEl.textContent = `${prefix}｜${String(it?.name || "").trim() || (p.split(/[\\/]/).pop() || "素材")}`;
      }
      if (subEl) subEl.textContent = category || "未分类";
      card.addEventListener("click", () => {
        state.activeAssetId = id;
        renderGrid();
        renderAssetInspector();
        renderSegList();
      });
      const del = card.querySelector(".stbd-del");
      del?.addEventListener("click", (e) => {
        e.stopPropagation();
        const next = (Array.isArray(state.assets) ? state.assets : []).filter((x) => String(x?.id || x?.path || "") !== id);
        state.assets = next;
        const nextBindings = {};
        const cur = state.bindings && typeof state.bindings === "object" ? state.bindings : {};
        Object.keys(cur).forEach((k) => {
          if (bindingAssetId(cur[k]) !== id) nextBindings[k] = cur[k];
        });
        state.bindings = nextBindings;
        if (state.activeAssetId === id) state.activeAssetId = String(next?.[0]?.id || next?.[0]?.path || "");
        renderGrid();
        renderAssetInspector();
        renderSegList();
      });
      grid.appendChild(card);
    });
  };

  const getActiveAsset = () =>
    (Array.isArray(state.assets) ? state.assets : []).find((x) => String(x?.id || x?.path || "") === String(state.activeAssetId || "")) || null;

  const ensureMediaRatio = (mediaPath, mediaType, onReady) => {
    const p = String(mediaPath || "").trim();
    if (!p) return null;
    const type = String(mediaType || "").trim() || "image";
    const key = `${type}::${p}`;
    if (ratioCache.has(key)) {
      return ratioCache.get(key);
    }
    if (ratioPending.has(key)) {
      const pending = ratioPending.get(key);
      if (typeof onReady === "function") pending.then((ratio) => onReady(ratio)).catch(() => {});
      return null;
    }
    const url = toFileUrl(p);
    const loader = new Promise((resolve) => {
      const finish = (ratio) => {
        const finalRatio = Number.isFinite(ratio) && ratio > 0 ? ratio : type === "video" ? 16 / 9 : DEFAULT_ASSET_RATIO;
        ratioCache.set(key, finalRatio);
        ratioPending.delete(key);
        resolve(finalRatio);
      };
      if (type === "video") {
        const video = document.createElement("video");
        video.preload = "metadata";
        video.playsInline = true;
        video.muted = true;
        video.src = url;
        video.addEventListener("loadedmetadata", () => finish((Number(video.videoWidth || 0) || 0) / (Number(video.videoHeight || 0) || 1)), { once: true });
        video.addEventListener("error", () => finish(16 / 9), { once: true });
        return;
      }
      const img = new Image();
      img.onload = () => finish((Number(img.naturalWidth || 0) || 0) / (Number(img.naturalHeight || 0) || 1));
      img.onerror = () => finish(DEFAULT_ASSET_RATIO);
      img.src = url;
    });
    ratioPending.set(key, loader);
    if (typeof onReady === "function") loader.then((ratio) => onReady(ratio)).catch(() => {});
    return null;
  };

  const syncInspectorInputs = (asset) => {
    if (scaleInput) scaleInput.value = asset ? String(asset.scale ?? fallbackPlacement.scale) : String(fallbackPlacement.scale);
    if (scaleText) scaleText.value = asset ? String(asset.scale ?? fallbackPlacement.scale) : String(fallbackPlacement.scale);
    if (xInput) xInput.value = asset ? String(asset.xPct ?? fallbackPlacement.xPct) : String(fallbackPlacement.xPct);
    if (xText) xText.value = asset ? String(asset.xPct ?? fallbackPlacement.xPct) : String(fallbackPlacement.xPct);
    if (yInput) yInput.value = asset ? String(asset.yPct ?? fallbackPlacement.yPct) : String(fallbackPlacement.yPct);
    if (yText) yText.value = asset ? String(asset.yPct ?? fallbackPlacement.yPct) : String(fallbackPlacement.yPct);
    if (categoryInput) categoryInput.value = asset ? String(asset.category || "") : "";
  };

  const updateActiveAssetPatch = (patch = {}, { renderGrid: shouldRenderGrid = false, renderInspector: shouldRenderInspector = false, renderSegList: shouldRenderSegList = false } = {}) => {
    const activeId = String(state.activeAssetId || "");
    if (!activeId) return null;
    let nextAsset = null;
    state.assets = (Array.isArray(state.assets) ? state.assets : []).map((it) => {
      const id = String(it?.id || it?.path || "");
      if (id !== activeId) return it;
      nextAsset = normalizeAssetItem({ ...it, ...patch }, fallbackPlacement);
      return nextAsset;
    });
    if (shouldRenderGrid) renderGrid();
    if (shouldRenderInspector) renderAssetInspector();
    if (shouldRenderSegList) renderSegList();
    return nextAsset;
  };

  const applyAssetEdits = () => {
    const asset = getActiveAsset();
    if (!asset) return;
    updateActiveAssetPatch(
      {
        scale: Math.max(0.1, Math.min(MAX_STORYBOARD_SCALE, Number(scaleText?.value || scaleInput?.value || asset.scale) || asset.scale)),
        xPct: Math.max(0, Math.min(1, Number(xText?.value || xInput?.value || asset.xPct) || asset.xPct)),
        yPct: Math.max(0, Math.min(1, Number(yText?.value || yInput?.value || asset.yPct) || asset.yPct)),
        category: String(categoryInput?.value || asset.category || "").trim()
      },
      { renderGrid: true, renderInspector: true, renderSegList: true }
    );
  };

  const renderAssetInspector = () => {
    const asset = getActiveAsset();
    const activeAssetId = String(asset?.id || asset?.path || "");
    if (assetPill) assetPill.textContent = asset ? `${asset.type === "video" ? "视频" : asset.type === "gif" ? "动图" : "图片"}｜${asset.name || "素材"}` : "未选择素材";
    if (scaleInput) scaleInput.disabled = !asset;
    if (scaleText) scaleText.disabled = !asset;
    if (xInput) xInput.disabled = !asset;
    if (xText) xText.disabled = !asset;
    if (yInput) yInput.disabled = !asset;
    if (yText) yText.disabled = !asset;
    if (categoryInput) categoryInput.disabled = !asset;
    syncInspectorInputs(asset);
    if (!miniStage) return;
    miniStage.innerHTML = "";
    if (!asset?.path) {
      miniStage.appendChild(elFromHTML(`<div class="stbd-mini-empty">选中素材后，在这里调整位置和比例</div>`));
      return;
    }
    const stage = document.createElement("div");
    stage.className = "stbd-mini-stage-inner";
    const stageReference = document.createElement("div");
    stageReference.className = "stbd-mini-reference";
    stageReference.textContent = vPath ? "成片画面参考" : "成片画面参考（未取到源视频）";
    const box = document.createElement("div");
    box.className = "stbd-mini-asset";
    const xPct = Math.max(0, Math.min(1, Number(asset.xPct || 0) || 0));
    const yPct = Math.max(0, Math.min(1, Number(asset.yPct || 0) || 0));
    box.title = "按住拖拽调整位置";
    let stageRatio = ensureMediaRatio(vPath, "video", () => {
      if (!modal.isConnected) return;
      if (String(getActiveAsset()?.id || getActiveAsset()?.path || "") !== activeAssetId) return;
      renderAssetInspector();
    }) || DEFAULT_STAGE_RATIO;
    let assetRatio = ensureMediaRatio(asset.path, asset.type === "video" ? "video" : "image", () => {
      if (!modal.isConnected) return;
      if (String(getActiveAsset()?.id || getActiveAsset()?.path || "") !== activeAssetId) return;
      renderAssetInspector();
    }) || DEFAULT_ASSET_RATIO;
    const applyPreviewGeometry = () => {
      const scale = Math.max(0.1, Math.min(MAX_STORYBOARD_SCALE, Number(asset.scale || 0.35) || 0.35));
      const widthPct = Math.max(10, scale * 100);
      const heightPct = Math.max(10, widthPct * (stageRatio / assetRatio));
      box.style.width = `${widthPct}%`;
      box.style.height = `${heightPct}%`;
      box.style.left = `${(100 - widthPct) * xPct}%`;
      box.style.top = `${(100 - heightPct) * yPct}%`;
      stage.style.aspectRatio = String(stageRatio);
    };
    applyPreviewGeometry();
    const videoUrl = toFileUrl(vPath);
    if (videoUrl) {
      const bgVideo = document.createElement("video");
      bgVideo.className = "stbd-mini-bg";
      bgVideo.muted = true;
      bgVideo.playsInline = true;
      bgVideo.loop = true;
      bgVideo.autoplay = true;
      bgVideo.preload = "metadata";
      bgVideo.src = videoUrl;
      stage.appendChild(bgVideo);
    }
    stage.appendChild(stageReference);
    const url = toFileUrl(asset.path);
    if (asset.type === "video") {
      const video = document.createElement("video");
      video.muted = true;
      video.playsInline = true;
      video.loop = true;
      video.autoplay = true;
      video.src = url;
      box.appendChild(video);
    } else {
      const img = document.createElement("img");
      img.draggable = false;
      img.src = url;
      box.appendChild(img);
    }
    stage.appendChild(box);
    miniStage.appendChild(stage);

    const updateDraggedPlacement = (nextXPct, nextYPct) => {
      const xVal = Math.max(0, Math.min(1, Number(nextXPct) || 0));
      const yVal = Math.max(0, Math.min(1, Number(nextYPct) || 0));
      updateActiveAssetPatch({ xPct: xVal, yPct: yVal }, { renderGrid: false, renderInspector: false, renderSegList: false });
      if (xInput) xInput.value = String(xVal.toFixed(3));
      if (xText) xText.value = String(xVal.toFixed(3));
      if (yInput) yInput.value = String(yVal.toFixed(3));
      if (yText) yText.value = String(yVal.toFixed(3));
    };

    box.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      const pointerId = event.pointerId;
      const stageRect = stage.getBoundingClientRect();
      const boxRect = box.getBoundingClientRect();
      const anchorX = event.clientX - boxRect.left;
      const anchorY = event.clientY - boxRect.top;
      box.classList.add("is-dragging");
      try {
        box.setPointerCapture(pointerId);
      } catch {}

      const moveToPointer = (clientX, clientY) => {
        const freeLeft = stageRect.width - box.offsetWidth;
        const freeTop = stageRect.height - box.offsetHeight;
        const minLeft = Math.min(0, freeLeft);
        const maxLeft = Math.max(0, freeLeft);
        const minTop = Math.min(0, freeTop);
        const maxTop = Math.max(0, freeTop);
        const left = Math.max(minLeft, Math.min(maxLeft, clientX - stageRect.left - anchorX));
        const top = Math.max(minTop, Math.min(maxTop, clientY - stageRect.top - anchorY));
        box.style.left = `${left}px`;
        box.style.top = `${top}px`;
        updateDraggedPlacement(freeLeft !== 0 ? left / freeLeft : 0, freeTop !== 0 ? top / freeTop : 0);
      };

      const finishDrag = () => {
        box.classList.remove("is-dragging");
        box.removeEventListener("pointermove", handleMove);
        box.removeEventListener("pointerup", handleUp);
        box.removeEventListener("pointercancel", handleUp);
        renderSegList();
      };

      const handleMove = (ev) => {
        if (ev.pointerId !== pointerId) return;
        ev.preventDefault();
        moveToPointer(ev.clientX, ev.clientY);
      };
      const handleUp = (ev) => {
        if (ev.pointerId !== pointerId) return;
        finishDrag();
      };

      box.addEventListener("pointermove", handleMove);
      box.addEventListener("pointerup", handleUp);
      box.addEventListener("pointercancel", handleUp);
      moveToPointer(event.clientX, event.clientY);
    });
  };

  const renderSegList = () => {
    if (!segList) return;
    segList.innerHTML = "";
    const segs = Array.isArray(state.segments) ? state.segments : [];
    if (!segs.length) {
      segList.appendChild(elFromHTML(`<div class="stbd-empty">暂无分段字幕</div>`));
      return;
    }
    const bindings = state.bindings && typeof state.bindings === "object" ? state.bindings : {};
    segs.forEach((seg, idx) => {
      const text = String(seg?.text || "").trim();
      const startSec = Number(seg?.startSec || 0) || 0;
      const endSec = Number(seg?.endSec || 0) || 0;
      const boundId = bindingAssetId(bindings[String(idx)]);
      const boundAsset = (Array.isArray(state.assets) ? state.assets : []).find((x) => String(x?.id || x?.path || "") === boundId) || null;
      const isBound = !!boundId;
      const isActiveBound = isBound && boundId === state.activeAssetId && !!state.activeAssetId;
      const row = elFromHTML(`
        <button class="stbd-seg ${isBound ? "is-bound" : ""} ${isActiveBound ? "is-active" : ""}" type="button">
          <div class="stbd-seg-left">
            <div class="stbd-seg-idx">${String(idx + 1).padStart(2, "0")}</div>
          </div>
          <div class="stbd-seg-main">
            <div class="stbd-seg-text"></div>
            <div class="stbd-seg-meta">${startSec.toFixed(2)}s - ${endSec.toFixed(2)}s</div>
          </div>
          <div class="stbd-seg-right">
            <div class="stbd-bound"></div>
          </div>
        </button>
      `);
      const txtEl = row.querySelector(".stbd-seg-text");
      const boundEl = row.querySelector(".stbd-bound");
      if (txtEl) txtEl.textContent = text || "（空字幕）";
      if (boundEl) {
        if (boundAsset?.path) {
          const card = elFromHTML(`
            <div class="stbd-bound-card">
              <div class="stbd-bound-thumb"></div>
              <div class="stbd-bound-meta">
                <div class="stbd-bound-name"></div>
                <div class="stbd-bound-tag">已绑定素材</div>
              </div>
            </div>
          `);
          const thumb = card.querySelector(".stbd-bound-thumb");
          const name = card.querySelector(".stbd-bound-name");
          if (name) name.textContent = String(boundAsset.name || boundAsset.path.split(/[\\/]/).pop() || "素材");
          if (thumb) {
            const url = `file://${String(boundAsset.path || "").replace(/\\/g, "/")}`;
            if (String(boundAsset.type || "") === "video") {
              const video = document.createElement("video");
              video.muted = true;
              video.playsInline = true;
              video.loop = true;
              video.autoplay = true;
              video.src = url;
              thumb.appendChild(video);
            } else {
              const img = document.createElement("img");
              img.draggable = false;
              img.src = url;
              thumb.appendChild(img);
            }
          }
          boundEl.appendChild(card);
        } else {
          boundEl.appendChild(elFromHTML(`<span class="stbd-tag">未绑定</span>`));
        }
      }
      row.addEventListener("click", () => {
        if (!state.activeAssetId && boundId) {
          state.activeAssetId = boundId;
          renderGrid();
          renderAssetInspector();
          renderSegList();
          return;
        }
        if (!state.activeAssetId) {
          showToast("请先在上方选择一个素材。");
          return;
        }
        const key = String(idx);
        const cur = state.bindings && typeof state.bindings === "object" ? state.bindings : {};
        const currentBound = bindingAssetId(cur[key]);
        if (currentBound === state.activeAssetId) {
          const next = { ...cur };
          delete next[key];
          state.bindings = next;
        } else {
          state.bindings = { ...cur, [key]: { assetId: state.activeAssetId } };
        }
        renderSegList();
        updateSegPill();
      });
      segList.appendChild(row);
    });
  };

  const updateSegPill = () => {
    if (!segPill) return;
    if (state.loadingSegments) {
      segPill.textContent = "生成分段中...";
      segPill.classList.remove("is-ok", "is-bad");
      return;
    }
    const segCount = Array.isArray(state.segments) ? state.segments.length : 0;
    const bindCount = (() => {
      try {
        return Object.keys(state.bindings && typeof state.bindings === "object" ? state.bindings : {}).length;
      } catch {
        return 0;
      }
    })();
    segPill.textContent = segCount ? `分段 ${segCount}｜已绑 ${bindCount}` : "暂无分段";
    segPill.classList.toggle("is-ok", segCount > 0);
    segPill.classList.toggle("is-bad", segCount <= 0);
  };

  const ensureSegmentsReady = async () => {
    if (!vPath) return false;
    const already = Array.isArray(state.segments) && state.segments.length > 0 && String(state.segmentsVideoPath || "") === vPath;
    if (already) return true;
    if (!window.api?.subBgm?.planSegments) {
      showToast("当前版本未接入分段字幕规划能力。");
      return false;
    }
    state.loadingSegments = true;
    updateSegPill();
    renderSegList();
    try {
      const res = await window.api.subBgm.planSegments({
        videoPath: vPath,
        preferredSubtitleText: String(preferredSubtitleText || ""),
        subtitleTemplate: subtitleTemplate && typeof subtitleTemplate === "object" ? subtitleTemplate : null,
        asrModelChoice: asrModelChoice && typeof asrModelChoice === "object" ? asrModelChoice : null
      });
      if (!res?.ok || !Array.isArray(res?.segments) || !res.segments.length) {
        showToast(String(res?.message || "生成分段字幕失败。"));
        state.segments = [];
        state.segmentsVideoPath = vPath;
        return false;
      }
      state.segments = res.segments;
      state.segmentsVideoPath = vPath;
      const cur = state.bindings && typeof state.bindings === "object" ? state.bindings : {};
      const nextBindings = {};
      Object.keys(cur).forEach((k) => {
        const idx = Number(k);
        if (!Number.isFinite(idx) || idx < 0) return;
        if (idx >= state.segments.length) return;
        if (!bindingAssetId(cur[k])) return;
        nextBindings[String(idx)] = cur[k];
      });
      state.bindings = nextBindings;
      return true;
    } catch (e) {
      showToast(String(e?.message || e || "生成分段字幕失败。"));
      state.segments = [];
      state.segmentsVideoPath = vPath;
      return false;
    } finally {
      state.loadingSegments = false;
      updateSegPill();
      renderSegList();
    }
  };

  const importImages = async () => {
    if (state.importing) return;
    if (!window.api?.openFile) {
      showToast("当前版本不支持选择文件。");
      return;
    }
    if (!window.api?.subBgm?.importStoryboardAssets) {
      showToast("当前版本未接入素材导入能力。");
      return;
    }
    state.importing = true;
    try {
      const res = await window.api.openFile({
        title: "选择分镜素材",
        properties: ["openFile", "multiSelections"]
      });
      if (res?.canceled) return;
      const picked = Array.isArray(res?.filePaths) ? res.filePaths.map((x) => String(x || "").trim()).filter(Boolean) : [];
      const medias = picked.filter((p) => [".png", ".jpg", ".jpeg", ".webp", ".gif", ".mp4", ".mov", ".webm", ".mkv"].includes(pickExtLower(p)));
      if (!medias.length) {
        showToast("请选择图片、视频或 GIF 素材。");
        return;
      }
      const imported = await window.api.subBgm.importStoryboardAssets({ filePaths: medias });
      const items = imported?.ok && Array.isArray(imported?.items) ? imported.items : [];
      if (!items.length) {
        showToast(String(imported?.message || "导入失败。"));
        return;
      }
      const existed = new Set((Array.isArray(state.assets) ? state.assets : []).map((x) => String(x?.id || x?.path || "")));
      const next = [...(Array.isArray(state.assets) ? state.assets : [])];
      items.forEach((it) => {
        const id = String(it?.id || it?.path || "");
        if (!id || existed.has(id)) return;
        next.push(normalizeAssetItem({ id, path: String(it?.path || ""), name: String(it?.name || ""), type: String(it?.type || "") }, fallbackPlacement));
      });
      state.assets = next;
      if (!state.activeAssetId && next.length) state.activeAssetId = String(next[0]?.id || next[0]?.path || "");
      renderGrid();
      renderAssetInspector();
      renderSegList();
    } catch (e) {
      showToast(String(e?.message || e || "导入失败。"));
    } finally {
      state.importing = false;
    }
  };

  const clearBindings = () => {
    state.bindings = {};
    renderSegList();
    updateSegPill();
  };

  document.body.appendChild(overlay);
  document.body.appendChild(modal);

  renderGrid();
  renderAssetInspector();
  renderSegList();
  updateSegPill();
  ensureSegmentsReady().then(() => {
    updateSegPill();
    renderSegList();
  });

  return await new Promise((resolve) => {
    const close = (result) => {
      dispose();
      resolve(result);
    };
    overlay.addEventListener("click", () => close({ ok: false, canceled: true }));
    btnCancel?.addEventListener("click", () => close({ ok: false, canceled: true }));
    btnClose?.addEventListener("click", () => close({ ok: false, canceled: true }));
    btnSave?.addEventListener("click", () => {
      close({
        ok: true,
        canceled: false,
        assets: Array.isArray(state.assets) ? state.assets : [],
        bindings: state.bindings && typeof state.bindings === "object" ? state.bindings : {},
        segments: Array.isArray(state.segments) ? state.segments : [],
        segmentsVideoPath: String(state.segmentsVideoPath || "")
      });
    });
    btnUpload?.addEventListener("click", () => importImages());
    btnClear?.addEventListener("click", () => clearBindings());
    [scaleInput, scaleText, xInput, xText, yInput, yText, categoryInput].forEach((el) => {
      el?.addEventListener?.("input", () => {
        if (scaleInput && scaleText && el === scaleInput) scaleText.value = scaleInput.value;
        if (xInput && xText && el === xInput) xText.value = xInput.value;
        if (yInput && yText && el === yInput) yText.value = yInput.value;
        if (scaleInput && scaleText && el === scaleText) scaleInput.value = scaleText.value;
        if (xInput && xText && el === xText) xInput.value = xText.value;
        if (yInput && yText && el === yText) yInput.value = yText.value;
        applyAssetEdits();
      });
      el?.addEventListener?.("change", () => {
        if (scaleInput && scaleText && el === scaleInput) scaleText.value = scaleInput.value;
        if (xInput && xText && el === xInput) xText.value = xInput.value;
        if (yInput && yText && el === yInput) yText.value = yInput.value;
        if (scaleInput && scaleText && el === scaleText) scaleInput.value = scaleText.value;
        if (xInput && xText && el === xText) xInput.value = xText.value;
        if (yInput && yText && el === yText) yText.value = yText.value;
        applyAssetEdits();
      });
    });
  });
}
