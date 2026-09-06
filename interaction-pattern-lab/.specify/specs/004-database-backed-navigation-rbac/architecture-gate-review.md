# Architecture Gate 评审：数据库驱动的导航与角色授权

> 评审对象：`plan.md`、`clarification.md` 的 `Q-ARCH-501`—`Q-ARCH-508`、`docs/adr/ADR-004-数据库驱动导航与角色授权架构.md`
> 状态：`approved`
> Specification Gate：approved（`REQSRC-019`）

## 1. 建议批准的核心方案

- 以 `typescript-enterprise-web` v0.2 建立 pnpm workspace、React Web、NestJS Server、PostgreSQL/Prisma 和共享契约；
- 机械迁移并先恢复现有 Web 绿线，不覆盖或丢弃切片 003；
- 六表、系统配置白名单、数据库复合约束/部分索引、事务内不变量校验；
- Argon2id 本地账号和短期签名 HttpOnly Cookie，不增加第七张 Session 表；
- 统一 AuthorizationService 支撑导航、页面直达和具体操作端点；
- 无应用层权限缓存，下一请求重新计算，稳定哈希作为 permissionVersion；
- 单一 Prisma migration 历史、空库/回滚/前滚修复策略；
- 固定性能数据集、结构化无敏感日志、401/403/404/503 和 CSRF 验证。

## 2. 本 Gate 不批准

- 系统表、Session 表、用户直授权、DENY/优先级策略或任何数据权限；
- 完整 IAM/菜单管理 UI、SSO、MFA、生产身份供应商；
- 通用低代码 action execute API、权限缓存、消息系统或微服务拆分；
- 来源项目代码、字段、菜单、组织/租户模型或账号超级管理员旁路；
- 已完成 Tasks、实现、测试通过、部署、Release 或方法论资产晋升。

## 3. 评审检查

| 检查项 | 证据 | 状态 |
|---|---|---|
| 技术 Profile 与现有工程迁移边界 | `plan.md` §1—§3 | ready |
| 六表物理约束和跨行校验 | `plan.md` §4 | ready |
| 密码、Cookie、CSRF 与密钥边界 | `plan.md` §5 | ready |
| API、403/404/503 与统一授权 | `plan.md` §6—§7 | ready |
| systemCode、admin/viewer 种子 | `plan.md` §8 | ready |
| 前端切换和历史回归 | `plan.md` §9 | ready |
| 测试、性能与日志边界 | `plan.md` §10 | ready |
| 迁移、恢复和回滚 | `plan.md` §11 | ready |
| 风险和复审条件 | `plan.md` §12、`ADR-004` | ready |
| Architecture 决策未冒充实现 | `pipeline-state.json`、本文件 | ready |

## 4. 必须接受的限制

- 六表约束使会话采用短期签名 Cookie，当前不支持逐会话服务端撤销；
- 没有系统表，系统生命周期由环境白名单和版本化种子管理；
- PostgreSQL 特有 partial/check/复合约束降低数据库可移植性，但能落实本切片一致性；
- 工程从单包迁为 workspace 是高回归面操作，必须先恢复历史 56 项测试绿线再开发新功能；
- `P95 ≤300ms` 只对本 Plan 固定的本地/CI 数据集成立，不代表生产容量承诺。

## 5. 结论

Rick 已通过 `REQSRC-020` 同时批准：

1. `Q-ARCH-501`—`Q-ARCH-508` 推荐答案；
2. `plan.md` 的工程、数据、认证、API、安全、测试和回滚方案；
3. `ADR-004`。

现可创建 Tasks；仍不授权部署、Release、连接参考项目数据库或资产晋升。

## 6. 人工决定

- 结论：approved
- 批准人：Rick
- 时间：2026-09-03T20:27:20+08:00
- 备注：批准 Plan、ADR-004 和 Q-ARCH-501—Q-ARCH-508；允许后续创建 Tasks 并在明确实施指令后编码，不包含部署、Release 或资产晋升。
- 批准来源：`REQSRC-020`
