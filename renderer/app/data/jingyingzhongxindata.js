const AGENT_STORAGE_KEY = "ipfactory.agent.management.v1";

const defaultAgents = [
  {
    id: "liuliangcelueguan",
    name: "流量策略官",
    role: "专注内容流量诊断、选题修正和账号阶段判断",
    prompt:
      "你需要从内容选题、前3秒钩子、评论结构、转化链路和用户画像出发，分析为什么作品处于当前流量阶段，并给出下一步可以直接执行的优化建议。",
    privateDbName: "流量策略私有库",
    privateDbScope: "记录该智能体对流量诊断、投放经验、行业对标的长期理解",
    sharedDbs: ["内容知识库", "评论洞察库", "成交案例库"],
    style: "策略型",
    owner: "运营负责人"
  },
  {
    id: "siyuzhuanhuaguwen",
    name: "私域转化顾问",
    role: "识别高意向客户、分析询单质量和成交机会",
    prompt:
      "你需要重点关注评论、私信、报价、预约、留资和成交动作，判断内容是否具备营销意图，并把用户线索分成低意向、中意向和高意向。",
    privateDbName: "转化顾问私有库",
    privateDbScope: "沉淀本企业销售话术、客服跟进节奏和订单成交经验",
    sharedDbs: ["客户画像库", "私域话术库", "订单案例库"],
    style: "转化型",
    owner: "销售主管"
  },
  {
    id: "pinpaoneirongzongjian",
    name: "品牌内容总监",
    role: "负责内容调性、品牌表达和长期矩阵规划",
    prompt:
      "你需要兼顾品牌表达、内容连贯性和业务目标，帮助团队判断内容是否偏离品牌方向，并提出适合长期运营的内容矩阵建议。",
    privateDbName: "品牌内容私有库",
    privateDbScope: "沉淀品牌定位、行业禁区、长期选题池和高转化文案风格",
    sharedDbs: ["内容知识库", "品牌素材库", "复盘报告库"],
    style: "品牌型",
    owner: "品牌负责人"
  }
];

const contentRecords = [
  {
    id: "ct_001",
    title: "老板一定要学会的三步留资话术",
    account: "杭州矩阵A-抖音01",
    platform: "抖音",
    publishTime: "2026-07-09 10:30",
    topic: "私域获客",
    playCount: 186000,
    likeCount: 9650,
    commentCount: 1480,
    shareCount: 920,
    collectCount: 1260,
    finishRate: 0.41,
    dmCount: 368,
    leadCount: 129,
    convertCount: 23,
    marketingStrength: 0.84,
    stageLabel: "扩散放量期",
    audienceProfile: {
      regions: [
        { name: "浙江", value: 26 },
        { name: "江苏", value: 18 },
        { name: "广东", value: 14 },
        { name: "上海", value: 11 },
        { name: "山东", value: 8 }
      ],
      ages: [
        { name: "24-30岁", value: 29 },
        { name: "31-35岁", value: 33 },
        { name: "36-40岁", value: 21 },
        { name: "41-45岁", value: 11 },
        { name: "45岁以上", value: 6 }
      ],
      genders: [
        { name: "男性", value: 58 },
        { name: "女性", value: 42 }
      ],
      roles: [
        { name: "老板 / 创始人", value: 31 },
        { name: "市场负责人", value: 24 },
        { name: "运营负责人", value: 18 },
        { name: "门店店长", value: 14 },
        { name: "销售负责人", value: 13 }
      ],
      companySizes: [
        { name: "1-10人", value: 36 },
        { name: "11-30人", value: 29 },
        { name: "31-100人", value: 22 },
        { name: "100人以上", value: 13 }
      ],
      industries: [
        { name: "本地生活", value: 26 },
        { name: "教育培训", value: 18 },
        { name: "家装家居", value: 15 },
        { name: "企业服务", value: 22 },
        { name: "大健康", value: 19 }
      ],
      intentions: [
        { name: "想拿完整方案", value: 34 },
        { name: "咨询报价", value: 26 },
        { name: "了解代运营", value: 21 },
        { name: "想加私域沟通", value: 19 }
      ]
    },
    comments: [
      "这个话术模板有点东西，怎么拿完整版？",
      "想问一下你们是怎么做私域承接的",
      "如果是本地门店也能用这套方法吗",
      "报价多少，方便私信我吗",
      "我想了解一下课程和代运营合作",
      "这个开头太抓人了，怪不得能爆",
      "可以加微信详细聊聊吗",
      "适合教育行业吗，评论区回复一下"
    ]
  },
  {
    id: "ct_002",
    title: "为什么你的短视频有播放却没有成交",
    account: "杭州矩阵A-视频号02",
    platform: "视频号",
    publishTime: "2026-07-08 18:20",
    topic: "成交转化",
    playCount: 63200,
    likeCount: 2180,
    commentCount: 386,
    shareCount: 170,
    collectCount: 295,
    finishRate: 0.28,
    dmCount: 82,
    leadCount: 27,
    convertCount: 6,
    marketingStrength: 0.67,
    stageLabel: "精准试探期",
    audienceProfile: {
      regions: [
        { name: "浙江", value: 22 },
        { name: "上海", value: 16 },
        { name: "北京", value: 13 },
        { name: "广东", value: 12 },
        { name: "福建", value: 9 }
      ],
      ages: [
        { name: "24-30岁", value: 21 },
        { name: "31-35岁", value: 28 },
        { name: "36-40岁", value: 27 },
        { name: "41-45岁", value: 16 },
        { name: "45岁以上", value: 8 }
      ],
      genders: [
        { name: "男性", value: 51 },
        { name: "女性", value: 49 }
      ],
      roles: [
        { name: "创始人", value: 26 },
        { name: "销售主管", value: 22 },
        { name: "招商主管", value: 17 },
        { name: "运营经理", value: 18 },
        { name: "客服主管", value: 17 }
      ],
      companySizes: [
        { name: "1-10人", value: 24 },
        { name: "11-30人", value: 31 },
        { name: "31-100人", value: 28 },
        { name: "100人以上", value: 17 }
      ],
      industries: [
        { name: "招商加盟", value: 24 },
        { name: "企业服务", value: 29 },
        { name: "教育培训", value: 18 },
        { name: "制造业", value: 14 },
        { name: "SaaS软件", value: 15 }
      ],
      intentions: [
        { name: "想看成交脚本", value: 29 },
        { name: "想做团队转化", value: 24 },
        { name: "咨询B2B打法", value: 26 },
        { name: "想了解投放合作", value: 21 }
      ]
    },
    comments: [
      "有播放没有咨询真的太真实了",
      "你说的转化钩子是指评论区引导吗",
      "想看看你们的成交脚本",
      "有没有适合B2B行业的方法",
      "这个案例很像我们现在遇到的问题"
    ]
  },
  {
    id: "ct_003",
    title: "一个视频帮你筛出高意向客户",
    account: "品牌主号-小红书01",
    platform: "小红书",
    publishTime: "2026-07-07 15:00",
    topic: "高意向筛选",
    playCount: 28500,
    likeCount: 960,
    commentCount: 152,
    shareCount: 65,
    collectCount: 118,
    finishRate: 0.24,
    dmCount: 26,
    leadCount: 10,
    convertCount: 2,
    marketingStrength: 0.52,
    stageLabel: "冷启动观察期",
    audienceProfile: {
      regions: [
        { name: "广东", value: 18 },
        { name: "浙江", value: 16 },
        { name: "四川", value: 12 },
        { name: "重庆", value: 11 },
        { name: "湖北", value: 9 }
      ],
      ages: [
        { name: "20-24岁", value: 13 },
        { name: "25-30岁", value: 31 },
        { name: "31-35岁", value: 24 },
        { name: "36-40岁", value: 18 },
        { name: "40岁以上", value: 14 }
      ],
      genders: [
        { name: "男性", value: 39 },
        { name: "女性", value: 61 }
      ],
      roles: [
        { name: "品牌主理人", value: 23 },
        { name: "内容运营", value: 26 },
        { name: "门店经营者", value: 19 },
        { name: "自媒体从业者", value: 17 },
        { name: "客服 / 销售", value: 15 }
      ],
      companySizes: [
        { name: "1-10人", value: 42 },
        { name: "11-30人", value: 27 },
        { name: "31-100人", value: 19 },
        { name: "100人以上", value: 12 }
      ],
      industries: [
        { name: "美业", value: 19 },
        { name: "家装", value: 23 },
        { name: "本地生活", value: 22 },
        { name: "知识付费", value: 16 },
        { name: "电商", value: 20 }
      ],
      intentions: [
        { name: "想筛选高意向客户", value: 33 },
        { name: "想优化评论问题", value: 26 },
        { name: "想看案例模版", value: 21 },
        { name: "想改善封面表达", value: 20 }
      ]
    },
    comments: [
      "这种问题设计得挺好，可以逼出真实需求",
      "怎么判断评论的人是不是高意向",
      "有没有适合家装行业的话术",
      "这个封面可以再优化一点"
    ]
  },
  {
    id: "ct_004",
    title: "同城门店获客的五个短视频切口",
    account: "同城门店-快手03",
    platform: "快手",
    publishTime: "2026-07-06 11:40",
    topic: "同城门店",
    playCount: 9800,
    likeCount: 260,
    commentCount: 39,
    shareCount: 13,
    collectCount: 22,
    finishRate: 0.17,
    dmCount: 6,
    leadCount: 2,
    convertCount: 0,
    marketingStrength: 0.31,
    stageLabel: "素材试错期",
    audienceProfile: {
      regions: [
        { name: "浙江", value: 34 },
        { name: "安徽", value: 12 },
        { name: "江西", value: 9 },
        { name: "江苏", value: 11 },
        { name: "河南", value: 8 }
      ],
      ages: [
        { name: "24-30岁", value: 22 },
        { name: "31-35岁", value: 27 },
        { name: "36-40岁", value: 24 },
        { name: "41-45岁", value: 16 },
        { name: "45岁以上", value: 11 }
      ],
      genders: [
        { name: "男性", value: 63 },
        { name: "女性", value: 37 }
      ],
      roles: [
        { name: "门店老板", value: 35 },
        { name: "店长", value: 26 },
        { name: "招商主管", value: 12 },
        { name: "运营", value: 14 },
        { name: "销售", value: 13 }
      ],
      companySizes: [
        { name: "1-10人", value: 47 },
        { name: "11-30人", value: 31 },
        { name: "31-100人", value: 15 },
        { name: "100人以上", value: 7 }
      ],
      industries: [
        { name: "餐饮", value: 28 },
        { name: "零售", value: 24 },
        { name: "生活服务", value: 21 },
        { name: "教育培训", value: 11 },
        { name: "家居建材", value: 16 }
      ],
      intentions: [
        { name: "想做同城获客", value: 41 },
        { name: "想提升门店到店", value: 26 },
        { name: "想优化节奏", value: 18 },
        { name: "想做低成本试投", value: 15 }
      ]
    },
    comments: [
      "适合餐饮门店吗",
      "节奏有点慢了",
      "门头镜头是不是太长了"
    ]
  }
];

const privateDomainOverview = {
  summary: {
    totalUsers: 12860,
    todayNewUsers: 126,
    weekNewUsers: 842,
    monthNewUsers: 3620,
    todayInquiries: 48,
    weekInquiries: 316,
    monthInquiries: 1298,
    todayDeals: 7,
    weekDeals: 42,
    monthDeals: 186,
    todayRevenue: 39600,
    weekRevenue: 228400,
    monthRevenue: 1038000,
    totalRevenue: 5830000,
    repurchaseRate: 0.28,
    avgDealCycleDays: 5.6
  },
  channels: [
    { name: "企业微信A", users: 4860, todayNew: 52, weekInquiries: 112, monthDeals: 58, revenue: 338000, dealRate: 0.18 },
    { name: "企业微信B", users: 3720, todayNew: 31, weekInquiries: 86, monthDeals: 49, revenue: 276000, dealRate: 0.16 },
    { name: "微信客服号", users: 2140, todayNew: 24, weekInquiries: 68, monthDeals: 33, revenue: 193000, dealRate: 0.14 },
    { name: "社群成交池", users: 2140, todayNew: 19, weekInquiries: 50, monthDeals: 46, revenue: 231000, dealRate: 0.22 }
  ],
  funnels: [
    { stage: "新增客资", value: 3620 },
    { stage: "有效询单", value: 1298 },
    { stage: "深度沟通", value: 628 },
    { stage: "报价跟进", value: 302 },
    { stage: "成交用户", value: 186 }
  ],
  customerStages: [
    { label: "沉默用户", count: 4280, note: "近30天无互动，建议触发二次唤醒。" },
    { label: "潜在意向", count: 2330, note: "已看内容但未咨询，适合做案例和价格试探。" },
    { label: "高意向", count: 640, note: "已咨询、收藏或索要方案，需要重点跟进。" },
    { label: "成交用户", count: 186, note: "本月成交，建议同步做复购与转介绍。" }
  ],
  orders: [
    { team: "销售一组", count: 52, amount: 312000, avgAmount: 6000, conversion: 0.19 },
    { team: "销售二组", count: 47, amount: 286000, avgAmount: 6085, conversion: 0.17 },
    { team: "私域顾问组", count: 38, amount: 245000, avgAmount: 6447, conversion: 0.21 },
    { team: "社群成交组", count: 49, amount: 195000, avgAmount: 3979, conversion: 0.26 }
  ],
  userPortrait: {
    regions: [
      { name: "华东", value: 38, cities: "杭州 / 上海 / 苏州 / 宁波" },
      { name: "华南", value: 22, cities: "广州 / 深圳 / 佛山 / 东莞" },
      { name: "华中", value: 15, cities: "武汉 / 长沙 / 郑州" },
      { name: "西南", value: 13, cities: "成都 / 重庆 / 昆明" },
      { name: "华北", value: 12, cities: "北京 / 天津 / 石家庄" }
    ],
    industries: [
      { name: "企业服务", value: 24 },
      { name: "本地生活", value: 21 },
      { name: "家装家居", value: 16 },
      { name: "教育培训", value: 14 },
      { name: "医疗健康", value: 11 },
      { name: "连锁零售", value: 14 }
    ],
    companySizes: [
      { name: "1-10人", value: 32 },
      { name: "11-30人", value: 29 },
      { name: "31-100人", value: 22 },
      { name: "101-300人", value: 11 },
      { name: "300人以上", value: 6 }
    ],
    identities: [
      { name: "老板 / 创始人", value: 28 },
      { name: "市场负责人", value: 18 },
      { name: "运营负责人", value: 17 },
      { name: "销售负责人", value: 15 },
      { name: "门店负责人", value: 12 },
      { name: "招商主管 / 商务", value: 10 }
    ],
    budgets: [
      { name: "3千以下", value: 14 },
      { name: "3千-1万", value: 26 },
      { name: "1万-3万", value: 31 },
      { name: "3万-10万", value: 19 },
      { name: "10万以上", value: 10 }
    ],
    decisionStages: [
      { name: "认知阶段", value: 25, note: "更多关注案例和行业趋势" },
      { name: "对比阶段", value: 31, note: "会频繁问价格、效果和流程" },
      { name: "意向阶段", value: 27, note: "会主动要方案或约沟通" },
      { name: "成交阶段", value: 17, note: "重点关心风险、服务与交付" }
    ],
    customerTags: [
      { name: "本地门店增长", value: 23 },
      { name: "品牌获客转化", value: 19 },
      { name: "招商加盟引流", value: 17 },
      { name: "高客单线索转化", value: 14 },
      { name: "私域成交复购", value: 15 },
      { name: "矩阵账号代运营", value: 12 }
    ],
    sourceChannels: [
      { name: "抖音评论 / 私信", value: 34 },
      { name: "视频号咨询", value: 18 },
      { name: "小红书线索", value: 12 },
      { name: "直播间导流", value: 9 },
      { name: "社群转介绍", value: 15 },
      { name: "老客户复购", value: 12 }
    ],
    sampleCustomers: [
      {
        name: "杭州某家装公司",
        region: "杭州",
        industry: "家装家居",
        companySize: "31-100人",
        identity: "市场负责人",
        stage: "意向阶段",
        budget: "3万-10万",
        need: "想提升短视频线索量并优化客服承接话术"
      },
      {
        name: "深圳某医美机构",
        region: "深圳",
        industry: "医疗健康",
        companySize: "11-30人",
        identity: "老板 / 创始人",
        stage: "对比阶段",
        budget: "1万-3万",
        need: "想解决评论多但私信少的问题"
      },
      {
        name: "上海某企业服务公司",
        region: "上海",
        industry: "企业服务",
        companySize: "101-300人",
        identity: "销售负责人",
        stage: "成交阶段",
        budget: "10万以上",
        need: "希望搭建内容获客到私域成交的标准化流程"
      }
    ]
  }
};

const dashboardOverview = {
  accountSummary: {
    totalAccounts: 86,
    activeAccounts: 74,
    normalAccounts: 69,
    warningAccounts: 11,
    invalidAccounts: 6
  },
  dailyTrend: [
    { day: "周一", play: 98, leads: 36, deals: 6 },
    { day: "周二", play: 126, leads: 42, deals: 8 },
    { day: "周三", play: 132, leads: 45, deals: 7 },
    { day: "周四", play: 168, leads: 53, deals: 11 },
    { day: "周五", play: 182, leads: 61, deals: 13 },
    { day: "周六", play: 155, leads: 48, deals: 9 },
    { day: "周日", play: 147, leads: 44, deals: 8 }
  ],
  accountRanking: [
    { name: "杭州矩阵A-抖音01", platform: "抖音", publishCount: 34, leads: 128, revenue: 296000 },
    { name: "品牌主号-视频号", platform: "视频号", publishCount: 21, leads: 84, revenue: 212000 },
    { name: "同城门店-快手03", platform: "快手", publishCount: 18, leads: 51, revenue: 118000 },
    { name: "品牌主号-小红书01", platform: "小红书", publishCount: 16, leads: 47, revenue: 96000 }
  ],
  geoHotspots: [
    { name: "杭州", lng: 120.15, lat: 30.28, value: 94, type: "前端内容热区" },
    { name: "上海", lng: 121.47, lat: 31.23, value: 76, type: "高客单成交区" },
    { name: "广州", lng: 113.26, lat: 23.13, value: 63, type: "私域询单密集区" },
    { name: "深圳", lng: 114.05, lat: 22.55, value: 58, type: "企业服务客资区" },
    { name: "成都", lng: 104.06, lat: 30.67, value: 47, type: "内容增长潜力区" }
  ]
};

const contentAccountProfiles = {
  "杭州矩阵A-抖音01": {
    regions: [
      { name: "浙江", value: 28 },
      { name: "江苏", value: 20 },
      { name: "广东", value: 13 },
      { name: "上海", value: 12 },
      { name: "福建", value: 8 }
    ],
    ages: [
      { name: "24-30岁", value: 27 },
      { name: "31-35岁", value: 34 },
      { name: "36-40岁", value: 22 },
      { name: "41-45岁", value: 11 },
      { name: "45岁以上", value: 6 }
    ],
    genders: [
      { name: "男性", value: 56 },
      { name: "女性", value: 44 }
    ],
    industries: [
      { name: "企业服务", value: 25 },
      { name: "本地生活", value: 22 },
      { name: "家装家居", value: 17 },
      { name: "教育培训", value: 16 },
      { name: "大健康", value: 20 }
    ],
    identities: [
      { name: "老板 / 创始人", value: 29 },
      { name: "市场负责人", value: 23 },
      { name: "运营负责人", value: 18 },
      { name: "销售负责人", value: 15 },
      { name: "店长 / 门店负责人", value: 15 }
    ]
  },
  "杭州矩阵A-视频号02": {
    regions: [
      { name: "浙江", value: 24 },
      { name: "上海", value: 18 },
      { name: "北京", value: 14 },
      { name: "广东", value: 13 },
      { name: "山东", value: 9 }
    ],
    ages: [
      { name: "25-30岁", value: 18 },
      { name: "31-35岁", value: 29 },
      { name: "36-40岁", value: 29 },
      { name: "41-45岁", value: 16 },
      { name: "45岁以上", value: 8 }
    ],
    genders: [
      { name: "男性", value: 52 },
      { name: "女性", value: 48 }
    ],
    industries: [
      { name: "招商加盟", value: 23 },
      { name: "企业服务", value: 27 },
      { name: "教育培训", value: 17 },
      { name: "制造业", value: 15 },
      { name: "软件服务", value: 18 }
    ],
    identities: [
      { name: "创始人", value: 25 },
      { name: "销售负责人", value: 24 },
      { name: "市场负责人", value: 18 },
      { name: "运营经理", value: 17 },
      { name: "商务负责人", value: 16 }
    ]
  },
  "品牌主号-小红书01": {
    regions: [
      { name: "广东", value: 19 },
      { name: "浙江", value: 17 },
      { name: "四川", value: 13 },
      { name: "重庆", value: 12 },
      { name: "湖北", value: 9 }
    ],
    ages: [
      { name: "20-24岁", value: 14 },
      { name: "25-30岁", value: 32 },
      { name: "31-35岁", value: 23 },
      { name: "36-40岁", value: 18 },
      { name: "40岁以上", value: 13 }
    ],
    genders: [
      { name: "男性", value: 41 },
      { name: "女性", value: 59 }
    ],
    industries: [
      { name: "美业", value: 18 },
      { name: "家装家居", value: 24 },
      { name: "本地生活", value: 21 },
      { name: "知识付费", value: 17 },
      { name: "电商", value: 20 }
    ],
    identities: [
      { name: "品牌主理人", value: 22 },
      { name: "内容运营", value: 27 },
      { name: "门店经营者", value: 19 },
      { name: "自媒体从业者", value: 16 },
      { name: "客服 / 销售", value: 16 }
    ]
  },
  "同城门店-快手03": {
    regions: [
      { name: "浙江", value: 36 },
      { name: "江苏", value: 12 },
      { name: "安徽", value: 11 },
      { name: "江西", value: 10 },
      { name: "河南", value: 8 }
    ],
    ages: [
      { name: "24-30岁", value: 22 },
      { name: "31-35岁", value: 28 },
      { name: "36-40岁", value: 23 },
      { name: "41-45岁", value: 16 },
      { name: "45岁以上", value: 11 }
    ],
    genders: [
      { name: "男性", value: 62 },
      { name: "女性", value: 38 }
    ],
    industries: [
      { name: "餐饮", value: 29 },
      { name: "零售", value: 22 },
      { name: "生活服务", value: 20 },
      { name: "家居建材", value: 17 },
      { name: "教育培训", value: 12 }
    ],
    identities: [
      { name: "门店老板", value: 34 },
      { name: "店长", value: 28 },
      { name: "运营", value: 14 },
      { name: "销售", value: 12 },
      { name: "招商主管", value: 12 }
    ]
  }
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function readJsonLocal(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return clone(fallback);
    const data = JSON.parse(raw);
    return data && typeof data === "object" ? data : clone(fallback);
  } catch {
    return clone(fallback);
  }
}

export function writeAgentConfigs(items) {
  const next = Array.isArray(items) ? items : [];
  window.localStorage.setItem(AGENT_STORAGE_KEY, JSON.stringify(next));
  return clone(next);
}

export function readAgentConfigs() {
  const saved = readJsonLocal(AGENT_STORAGE_KEY, defaultAgents);
  return Array.isArray(saved) && saved.length ? clone(saved) : clone(defaultAgents);
}

export function getContentRecords() {
  return clone(contentRecords);
}

export function getPrivateDomainOverview() {
  return clone(privateDomainOverview);
}

export function getDashboardOverview() {
  return clone(dashboardOverview);
}

export function getContentAccountProfiles() {
  return clone(contentAccountProfiles);
}

export function formatNumber(value) {
  return new Intl.NumberFormat("zh-CN").format(Number(value || 0));
}

export function formatPercent(value, digits = 1) {
  return `${(Number(value || 0) * 100).toFixed(digits)}%`;
}

export function calcTrafficStage(record) {
  const play = Number(record?.playCount || 0);
  const finishRate = Number(record?.finishRate || 0);
  const dmCount = Number(record?.dmCount || 0);
  const interactionRate = play > 0 ? (Number(record?.likeCount || 0) + Number(record?.commentCount || 0) + Number(record?.shareCount || 0)) / play : 0;
  let score = 1;
  if (play > 15000) score += 1;
  if (play > 60000) score += 1;
  if (finishRate >= 0.25) score += 1;
  if (finishRate >= 0.38 || interactionRate >= 0.08 || dmCount >= 80) score += 1;
  const stars = Math.max(1, Math.min(5, score));
  const stageMap = {
    1: { label: "一星｜素材试错期", desc: "内容还在验证阶段，平台只给了很小的基础流量，优先检查选题、封面和前3秒钩子。" },
    2: { label: "二星｜冷启动观察期", desc: "平台开始观察用户反馈，说明内容有基础点击，但互动和停留还不够稳定。" },
    3: { label: "三星｜精准试探期", desc: "内容已经进入较明确的人群测试阶段，需要重点拉高评论质量和私信转化。" },
    4: { label: "四星｜扩散放量期", desc: "内容开始获得更大流量分发，适合放大评论引导和私域承接动作。" },
    5: { label: "五星｜优秀爆发期", desc: "内容在播放、互动和转化链路上都较强，建议立即复制选题和节奏打法。" }
  };
  return { stars, ...stageMap[stars] };
}

export function analyzeComments(comments, keyword = "") {
  const list = Array.isArray(comments) ? comments.map((item) => String(item || "").trim()).filter(Boolean) : [];
  const kw = String(keyword || "").trim();
  const filtered = kw ? list.filter((item) => item.toLowerCase().includes(kw.toLowerCase())) : list;
  const marketingKeywords = ["报价", "多少钱", "价格", "合作", "课程", "代运营", "方案", "链接", "私信", "咨询", "购买"];
  const serviceKeywords = ["微信", "电话", "联系", "预约", "发我", "下单", "地址", "客户", "加我", "留个方式"];
  const marketingHits = filtered.filter((item) => marketingKeywords.some((kwd) => item.includes(kwd)));
  const serviceHits = filtered.filter((item) => serviceKeywords.some((kwd) => item.includes(kwd)));
  return {
    filtered,
    count: filtered.length,
    marketingHits,
    marketingRate: filtered.length ? marketingHits.length / filtered.length : 0,
    serviceHits,
    serviceRate: filtered.length ? serviceHits.length / filtered.length : 0
  };
}

export function summarizePortraitGroups(groups = []) {
  return (Array.isArray(groups) ? groups : [])
    .map((item) => ({ name: String(item?.name || "").trim(), value: Number(item?.value || 0) || 0, note: String(item?.note || item?.cities || "").trim() }))
    .filter((item) => item.name)
    .sort((a, b) => Number(b.value || 0) - Number(a.value || 0));
}

export function getTopPortraitItem(groups = []) {
  const list = summarizePortraitGroups(groups);
  return list[0] || null;
}

export function buildAgentAdvice({ agent, record, keyword = "", customQuestion = "" }) {
  const stage = calcTrafficStage(record);
  const commentSummary = analyzeComments(record?.comments || [], keyword);
  const dmCount = Number(record?.dmCount || 0);
  const playCount = Number(record?.playCount || 0);
  const leadRate = playCount > 0 ? Number(record?.leadCount || 0) / playCount : 0;
  const marketingTone = commentSummary.marketingRate >= 0.28 ? "营销指向很明确" : commentSummary.marketingRate >= 0.12 ? "具备一定营销意图" : "营销指向仍偏弱";
  const serviceTone = commentSummary.serviceRate >= 0.18 ? "高意向客服线索较多" : commentSummary.serviceRate >= 0.08 ? "已有部分咨询型线索" : "客服意向线索还偏少";
  const focus = customQuestion || "请给出下一步优化建议";
  const roleName = String(agent?.name || "当前智能体").trim();
  return [
    `${roleName}判断：该作品目前处于${stage.label}。${stage.desc}`,
    `从评论和私信反馈看，当前作品${marketingTone}，同时${serviceTone}。当前私信 ${formatNumber(dmCount)} 条，线索转化率约 ${formatPercent(leadRate, 2)}。`,
    `建议优先动作：1）把评论区中出现频率最高的咨询问题单独做成下一条内容标题；2）在视频结尾补一个更明确的私信/留言引导；3）把高意向评论统一打标签并同步给私域跟进。`,
    `本次问题：${focus}。可结合该智能体的角色提示词继续往下追问，例如“为什么卡在这个流量阶段”或“评论里哪些人最值得跟进”。`
  ].join("\n");
}
