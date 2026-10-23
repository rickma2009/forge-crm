# Project Initializer

本目录定义技术栈中立的治理初始化清单。它创建独立 Git 仓库、来源归档、项目记忆、Gate 初态和 AI 路由，不创建业务功能或替用户批准 Gate。若目标必须由现有父仓库跟踪，显式传入 `--no-git`。

```bash
node _methodology/scripts/forge.mjs init ./new-project --name "New Project"
node _methodology/scripts/forge.mjs apply-profile ./new-project typescript-enterprise-web
```

`apply-profile` 只有在 `.specify/project-state.json` 中 Business 与 Architecture Gate 都记录结构化批准证据，且对应 `REQSRC-*` 的管理副本、哈希、`metadata.approval` 和登记册一致时才执行。`typescript-enterprise-web` v0.2 会生成可运行最小工程；目标项目安装依赖后独立运行 `pnpm verify`，只有固定质量命令成功才写入带工程指纹的 `verified`，后续工程文件变化会使该证据失效。

生成的项目章程还会询问是否以跨项目复用或团队培训为目标。这是待项目负责人填写的决策项；初始化器不会把 Forge CRM 的长期目标强加给新项目，也不会预先认定组件或案例已经可复用。

目标项目选择复用现有 React 组件时，按[组件接入快速指南](../components/quickstart.md)检查与适配。初始化治理骨架不会自动复制 CRM 业务代码或替目标项目确认组件可用性。

初始化同时写入 Matt Skills 所需的本地 tracker、默认 triage 标签、单上下文词汇索引和 domain consumer 规则。可用以下命令核对：

```bash
node _methodology/scripts/check-matt-setup.mjs ./new-project
```
