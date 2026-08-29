import { elFromHTML } from "../ui.js";

export const route = {
  path: "/avatar-library",
  title: "数字人形象",
  async render() {
    const root = elFromHTML(`
      <div class="avatar-page">
        <div class="avatar-topbar">
          <div class="avatar-title">
            <div class="avatar-title-main">数字人形象</div>
            <div class="avatar-title-sub">管理多个数字人形象素材：上传视频形象，后续用于数字人合成</div>
          </div>
          <div class="avatar-topbar-actions">
            <button class="btn" id="btn-refresh">刷新</button>
            <button class="btn btn-primary" id="btn-add">＋ 添加</button>
          </div>
        </div>

        <div class="avatar-grid" id="avatar-grid"></div>

        <div class="avatar-empty" id="avatar-empty" hidden>
          <div class="avatar-empty-icon">📁</div>
          <div class="avatar-empty-title">暂无记录</div>
        </div>

        <div class="modal-overlay" id="avatar-modal-overlay" hidden></div>
        <div class="modal avatar-modal" id="avatar-modal" hidden>
          <div class="modal-head">
            <div class="modal-title">添加视频形象</div>
            <button class="modal-close" id="avatar-modal-close" title="关闭">×</button>
          </div>
          <div class="modal-body avatar-modal-body">
            <div class="avatar-modal-left">
              <div class="field">
                <div class="label">名称</div>
                <input id="avatar-name" type="text" placeholder="例如：口播-小美" />
              </div>

              <div class="field">
                <div class="label">视频</div>
                <div class="avatar-drop" id="avatar-drop">
                  <div class="avatar-drop-inner" id="avatar-drop-inner">
                    <div class="avatar-drop-icon">⬆</div>
                    <div class="avatar-drop-title">选择形象视频文件</div>
                    <div class="avatar-drop-sub">支持拖拽或点击选择（mp4/mov/mkv/webm）</div>
                    <button class="btn" id="avatar-pick" type="button">选择视频文件</button>
                  </div>
                  <div class="avatar-preview" id="avatar-preview" hidden>
                    <video id="avatar-preview-video" muted playsinline controls></video>
                    <div class="avatar-preview-actions">
                      <button class="btn" id="avatar-repick" type="button">更换视频</button>
                      <span class="pill mono" id="avatar-file-pill">未选择</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="avatar-modal-right">
              <div class="avatar-sample-title">形象示例</div>
              <div class="avatar-samples">
                <div class="avatar-sample">
                  <img class="avatar-sample-img" src="./assets/zhenglianshipai.png" alt="正脸自拍示例" />
                  <div class="avatar-sample-tip ok"><span class="avatar-sample-dot">✓</span> 正脸自拍</div>
                </div>
                <div class="avatar-sample">
                  <img class="avatar-sample-img" src="./assets/kezhangkoubikou.png" alt="可张口闭口示例" />
                  <div class="avatar-sample-tip ok"><span class="avatar-sample-dot">✓</span> 可张口闭口</div>
                </div>
                <div class="avatar-sample">
                  <img class="avatar-sample-img is-bad" src="./assets/mianbuyouganrao.png" alt="面部有干扰示例" />
                  <div class="avatar-sample-tip bad"><span class="avatar-sample-dot">×</span> 面部有干扰</div>
                </div>
              </div>

              <div class="avatar-req-title">形象视频要求</div>
              <div class="avatar-req-box">
                <ol class="avatar-req-list">
                  <li>视频时长要求在10秒～30秒，视频格式为MP4，建议分辨率1080p~4K</li>
                  <li>为保障效果，视频必须保证每一帧都要正面露脸，脸部无任何遮挡，并且视频中只能出现同一个人脸</li>
                  <li>视频人物建议闭口或微微张口，张口幅度不宜过大，距离镜头一定距离，可根据合成效果自行调整</li>
                  <li>不能全程闭嘴，可以正常语气循环说 一二三四五六七八九 等文字</li>
                </ol>
              </div>
            </div>
          </div>
          <div class="modal-foot">
            <button class="btn" id="avatar-cancel">取消</button>
            <button class="btn btn-primary" id="avatar-save" disabled>保存</button>
          </div>
        </div>

        <div class="modal-overlay" id="avatar-confirm-overlay" hidden></div>
        <div class="modal avatar-confirm-modal" id="avatar-confirm-modal" hidden>
          <div class="modal-head">
            <div class="modal-title">删除形象</div>
            <button class="modal-close" id="avatar-confirm-close" title="关闭">×</button>
          </div>
          <div class="modal-body">
            <div class="avatar-confirm-text" id="avatar-confirm-text"></div>
            <div class="hint">删除后将同时移除本地文件，无法恢复。</div>
          </div>
          <div class="modal-foot">
            <button class="btn" id="avatar-confirm-cancel">取消</button>
            <button class="btn btn-danger" id="avatar-confirm-ok">确认删除</button>
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

    const toFileUrl = (p) => {
      const raw = String(p || "").trim();
      if (!raw) return "";
      if (/^[a-zA-Z]:\\/.test(raw) || raw.startsWith("\\\\")) {
        return encodeURI(`file:///${raw.replace(/\\/g, "/")}`);
      }
      try {
        return new URL(raw, window.location.href).toString();
      } catch {
        return raw;
      }
    };

    const avatarGrid = root.querySelector("#avatar-grid");
    const avatarEmpty = root.querySelector("#avatar-empty");
    const btnRefresh = root.querySelector("#btn-refresh");

    const modalOverlay = root.querySelector("#avatar-modal-overlay");
    const modal = root.querySelector("#avatar-modal");
    const modalClose = root.querySelector("#avatar-modal-close");
    const modalCancel = root.querySelector("#avatar-cancel");
    const modalSave = root.querySelector("#avatar-save");
    const nameInput = root.querySelector("#avatar-name");
    const drop = root.querySelector("#avatar-drop");
    const pickBtn = root.querySelector("#avatar-pick");
    const repickBtn = root.querySelector("#avatar-repick");
    const dropInner = root.querySelector("#avatar-drop-inner");
    const previewWrap = root.querySelector("#avatar-preview");
    const previewVideo = root.querySelector("#avatar-preview-video");
    const filePill = root.querySelector("#avatar-file-pill");

    const confirmOverlay = root.querySelector("#avatar-confirm-overlay");
    const confirmModal = root.querySelector("#avatar-confirm-modal");
    const confirmClose = root.querySelector("#avatar-confirm-close");
    const confirmCancel = root.querySelector("#avatar-confirm-cancel");
    const confirmOk = root.querySelector("#avatar-confirm-ok");
    const confirmText = root.querySelector("#avatar-confirm-text");

    let avatars = [];
    let pickedVideoPath = "";
    let pendingDeleteId = "";
    let editingId = "";
    let editingDraftName = "";
    let reloadPromise = null;

    const openModal = () => {
      pickedVideoPath = "";
      nameInput.value = "";
      modalSave.disabled = true;
      dropInner.hidden = false;
      previewWrap.hidden = true;
      previewVideo.removeAttribute("src");
      filePill.textContent = "未选择";
      filePill.title = "";
      modalOverlay.hidden = false;
      modal.hidden = false;
      nameInput.focus();
    };

    const closeModal = () => {
      modalOverlay.hidden = true;
      modal.hidden = true;
      try {
        previewVideo.pause();
      } catch {}
    };

    const openConfirm = ({ id, name }) => {
      pendingDeleteId = String(id || "");
      confirmText.textContent = `确定删除“${String(name || "").trim() || "未命名形象"}”？`;
      confirmOverlay.hidden = false;
      confirmModal.hidden = false;
    };

    const closeConfirm = () => {
      confirmOverlay.hidden = true;
      confirmModal.hidden = true;
      pendingDeleteId = "";
    };

    const isVideoExtOk = (p) => /\.(mp4|mov|mkv|webm)$/i.test(String(p || ""));

    const setPickedVideo = (fp) => {
      const filePath = String(fp || "").trim();
      if (!filePath) return;
      if (!isVideoExtOk(filePath)) {
        toast("请选择视频文件（mp4/mov/mkv/webm）。");
        return;
      }
      pickedVideoPath = filePath;
      dropInner.hidden = true;
      previewWrap.hidden = false;
      filePill.textContent = filePath.split(/[\\/]/).pop() || filePath;
      filePill.title = filePath;
      previewVideo.src = toFileUrl(filePath);
      previewVideo.load();
      modalSave.disabled = !(String(nameInput.value || "").trim() && pickedVideoPath);
    };

    const render = () => {
      avatarGrid.innerHTML = (avatars || [])
        .map((a) => {
          const id = String(a?.id || "");
          const name = String(a?.name || "").trim() || "未命名";
          const thumb = String(a?.thumbPath || "");
          const video = String(a?.videoPath || "");
          const w = Number(a?.width || 0);
          const h = Number(a?.height || 0);
          const fps = Number(a?.fps || 0);
          const dur = Number(a?.durationSec || 0);
          const res = w && h ? `${w}×${h}` : "未知尺寸";
          const durTxt = dur ? `${Math.round(dur)}s` : "未知时长";
          const fpsTxt = fps ? `${fps.toFixed(2)} FPS` : "未知FPS";
          const cover = thumb ? `<img class="avatar-thumb-img" src="${toFileUrl(thumb)}" />` : `<div class="avatar-thumb-ph"></div>`;
          const playLayer = `<div class="avatar-thumb-play">▶</div>`;
          const isEditing = editingId === id;
          const inputVal = isEditing ? editingDraftName : name;
          return `
            <div class="avatar-card" data-id="${id}">
              <div class="avatar-card-head">
                <input class="avatar-name-input ${isEditing ? "is-editing" : ""}" value="${String(inputVal).replaceAll('"', "&quot;")}" ${
                  isEditing ? "" : "readonly"
                } />
                <div class="avatar-head-actions">
                  ${
                    isEditing
                      ? `
                        <button class="icon-btn light" data-act="save" title="保存">💾</button>
                        <button class="icon-btn light" data-act="cancel" title="取消">↩</button>
                      `
                      : `
                        <button class="icon-btn light" data-act="edit" title="修改名称">✎</button>
                        <button class="icon-btn light" data-act="reveal" title="打开文件位置">📁</button>
                        <button class="icon-btn danger" data-act="remove" title="删除">🗑</button>
                      `
                  }
                </div>
              </div>
              <div class="avatar-card-top">
                <div class="avatar-thumb" data-act="reveal" title="打开文件位置">
                  ${cover}
                  ${playLayer}
                </div>
              </div>
              <div class="avatar-stats">
                <span class="chip">${res}</span>
                <span class="chip">${durTxt}</span>
                <span class="chip">${fpsTxt}</span>
              </div>
              <div class="avatar-card-meta mono" title="${video}">${video ? video.split(/[\\/]/).pop() : ""}</div>
            </div>
          `;
        })
        .join("");
      avatarEmpty.hidden = (avatars || []).length > 0;
    };

    const reload = async () => {
      if (reloadPromise) return reloadPromise;
      reloadPromise = (async () => {
        try {
          const res = await window.api?.avatar?.list?.();
          avatars = Array.isArray(res?.items) ? res.items : [];
        } catch {
          avatars = [];
        }
        render();
      })();
      try {
        await reloadPromise;
      } finally {
        reloadPromise = null;
      }
    };

    const refreshCurrentMenu = () => {
      const currentHash = String(window.location.hash || "").split("?")[0].trim();
      if (currentHash !== "#/avatar-library") return;
      reload().catch(() => {});
    };

    root.querySelector("#btn-add").addEventListener("click", openModal);
    btnRefresh?.addEventListener("click", () => {
      reload().then(() => toast("已刷新形象列表。")).catch(() => toast("刷新失败，请查看运行日志。"));
    });
    modalOverlay.addEventListener("click", closeModal);
    modalClose.addEventListener("click", closeModal);
    modalCancel.addEventListener("click", closeModal);

    confirmOverlay.addEventListener("click", closeConfirm);
    confirmClose.addEventListener("click", closeConfirm);
    confirmCancel.addEventListener("click", closeConfirm);

    nameInput.addEventListener("input", () => {
      modalSave.disabled = !(String(nameInput.value || "").trim() && pickedVideoPath);
    });

    pickBtn.addEventListener("click", async () => {
      const res = await window.api?.openFile?.();
      if (!res || res.canceled) return;
      setPickedVideo(res.filePaths?.[0] || "");
    });
    repickBtn.addEventListener("click", async () => {
      const res = await window.api?.openFile?.();
      if (!res || res.canceled) return;
      setPickedVideo(res.filePaths?.[0] || "");
    });

    drop.addEventListener("dragover", (e) => {
      e.preventDefault();
      drop.classList.add("is-dragover");
    });
    drop.addEventListener("dragleave", () => drop.classList.remove("is-dragover"));
    drop.addEventListener("drop", (e) => {
      e.preventDefault();
      drop.classList.remove("is-dragover");
      const f = e.dataTransfer?.files?.[0];
      const fp = f?.path || "";
      if (fp) setPickedVideo(fp);
    });

    modalSave.addEventListener("click", async () => {
      const name = String(nameInput.value || "").trim();
      if (!name) {
        toast("请填写名称。");
        return;
      }
      if (!pickedVideoPath) {
        toast("请上传视频。");
        return;
      }
      if (!window.api?.avatar?.importVideo) {
        toast("形象管理能力未就绪，请重启软件。");
        return;
      }
      modalSave.disabled = true;
      modalSave.textContent = "保存中...";
      try {
        const res = await window.api.avatar.importVideo({ name, filePath: pickedVideoPath });
        if (!res?.ok || !res?.item) {
          toast("保存失败，请查看运行日志。");
          return;
        }
        avatars = [res.item, ...(avatars || [])];
        render();
        closeModal();
        try {
          window.dispatchEvent(new CustomEvent("ipfactory:avatarChanged", { detail: { action: "add", item: res.item } }));
        } catch {}
        toast("已添加形象。");
      } catch {
        toast("保存失败，请查看运行日志。");
      } finally {
        modalSave.textContent = "保存";
        modalSave.disabled = false;
      }
    });

    const stopEditing = () => {
      editingId = "";
      editingDraftName = "";
      render();
    };

    confirmOk.addEventListener("click", async () => {
      const id = String(pendingDeleteId || "").trim();
      if (!id) return;
      confirmOk.disabled = true;
      confirmOk.textContent = "删除中...";
      try {
        const res = await window.api?.avatar?.remove?.({ id });
        if (!res?.ok) {
          toast("删除失败，请查看运行日志。");
          return;
        }
        avatars = (avatars || []).filter((x) => String(x?.id || "") !== id);
        render();
        closeConfirm();
        try {
          window.dispatchEvent(new CustomEvent("ipfactory:avatarChanged", { detail: { action: "remove", id } }));
        } catch {}
        toast("已删除。");
      } catch {
        toast("删除失败，请查看运行日志。");
      } finally {
        confirmOk.disabled = false;
        confirmOk.textContent = "确认删除";
      }
    });

    avatarGrid.addEventListener("click", (e) => {
      const card = e.target.closest(".avatar-card");
      if (!card) return;
      const id = card.getAttribute("data-id") || "";
      if (!id) return;
      const act = e.target.closest("[data-act]")?.getAttribute("data-act") || "";
      const item = (avatars || []).find((x) => String(x?.id || "") === id) || null;
      if (!item) return;
      if (act === "edit") {
        editingId = id;
        editingDraftName = String(item.name || "").trim() || "未命名";
        render();
        setTimeout(() => {
          const input = avatarGrid.querySelector(`.avatar-card[data-id="${id}"] .avatar-name-input`);
          input?.focus?.();
          try {
            input?.select?.();
          } catch {}
        }, 0);
        return;
      }
      if (act === "save") {
        const input = avatarGrid.querySelector(`.avatar-card[data-id="${id}"] .avatar-name-input`);
        const nextName = String(input?.value || "").trim();
        if (!nextName) {
          toast("名称不能为空。");
          return;
        }
        if (!window.api?.avatar?.updateName) {
          toast("能力未就绪，请重启软件。");
          return;
        }
        window.api.avatar
          .updateName({ id, name: nextName })
          .then((res) => {
            if (!res?.ok || !res?.item) {
              toast("修改失败，请查看运行日志。");
              return;
            }
            avatars = (avatars || []).map((x) => (String(x?.id || "") === id ? res.item : x));
            stopEditing();
            try {
              window.dispatchEvent(new CustomEvent("ipfactory:avatarChanged", { detail: { action: "update", item: res.item } }));
            } catch {}
            toast("已修改名称。");
          })
          .catch(() => toast("修改失败，请查看运行日志。"));
        return;
      }
      if (act === "cancel") {
        stopEditing();
        return;
      }
      if (act === "remove") {
        openConfirm({ id, name: item.name });
        return;
      }
      if (act === "reveal") {
        window.api?.avatar?.reveal?.({ id });
        return;
      }
    });

    avatarGrid.addEventListener("input", (e) => {
      const input = e.target.closest(".avatar-name-input");
      if (!input) return;
      const card = input.closest(".avatar-card");
      const id = card?.getAttribute?.("data-id") || "";
      if (!id || editingId !== id) return;
      editingDraftName = String(input.value || "");
    });

    avatarGrid.addEventListener("keydown", (e) => {
      const input = e.target.closest(".avatar-name-input");
      if (!input) return;
      const card = input.closest(".avatar-card");
      const id = card?.getAttribute?.("data-id") || "";
      if (!id || editingId !== id) return;
      if (e.key === "Escape") {
        e.preventDefault();
        stopEditing();
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const btn = avatarGrid.querySelector(`.avatar-card[data-id="${id}"] [data-act="save"]`);
        btn?.click?.();
      }
    });

    modal.addEventListener("keydown", (e) => {
      if (modal.hidden) return;
      if (e.key !== "Escape") return;
      closeModal();
    });
    confirmModal.addEventListener("keydown", (e) => {
      if (confirmModal.hidden) return;
      if (e.key !== "Escape") return;
      closeConfirm();
    });

    try {
      if (window.__ipfactoryAvatarLibraryHashRefresh) {
        window.removeEventListener("hashchange", window.__ipfactoryAvatarLibraryHashRefresh);
      }
    } catch {}
    window.__ipfactoryAvatarLibraryHashRefresh = refreshCurrentMenu;
    window.addEventListener("hashchange", window.__ipfactoryAvatarLibraryHashRefresh);

    try {
      if (window.__ipfactoryAvatarLibraryAuthRefresh) {
        window.removeEventListener("ipfactory:authChanged", window.__ipfactoryAvatarLibraryAuthRefresh);
      }
    } catch {}
    window.__ipfactoryAvatarLibraryAuthRefresh = refreshCurrentMenu;
    window.addEventListener("ipfactory:authChanged", window.__ipfactoryAvatarLibraryAuthRefresh);

    await reload();

    return root;
  }
};
