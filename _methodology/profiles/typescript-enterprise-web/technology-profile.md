# Technology Profile: typescript-enterprise-web

> 状态：candidate-contract-only  
> 版本：0.1.0

## 已选择基线

- TypeScript 与 pnpm workspace；
- React Web、NestJS 服务端、PostgreSQL；
- 模块化单体，模块边界按批准的业务上下文确定；
- 工程必须提供真实可执行的 `lint`、`typecheck`、`test`、`build`、`verify` 入口。

## 仍由项目决定

认证与会话、租户模型、数据权限、部署平台、消息与任务、审计、可观测性、备份恢复及容量预算。不得从 MCRM 或参考项目自动继承。

## v0.1 限制

本 Profile 当前只登记工程契约，不生成可运行代码。项目只有在实际骨架与相应检查通过后才能声称工程基线已建立。
