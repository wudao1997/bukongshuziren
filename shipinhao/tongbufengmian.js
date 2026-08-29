"use strict";

// 视频号发布页：同步封面
// 作用：
// 1. 等待视频上传完成后出现封面预览
// 2. 点击预览进入编辑封面窗口
// 3. 上传首页“封面制作”模块生成的图片
// 4. 点击确认保存封面

module.exports = {
  async run(ctx) {
    const step = ctx?.step || (() => {});
    const throwIfCancelled = ctx?.throwIfCancelled || (() => {});
    const waitSelector = ctx?.waitSelector;
    const clickSelectorPoint = ctx?.clickSelectorPoint;
    const trySetFileInputFilesEx = ctx?.trySetFileInputFilesEx;
    const evalJs0 = ctx?.evalJs0;
    const evalJsIn = ctx?.evalJsIn;
    const delay = ctx?.delay || (async (ms) => new Promise((resolve) => setTimeout(resolve, ms)));
    const ctxId = Number(ctx?.ctxId || 0) || 0;
    const evalJs = (expression) => (typeof evalJsIn === "function" ? evalJsIn(expression, ctxId) : evalJs0?.(expression));
    const coverPath = String(ctx?.data?.coverPath || "").trim();
    const abs = coverPath ? ctx?.path?.resolve(coverPath) : "";
    if (!coverPath) return { ok: false, message: "empty coverPath" };
    if (!abs || !ctx?.fs?.existsSync?.(abs)) return { ok: false, message: `cover not found: ${abs}` };

    const coverPreviewSel =
      "#container-wrap > div.container-center > div > div > div.main-body-wrap.post-create > div.main-body > div > div.post-edit-wrap.material-edit-wrap > div.form > div:nth-child(1) > div.form-item-body > div > div.vertical-cover-wrap.img-popover-wrap > div.vertical-img-wrap > img";
    const uploadCoverSel =
      "#container-wrap > div.container-center > div > div > div.main-body-wrap.post-create > div.main-body > div > div.post-edit-wrap.material-edit-wrap > div.form > div:nth-child(1) > div.form-item-body > div > div.edit-cover-dialog-container > div > div.weui-desktop-dialog__wrp > div > div.weui-desktop-dialog__bd > div.cover-set-wrap > div.crop-area > div.cover-control-wrap > div.video-cover-wrap > div > div.single-cover-uploader-wrap > div.wrap > div.img-wrap.initial-wrap";
    const confirmSel =
      "#container-wrap > div.container-center > div > div > div.main-body-wrap.post-create > div.main-body > div > div.post-edit-wrap.material-edit-wrap > div.form > div:nth-child(1) > div.form-item-body > div > div.edit-cover-dialog-container > div > div.weui-desktop-dialog__wrp > div > div.weui-desktop-dialog__ft > div > div > div:nth-child(2) > button";
    const fileSelList = [
      "div.single-cover-uploader-wrap input[type='file']",
      "div.edit-cover-dialog-container input[type='file']",
      "#container-wrap input[type='file'][accept*='image']",
      "#container-wrap input[type='file']",
      "input[type='file'][accept*='image']",
      "input[type='file']"
    ];

    const clickByText = async (keyword) => {
      const r = await evalJs(`
(() => {
  const key = ${JSON.stringify(String(keyword || ""))};
  const textOf = (n) => String(n?.innerText || n?.textContent || "").replace(/\\s+/g, "");
  const isVisible = (n) => {
    try {
      if (!n) return false;
      const r = n.getBoundingClientRect();
      return (r.width || 0) > 8 && (r.height || 0) > 8;
    } catch { return true; }
  };
  const nodes = Array.from(document.querySelectorAll("button,[role=button],div,span,label,img")).filter(isVisible);
  const hit = nodes.find((n) => textOf(n).includes(key)) || null;
  if (!hit) return { ok: false };
  const btn = hit.closest("button,[role=button],div,span,label") || hit;
  try { btn.scrollIntoView({ block: "center", inline: "center" }); } catch {}
  try { btn.click(); } catch {}
  return { ok: true };
})()
      `);
      return r?.ok === true;
    };

    const waitDialogReady = async (timeoutMs = 12000) => {
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        throwIfCancelled();
        const st = await evalJs(`
(() => {
  const dialog = document.querySelector("div.edit-cover-dialog-container .weui-desktop-dialog__wrp");
  const upload = document.querySelector("div.single-cover-uploader-wrap");
  const confirm = Array.from(document.querySelectorAll("button")).find((b) => String(b.textContent || "").includes("确认")) || null;
  return { ok: !!dialog && (!!upload || !!confirm) };
})()
        `).catch(() => null);
        if (st?.ok) return true;
        await delay(250);
      }
      return false;
    };

    throwIfCancelled();
    step("sp:cover:wait_preview");
    await waitSelector?.(coverPreviewSel, 180000, ctxId).catch(() => false);

    throwIfCancelled();
    step("sp:cover:open_preview");
    let opened = false;
    if (typeof clickSelectorPoint === "function") opened = !!(await clickSelectorPoint(coverPreviewSel, 33, 60));
    if (!opened) opened = await clickByText("cover-img-vertical");
    if (!opened) {
      const fallback = await evalJs(`
(() => {
  const img = document.querySelector("div.vertical-cover-wrap img, img.cover-img-vertical");
  if (!img) return { ok: false };
  try { img.scrollIntoView({ block: "center", inline: "center" }); } catch {}
  try { img.click(); } catch {}
  return { ok: true };
})()
      `).catch(() => null);
      opened = fallback?.ok === true;
    }
    if (!opened) return { ok: false, message: "打开封面预览失败" };
    await delay(500);

    throwIfCancelled();
    step("sp:cover:wait_dialog");
    const dialogOk = await waitDialogReady(15000);
    if (!dialogOk) return { ok: false, message: "封面编辑窗口未打开" };

    throwIfCancelled();
    step("sp:cover:click_upload_cover");
    let uploadClicked = false;
    if (typeof clickSelectorPoint === "function") uploadClicked = !!(await clickSelectorPoint(uploadCoverSel, 28, 16));
    if (!uploadClicked) uploadClicked = await clickByText("上传封面");
    if (!uploadClicked) return { ok: false, message: "点击上传封面入口失败" };
    await delay(300);

    throwIfCancelled();
    step("sp:cover:set_file");
    let setRes = null;
    for (const sel of fileSelList) {
      throwIfCancelled();
      setRes = await trySetFileInputFilesEx?.(abs, "image", sel);
      if (setRes?.ok === true) break;
    }
    if (!setRes || setRes.ok !== true) return { ok: false, message: String(setRes?.message || "set cover file failed") };

    throwIfCancelled();
    step("sp:cover:wait_image_ready");
    await delay(900);

    throwIfCancelled();
    step("sp:cover:confirm");
    let confirmClicked = false;
    if (typeof clickSelectorPoint === "function") confirmClicked = !!(await clickSelectorPoint(confirmSel, 70, 25));
    if (!confirmClicked) confirmClicked = await clickByText("确认");
    if (!confirmClicked) return { ok: false, message: "点击确认失败" };
    await delay(500);

    throwIfCancelled();
    step("sp:cover:wait_dialog_close");
    let closed = false;
    for (let i = 0; i < 50; i += 1) {
      throwIfCancelled();
      const st = await evalJs(`
(() => {
  const dialog = document.querySelector("div.edit-cover-dialog-container .weui-desktop-dialog__wrp");
  if (!dialog) return { closed: true };
  try {
    const r = dialog.getBoundingClientRect();
    return { closed: (r.width || 0) <= 8 || (r.height || 0) <= 8 };
  } catch {
    return { closed: false };
  }
})()
      `).catch(() => null);
      if (st?.closed) {
        closed = true;
        break;
      }
      await delay(250);
    }
    if (!closed) return { ok: false, message: "封面编辑窗口长时间未关闭" };
    step("sp:cover:done");
    return { ok: true, abs, uploadClicked, confirmClicked, closed };
  }
};
