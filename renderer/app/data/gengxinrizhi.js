// 自动生成：帮助页更新日志数据，来源于项目根目录“更新记录.md”。
export const HELP_CHANGELOGS = [
  {
    "version": "0.7.3",
    "versionLabel": "v0.7.3",
    "date": "2026-07-06 17:31:19",
    "summary": "不空IP智能体 0.7.3 安装包",
    "items": [
      "不空IP智能体 0.7.3 安装包"
    ]
  },
  {
    "version": "0.7.2",
    "versionLabel": "v0.7.2",
    "date": "2026-07-05 16:49:48",
    "summary": "不空IP智能体 0.7.2 安装包",
    "items": [
      "不空IP智能体 0.7.2 安装包"
    ]
  },
  {
    "version": "0.7.1",
    "versionLabel": "v0.7.1",
    "date": "2026-07-04 16:43:27",
    "summary": "优化安装包安装中途旧进程无法关闭的问题，重写 NSIS ...",
    "items": [
      "优化安装包安装中途旧进程无法关闭的问题，重写 NSIS 关进程逻辑并在真正安装前补一轮清理",
      "优化桌面端打开速度，首屏改为先显示界面再后台补同步，并给主窗口增加 did-finish-load 与超时兜底显示",
      "设置页 OpenClaw 接口新增“生成SKILL”按钮，可在桌面一键导出给 OpenClaw 使用的说明文件、工具清单和 plan 示例"
    ]
  },
  {
    "version": "0.6.9",
    "versionLabel": "v0.6.9",
    "date": "2026-07-01 01:05:59",
    "summary": "重新核查安装包白名单并收紧静态资源过滤，仅打包程序代码、...",
    "items": [
      "重新核查安装包白名单并收紧静态资源过滤，仅打包程序代码、hermes-agent、字体文件、bgm、voice-preview-cache/sys_*.wav",
      "确认不打包 avatar-assets、models/models、runtime-data、账号信息、数字人形象、发布草稿、模板缓存、历史视频、本地调试产物与 ziti 目录中的无关 mp4",
      "重新生成更纯净的 V0.6.9 安装包、update.json、latest.yml、blockmap 与标准发布目录，可直接上传给用户使用"
    ]
  },
  {
    "version": "0.6.8",
    "versionLabel": "v0.6.8",
    "date": "2026-06-30 21:27:59",
    "summary": "V0.6.8 白名单重打包，排除旧账号与运行时数据",
    "items": [
      "本轮重新核查安装包白名单，继续只打程序代码、`hermes-agent`、`ziti`、`bgm`、`voice-preview-cache/sys_*.wav` 等必要静态资源。",
      "确认不打包 `models/models/**`、`avatar-assets`、`runtime-data/accounts`、`avatar-library`、`publish_drafts`、`template_stores`、`talking_videos`、`video_edits` 等历史用户数据目录。",
      "已重新生成 `V0.6.8` 安装包、`update.json`、`latest.yml`、`.blockmap` 与标准发布目录，可直接给用户下载安装。"
    ]
  },
  {
    "version": "0.6.7",
    "versionLabel": "v0.6.7",
    "date": "2026-06-30 21:09:38",
    "summary": "V0.6.7 正式安装包与发布配套文件",
    "items": [
      "将桌面端版本号从 `0.6.6` 升级到 `0.6.7`，重新生成正式安装包。",
      "同步生成 `update.json`、`latest.yml`、`.blockmap`、`dabaojilu.json` 与标准发布目录。",
      "帮助菜单更新日志数据已随打包脚本自动刷新，便于用户在帮助页回看最新版本记录。"
    ]
  },
  {
    "version": "0.6.6",
    "versionLabel": "v0.6.6",
    "date": "2026-06-29 18:37:06",
    "summary": "首页工作台与发布导出链路继续优化",
    "items": [
      "首页菜单恢复后续版本常用结构，补回模型选择框与视频发布中的一键导出能力。",
      "首页“字幕和音乐”、模板选择弹窗与视频发布导出区继续美化排版，交互层级更清晰。",
      "核心生成按钮支持运行中再次点击停止，减少长任务无法中断的问题。",
      "本轮同时产出测试分发包，收紧打包白名单，不再内置 `models/models/**` 和 `avatar-assets`。"
    ]
  },
  {
    "version": "0.6.5",
    "versionLabel": "v0.6.5",
    "date": "2026-06-28 16:47:40",
    "summary": "模型中心第一阶段正式接入桌面端",
    "items": [
      "新增本地模型中心，支持模型目录配置、批量导入 Bundles、失败报告与导入日志导出。",
      "首页业务入口与模型中心打通，缺少 ASR、TTS、VideoSync 时可直接跳转模型页处理。",
      "模型页完成第一批 UI 标准化，统一卡片结构、状态反馈与导入结果展示。"
    ]
  },
  {
    "version": "0.6.4",
    "versionLabel": "v0.6.4",
    "date": "2026-06-28 16:19:12",
    "summary": "模板实时预览同步与模型分发策略收口",
    "items": [
      "修复字幕模板与封面模板的字体加载、右侧实时预览和模板缩略图不同步问题。",
      "统一模板预览调度与本地字体注册逻辑，改善字体切换后预览不刷新的问题。",
      "安装包开始按“models 单独下载”策略收口，缺模型提示同步改为引导用户单独补充模型目录。"
    ]
  },
  {
    "version": "0.6.2",
    "versionLabel": "v0.6.2",
    "date": "2026-06-28 14:56:20",
    "summary": "不空IP智能体 0.6.2 安装包",
    "items": [
      "不空IP智能体 0.6.2 安装包"
    ]
  },
  {
    "version": "0.6.1",
    "versionLabel": "v0.6.1",
    "date": "2026-06-28 14:27:58",
    "summary": "不空IP智能体 0.6.1 安装包",
    "items": [
      "不空IP智能体 0.6.1 安装包"
    ]
  },
  {
    "version": "0.6.0",
    "versionLabel": "v0.6.0",
    "date": "2026-06-28 14:07:34",
    "summary": "不空IP智能体 0.6.0 安装包",
    "items": [
      "不空IP智能体 0.6.0 安装包"
    ]
  },
  {
    "version": "0.5.8",
    "versionLabel": "v0.5.8",
    "date": "2026-06-28 01:44:10",
    "summary": "不空IP智能体 0.5.8 安装包",
    "items": [
      "不空IP智能体 0.5.8 安装包"
    ]
  },
  {
    "version": "0.5.9",
    "versionLabel": "v0.5.9",
    "date": "2026-06-28 00:56:00",
    "summary": "不空IP智能体 0.5.9 安装包",
    "items": [
      "不空IP智能体 0.5.9 安装包"
    ]
  },
  {
    "version": "0.5.7",
    "versionLabel": "v0.5.7",
    "date": "2026-06-28 00:30:38",
    "summary": "不空IP智能体 0.5.7 安装包",
    "items": [
      "不空IP智能体 0.5.7 安装包"
    ]
  },
  {
    "version": "0.5.6",
    "versionLabel": "v0.5.6",
    "date": "2026-06-28 00:24:29",
    "summary": "不空IP智能体 0.5.6 安装包",
    "items": [
      "不空IP智能体 0.5.6 安装包"
    ]
  },
  {
    "version": "0.5.5",
    "versionLabel": "v0.5.5",
    "date": "2026-06-27 23:47:15",
    "summary": "不空IP智能体 0.5.5 安装包",
    "items": [
      "不空IP智能体 0.5.5 安装包"
    ]
  },
  {
    "version": "0.5.4",
    "versionLabel": "v0.5.4",
    "date": "2026-06-27 23:33:10",
    "summary": "不空IP智能体 0.5.4 安装包",
    "items": [
      "不空IP智能体 0.5.4 安装包"
    ]
  },
  {
    "version": "0.5.3",
    "versionLabel": "v0.5.3",
    "date": "2026-06-27 23:04:50",
    "summary": "不空IP智能体 0.5.3 安装包",
    "items": [
      "不空IP智能体 0.5.3 安装包"
    ]
  },
  {
    "version": "0.5.2",
    "versionLabel": "v0.5.2",
    "date": "2026-06-27 22:37:40",
    "summary": "不空IP智能体 0.5.2 安装包",
    "items": [
      "不空IP智能体 0.5.2 安装包"
    ]
  },
  {
    "version": "0.5.1",
    "versionLabel": "v0.5.1",
    "date": "2026-06-27 22:16:20",
    "summary": "不空IP智能体 0.5.1 安装包",
    "items": [
      "不空IP智能体 0.5.1 安装包"
    ]
  },
  {
    "version": "0.5.0",
    "versionLabel": "v0.5.0",
    "date": "2026-06-27 21:41:09",
    "summary": "不空IP智能体 0.5.0 安装包",
    "items": [
      "不空IP智能体 0.5.0 安装包"
    ]
  },
  {
    "version": "0.4.9",
    "versionLabel": "v0.4.9",
    "date": "2026-06-27 21:16:49",
    "summary": "不空IP智能体 0.4.9 安装包",
    "items": [
      "不空IP智能体 0.4.9 安装包"
    ]
  },
  {
    "version": "0.4.8",
    "versionLabel": "v0.4.8",
    "date": "2026-06-27 20:55:57",
    "summary": "不空IP智能体 0.4.8 安装包",
    "items": [
      "不空IP智能体 0.4.8 安装包"
    ]
  },
  {
    "version": "0.4.7",
    "versionLabel": "v0.4.7",
    "date": "2026-06-27 20:18:17",
    "summary": "不空IP智能体 0.4.7 安装包",
    "items": [
      "不空IP智能体 0.4.7 安装包"
    ]
  },
  {
    "version": "0.4.6",
    "versionLabel": "v0.4.6",
    "date": "2026-06-27 19:31:53",
    "summary": "不空IP智能体 0.4.6 安装包",
    "items": [
      "不空IP智能体 0.4.6 安装包"
    ]
  },
  {
    "version": "0.4.5",
    "versionLabel": "v0.4.5",
    "date": "2026-06-27 17:19:45",
    "summary": "不空IP智能体 0.4.5 安装包",
    "items": [
      "不空IP智能体 0.4.5 安装包"
    ]
  },
  {
    "version": "0.4.4",
    "versionLabel": "v0.4.4",
    "date": "2026-06-27 16:14:27",
    "summary": "不空IP智能体 0.4.4 安装包",
    "items": [
      "不空IP智能体 0.4.4 安装包"
    ]
  },
  {
    "version": "0.4.3",
    "versionLabel": "v0.4.3",
    "date": "2026-06-27 15:39:17",
    "summary": "不空IP智能体 0.4.3 安装包",
    "items": [
      "不空IP智能体 0.4.3 安装包"
    ]
  },
  {
    "version": "0.4.2",
    "versionLabel": "v0.4.2",
    "date": "2026-06-27 02:22:50",
    "summary": "不空IP智能体 0.4.2 安装包",
    "items": [
      "不空IP智能体 0.4.2 安装包"
    ]
  },
  {
    "version": "0.4.1",
    "versionLabel": "v0.4.1",
    "date": "2026-06-27 01:50:17",
    "summary": "不空IP智能体 0.4.1 安装包",
    "items": [
      "不空IP智能体 0.4.1 安装包"
    ]
  },
  {
    "version": "0.4.0",
    "versionLabel": "v0.4.0",
    "date": "2026-06-27 01:35:38",
    "summary": "不空IP智能体 0.4.0 安装包",
    "items": [
      "不空IP智能体 0.4.0 安装包"
    ]
  },
  {
    "version": "0.3.9",
    "versionLabel": "v0.3.9",
    "date": "2026-06-27 00:12:55",
    "summary": "V0.3.9更新内容：帮助菜单更新日志改为自动读取更新记...",
    "items": [
      "V0.3.9更新内容：帮助菜单更新日志改为自动读取更新记录并展示最近三次版本",
      "优化帮助菜单交互与界面",
      "用于验证 V0.3.8 到 V0.3.9 的自动更新与自动安装链路。"
    ]
  },
  {
    "version": "0.3.8",
    "versionLabel": "v0.3.8",
    "date": "2026-06-26 23:54:41",
    "summary": "登录修复与自动更新判断源切换",
    "items": [
      "修复登录页 `cloudAuth:getIdentityConfig` 未注册导致的身份权限配置报错。",
      "桌面端自动更新判断源切换为云数据库 `update` 表，不再依赖云存储 `manifest/update.json`。",
      "当前版本安装包与 `manifest / exe / latest / blockmap` 标准发布配套文件已重新生成。"
    ]
  },
  {
    "version": "0.3.7",
    "versionLabel": "v0.3.7",
    "date": "2026-06-26 22:00:23",
    "summary": "自动更新兼容旧清单格式并修复版本判断",
    "items": [
      "修复自动更新配置归档异常，避免把 `.exe` 下载地址误写成标准更新根地址。",
      "兼容旧格式 `patch` 清单字段，降低云端误传旧结构时的更新失败概率。",
      "完成 `V0.3.7` 安装包、发布清单和自动更新验证版构建。"
    ]
  },
  {
    "version": "0.3.6",
    "versionLabel": "v0.3.6",
    "date": "2026-06-26 19:55:57",
    "summary": "继续收口发布目录与更新检查链路",
    "items": [
      "按发布专属目录模型重新生成 `manifest / exe / latest / blockmap` 发布结构。",
      "继续用于验证 `V0.3.5 -> V0.3.6` 的新版本识别和云端清单同步链路。",
      "为后续定位“当前已是最新版本”的更新判断问题提供了实际安装测试基线。"
    ]
  },
  {
    "version": "0.3.5",
    "versionLabel": "v0.3.5",
    "date": "2026-06-26 19:41:18",
    "summary": "修复安装版字幕与音乐模块的 ffmpeg 路径问题",
    "items": [
      "修复安装版在首页“字幕和音乐”模块中点击生成时提示 `ffmpeg.exe not found` 的问题。",
      "主进程改为优先从当前已选 ASR Bundle 的 `runtime/ffmpeg/bin/ffmpeg.exe` 解析运行时文件。",
      "生成 `V0.3.5` 安装包、配套文件与差分发布产物，作为后续自动更新测试基线。"
    ]
  }
];

export default HELP_CHANGELOGS;
