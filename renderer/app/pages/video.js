import { elFromHTML, pageHeader } from "../ui.js";

export const route = {
  path: "/video",
  title: "视频生产",
  async render() {
    const root = elFromHTML(`
      <div>
        ${pageHeader({
          title: "视频生产",
          subtitle: "封面/字幕/BGM/发布准备模块化拼装（对标同行的卡片折叠布局）",
          actionsHTML: `
            <button class="btn btn-primary" id="btn-export">导出成片</button>
            <button class="btn" id="btn-to-publish">去发布管理</button>
          `
        })}

        <div class="grid cols-3">
          <div class="card">
            <div class="card-title"><h3>封面制作</h3><span class="pill">模板</span></div>
            <div class="form">
              <div class="field">
                <div class="label">封面模板</div>
                <select>
                  <option selected>自动（占位）</option>
                  <option>模板A（占位）</option>
                  <option>模板B（占位）</option>
                </select>
              </div>
              <div class="field">
                <div class="label">封面标题</div>
                <input type="text" placeholder="例如：别再踩坑了！" />
              </div>
              <div class="card-actions">
                <button class="btn" id="btn-cover">生成封面</button>
                <button class="btn" id="btn-cover-preview">预览</button>
              </div>
              <div class="empty" style="margin-top: 10px">封面预览（占位）</div>
            </div>
          </div>

          <div class="card">
            <div class="card-title"><h3>字幕与音乐</h3><span class="pill">自动化</span></div>
            <div class="form">
              <div class="field">
                <div class="label">字幕</div>
                <select>
                  <option selected>自动生成字幕（占位）</option>
                  <option>导入字幕文件（占位）</option>
                </select>
              </div>
              <div class="field">
                <div class="label">字幕样式</div>
                <select>
                  <option selected>默认样式（占位）</option>
                  <option>高亮关键词（占位）</option>
                </select>
              </div>
              <div class="field">
                <div class="label">BGM</div>
                <select>
                  <option selected>自动匹配（占位）</option>
                  <option>从素材库选择</option>
                </select>
              </div>
              <div class="card-actions">
                <button class="btn" id="btn-listen">试听</button>
                <button class="btn" id="btn-bgm">生成BGM方案</button>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-title"><h3>视频发布准备</h3><span class="pill">多平台</span></div>
            <div class="form">
              <div class="field">
                <div class="label">平台</div>
                <select>
                  <option selected>抖音</option>
                  <option>快手</option>
                  <option>小红书</option>
                  <option>视频号</option>
                </select>
              </div>
              <div class="field">
                <div class="label">标题/话题</div>
                <textarea placeholder="#话题  标题文案（占位）"></textarea>
              </div>
              <div class="card-actions">
                <button class="btn btn-primary" id="btn-ready">生成发布稿</button>
                <button class="btn" id="btn-check">合规自检</button>
              </div>
            </div>
          </div>
        </div>

        <div class="card" style="margin-top: 12px">
          <div class="card-title"><h3>预览区</h3><span class="pill">实时预览（占位）</span></div>
          <div class="empty">这里将展示：封面 + 字幕 + BGM 叠加后的最终效果（待接入渲染/播放器）。</div>
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

    root.querySelector("#btn-export").addEventListener("click", () => {
      toast("已创建导出任务（占位）。");
      window.location.hash = "#/tasks";
    });
    root.querySelector("#btn-to-publish").addEventListener("click", () => (window.location.hash = "#/publish"));
    root.querySelector("#btn-cover").addEventListener("click", () => toast("封面已生成（占位）。"));
    root.querySelector("#btn-cover-preview").addEventListener("click", () => toast("预览（占位）。"));
    root.querySelector("#btn-listen").addEventListener("click", () => toast("试听（占位）。"));
    root.querySelector("#btn-bgm").addEventListener("click", () => toast("BGM方案已生成（占位）。"));
    root.querySelector("#btn-ready").addEventListener("click", () => toast("发布稿已生成（占位）。"));
    root.querySelector("#btn-check").addEventListener("click", () => toast("合规自检（占位）。"));

    return root;
  }
};

