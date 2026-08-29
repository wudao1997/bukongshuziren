"use strict";

module.exports = {
  async run(ctx) {
    const step = ctx?.step || (() => {});
    const throwIfCancelled = ctx?.throwIfCancelled || (() => {});
    const dbg = typeof ctx?.dbg === "function" ? ctx.dbg : () => {};
    const waitSelector = ctx?.waitSelector;
    const trySetFileInputFilesEx = ctx?.trySetFileInputFilesEx;
    const trySetFileInputFilesInFrame = ctx?.trySetFileInputFilesInFrame;
    const clickSelectorPoint = ctx?.clickSelectorPoint;
    const cdp = ctx?.cdp;
    const evalJs0 = ctx?.evalJs0;
    const evalJsIn = ctx?.evalJsIn;
    const delay = ctx?.delay || (async (ms) => new Promise((resolve) => setTimeout(resolve, ms)));
    const ctxId = Number(ctx?.ctxId || 0) || 0;
    const frameId = String(ctx?.frameId || "").trim();
    const evalJs = (expr) => (typeof evalJsIn === "function" ? evalJsIn(expr, ctxId) : evalJs0?.(expr));
    dbg("H4", "shipinhao.video.start", { ctxId, frameId, hasEvalJsIn: typeof evalJsIn === "function" });

    const videoPath = String(ctx?.data?.videoPath || "").trim();
    const abs = videoPath ? ctx?.path?.resolve(videoPath) : "";
    dbg("H1", "shipinhao.video.file", { videoPath, absPath: abs, exists: !!ctx?.fs?.existsSync?.(abs) });
    if (!videoPath) return { ok: false, message: "empty videoPath" };
    if (!abs || !ctx?.fs?.existsSync?.(abs)) return { ok: false, message: `video not found: ${abs}` };

    const uploadEntrySelList = [
      "#container-wrap > div.container-center > div > div > div.main-body-wrap.post-create > div.main-body > div > div.post-edit-wrap.material-edit-wrap > div.material > div > div > div > span > div > span > div > div",
      "div.material > div > div > div > span > div > span > div > div",
      "div.upload-content",
      "div.material"
    ];
    const fileSelList = [
      "div.material input",
      "div.material input[type='file']",
      "div.upload-content input[type='file']",
      "#container-wrap input[type='file'][accept*='video']",
      "#container-wrap input[type='file']",
      "input[type='file'][accept*='video']",
      "input[type='file']"
    ];
    const firstUploadEntrySel = uploadEntrySelList[0];

    const clickByText = async (keyword) => {
      const r = await evalJs(`
(() => {
  const allNodes = (root) => {
    const out = [];
    const walk = (node) => {
      if (!node) return;
      if (node.nodeType === 1) out.push(node);
      const children = node.children ? Array.from(node.children) : [];
      children.forEach(walk);
      const sr = node.shadowRoot || null;
      if (sr) Array.from(sr.children || []).forEach(walk);
    };
    walk(root || document.documentElement);
    return out;
  };
  const key = ${JSON.stringify(String(keyword || ""))};
  const textOf = (n) => String(n?.innerText || n?.textContent || "").replace(/\\s+/g, "");
  const isVisible = (n) => {
    try {
      if (!n) return false;
      const r = n.getBoundingClientRect();
      return (r.width || 0) > 8 && (r.height || 0) > 8;
    } catch { return true; }
  };
  const nodes = allNodes(document.documentElement).filter((n) => {
    const tag = String(n?.tagName || "").toLowerCase();
    return ["button", "div", "span", "label"].includes(tag) || String(n?.getAttribute?.("role") || "") === "button";
  }).filter(isVisible);
  const hit = nodes.find((n) => textOf(n).includes(key)) || null;
  if (!hit) return { ok: false };
  const btn = hit.closest("button,[role=button],div,span,label") || hit;
  try { btn.scrollIntoView({ block: "center", inline: "center" }); } catch {}
  try { btn.click(); } catch {}
  return { ok: true };
})()
      `).catch(() => null);
      dbg("H2", "shipinhao.video.clickByText", { keyword, result: r && typeof r === "object" ? r : { value: r } });
      return r?.ok === true;
    };

    const buildSelectorQueue = () => {
      const out = [];
      const add = (x) => {
        const v = String(x || "").trim();
        if (!v || out.includes(v)) return;
        out.push(v);
      };
      fileSelList.forEach(add);
      return out;
    };

    const probeUploadUi = async () => {
      const info =
        (await evalJs(`
(() => {
  const deepQuery = (selector) => {
    const walk = (root) => {
      if (!root) return null;
      try {
        const found = root.querySelector(selector);
        if (found) return found;
      } catch {}
      const nodes = root.querySelectorAll ? Array.from(root.querySelectorAll("*")) : [];
      for (const node of nodes) {
        const sr = node.shadowRoot || null;
        if (sr) {
          const found = walk(sr);
          if (found) return found;
        }
      }
      return null;
    };
    return walk(document);
  };
  const text = String(document.body?.innerText || document.body?.textContent || "");
  const inputs = Array.from(document.querySelectorAll("input[type='file']"));
  const visibleInputs = inputs.filter((n) => {
    try {
      const r = n.getBoundingClientRect();
      return (r.width || 0) >= 0 && (r.height || 0) >= 0;
    } catch { return true; }
  });
  const uploadEntry = ${JSON.stringify(uploadEntrySelList)}.map((s) => deepQuery(s)).find(Boolean) || null;
  const coverPreview = deepQuery("div.vertical-cover-wrap img, img.cover-img-vertical");
  const editor = deepQuery("div.input-editor[contenteditable], div.input-editor");
  const hasVideoInput = visibleInputs.some((n) => /video/i.test(String(n.getAttribute("accept") || "")));
  return {
    ok: true,
    hasUploadEntry: !!uploadEntry,
    hasAnyInput: visibleInputs.length > 0,
    hasVideoInput,
    hasCoverPreview: !!coverPreview,
    hasEditor: !!editor,
    inputCount: visibleInputs.length,
    text: text.slice(0, 240)
  };
})()
        `).catch(() => null)) || null;
      dbg("H2", "shipinhao.video.probe", info && typeof info === "object" ? info : { value: info });
      return info;
    };

    const clickUploadEntry = async () => {
      for (const sel of uploadEntrySelList) {
        throwIfCancelled();
        if (typeof clickSelectorPoint === "function") {
          const ok = await clickSelectorPoint(sel, 114, 12, ctxId).catch(() => false);
          dbg("H2", "shipinhao.video.click.point", { selector: sel, ok: !!ok });
          if (ok) return { ok: true, selector: sel, method: "point" };
        }
        const fallback = await evalJs(`
(() => {
  const selector = ${JSON.stringify(sel)};
  const isVisible = (n) => {
    try {
      if (!n) return false;
      const r = n.getBoundingClientRect();
      return (r.width || 0) > 8 && (r.height || 0) > 8;
    } catch { return true; }
  };
  const walk = (root) => {
    if (!root) return null;
    try {
      const found = root.querySelector(selector);
      if (found) return found;
    } catch {}
    const nodes = root.querySelectorAll ? Array.from(root.querySelectorAll("*")) : [];
    for (const node of nodes) {
      const sr = node.shadowRoot || null;
      if (sr) {
        const found = walk(sr);
        if (found) return found;
      }
    }
    return null;
  };
  const node = walk(document);
  if (!node || !isVisible(node)) return { ok: false };
  const clickable = node.closest?.("button,[role=button],label,a,div,span") || node.parentElement || node;
  try { clickable.scrollIntoView({ block: "center", inline: "center" }); } catch {}
  try { clickable.click(); } catch {}
  return { ok: true };
})()
        `).catch(() => null);
        dbg("H2", "shipinhao.video.click.dom", { selector: sel, result: fallback && typeof fallback === "object" ? fallback : { value: fallback } });
        if (fallback?.ok) return { ok: true, selector: sel, method: "dom" };
      }
      let ok = await clickByText("上传时长8小时内");
      if (!ok) ok = await clickByText("建议分辨率720p及以上");
      if (!ok) ok = await clickByText("上传");
      return ok ? { ok: true, selector: "text", method: "text" } : { ok: false };
    };

    const trySetVideoFile = async () => {
      const queue = buildSelectorQueue();
      let setRes = null;
      if (frameId && typeof trySetFileInputFilesInFrame === "function") {
        for (const sel of queue) {
          throwIfCancelled();
          setRes = await trySetFileInputFilesInFrame(abs, "video", sel, frameId);
          dbg("H1", "shipinhao.video.set.frame", { selector: sel, result: setRes && typeof setRes === "object" ? setRes : { value: setRes } });
          if (setRes?.ok === true) return { ok: true, setRes, selector: sel, via: "frame" };
        }
      }
      for (const sel of queue) {
        throwIfCancelled();
        setRes = await trySetFileInputFilesEx?.(abs, "video", sel);
        dbg("H1", "shipinhao.video.set.root", { selector: sel, result: setRes && typeof setRes === "object" ? setRes : { value: setRes } });
        if (setRes?.ok === true) return { ok: true, setRes, selector: sel, via: "root" };
      }
      return { ok: false, setRes };
    };

    const acceptFileChooserOnce = async (clickFn, timeoutMs = 15000) => {
      if (!cdp || typeof cdp.send !== "function" || typeof cdp.waitForEvent !== "function") {
        const result = { ok: false, message: "cdp fileChooser api unavailable" };
        dbg("H2", "shipinhao.video.filechooser.skip", result);
        return result;
      }
      try {
        await cdp.send("Page.setInterceptFileChooserDialog", { enabled: true }).catch(() => null);
        const waitP = cdp.waitForEvent("Page.fileChooserOpened", timeoutMs);
        try {
          await Promise.resolve().then(() => clickFn && clickFn());
        } catch {}
        await waitP;
        await cdp.send("Page.handleFileChooser", { action: "accept", files: [abs] }).catch(() => null);
        const result = { ok: true, mode: "fileChooser", abs };
        dbg("H2", "shipinhao.video.filechooser.accept", result);
        return result;
      } catch (e) {
        const result = { ok: false, message: String(e?.message || e) };
        dbg("H2", "shipinhao.video.filechooser.error", result);
        return result;
      }
    };

    throwIfCancelled();
    step("sp:video:probe_upload_ui");
    let uiState = await probeUploadUi();
    let clicked = false;

    throwIfCancelled();
    step("sp:video:try_set_file_direct");
    const firstSet = await trySetVideoFile();

    if (!firstSet?.ok && !uiState?.hasVideoInput && !uiState?.hasAnyInput) {
      throwIfCancelled();
      step("sp:video:wait_upload_entry");
      await waitSelector?.(firstUploadEntrySel, 12000, ctxId).catch(() => false);

      throwIfCancelled();
      step("sp:video:click_upload_entry");
      const clickRes = await clickUploadEntry();
      dbg("H2", "shipinhao.video.click.final", clickRes && typeof clickRes === "object" ? clickRes : { value: clickRes });
      clicked = !!clickRes?.ok;
      if (!clicked) return { ok: false, message: "点击视频上传区域失败" };
      await delay(240);
      uiState = await probeUploadUi();
    }

    throwIfCancelled();
    step("sp:video:set_file");
    let setRes = firstSet?.setRes || null;
    if (!setRes || setRes.ok !== true) {
      const secondSet = await trySetVideoFile();
      setRes = secondSet?.setRes || null;
    }
    if ((!setRes || setRes.ok !== true) && clicked) {
      throwIfCancelled();
      step("sp:video:file_chooser_fallback");
      const chooserRes = await acceptFileChooserOnce(() => clickUploadEntry());
      if (chooserRes?.ok === true) {
        setRes = { ok: true, mode: "fileChooser", abs };
      }
    }
    if (!setRes || setRes.ok !== true) return { ok: false, message: String(setRes?.message || "set video file failed") };

    throwIfCancelled();
    step("sp:video:wait_upload_done");
    const start = Date.now();
    let ready = null;
    while (Date.now() - start < 240000) {
      throwIfCancelled();
      ready = await evalJs(`
(() => {
  const deepQuery = (selector) => {
    const walk = (root) => {
      if (!root) return null;
      try {
        const found = root.querySelector(selector);
        if (found) return found;
      } catch {}
      const nodes = root.querySelectorAll ? Array.from(root.querySelectorAll("*")) : [];
      for (const node of nodes) {
        const sr = node.shadowRoot || null;
        if (sr) {
          const found = walk(sr);
          if (found) return found;
        }
      }
      return null;
    };
    return walk(document);
  };
  const text = String(document.body?.innerText || document.body?.textContent || "");
  const cover = deepQuery("div.vertical-cover-wrap img, img.cover-img-vertical");
  const editor = deepQuery("div.input-editor[contenteditable], div.input-editor");
  const failed = /上传失败|上传出错|上传异常/.test(text);
  const uploading = /上传中|处理中|转码中|校验中|上传视频中/.test(text);
  const hasReplace = /重新上传|替换视频|重新选择/.test(text);
  return {
    ok: !failed && (!!cover || !!editor || hasReplace),
    hasCoverPreview: !!cover,
    hasEditor: !!editor,
    failed,
    uploading,
    hasReplace,
    coverSrc: String(cover?.src || ""),
    textHead: text.slice(0, 240)
  };
})()
      `).catch(() => null);
      dbg("H3", "shipinhao.video.status", ready && typeof ready === "object" ? ready : { value: ready });
      if (ready?.failed) return { ok: false, message: "video upload failed", result: ready };
      if (ready?.ok) break;
      const sec = Math.floor((Date.now() - start) / 5000);
      if (sec >= 1) step(`sp:video:waiting ${sec * 5}s`);
      await delay(300);
    }

    if (!ready?.ok) {
      dbg("H3", "shipinhao.video.timeout", ready && typeof ready === "object" ? ready : { value: ready });
      return { ok: false, message: "video upload timeout", result: ready || null };
    }

    dbg("H3", "shipinhao.video.success", ready && typeof ready === "object" ? ready : { value: ready });
    step("sp:video:done");
    return { ok: true, abs, clickedUpload: clicked, ready };
  }
};
