"use strict";

// 视频号发布页：发布
// 作用：
// 1. 点击视频号“发表”按钮
// 2. 保证按钮进入可视区域后再执行点击

module.exports = {
  async run(ctx) {
    const step = ctx?.step || (() => {});
    const throwIfCancelled = ctx?.throwIfCancelled || (() => {});
    const waitSelector = ctx?.waitSelector;
    const clickSelectorPoint = ctx?.clickSelectorPoint;
    const evalJs0 = ctx?.evalJs0;
    const evalJsIn = ctx?.evalJsIn;
    const delay = ctx?.delay || (async (ms) => new Promise((resolve) => setTimeout(resolve, ms)));
    const ctxId = Number(ctx?.ctxId || 0) || 0;
    const evalJs = (expression) => (typeof evalJsIn === "function" ? evalJsIn(expression, ctxId) : evalJs0?.(expression));
    const publishSel =
      "#container-wrap > div.container-center > div > div > div.main-body-wrap.post-create > div.main-body > div > div.post-edit-wrap.material-edit-wrap > div.form > div.form-btns > div:nth-child(5) > span > div > button";

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
  const nodes = Array.from(document.querySelectorAll("button,[role=button],div,span")).filter(isVisible);
  const hit = nodes.find((n) => textOf(n) === key || textOf(n).includes(key)) || null;
  if (!hit) return { ok: false };
  const btn = hit.closest("button,[role=button],div,span") || hit;
  try { btn.scrollIntoView({ block: "center", inline: "center" }); } catch {}
  try { btn.click(); } catch {}
  return { ok: true };
})()
      `).catch(() => null);
      return r?.ok === true;
    };

    throwIfCancelled();
    step("sp:publish:wait_btn");
    await waitSelector?.(publishSel, 20000, ctxId).catch(() => false);

    throwIfCancelled();
    step("sp:publish:click_btn");
    let clicked = false;
    if (typeof clickSelectorPoint === "function") clicked = !!(await clickSelectorPoint(publishSel, 59, 24));
    if (!clicked) clicked = await clickByText("发表");
    if (!clicked) return { ok: false, message: "publish click failed" };
    await delay(1200);
    return { ok: true, clicked: true };
  }
};
