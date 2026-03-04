# GitHub Actions 工作流文档

本文档列出了项目中所有 GitHub Actions 工作流文件的路径、作用和使用场景。

**注意**: 标记为 `[已禁用]` 的工作流已被重命名为 `.disabled` 后缀，不会自动触发。如需重新启用，请将文件重命名回 `.yml` 后缀。

---

## 测试和质量保证

### `.github/workflows/test.yml`

**作用**: 运行单元测试和端到端测试
**使用场景**:

- 推送到 dev 分支时
- 创建或更新 Pull Request 时
- 手动触发
  **关键功能**:
- 在 Linux 和 Windows 上运行单元测试
- 运行 Playwright E2E 测试
- 测试失败时上传构建产物

### `.github/workflows/typecheck.yml`

**作用**: TypeScript 类型检查
**使用场景**:

- 推送到 dev 分支时
- 创建或更新 Pull Request 时
- 手动触发
  **关键功能**:
- 运行 `bun typecheck` 验证类型安全

### `.github/workflows/nix-eval.yml`

**作用**: 评估 Nix flake 输出
**使用场景**:

- 推送到 dev 分支时
- 创建或更新 Pull Request 时
- 手动触发
  **关键功能**:
- 在所有系统和包上评估 flake 输出

---

## 发布和打包

### `.github/workflows/publish.yml`

**作用**: 主要发布工作流
**使用场景**:

- 推送到 ci/dev/beta/snapshot-\* 分支时
- 手动触发
  **关键功能**:
- 版本号递增
- 构建 CLI 二进制文件
- 构建 Tauri 桌面应用（多平台）
- 发布到 NPM、AUR、Docker
- 创建 GitHub Release

### `.github/workflows/sign-cli.yml`

**作用**: 签名 Windows CLI 二进制文件
**使用场景**:

- 推送到特定分支时
- 手动触发
  **关键功能**:
- 使用 SignPath 服务签名 Windows 二进制文件

### `.github/workflows/build-cli.yml`

**作用**: 构建所有平台的 CLI 二进制文件
**使用场景**:

- 手动触发
  **关键功能**:
- 为 Linux、macOS、Windows 构建二进制文件
- 创建归档文件
- 上传构建产物

### `.github/workflows/publish-github-action.yml` [已禁用]

**作用**: 发布 GitHub Action 到市场
**使用场景**:

- 推送以 `github-v*` 开头的标签时
- 手动触发

### `.github/workflows/publish-vscode.yml` [已禁用]

**作用**: 发布 VSCode 扩展
**使用场景**:

- 推送以 `vscode-v*` 开头的标签时
- 手动触发
  **关键功能**:
- 安装 vsce 工具
- 发布扩展到 VSCode 市场

### `.github/workflows/release-github-action.yml` [已禁用]

**作用**: 自动发布 GitHub Action
**使用场景**:

- 推送到 dev 分支（github/** 目录变更时）
  **关键功能\*\*:
- 创建新的发布标签

---

## 部署

### `.github/workflows/deploy.yml` [已禁用]

**作用**: 部署到开发/生产环境
**使用场景**:

- 推送到 dev 或 production 分支时
- 手动触发
  **关键功能**:
- 使用 SST 部署到 Cloudflare、PlanetScale、Stripe
- 修复 Pulumi 冲突

### `.github/workflows/containers.yml`

**作用**: 构建和推送 Docker 容器
**使用场景**:

- 推送到 dev 分支（容器文件变更时）
- 手动触发
  **关键功能**:
- 构建并推送 Docker 镜像到 GHCR

### `.github/workflows/beta.yml` [已禁用]

**作用**: 同步 beta 分支
**使用场景**:

- 每小时自动运行
- 手动触发
  **关键功能**:
- 将 dev 分支同步到 beta 分支

---

## PR 管理和标准

### `.github/workflows/pr-management.yml` [已禁用]

**作用**: 管理 Pull Request
**使用场景**:

- 打开 Pull Request 时
  **关键功能**:
- 检查团队成员身份
- 使用 AI 检查重复 PR
- 添加贡献者标签

### `.github/workflows/pr-standards.yml` [已禁用]

**作用**: 强制 PR 标准
**使用场景**:

- 打开、编辑或同步 Pull Request 时
  **关键功能**:
- 检查 PR 标题格式（conventional commits）
- 要求关联 Issue
- 验证 PR 模板合规性
- 添加/移除标签

### `.github/workflows/review.yml` [已禁用]

**作用**: 自动代码审查
**使用场景**:

- 在 PR 中评论 `/review`（仅维护者）
  **关键功能**:
- 使用 AI 根据风格指南审查代码
- 创建行内评论

### `.github/workflows/close-stale-prs.yml` [已禁用]

**作用**: 关闭不活跃的 PR
**使用场景**:

- 每天早上 6 点自动运行
- 手动触发
  **关键功能**:
- 关闭 60+ 天不活跃的 PR 并添加评论

---

## Issue 管理

### `.github/workflows/triage.yml` [已禁用]

**作用**: 自动分类新 Issue
**使用场景**:

- 打开 Issue 时
  **关键功能**:
- 使用 AI 自动分类新 Issue

### `.github/workflows/duplicate-issues.yml` [已禁用]

**作用**: 检查重复 Issue
**使用场景**:

- 打开或编辑 Issue 时
  **关键功能**:
- 使用 AI 检查重复 Issue
- 验证模板合规性
- 添加标签和评论

### `.github/workflows/compliance-close.yml` [已禁用]

**作用**: 关闭不合规的 Issue/PR
**使用场景**:

- 每 30 分钟自动运行
- 手动触发
  **关键功能**:
- 查找不合规的项目
- 2 小时后自动关闭

### `.github/workflows/stale-issues.yml` [已禁用]

**作用**: 标记/关闭过期 Issue
**使用场景**:

- 每天凌晨 1:30 自动运行
- 手动触发
  **关键功能**:
- 使用 stale action 标记 90+ 天不活跃的 Issue

---

## 担保系统和访问控制

### `.github/workflows/vouch-manage-by-issue.yml` [已禁用]

**作用**: 通过 Issue 管理担保系统
**使用场景**:

- 创建 Issue 评论时
  **关键功能**:
- 设置 git 提交者信息
- 运行担保管理操作

### `.github/workflows/vouch-check-pr.yml` [已禁用]

**作用**: 检查 PR 作者是否被拒绝
**使用场景**:

- 打开 Pull Request 时
  **关键功能**:
- 解析 VOUCHED.td 文件
- 检查作者是否被拒绝
- 必要时自动关闭 PR

### `.github/workflows/vouch-check-issue.yml` [已禁用]

**作用**: 检查 Issue 作者是否被拒绝
**使用场景**:

- 打开 Issue 时
  **关键功能**:
- 解析 VOUCHED.td 文件
- 检查作者是否被拒绝
- 必要时自动关闭 Issue

---

## 文档

### `.github/workflows/docs-locale-sync.yml` [已禁用]

**作用**: 同步本地化文档
**使用场景**:

- 推送到 dev 分支（文档变更时）
  **关键功能**:
- 检测变更的文档
- 使用 AI 翻译到各语言
- 提交变更

### `.github/workflows/docs-update.yml` [已禁用]

**作用**: 更新文档
**使用场景**:

- 每 12 小时自动运行
- 手动触发
  **关键功能**:
- 获取最近的提交
- 使用 AI 更新文档

---

## 自动化和生成

### `.github/workflows/generate.yml` [已禁用]

**作用**: 自动生成代码
**使用场景**:

- 推送到 dev 分支时
  **关键功能**:
- 运行生成脚本
- 提交变更

### `.github/workflows/opencode.yml` [已禁用]

**作用**: 处理 OpenCode 命令
**使用场景**:

- 在 PR/Issue 中评论 `/opencode` 或 `/oc`
  **关键功能**:
- 运行 OpenCode AI 代理

---

## 通知和报告

### `.github/workflows/notify-discord.yml` [已禁用]

**作用**: 发送 Discord 通知
**使用场景**:

- 发布 Release 时
  **关键功能**:
- 发送格式化的嵌入消息到 Discord webhook

### `.github/workflows/daily-pr-recap.yml` [已禁用]

**作用**: 生成每日 PR 活动总结
**使用场景**:

- 每天下午 5 点 EST 自动运行
- 手动触发
  **关键功能**:
- 收集 PR 数据
- 使用 AI 生成总结
- 发布到 Discord（仅社区 PR）

### `.github/workflows/daily-issues-recap.yml` [已禁用]

**作用**: 生成每日 Issue 总结
**使用场景**:

- 每天下午 6 点 EST 自动运行
- 手动触发
  **关键功能**:
- 收集 Issue 数据
- 使用 AI 分类
- 发布到 Discord

### `.github/workflows/stats.yml` [已禁用]

**作用**: 更新下载统计
**使用场景**:

- 每天中午 12 点 UTC 自动运行
- 手动触发
  **关键功能**:
- 运行统计脚本
- 更新 STATS.md

---

## Nix 包管理

### `.github/workflows/nix-hashes.yml` [已禁用]

**作用**: 计算和更新 Nix 包哈希
**使用场景**:

- 推送到 dev/beta 分支（lockfile 变更时）
- 手动触发
  **关键功能**:
- 为 4 个系统计算哈希（x86_64/aarch64 Linux 和 Darwin）
- 更新 nix/hashes.json

---

## 编辑器扩展

### `.github/workflows/sync-zed-extension.yml` [已禁用]

**作用**: 同步/发布 Zed 编辑器扩展
**使用场景**:

- 发布 Release 时
- 手动触发
  **关键功能**:
- 获取标签
- 同步 Zed 扩展

---

## 总结

本项目共有 **33 个 GitHub Actions 工作流**，其中：

- **7 个活跃工作流**（正常运行）
- **26 个已禁用工作流**（标记为 `.disabled`）

### 活跃工作流列表

1. `test.yml` - 单元测试和 E2E 测试
2. `typecheck.yml` - TypeScript 类型检查
3. `nix-eval.yml` - Nix flake 输出评估
4. `publish.yml` - 主要发布工作流
5. `sign-cli.yml` - Windows CLI 签名
6. `build-cli.yml` - CLI 二进制文件构建
7. `containers.yml` - Docker 容器构建和推送

### 主要特点

1. **重度 AI 集成** - 许多工作流使用 OpenCode AI 代理进行代码审查、重复检测、文档更新和分类
2. **多平台支持** - 广泛的跨平台构建（Linux x64/arm64、macOS x64/arm64、Windows）
3. **严格标准** - 自动强制执行 PR/Issue 模板、conventional commits 和合规性检查
4. **社区关注** - 每日总结过滤掉团队成员，专注于社区贡献
5. **多包管理器** - NPM、AUR、Docker、Nix、VSCode 市场、GitHub 市场、Zed 扩展
6. **自动清理** - 可配置时间窗口的过期 PR/Issue 管理
