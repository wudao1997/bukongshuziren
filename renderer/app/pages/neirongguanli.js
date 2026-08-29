import { elFromHTML, pageHeader } from "../ui.js";
import {
  analyzeComments,
  buildAgentAdvice,
  calcTrafficStage,
  formatNumber,
  formatPercent,
  getContentAccountProfiles,
  getContentRecords,
  getTopPortraitItem,
  readAgentConfigs,
  summarizePortraitGroups
} from "../data/jingyingzhongxindata.js";

export const route = {
  path: "/content-management",
  title: "内容管理",
  async render() {
    const root = elFromHTML(`
      <div class="sticky-page-layout biz-page">
        ${pageHeader({
          title: "内容管理",
          subtitle: "集中记录作品发布表现、评论意向、流量阶段和智能体诊断建议，方便持续复盘内容与转化链路。",
          actionsHTML: `
            <button class="btn" id="content-refresh">刷新看板</button>
            <button class="btn btn-primary" id="content-export">导出复盘</button>
          `
        })}

        <div class="sticky-page-body biz-page-body">
          <div class="biz-summary-grid" id="content-summary"></div>

          <div class="content-mgmt-layout">
            <aside class="content-mgmt-side">
              <div class="card">
                <div class="card-title">
                  <h3>筛选与搜索</h3>
                  <span class="pill" id="content-count-pill">0 条</span>
                </div>
                <div class="content-filter-stack">
                  <div class="field">
                    <div class="label">平台</div>
                    <select id="content-platform">
                      <option value="all">全部平台</option>
                    </select>
                  </div>
                  <div class="field">
                    <div class="label">流量星级</div>
                    <select id="content-stage">
                      <option value="all">全部阶段</option>
                      <option value="1">一星</option>
                      <option value="2">二星</option>
                      <option value="3">三星</option>
                      <option value="4">四星</option>
                      <option value="5">五星</option>
                    </select>
                  </div>
                  <div class="field">
                    <div class="label">评论关键词</div>
                    <input id="content-keyword" type="text" placeholder="例如：报价 / 微信 / 合作 / 课程" />
                  </div>
                </div>
              </div>

              <div class="card" style="margin-top:12px">
                <div class="card-title">
                  <h3>作品列表</h3>
                  <span class="pill" id="content-list-count">0</span>
                </div>
                <div class="content-record-list" id="content-record-list"></div>
                <div class="empty" id="content-empty" hidden>当前筛选条件下暂无作品。</div>
              </div>
            </aside>

            <main class="content-mgmt-main">
              <div class="card">
                <div class="card-title">
                  <h3>作品详情</h3>
                  <span class="pill" id="content-active-stage">未选择</span>
                </div>
                <div id="content-detail"></div>
              </div>

              <div class="grid cols-2" style="margin-top:12px">
                <div class="card">
                  <div class="card-title">
                    <h3>作品用户画像</h3>
                    <span class="pill" id="content-work-portrait-pill">未选择</span>
                  </div>
                  <div class="content-portrait-summary" id="content-work-portrait-summary"></div>
                  <div class="content-portrait-grid" id="content-work-portrait-grid"></div>
                </div>

                <div class="card">
                  <div class="card-title">
                    <h3>账号整体画像</h3>
                    <span class="pill" id="content-account-portrait-pill">未选择</span>
                  </div>
                  <div class="content-portrait-summary" id="content-account-portrait-summary"></div>
                  <div class="content-portrait-grid" id="content-account-portrait-grid"></div>
                </div>
              </div>

              <div class="grid cols-2" style="margin-top:12px">
                <div class="card">
                  <div class="card-title">
                    <h3>评论洞察</h3>
                    <span class="pill" id="content-comment-stat">0 条</span>
                  </div>
                  <div class="content-comment-insight" id="content-comment-insight"></div>
                  <div class="content-comment-list" id="content-comment-list"></div>
                </div>

                <div class="card">
                  <div class="card-title">
                    <h3>智能体诊断</h3>
                    <span class="pill" id="content-agent-pill">未接入</span>
                  </div>
                  <div class="field">
                    <div class="label">选择智能体</div>
                    <select id="content-agent-select"></select>
                  </div>
                  <div class="content-agent-quick">
                    <button class="btn" type="button" data-question="为什么流量停在当前阶段">为什么流量停在当前阶段</button>
                    <button class="btn" type="button" data-question="评论里有没有成交线索">评论里有没有成交线索</button>
                    <button class="btn" type="button" data-question="下一条内容应该怎么改">下一条内容应该怎么改</button>
                  </div>
                  <div class="field" style="margin-top:10px">
                    <div class="label">具体问题</div>
                    <textarea id="content-agent-question" placeholder="例如：这条内容要不要继续追投？评论里哪些人值得交给客服？"></textarea>
                  </div>
                  <div class="card-actions" style="margin-top:10px;justify-content:flex-end">
                    <button class="btn btn-primary" id="content-agent-run">生成建议</button>
                  </div>
                  <pre class="content-agent-output" id="content-agent-output">请选择作品和智能体后生成分析建议。</pre>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    `);

    const toast = (message) => {
      const el = document.createElement("div");
      el.className = "pill";
      el.style.position = "fixed";
      el.style.right = "16px";
      el.style.bottom = "16px";
      el.style.zIndex = "9999";
      el.textContent = String(message || "").trim();
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 1600);
    };

    const records = getContentRecords();
    const agents = readAgentConfigs();

    const summaryBox = root.querySelector("#content-summary");
    const platformSelect = root.querySelector("#content-platform");
    const stageSelect = root.querySelector("#content-stage");
    const keywordInput = root.querySelector("#content-keyword");
    const countPill = root.querySelector("#content-count-pill");
    const listCount = root.querySelector("#content-list-count");
    const recordList = root.querySelector("#content-record-list");
    const emptyBox = root.querySelector("#content-empty");
    const detailBox = root.querySelector("#content-detail");
    const activeStagePill = root.querySelector("#content-active-stage");
    const commentInsight = root.querySelector("#content-comment-insight");
    const commentList = root.querySelector("#content-comment-list");
    const commentStat = root.querySelector("#content-comment-stat");
    const workPortraitPill = root.querySelector("#content-work-portrait-pill");
    const accountPortraitPill = root.querySelector("#content-account-portrait-pill");
    const workPortraitSummary = root.querySelector("#content-work-portrait-summary");
    const workPortraitGrid = root.querySelector("#content-work-portrait-grid");
    const accountPortraitSummary = root.querySelector("#content-account-portrait-summary");
    const accountPortraitGrid = root.querySelector("#content-account-portrait-grid");
    const agentSelect = root.querySelector("#content-agent-select");
    const agentPill = root.querySelector("#content-agent-pill");
    const agentQuestion = root.querySelector("#content-agent-question");
    const agentOutput = root.querySelector("#content-agent-output");
    const accountProfiles = getContentAccountProfiles();

    let selectedId = String(records[0]?.id || "");

    const renderSummary = (items) => {
      const totalPlay = items.reduce((sum, item) => sum + Number(item.playCount || 0), 0);
      const totalDm = items.reduce((sum, item) => sum + Number(item.dmCount || 0), 0);
      const totalComments = items.reduce((sum, item) => sum + Number(item.commentCount || 0), 0);
      const avgFinish = items.length ? items.reduce((sum, item) => sum + Number(item.finishRate || 0), 0) / items.length : 0;
      const avgMarketing = items.length ? items.reduce((sum, item) => sum + Number(item.marketingStrength || 0), 0) / items.length : 0;
      const highIntent = items.reduce((sum, item) => sum + analyzeComments(item.comments || [], keywordInput.value).serviceHits.length, 0);
      const cards = [
        { label: "累计播放", value: formatNumber(totalPlay), note: "当前筛选作品总播放量" },
        { label: "累计评论", value: formatNumber(totalComments), note: "包含咨询、讨论和转化评论" },
        { label: "累计私信", value: formatNumber(totalDm), note: "作为私域承接的重要前置信号" },
        { label: "平均完播率", value: formatPercent(avgFinish), note: "用于判断内容停留质量" },
        { label: "营销强度", value: formatPercent(avgMarketing), note: "综合标题、评论与咨询动作" },
        { label: "高意向线索", value: formatNumber(highIntent), note: "按评论中的客服/咨询词命中估算" }
      ];
      summaryBox.innerHTML = cards
        .map(
          (card) => `
            <div class="card biz-summary-card">
              <div class="biz-summary-label">${card.label}</div>
              <div class="biz-summary-value">${card.value}</div>
              <div class="biz-summary-note">${card.note}</div>
            </div>
          `
        )
        .join("");
    };

    const getFilteredRecords = () => {
      const platform = String(platformSelect.value || "all");
      const starValue = String(stageSelect.value || "all");
      const keyword = String(keywordInput.value || "").trim();
      return records.filter((item) => {
        const stage = calcTrafficStage(item);
        const platformOk = platform === "all" || String(item.platform || "") === platform;
        const stageOk = starValue === "all" || String(stage.stars) === starValue;
        const keywordOk =
          !keyword ||
          String(item.title || "").includes(keyword) ||
          analyzeComments(item.comments || [], keyword).count > 0;
        return platformOk && stageOk && keywordOk;
      });
    };

    const renderRecordList = () => {
      const items = getFilteredRecords();
      renderSummary(items);
      countPill.textContent = `${items.length} 条`;
      listCount.textContent = String(items.length);
      emptyBox.hidden = items.length > 0;
      if (!items.some((item) => String(item.id) === selectedId)) selectedId = String(items[0]?.id || "");
      recordList.innerHTML = items
        .map((item) => {
          const stage = calcTrafficStage(item);
          return `
            <button class="content-record-item${String(item.id) === selectedId ? " is-active" : ""}" type="button" data-id="${item.id}">
              <div class="content-record-top">
                <div class="content-record-title">${item.title}</div>
                <span class="pill">${stage.label.split("｜")[0]}</span>
              </div>
              <div class="content-record-sub">${item.platform}｜${item.account}</div>
              <div class="content-record-metrics">
                <span>播放 ${formatNumber(item.playCount)}</span>
                <span>评论 ${formatNumber(item.commentCount)}</span>
                <span>私信 ${formatNumber(item.dmCount)}</span>
              </div>
            </button>
          `;
        })
        .join("");
      renderDetail();
    };

    const renderDetail = () => {
      const current = records.find((item) => String(item.id) === selectedId) || null;
      if (!current) {
        activeStagePill.textContent = "未选择";
        detailBox.innerHTML = `<div class="empty">请先从左侧选择一条作品。</div>`;
        workPortraitPill.textContent = "未选择";
        accountPortraitPill.textContent = "未选择";
        workPortraitSummary.innerHTML = `<div class="empty">暂无画像数据。</div>`;
        workPortraitGrid.innerHTML = "";
        accountPortraitSummary.innerHTML = `<div class="empty">暂无账号画像数据。</div>`;
        accountPortraitGrid.innerHTML = "";
        commentInsight.innerHTML = `<div class="empty">暂无评论洞察。</div>`;
        commentList.innerHTML = "";
        commentStat.textContent = "0 条";
        return;
      }
      const stage = calcTrafficStage(current);
      const commentResult = analyzeComments(current.comments || [], keywordInput.value);
      activeStagePill.textContent = stage.label;
      detailBox.innerHTML = `
        <div class="content-detail-head">
          <div>
            <div class="content-detail-title">${current.title}</div>
            <div class="content-detail-sub">${current.platform}｜${current.account}｜发布时间 ${current.publishTime}｜主题 ${current.topic}</div>
          </div>
          <div class="content-stage-stars">${"★".repeat(stage.stars)}${"☆".repeat(5 - stage.stars)}</div>
        </div>
        <div class="content-detail-grid">
          <div class="content-metric-card">
            <div class="content-metric-label">点赞</div>
            <div class="content-metric-value">${formatNumber(current.likeCount)}</div>
          </div>
          <div class="content-metric-card">
            <div class="content-metric-label">评论</div>
            <div class="content-metric-value">${formatNumber(current.commentCount)}</div>
          </div>
          <div class="content-metric-card">
            <div class="content-metric-label">转发</div>
            <div class="content-metric-value">${formatNumber(current.shareCount)}</div>
          </div>
          <div class="content-metric-card">
            <div class="content-metric-label">播放量</div>
            <div class="content-metric-value">${formatNumber(current.playCount)}</div>
          </div>
          <div class="content-metric-card">
            <div class="content-metric-label">完播率</div>
            <div class="content-metric-value">${formatPercent(current.finishRate)}</div>
          </div>
          <div class="content-metric-card">
            <div class="content-metric-label">私信数</div>
            <div class="content-metric-value">${formatNumber(current.dmCount)}</div>
          </div>
        </div>
        <div class="content-stage-card">
          <div class="content-stage-title">${stage.label}</div>
          <div class="content-stage-desc">${stage.desc}</div>
        </div>
      `;

      const renderPortraitBlock = (summaryBox, gridBox, pillBox, profile, name, notePrefix) => {
        const regionTop = getTopPortraitItem(profile?.regions);
        const ageTop = getTopPortraitItem(profile?.ages);
        const genderTop = getTopPortraitItem(profile?.genders);
        const identityTop = getTopPortraitItem(profile?.roles || profile?.identities);
        const industryTop = getTopPortraitItem(profile?.industries);
        pillBox.textContent = name || "未选择";
        const summaryCards = [
          { label: "核心地区", value: regionTop ? `${regionTop.name} ${regionTop.value}%` : "—", note: `${notePrefix}的地区集中度，用于本地化表达。` },
          { label: "主力年龄", value: ageTop ? `${ageTop.name} ${ageTop.value}%` : "—", note: `${notePrefix}的表达节奏、案例风格和画面语言。` },
          { label: "性别结构", value: genderTop ? `${genderTop.name} ${genderTop.value}%` : "—", note: `${notePrefix}的视觉和情绪表达侧重。` },
          { label: "主力身份", value: identityTop ? `${identityTop.name} ${identityTop.value}%` : "—", note: `${notePrefix}更该讲结果还是讲执行细节。` },
          { label: "高频行业", value: industryTop ? `${industryTop.name} ${industryTop.value}%` : "—", note: `${notePrefix}适合展示哪些行业案例。` }
        ];
        summaryBox.innerHTML = summaryCards
          .map(
            (item) => `
              <div class="content-portrait-card">
                <div class="content-portrait-label">${item.label}</div>
                <div class="content-portrait-value">${item.value}</div>
                <div class="content-portrait-note">${item.note}</div>
              </div>
            `
          )
          .join("");
        const blocks = [
          ["地区分布", profile?.regions, "决定地域案例和同城表达。"],
          ["年龄结构", profile?.ages, "决定节奏、镜头和语言风格。"],
          ["性别结构", profile?.genders, "决定视觉、题材和情绪表达。"],
          ["企业身份", profile?.roles || profile?.identities, "决定更讲老板结果还是执行细节。"],
          ["行业分布", profile?.industries, "决定行业案例和关键词。"],
          ["企业规模", profile?.companySizes, "决定方案轻重和成交方式。"],
          ["内容意图", profile?.intentions, "决定评论引导和下一条内容方向。"]
        ];
        gridBox.innerHTML = blocks
          .filter(([, list]) => Array.isArray(list) && list.length)
          .map(([title, groups, note]) => {
            const items = summarizePortraitGroups(groups).slice(0, 5);
            const max = Math.max(...items.map((item) => item.value), 1);
            return `
              <div class="content-portrait-panel">
                <div class="content-portrait-panel-head">
                  <div class="content-portrait-panel-title">${title}</div>
                  <span class="pill">${items[0] ? `${items[0].name} ${items[0].value}%` : "—"}</span>
                </div>
                <div class="content-portrait-bars">
                  ${items
                    .map(
                      (item) => `
                        <div class="content-portrait-bar-item" title="${note}">
                          <div class="content-portrait-bar-meta">
                            <span>${item.name}</span>
                            <strong>${item.value}%</strong>
                          </div>
                          <div class="content-portrait-track"><div class="content-portrait-bar" style="width:${(item.value / max) * 100}%"></div></div>
                        </div>
                      `
                    )
                    .join("")}
                </div>
              </div>
            `;
          })
          .join("");
      };

      renderPortraitBlock(
        workPortraitSummary,
        workPortraitGrid,
        workPortraitPill,
        current.audienceProfile || {},
        "当前作品画像",
        "用于判断这条作品"
      );
      renderPortraitBlock(
        accountPortraitSummary,
        accountPortraitGrid,
        accountPortraitPill,
        accountProfiles[String(current.account || "")] || {},
        String(current.account || "当前账号"),
        "用于判断该账号整体内容"
      );

      commentInsight.innerHTML = `
        <div class="content-intent-grid">
          <div class="content-intent-card">
            <div class="content-intent-label">关键词命中评论</div>
            <div class="content-intent-value">${formatNumber(commentResult.count)}</div>
            <div class="content-intent-note">支持用评论内容做关键词搜索和筛选</div>
          </div>
          <div class="content-intent-card">
            <div class="content-intent-label">营销意图强度</div>
            <div class="content-intent-value">${formatPercent(commentResult.marketingRate)}</div>
            <div class="content-intent-note">按报价、合作、课程、咨询等词做粗判</div>
          </div>
          <div class="content-intent-card">
            <div class="content-intent-label">客服意向强度</div>
            <div class="content-intent-value">${formatPercent(commentResult.serviceRate)}</div>
            <div class="content-intent-note">按微信、联系、预约、下单等词做粗判</div>
          </div>
        </div>
      `;
      commentList.innerHTML = commentResult.filtered.length
        ? commentResult.filtered.map((item) => `<div class="content-comment-item">${item}</div>`).join("")
        : `<div class="empty">当前关键词下没有命中评论。</div>`;
      commentStat.textContent = `${commentResult.count} 条`;
    };

    const renderAgentSelect = () => {
      agentSelect.innerHTML = agents
        .map((agent, index) => `<option value="${agent.id}" ${index === 0 ? "selected" : ""}>${agent.name}｜${agent.style}</option>`)
        .join("");
      const current = agents[0] || null;
      agentPill.textContent = current ? `${current.name}｜${current.privateDbName}` : "未接入";
    };

    const runAgentAdvice = () => {
      const currentRecord = records.find((item) => String(item.id) === selectedId) || null;
      const agent = agents.find((item) => String(item.id) === String(agentSelect.value || "")) || agents[0] || null;
      if (!currentRecord || !agent) {
        agentOutput.textContent = "请先选择作品和智能体。";
        return;
      }
      agentPill.textContent = `${agent.name}｜${agent.privateDbName}`;
      agentOutput.textContent = buildAgentAdvice({
        agent,
        record: currentRecord,
        keyword: keywordInput.value,
        customQuestion: agentQuestion.value
      });
    };

    const platforms = Array.from(new Set(records.map((item) => String(item.platform || "")).filter(Boolean)));
    platformSelect.innerHTML += platforms.map((item) => `<option value="${item}">${item}</option>`).join("");
    renderAgentSelect();
    renderRecordList();
    runAgentAdvice();

    root.querySelector("#content-refresh").addEventListener("click", () => {
      renderRecordList();
      runAgentAdvice();
      toast("内容看板已刷新。");
    });
    root.querySelector("#content-export").addEventListener("click", () => toast("导出复盘功能已预留。"));
    [platformSelect, stageSelect].forEach((input) =>
      input.addEventListener("change", () => {
        renderRecordList();
        runAgentAdvice();
      })
    );
    keywordInput.addEventListener("input", () => {
      renderRecordList();
      runAgentAdvice();
    });
    recordList.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-id]");
      if (!btn) return;
      selectedId = String(btn.getAttribute("data-id") || "");
      renderRecordList();
      runAgentAdvice();
    });
    agentSelect.addEventListener("change", runAgentAdvice);
    root.querySelectorAll("[data-question]").forEach((btn) =>
      btn.addEventListener("click", () => {
        agentQuestion.value = btn.getAttribute("data-question") || "";
        runAgentAdvice();
      })
    );
    root.querySelector("#content-agent-run").addEventListener("click", runAgentAdvice);

    return root;
  }
};
