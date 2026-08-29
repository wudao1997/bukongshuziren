<div align="center">
  <img src="./renderer/assets/bukong-logo.ico" width="96" alt="不空 IP 智能体 Logo">
  <h1>不空 IP 智能体</h1>
  <p>面向内容创作者的 Electron 数字人内容生产与多平台发布桌面工具</p>

  <p>
    <img src="https://img.shields.io/badge/platform-Windows-0078D4?logo=windows" alt="Windows">
    <img src="https://img.shields.io/badge/Electron-32-47848F?logo=electron" alt="Electron 32">
    <img src="https://img.shields.io/badge/Node.js-%E2%89%A518-339933?logo=nodedotjs&logoColor=white" alt="Node.js 18+">
    <img src="https://img.shields.io/badge/license-ISC-green" alt="ISC License">
    <img src="https://img.shields.io/badge/version-0.7.3-blue" alt="Version 0.7.3">
  </p>
</div>

> 将文案创作、音视频处理、数字人合成、内容管理和多平台发布辅助集中到一个 Windows 桌面端中。

## 项目亮点

| 能力 | 说明 |
| --- | --- |
| AI 文案工作台 | 文案生成、标题与标签提取、内容解析、分镜与脚本辅助 |
| 数字人内容生产 | 数字人形象管理、音色克隆、音频提取、数字人视频合成 |
| 音视频工具 | 视频处理、封面与字幕模板、素材管理和任务管理 |
| 多模型配置 | 支持用户在本地配置不同模型供应商及 API Key |
| 多平台发布辅助 | 面向抖音、快手、小红书和视频号的浏览器自动化辅助 |
| 数据与运营 | 内容管理、账号管理、发布管理、数据分析和大屏展示 |
| 桌面端能力 | Electron 主进程、进程间通信、自动更新和 Windows 安装包构建 |

## 技术栈

- Electron 32
- Node.js 18+
- 原生 HTML、CSS 和 JavaScript
- WebSocket
- electron-builder / NSIS
- bsdiff 增量更新

## 快速开始

### 环境要求

- Windows 10/11
- Node.js 18 或更高版本
- npm
- Chrome 或 Edge（使用平台发布辅助功能时）

### 安装与运行

```powershell
git clone https://github.com/YOUR_NAME/YOUR_REPOSITORY.git
cd YOUR_REPOSITORY
npm ci
npm start
```

### 构建 Windows 安装包

```powershell
npm run dist
```

构建产物默认输出到 `dist/`，该目录不会提交到 Git。

## 配置云端能力

开源版本不绑定原作者的私有后端，也不包含任何账号、API Key 或用户数据。纯本地功能可以直接运行；登录、云同步和自动更新等能力需要配置你自己的兼容服务。

方式一：复制示例配置。

```powershell
Copy-Item yuming.example.json yuming.json
```

编辑 `yuming.json`：

```json
{
  "domain": "https://your-cloud-service.example.com",
  "updatedAt": ""
}
```

方式二：设置环境变量。

```powershell
$env:BUKONG_CLOUD_DOMAIN = "https://your-cloud-service.example.com"
$env:APP_UPDATE_RELEASE_BASE_URL = "https://downloads.example.com/release"
npm start
```

模型供应商的 API Key 应由最终用户在软件设置界面中填写，禁止提交到源码、Issue 或日志中。

## 项目结构

```text
.
├─ main.js                 # Electron 主进程与核心服务
├─ preload.js              # 安全的渲染进程能力桥接
├─ renderer/               # 桌面端界面、页面和静态资源
├─ gongneng/               # 通用业务能力模块
├─ douyin/                 # 抖音发布辅助
├─ kuaishou/               # 快手发布辅助
├─ xiaohongshu/            # 小红书发布辅助
├─ shipinhao/              # 视频号发布辅助
├─ build/                  # Windows 安装器配置
├─ scripts/                # 隐私与发布前检查脚本
├─ PRIVACY.md              # 隐私数据处理说明
└─ SECURITY.md             # 安全问题报告说明
```

## 隐私与安全

应用运行时可能产生设备标识、登录状态、浏览器 Cookie、克隆音色记录、用户音视频、导出文件和调试日志。这些内容已通过 `.gitignore` 排除，不应上传到公开仓库。

每次提交前建议运行：

```powershell
powershell -ExecutionPolicy Bypass -File scripts\check-privacy.ps1
git status --ignored
git diff --cached
```

详细规则请阅读 [PRIVACY.md](./PRIVACY.md) 和 [SECURITY.md](./SECURITY.md)。如果凭证曾经进入 Git 历史，必须立即撤销或轮换；删除当前文件并不能清除历史记录。

## 使用边界

> **本项目仅供学习研究使用。项目中包含的多平台自动化发布、同行监控等功能可能涉及第三方平台服务条款，使用者需自行评估合规性并承担相应风险，作者不对因使用本项目而导致的账号封禁、法律责任或其他损失负责。**

- 只处理你拥有合法授权的人脸、声音、视频和其他素材。
- 只操作你本人或已获授权管理的平台账号。
- 使用自动化功能时，应遵守平台服务条款、robots 规则及适用法律。
- 不得用于冒充他人、未经同意的声音或肖像克隆，以及虚假或欺诈性内容。

## 参与贡献

欢迎提交 Issue 和 Pull Request。提交代码前请：

1. 确认没有包含账号、Cookie、Token、个人素材或本机路径。
2. 运行隐私检查脚本。
3. 清楚说明改动目的、验证方法和可能影响。
4. 对新增第三方资源注明来源和授权方式。

## 路线图

- [ ] 完善独立后端部署文档
- [ ] 补充自动化测试与持续集成
- [ ] 增加可插拔模型供应商适配层
- [ ] 完善多语言界面
- [ ] 增加更细粒度的本地数据管理与导出能力

## 许可证

本项目采用 [ISC License](./LICENSE) 开源。

抖音、快手、小红书、视频号及其他第三方名称、图标和商标归各自权利人所有。本项目与这些平台不存在官方隶属、合作或背书关系。

---

<div align="center">
  <p>如果这个项目对你有帮助，欢迎 Star、Fork 或参与改进。</p>
</div>
