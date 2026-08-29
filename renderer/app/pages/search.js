import { elFromHTML, pageHeader } from "../ui.js";

export const route = {
  path: "/search",
  title: "搜索",
  cache: false,
  async render(ctx) {
    const q = ctx.query?.get("q") || "";
    const root = elFromHTML(`
      <div>
        ${pageHeader({
          title: "全局搜索",
          subtitle: q ? `关键词：${q}` : "输入关键词后回车搜索",
          actionsHTML: `<button class="btn" id="btn-back">返回首页</button>`
        })}
        <div class="card">
          <div class="card-title"><h3>结果</h3><span class="pill">占位</span></div>
          <div class="empty">后续接入：账号/作品/模板/任务的统一索引。</div>
        </div>
      </div>
    `);

    root.querySelector("#btn-back").addEventListener("click", () => {
      window.location.hash = "#/home";
    });

    return root;
  }
};
