// 首页一键导出：负责视频发布模块里的导出目录、导出状态和一键导出交互。
import { getOutputDir, setOutputDir } from "../store.js";

function sanitizePreviewFolderName(name) {
  return String(name || "")
    .trim()
    .replace(/[\\/:*?"<>|]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/[. ]+$/g, "")
    .trim()
    .slice(0, 80);
}

function setReadyPill(el, ready, readyText, pendingText) {
  if (!el) return;
  el.textContent = ready ? readyText : pendingText;
  el.classList.toggle("is-ok", ready);
  el.classList.toggle("is-bad", !ready);
}

export async function mountShouyeYijianDaochu({
  root,
  toast,
  getVideoPath,
  getCoverPath,
  getTitle
} = {}) {
  const exportCard = root?.querySelector(".home-pub-export-card");
  const exportStatus = root?.querySelector("#home-pub-export-status");
  const exportDirEl = root?.querySelector("#home-pub-export-dir");
  const exportFolderNameEl = root?.querySelector("#home-pub-export-folder-name");
  const exportVideoPill = root?.querySelector("#home-pub-export-video-pill");
  const exportCoverPill = root?.querySelector("#home-pub-export-cover-pill");
  const exportTipEl = root?.querySelector("#home-pub-export-tip");
  const exportPickDirBtn = root?.querySelector("#home-pub-export-pick-dir");
  const exportOpenDirBtn = root?.querySelector("#home-pub-export-open-dir");
  const exportBtn = root?.querySelector("#home-pub-export-btn");
  if (!exportCard || !exportStatus || !exportDirEl || !exportFolderNameEl || !exportVideoPill || !exportCoverPill || !exportTipEl || !exportPickDirBtn || !exportOpenDirBtn || !exportBtn) {
    return { refresh() {} };
  }

  let exporting = false;
  let lastExportFolderPath = "";

  const showToast = (message) => {
    if (typeof toast === "function") toast(String(message || "").trim() || "操作已完成。");
  };

  const ensureOutputDirReady = async () => {
    if (String(getOutputDir() || "").trim()) return String(getOutputDir() || "").trim();
    try {
      const res = await window.api?.app?.getWritableDefaultOutputDir?.();
      const directoryPath = String(res?.directoryPath || "").trim();
      if (directoryPath) {
        setOutputDir(directoryPath);
        return directoryPath;
      }
    } catch {}
    return "";
  };

  const refresh = () => {
    const outputDir = String(getOutputDir() || "").trim();
    const videoPath = typeof getVideoPath === "function" ? String(getVideoPath() || "").trim() : "";
    const coverPath = typeof getCoverPath === "function" ? String(getCoverPath() || "").trim() : "";
    const title = typeof getTitle === "function" ? String(getTitle() || "").trim() : "";
    const previewFolderName = sanitizePreviewFolderName(title) || "将使用视频生成时间";
    const ready = !!outputDir && !!videoPath && !!coverPath && !exporting;
    const missingReasons = [];
    if (!videoPath) missingReasons.push("请先生成成片");
    if (!coverPath) missingReasons.push("请先生成封面");
    if (!outputDir) missingReasons.push("请先设置导出目录");

    exportDirEl.textContent = outputDir || "未设置导出目录";
    exportDirEl.title = outputDir || "";
    exportFolderNameEl.textContent = previewFolderName;
    exportFolderNameEl.title = previewFolderName;
    exportFolderNameEl.classList.toggle("is-placeholder", !title);
    setReadyPill(exportVideoPill, !!videoPath, "成片已就绪", "成片未就绪");
    setReadyPill(exportCoverPill, !!coverPath, "封面已就绪", "封面未就绪");
    exportCard.classList.toggle("is-ready", ready);
    exportCard.classList.toggle("is-exporting", exporting);
    exportCard.classList.toggle("is-exported", !exporting && !!lastExportFolderPath);

    if (exporting) {
      exportStatus.textContent = "导出中...";
      exportStatus.classList.remove("is-ok", "is-bad");
    } else if (lastExportFolderPath) {
      exportStatus.textContent = "已导出";
      exportStatus.classList.add("is-ok");
      exportStatus.classList.remove("is-bad");
    } else if (ready) {
      exportStatus.textContent = "可导出";
      exportStatus.classList.add("is-ok");
      exportStatus.classList.remove("is-bad");
    } else {
      exportStatus.textContent = "待准备";
      exportStatus.classList.remove("is-ok");
      exportStatus.classList.add("is-bad");
    }

    exportBtn.disabled = !ready;
    exportBtn.textContent = exporting ? "正在导出..." : lastExportFolderPath ? "重新导出" : "一键导出";
    exportPickDirBtn.disabled = exporting;
    exportOpenDirBtn.disabled = exporting || !(lastExportFolderPath || outputDir);
    exportOpenDirBtn.textContent = lastExportFolderPath ? "打开导出结果" : "打开目录";
    if (exporting) {
      exportTipEl.textContent = "正在整理成片和封面，请稍候，完成后会自动打开导出结果。";
    } else if (lastExportFolderPath) {
      exportTipEl.textContent = `最近一次已导出到 ${previewFolderName}，可直接打开结果或再次导出。`;
    } else if (missingReasons.length) {
      exportTipEl.textContent = missingReasons.join("，");
    } else if (!title) {
      exportTipEl.textContent = "当前未填写标题，导出时会自动使用视频生成时间作为文件夹名。";
    } else {
      exportTipEl.textContent = "素材已就绪，可以直接导出成片和封面。";
    }
  };

  await ensureOutputDirReady();
  refresh();

  exportPickDirBtn.addEventListener("click", async () => {
    if (exporting) return;
    const res = await window.api?.openDirectory?.();
    if (!res || res.canceled) return;
    const directoryPath = String(res?.directoryPath || "").trim();
    if (!directoryPath) return;
    setOutputDir(directoryPath);
    lastExportFolderPath = "";
    try {
      window.dispatchEvent(new CustomEvent("ipfactory:outputDirChanged"));
    } catch {}
    refresh();
    showToast("已设置导出目录。");
  });

  exportOpenDirBtn.addEventListener("click", async () => {
    const revealPath = String(lastExportFolderPath || getOutputDir() || "").trim();
    if (!revealPath) {
      showToast("请先设置导出目录。");
      return;
    }
    const res = await window.api?.shell?.reveal?.({ path: revealPath });
    if (res?.ok !== false) return;
    showToast(String(res?.message || "打开目录失败。"));
  });

  exportBtn.addEventListener("click", async () => {
    if (exporting) return;
    const outputDir = String(getOutputDir() || "").trim() || (await ensureOutputDirReady());
    const videoPath = typeof getVideoPath === "function" ? String(getVideoPath() || "").trim() : "";
    const coverPath = typeof getCoverPath === "function" ? String(getCoverPath() || "").trim() : "";
    const title = typeof getTitle === "function" ? String(getTitle() || "").trim() : "";

    if (!videoPath) {
      showToast("请先在“字幕和音乐”模块合成成片。");
      refresh();
      return;
    }
    if (!coverPath) {
      showToast("请先在“封面制作”模块生成封面。");
      refresh();
      return;
    }
    if (!outputDir) {
      showToast("请先设置导出目录。");
      refresh();
      return;
    }

    exporting = true;
    refresh();
    try {
      const res = await window.api?.homeExport?.exportBundle?.({
        outputDir,
        videoPath,
        coverPath,
        title
      });
      if (!res?.ok) {
        showToast(String(res?.message || "一键导出失败。"));
        return;
      }
      lastExportFolderPath = String(res?.folderPath || "").trim();
      refresh();
      showToast(`已导出到 ${String(res?.folderName || "新建文件夹")}。`);
      if (lastExportFolderPath) {
        await window.api?.shell?.reveal?.({ path: lastExportFolderPath });
      }
    } catch (error) {
      showToast(String(error?.message || "一键导出失败。"));
    } finally {
      exporting = false;
      refresh();
    }
  });

  window.addEventListener("ipfactory:outputDirChanged", refresh);
  window.addEventListener("ipfactory:homeExportRefresh", refresh);
  root.addEventListener("input", (event) => {
    const id = String(event?.target?.id || "").trim();
    if (id === "home-pub-title" || id === "meta-title") refresh();
  });

  return {
    refresh
  };
}
