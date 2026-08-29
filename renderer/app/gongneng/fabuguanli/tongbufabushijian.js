// 同步发布时间按钮功能：负责校验定时发布时间并同步到网页发布页。
export function chuangjianTongBuFaBuShiJianHandler({ scheduleInput, getPublishTimeMode, toast, runWebTestAction }) {
  return async function tongBuFaBuShiJian(requestId) {
    const scheduleAt = String(scheduleInput?.value || "").trim();
    const mode = String(typeof getPublishTimeMode === "function" ? getPublishTimeMode() : "now");
    if (mode === "schedule" && !scheduleAt) {
      toast("请先设置定时发布时间。", "warn");
      return;
    }
    await runWebTestAction("schedule", { stages: { video: false, cover: false, fill: true }, fill: { schedule: true } }, requestId);
  };
}
