# 用户增量需求原文归档

日期：2026-09-25

用户提交《sdd-forge 项目改名说明》，提出：

- 产品名改为 Forge CRM；
- 根目录与 Git 仓库名由 `sdd-forge` 改为 `forge-crm`；
- npm 包作用域由 `@interaction-pattern-lab/*` 改为 `@forge-crm/*`；
- 保持业务逻辑、数据库表结构和功能不变；
- 准备分别推送到 GitHub 与 Gitee 的空仓库。

经影响评估，助手建议先建立当前 CRM 根工程基线，原位更新 lockfile，区分历史档案、SDD Forge 方法论标识与当前产品标识，并保留既有 PostgreSQL 容器和数据卷身份。用户确认：“请按你的建议执行”。

