import { elFromHTML, pageHeader } from "../ui.js";

export const route = {
  path: "/analytics",
  title: "数据复盘",
  async render() {
    const root = elFromHTML(`
      <div>
        ${pageHeader({
          title: "数据复盘",
          subtitle: "播放/完播/互动/转化归因到模板与参数（本页先做骨架）",
          actionsHTML: `
            <button class="btn" id="btn-sync">同步数据</button>
            <button class="btn btn-primary" id="btn-export">导出报表</button>
          `
        })}

        <div class="grid cols-3">
          <div class="card">
            <div class="card-title"><h3>核心指标</h3><span class="pill">近7天</span></div>
            <table class="table">
              <thead><tr><th>指标</th><th>值</th></tr></thead>
              <tbody>
                <tr><td>播放</td><td class="mono">0</td></tr>
                <tr><td>完播率</td><td class="mono">0%</td></tr>
                <tr><td>互动率</td><td class="mono">0%</td></tr>
                <tr><td>转化</td><td class="mono">0</td></tr>
              </tbody>
            </table>
          </div>

          <div class="card" style="grid-column: span 2">
            <div class="card-title"><h3>作品表现</h3><span class="pill">占位</span></div>
            <div class="empty">接入平台数据后展示：作品列表 + 指标曲线 + 模板归因。</div>
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

    root.querySelector("#btn-sync").addEventListener("click", () => toast("同步数据（占位）。"));
    root.querySelector("#btn-export").addEventListener("click", () => toast("导出报表（占位）。"));

    return root;
  }
};

