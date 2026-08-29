import { elFromHTML, pageHeader } from "../ui.js";

export const route = {
  path: "/assets",
  title: "素材库",
  async render() {
    const root = elFromHTML(`
      <div>
        ${pageHeader({
          title: "素材库",
          subtitle: "统一管理视频/图片/音频/字幕样式/封面模板，支持标签与检索",
          actionsHTML: `
            <button class="btn" id="btn-refresh">刷新</button>
            <button class="btn btn-primary" id="btn-upload">上传素材</button>
          `
        })}

        <div class="grid cols-2">
          <div class="card">
            <div class="card-title"><h3>筛选</h3><span class="pill">标签/类型</span></div>
            <div class="form">
              <div class="field">
                <div class="label">类型</div>
                <select id="type">
                  <option value="video" selected>视频</option>
                  <option value="image">图片</option>
                  <option value="audio">音频</option>
                  <option value="subtitle">字幕样式</option>
                  <option value="cover">封面模板</option>
                </select>
              </div>
              <div class="field">
                <div class="label">标签</div>
                <input id="tags" type="text" placeholder="例如：口播、情绪、科技感..." />
              </div>
              <div class="field">
                <div class="label">搜索</div>
                <input id="q" type="text" placeholder="按名称/备注搜索" />
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-title"><h3>素材列表</h3><span class="pill">占位</span></div>
            <div class="empty">暂无素材（上传后展示缩略图/时长/尺寸/标签）。</div>
          </div>
        </div>
      </div>
    `);

    const toast = (msg) => {
      const el = document.createElement("div");
      el.className = "pill";
      el.style.position = "fixed";
      el.style.right = "16px";
      el.style.bottom = "16px";
      el.style.zIndex = "9999";
      el.textContent = msg;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 1600);
    };

    root.querySelector("#btn-refresh").addEventListener("click", () => toast("刷新完成（占位）。"));
    root.querySelector("#btn-upload").addEventListener("click", async () => {
      const res = await window.api?.openFile?.();
      if (!res || res.canceled) return;
      toast(`已选择：${res.filePaths?.[0] || ""}`);
    });

    return root;
  }
};

