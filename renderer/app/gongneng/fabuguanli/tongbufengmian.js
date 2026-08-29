// 同步封面按钮功能：负责校验封面路径并把封面同步到网页发布页。
export function chuangjianTongBuFengMianHandler({ getCoverPath, toast, runWebTestAction }) {
  return async function tongBuFengMian(requestId) {
    const p = String(typeof getCoverPath === "function" ? getCoverPath() : "").trim();
    if (!p) {
      toast("请先设置封面。", "warn");
      return;
    }
    await runWebTestAction("cover", { stages: { video: false, cover: true, fill: false } }, requestId);
  };
}
