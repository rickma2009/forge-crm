# Specification 澄清：数据库导航与角色授权

> 状态：`specification-resolved-architecture-recommendations-ready`

| ID | 规格问题 | 建议答案 | 状态 |
|---|---|---|---|
| `Q-SPEC-501` | 客户端怎样传入系统？ | 认证后由明确的系统入口/选择器提供 `systemCode`；首个可运行系统为 `demo-portal`，不得允许客户端传 userId | approved-REQSRC-019 |
| `Q-SPEC-502` | 导航响应怎样表达上下双区？ | 返回 `primary` 与 `management` 两棵已授权树；节点只含渲染所需中性元数据和当前页允许操作 | approved-REQSRC-019 |
| `Q-SPEC-503` | 分组节点是否单独授权？ | MENU grant 可以关联任意菜单；PAGE 必须直接有 grant 才能访问；GROUP 仅在自身有效且至少有一个可见后代时返回，不继承放行全部子项 | approved-REQSRC-019 |
| `Q-SPEC-504` | 操作编码是否限制固定枚举？ | `actionCode` 使用稳定字符串；首期种子含 view/manage/export，新增值必须登记并测试，不用数据库硬编码全局枚举 | approved-REQSRC-019 |
| `Q-SPEC-505` | 首期如何证明多系统隔离？ | 测试/种子登记 `demo-portal` 和 `secondary-demo`；admin 只加入前者系统管理角色，访问后者返回 403 | approved-REQSRC-019 |
| `Q-SPEC-506` | 角色权限变化何时生效？ | 下一次授权导航/操作请求生效；本切片不要求推送刷新，若采用缓存必须能显式失效 | approved-REQSRC-019 |
| `Q-SPEC-507` | 切片是否建设权限管理 UI？ | 不建设；本切片用迁移/种子和自动化 fixture 建立角色、成员、菜单和权限，管理 UI 后续独立切片 | approved-REQSRC-019 |

Rick 于 2026-09-03 批准以上推荐答案和本 Specification Gate，证据为 `REQSRC-019`。

## Architecture 待批准建议

| ID | 架构问题 | 推荐答案 | 状态 |
|---|---|---|---|
| `Q-ARCH-501` | 如何把当前单包前端升级为全栈工程？ | 采用 `typescript-enterprise-web` v0.2 的 pnpm workspace/模块化单体约束，手工迁移现有前端到 `packages/web`；不对已有目录直接执行可能覆盖文件的初始化器 | approved-REQSRC-020 |
| `Q-ARCH-502` | 六表限制下怎样实现本地认证和会话？ | `iam_user.password_hash` 保存 Argon2id 哈希；登录后签发短期、HttpOnly、SameSite=Lax 的 HMAC 签名 Cookie，每次请求加载 ACTIVE 用户；本切片不增加 Session 表 | approved-REQSRC-020 |
| `Q-ARCH-503` | 六类逻辑表怎样落实数据库一致性？ | UUID、PostgreSQL enum/check、外键、复合外键和部分唯一索引共同约束；父子环及完整系统角色 grant 由事务内配置校验器补充 | approved-REQSRC-020 |
| `Q-ARCH-504` | 没有系统表时 systemCode 如何受控？ | 由 `SYSTEM_CODES` 配置白名单与版本化种子共同管理；请求先验证白名单，再执行授权查询 | approved-REQSRC-020 |
| `Q-ARCH-505` | API 与授权执行怎样统一？ | REST JSON + 共享运行时契约；导航、页面直达和具体操作端点统一调用服务端 AuthorizationService，不建设通用“执行任意 action”接口 | approved-REQSRC-020 |
| `Q-ARCH-506` | 怎样保证权限下一请求生效？ | 首片不使用应用层权限缓存；单次导航查询使用一致性事务，`permissionVersion` 为有效授权结果的稳定哈希 | approved-REQSRC-020 |
| `Q-ARCH-507` | 迁移失败和上线回滚怎样处理？ | Prisma migration 是唯一 DDL 历史；迁移/种子事务失败整体回滚，已应用变更使用前滚修复，恢复演练依靠专用测试库备份，不维护第二份 SQL | approved-REQSRC-020 |
| `Q-ARCH-508` | 如何固定性能与安全验证基线？ | PostgreSQL 16 本地/CI，2 系统、每系统 250 菜单、每页最多 8 操作、用户最多 20 角色；100 次预热后请求的 P95 ≤300ms，并覆盖 CSRF、Cookie、403/404/503 和无敏感日志 | approved-REQSRC-020 |

Rick 于 2026-09-03 批准上述推荐答案和本 Architecture Gate，证据为 `REQSRC-020`。
