# Business Gate 评审：数据库驱动的导航与角色授权

> 评审对象：`requirement.md` v0.1-rc1
> 状态：`approved`
> 决策人：Rick
> 来源：`REQSRC-017`

## 1. 本次重新评审范围

- Demo 是否升级为可复用的最小全栈候选；
- 多系统菜单、应用/系统管理双区、页面操作目录；
- 用户只能通过角色获得菜单和操作权限；
- 每系统系统管理角色与 admin 成员关系；
- 不包含数据权限、完整 IAM 管理后台或生产部署。

## 2. 完整性结论

| 检查项 | 证据 | 状态 |
|---|---|---|
| 新目标和业务结果 | `BUS-009`—`BUS-012` | ready-for-review |
| 角色与主流程 | `requirement.md` §2 | ready-for-review |
| 六类逻辑表 | `requirement.md` §4 | ready-for-review |
| 纯角色授权与服务端校验 | `REQ-406`—`REQ-410` | ready-for-review |
| 多系统和双区导航 | `REQ-402`—`REQ-404` | ready-for-review |
| 数据权限排除 | `REQ-411`、§6 | ready-for-review |
| 新旧冲突与参考排除 | `transformation.md` | ready-for-review |
| 技术与安全待确认 | `Q-401`—`Q-407` | resolved-by-REQSRC-018 |

## 3. 建议决定

先确认 `Q-401`—`Q-407`，再批准本 Business Gate。批准后只允许：

1. 重写切片 003 的 Specification、验收与失败行为；
2. 形成新技术 Plan/ADR，确定认证、API、PostgreSQL/Prisma 约束和迁移目录；
3. Architecture Gate 批准后才创建六表 SQL、后端接口并替换前端运行时数据源。

仍不允许：连接/修改参考项目数据库、用户直授权、数据权限、部署、资产晋升或 Release。

## 4. 人工决定

- 结论：approved
- 决策人：Rick
- 批准时间：2026-09-03T19:48:30+08:00
- 已确认：`Q-401`—`Q-407` 的推荐答案
- 批准证据：`REQSRC-018`
- 批准边界：允许进入切片 004 Specification；不批准 DDL、API、认证实现、工程改造、部署、Release 或资产晋升。
