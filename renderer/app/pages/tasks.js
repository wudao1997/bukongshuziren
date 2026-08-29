import { elFromHTML, pageHeader } from "../ui.js";

export const route = {
  path: "/tasks",
  title: "任务中心",
  async render() {
    const root = elFromHTML(`
      <div>
        ${pageHeader({
          title: "任务中心",
          subtitle: "所有采集/解析/合成/导出/发布任务统一在这里排队、重试与追踪日志",
          actionsHTML: `
            <button class="btn" id="btn-clear">清空已完成</button>
            <button class="btn btn-primary" id="btn-new">新建任务</button>
          `
        })}

        <div class="grid cols-2">
          <div class="card">
            <div class="card-title"><h3>任务列表</h3><span class="pill">占位</span></div>
            <table class="table">
              <thead><tr><th>类型</th><th>状态</th><th>创建时间</th><th style="width: 180px">操作</th></tr></thead>
              <tbody>
                <tr>
                  <td>示例：内容解析</td>
                  <td><span class="pill">排队中</span></td>
                  <td class="mono">2026-05-28 10:00</td>
                  <td>
                    <button class="btn" data-act="detail">详情</button>
                    <button class="btn" data-act="retry">重试</button>
                    <button class="btn" data-act="cancel">取消</button>
                  </td>
                </tr>
                <tr><td colspan="4"><div class="empty">接入后展示真实任务队列与日志。</div></td></tr>
              </tbody>
            </table>
          </div>

          <div class="card">
            <div class="card-title"><h3>任务详情</h3><span class="pill">日志/参数</span></div>
            <div class="form">
              <div class="field">
                <div class="label">输入</div>
                <textarea class="mono" readonly>（占位）</textarea>
              </div>
              <div class="field">
                <div class="label">参数</div>
                <textarea class="mono" readonly>（占位）</textarea>
              </div>
              <div class="field">
                <div class="label">日志</div>
                <textarea class="mono" readonly>（占位）</textarea>
              </div>
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

    root.querySelector("#btn-clear").addEventListener("click", () => toast("清空已完成（占位）。"));
    root.querySelector("#btn-new").addEventListener("click", () => toast("新建任务（占位）。"));

    root.querySelectorAll("button[data-act]").forEach((btn) => {
      btn.addEventListener("click", () => toast(`${btn.getAttribute("data-act")}（占位）。`));
    });

    return root;
  }
};

