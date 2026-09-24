# 003 认证式企业导航壳层

> 状态：`frontend-only-implementation-preserved-gates-reopened-by-REQSRC-017`
> Business Gate：approved（`REQSRC-014`）
> Specification Gate：approved（`REQSRC-015`）
> Architecture Gate：approved（`REQSRC-016`）

本切片验证一个桌面优先、带模拟身份的企业导航壳层：上方承载通用资产入口，下方固定系统管理分组，并用 `admin` 与 `viewer` 证明菜单、路由、页面只读和操作权限采用一致语义。

## 文件职责

- `requirements/original.md`：已批准业务输入与切片边界；
- `clarification.md`：规格问题的建议答案、边界和待架构决策项；
- `spec.md`：用户可观察行为、业务规则、失败行为与验收标准；
- `testcases.md`：验证设计与 2026-09-03 实际执行证据；
- `traceability.md`：BUS、上游需求、切片需求、AC 与 TC 的追溯；
- `specification-gate-review.md`：人工评审入口；
- `plan.md`：已由 Architecture Gate 批准的技术方案；
- `architecture-gate-review.md`：已批准的 Architecture Gate 评审记录；
- `tasks.md`：已按批准 Plan 建立的实现任务、依赖与证据状态；
- `pipeline-state.json`：切片阶段与 Gate 状态。

## 当前允许与禁止

`TASK-401`—`TASK-406` 已在原“纯前端模拟权限”边界内实现并验证。`REQSRC-017` 要求数据库、后端和纯角色授权，已改变目标与系统边界，因此 TASK-407/Release 评审停止，Business、Specification 和 Architecture Gate 重新打开。新需求见 `../../requirements/004-database-backed-navigation-rbac/`。
