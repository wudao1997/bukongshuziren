// 打开Chrome发布页按钮功能：负责打开 Chrome 发布页并建立网页自动化会话。
export function chuangjianDakaiChromeFabuyeHandler({ runWebTestAction }) {
  return async function dakaiChromeFabuye(requestId) {
    await runWebTestAction("open", { stages: { video: false, cover: false, fill: false }, browserPreference: "chrome" }, requestId);
  };
}
