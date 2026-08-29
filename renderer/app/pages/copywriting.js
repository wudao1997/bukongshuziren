import { elFromHTML, pageHeader } from "../ui.js";

export const route = {
  path: "/copywriting",
  title: "爆款文案",
  async render() {
    const root = elFromHTML(`
      <div>
        ${pageHeader({
          title: "爆款文案",
          subtitle: "选题约束 → 标题 → 脚本 → 改写优化，支持批量与模板复用",
          actionsHTML: `
            <button class="btn btn-primary" id="btn-generate">一键生成</button>
            <button class="btn" id="btn-to-story">去分镜与脚本</button>
          `
        })}

        <div class="grid cols-4">
          <div class="card">
            <div class="card-title"><h3>选题与约束</h3><span class="pill">参数化</span></div>
            <div class="form">
              <div class="field">
                <div class="label">平台</div>
                <select id="platform">
                  <option>抖音</option>
                  <option>快手</option>
                  <option>小红书</option>
                  <option>视频号</option>
                </select>
              </div>
              <div class="field">
                <div class="label">赛道/行业</div>
                <input id="track" type="text" placeholder="例如：情感 / 口播带货 / 本地生活" />
              </div>
              <div class="field">
                <div class="label">目标人群</div>
                <input id="audience" type="text" placeholder="例如：宝妈 / 上班族 / 新手商家" />
              </div>
              <div class="field">
                <div class="label">视频时长</div>
                <select id="duration">
                  <option value="15">15s</option>
                  <option value="30" selected>30s</option>
                  <option value="60">60s</option>
                </select>
              </div>
              <div class="field">
                <div class="label">口吻/人设</div>
                <input id="persona" type="text" placeholder="例如：毒舌评测 / 专业导师 / 情绪共鸣" />
              </div>
              <div class="field">
                <div class="label">禁词/敏感</div>
                <input id="ban" type="text" placeholder="可选，逗号分隔" />
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-title">
              <h3>爆款标题</h3>
              <div class="card-actions">
                <button class="btn" id="btn-title">生成</button>
              </div>
            </div>
            <div class="field">
              <div class="label">标题候选（示例）</div>
              <textarea id="titles" placeholder="生成后写入...">1. 别再瞎学了，真正有效的是这3步\n2. 我用了7天，把XX从0做到1\n3. 大多数人都误会了：XX根本不是关键\n4. 你以为在省钱，其实在浪费时间</textarea>
              <div class="hint">支持去重/敏感过滤/A-B标记（待接入）。</div>
            </div>
          </div>

          <div class="card">
            <div class="card-title">
              <h3>正文脚本</h3>
              <div class="card-actions">
                <button class="btn" id="btn-script">生成</button>
              </div>
            </div>
            <div class="field">
              <div class="label">脚本（可编辑）</div>
              <textarea id="script" placeholder="生成后写入...">开头（3秒）：你是不是也遇到过……\n痛点：很多人卡在……\n方法：记住三步，第一……第二……第三……\n证据：我自己/客户实测……\n结尾CTA：想要模板，评论区打“资料”。</textarea>
              <div class="hint">支持“钩子库/结构模板/变量替换”（待接入）。</div>
            </div>
          </div>

          <div class="card">
            <div class="card-title">
              <h3>优化与改写</h3>
              <div class="card-actions">
                <button class="btn" id="btn-polish">一键优化</button>
              </div>
            </div>
            <div class="form">
              <div class="field">
                <div class="label">改写策略</div>
                <select id="polishMode">
                  <option value="oral" selected>更口语</option>
                  <option value="antiAi">降AI味</option>
                  <option value="conflict">增强冲突</option>
                  <option value="data">补充数据证据</option>
                </select>
              </div>
              <div class="field">
                <div class="label">最终稿（输出区）</div>
                <textarea id="final" placeholder="这里是最终稿..."></textarea>
              </div>
              <div class="card-actions">
                <button class="btn btn-primary" id="btn-save">保存版本</button>
                <button class="btn" id="btn-to-avatar">去数字人合成</button>
              </div>
              <div class="empty" style="margin-top: 10px">批量模式、版本对比、模板管理后续接入。</div>
            </div>
          </div>
        </div>
      </div>
    `);

    const script = root.querySelector("#script");
    const final = root.querySelector("#final");

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

    const fillFinal = () => {
      const t = script.value?.trim();
      final.value = t ? t : "";
    };

    root.querySelector("#btn-generate").addEventListener("click", () => {
      fillFinal();
      toast("已生成（占位）。");
    });
    root.querySelector("#btn-title").addEventListener("click", () => toast("标题已刷新（占位）。"));
    root.querySelector("#btn-script").addEventListener("click", () => {
      fillFinal();
      toast("脚本已生成（占位）。");
    });
    root.querySelector("#btn-polish").addEventListener("click", () => {
      fillFinal();
      toast("已按策略改写（占位）。");
    });
    root.querySelector("#btn-save").addEventListener("click", () => toast("已保存版本（占位）。"));
    root.querySelector("#btn-to-story").addEventListener("click", () => (window.location.hash = "#/storyboard"));
    root.querySelector("#btn-to-avatar").addEventListener("click", () => (window.location.hash = "#/avatar-synthesis"));

    fillFinal();
    return root;
  }
};

