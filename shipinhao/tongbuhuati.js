"use strict";

// 视频号发布页：同步话题
// 作用：
// 1. 将标题 + 简介 + 话题按固定格式拼接
// 2. 写入视频描述输入框 div.input-editor

module.exports = {
  async run(ctx) {
    const step = ctx?.step || (() => {});
    const throwIfCancelled = ctx?.throwIfCancelled || (() => {});
    const waitSelector = ctx?.waitSelector;
    const evalJs0 = ctx?.evalJs0;
    const evalJsIn = ctx?.evalJsIn;
    const title = String(ctx?.data?.title || "").trim();
    const desc = String(ctx?.data?.desc || "").trim();
    const tags = Array.isArray(ctx?.data?.tags) ? ctx.data.tags : [];
    const pickedTags = tags.map((x) => String(x || "").trim()).filter(Boolean);
    const tagText = pickedTags.map((x) => (x.startsWith("#") ? x : `#${x}`)).join(" ");
    const finalText = [title, desc, tagText].filter(Boolean).join("\n").trim();
    if (!finalText) return { ok: false, message: "empty title/desc/tags" };

    const editorSel =
      "#container-wrap > div.container-center > div > div > div.main-body-wrap.post-create > div.main-body > div > div.post-edit-wrap.material-edit-wrap > div.form > div.form-item.flex-start > div.form-item-body > div > div.input-editor";
    const ctxId = Number(ctx?.ctxId || 0) || 0;
    const evalJs = (expression) => (typeof evalJsIn === "function" ? evalJsIn(expression, ctxId) : evalJs0?.(expression));

    throwIfCancelled();
    step("sp:tags:wait_editor");
    const ok = (await waitSelector?.(editorSel, 20000, ctxId)) === true;
    if (!ok) return { ok: false, message: "editor not found" };

    throwIfCancelled();
    step("sp:tags:fill_editor");
    const r = await evalJs(`
(() => {
  const text = ${JSON.stringify(finalText)};
  const el =
    document.querySelector(${JSON.stringify(editorSel)}) ||
    document.querySelector("div.input-editor[contenteditable]") ||
    document.querySelector("div.input-editor");
  if (!el) return { ok: false, message: "no editor" };
  try { el.scrollIntoView({ block: "center", inline: "center" }); } catch {}
  try { el.focus(); } catch {}
  const setText = (node, value) => {
    try { document.execCommand("selectAll", false, null); } catch {}
    try { document.execCommand("insertText", false, value); } catch {}
    let cur = String(node.innerText || node.textContent || "").trim();
    if (cur !== value) {
      try { node.textContent = value; } catch {}
      cur = String(node.innerText || node.textContent || "").trim();
    }
    if (cur !== value) {
      try { node.innerHTML = String(value).split("\\n").map((line) => line || "").join("<br>"); } catch {}
      cur = String(node.innerText || node.textContent || "").trim();
    }
    try { node.dispatchEvent(new InputEvent("input", { bubbles: true, data: value, inputType: "insertText" })); } catch {
      try { node.dispatchEvent(new Event("input", { bubbles: true })); } catch {}
    }
    try { node.dispatchEvent(new Event("change", { bubbles: true })); } catch {}
    try { node.blur(); } catch {}
    return cur;
  };
  const finalValue = setText(el, text);
  return { ok: finalValue === text, finalValue, len: finalValue.length };
})()
    `).catch(() => null);
    if (!r || r.ok !== true) return { ok: false, message: String(r?.message || "fill shipinhao description failed"), result: r || null };
    return { ok: true, finalValue: String(r.finalValue || ""), len: Number(r.len || 0) || 0, usedTags: pickedTags };
  }
};
