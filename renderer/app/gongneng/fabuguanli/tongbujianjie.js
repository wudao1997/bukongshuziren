// 同步简介按钮功能：负责校验简介并按当前网页填表规则同步“空格+简介+空格”到发布页简介区。
export function chuangjianTongBuJianJieHandler({ descInput, toast, runWebTestAction }) {
  return async function tongBuJianJie(requestId) {
    const desc = String(descInput?.value || "").trim();
    if (!desc) {
      toast("请先填写简介。", "warn");
      return;
    }
    await runWebTestAction("desc", { stages: { video: false, cover: false, fill: true }, fill: { desc: true } }, requestId);
  };
}
