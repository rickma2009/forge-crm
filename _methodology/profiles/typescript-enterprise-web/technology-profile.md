# Technology Profile: typescript-enterprise-web

> 状态：implementation-verified
> 版本：0.2.0

## 已选择基线

- TypeScript 与 pnpm workspace；
- React Web、NestJS 服务端、PostgreSQL；
- 模块化单体，模块边界按批准的业务上下文确定；
- 工程必须提供真实可执行的 `lint`、`typecheck`、`test`、`build`、`verify` 入口。
- 质量命令与 Profile 权威契约一致，验证记录绑定工程文件指纹；修改后必须重跑。

## 仍由项目决定

认证与会话、租户模型、数据权限、部署平台、消息与任务、审计、可观测性、备份恢复及容量预算。不得从 MCRM 或参考项目自动继承。

## 生成的最小骨架

- pnpm workspace 与 Turborepo 质量入口；
- NestJS `/health/live` 存活检查、`/health/ready` PostgreSQL 端点就绪检查和单元测试；
- React/Vite 状态页和静态渲染测试；
- PostgreSQL Compose、本地环境契约和 Prisma 空 Schema；
- 共享 TypeScript 与 ESLint 严格配置。

它只证明工程链可运行，不包含认证、租户、权限、业务表或发布能力。项目必须在已批准切片中继续设计这些能力。

切片一旦新增或修改持久化模型，必须同时遵循工作台 [`../../11-数据库设计与数据分层规范.md`](../../11-数据库设计与数据分层规范.md) 和本 Profile 的 [`database-conventions.md`](database-conventions.md)。

`/health/ready` 当前验证数据库配置与网络端点可达，不等于迁移、Schema 或业务读写已就绪；接入真实数据层时必须扩展。v0.2 不强制格式化工具，项目需在首个业务切片前记录选择。
