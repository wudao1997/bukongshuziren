// 打开Edge发布页按钮功能：负责打开 Edge 发布页并建立网页自动化会话。
export function chuangjianDakaiEdgeFabuyeHandler({ runWebTestAction }) {
  return async function dakaiEdgeFabuye(requestId) {
    await runWebTestAction("open", { stages: { video: false, cover: false, fill: false }, browserPreference: "edge" }, requestId);
  };
}
