// 同步视频按钮功能：负责校验视频路径并把视频同步到网页发布页。
export function chuangjianTongBuShiPinHandler({ videoInput, toast, runWebTestAction }) {
  return async function tongBuShiPin(requestId) {
    const videoPath = String(videoInput?.value || "").trim();
    if (!videoPath) {
      toast("请先添加视频。", "warn");
      return;
    }
    await runWebTestAction("video", { stages: { video: true, cover: false, fill: false } }, requestId);
  };
}
