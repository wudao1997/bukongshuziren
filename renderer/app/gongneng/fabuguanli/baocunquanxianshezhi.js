// 保存权限设置按钮功能：负责把网页发布页的保存权限设置同步为当前规则。
export function chuangjianBaoCunQuanXianSheZhiHandler({ runWebTestAction }) {
  return async function baoCunQuanXianSheZhi(requestId) {
    await runWebTestAction("saveperm", { stages: { video: false, cover: false, fill: true }, fill: { savePermission: true } }, requestId);
  };
}
