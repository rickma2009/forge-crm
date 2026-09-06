# Interaction Pattern Lab

> 中文名：企业交互模式验证场
> 项目状态：切片 005—010 已登记为验证场内发布；切片 002 仍等待独立 Release Gate
> 当前阶段：`slice-011-business-gate-draft`

本项目用于探索、实现和验证企业管理系统中重复出现的页面、操作、展示状态和特殊交互。它是验证场，不是通用模板的权威来源，也不代表真实业务系统。

核心体验是：左侧按分类选择模式，右侧即时展示交互原型和总结说明。切片 004 的账号、角色、菜单、页面操作和授权关系由 PostgreSQL 保存，NestJS 按会话用户和目标系统计算授权树；业务 Demo 数据仍是隔离样例。模式定义、来源证据和验收结论继续由 Git 中的 Markdown、Schema、模板与案例管理。

## 当前阶段

首个导航切片的纯前端版本已有实现、自动化和本地浏览器证据，这些作为历史验证继续保留。切片 004 的数据库导航基线和切片 005—009 的工作区、字典、视图、客户目录及排版增量均已完成验证；切片 010 的主从单据资产已由 `REQSRC-035` 批准在验证场内发布。迁移基线已冻结为 `interaction-pattern-lab-baseline-20260906`；当前只评审切片 011“导入—校验—执行”的 Business Gate 草案，不得据此开始 Spec、实现、外部部署或资产晋升。

## 本地运行切片 004

1. 复制 `.env.example` 为 `.env`，把 `SESSION_SIGNING_KEY`、`INITIAL_ADMIN_PASSWORD`、`INITIAL_VIEWER_PASSWORD` 换成本地值；密码至少 12 字符，签名密钥至少 32 字符。
2. 启动 PostgreSQL：`pnpm db:up`。
3. 执行 `pnpm db:migrate` 和 `pnpm db:seed`。
4. 分别运行 `pnpm dev:server` 与 `pnpm dev:web`，访问 Vite 输出的本地地址并进入 `#/showcase/overview`。

初始化账号为 `admin` 与 `viewer`，密码只取自本地环境变量，不进入源码、迁移或文档。`admin` 也不具备账号旁路，其全部权限来自 `demo-portal/system-manager` 角色的显式授权。

可执行数据库资产唯一位于 `packages/server/prisma/`；前后端共享外部契约位于 `packages/contracts/`。

## 权威入口

- 项目章程：`.specify/memory/project-charter.md`
- 业务上下文：`.specify/memory/business-context.md`
- 项目宪法：`.specify/memory/constitution.md`
- 原始需求：`.specify/sources/`
- 当前新增业务基线：`.specify/requirements/003-multi-source-ui-distillation-showcase/`
- 当前数据库导航变更需求：`.specify/requirements/004-database-backed-navigation-rbac/`
- 当前数据库导航 Specification Gate：`.specify/specs/004-database-backed-navigation-rbac/`
- 历史纯前端导航切片：`.specify/specs/003-authenticated-enterprise-navigation-shell/`
- 已批准业务基线：`.specify/requirements/002-validation-field-baseline/`
- 历史产品基线：`.specify/requirements/001-product-baseline/`
- 当前增量规划：`docs/product/多来源交互资产萃取与演示门户规划.md`
- 历史产品总体规划：`docs/product/企业管理系统交互模式工作台总体规划.md`
- 场景台账：`docs/pattern-backlog.md`
- 参考证据台账：`docs/reference-inventory.md`

## 当前允许与禁止

允许：在本地或另行明确授权的验证环境使用切片 004、积累真实项目采用证据、在新增页面模式前处理 P2 拆分，继续只读来源萃取，以及独立处理切片 002 的 Release Gate。

禁止：扩大为系统表/Session 表、用户直授权、数据权限或完整 IAM 管理 UI；禁止连接参考项目数据库、未经单独授权的外部/生产部署、生产能力声明或方法论正式模式晋升。
