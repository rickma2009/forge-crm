# 技术计划：组织与访问管理基础

> 功能编号：`012-organization-access-administration-foundation`  
> 状态：`architecture-approved-ready-for-task-execution`  
> Specification Gate：approved（`REQSRC-046`）  
> Architecture Gate：approved（`REQSRC-047`）

## 1. 输入、边界与约束

- 批准规格：`spec.md`、`testcases.md`；
- 数据库上位规范：`_methodology/11-数据库设计与数据分层规范.md`；
- PostgreSQL/Prisma 约定：`_methodology/profiles/typescript-enterprise-web/database-conventions.md`；
- 架构决策：`docs/adr/ADR-006-平台访问管理与无损迁移架构.md`；
- 现有技术栈保持 React/Vite、NestJS、Prisma、PostgreSQL 和共享 zod contracts，不重新初始化工程；
- `supply` 与 `_ref/` 仅为只读证据，不连接其数据库、不复制其组件库或物理模型；
- 本 Plan 不包含组织员工、数据权限、SSO/MFA、菜单管理页、审计查询页、生产部署或 Release；
- 已应用 migration 永不改写；所有物理变化进入新的不可改写 migration。

## 2. 方案概述

```text
Browser / packages/web
  ├─ 用户管理页
  ├─ 角色管理页（成员 + 权限矩阵）
  └─ 权限目录页（只读）
              │ typed HTTP + CSRF + session cookie
              ▼
NestJS / packages/server
  ├─ auth：账号认证与 ACTIVE 状态复核
  ├─ rbac：应用解析、权限判断、导航投影
  ├─ access-admin：用户/角色/成员/权限管理
  ├─ audit：白名单化安全审计写入
  └─ database：Prisma 事务与数据库约束
              │
              ▼
PostgreSQL / sys_* platform tables
```

访问管理的唯一写入口是 `access-admin` 应用服务。认证、导航、数据字典、列表视图和业务模块只能通过服务接口读取访问事实，不允许绕过责任模块直接写平台安全表。

## 3. 影响范围

| 层/模块 | 变化 | 明确不变化 |
|---|---|---|
| Prisma/migration | 新增租户、应用、角色组、权限、审计；迁移并重命名历史平台表 | 不修改历史 migration，不触碰 `crm_*` 和组织员工表 |
| contracts | 增加分页、用户、角色、成员、权限矩阵、状态操作和错误 Schema | 不暴露 Prisma Model |
| auth | 用户查询切到 `sys_user`，按默认租户解析账号 | 会话 Cookie、CSRF 和本地密码验证基线不改 |
| rbac | 从稳定权限点计算导航和 API 授权；增加 `assertPermission` | 不增加用户直授权、DENY、角色继承或缓存 |
| access-admin | 新增专用 controller/service，统一管理事务和审计 | 不建立任意 action execute API |
| list-view | 物理表与作用域迁移，保持既有页面行为 | 列表视图业务规则不扩展 |
| web | 用户、角色、权限三个交互页替换说明页 | 菜单管理、日志查询仍为说明页；客户等页面行为不改 |
| governance | 更新数据库登记册，迁移完成后移除对应遗留例外 | `crm_*` 遗留例外保持待独立领域决策 |

## 4. 数据设计

### 4.1 数据层级、责任模块与共享方式

本切片全部新增和迁移表属于 `sys_` 系统平台层。唯一责任模块为 `packages/server/src/access-admin`，认证与 RBAC 作为受控消费者；Web 只通过 API 使用，不直接了解物理表。

`_methodology/database-table-registry.json` 已允许 `sys_` 公共前缀。实现完成并验证迁移后，删除 `ui_*`、`iam_*` 对应遗留例外；尚未迁移的 `crm_*` 和验证工具表不动。

### 4.2 目标表与核心字段

所有内部主键为 PostgreSQL UUID，时间为 `timestamptz(3)`，可变聚合包含正整数 `version`。删除默认 `RESTRICT`。

| 表 | 责任与关键字段 | 核心约束 |
|---|---|---|
| `sys_tenant` | `tenant_code`、`tenant_name`、`status`、版本/时间 | `tenant_code` 全局唯一；初始化默认租户 |
| `sys_application` | `tenant_id`、`application_code`、`application_name`、`status` | `(tenant_id, application_code)` 唯一；`(id, tenant_id)` 候选键 |
| `sys_user` | `tenant_id`、账号、规范化账号、显示名、类型、认证字段、状态 | `(tenant_id, normalized_account)` 唯一；本地账号必须有密码哈希；外部账号必须有外部主体 |
| `sys_role_group` | 租户、应用、分组编码/名称、状态 | `(tenant_id, application_id, role_group_code)` 唯一；只做展示分类 |
| `sys_role` | 租户、应用、角色组、编码/名称、类型、系统标识、状态 | `(tenant_id, application_id, role_code)` 唯一；每应用一个系统管理员角色的 partial unique；无父角色 |
| `sys_role_user` | 独立 `id`、作用域、角色、用户、状态、有效期、授权/撤销主体与时间 | 同作用域复合外键；区间合法；同用户—角色有效区间不得重叠 |
| `sys_permission` | 租户、应用、稳定编码、名称、资源、动作、系统来源、状态 | `(tenant_id, application_id, permission_code)` 唯一；发布后编码不由页面修改 |
| `sys_role_permission` | 保留 grant `id`、作用域、角色、权限、状态、授权/撤销主体与时间 | `(role_id, permission_id)` 唯一；角色与权限同租户同应用 |
| `sys_menu` | 作用域、菜单树、路由、排序、`access_permission_id` | 父子同作用域；菜单引用同作用域权限；防自环，服务内防环 |
| `sys_menu_action` | 菜单、操作编码/名称/类型、`permission_id` | `(menu_id, action_code)` 唯一；操作和权限与菜单同作用域 |
| `sys_system_list_view` | 作用域、页面/动作/视图编码、配置 | 当前唯一键改用 application；保持默认视图 partial unique |
| `sys_role_list_view` | 角色与系统视图关联 | 复合主键；同作用域关系 |
| `sys_user_list_view` | 作用域、用户、基线视图、个人配置 | 用户/基线视图同租户应用；当前名称唯一规则保持 |
| `sys_user_list_view_preference` | 用户、应用、页面、动作、选择键 | 复合主键；同作用域用户引用 |
| `sys_audit_log` | 租户、应用、操作者、动作、目标、结果、白名单化前后摘要、request/correlation ID、时间 | 只追加；无密码、Token、Cookie、完整请求体；按作用域/时间和目标索引 |

`sys_dictionary`、`sys_dictionary_item` 本切片不改结构；它们仍按既有 `system_code` 工作，待独立字典治理切片决定是否迁移为 application UUID。业务 `crm_*` 也不在本切片静默改名。

### 4.3 作用域与复合约束

- 租户内实体建立可供复合外键使用的 `(id, tenant_id)` 候选键；应用内实体建立 `(id, tenant_id, application_id)` 候选键。
- `sys_role_user` 同时保存 `tenant_id`、`application_id`，分别通过复合外键约束角色和用户，阻止跨租户成员。
- `sys_role_permission` 通过两个同作用域复合外键约束角色与权限。
- 菜单父子、菜单访问权限、菜单操作权限和列表视图关系均由复合外键阻止跨作用域引用。
- 不启用 RLS；每个服务查询仍必须显式带认证租户和已解析 application ID。

### 4.4 有效期、历史与并发

- 迁移后的角色成员 `effective_at` 非空，旧记录以原 `effective_at` 或 `created_at` 回填；`expires_at` 可空。
- 使用 PostgreSQL GiST 排斥约束阻止同一用户—角色的 ACTIVE `[effective_at, expires_at)` 区间重叠，并以数据库集成测试验证边界。
- 旧复合主键成员记录使用来源角色 ID + 用户 ID 生成确定性 UUID；后续每次重新授权产生新的成员记录。
- 角色权限关联不物理删除：移除时改为 DISABLED 并记录撤销人/时间，重新授权复用原 ID。
- 角色权限集合保存接收 `roleVersion`，在 Serializable 事务内锁定角色并校验版本；过期版本返回冲突，权限集合和审计要么一起提交，要么全部回滚。

### 4.5 权限点与导航投影

权限点不等同于 UI 元素：

- 每个菜单访问关系迁移为 `navigation.<menu-code>.access` 权限；
- 每个既有菜单操作迁移为 `menu.<menu-code>.<action-code>` 权限；
- 既有 `iam_role_permission.id` 保留，并一对一改为引用对应 `sys_permission`；
- `sys_menu.access_permission_id`、`sys_menu_action.permission_id` 指向对应稳定权限点；
- 新增访问管理服务权限使用 `access.user.view`、`access.user.status.manage`、`access.role.view`、`access.role.create`、`access.role.update`、`access.role.status.manage`、`access.role.member.manage`、`access.role.permission.assign`、`access.permission.view`；
- 菜单页面可见性来自 `navigation.*.access`，按钮和 API 来自具体 `menu.*` 或 `access.*` 权限；GROUP 无可见子项时不显示。

系统管理员完整授权由权限发布事务保证：发布权限点、菜单/操作映射和系统管理员显式 grant 后执行完整性校验，任一缺失则整体失败。

### 4.6 保留数据迁移映射

| 现有表 | 目标表 | 处理 |
|---|---|---|
| `iam_user` | `sys_user` | 原表改名，保留 ID；回填默认 tenant 与 user type；账户唯一键改为租户作用域 |
| `iam_role` | `sys_role` | 原表改名，保留 ID；`system_code` 解析为 tenant/application；回填默认角色组 |
| `iam_role_user` | `sys_role_user` | 重建为带 UUID 和历史字段的表；确定性生成 ID，保留关系与时间 |
| `iam_role_permission` | `sys_role_permission` | 保留原 grant ID；把菜单/操作目标一对一映射为 permission ID，再移除旧 target 列 |
| `ui_menu` | `sys_menu` | 原表改名，保留 ID；回填作用域与 access permission |
| `ui_menu_action` | `sys_menu_action` | 原表改名，保留 ID；回填 permission 引用 |
| `ui_system_list_view` | `sys_system_list_view` | 原表改名，保留 ID；`system_code` 替换为作用域 UUID |
| `iam_role_list_view` | `sys_role_list_view` | 原表改名并重建同作用域约束 |
| `ui_user_list_view` | `sys_user_list_view` | 原表改名，保留 ID；回填作用域 |
| `ui_user_list_view_preference` | `sys_user_list_view_preference` | 原表改名并以 application UUID 替换 `system_code` |

迁移前置校验要求：所有 system code 都能映射应用；所有角色、菜单、操作和 grant 引用完整；不存在重复规范化账号、非法有效期或无法映射的 grant。任何未知或冲突数据阻断迁移，不自动丢弃。

### 4.7 迁移、切换与恢复

采用协调切换，不长期双写：

1. 停止写入并记录迁移版本；
2. 生成数据库备份和迁移前对账清单（表计数、主键集合摘要、外键孤儿、有效授权投影）；
3. 在恢复演练库先执行全部历史 migration、旧版 seed、目标 migration 和新版 seed；
4. 正式执行单一新 migration：改名、回填、权限转换、约束收紧和旧列清理处于同一可回滚 DDL 事务；
5. 部署同版本 Server/Web，执行迁移后对账、系统管理员完整性和浏览器烟测；
6. 切换前失败时恢复备份；共享环境一旦产生新写入，只允许新 migration 前滚修复，不改写历史或反向覆盖。

本切片不承诺零停机。未来出现生产零停机要求时，必须重新 Architecture Gate，设计 expand/migrate/contract 兼容窗口。

## 5. API 与错误契约

外部路径继续使用 `:systemCode`，应用解析器在认证租户内把它解析为 ACTIVE `sys_application`；数据库服务只接收解析后的 UUID 作用域。

| ID | 方法与路径 | 用途 | 权限 | 并发/失败 |
|---|---|---|---|---|
| `API-1201` | `GET /api/systems/:systemCode/access/users` | 用户筛选与分页 | `access.user.view` | 无权 403；应用不存在/不可见统一受控拒绝 |
| `API-1202` | `GET /api/systems/:systemCode/access/users/:userId` | 用户详情和角色时段 | `access.user.view` | 跨租户/不存在不泄露详情 |
| `API-1203` | `PATCH /api/systems/:systemCode/access/users/:userId/status` | ACTIVE/DISABLED 转换 | `access.user.status.manage` | 输入 `version`；自停用/LOCKED/过期版本拒绝 |
| `API-1204` | `GET /api/systems/:systemCode/access/roles` | 角色筛选与分页 | `access.role.view` | 稳定排序和分页 |
| `API-1205` | `POST /api/systems/:systemCode/access/roles` | 创建普通角色 | `access.role.create` | 支持请求幂等键；重复编码 409 |
| `API-1206` | `PATCH /api/systems/:systemCode/access/roles/:roleId` | 修改名称/说明/角色组 | `access.role.update` | 编码/系统角色不可改；版本冲突 409 |
| `API-1207` | `PATCH /api/systems/:systemCode/access/roles/:roleId/status` | 启停普通角色 | `access.role.status.manage` | 系统角色受保护；版本冲突 409 |
| `API-1208` | `GET /api/systems/:systemCode/access/roles/:roleId/members` | 成员及有效期 | `access.role.view` | 同作用域角色才可见 |
| `API-1209` | `POST /api/systems/:systemCode/access/roles/:roleId/members` | 新增成员 | `access.role.member.manage` | 幂等键；重叠/跨租户 409 |
| `API-1210` | `PATCH /api/systems/:systemCode/access/roles/:roleId/members/:membershipId/end` | 提前结束成员 | `access.role.member.manage` | 最后管理员、自移除、过期版本拒绝 |
| `API-1211` | `GET /api/systems/:systemCode/access/permissions` | 只读权限目录 | `access.permission.view` | 关键词/资源/状态分页 |
| `API-1212` | `GET /api/systems/:systemCode/access/roles/:roleId/permissions` | 当前权限集合与 roleVersion | `access.role.view` | 返回停用异常项 |
| `API-1213` | `PUT /api/systems/:systemCode/access/roles/:roleId/permissions` | 原子替换普通角色权限集合 | `access.role.permission.assign` | 完整集合 + roleVersion；系统角色/停用权限/并发冲突 409 |

分页默认 20、最大 100，排序必须包含唯一稳定尾键。共享错误体继续使用 `{code,message,requestId}`，扩展 `CONFLICT`、`STALE_VERSION`、`INVALID_STATE`、`PROTECTED_RESOURCE`、`LAST_ADMIN_REQUIRED`、`OVERLAPPING_MEMBERSHIP` 等稳定错误码；响应不返回表名、SQL、角色隐私或其他租户信息。

不创建权限目录写 API，不创建通用 `/actions/:code/execute`，不由前端提交 tenant ID 或 application ID。

## 6. 服务端授权与事务

1. SessionGuard 验证 Cookie 并重新加载 ACTIVE 用户及 tenant；
2. ApplicationResolver 在该 tenant 下解析 ACTIVE application code；
3. `AuthorizationService.assertPermission(userId, tenantId, applicationId, permissionCode)` 查询当前有效成员、有效角色、有效 grant 和有效权限；
4. 多角色结果取允许集合并集；任一数据库/解析异常默认拒绝；
5. 导航在 Repeatable Read 事务内加载菜单、操作和权限引用，按同一权限集合投影；
6. 写服务在 Serializable 事务内重新授权、锁定目标、校验 version/不变量、写变更与审计；
7. 成功提交后下一受保护请求重新计算，不增加应用层权限缓存。

系统管理员最后成员保护使用同事务锁定目标系统角色及有效成员集合；数据库约束负责同作用域与重叠区间，服务负责“至少一名有效管理员”等跨行时间不变量。

## 7. 审计、安全与隐私

- 用户状态、角色、角色状态、角色成员和角色权限成功变更与审计记录同事务；审计写入失败则高风险变更回滚。
- 已认证权限拒绝和业务冲突尝试写入 DENIED/REJECTED 审计；审计库不可用时请求仍拒绝，并输出无敏感结构化安全日志。
- 审计摘要使用按动作定义的字段白名单，只保存 ID、稳定编码、状态、有效期和权限编码差异；不保存 password hash、密码、Cookie、Token、CSRF 值或完整 DTO。
- 用户 API 首轮不返回 password hash、external subject、联系方式或员工资料。
- 继续使用 HttpOnly、SameSite Cookie、同源 Origin 与 CSRF header；本切片不改变密钥和会话寿命策略。
- 不使用账号名 `admin` 旁路；Seed 只通过系统管理员角色和显式权限建立能力。

## 8. 用户体验与前端装配

### 用户管理

- 默认一行查询：关键词、状态、查询、重置、更多；
- 表格展示序号、操作、账号、显示名称、类型、状态、有效角色、更新时间；
- 详情抽屉展示账号摘要、角色时段和最近管理变更摘要；
- 只有 `access.user.status.manage` 显示启停操作，LOCKED 显示不可操作原因。

### 角色管理

- 查询角色编码/名称、角色组和状态；工具栏提供新增普通角色；
- 角色详情抽屉包含基本信息、成员、权限三个区域；
- 权限矩阵按资源分组，过滤不丢选择，保存前展示新增/移除差异；
- 系统角色显示受保护标识并隐藏普通编辑入口，服务端仍独立拒绝。

### 权限目录

- 查询权限编码/名称、资源、状态；只读表格展示编码、名称、资源、动作、来源和状态；
- 不出现新增、编辑、删除或停用操作。

三个页面复用现有 `.enterprise-page`、查询卡片、工具栏、表格、状态标签、分页和弹窗/抽屉样式；不引入新 UI 或状态库。复杂矩阵桌面优先，窄屏只保证可读和明确引导。

## 9. 性能、索引与可观测

### 9.1 索引

- 用户：`(tenant_id, status, updated_at DESC, id)`，规范化账号唯一；关键词查询首轮使用可控前缀/包含策略并通过查询计划验证；
- 角色：`(tenant_id, application_id, status, updated_at DESC, id)`；
- 成员：按 user 当前有效查询和 role 成员分页各建组合索引，GiST 约束同时服务重叠判断；
- 权限：`(tenant_id, application_id, status, resource_code, permission_code)`；
- grant：`(role_id, status)`、`(permission_id, status)`；
- 菜单：`(tenant_id, application_id, status, parent_id, sort_no, menu_code)`；
- 审计：`(tenant_id, application_id, occurred_at DESC)`、`(target_type, target_id, occurred_at DESC)`、`request_id`。

### 9.2 验证规模与预算

在 PostgreSQL 受控测试库以 10,000 用户、200 角色、500 权限、20,000 成员和 20,000 grant 为基线；预热后记录查询计划和 P95。用户/角色/权限第一页查询预算 P95 ≤ 500ms，500 权限矩阵读取与保存预算 P95 ≤ 800ms。该预算只用于本地/CI 回归，不是生产容量承诺。

### 9.3 可观测

- HTTP 日志继续记录 requestId、路由模板、应用编码、结果码和耗时；
- 管理变更增加稳定 `auditAction`、`targetType` 和 outcome，不打印前后完整对象；
- 迁移工具输出阶段、计数和不一致类别，不输出密码哈希或用户敏感数据；
- 健康检查继续区分 live、数据库 ready 和 migration ready；授权数据库异常统一 fail-closed。

## 10. 测试实现策略

| 层次 | 必须覆盖 |
|---|---|
| Migration | 历史 migration → 旧 seed → 目标 migration → 新 seed；ID/计数/关系/授权投影对账；失败事务回滚；恢复演练 |
| Database constraints | 同租户/应用复合外键、角色编码唯一、单系统角色、区间排斥、grant 唯一、删除限制、审计只追加约定 |
| Contracts | 查询、分页、状态、有效期、完整权限集合、版本和错误码的输入输出解析 |
| Service | 自停用、LOCKED、系统角色保护、最后管理员、重叠成员、停用权限、版本冲突和审计原子性 |
| API integration | Cookie/CSRF、admin/viewer、403/404/409/503、直接写请求、重复幂等请求和数据库故障默认拒绝 |
| Web component | 查询、空态、错误态、抽屉、受保护按钮、差异摘要、冲突重载和窄屏边界 |
| Browser | admin 完整闭环、viewer 只读、停用后下一请求、页面直达、导航刷新、键盘和 1440/1024/窄屏 |
| Performance | 固定数据集、查询计划、P95 和索引使用证据；不得用空库结果冒充容量 |
| Isolation | 网络和数据库连接只指向本地验证环境；扫描确认未写参考项目或生产系统 |

测试使用可控时钟验证 `[effective_at, expires_at)` 边界。没有可用 PostgreSQL 时只能声明纯单元测试结果，不能据此声称 migration、约束或 Release 已验证。

## 11. 实施顺序与恢复检查点

Architecture Gate 批准后才创建 Tasks，建议顺序：

1. 固化迁移前 fixture、对账器与失败测试；
2. 编写 Prisma 当前模型和单一保留数据 migration；
3. 完成数据库约束、Seed 幂等和迁移/恢复集成测试；
4. contracts 与通用权限断言；
5. access-admin 服务、API、审计与安全测试；
6. 用户、角色、权限页面及组件测试；
7. 全工作区 verify、迁移演练、浏览器验证和实现评审。

每一阶段保留可前滚修复检查点。不得先改 Web 假数据再补数据库，也不得在迁移对账失败时继续运行新服务。

## 12. 风险与处理

| ID | 风险 | 控制 | 复审条件 |
|---|---|---|---|
| `RISK-1201` | 表改名和 grant 转换造成授权丢失 | 一对一 ID 映射、迁移前后授权投影对账、未知目标阻断 | 任一授权无法映射 |
| `RISK-1202` | 新旧服务与 Schema 不兼容 | 协调停写切换、同版本部署、不长期双写 | 要求零停机或滚动多版本 |
| `RISK-1203` | 最后管理员被结束或到期 | 写事务锁定与跨行校验、Seed 完整性检查、边界测试 | 引入预约变更或审批流 |
| `RISK-1204` | 权限矩阵并发覆盖 | roleVersion、Serializable 事务、差异重载 | 高频冲突需要细粒度版本 |
| `RISK-1205` | 有效期排斥约束影响迁移 | 预检重叠、恢复演练、冲突报告 | 真实历史允许重叠时重开 Spec |
| `RISK-1206` | 审计 JSON 泄漏敏感信息 | 动作级白名单摘要、Schema 校验、日志扫描 | 新增敏感账号字段或导出 |
| `RISK-1207` | `system_code` 兼容层长期存在 | 只保留外部 application code；内部平台关系全部 UUID | 字典/业务表进入独立迁移切片 |
| `RISK-1208` | 页面参考引入第二套视觉 | 不新增组件库，视觉合同测试对照客户页 | 现有样式不能满足可访问性 |
| `RISK-1209` | 性能基线与生产差异 | 记录数据规模、查询计划和环境，不作生产承诺 | 真实规模或 SLA 到达 |

## 13. Architecture Gate

- 结论：approved
- 批准人：用户（本任务技术决策人）
- 时间：2026-09-22
- 批准来源：`REQSRC-047`
- 批准边界：允许创建 Tasks 并在本地验证环境连续实施、测试和评审；不包含生产数据库、外部部署、推送共享分支或虚构 Release 证据
