import { elFromHTML } from "../ui.js";
import {
  calcTrafficStage,
  formatNumber,
  formatPercent,
  getContentAccountProfiles,
  getContentRecords,
  getDashboardOverview,
  getPrivateDomainOverview,
  getTopPortraitItem,
  summarizePortraitGroups
} from "../data/jingyingzhongxindata.js";

function renderBarList(items, { type = "front", maxCount = 6, detailPrefix = "" } = {}) {
  const list = summarizePortraitGroups(items);
  const max = Math.max(...list.map((item) => Number(item.value || 0)), 1);
  const rows = list
    .map(
      (item, index) => `
        <div class="screen-portrait-item${index >= maxCount ? " is-hidden-row" : ""}" data-label="${item.name}" data-value="${item.value}" data-note="${item.note || "占全部样本比例"}" data-detail="${detailPrefix}${item.name} ${item.value}%${item.note ? `｜${item.note}` : ""}">
          <div class="screen-portrait-meta">
            <span class="screen-portrait-name"><i>${index + 1}</i>${item.name}</span>
            <strong>${item.value}%<em>${item.note || "占全部样本比例"}</em></strong>
          </div>
          <div class="screen-portrait-track ${type}">
            <div class="screen-portrait-bar ${type}" style="width:${(item.value / max) * 100}%"></div>
          </div>
        </div>
      `
    )
    .join("");
  const expand = list.length > maxCount ? `<button type="button" class="screen-expand-hint">查看完整分布 <span>↗</span></button>` : "";
  return `${rows}${expand}`;
}

function hotspotStyle(index, total, weight) {
  const angle = (Math.PI * 2 * index) / Math.max(total, 1);
  const radius = 34 + ((index % 3) * 12 + Math.min(20, Number(weight || 0) * 0.08));
  const x = Math.round(Math.cos(angle) * radius);
  const y = Math.round(Math.sin(angle) * radius);
  return `left: calc(50% + ${x}px); top: calc(50% + ${y}px);`;
}

function readDataScreenDisplayOptions() {
  const raw = String(window.location.hash || "").replace(/^#/, "").trim();
  const [, queryPart] = raw.split("?");
  const query = new URLSearchParams(queryPart || "");
  const sceneId = String(query.get("scene") || "entity").trim() || "entity";
  const mode = String(query.get("mode") || "front").trim() || "front";
  const display = String(query.get("display") || "").trim();
  const popout = String(query.get("popout") || "").trim();
  return {
    sceneId,
    mode: mode === "back" ? "back" : "front",
    popout: display === "popout" || popout === "1"
  };
}

export const route = {
  path: "/data-screen",
  title: "数据大屏",
  async render() {
    const displayOptions = readDataScreenDisplayOptions();
    const isPopoutMode = displayOptions.popout === true;
    const entityScene = {
      id: "entity",
      name: "实体门店获客",
      subtitle: "当前场景面向本地门店、连锁经营和实体服务的内容获客与私域成交。",
      goals: ["同城引流", "评论转私信", "门店到店", "低成本试单"],
      audiences: ["门店老板", "店长", "市场负责人", "运营负责人"],
      dashboard: getDashboardOverview(),
      contentRecords: getContentRecords(),
      privateDomain: getPrivateDomainOverview(),
      accountProfiles: getContentAccountProfiles()
    };

    const foreignTradeScene = {
      id: "foreign_trade",
      name: "外贸纸业产业链",
      subtitle: "模拟纸业外贸企业的获客与成交场景，重点关注询盘、样品、交期、认证、MOQ 和区域采购差异。",
      goals: ["获取海外询盘", "沉淀采购线索", "提升样品申请", "推进大货成交"],
      audiences: ["海外采购经理", "品牌商老板", "进口商", "分销商", "供应链负责人"],
      dashboard: {
        accountSummary: {
          totalAccounts: 28,
          activeAccounts: 24,
          normalAccounts: 22,
          warningAccounts: 4,
          invalidAccounts: 2
        },
        dailyTrend: [
          { day: "周一", play: 46, leads: 18, deals: 2 },
          { day: "周二", play: 58, leads: 21, deals: 3 },
          { day: "周三", play: 63, leads: 25, deals: 3 },
          { day: "周四", play: 72, leads: 29, deals: 4 },
          { day: "周五", play: 81, leads: 34, deals: 5 },
          { day: "周六", play: 69, leads: 26, deals: 3 },
          { day: "周日", play: 65, leads: 24, deals: 3 }
        ],
        accountRanking: [
          { name: "纸业外贸-LinkedIn01", platform: "LinkedIn", publishCount: 18, leads: 52, revenue: 468000 },
          { name: "纸业外贸-TikTok02", platform: "TikTok", publishCount: 27, leads: 44, revenue: 356000 },
          { name: "纸业外贸-独立站内容号", platform: "独立站", publishCount: 14, leads: 39, revenue: 428000 },
          { name: "纸业外贸-YouTube03", platform: "YouTube", publishCount: 11, leads: 28, revenue: 219000 }
        ],
        geoHotspots: [
          { name: "迪拜", lng: 55.27, lat: 25.2, value: 88, type: "中东纸品采购热区" },
          { name: "雅加达", lng: 106.82, lat: -6.17, value: 74, type: "东南亚经销询盘区" },
          { name: "利雅得", lng: 46.71, lat: 24.71, value: 61, type: "酒店纸品需求区" },
          { name: "开罗", lng: 31.24, lat: 30.04, value: 55, type: "北非批发采购区" },
          { name: "圣保罗", lng: -46.63, lat: -23.55, value: 47, type: "南美渠道代理区" }
        ]
      },
      contentRecords: [
        {
          id: "ft_001",
          title: "Jumbo Roll Tissue Supplier | 48h Sample Ready",
          account: "纸业外贸-LinkedIn01",
          platform: "LinkedIn",
          publishTime: "2026-07-10 16:30",
          topic: "纸巾原纸供应",
          playCount: 48200,
          likeCount: 1380,
          commentCount: 206,
          shareCount: 118,
          collectCount: 184,
          finishRate: 0.36,
          dmCount: 93,
          leadCount: 41,
          convertCount: 5,
          marketingStrength: 0.78,
          stageLabel: "精准试探期",
          audienceProfile: {
            regions: [
              { name: "中东", value: 32 },
              { name: "东南亚", value: 24 },
              { name: "非洲", value: 18 },
              { name: "南美", value: 14 },
              { name: "欧洲", value: 12 }
            ],
            ages: [
              { name: "28-35岁", value: 31 },
              { name: "36-42岁", value: 34 },
              { name: "43-50岁", value: 21 },
              { name: "50岁以上", value: 14 }
            ],
            genders: [
              { name: "男性", value: 71 },
              { name: "女性", value: 29 }
            ],
            roles: [
              { name: "采购经理", value: 33 },
              { name: "进口商老板", value: 24 },
              { name: "供应链负责人", value: 18 },
              { name: "区域代理", value: 14 },
              { name: "品牌采购", value: 11 }
            ],
            industries: [
              { name: "生活用纸进口", value: 29 },
              { name: "酒店耗材分销", value: 22 },
              { name: "商超渠道", value: 18 },
              { name: "纸品加工厂", value: 17 },
              { name: "跨境贸易", value: 14 }
            ],
            intentions: [
              { name: "索要样品", value: 30 },
              { name: "确认 MOQ", value: 24 },
              { name: "询问交期", value: 22 },
              { name: "认证要求", value: 14 },
              { name: "代理合作", value: 10 }
            ]
          }
        },
        {
          id: "ft_002",
          title: "Why GCC Buyers Choose FSC Certified Tissue Paper",
          account: "纸业外贸-TikTok02",
          platform: "TikTok",
          publishTime: "2026-07-09 20:10",
          topic: "纸品认证",
          playCount: 69300,
          likeCount: 2640,
          commentCount: 362,
          shareCount: 196,
          collectCount: 318,
          finishRate: 0.42,
          dmCount: 128,
          leadCount: 55,
          convertCount: 7,
          marketingStrength: 0.83,
          stageLabel: "扩散放量期",
          audienceProfile: {
            regions: [
              { name: "中东", value: 37 },
              { name: "东南亚", value: 19 },
              { name: "欧洲", value: 16 },
              { name: "非洲", value: 15 },
              { name: "南美", value: 13 }
            ],
            ages: [
              { name: "25-32岁", value: 28 },
              { name: "33-40岁", value: 39 },
              { name: "41-48岁", value: 22 },
              { name: "48岁以上", value: 11 }
            ],
            genders: [
              { name: "男性", value: 68 },
              { name: "女性", value: 32 }
            ],
            roles: [
              { name: "品牌采购", value: 28 },
              { name: "采购经理", value: 27 },
              { name: "质检 / 合规负责人", value: 19 },
              { name: "进口商老板", value: 16 },
              { name: "区域经销商", value: 10 }
            ],
            industries: [
              { name: "酒店供应链", value: 25 },
              { name: "零售品牌", value: 23 },
              { name: "生活用纸进口", value: 21 },
              { name: "母婴护理纸品", value: 16 },
              { name: "快消分销", value: 15 }
            ],
            intentions: [
              { name: "确认 FSC / ISO", value: 34 },
              { name: "要检测报告", value: 23 },
              { name: "要包装方案", value: 19 },
              { name: "咨询交货周期", value: 14 },
              { name: "询代理价格", value: 10 }
            ]
          }
        },
        {
          id: "ft_003",
          title: "Custom Packing for Tissue Buyers | OEM for Supermarkets",
          account: "纸业外贸-独立站内容号",
          platform: "独立站",
          publishTime: "2026-07-08 14:00",
          topic: "OEM定制",
          playCount: 31800,
          likeCount: 980,
          commentCount: 114,
          shareCount: 61,
          collectCount: 132,
          finishRate: 0.29,
          dmCount: 64,
          leadCount: 29,
          convertCount: 4,
          marketingStrength: 0.69,
          stageLabel: "精准试探期",
          audienceProfile: {
            regions: [
              { name: "欧洲", value: 24 },
              { name: "中东", value: 23 },
              { name: "南美", value: 18 },
              { name: "东南亚", value: 18 },
              { name: "非洲", value: 17 }
            ],
            ages: [
              { name: "28-35岁", value: 26 },
              { name: "36-42岁", value: 33 },
              { name: "43-50岁", value: 24 },
              { name: "50岁以上", value: 17 }
            ],
            genders: [
              { name: "男性", value: 63 },
              { name: "女性", value: 37 }
            ],
            roles: [
              { name: "超市采购", value: 27 },
              { name: "品牌老板", value: 21 },
              { name: "进口商", value: 20 },
              { name: "包装负责人", value: 17 },
              { name: "渠道代理", value: 15 }
            ],
            industries: [
              { name: "商超自有品牌", value: 28 },
              { name: "生活用纸品牌", value: 24 },
              { name: "纸品分销", value: 19 },
              { name: "快消渠道", value: 16 },
              { name: "跨境贸易", value: 13 }
            ],
            intentions: [
              { name: "定制包装", value: 32 },
              { name: "确认打样周期", value: 21 },
              { name: "问私模能力", value: 19 },
              { name: "问最小起订量", value: 18 },
              { name: "问年度合作", value: 10 }
            ]
          }
        },
        {
          id: "ft_004",
          title: "Paper Cup Base Paper Wholesale | Stable Moisture Control",
          account: "纸业外贸-YouTube03",
          platform: "YouTube",
          publishTime: "2026-07-07 11:50",
          topic: "纸杯原纸",
          playCount: 21400,
          likeCount: 560,
          commentCount: 78,
          shareCount: 28,
          collectCount: 83,
          finishRate: 0.23,
          dmCount: 35,
          leadCount: 14,
          convertCount: 2,
          marketingStrength: 0.58,
          stageLabel: "冷启动观察期",
          audienceProfile: {
            regions: [
              { name: "东南亚", value: 28 },
              { name: "中东", value: 22 },
              { name: "非洲", value: 19 },
              { name: "南美", value: 17 },
              { name: "欧洲", value: 14 }
            ],
            ages: [
              { name: "27-34岁", value: 24 },
              { name: "35-41岁", value: 31 },
              { name: "42-48岁", value: 26 },
              { name: "48岁以上", value: 19 }
            ],
            genders: [
              { name: "男性", value: 74 },
              { name: "女性", value: 26 }
            ],
            roles: [
              { name: "工厂采购", value: 29 },
              { name: "生产负责人", value: 24 },
              { name: "外贸经理", value: 18 },
              { name: "纸杯加工厂老板", value: 17 },
              { name: "设备配套商", value: 12 }
            ],
            industries: [
              { name: "餐饮包装", value: 31 },
              { name: "纸杯加工", value: 26 },
              { name: "纸品批发", value: 18 },
              { name: "食品包装", value: 15 },
              { name: "供应链服务", value: 10 }
            ],
            intentions: [
              { name: "问克重稳定性", value: 27 },
              { name: "问防潮参数", value: 24 },
              { name: "问报价", value: 21 },
              { name: "问装柜和交期", value: 18 },
              { name: "问试单", value: 10 }
            ]
          }
        }
      ],
      accountProfiles: {
        "纸业外贸-LinkedIn01": {
          regions: [
            { name: "中东", value: 34 },
            { name: "东南亚", value: 23 },
            { name: "非洲", value: 18 },
            { name: "南美", value: 14 },
            { name: "欧洲", value: 11 }
          ],
          ages: [
            { name: "28-35岁", value: 29 },
            { name: "36-42岁", value: 35 },
            { name: "43-50岁", value: 23 },
            { name: "50岁以上", value: 13 }
          ],
          genders: [
            { name: "男性", value: 69 },
            { name: "女性", value: 31 }
          ],
          industries: [
            { name: "纸品进口", value: 27 },
            { name: "酒店供应链", value: 22 },
            { name: "商超渠道", value: 19 },
            { name: "跨境分销", value: 17 },
            { name: "纸品加工", value: 15 }
          ],
          identities: [
            { name: "采购经理", value: 32 },
            { name: "进口商老板", value: 25 },
            { name: "供应链负责人", value: 18 },
            { name: "经销商", value: 14 },
            { name: "品牌采购", value: 11 }
          ]
        },
        "纸业外贸-TikTok02": {
          regions: [
            { name: "中东", value: 36 },
            { name: "欧洲", value: 17 },
            { name: "东南亚", value: 17 },
            { name: "非洲", value: 16 },
            { name: "南美", value: 14 }
          ],
          ages: [
            { name: "25-32岁", value: 27 },
            { name: "33-40岁", value: 38 },
            { name: "41-48岁", value: 23 },
            { name: "48岁以上", value: 12 }
          ],
          genders: [
            { name: "男性", value: 66 },
            { name: "女性", value: 34 }
          ],
          industries: [
            { name: "酒店纸品", value: 24 },
            { name: "零售品牌", value: 24 },
            { name: "进口商", value: 21 },
            { name: "认证供应链", value: 16 },
            { name: "批发代理", value: 15 }
          ],
          identities: [
            { name: "品牌采购", value: 29 },
            { name: "采购经理", value: 26 },
            { name: "质检负责人", value: 18 },
            { name: "老板", value: 16 },
            { name: "代理商", value: 11 }
          ]
        },
        "纸业外贸-独立站内容号": {
          regions: [
            { name: "欧洲", value: 25 },
            { name: "中东", value: 22 },
            { name: "南美", value: 19 },
            { name: "东南亚", value: 18 },
            { name: "非洲", value: 16 }
          ],
          ages: [
            { name: "28-35岁", value: 24 },
            { name: "36-42岁", value: 34 },
            { name: "43-50岁", value: 25 },
            { name: "50岁以上", value: 17 }
          ],
          genders: [
            { name: "男性", value: 61 },
            { name: "女性", value: 39 }
          ],
          industries: [
            { name: "商超品牌", value: 28 },
            { name: "纸品品牌", value: 24 },
            { name: "分销渠道", value: 19 },
            { name: "跨境贸易", value: 16 },
            { name: "OEM采购", value: 13 }
          ],
          identities: [
            { name: "品牌老板", value: 22 },
            { name: "超市采购", value: 26 },
            { name: "进口商", value: 20 },
            { name: "包装负责人", value: 18 },
            { name: "经销商", value: 14 }
          ]
        },
        "纸业外贸-YouTube03": {
          regions: [
            { name: "东南亚", value: 29 },
            { name: "中东", value: 23 },
            { name: "非洲", value: 19 },
            { name: "南美", value: 16 },
            { name: "欧洲", value: 13 }
          ],
          ages: [
            { name: "27-34岁", value: 22 },
            { name: "35-41岁", value: 32 },
            { name: "42-48岁", value: 27 },
            { name: "48岁以上", value: 19 }
          ],
          genders: [
            { name: "男性", value: 73 },
            { name: "女性", value: 27 }
          ],
          industries: [
            { name: "餐饮包装", value: 31 },
            { name: "纸杯加工", value: 27 },
            { name: "纸品批发", value: 18 },
            { name: "食品包装", value: 14 },
            { name: "供应链配套", value: 10 }
          ],
          identities: [
            { name: "工厂采购", value: 28 },
            { name: "生产负责人", value: 24 },
            { name: "外贸经理", value: 19 },
            { name: "工厂老板", value: 17 },
            { name: "配套商", value: 12 }
          ]
        }
      },
      privateDomain: {
        summary: {
          totalUsers: 3860,
          todayNewUsers: 34,
          weekNewUsers: 206,
          monthNewUsers: 918,
          todayInquiries: 17,
          weekInquiries: 96,
          monthInquiries: 386,
          todayDeals: 2,
          weekDeals: 9,
          monthDeals: 38,
          todayRevenue: 82000,
          weekRevenue: 468000,
          monthRevenue: 2180000,
          totalRevenue: 12680000,
          repurchaseRate: 0.19,
          avgDealCycleDays: 12.4
        },
        funnels: [
          { stage: "海外询盘", value: 918 },
          { stage: "样品沟通", value: 386 },
          { stage: "报价确认", value: 174 },
          { stage: "试单推进", value: 68 },
          { stage: "大货成交", value: 38 }
        ],
        orders: [
          { team: "中东客户组", count: 12, amount: 760000, avgAmount: 63333, conversion: 0.23 },
          { team: "东南亚渠道组", count: 10, amount: 486000, avgAmount: 48600, conversion: 0.19 },
          { team: "欧美品牌组", count: 7, amount: 612000, avgAmount: 87428, conversion: 0.16 },
          { team: "南美代理组", count: 9, amount: 322000, avgAmount: 35777, conversion: 0.18 }
        ],
        userPortrait: {
          regions: [
            { name: "中东", value: 34, cities: "迪拜 / 利雅得 / 吉达 / 科威特城" },
            { name: "东南亚", value: 24, cities: "雅加达 / 马尼拉 / 曼谷 / 吉隆坡" },
            { name: "非洲", value: 16, cities: "开罗 / 内罗毕 / 拉各斯" },
            { name: "南美", value: 14, cities: "圣保罗 / 利马 / 圣地亚哥" },
            { name: "欧洲", value: 12, cities: "华沙 / 马德里 / 米兰" }
          ],
          industries: [
            { name: "生活用纸进口商", value: 26 },
            { name: "酒店 / 餐饮供应链", value: 21 },
            { name: "商超自有品牌", value: 17 },
            { name: "纸品分销代理", value: 14 },
            { name: "纸杯 / 包装加工", value: 12 },
            { name: "跨境贸易公司", value: 10 }
          ],
          companySizes: [
            { name: "10人以下", value: 18 },
            { name: "10-50人", value: 37 },
            { name: "50-200人", value: 28 },
            { name: "200-500人", value: 11 },
            { name: "500人以上", value: 6 }
          ],
          identities: [
            { name: "采购经理", value: 31 },
            { name: "老板 / 总经理", value: 23 },
            { name: "供应链负责人", value: 18 },
            { name: "品牌采购", value: 15 },
            { name: "区域代理", value: 13 }
          ],
          budgets: [
            { name: "5千美金以下", value: 12 },
            { name: "5千-2万美金", value: 28 },
            { name: "2万-5万美金", value: 33 },
            { name: "5万-10万美金", value: 17 },
            { name: "10万美金以上", value: 10 }
          ],
          decisionStages: [
            { name: "询样阶段", value: 29, note: "重点关心样品速度、运费和包装展示。" },
            { name: "认证比对", value: 24, note: "会反复问 FSC、ISO、测试报告和合规文件。" },
            { name: "价格谈判", value: 28, note: "重点比较 MOQ、交期、装柜和付款方式。" },
            { name: "长期合作", value: 19, note: "开始关注年度供货稳定性和售后能力。" }
          ],
          customerTags: [
            { name: "大卷纸原纸采购", value: 21 },
            { name: "酒店纸品供货", value: 18 },
            { name: "OEM 定制包装", value: 17 },
            { name: "FSC 认证需求", value: 16 },
            { name: "稳定交期", value: 15 },
            { name: "代理分销合作", value: 13 }
          ],
          sourceChannels: [
            { name: "LinkedIn 私信", value: 27 },
            { name: "TikTok 表单", value: 21 },
            { name: "官网询盘", value: 19 },
            { name: "展会名单", value: 14 },
            { name: "WhatsApp 跟进", value: 11 },
            { name: "老客户转介绍", value: 8 }
          ],
          sampleCustomers: [
            {
              name: "Dubai Tissue Trading LLC",
              region: "迪拜",
              industry: "生活用纸进口",
              companySize: "50-200人",
              identity: "采购经理",
              stage: "认证比对",
              budget: "2万-5万美金",
              need: "希望尽快拿到 FSC 证书、样品和装柜周期说明。"
            },
            {
              name: "Jakarta Hospitality Supply",
              region: "雅加达",
              industry: "酒店供应链",
              companySize: "10-50人",
              identity: "老板 / 总经理",
              stage: "价格谈判",
              budget: "5千-2万美金",
              need: "重点关注 MOQ、起运港、交期和定制包装费用。"
            },
            {
              name: "Cairo Paper Distributors",
              region: "开罗",
              industry: "纸品分销代理",
              companySize: "10-50人",
              identity: "区域代理",
              stage: "长期合作",
              budget: "5万-10万美金",
              need: "想拿区域代理价格和稳定的长期供货承诺。"
            }
          ]
        }
      }
    };

    const sceneConfigs = {
      entity: entityScene,
      foreign_trade: foreignTradeScene
    };
    let currentSceneId = sceneConfigs[displayOptions.sceneId] ? displayOptions.sceneId : "entity";
    let dashboard = sceneConfigs[currentSceneId].dashboard;
    let contentRecords = sceneConfigs[currentSceneId].contentRecords;
    let privateDomain = sceneConfigs[currentSceneId].privateDomain;
    let accountProfiles = sceneConfigs[currentSceneId].accountProfiles;

    const root = elFromHTML(`
      <div class="screen-page screen-carousel-page${isPopoutMode ? " is-popout-mode" : ""}">
        <div class="screen-header">
          <div class="screen-title-block">
            <div class="screen-eyebrow"><span class="screen-live-dot"></span>IP CONTENT INTELLIGENCE · LIVE</div>
            <div class="screen-title">数据指挥中心</div>
            <div class="screen-subtitle">把内容获客与私域成交放在同一张经营地图里，优先看最关键的数据，再展开查看细节。</div>
            <div class="screen-header-meta">
              <span class="screen-header-chip">前端内容获客</span>
              <span class="screen-header-chip">后端私域成交</span>
              <span class="screen-header-chip">适合会议室大屏展示</span>
            </div>
          </div>
          <div class="screen-header-actions">
            <div class="screen-toolbar-group is-scene">
              <div class="screen-scene-switch">
                <div class="screen-scene-label">行业场景</div>
                <select id="screen-scene-select" class="screen-scene-select">
                  <option value="entity">实体门店获客</option>
                  <option value="foreign_trade">外贸纸业产业链</option>
                </select>
              </div>
            </div>
            <div class="screen-toolbar-group is-switches">
              <div class="screen-switches">
                <button class="btn screen-btn is-active" id="screen-switch-front" data-mode="front"><span class="screen-btn-dot front"></span>内容获客</button>
                <button class="btn screen-btn" id="screen-switch-back" data-mode="back"><span class="screen-btn-dot back"></span>私域成交</button>
              </div>
            </div>
            <div class="screen-toolbar-group is-ops">
              ${
                isPopoutMode
                  ? `<div class="screen-popout-state">投屏窗口</div>`
                  : `<button class="btn screen-btn screen-popout-btn" id="screen-popout">⤢ 弹出</button>`
              }
              <button class="btn screen-btn" id="screen-refresh">↻ 刷新数据</button>
              <button class="btn btn-primary screen-btn" id="screen-mode">❚❚ 暂停轮播</button>
            </div>
            <div class="screen-toolbar-group is-clock">
              <div class="screen-time" id="screen-time">--:--:--</div>
            </div>
          </div>
        </div>

        <div class="screen-detail-board" id="screen-detail-board"><span class="screen-detail-icon">✦</span><span id="screen-detail-text">将鼠标移动到图表或指标上，可以在这里看到更细的说明。</span></div>
        <div class="screen-scene-brief" id="screen-scene-brief"></div>
        <div class="screen-rail-control"><span>下方数据模块可左右滑动浏览</span><div><button type="button" class="screen-rail-arrow" data-rail-dir="-1" aria-label="查看上一组模块">←</button><button type="button" class="screen-rail-arrow" data-rail-dir="1" aria-label="查看下一组模块">→</button></div></div>

        <div class="screen-module-modal" id="screen-module-modal" aria-hidden="true">
          <div class="screen-module-dialog" role="dialog" aria-modal="true" aria-labelledby="screen-module-modal-title">
            <div class="screen-module-dialog-head">
              <div>
                <div class="screen-module-kicker">完整数据分布</div>
                <div class="screen-module-dialog-title" id="screen-module-modal-title">数据详情</div>
              </div>
              <button type="button" class="screen-module-close" id="screen-module-close" aria-label="关闭详情">×</button>
            </div>
            <div class="screen-module-dialog-note" id="screen-module-modal-note">每一项均展示名称、占比和相对分布。</div>
            <div class="screen-module-dialog-list" id="screen-module-modal-list"></div>
          </div>
        </div>

        <div class="screen-slide is-active" id="screen-front-slide">
          <div class="screen-kpi-grid" id="screen-front-kpis"></div>
          <div class="screen-main-grid">
            <section class="screen-panel">
              <div class="screen-panel-title">账号矩阵与画像重心</div>
              <div class="screen-account-matrix" id="screen-account-matrix"></div>
              <div class="screen-panel-title" style="margin-top:18px">账号整体画像</div>
              <div class="screen-portrait-block" id="screen-account-portrait"></div>
            </section>

            <section class="screen-panel screen-panel-center">
              <div class="screen-panel-title">前端内容趋势</div>
              <div class="screen-trend" id="screen-front-trend"></div>
              <div class="screen-panel-title" style="margin-top:18px">作品流量阶段与用户画像</div>
              <div class="screen-work-carousel" id="screen-work-carousel"></div>
            </section>

            <section class="screen-panel">
              <div class="screen-panel-title">内容排行与地域热区</div>
              <div class="screen-ranking" id="screen-ranking"></div>
              <div class="screen-panel-title" style="margin-top:18px">区域热力球</div>
              <div class="screen-geo-wrap">
                <div class="screen-geo-orb" id="screen-geo-orb"></div>
                <div class="screen-geo-list" id="screen-geo-list"></div>
              </div>
            </section>
          </div>

          <div class="screen-bottom-grid screen-bottom-grid-single">
            <section class="screen-panel screen-content-performance-panel">
              <div class="screen-panel-title">重点作品表现</div>
              <div class="screen-content-table" id="screen-content-table"></div>
            </section>
          </div>
        </div>

        <div class="screen-slide" id="screen-back-slide">
          <div class="screen-kpi-grid" id="screen-back-kpis"></div>
          <div class="screen-main-grid">
            <section class="screen-panel">
              <div class="screen-panel-title">私域漏斗与订单</div>
              <div class="screen-funnel" id="screen-back-funnel"></div>
              <div class="screen-panel-title" style="margin-top:18px">团队订单情况</div>
              <div class="screen-back-order-grid" id="screen-back-orders"></div>
            </section>

            <section class="screen-panel screen-panel-center">
              <div class="screen-panel-title">企业客户画像</div>
              <div class="screen-back-portrait-grid">
                <div class="screen-portrait-block" id="screen-private-portrait-left"></div>
                <div class="screen-portrait-block" id="screen-private-portrait-right"></div>
              </div>
              <div class="screen-panel-title" style="margin-top:18px">典型客户样本</div>
              <div class="screen-sample-list" id="screen-sample-list"></div>
            </section>

            <section class="screen-panel">
              <div class="screen-panel-title">来源渠道与决策阶段</div>
              <div class="screen-portrait-block compact" id="screen-private-source"></div>
              <div class="screen-panel-title" style="margin-top:18px">后端经营提示</div>
              <div class="screen-alert-list" id="screen-back-alerts"></div>
            </section>
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

    const detailBoard = root.querySelector("#screen-detail-text");
    const timeBox = root.querySelector("#screen-time");
    const screenSceneSelect = root.querySelector("#screen-scene-select");
    const screenSceneBrief = root.querySelector("#screen-scene-brief");
    const frontSlide = root.querySelector("#screen-front-slide");
    const backSlide = root.querySelector("#screen-back-slide");
    const switchFront = root.querySelector("#screen-switch-front");
    const switchBack = root.querySelector("#screen-switch-back");
    const popoutBtn = root.querySelector("#screen-popout");
    let activeMode = "front";
    let autoTimer = null;
    let autoRotateEnabled = true;
    let accountPortraitIndex = 0;
    let workPortraitIndex = 0;
    let isDetachedToPopout = false;

    const setPopoutButtonState = (detached) => {
      isDetachedToPopout = detached === true;
      if (!popoutBtn) return;
      popoutBtn.textContent = isDetachedToPopout ? "↩ 恢复" : "⤢ 弹出";
      popoutBtn.classList.toggle("is-detached", isDetachedToPopout);
      popoutBtn.title = isDetachedToPopout ? "将独立数据大屏窗口恢复回软件中" : "将当前数据大屏单独弹出到独立窗口";
    };

    const syncPopoutButtonState = async () => {
      if (isPopoutMode || !popoutBtn) return;
      try {
        const res = await window.api?.window?.getDataScreenPopoutState?.();
        setPopoutButtonState(res?.ok && res?.open === true);
      } catch {
        setPopoutButtonState(false);
      }
    };

    const attachDetailDelegation = (container) => {
      container.addEventListener("mouseover", (event) => {
        const target = event.target.closest("[data-detail]");
        if (!target) return;
        detailBoard.textContent = target.getAttribute("data-detail") || "将鼠标移动到图表或指标上，可以在这里看到更细的说明。";
      });
      container.addEventListener("mouseleave", () => {
        detailBoard.textContent = "将鼠标移动到图表或指标上，可以在这里看到更细的说明。";
      });
    };

    const moduleModal = root.querySelector("#screen-module-modal");
    const moduleModalTitle = root.querySelector("#screen-module-modal-title");
    const moduleModalNote = root.querySelector("#screen-module-modal-note");
    const moduleModalList = root.querySelector("#screen-module-modal-list");
    const closeModuleModal = () => {
      moduleModal.classList.remove("is-open");
      moduleModal.setAttribute("aria-hidden", "true");
    };
    const openModuleModal = (section) => {
      const title = section.querySelector(".screen-portrait-section-title")?.textContent?.trim() || "数据详情";
      const rows = Array.from(section.querySelectorAll(".screen-portrait-item"));
      const max = Math.max(...rows.map((row) => Number(row.dataset.value || 0)), 1);
      const type = section.querySelector(".screen-portrait-bar")?.classList.contains("back") ? "back" : "front";
      moduleModalTitle.textContent = title;
      moduleModalNote.textContent = `共 ${rows.length} 个分类｜每项均显示占全部样本的比例，横条长度用于快速比较高低。`;
      moduleModalList.innerHTML = rows
        .map((row, index) => {
          const value = Number(row.dataset.value || 0);
          return `
            <div class="screen-module-row">
              <div class="screen-module-row-head">
                <span><i>${index + 1}</i>${row.dataset.label || "未命名"}</span>
                <strong>${value}%<em>${row.dataset.note || "占全部样本比例"}</em></strong>
              </div>
              <div class="screen-portrait-track ${type}"><div class="screen-portrait-bar ${type}" style="width:${(value / max) * 100}%"></div></div>
            </div>
          `;
        })
        .join("");
      moduleModal.classList.add("is-open");
      moduleModal.setAttribute("aria-hidden", "false");
    };

    const renderSceneBrief = () => {
      const scene = sceneConfigs[currentSceneId] || entityScene;
      const audienceNote =
        currentSceneId === "foreign_trade"
          ? "当前已切到外贸纸业产业链，会重点体现采购经理、进口商、品牌采购和供应链负责人等画像。"
          : "当前是实体门店获客场景，会重点体现门店老板、店长、市场负责人和运营负责人等画像。";
      screenSceneSelect.value = currentSceneId;
      screenSceneBrief.innerHTML = `
        <div class="screen-scene-card">
          <div class="screen-scene-card-label">当前场景</div>
          <div class="screen-scene-card-value">${scene.name}</div>
          <div class="screen-scene-card-note">${scene.subtitle}</div>
        </div>
        <div class="screen-scene-card">
          <div class="screen-scene-card-label">核心目标</div>
          <div class="screen-scene-tag-list">${(scene.goals || []).map((item) => `<span class="screen-scene-tag">${item}</span>`).join("")}</div>
          <div class="screen-scene-card-note">当前大屏所有图表都会围绕这组经营目标来组织展示。</div>
        </div>
        <div class="screen-scene-card">
          <div class="screen-scene-card-label">目标用户</div>
          <div class="screen-scene-tag-list">${(scene.audiences || []).map((item) => `<span class="screen-scene-tag is-secondary">${item}</span>`).join("")}</div>
          <div class="screen-scene-card-note">${audienceNote}</div>
        </div>
      `;
    };

    const renderFrontKpis = () => {
      const totalPlay = contentRecords.reduce((sum, item) => sum + Number(item.playCount || 0), 0);
      const totalLeads = contentRecords.reduce((sum, item) => sum + Number(item.leadCount || 0), 0);
      const totalDm = contentRecords.reduce((sum, item) => sum + Number(item.dmCount || 0), 0);
      const avgFinish = contentRecords.length ? contentRecords.reduce((sum, item) => sum + Number(item.finishRate || 0), 0) / contentRecords.length : 0;
      const cards = [
        ["前端账号数", formatNumber(dashboard.accountSummary.totalAccounts), "矩阵整体规模"],
        ["活跃账号数", formatNumber(dashboard.accountSummary.activeAccounts), "近7日仍在更新"],
        ["累计播放量", formatNumber(totalPlay), "前端内容池总播放"],
        ["私信客资数", formatNumber(totalDm), "内容带来的私信咨询"],
        ["有效线索数", formatNumber(totalLeads), "前端直接带来的高意向线索"],
        ["平均完播率", formatPercent(avgFinish), "内容吸引力和节奏质量"]
      ];
      root.querySelector("#screen-front-kpis").innerHTML = cards
        .map(
          ([label, value, note]) => `
            <div class="screen-kpi-card" data-detail="${label}：${value}｜${note}">
              <div class="screen-kpi-label">${label}</div>
              <div class="screen-kpi-value">${value}</div>
              <div class="screen-kpi-note">${note}</div>
            </div>
          `
        )
        .join("");
    };

    const renderAccountMatrix = () => {
      const items = [
        ["正常账号", dashboard.accountSummary.normalAccounts, "当前状态稳定，可继续正常发内容"],
        ["预警账号", dashboard.accountSummary.warningAccounts, "建议排查登录状态、违规风险和发文频率"],
        ["失效账号", dashboard.accountSummary.invalidAccounts, "需要尽快重新接入或替换"],
        ["活跃账号", dashboard.accountSummary.activeAccounts, "近7日有内容产出或互动行为"]
      ];
      root.querySelector("#screen-account-matrix").innerHTML = items
        .map(
          ([label, value, note]) => `
            <div class="screen-account-card" data-detail="${label} ${formatNumber(value)}｜${note}">
              <div class="screen-account-label">${label}</div>
              <div class="screen-account-value">${formatNumber(value)}</div>
            </div>
          `
        )
        .join("");
    };

    const renderAccountPortrait = () => {
      const accountNames = Object.keys(accountProfiles);
      if (!accountNames.length) return;
      accountPortraitIndex = (accountPortraitIndex + accountNames.length) % accountNames.length;
      const focusAccount = accountNames[accountPortraitIndex];
      const portrait = accountProfiles[focusAccount] || {};
      const topRegion = getTopPortraitItem(portrait.regions);
      const topIdentity = getTopPortraitItem(portrait.identities);
      root.querySelector("#screen-account-portrait").innerHTML = `
        <div class="screen-portrait-head">
          <div class="screen-portrait-carousel-head"><div class="screen-portrait-title">${focusAccount}</div><div class="screen-portrait-carousel-actions"><button type="button" data-account-step="-1">←</button><button type="button" data-account-step="1">→</button></div></div>
          <div class="screen-portrait-sub">核心地区 ${topRegion?.name || "—"}｜核心身份 ${topIdentity?.name || "—"}</div>
        </div>
        ${["regions", "ages", "genders", "industries", "identities"]
          .map((key) => {
            const titleMap = {
              regions: "地区画像",
              ages: "年龄结构",
              genders: "性别结构",
              industries: "行业分布",
              identities: "身份分布"
            };
            return `
              <div class="screen-portrait-section">
                <div class="screen-portrait-section-title">${titleMap[key]}</div>
                ${renderBarList(portrait[key] || [], { type: "front", maxCount: 3, detailPrefix: `${focusAccount}｜${titleMap[key]}｜` })}
              </div>
            `;
          })
          .join("")}
        <div class="screen-carousel-dots">${accountNames.map((name, index) => `<button type="button" class="${index === accountPortraitIndex ? "is-active" : ""}" data-account-index="${index}" aria-label="查看 ${name}"></button>`).join("")}</div>
      `;
    };

    const renderFrontTrend = () => {
      const list = dashboard.dailyTrend || [];
      const maxPlay = Math.max(...list.map((item) => Number(item.play || 0)), 1);
      const width = 620;
      const height = 190;
      const padding = 28;
      const points = list.map((item, index) => {
        const x = list.length > 1 ? padding + (index * (width - padding * 2)) / (list.length - 1) : width / 2;
        const y = height - padding - (Number(item.play || 0) / maxPlay) * (height - padding * 2);
        return { ...item, x, y };
      });
      const polyline = points.map((item) => `${item.x},${item.y}`).join(" ");
      root.querySelector("#screen-front-trend").innerHTML = `
        <div class="screen-trend-chart-wrap">
          <svg class="screen-trend-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="近日期内容播放趋势">
            <defs><linearGradient id="screen-trend-area" x1="0" x2="0" y1="0" y2="1"><stop stop-color="#4cc9f0" stop-opacity=".38"/><stop offset="1" stop-color="#4cc9f0" stop-opacity="0"/></linearGradient></defs>
            <path class="screen-trend-grid" d="M${padding} ${height - padding}H${width - padding} M${padding} ${height * .55}H${width - padding} M${padding} ${padding}H${width - padding}"/>
            <path class="screen-trend-area" d="M${points.map((item) => `${item.x} ${item.y}`).join(" L")} L${points[points.length - 1]?.x || padding} ${height - padding} L${points[0]?.x || padding} ${height - padding} Z"/>
            <polyline class="screen-trend-line" points="${polyline}"/>
            ${points.map((item) => `<g class="screen-trend-point" data-trend-day="${item.day}" tabindex="0"><circle cx="${item.x}" cy="${item.y}" r="7"/><text x="${item.x}" y="${height - 8}" text-anchor="middle">${item.day}</text></g>`).join("")}
          </svg>
          <div class="screen-trend-hint">点击日期圆点，查看当天的播放、线索和成交明细</div>
          <div class="screen-trend-detail" id="screen-trend-detail">请选择上方一个日期圆点查看具体数据</div>
        </div>`;
    };

    const renderWorkCarousel = () => {
      const starGroups = [1, 2, 3, 4, 5].map((star) => ({
        star,
        count: contentRecords.filter((item) => calcTrafficStage(item).stars === star).length
      }));
      const records = contentRecords.slice().sort((a, b) => Number(b.playCount || 0) - Number(a.playCount || 0));
      if (!records.length) return;
      workPortraitIndex = (workPortraitIndex + records.length) % records.length;
      const record = records[workPortraitIndex];
      if (!record) return;
      const portrait = record.audienceProfile || {};
      const stage = calcTrafficStage(record);
      root.querySelector("#screen-work-carousel").innerHTML = `
        <div class="screen-work-carousel-head"><div><span class="screen-work-stage">${"★".repeat(stage.stars || 1)} ${stage.label}</span><strong>${formatNumber(record.playCount)} 播放</strong></div><div class="screen-portrait-carousel-actions"><button type="button" data-work-step="-1">←</button><button type="button" data-work-step="1">→</button></div></div>
        <div class="screen-portrait-head">
          <div class="screen-portrait-title">${record.title}</div>
          <div class="screen-portrait-sub">${record.platform}｜${record.account}｜当前最强作品画像</div>
        </div>
        ${["regions", "ages", "roles", "industries", "intentions"]
          .map((key) => {
            const titleMap = {
              regions: "地区",
              ages: "年龄",
              roles: "身份",
              industries: "行业",
              intentions: "需求意图"
            };
            return `
              <div class="screen-portrait-section">
                <div class="screen-portrait-section-title">${titleMap[key]}</div>
                ${renderBarList(portrait[key] || [], { type: "front", maxCount: 3, detailPrefix: `${record.title}｜${titleMap[key]}｜` })}
              </div>
            `;
          })
          .join("")}
        <div class="screen-carousel-dots">${records.map((item, index) => `<button type="button" class="${index === workPortraitIndex ? "is-active" : ""}" data-work-index="${index}" aria-label="查看 ${item.title}"></button>`).join("")}</div>
      `;
    };

    const renderRanking = () => {
      root.querySelector("#screen-ranking").innerHTML = dashboard.accountRanking
        .map(
          (item, index) => `
            <div class="screen-rank-item" data-detail="${item.name}｜${item.platform}｜发布 ${formatNumber(item.publishCount)} 条｜线索 ${formatNumber(item.leads)}｜成交额 ¥${formatNumber(item.revenue)}">
              <div class="screen-rank-index">${index + 1}</div>
              <div class="screen-rank-main">
                <div class="screen-rank-name">${item.name}</div>
                <div class="screen-rank-sub">${item.platform}｜发布 ${formatNumber(item.publishCount)} 条｜线索 ${formatNumber(item.leads)}</div>
              </div>
              <div class="screen-rank-value">¥${formatNumber(item.revenue)}</div>
            </div>
          `
        )
        .join("");
    };

    const renderGeo = () => {
      const points = dashboard.geoHotspots || [];
      root.querySelector("#screen-geo-orb").innerHTML = `
        <div class="screen-geo-core"></div>
        <div class="screen-geo-ring ring-1"></div>
        <div class="screen-geo-ring ring-2"></div>
        ${points
          .map(
            (item, index) => `
              <button class="screen-geo-point" type="button" style="${hotspotStyle(index, points.length, item.value)}" data-detail="${item.name}｜热力值 ${item.value}｜${item.type}">
                <span>${item.name}</span>
              </button>
            `
          )
          .join("")}
      `;
      root.querySelector("#screen-geo-list").innerHTML = points
        .map(
          (item) => `
            <div class="screen-geo-list-item" data-detail="${item.name}｜热力值 ${item.value}｜${item.type}">
              <span>${item.name}</span>
              <strong>${item.value}</strong>
              <em>${item.type}</em>
            </div>
          `
        )
        .join("");
    };

    const renderContentTable = () => {
      const list = contentRecords
        .slice()
        .sort((a, b) => Number(b.playCount || 0) - Number(a.playCount || 0))
        .slice(0, 5);
      const total = list.reduce((sum, item) => sum + Number(item.playCount || 0), 0) || 1;
      const colors = ["#4cc9f0", "#7762ff", "#4ce6ad", "#ffbe55", "#f778a1"];
      let start = 0;
      const segments = list.map((item, index) => {
        const portion = (Number(item.playCount || 0) / total) * 100;
        const segment = `${colors[index]} ${start}% ${start + portion}%`;
        start += portion;
        return segment;
      });
      root.querySelector("#screen-content-table").innerHTML = `
        <div class="screen-content-donut" style="background:conic-gradient(${segments.join(",")})"><div><strong>${formatNumber(total)}</strong><span>TOP 作品总播放</span></div></div>
        <div class="screen-content-legend">${list.map((item, index) => { const percent = (Number(item.playCount || 0) / total) * 100; return `<button type="button" class="screen-content-legend-item" data-detail="${item.title}｜播放 ${formatNumber(item.playCount)}｜占 TOP 作品播放 ${percent.toFixed(1)}%"><i style="background:${colors[index]}"></i><span>${index + 1}. ${item.title}</span><strong>${percent.toFixed(1)}%</strong></button>`; }).join("")}</div>`;
    };

    const renderBackKpis = () => {
      const summary = privateDomain.summary || {};
      const cards = [
        ["当前私域人数", formatNumber(summary.totalUsers), "累计沉淀的私域客户规模"],
        ["月新增人数", formatNumber(summary.monthNewUsers), "近30天新增进入私域"],
        ["月询单人数", formatNumber(summary.monthInquiries), "进入咨询链路的人数"],
        ["月成交人数", formatNumber(summary.monthDeals), "近30天实际成交人数"],
        ["月成交金额", `¥${formatNumber(summary.monthRevenue)}`, "近30天确认成交额"],
        ["复购率", formatPercent(summary.repurchaseRate), "用于判断后端经营深度"]
      ];
      root.querySelector("#screen-back-kpis").innerHTML = cards
        .map(
          ([label, value, note]) => `
            <div class="screen-kpi-card" data-detail="${label}：${value}｜${note}">
              <div class="screen-kpi-label">${label}</div>
              <div class="screen-kpi-value">${value}</div>
              <div class="screen-kpi-note">${note}</div>
            </div>
          `
        )
        .join("");
    };

    const renderBackFunnel = () => {
      const list = privateDomain.funnels || [];
      const max = Math.max(...list.map((item) => Number(item.value || 0)), 1);
      root.querySelector("#screen-back-funnel").innerHTML = list
        .map(
          (item) => `
            <div class="screen-funnel-item" data-detail="${item.stage}：${formatNumber(item.value)}｜用于判断成交链路在哪一步损耗最大。">
              <div class="screen-funnel-label">${item.stage}</div>
              <div class="screen-funnel-track"><div class="screen-funnel-bar" style="width:${(item.value / max) * 100}%"></div></div>
              <div class="screen-funnel-value">${formatNumber(item.value)}</div>
            </div>
          `
        )
        .join("");
    };

    const renderBackOrders = () => {
      root.querySelector("#screen-back-orders").innerHTML = (privateDomain.orders || [])
        .map(
          (item) => `
            <div class="screen-back-order-card" data-detail="${item.team}｜成交 ${formatNumber(item.count)} 单｜金额 ¥${formatNumber(item.amount)}｜转化率 ${formatPercent(item.conversion)}">
              <div class="screen-back-order-name">${item.team}</div>
              <div class="screen-back-order-metrics">
                <div><span>订单数</span><strong>${formatNumber(item.count)}</strong></div>
                <div><span>成交额</span><strong>¥${formatNumber(item.amount)}</strong></div>
                <div><span>客单价</span><strong>¥${formatNumber(item.avgAmount)}</strong></div>
              </div>
            </div>
          `
        )
        .join("");
    };

    const renderPrivatePortrait = () => {
      const portrait = privateDomain.userPortrait || {};
      root.querySelector("#screen-private-portrait-left").innerHTML = `
        <div class="screen-portrait-head">
          <div class="screen-portrait-title">企业客户结构</div>
          <div class="screen-portrait-sub">帮助销售话术更贴近客户行业、身份和企业规模</div>
        </div>
        <div class="screen-portrait-section">
          <div class="screen-portrait-section-title">地区</div>
          ${renderBarList(portrait.regions || [], { type: "back", maxCount: 3, detailPrefix: "企业客户地区｜" })}
        </div>
        <div class="screen-portrait-section">
          <div class="screen-portrait-section-title">行业</div>
          ${renderBarList(portrait.industries || [], { type: "back", maxCount: 3, detailPrefix: "企业客户行业｜" })}
        </div>
        <div class="screen-portrait-section">
          <div class="screen-portrait-section-title">企业规模</div>
          ${renderBarList(portrait.companySizes || [], { type: "back", maxCount: 3, detailPrefix: "企业规模｜" })}
        </div>
        <div class="screen-portrait-section">
          <div class="screen-portrait-section-title">企业身份</div>
          ${renderBarList(portrait.identities || [], { type: "back", maxCount: 3, detailPrefix: "客户身份｜" })}
        </div>
      `;

      root.querySelector("#screen-private-portrait-right").innerHTML = `
        <div class="screen-portrait-head">
          <div class="screen-portrait-title">决策与预算结构</div>
          <div class="screen-portrait-sub">帮助判断是先教育还是直接成交</div>
        </div>
        <div class="screen-portrait-section">
          <div class="screen-portrait-section-title">预算层级</div>
          ${renderBarList(portrait.budgets || [], { type: "back", maxCount: 3, detailPrefix: "预算层级｜" })}
        </div>
        <div class="screen-portrait-section">
          <div class="screen-portrait-section-title">决策阶段</div>
          ${renderBarList(portrait.decisionStages || [], { type: "back", maxCount: 3, detailPrefix: "决策阶段｜" })}
        </div>
        <div class="screen-portrait-section">
          <div class="screen-portrait-section-title">客户标签</div>
          ${renderBarList(portrait.customerTags || [], { type: "back", maxCount: 3, detailPrefix: "客户标签｜" })}
        </div>
      `;

      root.querySelector("#screen-private-source").innerHTML = `
        <div class="screen-portrait-head">
          <div class="screen-portrait-title">来源渠道与承接方向</div>
          <div class="screen-portrait-sub">帮助判断后端话术从哪里切入最有效</div>
        </div>
        <div class="screen-portrait-section">
          <div class="screen-portrait-section-title">来源渠道</div>
          ${renderBarList(portrait.sourceChannels || [], { type: "back", maxCount: 3, detailPrefix: "来源渠道｜" })}
        </div>
        <div class="screen-portrait-section">
          <div class="screen-portrait-section-title">高频诉求</div>
          ${renderBarList(portrait.customerTags || [], { type: "back", maxCount: 3, detailPrefix: "客户诉求｜" })}
        </div>
      `;
    };

    const renderSamples = () => {
      root.querySelector("#screen-sample-list").innerHTML = (privateDomain.userPortrait?.sampleCustomers || [])
        .map(
          (item) => `
            <div class="screen-sample-item" data-detail="${item.name}｜${item.region}｜${item.industry}｜${item.companySize}｜${item.identity}｜${item.need}">
              <div class="screen-sample-title">${item.name}</div>
              <div class="screen-sample-tags">
                <span class="pill">${item.region}</span>
                <span class="pill">${item.industry}</span>
                <span class="pill">${item.companySize}</span>
                <span class="pill">${item.identity}</span>
                <span class="pill">${item.stage}</span>
              </div>
              <div class="screen-sample-note">${item.need}</div>
            </div>
          `
        )
        .join("");
    };

    const renderBackAlerts = () => {
      const topRegion = getTopPortraitItem(privateDomain.userPortrait?.regions || []);
      const topIdentity = getTopPortraitItem(privateDomain.userPortrait?.identities || []);
      const topBudget = getTopPortraitItem(privateDomain.userPortrait?.budgets || []);
      const alerts = [
        `当前私域核心地区是 ${topRegion?.name || "—"}，销售案例和开场话术应优先贴近该地区的经营语境。`,
        `主力决策人是 ${topIdentity?.name || "—"}，建议销售话术优先讲结果、增长和风险控制。`,
        `预算主要集中在 ${topBudget?.name || "—"}，说明套餐设计要兼顾试单入口与升级路径。`,
        `来源以评论/私信导流为主，说明后端客服第一句承接话术要比报价更重要。`
      ];
      root.querySelector("#screen-back-alerts").innerHTML = alerts.map((item) => `<div class="screen-alert-item">${item}</div>`).join("");
    };

    const renderTime = () => {
      const now = new Date();
      timeBox.textContent = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(
        now.getHours()
      ).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
    };

    const setMode = (mode) => {
      activeMode = mode === "back" ? "back" : "front";
      frontSlide.classList.toggle("is-active", activeMode === "front");
      backSlide.classList.toggle("is-active", activeMode === "back");
      switchFront.classList.toggle("is-active", activeMode === "front");
      switchBack.classList.toggle("is-active", activeMode === "back");
      root.querySelector("#screen-mode").classList.toggle("is-paused", !autoRotateEnabled);
    };

    const startAutoRotate = () => {
      if (autoTimer) window.clearInterval(autoTimer);
      autoRotateEnabled = true;
      root.querySelector("#screen-mode").textContent = "❚❚ 暂停轮播";
      autoTimer = window.setInterval(() => {
        if (!root.isConnected) {
          window.clearInterval(autoTimer);
          autoTimer = null;
          return;
        }
        setMode(activeMode === "front" ? "back" : "front");
      }, 8000);
    };

    const stopAutoRotate = () => {
      if (autoTimer) window.clearInterval(autoTimer);
      autoTimer = null;
      autoRotateEnabled = false;
      root.querySelector("#screen-mode").textContent = "▶ 开启轮播";
      setMode(activeMode);
    };

    const renderAll = () => {
      renderSceneBrief();
      renderFrontKpis();
      renderAccountMatrix();
      renderAccountPortrait();
      renderFrontTrend();
      renderWorkCarousel();
      renderRanking();
      renderGeo();
      renderContentTable();
      renderBackKpis();
      renderBackFunnel();
      renderBackOrders();
      renderPrivatePortrait();
      renderSamples();
      renderBackAlerts();
      renderTime();
    };

    const applyScene = (sceneId) => {
      currentSceneId = sceneConfigs[sceneId] ? sceneId : "entity";
      dashboard = sceneConfigs[currentSceneId].dashboard;
      contentRecords = sceneConfigs[currentSceneId].contentRecords;
      privateDomain = sceneConfigs[currentSceneId].privateDomain;
      accountProfiles = sceneConfigs[currentSceneId].accountProfiles;
      accountPortraitIndex = 0;
      workPortraitIndex = 0;
      renderAll();
    };

    renderAll();
    setMode(displayOptions.mode);
    startAutoRotate();
    syncPopoutButtonState();
    const timeTimer = window.setInterval(() => {
      if (!root.isConnected) {
        window.clearInterval(timeTimer);
        return;
      }
      renderTime();
    }, 1000);
    if (!isPopoutMode) {
      const popoutStateTimer = window.setInterval(() => {
        if (!root.isConnected) {
          window.clearInterval(popoutStateTimer);
          return;
        }
        syncPopoutButtonState();
      }, 1500);
      window.addEventListener("focus", syncPopoutButtonState);
      window.addEventListener("visibilitychange", syncPopoutButtonState);
    }

    attachDetailDelegation(root);

    root.querySelector("#screen-module-close").addEventListener("click", closeModuleModal);
    moduleModal.addEventListener("click", (event) => {
      if (event.target === moduleModal) closeModuleModal();
    });
    root.addEventListener("click", (event) => {
      const accountStep = event.target.closest("[data-account-step]");
      const accountIndex = event.target.closest("[data-account-index]");
      const workStep = event.target.closest("[data-work-step]");
      const workIndex = event.target.closest("[data-work-index]");
      const trendPoint = event.target.closest("[data-trend-day]");
      const railArrow = event.target.closest("[data-rail-dir]");
      if (accountStep) {
        accountPortraitIndex += Number(accountStep.dataset.accountStep || 0);
        renderAccountPortrait();
        return;
      }
      if (accountIndex) {
        accountPortraitIndex = Number(accountIndex.dataset.accountIndex || 0);
        renderAccountPortrait();
        return;
      }
      if (workStep) {
        workPortraitIndex += Number(workStep.dataset.workStep || 0);
        renderWorkCarousel();
        return;
      }
      if (workIndex) {
        workPortraitIndex = Number(workIndex.dataset.workIndex || 0);
        renderWorkCarousel();
        return;
      }
      if (trendPoint) {
        const item = (dashboard.dailyTrend || []).find((trend) => trend.day === trendPoint.dataset.trendDay);
        const box = root.querySelector("#screen-trend-detail");
        if (item && box) box.innerHTML = `<strong>${item.day}</strong><span>播放 ${item.play}k</span><span>有效线索 ${item.leads}</span><span>成交 ${item.deals}</span>`;
        return;
      }
      if (railArrow) {
        const rail = activeMode === "front" ? frontSlide.querySelector(".screen-main-grid") : backSlide.querySelector(".screen-main-grid");
        rail?.scrollBy({ left: Number(railArrow.dataset.railDir || 1) * Math.max(360, rail.clientWidth * 0.78), behavior: "smooth" });
        return;
      }
      const section = event.target.closest(".screen-portrait-section");
      if (!section || !root.contains(section)) return;
      openModuleModal(section);
    });

    switchFront.addEventListener("click", () => {
      stopAutoRotate();
      setMode("front");
    });
    switchBack.addEventListener("click", () => {
      stopAutoRotate();
      setMode("back");
    });
    root.querySelector("#screen-refresh").addEventListener("click", () => {
      renderAll();
      toast("大屏数据已刷新。");
    });
    popoutBtn?.addEventListener("click", async () => {
      if (isDetachedToPopout) {
        const restoreRes = await window.api?.window?.closeDataScreenPopout?.();
        if (restoreRes?.ok) {
          setPopoutButtonState(false);
          toast("数据大屏已恢复回主界面。");
        } else {
          toast(String(restoreRes?.message || "恢复数据大屏失败。"));
        }
        return;
      }
      const res = await window.api?.window?.openDataScreenPopout?.({
        sceneId: currentSceneId,
        mode: activeMode
      });
      if (res?.ok) {
        setPopoutButtonState(true);
        toast("数据大屏已单独弹出。");
      } else {
        toast(String(res?.message || "弹出独立窗口失败。"));
      }
    });
    screenSceneSelect.addEventListener("change", () => {
      applyScene(screenSceneSelect.value);
      toast(screenSceneSelect.value === "foreign_trade" ? "已切换到外贸纸业产业链场景。" : "已切换到实体门店获客场景。");
    });
    root.querySelector("#screen-mode").addEventListener("click", () => {
      if (autoRotateEnabled) {
        stopAutoRotate();
        toast("轮播已暂停，您可以专心查看当前数据。");
      } else {
        startAutoRotate();
        setMode(activeMode);
        toast("已开启前后端自动轮播。");
      }
    });

    return root;
  }
};
