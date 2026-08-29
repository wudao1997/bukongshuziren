import { elFromHTML, pageHeader } from "../ui.js";

export const route = {
  path: "/storyboard",
  title: "分镜与脚本",
  async render() {
    const root = elFromHTML(`
      <div>
        ${pageHeader({
          title: "分镜与脚本",
          subtitle: "把文案拆成镜头清单，配置字幕与BGM，直接进入数字人合成",
          actionsHTML: `
            <button class="btn btn-primary" id="btn-build">生成合成任务</button>
            <button class="btn" id="btn-to-avatar">去数字人合成</button>
          `
        })}

        <div class="grid cols-2">
          <div class="card">
            <div class="card-title"><h3>镜头时间轴</h3><span class="pill">可编辑</span></div>
            <table class="table">
              <thead><tr><th style="width: 70px">序号</th><th style="width: 130px">时长</th><th>画面/动作</th><th>台词</th></tr></thead>
              <tbody id="shots">
                <tr>
                  <td class="mono">1</td>
                  <td><input type="text" value="3s" /></td>
                  <td><input type="text" value="近景开场，抛问题" /></td>
                  <td><input type="text" value="你是不是也遇到过……" /></td>
                </tr>
                <tr>
                  <td class="mono">2</td>
                  <td><input type="text" value="9s" /></td>
                  <td><input type="text" value="举例+反差" /></td>
                  <td><input type="text" value="很多人以为……其实……" /></td>
                </tr>
                <tr>
                  <td class="mono">3</td>
                  <td><input type="text" value="12s" /></td>
                  <td><input type="text" value="给方法+证据" /></td>
                  <td><input type="text" value="记住三步：第一……" /></td>
                </tr>
              </tbody>
            </table>
            <div class="card-actions" style="margin-top: 10px">
              <button class="btn" id="btn-add">新增镜头</button>
              <button class="btn" id="btn-export">导出分镜</button>
            </div>
          </div>

          <div class="grid" style="gap: 12px">
            <div class="card">
              <div class="card-title"><h3>字幕策略</h3><span class="pill">样式库</span></div>
              <div class="form">
                <div class="field">
                  <div class="label">字幕模式</div>
                  <select>
                    <option selected>逐句</option>
                    <option>逐字</option>
                  </select>
                </div>
                <div class="field">
                  <div class="label">高亮关键词</div>
                  <input type="text" placeholder="例如：别再、关键、立刻、3步" />
                </div>
                <div class="field">
                  <div class="label">安全区预设</div>
                  <select>
                    <option selected>抖音 9:16</option>
                    <option>小红书 3:4</option>
                    <option>视频号 9:16</option>
                  </select>
                </div>
              </div>
            </div>

            <div class="card">
              <div class="card-title"><h3>音乐与音效</h3><span class="pill">自动匹配</span></div>
              <div class="form">
                <div class="field">
                  <div class="label">BGM</div>
                  <select>
                    <option selected>自动匹配（推荐）</option>
                    <option>从素材库选择</option>
                  </select>
                </div>
                <div class="field">
                  <div class="label">混音</div>
                  <select>
                    <option selected>人声优先</option>
                    <option>均衡</option>
                    <option>BGM优先</option>
                  </select>
                </div>
                <div class="card-actions">
                  <button class="btn" id="btn-preview">试听</button>
                  <button class="btn" id="btn-to-assets">打开素材库</button>
                </div>
              </div>
            </div>

            <div class="card">
              <div class="card-title"><h3>输出</h3><span class="pill">占位</span></div>
              <div class="empty">导出将生成“合成任务”，在任务中心查看进度。</div>
            </div>
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

    root.querySelector("#btn-add").addEventListener("click", () => {
      const tbody = root.querySelector("#shots");
      const idx = tbody.children.length + 1;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="mono">${idx}</td>
        <td><input type="text" value="6s" /></td>
        <td><input type="text" value="补充镜头描述" /></td>
        <td><input type="text" value="补充台词" /></td>
      `;
      tbody.appendChild(tr);
      toast("已新增镜头（本地）。");
    });
    root.querySelector("#btn-export").addEventListener("click", () => toast("已导出分镜（占位）。"));
    root.querySelector("#btn-preview").addEventListener("click", () => toast("试听（占位）。"));
    root.querySelector("#btn-to-assets").addEventListener("click", () => (window.location.hash = "#/assets"));
    root.querySelector("#btn-build").addEventListener("click", () => {
      toast("已创建合成任务（占位）。");
      window.location.hash = "#/tasks";
    });
    root.querySelector("#btn-to-avatar").addEventListener("click", () => (window.location.hash = "#/avatar-synthesis"));

    return root;
  }
};

