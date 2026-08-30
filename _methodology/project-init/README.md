# Project Initializer

本目录定义技术栈中立的治理初始化清单。它创建独立 Git 仓库、来源归档、项目记忆、Gate 初态和 AI 路由，不创建业务功能或替用户批准 Gate。若目标必须由现有父仓库跟踪，显式传入 `--no-git`。

```bash
node _methodology/scripts/forge.mjs init ./new-project --name "New Project"
node _methodology/scripts/forge.mjs apply-profile ./new-project typescript-enterprise-web
```

`apply-profile` 只有在 `.specify/project-state.json` 中 Business 与 Architecture Gate 都记录结构化批准证据，且对应 `REQSRC-*` 的管理副本、哈希、`metadata.approval` 和登记册一致时才执行。`typescript-enterprise-web` v0.2 会生成可运行最小工程；目标项目安装依赖后独立运行 `pnpm verify`，只有固定质量命令成功才写入带工程指纹的 `verified`，后续工程文件变化会使该证据失效。

初始化同时写入 Matt Skills 所需的本地 tracker、默认 triage 标签、单上下文词汇索引和 domain consumer 规则。可用以下命令核对：

```bash
node _methodology/scripts/check-matt-setup.mjs ./new-project
```
