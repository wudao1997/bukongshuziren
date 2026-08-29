// 同步话题按钮功能：负责校验话题内容，并按网页填表规则同步到发布页简介区尾部。
export function chuangjianTongBuHuaTiHandler({ tagsInput, toTagArray, toast, runWebTestAction }) {
  return async function tongBuHuaTi(requestId) {
    const tags = toTagArray(tagsInput?.value || "").slice(0, 5);
    if (!tags.length) {
      toast("请先填写话题/标签。", "warn");
      return;
    }
    await runWebTestAction("tags", { stages: { video: false, cover: false, fill: true }, fill: { tags: true } }, requestId);
  };
}
