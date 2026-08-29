import { elFromHTML, pageHeader } from "../ui.js";

export const route = {
  path: "/parse",
  title: "内容解析",
  async render() {
    const root = elFromHTML(`
      <div>
        ${pageHeader({
          title: "内容解析",
          subtitle: "链接/本地视频导入，解析为可复用脚本结构与镜头时间轴",
          actionsHTML: `
            <button class="btn btn-primary" id="btn-run">开始解析</button>
            <button class="btn" id="btn-to-copy">去生成爆款文案</button>
          `
        })}

        <div class="split">
          <div class="grid" style="gap: 12px">
            <div class="card">
              <div class="card-title"><h3>输入</h3><span class="pill">三选一</span></div>
              <div class="form">
                <div class="field">
                  <div class="label">作品链接</div>
                  <input id="url" type="url" placeholder="粘贴抖音/快手/小红书链接..." />
                </div>
                <div class="field">
                  <div class="label">本地视频</div>
                  <div class="card-actions">
                    <button class="btn" id="btn-pick">选择视频文件</button>
                    <span class="pill mono" id="file">未选择</span>
                  </div>
                </div>
                <div class="field">
                  <div class="label">解析策略</div>
                  <select id="mode">
                    <option value="fast">快速（适合批量）</option>
                    <option value="pro" selected>精细（镜头+情绪+爆点）</option>
                  </select>
                </div>
              </div>
            </div>

            <div class="card">
              <div class="card-title"><h3>解析结果（预览）</h3><span class="pill">结构化</span></div>
              <div class="grid cols-2">
                <div class="field">
                  <div class="label">钩子 / 冲突</div>
                  <textarea id="hook" placeholder="解析后自动填充..."></textarea>
                </div>
                <div class="field">
                  <div class="label">解决方案 / 卖点</div>
                  <textarea id="value" placeholder="解析后自动填充..."></textarea>
                </div>
              </div>
              <div class="field" style="margin-top: 10px">
                <div class="label">镜头时间轴（示例）</div>
                <table class="table">
                  <thead><tr><th style="width: 90px">时码</th><th>画面/动作</th><th>台词</th></tr></thead>
                  <tbody>
                    <tr><td class="mono">00:00-00:03</td><td>近景开场，抛问题</td><td>你是不是也遇到过……</td></tr>
                    <tr><td class="mono">00:03-00:12</td><td>举例+反差</td><td>很多人以为……其实……</td></tr>
                    <tr><td class="mono">00:12-00:24</td><td>给方法</td><td>记住三步：第一……</td></tr>
                  </tbody>
                </table>
                <div class="hint">这块接入后会从视频转写/识别生成，可编辑并导出到分镜。</div>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-title"><h3>导出与下一步</h3><span class="pill">闭环</span></div>
            <div class="form">
              <div class="field">
                <div class="label">导出为模板</div>
                <input id="tplName" type="text" placeholder="模板名称（可空）" />
                <div class="hint">导出后可在“爆款文案/分镜”复用（占位）。</div>
              </div>
              <div class="field">
                <div class="label">合规检查</div>
                <select id="compliance">
                  <option value="on" selected>开启（推荐）</option>
                  <option value="off">关闭</option>
                </select>
              </div>
              <div class="card-actions">
                <button class="btn btn-primary" id="btn-export">保存到选题池</button>
                <button class="btn" id="btn-next">去分镜与脚本</button>
              </div>
              <div class="empty" style="margin-top: 10px">解析任务会进入“任务中心”，失败可重试。</div>
            </div>
          </div>
        </div>
      </div>
    `);

    const fileEl = root.querySelector("#file");
    root.querySelector("#btn-pick").addEventListener("click", async () => {
      const res = await window.api?.openFile?.();
      if (!res || res.canceled) return;
      const fp = res.filePaths?.[0];
      fileEl.textContent = fp ? fp : "未选择";
      fileEl.title = fp || "";
    });

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

    root.querySelector("#btn-run").addEventListener("click", () => {
      toast("已创建解析任务（占位）。");
      window.location.hash = "#/tasks";
    });
    root.querySelector("#btn-export").addEventListener("click", () => toast("已保存到选题池（占位）。"));
    root.querySelector("#btn-next").addEventListener("click", () => (window.location.hash = "#/storyboard"));
    root.querySelector("#btn-to-copy").addEventListener("click", () => (window.location.hash = "#/copywriting"));

    return root;
  }
};

