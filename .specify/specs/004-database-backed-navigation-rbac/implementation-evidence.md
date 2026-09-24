# 切片 004 实现证据

> 记录时间：2026-09-03
> 状态：`released-in-validation-lab`；Release Gate 由 `REQSRC-021` 批准

## 已实现

- Profile v0.2 workspace：`packages/web`、`packages/server`、`packages/contracts`、`packages/tsconfig`；
- 六类权限业务表、单一 Prisma migration、幂等 Seed、严格 `SYSTEM_CODES` 与最终持久化全量不变量校验；
- Argon2id 本地认证、短期签名 Session Cookie、稳定密钥 ID 与前一密钥轮换、ACTIVE 用户复核、Origin + 双提交 CSRF；
- 有效角色成员和显式 MENU/ACTION grant 驱动的双区导航、页面直达、同事务操作复核、串行副作用与失败补偿；
- Web 登录、账号切换、系统切换、加载/403/404/503 + 重试、授权树搜索、全部管理根和 `allowedActions`；
- 结构化安全日志与 live / database+migration ready 健康检查。

## 已执行证据

| 范围 | 实际结果 |
|---|---|
| Workspace 全量质量 | `pnpm verify` 通过：validate、lint、typecheck、test、build 全绿；根 `_methodology/scripts/verify-all.sh` 通过 |
| Web 回归 | 12 个测试文件、59 项测试通过；含 10 项真实 Gateway seam 的 Showcase 测试 |
| Contracts / Server 单元 | Contracts 4 项、Server 13 项通过；数据库测试默认显式跳过 |
| PostgreSQL 16 | 空库 migration `20260903204500_create_navigation_rbac` 成功；重复 Seed 成功；基线 31 菜单、28 操作、3 角色、2 用户、2 成员、100 权限 |
| 数据库集成 | API + migration 12 项通过；覆盖健康检查、系统隔离、403/404、CSRF、账号切换、下一请求撤权、六表和复合约束 |
| 故障注入 | 停止数据库后，导航与维护操作均返回 `503 SERVICE_UNAVAILABLE`；修复了曾误映射为 401 的异常边界 |
| 性能 | PostgreSQL 16；2×250 菜单、≤8 操作/页、admin 20 角色；100 预热+100 采样，P95 `37.7ms`（预算 ≤300ms），并断言返回 250 节点完整性 |
| 浏览器 | admin/viewer、双系统、1440×900、1280×800、1280×600、搜索、折叠、键盘、操作与 FAIL CLOSED 通过 |

浏览器截图：`evidence/admin-navigation-1440x900.png`、`evidence/viewer-resource-1280x800.png`。

## TDD 与缺陷闭环

- Seed 父 PAGE / 跨区父子、持久化脏配置、SessionGuard 数据库异常、退出后换账号 CSRF、写操作失败反馈均先由失败测试复现，再修复为绿色；
- 浏览器故障注入发现数据库断连被误判为 401，修复后回归为 503；
- 实现评审发现并关闭：操作事务与并发补偿边界、页面 503 重试、管理根截断、Seed 系统码宽松解析、20 角色性能覆盖、密钥轮换 ID 与测试凭据问题。
- Release 后首次按 README 启动发现 Prisma CLI 与 Seed 未读取工作区根 `.env`；已改为基于模块位置显式加载，并以根命令实际完成 migration 与 Seed 回归。该修复不改变已批准的数据模型或授权行为。
- `REQSRC-025` 运行事件中，5173 前端仍存在而 3000 API 已停止；数据库容器健康。恢复 API 后，真实 HTTP 链路得到 `admin` 登录 `201`、`demo-portal` 导航 `200`、9 个根菜单和有效权限版本，证明角色成员与授权数据未丢失。已改为只常驻 `pnpm dev:server`，避免额外启动占用 5174 的重复前端。

## 边界与下一步

- 本切片没有数据权限、DENY、用户直授权、系统管理 UI、生产身份提供方或 Session 表；
- `ShowcaseApp.tsx` 仍较集中，是 P2 可维护性债务，新增页面模式前宜拆分会话状态机、导航壳和页面适配器；不影响本切片验收行为；
- 这是验证场内“已实现、已验证、已发布”的候选资产，但尚未经过跨项目真实采用，不能晋升为 `_methodology/patterns/` 的正式模式；
- 下一步可积累真实项目采用证据并在新增页面模式前处理 P2 拆分；未执行外部部署，生产使用和方法论资产晋升仍需独立批准。
