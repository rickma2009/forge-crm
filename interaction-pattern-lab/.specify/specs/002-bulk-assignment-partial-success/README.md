# 002 批量分配与部分成功验证

> 状态：architecture-proposed-awaiting-architecture-gate
> Business Gate：approved（`REQSRC-009`）
> Specification Gate：approved（`REQSRC-010`）
> Architecture Gate：pending-human-decision

本切片交付一个从分类目录发现批量操作候选、理解证据边界、体验批量选择与部分成功、再形成采用判断的最小验证闭环。

## 文件职责

- `requirements/original.md`：批准的业务来源与切片输入；
- `clarification.md`：规格决策、假设及后续 Gate 问题；
- `spec.md`：What / Why、业务规则与验收标准；
- `testcases.md`：待执行的验证设计，不记录虚构结果；
- `traceability.md`：BUS、REQ/NFR、AC 与 TC 的追溯；
- `specification-gate-review.md`：已批准的 Specification Gate 评审记录；
- `plan.md`：待批准的技术方案；
- `architecture-gate-review.md`：当前人工 Architecture Gate 评审入口；
- `pipeline-state.json`：当前阶段和 Gate 状态。

## 当前允许与禁止

允许评审技术 Plan、ADR、风险、测试实现策略和回滚边界。

Architecture Gate 批准前不得创建 Tasks、建立资产索引文件、修改 Demo 注册机制或编写实现代码；本切片也不授权资产晋升或 Release。
