"use strict";

// 抖音发布模块：
// 1. 统一维护发布前校验逻辑，避免散落在主进程里重复实现。
// 2. 发布前自动向下滚动页面，确保“发布”按钮进入可见区域后再点击。
// 3. 统一使用 CDP 真实鼠标点击发布按钮，降低前端框架拦截 click 的概率。

function norm(x) {
  return String(x == null ? "" : x).replace(/\s+/g, " ").trim();
}

function buildPreflightJs(expected) {
  const exp = expected && typeof expected === "object" ? expected : {};
  return `
(() => {
  const exp = ${JSON.stringify(exp)};
  const norm = (x) => String(x == null ? "" : x).replace(/\\s+/g, " ").trim();
  const stripInv = (s) => String(s || "").replace(/[\\u200B\\u200C\\u200D\\uFEFF]/g, "");
  const textOf = (n) => norm(n && (n.innerText || n.textContent) || "");
  const isVisible = (el) => {
    try {
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return r && r.width > 6 && r.height > 6;
    } catch { return true; }
  };
  const pickTitleInput = () => {
    const list = [
      "input[placeholder*='填写作品标题']",
      "input[placeholder*='作品标题']",
      "input[placeholder*='标题']",
      "input[type='text'][placeholder*='标题']"
    ];
    for (const sel of list) {
      const el = document.querySelector(sel);
      if (el && isVisible(el) && !el.disabled) return el;
    }
    return Array.from(document.querySelectorAll("input[type='text']")).find((i) => isVisible(i) && !i.disabled) || null;
  };
  const pickDescEditor = () => {
    const ed = document.querySelector("[data-slate-editor='true'][contenteditable='true']") ||
      document.querySelector("div.editor-kit-editor-container.old [contenteditable='true']") ||
      document.querySelector("div.editor-kit-editor-container [contenteditable='true']") ||
      document.querySelector("[contenteditable='true'][role='textbox']") ||
      null;
    return ed && isVisible(ed) ? ed : null;
  };
  const getSlateText = (ed) => {
    if (!ed) return "";
    try {
      const strings = Array.from(ed.querySelectorAll('[data-string="true"]'))
        .filter((x) => String(x.getAttribute("data-enter") || "") !== "true")
        .map((x) => stripInv(String(x.textContent || "")));
      if (strings.length) return strings.join("\\n");
    } catch {}
    try { return stripInv(String(ed.innerText || ed.textContent || "")); } catch { return ""; }
  };
  const findSection = (keyText) => {
    const nodes = Array.from(document.querySelectorAll("*")).filter((n) => textOf(n).includes(keyText)).slice(0, 30);
    const hit = nodes[0] || null;
    if (!hit) return null;
    return hit.closest("section,form,main,div") || null;
  };
  const hasVideoReady = () => {
    const t = textOf(document.body);
    if (t.includes("上传成功")) return true;
    if (t.includes("重新上传") || t.includes("替换视频") || t.includes("更换视频") || t.includes("重新选择") || t.includes("重新上传视频")) {
      return true;
    }
    const prog = Array.from(document.querySelectorAll("[role='progressbar'],[class*='progress'],[class*='Progress']")).find((el) => isVisible(el)) || null;
    if (prog) {
      const progText = norm(String(prog.innerText || prog.textContent || prog.getAttribute("aria-valuenow") || ""));
      if (progText.includes("100")) return true;
      if (progText || t.includes("上传中") || t.includes("正在上传")) return false;
    }
    const videos = Array.from(document.querySelectorAll("video")).filter((vid) => isVisible(vid));
    for (const vid of videos) {
      try {
        const src = String(vid.currentSrc || vid.src || "");
        const rs = Number(vid.readyState || 0) || 0;
        if (src && rs >= 2) return true;
      } catch {}
    }
    if (t.includes("上传中") || t.includes("正在上传")) return false;
    return false;
  };
  const hasCoverReady = () => {
    const sec = findSection("封面") || document;
    const imgs = Array.from(sec.querySelectorAll("img")).filter((img) => {
      try {
        const r = img.getBoundingClientRect();
        return r && r.width >= 40 && r.height >= 40;
      } catch { return false; }
    });
    if (imgs.length) return true;
    const t = textOf(sec);
    if (t.includes("重新上传") || t.includes("更换") || t.includes("已选择")) return true;
    return false;
  };
  const missing = [];
  const detail = {};

  const titleInput = pickTitleInput();
  const titleVal = titleInput ? norm(titleInput.value) : "";
  detail.titleVal = titleVal;
  if (exp.title && titleVal !== norm(exp.title)) missing.push("作品标题未同步");

  const ed = pickDescEditor();
  const descVal = norm(getSlateText(ed));
  detail.descHas = !!descVal;
  if (exp.desc) {
    const core = norm(exp.desc);
    if (!descVal.includes(core)) missing.push("作品简介未同步");
  }

  if (exp.videoPath) {
    const ok = hasVideoReady();
    detail.videoReady = ok;
    if (!ok) missing.push("视频未就绪");
  }

  if (exp.coverPath) {
    const ok = hasCoverReady();
    detail.coverReady = ok;
    if (!ok) missing.push("封面未就绪");
  }

  return { ok: missing.length === 0, missing, detail };
})()
  `.trim();
}

function buildFindPublishButtonJs(selector) {
  return `
(() => {
  const sel = ${JSON.stringify(String(selector || ""))};
  const textOf = (n) => String(n && (n.innerText || n.textContent) || "").replace(/\\s+/g, " ").trim();
  const isVisible = (el) => {
    try {
      if (!el) return false;
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return false;
      const r = el.getBoundingClientRect();
      return !!r && r.width > 10 && r.height > 10;
    } catch { return false; }
  };
  const isPublishText = (txt) => {
    const t = textOf({ innerText: txt });
    if (!t) return false;
    if (/设置|权限|时间|同步|封面|取消|返回|草稿|预览|推荐|下一步/.test(t)) return false;
    return t === "发布" || t === "立即发布" || /^发布(作品|视频|图文)?$/.test(t);
  };
  const isInViewport = (el) => {
    try {
      const r = el.getBoundingClientRect();
      const h = window.innerHeight || document.documentElement.clientHeight || 0;
      const w = window.innerWidth || document.documentElement.clientWidth || 0;
      return r.top >= 0 && r.left >= 0 && r.bottom <= h && r.right <= w;
    } catch { return false; }
  };
  const scrollElementIntoView = (el) => {
    try { el.scrollIntoView({ block: "center", inline: "center", behavior: "auto" }); } catch {}
    try {
      let cur = el ? el.parentElement : null;
      let guard = 0;
      while (cur && guard < 8) {
        guard += 1;
        const st = getComputedStyle(cur);
        const oy = String(st.overflowY || "");
        if (/(auto|scroll)/.test(oy) && cur.scrollHeight > cur.clientHeight + 20) {
          const r = el.getBoundingClientRect();
          const pr = cur.getBoundingClientRect();
          const delta = (r.top + r.height / 2) - (pr.top + pr.height / 2);
          cur.scrollTop += delta;
        }
        cur = cur.parentElement;
      }
    } catch {}
  };
  const scrollPageDown = () => {
    const doc = document.scrollingElement || document.documentElement || document.body;
    const before = Number(doc.scrollTop || window.pageYOffset || 0) || 0;
    const delta = Math.max(320, Math.floor((window.innerHeight || 800) * 0.72));
    try { window.scrollBy(0, delta); } catch {}
    try { doc.scrollTop = before + delta; } catch {}
    try {
      const scrollers = Array.from(document.querySelectorAll("*"))
        .filter((el) => {
          try {
            const st = getComputedStyle(el);
            return /(auto|scroll)/.test(String(st.overflowY || "")) && el.scrollHeight > el.clientHeight + 40 && el.clientHeight > 120;
          } catch { return false; }
        })
        .sort((a, b) => (b.clientHeight || 0) - (a.clientHeight || 0))
        .slice(0, 6);
      for (const el of scrollers) el.scrollTop += Math.max(200, Math.floor(el.clientHeight * 0.72));
    } catch {}
    const after = Number(doc.scrollTop || window.pageYOffset || 0) || 0;
    const max = Math.max(0, Number((doc.scrollHeight || 0) - (window.innerHeight || 0)) || 0);
    return { before, after, delta: after - before, reachBottom: after >= max - 4 };
  };
  const toHit = (el, by) => {
    if (!el || !isVisible(el)) return null;
    const r = el.getBoundingClientRect();
    return {
      ok: true,
      by,
      text: textOf(el),
      x: Math.floor(r.left + r.width / 2),
      y: Math.floor(r.top + r.height / 2),
      top: Math.floor(r.top),
      bottom: Math.floor(r.bottom),
      height: Math.floor(r.height),
      visible: true,
      inViewport: isInViewport(el)
    };
  };

  const selectorEl = sel ? document.querySelector(sel) : null;
  const textBtns = Array.from(document.querySelectorAll("button,[role='button'],div[role='button'],span[role='button'],a[role='button']"));
  const textEl = textBtns.find((el) => isVisible(el) && isPublishText(textOf(el))) || null;
  const hitEl = selectorEl && isVisible(selectorEl) ? selectorEl : textEl;

  if (!hitEl) {
    const scroll = scrollPageDown();
    return { ok: false, reason: "no_button", scrolled: true, scroll };
  }

  if (!isInViewport(hitEl)) {
    scrollElementIntoView(hitEl);
  }
  const hit = toHit(hitEl, selectorEl === hitEl ? "selector" : "text");
  if (hit && hit.inViewport) return hit;

  const scroll = scrollPageDown();
  const hitAfter = toHit(hitEl, selectorEl === hitEl ? "selector" : "text");
  if (hitAfter && hitAfter.inViewport) return hitAfter;
  return {
    ok: false,
    reason: "button_out_of_view",
    scrolled: true,
    scroll,
    text: String(hitAfter?.text || ""),
    top: Number(hitAfter?.top || 0) || 0,
    bottom: Number(hitAfter?.bottom || 0) || 0
  };
})()
  `.trim();
}

async function dispatchClickAt(cdp, x, y) {
  const xx = Math.max(0, Number(x || 0) || 0);
  const yy = Math.max(0, Number(y || 0) || 0);
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: xx, y: yy, button: "left", clickCount: 1 }).catch(() => null);
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x: xx, y: yy, button: "left", clickCount: 1 }).catch(() => null);
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: xx, y: yy, button: "left", clickCount: 1 }).catch(() => null);
  return true;
}

async function clickDouyinPublishButton(opts) {
  const cdp = opts?.cdp;
  const evalJsIn = opts?.evalJsIn;
  const delay = typeof opts?.delay === "function" ? opts.delay : (ms) => new Promise((r) => setTimeout(r, ms));
  const step = typeof opts?.step === "function" ? opts.step : () => {};
  const ctxId = Number(opts?.ctxId || 0) || 0;
  if (!cdp || typeof cdp.send !== "function") return { ok: false, reason: "missing_cdp" };
  if (!evalJsIn || typeof evalJsIn !== "function") return { ok: false, reason: "missing_evalJsIn" };

  const pre = await evalJsIn(buildPreflightJs(opts?.expected || {}), ctxId).catch(() => null);
  if (!pre || pre.ok !== true) {
    const missing = Array.isArray(pre?.missing) ? pre.missing : ["发布前检查失败"];
    step(`publish:preflight:fail missing=${missing.join("|")}`);
    return { ok: false, reason: "preflight_failed", missing, detail: pre?.detail || null };
  }
  step("publish:preflight:ok");

  const selector = "#popover-tip-container > button";
  let hit = null;
  let scrolled = 0;
  for (let i = 0; i < 8; i += 1) {
    step(`publish:probe attempt=${i + 1}`);
    hit = await evalJsIn(buildFindPublishButtonJs(selector), ctxId).catch(() => null);
    if (hit && hit.ok === true) break;
    if (hit?.scrolled) {
      scrolled += 1;
      step(`publish:scroll attempt=${i + 1} reason=${String(hit.reason || "scroll")}`);
      await delay(220);
      continue;
    }
    break;
  }
  if (!hit || hit.ok !== true) {
    return {
      ok: false,
      reason: String(hit?.reason || "no_button"),
      scrolled
    };
  }

  step(
    `publish:click by=${String(hit.by || "")} text=${String(hit.text || "")} top=${String(hit.top || 0)} bottom=${String(hit.bottom || 0)} scrolled=${String(
      scrolled
    )}`
  );
  await dispatchClickAt(cdp, hit.x, hit.y);
  await delay(350);

  const verifyJs = `
(() => {
  const el = document.querySelector(${JSON.stringify(selector)});
  return { hasSelector: !!el };
})()
  `.trim();
  const v = await evalJsIn(verifyJs, ctxId).catch(() => null);
  return { ok: true, clicked: true, stillHasButton: !!v?.hasSelector, scrolled };
}

module.exports = {
  clickDouyinPublishButton
};
