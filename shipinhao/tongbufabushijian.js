"use strict";

// 视频号发布页：同步发布时间
// 作用：
// 1. 立即发布时切换到“不定时”
// 2. 定时发布时切换到“定时”并写入发表时间

module.exports = {
  async run(ctx) {
    const step = ctx?.step || (() => {});
    const throwIfCancelled = ctx?.throwIfCancelled || (() => {});
    const waitSelector = ctx?.waitSelector;
    const clickSelectorPoint = ctx?.clickSelectorPoint;
    const evalJs0 = ctx?.evalJs0;
    const evalJsIn = ctx?.evalJsIn;
    const delay = ctx?.delay || (async (ms) => new Promise((resolve) => setTimeout(resolve, ms)));
    const mode = String(ctx?.data?.publishTimeMode || "").trim();
    const scheduleAtRaw = String(ctx?.data?.scheduleAt || "").trim();
    const ctxId = Number(ctx?.ctxId || 0) || 0;
    const evalJs = (expression) => (typeof evalJsIn === "function" ? evalJsIn(expression, ctxId) : evalJs0?.(expression));

    const nowSel =
      "#container-wrap > div.container-center > div > div > div.main-body-wrap.post-create > div.main-body > div > div.post-edit-wrap.material-edit-wrap > div.form > div.post-time-wrap > div > div.form-item-body > div > label:nth-child(1) > span";
    const scheduleSel =
      "#container-wrap > div.container-center > div > div > div.main-body-wrap.post-create > div.main-body > div > div.post-edit-wrap.material-edit-wrap > div.form > div.post-time-wrap > div:nth-child(1) > div.form-item-body > div > label:nth-child(2)";
    const timeInputSel =
      "#container-wrap > div.container-center > div > div > div.main-body-wrap.post-create > div.main-body > div > div.post-edit-wrap.material-edit-wrap > div.form > div.post-time-wrap > div:nth-child(2) > div.form-item-body > dl > dt > span.weui-desktop-picker__value > div > span > input";

    const scheduleAt = (() => {
      if (!scheduleAtRaw) return "";
      if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}$/.test(scheduleAtRaw)) return scheduleAtRaw;
      if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}$/.test(scheduleAtRaw)) return scheduleAtRaw.slice(0, 16);
      return scheduleAtRaw;
    })();

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
  const nodes = Array.from(document.querySelectorAll("label,button,span,div,input")).filter(isVisible);
  const hit = nodes.find((n) => textOf(n).includes(key)) || null;
  if (!hit) return { ok: false };
  const btn = hit.closest("label,button,span,div") || hit;
  try { btn.scrollIntoView({ block: "center", inline: "center" }); } catch {}
  try { btn.click(); } catch {}
  return { ok: true };
})()
      `).catch(() => null);
      return r?.ok === true;
    };

    if (mode !== "schedule") {
      throwIfCancelled();
      step("sp:schedule:switch_now");
      await waitSelector?.(nowSel, 12000, ctxId).catch(() => false);
      let ok = false;
      if (typeof clickSelectorPoint === "function") ok = !!(await clickSelectorPoint(nowSel, 22, 8));
      if (!ok) ok = await clickByText("不定时");
      if (!ok) return { ok: false, message: "切换不定时失败" };
      await delay(300);
      return { ok: true, mode: "now", immediate: true };
    }

    if (!scheduleAt) return { ok: false, message: "empty scheduleAt" };

    throwIfCancelled();
    step("sp:schedule:switch_schedule");
    await waitSelector?.(scheduleSel, 12000, ctxId).catch(() => false);
    let clickSchedule = false;
    if (typeof clickSelectorPoint === "function") clickSchedule = !!(await clickSelectorPoint(scheduleSel, 18, 12));
    if (!clickSchedule) clickSchedule = await clickByText("定时");
    if (!clickSchedule) return { ok: false, message: "切换定时失败" };
    await delay(400);

    throwIfCancelled();
    step("sp:schedule:set_time");
    await waitSelector?.(timeInputSel, 12000, ctxId).catch(() => false);
    const setRes = await evalJs(`
(() => {
  const targetVal = ${JSON.stringify(scheduleAt)};
  const input = document.querySelector(${JSON.stringify(timeInputSel)}) || document.querySelector("input.weui-desktop-form__input");
  if (!input) return { ok: false, message: "no time input" };
  try { input.scrollIntoView({ block: "center", inline: "center" }); } catch {}
  try { input.click(); } catch {}
  try { input.focus(); } catch {}
  const desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  if (desc?.set) desc.set.call(input, targetVal);
  else input.value = targetVal;
  try { input.setAttribute("value", targetVal); } catch {}
  try { input.removeAttribute("readonly"); } catch {}
  try { input.dispatchEvent(new Event("input", { bubbles: true, cancelable: true })); } catch {}
  try { input.dispatchEvent(new Event("change", { bubbles: true, cancelable: true })); } catch {}
  try { input.blur(); } catch {}
  return { ok: String(input.value || "") === targetVal, value: String(input.value || "") };
})()
    `).catch(() => null);
    if (!setRes?.ok) return { ok: false, message: String(setRes?.message || "set publish time failed"), result: setRes || null };
    await delay(300);
    return { ok: true, mode: "schedule", scheduleAt, value: String(setRes?.value || "") };
  }
};
