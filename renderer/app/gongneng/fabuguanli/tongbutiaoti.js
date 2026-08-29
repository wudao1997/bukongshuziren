// 同步标题按钮功能：负责校验标题并将标题同步到网页发布页。
export function chuangjianTongBuBiaoTiHandler({ titleInput, toast, runWebTestAction }) {
  return async function tongBuBiaoTi(requestId) {
    const title = String(titleInput?.value || "").trim();
    if (!title) {
      toast("请先填写标题。", "warn");
      return;
    }
    await runWebTestAction("title", { stages: { video: false, cover: false, fill: true }, fill: { title: true } }, requestId);
  };
}
