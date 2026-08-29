import { elFromHTML, pageHeader } from "../ui.js";
import { formatNumber, formatPercent, getPrivateDomainOverview, getTopPortraitItem, summarizePortraitGroups } from "../data/jingyingzhongxindata.js";

export const route = {
  path: "/private-domain",
  title: "私域管理",
  async render() {
    const root = elFromHTML(`
      <div class="sticky-page-layout biz-page">
        ${pageHeader({
          title: "私域管理",
          subtitle: "围绕获客、询单、成交和复购做精细化运营看板，便于企业持续跟踪私域承接质量。",
          actionsHTML: `
            <button class="btn" id="private-sync">同步私域</button>
            <button class="btn btn-primary" id="private-export">导出日报</button>
          `
        })}

        <div class="sticky-page-body biz-page-body">
          <div class="private-range-bar">
            <button class="btn is-active" type="button" data-range="today">日</button>
            <button class="btn" type="button" data-range="week">周</button>
            <button class="btn" type="button" data-range="month">月</button>
          </div>

          <div class="biz-summary-grid" id="private-summary"></div>

          <div class="grid cols-2 private-top-grid">
            <div class="card">
              <div class="card-title">
                <h3>成交漏斗</h3>
                <span class="pill" id="private-funnel-pill">本月</span>
              </div>
              <div class="private-funnel" id="private-funnel"></div>
            </div>

            <div class="card">
              <div class="card-title">
                <h3>客户阶段</h3>
                <span class="pill">精细化运营</span>
              </div>
              <div class="private-stage-grid" id="private-stage-grid"></div>
            </div>
          </div>

          <div class="grid cols-2" style="margin-top:12px">
            <div class="card">
              <div class="card-title">
                <h3>私域账号表现</h3>
                <span class="pill">按承接通道</span>
              </div>
              <div class="private-channel-list" id="private-channel-list"></div>
            </div>

            <div class="card">
              <div class="card-title">
                <h3>订单与成交</h3>
                <span class="pill">按团队</span>
              </div>
              <div class="private-order-list" id="private-order-list"></div>
            </div>
          </div>

          <div class="grid cols-2" style="margin-top:12px">
            <div class="card">
              <div class="card-title">
                <h3>用户画像总览</h3>
                <span class="pill">销售话术优化</span>
              </div>
              <div class="private-portrait-summary" id="private-portrait-summary"></div>
              <div class="private-portrait-sample" id="private-portrait-sample"></div>
            </div>

            <div class="card">
              <div class="card-title">
                <h3>画像结构分布</h3>
                <span class="pill" id="private-portrait-hover">鼠标悬浮看重点</span>
              </div>
              <div class="private-portrait-grid" id="private-portrait-grid"></div>
            </div>
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

    const overview = getPrivateDomainOverview();
    const summaryBox = root.querySelector("#private-summary");
    const funnelBox = root.querySelector("#private-funnel");
    const funnelPill = root.querySelector("#private-funnel-pill");
    const stageBox = root.querySelector("#private-stage-grid");
    const channelBox = root.querySelector("#private-channel-list");
    const orderBox = root.querySelector("#private-order-list");
    const portraitSummary = root.querySelector("#private-portrait-summary");
    const portraitSample = root.querySelector("#private-portrait-sample");
    const portraitGrid = root.querySelector("#private-portrait-grid");
    const portraitHover = root.querySelector("#private-portrait-hover");
    let range = "today";

    const rangeMap = {
      today: [
        ["当前私域人数", formatNumber(overview.summary.totalUsers), "累计沉淀用户总量"],
        ["日新增人数", formatNumber(overview.summary.todayNewUsers), "当天新增进入私域"],
        ["日询单人数", formatNumber(overview.summary.todayInquiries), "当天触发咨询动作"],
        ["日成交人数", formatNumber(overview.summary.todayDeals), "当天完成成交"],
        ["日成交金额", `¥${formatNumber(overview.summary.todayRevenue)}`, "当天已确认订单金额"],
        ["复购率", formatPercent(overview.summary.repurchaseRate), "用于判断老客户再成交能力"]
      ],
      week: [
        ["当前私域人数", formatNumber(overview.summary.totalUsers), "累计沉淀用户总量"],
        ["周新增人数", formatNumber(overview.summary.weekNewUsers), "近7天新增进入私域"],
        ["周询单人数", formatNumber(overview.summary.weekInquiries), "近7天主动咨询人数"],
        ["周成交人数", formatNumber(overview.summary.weekDeals), "近7天完成成交"],
        ["周成交金额", `¥${formatNumber(overview.summary.weekRevenue)}`, "近7天订单金额"],
        ["平均成交周期", `${overview.summary.avgDealCycleDays} 天`, "从询单到成交的平均耗时"]
      ],
      month: [
        ["当前私域人数", formatNumber(overview.summary.totalUsers), "累计沉淀用户总量"],
        ["月新增人数", formatNumber(overview.summary.monthNewUsers), "近30天新增进入私域"],
        ["月询单人数", formatNumber(overview.summary.monthInquiries), "近30天主动咨询人数"],
        ["月成交人数", formatNumber(overview.summary.monthDeals), "近30天完成成交"],
        ["月成交金额", `¥${formatNumber(overview.summary.monthRevenue)}`, "近30天订单金额"],
        ["累计成交金额", `¥${formatNumber(overview.summary.totalRevenue)}`, "历史累计成交金额"]
      ]
    };

    const renderSummary = () => {
      const cards = rangeMap[range] || [];
      summaryBox.innerHTML = cards
        .map(
          ([label, value, note]) => `
            <div class="card biz-summary-card">
              <div class="biz-summary-label">${label}</div>
              <div class="biz-summary-value">${value}</div>
              <div class="biz-summary-note">${note}</div>
            </div>
          `
        )
        .join("");
    };

    const renderFunnel = () => {
      funnelPill.textContent = range === "today" ? "今日看板" : range === "week" ? "本周看板" : "本月看板";
      const max = Math.max(...overview.funnels.map((item) => Number(item.value || 0)), 1);
      funnelBox.innerHTML = overview.funnels
        .map(
          (item) => `
            <div class="private-funnel-row">
              <div class="private-funnel-label">${item.stage}</div>
              <div class="private-funnel-track"><div class="private-funnel-bar" style="width:${(Number(item.value || 0) / max) * 100}%"></div></div>
              <div class="private-funnel-value">${formatNumber(item.value)}</div>
            </div>
          `
        )
        .join("");
    };

    const renderStages = () => {
      stageBox.innerHTML = overview.customerStages
        .map(
          (item) => `
            <div class="private-stage-card">
              <div class="private-stage-head">
                <div class="private-stage-title">${item.label}</div>
                <span class="pill">${formatNumber(item.count)}</span>
              </div>
              <div class="private-stage-note">${item.note}</div>
            </div>
          `
        )
        .join("");
    };

    const renderChannels = () => {
      channelBox.innerHTML = overview.channels
        .map(
          (item) => `
            <div class="private-channel-card">
              <div class="private-channel-head">
                <div class="private-channel-name">${item.name}</div>
                <span class="pill">成交率 ${formatPercent(item.dealRate)}</span>
              </div>
              <div class="private-channel-metrics">
                <div><strong>${formatNumber(item.users)}</strong><span>当前人数</span></div>
                <div><strong>${formatNumber(item.todayNew)}</strong><span>今日新增</span></div>
                <div><strong>${formatNumber(item.weekInquiries)}</strong><span>周询单</span></div>
                <div><strong>${formatNumber(item.monthDeals)}</strong><span>月成交</span></div>
                <div><strong>¥${formatNumber(item.revenue)}</strong><span>月成交额</span></div>
              </div>
            </div>
          `
        )
        .join("");
    };

    const renderOrders = () => {
      orderBox.innerHTML = overview.orders
        .map(
          (item) => `
            <div class="private-order-card">
              <div class="private-order-head">
                <div class="private-order-name">${item.team}</div>
                <span class="pill">转化率 ${formatPercent(item.conversion)}</span>
              </div>
              <div class="private-order-grid">
                <div><span>成交单数</span><strong>${formatNumber(item.count)}</strong></div>
                <div><span>成交金额</span><strong>¥${formatNumber(item.amount)}</strong></div>
                <div><span>客单价</span><strong>¥${formatNumber(item.avgAmount)}</strong></div>
              </div>
            </div>
          `
        )
        .join("");
    };

    const renderPortrait = () => {
      const portrait = overview.userPortrait || {};
      const regionTop = getTopPortraitItem(portrait.regions);
      const identityTop = getTopPortraitItem(portrait.identities);
      const companyTop = getTopPortraitItem(portrait.companySizes);
      const industryTop = getTopPortraitItem(portrait.industries);
      const budgetTop = getTopPortraitItem(portrait.budgets);
      const stageTop = getTopPortraitItem(portrait.decisionStages);
      const cards = [
        { label: "核心地区", value: regionTop ? `${regionTop.name} ${regionTop.value}%` : "—", note: regionTop?.note || "重点地区决定落地案例和本地化表达。" },
        { label: "主力身份", value: identityTop ? `${identityTop.name} ${identityTop.value}%` : "—", note: "决定话术应该更偏老板视角还是执行岗视角。" },
        { label: "企业规模", value: companyTop ? `${companyTop.name} ${companyTop.value}%` : "—", note: "影响报价表达、服务边界和交付方式。" },
        { label: "高频行业", value: industryTop ? `${industryTop.name} ${industryTop.value}%` : "—", note: "行业决定案例池和销售切入点。" },
        { label: "预算带", value: budgetTop ? `${budgetTop.name} ${budgetTop.value}%` : "—", note: "决定是主打低门槛试单还是高客单服务包。" },
        { label: "决策阶段", value: stageTop ? `${stageTop.name} ${stageTop.value}%` : "—", note: "决定先做教育还是直接推方案成交。" }
      ];
      portraitSummary.innerHTML = cards
        .map(
          (item) => `
            <div class="private-portrait-card">
              <div class="private-portrait-label">${item.label}</div>
              <div class="private-portrait-value">${item.value}</div>
              <div class="private-portrait-note">${item.note}</div>
            </div>
          `
        )
        .join("");

      portraitSample.innerHTML = (portrait.sampleCustomers || [])
        .map(
          (item) => `
            <div class="private-sample-item">
              <div class="private-sample-head">${item.name}</div>
              <div class="private-sample-tags">
                <span class="pill">${item.region}</span>
                <span class="pill">${item.industry}</span>
                <span class="pill">${item.companySize}</span>
                <span class="pill">${item.identity}</span>
                <span class="pill">${item.stage}</span>
              </div>
              <div class="private-sample-need">${item.need}</div>
            </div>
          `
        )
        .join("");

      const blocks = [
        ["地区分布", portrait.regions, "优先决定本地案例、城市话术和地面转化表达。"],
        ["行业分布", portrait.industries, "决定展示什么行业案例、什么业务关键词。"],
        ["企业规模", portrait.companySizes, "决定销售方案应该轻还是重。"],
        ["企业身份", portrait.identities, "决定沟通重点是老板结果还是执行细节。"],
        ["预算层级", portrait.budgets, "决定报价顺序、套餐结构和试单策略。"],
        ["决策阶段", portrait.decisionStages, "决定先教育、先试探还是直接成交。"],
        ["客户标签", portrait.customerTags, "决定长期内容选题与跟进重点。"],
        ["来源渠道", portrait.sourceChannels, "决定不同渠道的话术承接差异。"]
      ];
      portraitGrid.innerHTML = blocks
        .map(([title, groups, note]) => {
          const list = summarizePortraitGroups(groups).slice(0, 6);
          const max = Math.max(...list.map((item) => item.value), 1);
          return `
            <div class="private-portrait-panel">
              <div class="private-portrait-panel-head">
                <div class="private-portrait-panel-title">${title}</div>
                <span class="pill">${list[0] ? `${list[0].name} ${list[0].value}%` : "—"}</span>
              </div>
              <div class="private-portrait-bars">
                ${list
                  .map(
                    (item) => `
                      <div class="private-portrait-bar-item" data-note="${item.note || note}">
                        <div class="private-portrait-bar-meta">
                          <span>${item.name}</span>
                          <strong>${item.value}%</strong>
                        </div>
                        <div class="private-portrait-track"><div class="private-portrait-bar" style="width:${(item.value / max) * 100}%"></div></div>
                      </div>
                    `
                  )
                  .join("")}
              </div>
            </div>
          `;
        })
        .join("");
      portraitHover.textContent = "鼠标悬浮看重点";
    };

    const renderAll = () => {
      renderSummary();
      renderFunnel();
      renderStages();
      renderChannels();
      renderOrders();
      renderPortrait();
    };

    renderAll();

    root.querySelectorAll("[data-range]").forEach((btn) =>
      btn.addEventListener("click", () => {
        range = String(btn.getAttribute("data-range") || "today");
        root.querySelectorAll("[data-range]").forEach((item) => item.classList.toggle("is-active", item === btn));
        renderSummary();
        renderFunnel();
      })
    );
    portraitGrid.addEventListener("mouseover", (event) => {
      const item = event.target.closest("[data-note]");
      if (!item) return;
      portraitHover.textContent = item.getAttribute("data-note") || "鼠标悬浮看重点";
    });
    portraitGrid.addEventListener("mouseleave", () => {
      portraitHover.textContent = "鼠标悬浮看重点";
    });
    root.querySelector("#private-sync").addEventListener("click", () => toast("私域数据同步入口已预留。"));
    root.querySelector("#private-export").addEventListener("click", () => toast("私域日报导出入口已预留。"));

    return root;
  }
};
