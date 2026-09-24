# 实现任务：组织与访问管理基础

> 功能编号：`012-organization-access-administration-foundation`  
> 状态：`implemented-verification-partial`  
> Architecture Gate：approved（`REQSRC-047`）

## 任务列表

### Task 1 — TASK-1201 固化迁移基线与管理契约

- 来源：`REQ-1201`—`REQ-1209`、`AC-1201`—`AC-1203`、`AC-1208`、`TC-1201`—`TC-1203`、`TC-1210`
- 依赖：无
- 产出：迁移映射/不变量测试、用户/角色/权限 contracts 失败测试与稳定错误码
- 实施边界：先写测试；不改生产 Schema 或服务实现
- 验收：新增测试因目标模型/契约尚不存在而按预期失败
- 验证命令/入口：`pnpm --filter @interaction-pattern-lab/contracts test`、`pnpm --filter @interaction-pattern-lab/server test -- --runInBand`
- 状态：complete
- 实际证据：`packages/contracts/src/access-contracts.spec.ts` 4/4；`packages/server/src/rbac/platform-migration.spec.ts` 3/3；完整 Contracts 8/8

### Task 2 — TASK-1202 实现 sys 平台模型、保留数据 Migration 与 Seed

- 来源：`REQ-1201`—`REQ-1209`、`REQ-1218`—`REQ-1224`、`AC-1201`—`AC-1203`、`AC-1207`、`AC-1211`、`TC-1201`—`TC-1203`、`TC-1208`、`TC-1209`、`TC-1214`
- 依赖：`TASK-1201`
- 产出：Prisma 当前模型、新 migration、幂等 Seed、数据库登记更新、迁移对账器
- 实施边界：保留现有 ID/关系；不改历史 migration；不迁移 `sys_dictionary`、`crm_*`
- 验收：空库与历史升级路径、重复 Seed、作用域/区间/系统管理员约束通过数据库测试
- 验证命令/入口：`pnpm prisma:generate`、迁移集成测试、`pnpm --filter @interaction-pattern-lab/server test`
- 状态：complete
- 实际证据：三项 20260922 migration 已应用；Seed 连续执行成功；migration integration 4/4；租户账号唯一、跨应用 grant、成员区间和系统角色约束均由数据库拒绝反例证明

### Task 3 — TASK-1203 重构认证、导航与稳定权限断言

- 来源：`REQ-1203`、`REQ-1205`—`REQ-1209`、`REQ-1225`—`REQ-1229`、`AC-1202`、`AC-1203`、`AC-1211`—`AC-1214`、`TC-1202`、`TC-1203`、`TC-1214`—`TC-1217`
- 依赖：`TASK-1202`
- 产出：应用解析器、`assertPermission`、新导航投影、auth 切换和失败默认拒绝测试
- 实施边界：无权限缓存、用户直授权、DENY、RLS 或账号名旁路
- 验收：admin/viewer 均从角色获得能力；跨作用域、停用用户和数据库异常均拒绝
- 验证命令/入口：`pnpm --filter @interaction-pattern-lab/server test`
- 状态：complete
- 实际证据：`AuthorizationService.assertPermission`、权限投影导航、admin/viewer API 集成测试通过；viewer 只读能力与直接写 403 已验证

### Task 4 — TASK-1204 实现访问管理 API 与审计事务

- 来源：`REQ-1210`—`REQ-1229`、`AC-1204`—`AC-1214`、`TC-1204`—`TC-1217`
- 依赖：`TASK-1202`、`TASK-1203`
- 产出：用户、角色、成员、权限目录/矩阵 controller/service、结构化审计和集成测试
- 实施边界：不提供权限目录写 API、菜单管理 API 或审计查询 API
- 验收：状态机、系统角色、最后管理员、重叠成员、停用权限、并发版本、viewer 越权和审计原子性全部通过
- 验证命令/入口：`pnpm --filter @interaction-pattern-lab/server test`
- 状态：complete
- 实际证据：AccessController/AccessService 已实现 13 个读取/管理端点；数据库 API 集成测试 11/11，含审计事务、版本冲突边界与应用隔离

### Task 5 — TASK-1205 实现 Web Gateway 与三个系统管理页面

- 来源：`REQ-1210`—`REQ-1230`、`AC-1204`—`AC-1216`、`TC-1204`—`TC-1220`
- 依赖：`TASK-1201`、`TASK-1204`
- 产出：Gateway contracts、用户页、角色/成员/权限矩阵页、只读权限目录页和组件测试
- 实施边界：复用客户管理页风格；不引入新 UI/状态库；菜单/日志仍为说明页
- 验收：admin 可完成管理闭环；viewer 只读；查询、冲突、空态、错误、键盘和窄屏行为符合规格
- 验证命令/入口：`pnpm --filter @interaction-pattern-lab/web test`、`pnpm --filter @interaction-pattern-lab/web typecheck`
- 状态：complete
- 实际证据：用户、角色/成员/权限矩阵、只读权限目录页面接入 Gateway；Web 32 files / 170 tests 全通过，其中 AccessAdminPages 2/2 覆盖管理员与只读写入口

### Task 6 — TASK-1206 完成迁移演练、全链路和性能验证

- 来源：`NFR-SEC-1201`、`NFR-DATA-1201`、`NFR-AUD-1201`、`NFR-PERF-1201`、`NFR-OBS-1201`、`AC-1201`—`AC-1217`、全部 `TC-*`
- 依赖：`TASK-1202`—`TASK-1205`
- 产出：本地 PostgreSQL 迁移/恢复记录、API 集成、浏览器证据、性能记录和隔离检查
- 实施边界：只使用本地中性数据；不访问参考或生产数据库
- 验收：对账、故障、浏览器 admin/viewer、响应式、键盘和性能预算有真实执行结果
- 验证命令/入口：迁移演练命令、浏览器任务、`pnpm verify`
- 状态：partial
- 实际证据：本地 PostgreSQL migration deploy、幂等 Seed、DB integration 15/15、`pnpm verify` PASS、隔离检查 37 files PASS；尚未完成独立恢复库备份恢复演练、10k/200/500 性能基线和带身份的真实浏览器全流程

### Task 7 — TASK-1207 完成实现评审、追溯和 Release 材料

- 来源：`NFR-TRACE-1201`、`AC-1217`、`TC-1221`
- 依赖：`TASK-1201`—`TASK-1206`
- 产出：独立实现评审、实现证据、更新后的追溯矩阵、Release Gate 评审包和项目状态
- 实施边界：不得把未运行检查写成通过；不得自动声称生产发布
- 验收：需求追溯、代码安全、数据库迁移和集成运行四视角无未处理 P0/P1
- 验证命令/入口：`bash _methodology/scripts/check-sdd.sh .specify/specs/012-organization-access-administration-foundation full`、`bash _methodology/scripts/verify-all.sh`
- 状态：partial
- 实际证据：`implementation-evidence.md`、`review.md`、`release-gate-review.md` 与追溯矩阵已更新；AI 自审无已知 P0/P1 代码缺陷，但没有独立评审，Release 因 TASK-1206 缺口保持未批准

## Checkpoints

| Checkpoint | 条件 | 状态 |
|---|---|---|
| Ready | Business、Specification、Architecture Gate 与 DoR 完成 | complete-REQSRC-047 |
| Implemented | `TASK-1201`—`TASK-1205` 完成 | complete-2026-09-22 |
| Verified | `TASK-1206` 与质量门禁通过 | partial-restore-performance-browser-pending |
| Reviewed | `TASK-1207` 无未处理 P0/P1 | self-review-complete-independent-review-pending |
| Accepted | Release 结论有真实证据并按 `REQSRC-047` 授权边界登记 | pending |
