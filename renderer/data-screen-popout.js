import { getTheme } from "./app/store.js";
import { route as dataScreenRoute } from "./app/pages/dashujudaping.js";

function applyTheme() {
  document.documentElement.dataset.theme = getTheme();
}

function readRouteQuery() {
  const raw = String(window.location.hash || "").replace(/^#/, "").trim();
  const [, queryPart] = raw.split("?");
  return new URLSearchParams(queryPart || "");
}

async function mountDataScreen() {
  const root = document.getElementById("app");
  if (!root) throw new Error("Missing #app");
  const view = await dataScreenRoute.render({
    path: dataScreenRoute.path,
    query: readRouteQuery(),
    routes: [dataScreenRoute]
  });
  root.innerHTML = "";
  root.appendChild(view);
  document.title = `${dataScreenRoute.title} - IP工厂智能体`;
}

applyTheme();
window.addEventListener("storage", (event) => {
  if (String(event?.key || "") === "ipfactory.theme") applyTheme();
});

mountDataScreen().catch((error) => {
  const root = document.getElementById("app");
  if (!root) return;
  root.innerHTML = `
    <div style="height:100vh;display:grid;place-items:center;padding:24px;background:#07111f;color:#e6f0ff;">
      <div style="max-width:560px;padding:24px 26px;border-radius:20px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.04);box-shadow:0 18px 48px rgba(0,0,0,.22);">
        <div style="font-size:22px;font-weight:900;">数据大屏加载失败</div>
        <div style="margin-top:10px;font-size:13px;line-height:1.8;color:rgba(230,240,255,.76);">${String(error?.message || error || "未知错误")}</div>
      </div>
    </div>
  `;
});
