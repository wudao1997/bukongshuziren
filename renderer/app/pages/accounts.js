import { confirmDialog, elFromHTML, pageHeader, topToast } from "../ui.js";
import { syncPageModuleVisibility, startPageModuleVisibilityLiveSync } from "../gongneng/yemianmokuaiyunkong.js";

export const route = {
  path: "/accounts",
  title: "账号管理",
  async render() {
    const ACCOUNT_MODULE_VISIBILITY_DEFAULTS = {
      accountTabs: true,
      platformSidebar: true,
      groupSidebar: true,
      accountToolbar: true,
      accountContent: true,
      groupsPanel: true
    };
    const root = elFromHTML(`
      <div class="accm">
        <div class="accm-top" data-cloud-module="accountTabs">
          <div class="accm-tabs">
            <button class="accm-tab is-active" type="button" data-tab="accounts">账号管理</button>
            <button class="accm-tab" type="button" data-tab="groups">分组管理</button>
            <button class="accm-tab is-disabled" type="button" disabled>分享链接</button>
            <button class="accm-tab is-disabled" type="button" disabled>收藏分组</button>
          </div>
          <div class="accm-top-actions">
            <button class="btn" id="accm-refresh">刷新</button>
          </div>
        </div>

        <div class="accm-body">
          <div class="accm-panel is-active" data-panel="accounts">
            <div class="accm-layout">
              <aside class="accm-side">
                <div class="card" data-cloud-module="platformSidebar">
                  <div class="card-title"><h3>平台</h3><span class="pill" id="accm-platform-count">0</span></div>
                  <div class="accm-side-list" id="accm-platform-list"></div>
                </div>

                <div class="card" style="margin-top: 12px" data-cloud-module="groupSidebar">
                  <div class="card-title">
                    <h3>分组</h3>
                    <span class="pill" id="accm-group-count">0</span>
                  </div>
                  <div class="accm-side-list" id="accm-group-list"></div>
                </div>
              </aside>

              <main class="accm-main">
                <div class="card accm-toolbar-card" data-cloud-module="accountToolbar">
                  <div class="accm-toolbar">
                    <div class="accm-toolbar-left">
                      <div class="accm-select">
                        <span class="pill">状态</span>
                        <select id="accm-status">
                          <option value="all" selected>全部状态</option>
                          <option value="normal">正常</option>
                          <option value="invalid">失效</option>
                        </select>
                      </div>
                      <div class="accm-select">
                        <span class="pill">运营人</span>
                        <select id="accm-operator">
                          <option value="all" selected>全部运营人</option>
                          <option value="__todo" disabled>（预留：后续联网）</option>
                        </select>
                      </div>
                      <div class="accm-select">
                        <span class="pill">批量操作</span>
                        <select id="accm-batch">
                          <option value="" selected>选择操作</option>
                          <option value="delete">删除</option>
                          <option value="setOperator">设置运营人</option>
                        </select>
                      </div>
                    </div>

                    <div class="accm-toolbar-right">
                      <div class="accm-view">
                        <button class="btn accm-view-btn is-active" id="accm-view-grid" type="button">网格</button>
                        <button class="btn accm-view-btn" id="accm-view-list" type="button">列表</button>
                      </div>
                      <button class="btn btn-primary" id="accm-add">添加账号</button>
                    </div>
                  </div>
                </div>

                <div class="accm-content" data-cloud-module="accountContent">
                  <div class="empty" id="accm-empty">暂无账号。点击“添加账号”开始扫码登录。</div>
                  <div class="accm-grid" id="accm-grid" hidden></div>
                  <div class="accm-list" id="accm-list" hidden></div>
                </div>
              </main>
            </div>
          </div>

          <div class="accm-panel" data-panel="groups" data-cloud-module="groupsPanel">
            ${pageHeader({
              title: "分组管理",
              subtitle: "用于按团队/项目/矩阵管理账号（本地保存，后续可接入云端）",
              actionsHTML: `<button class="btn btn-primary" id="accm-group-add">新增分组</button>`
            })}
            <div class="grid cols-2">
              <div class="card">
                <div class="card-title"><h3>分组列表</h3><span class="pill" id="accm-groups-count">0</span></div>
                <div class="empty" id="accm-groups-empty">暂无分组。</div>
                <div class="list" id="accm-groups-list" hidden></div>
              </div>
              <div class="card">
                <div class="card-title"><h3>分组设置</h3><span class="pill" id="accm-group-active">未选择</span></div>
                <div class="form">
                  <div class="field">
                    <div class="label">分组名称</div>
                    <input id="accm-group-name" type="text" placeholder="例如：矩阵A｜杭州地区" />
                  </div>
                  <div class="card-actions" style="margin-top: 12px; justify-content: space-between">
                    <button class="btn btn-danger" id="accm-group-del" disabled>删除</button>
                    <button class="btn btn-primary" id="accm-group-save" disabled>保存</button>
                  </div>
                  <div class="divider" style="margin-top: 12px"></div>
                  <div class="empty">说明：分组用于筛选账号列表，并可在批量操作中设置账号归属。</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-overlay" id="accm-add-overlay" hidden></div>
        <div class="modal accm-add-modal" id="accm-add-modal" hidden>
          <div class="modal-head">
            <div class="modal-title">添加账号</div>
            <button class="modal-close" id="accm-add-close" title="关闭">×</button>
          </div>
          <div class="modal-body">
            <div class="accm-add-grid" id="accm-add-grid"></div>
          </div>
          <div class="modal-foot" style="justify-content: space-between">
            <div class="pill" id="accm-add-tip">暂时支持：抖音/快手/小红书/视频号（更多平台后续开放）</div>
            <button class="btn" id="accm-net">网络设置</button>
          </div>
        </div>

        <div class="modal-overlay" id="accm-net-overlay" hidden></div>
        <div class="modal" id="accm-net-modal" hidden>
          <div class="modal-head">
            <div class="modal-title">网络设置</div>
            <button class="modal-close" id="accm-net-close" title="关闭">×</button>
          </div>
          <div class="modal-body">
            <div class="field">
              <div class="label">授权账号时，是否需要弹出自定义代理弹窗</div>
              <select id="accm-net-rule">
                <option value="none">不使用代理</option>
                <option value="default">默认一个代理</option>
                <option value="ask" selected>每次弹出询问</option>
              </select>
            </div>
            <div class="modal-tip" style="margin-top: 10px">
              <div class="label">说明</div>
              <ul class="tip-list">
                <li>此处仅配置规则与地区记忆，代理接入将在后续平台自动化发布时启用</li>
              </ul>
            </div>
          </div>
          <div class="modal-foot">
            <button class="btn" id="accm-net-cancel">取消</button>
            <button class="btn btn-primary" id="accm-net-save">保存</button>
          </div>
        </div>

        <div class="modal-overlay" id="accm-region-overlay" hidden></div>
        <div class="modal accm-region-modal" id="accm-region-modal" hidden>
          <div class="modal-head">
            <div class="modal-title">选择授权账号的网络区域</div>
            <button class="modal-close" id="accm-region-close" title="关闭">×</button>
          </div>
          <div class="modal-body">
            <div class="field">
              <div class="label">网络区域</div>
              <input id="accm-region-search" type="text" placeholder="搜索省份或城市" />
            </div>
            <div class="accm-region-tags" id="accm-region-tags" style="margin-top: 10px"></div>
            <div class="divider" style="margin-top: 12px"></div>
            <div class="field">
              <div class="label">最近使用</div>
              <div class="accm-region-recent" id="accm-region-recent"></div>
            </div>
          </div>
          <div class="modal-foot" style="justify-content: space-between">
            <label class="chk"><input type="checkbox" id="accm-region-remember" /> 记住选择，不再提示</label>
            <button class="btn btn-primary" id="accm-region-ok">下一步</button>
          </div>
        </div>

        <div class="modal-overlay" id="accm-log-overlay" hidden></div>
        <div class="modal accm-log-modal" id="accm-log-modal" hidden>
          <div class="modal-head">
            <div class="modal-title">账号日志</div>
            <button class="modal-close" id="accm-log-close" title="关闭">×</button>
          </div>
          <div class="modal-body">
            <div class="accm-log-top">
              <div class="pill" id="accm-log-title">—</div>
              <div class="accm-log-actions">
                <button class="btn" id="accm-log-clear">清空</button>
                <button class="btn" id="accm-log-copy">复制</button>
              </div>
            </div>
            <pre class="accm-log-pre mono" id="accm-log-pre">—</pre>
          </div>
        </div>

        <div class="modal-overlay" id="accm-remark-overlay" hidden></div>
        <div class="modal" id="accm-remark-modal" hidden>
          <div class="modal-head">
            <div class="modal-title">设置备注</div>
            <button class="modal-close" id="accm-remark-close" title="关闭">×</button>
          </div>
          <div class="modal-body">
            <div class="field">
              <div class="label">备注内容</div>
              <input id="accm-remark-input" type="text" placeholder="给这个账号写个备注（例如：杭州矩阵-女装）" maxlength="100" />
            </div>
            <div class="modal-tip" style="margin-top: 10px">
              <div class="label">当前账号</div>
              <div class="pill" id="accm-remark-title">—</div>
            </div>
          </div>
          <div class="modal-foot">
            <button class="btn" id="accm-remark-cancel">取消</button>
            <button class="btn btn-primary" id="accm-remark-save">保存</button>
          </div>
        </div>
      </div>
    `);
    const visibilitySyncOptions = {
      cloudObjectName: "zhanghaoguanlicaidanyemian",
      defaultModules: ACCOUNT_MODULE_VISIBILITY_DEFAULTS,
      scene: "desktop"
    };
    await syncPageModuleVisibility(root, visibilitySyncOptions);
    startPageModuleVisibilityLiveSync(root, { ...visibilitySyncOptions, intervalMs: 4000 });

    const fmtDate = (ts) => {
      const d = new Date(Number(ts || 0) || 0);
      if (!Number.isFinite(d.getTime()) || d.getTime() <= 0) return "—";
      const pad = (n) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    const fmtNumShort = (n) => {
      const v = Number(n || 0) || 0;
      if (!Number.isFinite(v)) return "0";
      if (v >= 100000000) {
        const x = v / 100000000;
        const s = x >= 10 ? x.toFixed(0) : x.toFixed(1);
        return `${s.replace(/\.0$/, "")}亿`;
      }
      if (v >= 10000) {
        const x = v / 10000;
        const s = x >= 10 ? x.toFixed(0) : x.toFixed(1);
        return `${s.replace(/\.0$/, "")}万`;
      }
      return String(Math.round(v));
    };

    const clip = (s, max = 28) => {
      const t = String(s || "").trim();
      if (!t) return "—";
      if (t.length <= max) return t;
      return `${t.slice(0, Math.max(0, max - 1))}…`;
    };

    const platformLabel = (p) => {
      const v = String(p || "").trim();
      if (v === "douyin") return "抖音";
      if (v === "kuaishou") return "快手";
      if (v === "xiaohongshu") return "小红书";
      if (v === "shipinhao") return "视频号";
      return v || "—";
    };
    const platformIconUrl = (p) => {
      const v = String(p || "").trim();
      if (v === "douyin") return "./assets/douyin.png";
      if (v === "kuaishou") return "./assets/kuaishou.png";
      if (v === "xiaohongshu") return "./assets/xiaohongshu.png";
      if (v === "shipinhao") return "./assets/shipinhao.png";
      return "";
    };
    const renderPlatformIcon = (platform, title, className = "accm-platform-icon") => {
      const label = String(title || platformLabel(platform) || "").trim() || "平台";
      const src = platformIconUrl(platform);
      if (!src) return "";
      return `<img class="${className}" src="${src}" alt="${label}" />`;
    };

    const toast = (msg, type) => topToast(msg, { type: type || "success" });

    const tabs = Array.from(root.querySelectorAll(".accm-tab[data-tab]"));
    const panels = Array.from(root.querySelectorAll(".accm-panel[data-panel]"));
    const setTab = (k) => {
      tabs.forEach((b) => b.classList.toggle("is-active", b.getAttribute("data-tab") === k));
      panels.forEach((p) => p.classList.toggle("is-active", p.getAttribute("data-panel") === k));
    };
    tabs.forEach((b) => b.addEventListener("click", () => setTab(b.getAttribute("data-tab"))));

    const btnRefresh = root.querySelector("#accm-refresh");
    const platformCount = root.querySelector("#accm-platform-count");
    const platformList = root.querySelector("#accm-platform-list");
    const groupCount = root.querySelector("#accm-group-count");
    const groupList = root.querySelector("#accm-group-list");

    const statusSel = root.querySelector("#accm-status");
    const operatorSel = root.querySelector("#accm-operator");
    const batchSel = root.querySelector("#accm-batch");
    const viewGridBtn = root.querySelector("#accm-view-grid");
    const viewListBtn = root.querySelector("#accm-view-list");
    const btnAdd = root.querySelector("#accm-add");

    const empty = root.querySelector("#accm-empty");
    const grid = root.querySelector("#accm-grid");
    const list = root.querySelector("#accm-list");

    const addOverlay = root.querySelector("#accm-add-overlay");
    const addModal = root.querySelector("#accm-add-modal");
    const addClose = root.querySelector("#accm-add-close");
    const addGrid = root.querySelector("#accm-add-grid");
    const btnNet = root.querySelector("#accm-net");

    const netOverlay = root.querySelector("#accm-net-overlay");
    const netModal = root.querySelector("#accm-net-modal");
    const netClose = root.querySelector("#accm-net-close");
    const netCancel = root.querySelector("#accm-net-cancel");
    const netSave = root.querySelector("#accm-net-save");
    const netRuleSel = root.querySelector("#accm-net-rule");

    const regionOverlay = root.querySelector("#accm-region-overlay");
    const regionModal = root.querySelector("#accm-region-modal");
    const regionClose = root.querySelector("#accm-region-close");
    const regionOk = root.querySelector("#accm-region-ok");
    const regionSearch = root.querySelector("#accm-region-search");
    const regionTags = root.querySelector("#accm-region-tags");
    const regionRecent = root.querySelector("#accm-region-recent");
    const regionRemember = root.querySelector("#accm-region-remember");

    const logOverlay = root.querySelector("#accm-log-overlay");
    const logModal = root.querySelector("#accm-log-modal");
    const logClose = root.querySelector("#accm-log-close");
    const logTitle = root.querySelector("#accm-log-title");
    const logPre = root.querySelector("#accm-log-pre");
    const logCopy = root.querySelector("#accm-log-copy");
    const logClear = root.querySelector("#accm-log-clear");
    let activeLogId = "";

    const remarkOverlay = root.querySelector("#accm-remark-overlay");
    const remarkModal = root.querySelector("#accm-remark-modal");
    const remarkClose = root.querySelector("#accm-remark-close");
    const remarkCancel = root.querySelector("#accm-remark-cancel");
    const remarkSave = root.querySelector("#accm-remark-save");
    const remarkInput = root.querySelector("#accm-remark-input");
    const remarkTitle = root.querySelector("#accm-remark-title");
    let activeRemarkId = "";

    const groupsAdd = root.querySelector("#accm-group-add");
    const groupsCount = root.querySelector("#accm-groups-count");
    const groupsEmpty = root.querySelector("#accm-groups-empty");
    const groupsList = root.querySelector("#accm-groups-list");
    const groupActive = root.querySelector("#accm-group-active");
    const groupName = root.querySelector("#accm-group-name");
    const groupDel = root.querySelector("#accm-group-del");
    const groupSave = root.querySelector("#accm-group-save");

    const NET_RULE_KEY = "ipfactory.accounts.netRule.v1";
    const NET_REGION_KEY = "ipfactory.accounts.netRegions.v1";
    const VIEW_KEY = "ipfactory.accounts.view.v1";

    const readJson = (k, fallback) => {
      try {
        const raw = localStorage.getItem(k);
        const obj = JSON.parse(raw || "");
        return obj ?? fallback;
      } catch {
        return fallback;
      }
    };
    const writeJson = (k, v) => {
      try {
        localStorage.setItem(k, JSON.stringify(v, null, 2));
      } catch {}
    };

    let allAccounts = [];
    let allGroups = [];

    let filterPlatform = "all";
    let filterGroupId = "all";
    let filterStatus = "all";
    let filterOperator = "all";
    let viewMode = String(readJson(VIEW_KEY, "grid") || "grid");

    let selectedIds = new Set();
    let pendingAddPlatform = "";
    let pendingLoginAccountId = "";
    let pendingRegion = "";
    let loginBusy = false;
    let loadAllPromise = null;
    const activeLoginRequests = new Set();

    const getStatus = (it) => {
      if (String(it.status || "") === "invalid") return "invalid";
      if (String(it.status || "") === "normal") return "normal";
      return Number(it.cookieCount || 0) > 0 ? "normal" : "invalid";
    };

    const closeModal = (overlay, modal) => {
      overlay.hidden = true;
      modal.hidden = true;
    };
    const openModal = (overlay, modal) => {
      overlay.hidden = false;
      modal.hidden = false;
    };
    const openRemarkModal = (it) => {
      const acc = it && typeof it === "object" ? it : null;
      activeRemarkId = String(acc?.id || "").trim();
      remarkTitle.textContent = `${platformLabel(acc?.platform)}｜${String(acc?.name || acc?.id || "").trim() || "账号"}`;
      remarkInput.value = String(acc?.remark || "").trim();
      openModal(remarkOverlay, remarkModal);
      setTimeout(() => {
        try {
          remarkInput.focus();
          remarkInput.select();
        } catch {}
      }, 0);
    };
    const closeRemarkModal = () => {
      activeRemarkId = "";
      remarkInput.value = "";
      remarkTitle.textContent = "—";
      closeModal(remarkOverlay, remarkModal);
    };

    const getNetRule = () => {
      const v = String(readJson(NET_RULE_KEY, "ask") || "ask");
      return ["none", "default", "ask"].includes(v) ? v : "ask";
    };
    const setNetRule = (v) => writeJson(NET_RULE_KEY, String(v || "ask"));
    const getRecentRegions = () => {
      const arr = readJson(NET_REGION_KEY, []);
      return Array.isArray(arr) ? arr.map((x) => String(x || "").trim()).filter(Boolean) : [];
    };
    const pushRecentRegion = (r) => {
      const s = String(r || "").trim();
      if (!s) return;
      const prev = getRecentRegions();
      const next = [s, ...prev.filter((x) => x !== s)].slice(0, 6);
      writeJson(NET_REGION_KEY, next);
    };

    const renderPlatformList = () => {
      const platforms = [
        { id: "all", title: "全部平台" },
        { id: "douyin", title: "抖音" },
        { id: "xiaohongshu", title: "小红书" },
        { id: "kuaishou", title: "快手" },
        { id: "shipinhao", title: "视频号" }
      ];
      platformCount.textContent = String(platforms.length);
      platformList.innerHTML = platforms
        .map((p) => {
          const active = p.id === filterPlatform ? " is-active" : "";
          const cnt =
            p.id === "all"
              ? allAccounts.length
              : allAccounts.filter((x) => String(x.platform || "") === p.id).length;
          return `<button class="accm-side-item${active}" type="button" data-platform="${p.id}">
            <span class="accm-side-label">${renderPlatformIcon(p.id, p.title)}<span>${p.title}</span></span>
            <span class="pill">${cnt}</span>
          </button>`;
        })
        .join("");
      Array.from(platformList.querySelectorAll(".accm-side-item[data-platform]")).forEach((b) =>
        b.addEventListener("click", () => {
          filterPlatform = String(b.getAttribute("data-platform") || "all");
          renderPlatformList();
          renderAccounts();
        })
      );
    };

    const renderGroupList = () => {
      const list = [{ id: "all", name: "全部分组" }, ...allGroups];
      groupCount.textContent = String(list.length);
      groupList.innerHTML = list
        .map((g) => {
          const active = String(g.id) === filterGroupId ? " is-active" : "";
          const cnt =
            String(g.id) === "all"
              ? allAccounts.length
              : allAccounts.filter((x) => String(x.groupId || "") === String(g.id)).length;
          return `<button class="accm-side-item${active}" type="button" data-group="${g.id}">
            <span>${String(g.name || "")}</span>
            <span class="pill">${cnt}</span>
          </button>`;
        })
        .join("");
      Array.from(groupList.querySelectorAll(".accm-side-item[data-group]")).forEach((b) =>
        b.addEventListener("click", () => {
          filterGroupId = String(b.getAttribute("data-group") || "all");
          renderGroupList();
          renderAccounts();
        })
      );
    };

    const applyAccountFilters = (items) => {
      let out = Array.isArray(items) ? items.slice() : [];
      if (filterPlatform !== "all") out = out.filter((x) => String(x.platform || "") === filterPlatform);
      if (filterGroupId !== "all") out = out.filter((x) => String(x.groupId || "") === filterGroupId);
      if (filterStatus !== "all") out = out.filter((x) => getStatus(x) === filterStatus);
      if (filterOperator !== "all") out = out.filter((x) => String(x.operator || "") === filterOperator);
      return out;
    };

    const renderAccounts = () => {
      const filtered = applyAccountFilters(allAccounts);
      if (!filtered.length) {
        empty.hidden = false;
        grid.hidden = true;
        list.hidden = true;
        grid.innerHTML = "";
        list.innerHTML = "";
        return;
      }
      empty.hidden = true;

      const viewIsGrid = viewMode === "grid";
      grid.hidden = !viewIsGrid;
      list.hidden = viewIsGrid;
      viewGridBtn.classList.toggle("is-active", viewIsGrid);
      viewListBtn.classList.toggle("is-active", !viewIsGrid);

      const groupNameById = Object.fromEntries(allGroups.map((g) => [String(g.id), String(g.name)]));

      const cardHtml = (it, { asList }) => {
        const id = String(it.id || "");
        const name = String(it.name || "").trim() || `${platformLabel(it.platform)}账号`;
        const avatarUrl = String(it.avatarUrl || "").trim();
        const remark = String(it.remark || "").trim();
        const plat = platformLabel(it.platform);
        const st = getStatus(it);
        const stLabel = st === "normal" ? "正常" : "失效";
        const stCls = st === "normal" ? "is-ok" : "is-bad";
        const groupLabel = groupNameById[String(it.groupId || "")] || "未分组";
        const operatorLabel = String(it.operator || "").trim() || "未设置";
        const saved = Number(it.cookieCount || 0) > 0;
        const checked = selectedIds.has(id);
        const isDouyin = String(it.platform || "") === "douyin";
        const isXiaohongshu = String(it.platform || "") === "xiaohongshu";
        const isKuaishou = String(it.platform || "") === "kuaishou";
        const isShipinhao = String(it.platform || "") === "shipinhao";
        const dyId = String(it.douyinId || "").trim();
        const ksId = String(it.kuaishouId || "").trim();
        const spId = String(it.shipinhaoId || "").trim();
        const xhsUserId = String(it.xhsUserId || "").trim();
        const xhsRedId = String(it.xhsRedId || "").trim();
        const followerCount = Number(it.followerCount || 0) || 0;
        const followingCount = Number(it.followingCount || 0) || 0;
        const totalFavorited = Number(it.totalFavorited || 0) || 0;
        const videoCount = Number(it.videoCount || 0) || 0;
        const signature = String(it.signature || "").trim();
        const dashboardOpendDate = String(it.dashboardOpendDate || "").trim();
        const platformIcon = renderPlatformIcon(it.platform, plat, "accm-platform-badge-icon");
        const head = `<div class="accm-card-head">
          <label class="chk"><input type="checkbox" class="accm-check" data-id="${id}" ${checked ? "checked" : ""} /> 选择</label>
          <div class="accm-card-badges">
            <span class="pill">${platformIcon}<span>${plat}</span></span>
            <span class="pill ${stCls}">${stLabel}</span>
          </div>
        </div>`;
        const body = `<div class="accm-card-body">
          <div class="accm-profile">
            <div class="accm-avatar">${avatarUrl ? `<img src="${avatarUrl}" alt="" loading="lazy" referrerpolicy="no-referrer" />` : `<div class="accm-avatar-fallback">${name.slice(0, 1)}</div>`}</div>
            <div class="accm-profile-meta">
              <div class="accm-card-title">${name}</div>
              <div class="accm-card-sub">${saved ? "已保存登录" : "未保存登录"}｜Cookie ${Number(it.cookieCount || 0)}</div>
              <div class="accm-remark">
                <span class="pill">备注</span>
                <button class="btn accm-remark-btn" type="button" data-action="remark" data-id="${id}">${remark ? clip(remark, 20) : "点击设置备注"}</button>
              </div>
            </div>
          </div>
          <div class="accm-kv">
            <div class="accm-k"><span class="pill">分组</span><span>${groupLabel}</span></div>
            <div class="accm-k"><span class="pill">运营人</span><span>${operatorLabel}</span></div>
            ${
              isDouyin
                ? `<div class="accm-k"><span class="pill">抖音ID</span><span class="mono">${dyId || "—"}</span></div>
                   <div class="accm-metrics">
                     <span class="pill">粉丝 ${fmtNumShort(followerCount)}</span>
                     <span class="pill">关注 ${fmtNumShort(followingCount)}</span>
                     <span class="pill">获赞 ${fmtNumShort(totalFavorited)}</span>
                   </div>
                   <div class="accm-k"><span class="pill">简介</span><span class="accm-bio-text" title="${signature || ""}">${clip(signature, 34)}</span></div>
                   <div class="accm-k"><span class="pill">开通日期</span><span>${dashboardOpendDate || "—"}</span></div>`
                : isXiaohongshu
                  ? `<div class="accm-k"><span class="pill">小红书号</span><span class="mono">${xhsRedId || "—"}</span></div>
                     <div class="accm-metrics">
                       <span class="pill">粉丝 ${fmtNumShort(followerCount)}</span>
                       <span class="pill">关注 ${fmtNumShort(followingCount)}</span>
                       <span class="pill">收藏 ${fmtNumShort(totalFavorited)}</span>
                     </div>
                     <div class="accm-k"><span class="pill">简介</span><span class="accm-bio-text" title="${signature || ""}">${clip(signature, 34)}</span></div>`
                  : isKuaishou
                    ? `<div class="accm-k"><span class="pill">快手ID</span><span class="mono">${ksId || "—"}</span></div>
                       <div class="accm-metrics">
                         <span class="pill">粉丝 ${fmtNumShort(followerCount)}</span>
                         <span class="pill">关注 ${fmtNumShort(followingCount)}</span>
                         <span class="pill">获赞 ${fmtNumShort(totalFavorited)}</span>
                       </div>
                       <div class="accm-k"><span class="pill">简介</span><span class="accm-bio-text" title="${signature || ""}">${clip(signature, 34)}</span></div>`
                    : isShipinhao
                      ? `<div class="accm-k"><span class="pill">视频号ID</span><span class="mono">${spId || "—"}</span></div>
                         <div class="accm-metrics">
                           <span class="pill">粉丝 ${fmtNumShort(followerCount)}</span>
                           <span class="pill">视频 ${fmtNumShort(videoCount)}</span>
                         </div>`
                  : ""
            }
          </div>
        </div>`;
        const actions = `<div class="accm-card-actions">
          <button class="btn btn-primary" data-action="test" data-id="${id}">${st === "invalid" ? "重新登入" : "测试"}</button>
          <button class="btn btn-danger" data-action="delete" data-id="${id}">删除</button>
          <button class="btn" data-action="log" data-id="${id}">日志</button>
        </div>`;
        return asList
          ? `<div class="accm-row">${head}${body}${actions}</div>`
          : `<div class="accm-card">${head}${body}${actions}</div>`;
      };

      grid.innerHTML = filtered.map((it) => cardHtml(it, { asList: false })).join("");
      list.innerHTML = filtered.map((it) => cardHtml(it, { asList: true })).join("");

      const wire = (host) => {
        Array.from(host.querySelectorAll(".accm-avatar img")).forEach((img) => {
          img.addEventListener("error", () => {
            try {
              const box = img.closest(".accm-avatar");
              if (!box) return;
              const title = box.closest(".accm-profile")?.querySelector(".accm-card-title")?.textContent || "?";
              box.innerHTML = `<div class="accm-avatar-fallback">${String(title || "?").trim().slice(0, 1)}</div>`;
            } catch {}
          });
        });
        Array.from(host.querySelectorAll(".accm-check[data-id]")).forEach((chk) => {
          chk.addEventListener("change", () => {
            const id = String(chk.getAttribute("data-id") || "");
            if (!id) return;
            if (chk.checked) selectedIds.add(id);
            else selectedIds.delete(id);
          });
        });
        Array.from(host.querySelectorAll("button[data-action][data-id]")).forEach((btn) => {
          btn.addEventListener("click", async () => {
            const id = String(btn.getAttribute("data-id") || "");
            const action = String(btn.getAttribute("data-action") || "");
            const it = allAccounts.find((x) => String(x.id) === id) || null;
            if (!it) return;
            if (action === "delete") {
              if (!confirm(`确认删除账号：${it.name || it.id}？`)) return;
              const res = await window.api?.accounts?.remove?.({ id });
              if (!res?.ok) {
                toast(`删除失败：${String(res?.message || "")}`, "error");
                return;
              }
              toast("已删除。", "success");
              await loadAll();
              return;
            }
            if (action === "remark") {
              openRemarkModal(it);
              return;
            }
            if (action === "test") {
              const plat = String(it.platform || "") || "douyin";
              if (!["douyin", "xiaohongshu", "kuaishou", "shipinhao"].includes(plat)) {
                toast("当前仅支持抖音、小红书、快手、视频号账号测试。", "info");
                return;
              }
              if (getStatus(it) === "invalid") {
                await openLogin(plat, id, true);
                toast("重新登录后正在校验账号信息…", "info");
                const res2 = await window.api?.accounts?.test?.({ id });
                await loadAll();
                if (res2?.ok && res2?.valid) {
                  try {
                    closeModal(logOverlay, logModal);
                  } catch {}
                  toast("账号状态正常。", "success");
                } else if (res2?.ok && res2?.valid === false) {
                  toast(plat === "kuaishou" ? "没有获取到账号信息，登录失败" : "未能获取平台主页账号信息，请再次点击“重新登入”完成扫码登录。", "warning");
                } else {
                  toast(`校验失败：${String(res2?.message || "")}`, "error");
                }
                return;
              }
              btn.disabled = true;
              toast(
                plat === "xiaohongshu"
                  ? "正在校验小红书主页接口返回…"
                  : plat === "kuaishou"
                    ? "正在请求 infoV2 并检测 Cookie…"
                    : plat === "shipinhao"
                      ? "正在请求 auth_data 并检测视频号 Cookie…"
                    : "正在请求 user/info 并检测 Cookie…",
                "info"
              );
              const res = await window.api?.accounts?.test?.({ id });
              btn.disabled = false;
              if (!res?.ok) {
                toast(`测试失败：${String(res?.message || "")}`, "error");
                await loadAll();
                return;
              }
              await loadAll();
              if (!res?.valid) {
                toast(
                  plat === "kuaishou"
                    ? "没有获取到账号信息，登录失败"
                    : plat === "shipinhao"
                      ? "未能获取视频号 auth_data 账号信息，已标记为失效，请点击“重新登入”重新扫码登录。"
                      : "未能获取平台主页账号信息，已标记为失效，请点击“重新登入”重新扫码登录。",
                  "warning"
                );
                return;
              }
              try {
                closeModal(logOverlay, logModal);
              } catch {}
              toast("账号状态正常。", "success");
              return;
            }
            if (action === "log") {
              const res = await window.api?.accounts?.getLog?.({ id });
              if (!res?.ok) {
                toast(`获取日志失败：${String(res?.message || "")}`, "error");
                return;
              }
              const title = `${platformLabel(it.platform)}｜${String(it.name || it.id || "").trim() || "账号"}`;
              activeLogId = id;
              logTitle.textContent = title;
              const content = JSON.stringify(res?.log || { empty: true }, null, 2);
              logPre.textContent = content;
              logCopy.onclick = async () => {
                try {
                  await navigator.clipboard.writeText(content);
                  toast("日志已复制。", "success");
                } catch {
                  toast("复制失败。", "error");
                }
              };
              openModal(logOverlay, logModal);
              return;
            }
          });
        });
      };
      wire(grid);
      wire(list);
    };

    const renderAddGrid = () => {
      const items = [
        { id: "douyin", title: "抖音", enabled: true },
        { id: "kuaishou", title: "快手", enabled: true },
        { id: "shipinhao", title: "视频号", enabled: true },
        { id: "xiaohongshu", title: "小红书", enabled: true },
        { id: "bilibili", title: "B站", enabled: false },
        { id: "toutiao", title: "头条号", enabled: false },
        { id: "weibo", title: "微博", enabled: false },
        { id: "zhihu", title: "知乎", enabled: false },
        { id: "tiktok", title: "TikTok", enabled: false },
        { id: "youtube", title: "YouTube", enabled: false }
      ];
      addGrid.innerHTML = items
        .map((x) => {
          const cls = x.enabled ? "accm-add-item" : "accm-add-item is-disabled";
          const sub = x.enabled ? "支持" : "后续开发";
          const platformIcon = renderPlatformIcon(x.id, x.title, "accm-add-icon-img");
          return `<button class="${cls}" type="button" data-platform="${x.id}" ${x.enabled ? "" : "disabled"}>
            <div class="accm-add-icon">${platformIcon || x.title.slice(0, 1)}</div>
            <div class="accm-add-title">${x.title}</div>
            <div class="accm-add-sub">${sub}</div>
          </button>`;
        })
        .join("");
      Array.from(addGrid.querySelectorAll(".accm-add-item[data-platform]")).forEach((b) =>
        b.addEventListener("click", () => beginAddAccount(b.getAttribute("data-platform")))
      );
    };

    const renderNetModal = () => {
      netRuleSel.value = getNetRule();
    };

    const renderRegions = (query) => {
      const base = [
        "北京",
        "上海",
        "广东·广州",
        "广东·深圳",
        "浙江·杭州",
        "江苏·南京",
        "四川·成都",
        "湖北·武汉",
        "山东·济南",
        "福建·福州",
        "辽宁·沈阳",
        "河南·郑州",
        "云南·昆明",
        "新疆·乌鲁木齐"
      ];
      const q = String(query || "").trim();
      const list = q ? base.filter((x) => x.includes(q)) : base;
      regionTags.innerHTML = list
        .map((x) => {
          const active = x === pendingRegion ? " is-active" : "";
          return `<button class="pill accm-region-tag${active}" type="button" data-region="${x}">${x}</button>`;
        })
        .join("");
      Array.from(regionTags.querySelectorAll(".accm-region-tag[data-region]")).forEach((b) =>
        b.addEventListener("click", () => {
          pendingRegion = String(b.getAttribute("data-region") || "");
          renderRegions(regionSearch.value);
          renderRecentRegions();
        })
      );
    };

    const renderRecentRegions = () => {
      const list = getRecentRegions();
      if (!list.length) {
        regionRecent.innerHTML = `<div class="empty">暂无。</div>`;
        return;
      }
      regionRecent.innerHTML = list
        .map((x) => {
          const active = x === pendingRegion ? " is-active" : "";
          return `<button class="pill accm-region-tag${active}" type="button" data-region="${x}">${x}</button>`;
        })
        .join("");
      Array.from(regionRecent.querySelectorAll(".accm-region-tag[data-region]")).forEach((b) =>
        b.addEventListener("click", () => {
          pendingRegion = String(b.getAttribute("data-region") || "");
          renderRegions(regionSearch.value);
          renderRecentRegions();
        })
      );
    };

    const needAskRegion = () => {
      const rule = getNetRule();
      if (rule === "none") return false;
      if (rule === "default") return true;
      if (rule === "ask") return !readJson("ipfactory.accounts.rememberRegion.v1", false);
      return true;
    };

    const beginAddAccount = async (platform, accountId) => {
      const p = String(platform || "").trim();
      const enabled = ["douyin", "kuaishou", "shipinhao", "xiaohongshu"].includes(p);
      if (!enabled) {
        toast("该平台后续开发。", "info");
        return;
      }
      pendingAddPlatform = p;
      pendingLoginAccountId = String(accountId || "").trim();
      if (needAskRegion()) {
        pendingRegion = getRecentRegions()[0] || "浙江·杭州";
        regionSearch.value = "";
        regionRemember.checked = Boolean(readJson("ipfactory.accounts.rememberRegion.v1", false));
        renderRegions("");
        renderRecentRegions();
        openModal(regionOverlay, regionModal);
        return;
      }
      await openLogin(p, pendingLoginAccountId, false);
    };

    const openLogin = async (platform, accountId, awaitResult = false) => {
      try {
        closeModal(addOverlay, addModal);
      } catch {}
      try {
        try {
          await window.api?.testLog?.append?.({
            source: "账号管理",
            level: "info",
            message: `点击添加账号：platform=${String(platform || "")} id=${String(accountId || "") || "-"}`
          });
        } catch {}
        loginBusy = true;
        if (pendingRegion) pushRecentRegion(pendingRegion);
        const res = await window.api?.accounts?.openLoginExternal?.({ platform, id: accountId });
        try {
          await window.api?.testLog?.append?.({
            source: "账号管理",
            level: "info",
            message: `openLoginExternal 返回：platform=${String(platform || "")} ok=${String(!!res?.ok)} id=${String(res?.id || "")}`
          });
        } catch {}
        if (!res?.ok) {
          toast(`打开登录失败：${String(res?.message || "")}`, "error");
          return;
        }
        const reqId = String(res?.id || "").trim();
        if (!reqId) {
          toast("打开登录失败：missing request id", "error");
          return;
        }
        if (activeLoginRequests.has(reqId)) return;
        activeLoginRequests.add(reqId);
        toast(
          String(platform || "").trim() === "douyin"
            ? "请在5分钟内登录抖音账号，超时会自动关闭登录网页。"
            : "已用本地浏览器打开登录页：扫码成功后会自动保存账号。",
          "info"
        );
        const doWait = async () => {
          const wr = await window.api?.accounts?.waitResult?.({ id: reqId, timeoutMs: 300000 });
          const plat = String(platform || "").trim();
          if (wr?.ok && wr?.saved) {
            toast("账号登录成功，已自动保存。", "success");
            if (plat === "douyin") {
              await confirmDialog({
                title: "抖音首次发布提醒",
                message:
                  "因为抖音平台风控原因，新添加的抖音号第一次发布内容时，通常需要手机验证码核对；成功发布一次内容之后，后续就可以正常使用一键发布功能。",
                confirmText: "我知道了",
                cancelText: "关闭",
                tone: "warn"
              }).catch(() => false);
            }
          } else if (wr?.ok && wr?.canceled) {
            toast("已取消登录（未保存账号）。", "info");
          } else if (wr?.ok && wr?.timeout) {
            if (plat === "kuaishou") toast("登录超时，请重新登录", "error");
            else toast("登录失败:登录超时，请在5分钟内完成扫码登录", "error");
          } else if (wr?.ok && wr?.saved === false) {
            if (plat === "kuaishou") toast("没有获取到账号信息，登录失败", "error");
            else toast("未检测到登录成功（未保存账号）。", "warning");
          } else {
            toast(`登录流程异常：${String(wr?.message || "")}`, "error");
          }
          await loadAll();
          return wr;
        };
        if (awaitResult === true) {
          try {
            return await doWait();
          } finally {
            activeLoginRequests.delete(reqId);
          }
        }
        doWait()
          .catch((e) => {
            toast(`登录流程异常：${String(e?.message || e)}`, "error");
          })
          .finally(() => {
            activeLoginRequests.delete(reqId);
          });
      } catch (e) {
        toast(`打开登录失败：${String(e?.message || e)}`, "error");
      } finally {
        loginBusy = false;
      }
    };

    const loadAll = async () => {
      if (loadAllPromise) return loadAllPromise;
      loadAllPromise = (async () => {
        const a = await window.api?.accounts?.list?.();
        allAccounts = a?.ok && Array.isArray(a.items) ? a.items : [];
        const g = await window.api?.accounts?.groupsList?.();
        allGroups = g?.ok && Array.isArray(g.items) ? g.items : [];
        try {
          window.dispatchEvent(new CustomEvent("ipfactory:accountsChanged", { detail: { items: allAccounts } }));
        } catch {}
        renderPlatformList();
        renderGroupList();
        renderAccounts();
        renderGroupsTab();
      })();
      try {
        await loadAllPromise;
      } finally {
        loadAllPromise = null;
      }
    };
    const refreshCurrentMenu = () => {
      const currentHash = String(window.location.hash || "").split("?")[0].trim();
      if (currentHash !== "#/accounts") return;
      loadAll().catch(() => {});
    };
    const triggerSilentStatusRefreshOnFirstEnter = () => {
      if (window.__ipfactoryAccountsFirstEnterRefreshStarted) return;
      window.__ipfactoryAccountsFirstEnterRefreshStarted = true;
      const p = window.api?.accounts?.refreshAllStatuses?.();
      if (!p || typeof p.then !== "function") return;
      p.then((res) => {
        try {
          window.dispatchEvent(new CustomEvent("ipfactory:accountsSilentRefreshDone", { detail: res || null }));
        } catch {}
      }).catch(() => {});
    };

    try {
      if (window.__ipfactoryAccountsSilentRefreshDoneHandler) {
        window.removeEventListener("ipfactory:accountsSilentRefreshDone", window.__ipfactoryAccountsSilentRefreshDoneHandler);
      }
    } catch {}
    window.__ipfactoryAccountsSilentRefreshDoneHandler = () => {
      loadAll().catch(() => {});
    };
    window.addEventListener("ipfactory:accountsSilentRefreshDone", window.__ipfactoryAccountsSilentRefreshDoneHandler);

    try {
      if (window.__ipfactoryAccountsHashRefreshHandler) {
        window.removeEventListener("hashchange", window.__ipfactoryAccountsHashRefreshHandler);
      }
    } catch {}
    window.__ipfactoryAccountsHashRefreshHandler = refreshCurrentMenu;
    window.addEventListener("hashchange", window.__ipfactoryAccountsHashRefreshHandler);

    try {
      if (window.__ipfactoryAccountsAuthRefreshHandler) {
        window.removeEventListener("ipfactory:authChanged", window.__ipfactoryAccountsAuthRefreshHandler);
      }
    } catch {}
    window.__ipfactoryAccountsAuthRefreshHandler = refreshCurrentMenu;
    window.addEventListener("ipfactory:authChanged", window.__ipfactoryAccountsAuthRefreshHandler);

    const renderGroupsTab = () => {
      groupsCount.textContent = String(allGroups.length);
      if (!allGroups.length) {
        groupsEmpty.hidden = false;
        groupsList.hidden = true;
        groupsList.innerHTML = "";
        groupActive.textContent = "未选择";
        groupName.value = "";
        groupDel.disabled = true;
        groupSave.disabled = true;
        return;
      }
      groupsEmpty.hidden = true;
      groupsList.hidden = false;
      groupsList.innerHTML = allGroups
        .map((x) => `<button class="accm-side-item" type="button" data-gid="${x.id}">
          <span>${x.name}</span><span class="pill">—</span>
        </button>`)
        .join("");
      Array.from(groupsList.querySelectorAll(".accm-side-item[data-gid]")).forEach((b) =>
        b.addEventListener("click", () => {
          const id = String(b.getAttribute("data-gid") || "");
          const it = allGroups.find((x) => x.id === id) || null;
          if (!it) return;
          groupActive.textContent = `ID：${it.id}`;
          groupName.value = it.name;
          groupDel.disabled = false;
          groupSave.disabled = false;
          groupSave.setAttribute("data-gid", it.id);
          groupDel.setAttribute("data-gid", it.id);
        })
      );
    };

    btnRefresh.addEventListener("click", loadAll);
    statusSel.addEventListener("change", () => {
      filterStatus = String(statusSel.value || "all");
      renderAccounts();
    });
    operatorSel.addEventListener("change", () => {
      filterOperator = String(operatorSel.value || "all");
      renderAccounts();
    });
    batchSel.addEventListener("change", async () => {
      const action = String(batchSel.value || "");
      batchSel.value = "";
      const ids = Array.from(selectedIds);
      if (!ids.length) {
        toast("请先勾选账号。", "warn");
        return;
      }
      if (action === "delete") {
        if (!confirm(`确认删除选中的 ${ids.length} 个账号？`)) return;
        for (const id of ids) {
          await window.api?.accounts?.remove?.({ id });
        }
        selectedIds = new Set();
        toast("批量删除完成。", "success");
        await loadAll();
        return;
      }
      if (action === "setOperator") {
        toast("运营人设置为预留能力（后续联网）。", "info");
      }
    });

    viewGridBtn.addEventListener("click", () => {
      viewMode = "grid";
      writeJson(VIEW_KEY, viewMode);
      renderAccounts();
    });
    viewListBtn.addEventListener("click", () => {
      viewMode = "list";
      writeJson(VIEW_KEY, viewMode);
      renderAccounts();
    });

    btnAdd.addEventListener("click", () => {
      renderAddGrid();
      openModal(addOverlay, addModal);
    });
    addClose.addEventListener("click", () => closeModal(addOverlay, addModal));
    addOverlay.addEventListener("click", () => closeModal(addOverlay, addModal));
    btnNet.addEventListener("click", () => {
      renderNetModal();
      openModal(netOverlay, netModal);
    });

    netClose.addEventListener("click", () => closeModal(netOverlay, netModal));
    netCancel.addEventListener("click", () => closeModal(netOverlay, netModal));
    netOverlay.addEventListener("click", () => closeModal(netOverlay, netModal));
    netSave.addEventListener("click", () => {
      setNetRule(netRuleSel.value);
      toast("网络设置已保存。", "success");
      closeModal(netOverlay, netModal);
    });

    regionClose.addEventListener("click", () => closeModal(regionOverlay, regionModal));
    regionOverlay.addEventListener("click", () => closeModal(regionOverlay, regionModal));
    regionSearch.addEventListener("input", () => renderRegions(regionSearch.value));
    regionOk.addEventListener("click", async () => {
      if (!pendingRegion) {
        toast("请选择网络区域。", "warn");
        return;
      }
      writeJson("ipfactory.accounts.rememberRegion.v1", regionRemember.checked === true);
      closeModal(regionOverlay, regionModal);
      await openLogin(pendingAddPlatform, pendingLoginAccountId);
    });

    logClose.addEventListener("click", () => closeModal(logOverlay, logModal));
    logOverlay.addEventListener("click", () => closeModal(logOverlay, logModal));
    remarkClose.addEventListener("click", closeRemarkModal);
    remarkCancel.addEventListener("click", closeRemarkModal);
    remarkOverlay.addEventListener("click", closeRemarkModal);
    remarkInput.addEventListener("keydown", async (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      remarkSave.click();
    });
    remarkSave.addEventListener("click", async () => {
      const id = String(activeRemarkId || "").trim();
      if (!id) return;
      const val = String(remarkInput.value || "").trim();
      remarkSave.disabled = true;
      try {
        const res = await window.api?.accounts?.updateMeta?.({ id, patch: { remark: val } });
        if (!res?.ok) {
          toast(`备注保存失败：${String(res?.message || "")}`, "error");
          return;
        }
        const idx = allAccounts.findIndex((x) => String(x.id || "") === id);
        if (idx >= 0) allAccounts[idx] = { ...allAccounts[idx], remark: val, updatedAt: Number(res?.item?.updatedAt || Date.now()) || Date.now() };
        renderAccounts();
        closeRemarkModal();
        toast("备注已保存。", "success");
      } finally {
        remarkSave.disabled = false;
      }
    });
    logClear.addEventListener("click", async () => {
      const id = String(activeLogId || "").trim();
      if (!id) {
        logPre.textContent = "—";
        return;
      }
      const res = await window.api?.accounts?.clearLog?.({ id });
      if (!res?.ok) {
        toast(`清空失败：${String(res?.message || "")}`, "error");
        return;
      }
      logPre.textContent = "—";
      toast("已清空。", "success");
      await loadAll();
    });

    groupsAdd.addEventListener("click", async () => {
      const name = prompt("请输入分组名称：");
      if (!name) return;
      const res = await window.api?.accounts?.groupsSave?.({ group: { name } });
      if (!res?.ok) {
        toast(`创建失败：${String(res?.message || "")}`, "error");
        return;
      }
      toast("分组已创建。", "success");
      await loadAll();
      setTab("groups");
    });

    groupSave.addEventListener("click", async () => {
      const id = String(groupSave.getAttribute("data-gid") || "").trim();
      if (!id) return;
      const name = String(groupName.value || "").trim();
      if (!name) {
        toast("请输入分组名称。", "warn");
        return;
      }
      const res = await window.api?.accounts?.groupsSave?.({ group: { id, name } });
      if (!res?.ok) {
        toast(`保存失败：${String(res?.message || "")}`, "error");
        return;
      }
      toast("保存成功。", "success");
      await loadAll();
      setTab("groups");
    });

    groupDel.addEventListener("click", async () => {
      const id = String(groupDel.getAttribute("data-gid") || "").trim();
      if (!id) return;
      if (!confirm("确认删除该分组？")) return;
      const res = await window.api?.accounts?.groupsRemove?.({ id });
      if (!res?.ok) {
        toast(`删除失败：${String(res?.message || "")}`, "error");
        return;
      }
      toast("已删除。", "success");
      groupActive.textContent = "未选择";
      groupName.value = "";
      groupDel.disabled = true;
      groupSave.disabled = true;
      await loadAll();
      setTab("groups");
    });

    renderAddGrid();
    await loadAll();
    triggerSilentStatusRefreshOnFirstEnter();
    return root;
  }
};
