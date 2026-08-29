import { icons } from "./icons.js";

import { route as login } from "./yemian/yonghudenglu.js";
import { route as accountInfo } from "./yemian/zhanghaoxinxi.js";
import { route as home } from "./yemian/shouye.js";
import { route as monitor } from "./yemian/tonghangjiankong.js";
import { route as parse } from "./yemian/neirongjiexi.js";
import { route as copywriting } from "./yemian/wenanxiezuo.js";
import { route as storyboard } from "./yemian/fenjingyujiaoben.js";
import { route as assets } from "./yemian/sucaiguanli.js";
import { route as audioExtract } from "./yemian/yinpintiqu.js";
import { route as voiceClone } from "./yemian/shengyinkelong.js";
import { route as avatarLibrary } from "./yemian/shuzirenxingxiang.js";
import { route as avatarSynthesis } from "./yemian/shuzirenhecheng.js";
import { route as video } from "./yemian/shipinshengchan.js";
import { route as videoTemplates } from "./yemian/shipintemoban.js";
import { route as subtitleTemplates } from "./yemian/zimutemoban.js";
import { route as coverTemplates } from "./yemian/fengmiantemoban.js";
import { route as accounts } from "./yemian/zhanghaoguanli.js";
import { route as publish } from "./yemian/fabuguanli.js";
import { route as tasks } from "./yemian/renwuzhongxin.js";
import { route as analytics } from "./yemian/shujufenxi.js";
import { route as dataScreen } from "./yemian/dashujudaping.js";
import { route as privateDomain } from "./yemian/siyuguanli.js";
import { route as agentManagement } from "./yemian/zhinengtiguanli.js";
import { route as contentManagement } from "./yemian/neirongguanli.js";
import { route as models } from "./yemian/moxingguanli.js";
import { route as legalReview } from "./yemian/aifawushenhe.js";
import { route as settings } from "./yemian/shezhi.js";
import { route as help } from "./yemian/bangzhu.js";
import { route as search } from "./yemian/quanjusousuo.js";
import { route as noAccess } from "./yemian/wuquanxian.js";

export const routes = [
  login,
  accountInfo,
  home,
  monitor,
  parse,
  copywriting,
  storyboard,
  assets,
  audioExtract,
  voiceClone,
  avatarLibrary,
  avatarSynthesis,
  video,
  videoTemplates,
  subtitleTemplates,
  coverTemplates,
  accounts,
  publish,
  tasks,
  analytics,
  dataScreen,
  privateDomain,
  agentManagement,
  contentManagement,
  models,
  legalReview,
  settings,
  help,
  search,
  noAccess
];

export const navItems = [
  { path: home.path, title: home.title, icon: icons.home },
  { path: monitor.path, title: monitor.title, icon: icons.monitor },
  { path: parse.path, title: parse.title, icon: icons.parse },
  { path: copywriting.path, title: copywriting.title, icon: icons.copy },
  { path: storyboard.path, title: storyboard.title, icon: icons.storyboard },
  { path: assets.path, title: assets.title, icon: icons.asset },
  { path: audioExtract.path, title: audioExtract.title, icon: icons.audio },
  { path: voiceClone.path, title: voiceClone.title, icon: icons.mic },
  { path: avatarLibrary.path, title: avatarLibrary.title, icon: icons.avatar },
  { path: avatarSynthesis.path, title: avatarSynthesis.title, icon: icons.synthesis },
  { path: video.path, title: video.title, icon: icons.video },
  { path: videoTemplates.path, title: videoTemplates.title, icon: icons.videoTemplate },
  { path: subtitleTemplates.path, title: subtitleTemplates.title, icon: icons.subtitleTemplate },
  { path: coverTemplates.path, title: coverTemplates.title, icon: icons.coverTemplate },
  { path: accounts.path, title: accounts.title, icon: icons.accounts },
  { path: publish.path, title: publish.title, icon: icons.publish },
  { path: tasks.path, title: tasks.title, icon: icons.tasks },
  { path: analytics.path, title: analytics.title, icon: icons.chart },
  { path: dataScreen.path, title: dataScreen.title, icon: icons.dataScreen },
  { path: privateDomain.path, title: privateDomain.title, icon: icons.privateDomain },
  { path: agentManagement.path, title: agentManagement.title, icon: icons.agentManagement },
  { path: contentManagement.path, title: contentManagement.title, icon: icons.contentManagement },
  { path: models.path, title: models.title, icon: icons.model }
];

export const menuKeyByPath = {
  [home.path]: "home",
  [monitor.path]: "monitor",
  [parse.path]: "parse",
  [copywriting.path]: "copywriting",
  [storyboard.path]: "storyboard",
  [assets.path]: "assets",
  [audioExtract.path]: "audioExtract",
  [voiceClone.path]: "voiceClone",
  [avatarLibrary.path]: "avatarLibrary",
  [avatarSynthesis.path]: "avatarSynthesis",
  [video.path]: "video",
  [videoTemplates.path]: "videoTemplates",
  [subtitleTemplates.path]: "subtitleTemplates",
  [coverTemplates.path]: "coverTemplates",
  [accounts.path]: "accounts",
  [publish.path]: "publish",
  [tasks.path]: "tasks",
  [analytics.path]: "analytics",
  [dataScreen.path]: "dataScreen",
  [privateDomain.path]: "privateDomain",
  [agentManagement.path]: "agentManagement",
  [contentManagement.path]: "contentManagement",
  [models.path]: "models",
  [accountInfo.path]: "account",
  [settings.path]: "settings",
  [help.path]: "help"
};
