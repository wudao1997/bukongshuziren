import { elFromHTML, pageHeader } from "../ui.js";

export const route = {
  path: "/avatar-synthesis",
  title: "数字人合成",
  async render() {
    const root = elFromHTML(`
      <div>
        ${pageHeader({
          title: "数字人合成",
          subtitle: "选择形象 + 选择音色/音频，配置口型与对齐参数，生成成片或中间结果",
          actionsHTML: `
            <button class="btn btn-primary" id="btn-run">开始生成视频</button>
            <button class="btn" id="btn-to-video">去视频生产</button>
          `
        })}

        <div class="grid">
          <div class="card">
            <div class="card-title"><h3>数字人配置</h3><span class="pill">形象/模型</span></div>
            <div class="grid cols-3">
              <div class="field">
                <div class="label">选择模型</div>
                <select id="model">
                  <option selected>通用模型（占位）</option>
                  <option>高精模型（占位）</option>
                </select>
              </div>
              <div class="field">
                <div class="label">选择形象</div>
                <select id="avatar">
                  <option selected>暂无形象（先去数字人形象添加）</option>
                </select>
              </div>
              <div class="field">
                <div class="label">输出比例</div>
                <select id="ratio">
                  <option value="9:16" selected>9:16（竖屏）</option>
                  <option value="16:9">16:9（横屏）</option>
                  <option value="1:1">1:1</option>
                </select>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-title"><h3>声音配置</h3><span class="pill">音色/音频</span></div>
            <div class="grid cols-3">
              <div class="field">
                <div class="label">输入方式</div>
                <select id="voiceMode">
                  <option value="clone" selected>选择音色（占位）</option>
                  <option value="file">本地音频文件</option>
                </select>
              </div>
              <div class="field">
                <div class="label">选择音色</div>
                <select id="voice">
                  <option selected>示例音色A（占位）</option>
                </select>
              </div>
              <div class="field">
                <div class="label">本地音频</div>
                <div class="card-actions">
                  <button class="btn" id="btn-pick">选择音频</button>
                  <span class="pill mono" id="file">未选择</span>
                </div>
              </div>
            </div>

            <div class="grid cols-3" style="margin-top: 10px">
              <div class="field">
                <div class="label">语速</div>
                <select id="speed">
                  <option value="0.9">慢</option>
                  <option value="1.0" selected>标准</option>
                  <option value="1.1">快</option>
                </select>
              </div>
              <div class="field">
                <div class="label">情绪</div>
                <select id="emotion">
                  <option selected>自然</option>
                  <option>兴奋</option>
                  <option>严肃</option>
                  <option>温柔</option>
                </select>
              </div>
              <div class="field">
                <div class="label">口型增强</div>
                <select id="lip">
                  <option value="on" selected>开启（推荐）</option>
                  <option value="off">关闭</option>
                </select>
              </div>
            </div>
          </div>

          <div class="grid cols-2">
            <div class="card">
              <div class="card-title"><h3>生成记录</h3><span class="pill">占位</span></div>
              <div class="empty">暂无记录（生成后在此展示状态/耗时/下载）。</div>
            </div>
            <div class="card">
              <div class="card-title"><h3>提示</h3><span class="pill">失败可重试</span></div>
              <div class="hint">
                建议流程：爆款文案 → 分镜与脚本 → 数字人合成 → 视频生产（字幕/BGM/封面） → 发布。<br />
                合成与发布属于异步任务，统一进入任务中心查看。
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

    const fileEl = root.querySelector("#file");
    root.querySelector("#btn-pick").addEventListener("click", async () => {
      const res = await window.api?.openFile?.();
      if (!res || res.canceled) return;
      const fp = res.filePaths?.[0];
      fileEl.textContent = fp ? fp : "未选择";
      fileEl.title = fp || "";
    });

    root.querySelector("#btn-run").addEventListener("click", () => {
      toast("已创建数字人合成任务（占位）。");
      window.location.hash = "#/tasks";
    });
    root.querySelector("#btn-to-video").addEventListener("click", () => (window.location.hash = "#/video"));

    return root;
  }
};

