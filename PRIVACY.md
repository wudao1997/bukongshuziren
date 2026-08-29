# 隐私与开源发布说明

本仓库只应包含程序源码和必要的演示资源。以下内容必须保留在本机：

- `jiqima.json`：本机设备标识。
- `yuming.json`：实际部署域名。
- `dingshijiance.json`：本地运行状态和时间记录。
- `shouye/kelongyinpin/kelongyinpin.json`：克隆音色名称、供应商记录、音频地址和本地路径。
- Cookie、Token、Session、浏览器用户目录以及任何平台登录态。
- `.env`、证书、私钥、API Key 和模型供应商凭证。
- 用户上传的人脸、声音、视频、文案、导出结果与调试日志。
- 构建产物、安装包、缓存、字体、BGM 和其他许可证不明确的素材。

## 发布前检查

1. 运行 `scripts/check-privacy.ps1`，确认退出码为 0。
2. 运行 `git status --ignored`，确认运行时文件处于 ignored 状态。
3. 运行 `git diff --cached`，人工检查即将提交的全部内容。
4. 在 GitHub 推送保护中启用 Secret scanning 和 Push protection（仓库方案支持时）。
5. 如果敏感值曾经提交到任何 Git 历史，先撤销/轮换该凭证；仅删除当前文件不能清除历史。

扫描脚本用于降低误提交概率，不能代替人工审查。
