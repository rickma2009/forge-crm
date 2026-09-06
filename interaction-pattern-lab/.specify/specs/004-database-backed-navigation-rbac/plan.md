# 技术计划：数据库驱动的导航与角色授权

> 功能编号：004-database-backed-navigation-rbac
> 状态：`architecture-approved-ready-for-task-breakdown`
> Specification Gate：approved（`REQSRC-019`）
> Architecture Gate：approved（`REQSRC-020`）

## 1. 技术边界

- 采用 `_methodology` 的 `typescript-enterprise-web` v0.2：pnpm workspace、React、NestJS、PostgreSQL、Prisma、模块化单体；
- 当前已有 React/Vite 工程和切片 003 前端证据必须保留，采用受控文件迁移，不直接用初始化器覆盖现有目录；
- 新增 `packages/web`、`packages/server`、`packages/contracts` 和 `packages/tsconfig`，根目录统一执行 lint、typecheck、test、build、verify；
- 六类逻辑表是本切片唯一权限持久化模型；不增加系统表、Session 表、用户直授权表、数据权限表或审计业务表；
- 使用中性命名；参考项目只提供行为和约束证据，不复制其 Java、IAM、组织、租户、固定 ID 或业务菜单；
- 本 Plan 已由 `REQSRC-020` 批准；可在用户明确实施指令后创建 Tasks 并实现，但本批准本身不表示工程目录、DDL、Prisma Schema、API 或代码已经完成。

## 2. 目标架构

```text
Browser / packages/web
  ├─ Login + system context
  ├─ Showcase shell and page adapters
  └─ typed HTTP client
             │ same-origin /api
             ▼
NestJS / packages/server
  ├─ AuthModule ── signed HttpOnly session cookie
  ├─ NavigationModule ── authorized tree projection
  ├─ AuthorizationModule ── page/action assertions
  ├─ DemoResourceModule ── concrete protected actions
  └─ DatabaseModule ── Prisma transaction boundary
             │
             ▼
PostgreSQL
  ui_menu / ui_menu_action
  iam_user / iam_role / iam_role_user / iam_role_permission
```

共享包只保存请求/响应 Schema、错误代码和由 Schema 推导的 TypeScript 类型，不保存数据库实体、密码逻辑或 UI 组件。

## 3. 工程迁移方案

| 阶段 | 变化 | 保护措施 |
|---|---|---|
| workspace 骨架 | 根包改为 workspace orchestrator，增加 Turbo/共享配置 | 先锁定现有 `pnpm verify` 结果和构建产物；禁止覆盖式脚手架 |
| Web 搬迁 | 将现有 `src`、Vite 配置、HTML 与测试机械迁到 `packages/web` | 搬迁后先证明 12 files / 56 tests、类型检查和构建等价通过 |
| Contracts | 增加 `@interaction-pattern-lab/contracts` 运行时 Schema | 客户端和服务端共同验证外部输入；不暴露 Prisma 类型 |
| Server | 增加 NestJS 健康、认证、导航、授权和 Demo 资源模块 | 默认拒绝；模块间只通过服务接口调用 |
| Database | 增加 Prisma Schema、单一迁移历史、种子和专用测试库 | 空库迁移、配置校验、事务回滚后才接前端 |
| Runtime cutover | Showcase 从内存 Registry Adapter 切到 HTTP Adapter | 保留历史 fixture 仅供测试；切换失败可恢复旧前端构建，但不宣称达到切片 004 |

根目录的可执行 SQL 唯一位置为：

```text
packages/server/prisma/
├── schema.prisma
├── migrations/<timestamp>_create_navigation_rbac/migration.sql
└── seed.ts
```

## 4. 物理数据模型

所有主键使用 UUID，时间使用 `timestamptz(3)`，可变实体包含整数 `version`。业务编码先 trim，再按大小写敏感的 kebab-case/小写规则校验；显示名不承担身份或关联职责。

| 表 | 核心约束与索引 |
|---|---|
| `ui_menu` | `(system_code, menu_code)` 唯一；PAGE 的 `(system_code, route_path)` 唯一；`(parent_id, system_code)` 复合外键阻止跨系统父子；按 system/status/zone/parent/sort 索引 |
| `ui_menu_action` | `(menu_id, action_code)` 唯一；只允许关联 PAGE；按 menu/status/sort 索引 |
| `iam_user` | normalized account 唯一；可空 `password_hash` 只存 Argon2id；无 `is_super_admin` |
| `iam_role` | `(system_code, role_code)` 唯一；每系统一个内置 SYSTEM 角色使用部分唯一索引；按 system/status 索引 |
| `iam_role_user` | `(role_id, user_id)` 唯一；开始时间早于结束时间；按 user/status/effective/expires 索引 |
| `iam_role_permission` | 冗余 `system_code` 支持到 role/menu 的复合外键；MENU 时 action 为空，ACTION 时 action 必填且属于同 menu；MENU/ACTION 分别使用部分唯一索引 |

Prisma 表达关系和常规约束；PostgreSQL partial unique、check 与必要复合约束由对应不可改写 migration SQL 补足。父子环、ACTION 所属 PAGE、每系统完整系统角色 grant 等跨行不变量由迁移/种子共用的配置校验服务在同一事务提交前验证。

删除策略统一 `RESTRICT`；本切片不提供删除或权限管理 API。停用/失效通过状态和有效期表达。

## 5. 认证与会话

### 5.1 本地认证

- `POST /api/auth/login` 接收 account/password；账号归一后查找 ACTIVE 用户，用 Argon2id 验证 `password_hash`；
- `admin`、`viewer` 的初始密码只从初始化命令环境变量读取并即时哈希，不写入源码、迁移、文档或日志；
- 登录、注销和会话查询采用统一响应 Schema；错误不区分账号不存在与密码错误；
- 不接 SSO、MFA、找回密码或生产身份供应商。

### 5.2 六表约束下的会话

- 服务端签发短期 HMAC-SHA-256 签名 Cookie，载荷仅含 userId、issuedAt、expiresAt 和 keyId；
- Cookie 为 HttpOnly、SameSite=Lax、Path=/；生产 HTTPS 时必须 Secure；密钥来自环境且支持当前/前一 key 轮换；
- 每个受保护请求验证签名/过期后重新加载 ACTIVE 用户，因此停用用户在下一请求失效；
- 写请求检查同源 Origin，并要求双提交 CSRF header；登录和退出也受 Origin 检查；
- 本切片不增加 Session 表，因此不承诺逐会话服务端撤销；该限制在引入生产认证前必须重新评审。

## 6. API 与授权契约

| ID | 方法与路径 | 成功结果 | 失败 |
|---|---|---|---|
| `API-501` | `POST /api/auth/login` | 建立 Cookie，返回最小用户摘要 | 400/401/423；不泄漏账号存在性 |
| `API-502` | `GET /api/auth/session` | 当前用户最小摘要 | 401 |
| `API-503` | `POST /api/auth/logout` | 清除 Cookie | 204；幂等 |
| `API-504` | `GET /api/systems/:systemCode/navigation` | `{systemCode, primary, management, permissionVersion}` | 400/403/404/503 |
| `API-505` | `GET /api/systems/:systemCode/page-access?routePath=` | 204 表示可访问 | 403 或 404；不返回隐藏页面元数据 |
| `API-506` | 具体 Demo 资源写/导出端点 | 对应业务响应 | 403 时零变更；503 默认拒绝 |

不建立通用 `/actions/:actionCode/execute` 端点。具体控制器以稳定 `menuCode/actionCode` 元数据调用同一个 `AuthorizationService`：

```text
assertPage(userId, systemCode, routePath)
assertAction(userId, systemCode, menuCode, actionCode)
```

错误体统一为 `{ code, message, requestId }`；403/404 不包含菜单标题、角色、操作或 fixture。前端只能用响应渲染，不自行合并 grant 或执行 admin 特判。

## 7. 授权查询与一致性

1. 请求先验证 `systemCode` 格式和 `SYSTEM_CODES` 白名单；
2. 验证会话并加载 ACTIVE 用户；
3. 在 PostgreSQL `REPEATABLE READ` 只读事务内加载目标系统的有效角色成员、ACTIVE 角色、菜单、操作和 grant；
4. 计算角色 ALLOW 并集，先要求 PAGE MENU，再附加 ACTION；
5. 移除无权 PAGE 和无可见后代 GROUP，分别投影 `primary/management` 并稳定排序；
6. 对规范化有效授权结果计算 SHA-256，作为不透明 `permissionVersion`；
7. 首片不使用应用层权限缓存，确保撤权在下一请求可见。

数据库连接、事务或校验异常统一映射 503，不回退到全量 Registry。页面操作在自己的事务内先授权再修改，拒绝或异常整体回滚。

## 8. 系统白名单与种子

- `SYSTEM_CODES=demo-portal,secondary-demo` 是首期受控系统登记；启动和种子对空值、重复或非法编码直接失败；
- 种子采用幂等 upsert + 最终全量不变量校验，不能用 `*` 生成运行时特权；
- `demo-portal`：admin → system-manager 全部显式 MENU/ACTION grant；viewer → viewer-role，获准应用菜单和资源目录 VIEW；
- `secondary-demo`：具备隔离验证数据，但 admin 不加入任何角色；
- 正式运行文案、数据库值和代码不出现来源项目名称。

## 9. 前端接入

- 登录页改为真实本地 account/password 表单，成功后加载 session 和目标系统；
- `NavigationGateway` 为唯一数据 seam，生产实现调用 `API-504/505`，历史内存实现只供单元测试与旧切片证据；
- 在导航响应完成前不渲染菜单或页面内容；403/404/503 使用分离状态；503 提供重试；
- 搜索只作用于服务端已经授权的树；切换系统清空旧树、当前页和 allowedActions；
- 页面按钮从 `allowedActions` 决定可见/禁用状态，但具体请求仍必须通过服务端 `assertAction`；
- 保留 220/64/34 密度、双区滚动、折叠浮层、Hash 路由、1440/1280/低高度及键盘行为。

## 10. 测试、性能与可观测

| 层次 | 重点证据 |
|---|---|
| Schema/migration | 空库迁移、约束 mutation、重复种子、事务失败回滚、来源词扫描 |
| Domain | 有效期、角色并集、PAGE/GROUP、ACTION 依赖 MENU、稳定排序与版本哈希 |
| API integration | Cookie/CSRF、系统隔离、403/404/503、直接操作零变更、撤权下一请求 |
| Web | 加载/错误/重试、切系统清理、搜索无泄漏、旧交互回归 |
| Browser | admin/viewer、两个系统、直达路由、低高度、键盘、Cookie/网络观察 |
| Performance | PostgreSQL 16；2 系统、每系统 250 菜单、每 PAGE 最多 8 操作、每用户最多 20 角色；预热 100 次后采样，导航 P95 ≤300ms |

服务端结构化日志只记录 requestId、路由模板、systemCode、结果码、耗时和稳定拒绝原因码；不记录密码、Cookie、完整请求体、菜单标签或其他系统数据。健康检查区分 live、数据库 ready 和 migration ready。

## 11. 迁移、恢复与回滚

- `schema.prisma` 表示当前模型，`migrations/**/migration.sql` 是唯一有序 DDL 历史，禁止在 docs 或前端保存第二份可执行 SQL；
- CI 在专用空库执行 migrate deploy、seed、约束反例、API 集成与性能烟测；
- 迁移或种子在事务提交前失败则整体回滚，不允许半套系统角色/grant；
- 已应用迁移不手工改写或向下覆盖，使用新的前滚修复迁移；涉及数据恢复时从专用测试备份演练；
- Web/Server 切换前保留最后一个可验证前端构建；回滚应用版本不会把内存 Registry 宣称为本切片授权结果；
- 回滚保留来源、Spec、失败日志和迁移历史，不修改已批准 Gate。

## 12. 风险与处理

| ID | 风险 | 控制/复审条件 |
|---|---|---|
| `RISK-501` | 单包迁移破坏既有 56 项测试 | 机械迁移单独成任务并先恢复等价绿线 |
| `RISK-502` | 无系统表导致配置漂移 | 白名单+种子双校验；需要系统生命周期时重新开 Gate 增第七表 |
| `RISK-503` | 无 Session 表不能逐会话撤销 | 短 TTL、ACTIVE 用户每请求校验；生产化前重新设计 |
| `RISK-504` | Prisma 无法表达 partial/check/复合约束 | Schema + migration SQL 联合评审，集成测试直接验证数据库 |
| `RISK-505` | 权限查询产生 N+1 或树投影超预算 | 有界集合查询、内存单次投影、固定数据集性能测试 |
| `RISK-506` | 403/404 差异被枚举利用 | 只区分目标系统内部已登记路由，不返回任何受限元数据，并做安全测试 |
| `RISK-507` | Cookie/CSRF 被错误实现 | HttpOnly、SameSite、Origin+CSRF、密钥轮换和集成测试 |
| `RISK-508` | 历史 fixture 被当作生产 fallback | Production Adapter 无 fallback；故障 503，隔离扫描和 review 阻断 |

## 13. Architecture Gate 结论

Rick 已通过 `REQSRC-020` 批准 `Q-ARCH-501`—`Q-ARCH-508`、本 Plan 和 `ADR-004`。下一步可创建 Tasks，并按“工程迁移绿线 → 数据约束 → 认证 → 授权 API → 前端接入 → 全量验证”实施；本 Architecture 批准不等于已实施，也不授权部署、Release 或资产晋升。
