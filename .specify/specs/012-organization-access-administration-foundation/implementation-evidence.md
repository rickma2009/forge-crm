# 实施与验证证据：012 组织与访问管理基础

> 证据日期：2026-09-22（Asia/Shanghai）  
> 结论：核心实现与自动验证完成；Release Gate 因恢复演练、规定规模性能、带身份浏览器全流程和独立评审缺失而保持未批准。  
> 边界：全部证据来自当前仓库和本地 PostgreSQL；未访问或修改 `supply`、`gf_scm`、MCRM 或生产数据库。

## 1. 已实现

- 旧 `iam_*`、`ui_*` 物理表迁移为 `sys_*`，保留既有 Prisma delegate 名称作为代码兼容层；新增 tenant/application/role-group/permission/audit 平台实体。
- 账号唯一性改为 `(tenant_id, normalized_account)`；角色、权限与 grant 采用应用 UUID 作用域；角色成员采用 `[effective_at, expires_at)` 并由 PostgreSQL 排斥约束阻止重叠。
- admin 仅通过系统管理员角色获得全部显式权限；viewer 可只读用户、角色和权限目录，直接写请求由服务端返回 403，前端不展示写入口。
- Access API 覆盖用户状态、角色、成员、权限目录和角色权限原子替换；状态/成员/权限变更与白名单审计同事务。
- Web 提供用户列表、角色成员与权限矩阵、只读权限目录，沿用全局企业页面样式、Gateway 和数据库导航动作。

## 2. 实际执行证据

| 命令 | 结果 |
|---|---|
| `prisma migrate deploy` | PASS；应用 `20260922104500_user_tenant_account_scope`，此前两项平台迁移已在同库登记 |
| `pnpm db:seed` | PASS；修正租户复合唯一键后重复执行成功 |
| `RUN_DB_TESTS=1 ... api.integration.spec.ts migration.integration.spec.ts` | PASS：2 suites / 15 tests；包含 admin/viewer、跨应用 grant、租户账号唯一、角色区间和 API 写拒绝 |
| `pnpm --filter .../web test -- AccessAdminPages.test.tsx` | PASS：2/2；管理员写入口和 viewer 只读入口 |
| `pnpm verify` | PASS：Registry/场景/隔离/lint/typecheck/test/build 全通过；Contracts 8/8、Server 20 passed + 15 env-skipped、Web 170/170 |
| `check-sdd.sh ... full` | PASS：结构、Gate、追溯、TASK 覆盖全部通过 |
| `_methodology/scripts/verify-all.sh` | FAIL：在本切片检查前被仓库既有根 `CONTEXT.md` 与 `CONTEXT-MAP.md` 同时存在问题阻断；未将其写成通过 |

构建仍报告既有的单个压缩前 JS chunk 大于 500 kB 警告；命令退出码为 0。本切片没有把警告冒充已解决。

## 3. 数据库保护证据

- 数据库测试证明跨应用 permission grant 被复合外键拒绝。
- 同一租户重复规范化账号被唯一索引拒绝，不同租户可复用账号名。
- 无效成员区间被检查约束拒绝；活动区间重叠由 GiST 排斥约束保护。
- 系统角色普通编辑/停用、操作者自停用/自移除、最后有效系统管理员移除由服务层拒绝。
- 新权限发布的 Seed 会补齐系统管理员显式授权；普通权限矩阵使用 role version 和 Serializable 事务原子替换。

## 4. 未证明项

- 未在独立恢复库完成“备份 → 历史基线 → 目标迁移 → 新 Seed → 恢复”的全演练，因此不声称迁移可交付到共享或生产环境。
- 未按 Plan 的 10,000 用户、200 角色、500 权限、20,000 成员/grant 规模记录查询计划与 P95。
- 本轮浏览器控制未获得可安全复用的本地演示凭据；只完成 API 身份集成和组件级交互验证，未登记带身份的 1440/1024/窄屏、键盘或截图证据。
- 未进行独立实现评审；`review.md` 是 AI 自审，不冒充人工或独立审查。

这些缺口不影响本地代码和自动测试结果，但阻断 Release Gate。
