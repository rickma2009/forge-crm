# Project Initializer

本目录定义技术栈中立的治理初始化清单。它创建来源归档、项目记忆、Gate 初态和 AI 路由，不创建业务功能或替用户批准 Gate。

```bash
node _methodology/scripts/forge.mjs init ./new-project --name "New Project"
node _methodology/scripts/forge.mjs apply-profile ./new-project typescript-enterprise-web
```

`apply-profile` 只有在 `.specify/project-state.json` 中 Business 与 Architecture Gate 都有来源支持的 `approved-*` 状态时才执行。v0.1 Profile 只落工程契约和版本记录，不宣称可运行脚手架已生成。
