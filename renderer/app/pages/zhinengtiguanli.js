import { elFromHTML, pageHeader } from "../ui.js";
import { readAgentConfigs, writeAgentConfigs } from "../data/jingyingzhongxindata.js";

function createAgentId() {
  return `agent_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
}

export const route = {
  path: "/agent-management",
  title: "智能体管理",
  async render() {
    const root = elFromHTML(`
      <div class="sticky-page-layout biz-page">
        ${pageHeader({
          title: "智能体管理",
          subtitle: "为不同业务目标设置智能体角色、提示词、私有数据库和共享数据库协同策略，让智能体持续理解用户习惯和业务体系。",
          actionsHTML: `
            <button class="btn" id="agent-reset">恢复默认</button>
            <button class="btn btn-primary" id="agent-add">新增智能体</button>
          `
        })}

        <div class="sticky-page-body biz-page-body">
          <div class="agent-mgmt-layout">
            <aside class="agent-mgmt-side">
              <div class="card">
                <div class="card-title">
                  <h3>智能体列表</h3>
                  <span class="pill" id="agent-count">0</span>
                </div>
                <div class="agent-list" id="agent-list"></div>
              </div>

              <div class="card" style="margin-top:12px">
                <div class="card-title">
                  <h3>协同原则</h3>
                  <span class="pill">共享 / 独立</span>
                </div>
                <div class="agent-guide-list">
                  <div class="agent-guide-item">独立数据库：沉淀每个智能体自己的诊断习惯、行业经验和用户偏好。</div>
                  <div class="agent-guide-item">共享数据库：沉淀全局内容、私域、成交和客户知识，供多个智能体协同调用。</div>
                  <div class="agent-guide-item">建议将“品牌内容”“流量策略”“成交转化”拆成不同角色，减少提示词冲突。</div>
                </div>
              </div>
            </aside>

            <main class="agent-mgmt-main">
              <div class="grid cols-2">
                <div class="card">
                  <div class="card-title">
                    <h3>角色设置</h3>
                    <span class="pill" id="agent-active-name">未选择</span>
                  </div>
                  <div class="field">
                    <div class="label">智能体名称</div>
                    <input id="agent-name" type="text" placeholder="例如：流量策略官" />
                  </div>
                  <div class="field">
                    <div class="label">角色定位</div>
                    <input id="agent-role" type="text" placeholder="例如：负责诊断作品流量阶段和下一步打法" />
                  </div>
                  <div class="field">
                    <div class="label">提示词</div>
                    <textarea id="agent-prompt" placeholder="写清楚这个智能体需要重点关注哪些业务目标、哪些口径和哪些禁区。"></textarea>
                  </div>
                  <div class="grid cols-2">
                    <div class="field">
                      <div class="label">业务风格</div>
                      <input id="agent-style" type="text" placeholder="例如：策略型 / 转化型 / 品牌型" />
                    </div>
                    <div class="field">
                      <div class="label">负责人</div>
                      <input id="agent-owner" type="text" placeholder="例如：运营负责人" />
                    </div>
                  </div>
                </div>

                <div class="card">
                  <div class="card-title">
                    <h3>数据库协同</h3>
                    <span class="pill">长期记忆</span>
                  </div>
                  <div class="field">
                    <div class="label">独立数据库名称</div>
                    <input id="agent-private-name" type="text" placeholder="例如：流量策略私有库" />
                  </div>
                  <div class="field">
                    <div class="label">独立数据库职责</div>
                    <textarea id="agent-private-scope" placeholder="说明这个智能体的私有数据库主要沉淀哪些经验。"></textarea>
                  </div>
                  <div class="field">
                    <div class="label">共享数据库</div>
                    <div class="agent-shared-db" id="agent-shared-db"></div>
                  </div>
                </div>
              </div>

              <div class="grid cols-2" style="margin-top:12px">
                <div class="card">
                  <div class="card-title">
                    <h3>协同工作流</h3>
                    <span class="pill">全软件生效</span>
                  </div>
                  <div class="agent-flow-grid">
                    <div class="agent-flow-item">
                      <div class="agent-flow-step">01</div>
                      <div class="agent-flow-title">采集业务行为</div>
                      <div class="agent-flow-desc">记录内容表现、评论倾向、私域跟进和成交结果。</div>
                    </div>
                    <div class="agent-flow-item">
                      <div class="agent-flow-step">02</div>
                      <div class="agent-flow-title">进入私有数据库</div>
                      <div class="agent-flow-desc">把每个智能体自己的判断方法、用户偏好和成功经验单独沉淀。</div>
                    </div>
                    <div class="agent-flow-item">
                      <div class="agent-flow-step">03</div>
                      <div class="agent-flow-title">调用共享数据库</div>
                      <div class="agent-flow-desc">多个智能体共享使用内容知识库、成交案例库、客户画像库等全局数据。</div>
                    </div>
                    <div class="agent-flow-item">
                      <div class="agent-flow-step">04</div>
                      <div class="agent-flow-title">反哺业务动作</div>
                      <div class="agent-flow-desc">把建议反馈到内容管理、私域管理和数据大屏，形成闭环优化。</div>
                    </div>
                  </div>
                </div>

                <div class="card">
                  <div class="card-title">
                    <h3>当前智能体预览</h3>
                    <span class="pill" id="agent-preview-style">未选择</span>
                  </div>
                  <div class="agent-preview-card" id="agent-preview-card"></div>
                  <div class="card-actions" style="margin-top:12px;justify-content:space-between">
                    <button class="btn btn-danger" id="agent-delete" disabled>删除当前智能体</button>
                    <button class="btn btn-primary" id="agent-save" disabled>保存配置</button>
                  </div>
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

    const sharedDbOptions = ["内容知识库", "评论洞察库", "客户画像库", "私域话术库", "成交案例库", "复盘报告库", "品牌素材库"];
    let agents = readAgentConfigs();
    let selectedId = String(agents[0]?.id || "");

    const agentCount = root.querySelector("#agent-count");
    const agentList = root.querySelector("#agent-list");
    const activeName = root.querySelector("#agent-active-name");
    const previewStyle = root.querySelector("#agent-preview-style");
    const previewCard = root.querySelector("#agent-preview-card");
    const agentName = root.querySelector("#agent-name");
    const agentRole = root.querySelector("#agent-role");
    const agentPrompt = root.querySelector("#agent-prompt");
    const agentStyle = root.querySelector("#agent-style");
    const agentOwner = root.querySelector("#agent-owner");
    const agentPrivateName = root.querySelector("#agent-private-name");
    const agentPrivateScope = root.querySelector("#agent-private-scope");
    const agentSharedDb = root.querySelector("#agent-shared-db");
    const btnSave = root.querySelector("#agent-save");
    const btnDelete = root.querySelector("#agent-delete");

    const getCurrent = () => agents.find((item) => String(item.id) === selectedId) || null;

    const renderList = () => {
      agentCount.textContent = String(agents.length);
      agentList.innerHTML = agents
        .map(
          (agent) => `
            <button class="agent-list-item${String(agent.id) === selectedId ? " is-active" : ""}" type="button" data-id="${agent.id}">
              <div class="agent-list-top">
                <div class="agent-list-name">${agent.name}</div>
                <span class="pill">${agent.style || "未设置"}</span>
              </div>
              <div class="agent-list-role">${agent.role || "未填写角色定位"}</div>
              <div class="agent-list-meta">${agent.privateDbName || "未配置私有库"}｜负责人 ${agent.owner || "未设置"}</div>
            </button>
          `
        )
        .join("");
      fillEditor();
    };

    const fillEditor = () => {
      const current = getCurrent();
      const hasCurrent = Boolean(current);
      [agentName, agentRole, agentPrompt, agentStyle, agentOwner, agentPrivateName, agentPrivateScope].forEach((input) => {
        input.disabled = !hasCurrent;
      });
      btnSave.disabled = !hasCurrent;
      btnDelete.disabled = !hasCurrent;
      if (!current) {
        activeName.textContent = "未选择";
        previewStyle.textContent = "未选择";
        previewCard.innerHTML = `<div class="empty">请选择一个智能体。</div>`;
        agentSharedDb.innerHTML = "";
        return;
      }
      activeName.textContent = current.name;
      previewStyle.textContent = current.style || "未设置";
      agentName.value = current.name || "";
      agentRole.value = current.role || "";
      agentPrompt.value = current.prompt || "";
      agentStyle.value = current.style || "";
      agentOwner.value = current.owner || "";
      agentPrivateName.value = current.privateDbName || "";
      agentPrivateScope.value = current.privateDbScope || "";
      agentSharedDb.innerHTML = sharedDbOptions
        .map(
          (item) => `
            <label class="agent-db-tag${(current.sharedDbs || []).includes(item) ? " is-active" : ""}">
              <input type="checkbox" value="${item}" ${(current.sharedDbs || []).includes(item) ? "checked" : ""} />
              <span>${item}</span>
            </label>
          `
        )
        .join("");
      previewCard.innerHTML = `
        <div class="agent-preview-name">${current.name}</div>
        <div class="agent-preview-role">${current.role}</div>
        <div class="agent-preview-prompt">${current.prompt}</div>
        <div class="agent-preview-db">
          <div><strong>独立数据库：</strong>${current.privateDbName}</div>
          <div><strong>职责：</strong>${current.privateDbScope}</div>
          <div><strong>共享数据库：</strong>${(current.sharedDbs || []).join("、") || "未接入"}</div>
        </div>
      `;
    };

    const collectForm = () => {
      const current = getCurrent();
      if (!current) return null;
      return {
        ...current,
        name: String(agentName.value || "").trim() || "未命名智能体",
        role: String(agentRole.value || "").trim(),
        prompt: String(agentPrompt.value || "").trim(),
        style: String(agentStyle.value || "").trim(),
        owner: String(agentOwner.value || "").trim(),
        privateDbName: String(agentPrivateName.value || "").trim(),
        privateDbScope: String(agentPrivateScope.value || "").trim(),
        sharedDbs: Array.from(agentSharedDb.querySelectorAll("input:checked")).map((input) => String(input.value || "").trim())
      };
    };

    const saveCurrent = () => {
      const next = collectForm();
      if (!next) return;
      agents = agents.map((item) => (String(item.id) === String(next.id) ? next : item));
      writeAgentConfigs(agents);
      renderList();
      toast("智能体配置已保存。");
    };

    renderList();

    root.querySelector("#agent-add").addEventListener("click", () => {
      const item = {
        id: createAgentId(),
        name: `新智能体${agents.length + 1}`,
        role: "请补充这个智能体的职责",
        prompt: "",
        privateDbName: "新的私有数据库",
        privateDbScope: "",
        sharedDbs: ["内容知识库"],
        style: "通用型",
        owner: ""
      };
      agents = [item, ...agents];
      selectedId = item.id;
      writeAgentConfigs(agents);
      renderList();
      toast("已新增智能体。");
    });
    root.querySelector("#agent-reset").addEventListener("click", () => {
      agents = readAgentConfigs().slice(0, 0);
      window.localStorage.removeItem("ipfactory.agent.management.v1");
      agents = readAgentConfigs();
      selectedId = String(agents[0]?.id || "");
      renderList();
      toast("已恢复默认智能体。");
    });
    agentList.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-id]");
      if (!btn) return;
      selectedId = String(btn.getAttribute("data-id") || "");
      renderList();
    });
    root.querySelector("#agent-save").addEventListener("click", saveCurrent);
    root.querySelector("#agent-delete").addEventListener("click", () => {
      if (!selectedId) return;
      if (agents.length <= 1) {
        toast("至少保留一个智能体。");
        return;
      }
      agents = agents.filter((item) => String(item.id) !== String(selectedId));
      selectedId = String(agents[0]?.id || "");
      writeAgentConfigs(agents);
      renderList();
      toast("已删除当前智能体。");
    });
    [agentName, agentRole, agentPrompt, agentStyle, agentOwner, agentPrivateName, agentPrivateScope].forEach((input) =>
      input.addEventListener("input", () => {
        const draft = collectForm();
        if (!draft) return;
        previewStyle.textContent = draft.style || "未设置";
        previewCard.innerHTML = `
          <div class="agent-preview-name">${draft.name}</div>
          <div class="agent-preview-role">${draft.role || "请补充角色定位"}</div>
          <div class="agent-preview-prompt">${draft.prompt || "请补充提示词。"}</div>
          <div class="agent-preview-db">
            <div><strong>独立数据库：</strong>${draft.privateDbName || "未设置"}</div>
            <div><strong>职责：</strong>${draft.privateDbScope || "未填写"}</div>
            <div><strong>共享数据库：</strong>${draft.sharedDbs.join("、") || "未接入"}</div>
          </div>
        `;
      })
    );
    agentSharedDb.addEventListener("change", () => {
      const current = collectForm();
      if (!current) return;
      previewCard.innerHTML = `
        <div class="agent-preview-name">${current.name}</div>
        <div class="agent-preview-role">${current.role || "请补充角色定位"}</div>
        <div class="agent-preview-prompt">${current.prompt || "请补充提示词。"}</div>
        <div class="agent-preview-db">
          <div><strong>独立数据库：</strong>${current.privateDbName || "未设置"}</div>
          <div><strong>职责：</strong>${current.privateDbScope || "未填写"}</div>
          <div><strong>共享数据库：</strong>${current.sharedDbs.join("、") || "未接入"}</div>
        </div>
      `;
    });

    return root;
  }
};
