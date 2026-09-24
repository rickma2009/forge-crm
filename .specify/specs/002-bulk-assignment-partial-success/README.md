# 002 批量分配与部分成功验证

> 状态：review-complete-awaiting-release-gate
> Business Gate：approved（`REQSRC-009`）
> Specification Gate：approved（`REQSRC-010`）
> Architecture Gate：approved（`REQSRC-011`），目录数量由 `REQSRC-012` 纠正为 103 项

本切片交付一个从分类目录发现批量操作候选、理解证据边界、体验批量选择与部分成功、再形成采用判断的最小验证闭环。

## 文件职责

- `requirements/original.md`：批准的业务来源与切片输入；
- `clarification.md`：规格决策、假设及后续 Gate 问题；
- `spec.md`：What / Why、业务规则与验收标准；
- `testcases.md`：验证设计与真实执行证据；
- `traceability.md`：BUS、REQ/NFR、AC 与 TC 的追溯；
- `specification-gate-review.md`：已批准的 Specification Gate 评审记录；
- `plan.md`：已批准的技术方案；
- `architecture-gate-review.md`：已批准的 Architecture Gate 评审记录；
- `scope-discrepancy.md`：99/103 历史计数差异及 `REQSRC-012` 纠正记录；
- `tasks.md`：当前实现任务与执行证据；
- `review.md`：三视角评审、整改闭环和 Release Gate 前置；
- `pipeline-state.json`：当前阶段和 Gate 状态。

## 当前允许与禁止

当前允许评审本地验证结果并形成 Release Gate 决定；仍不授权资产晋升、部署或自动发布。
