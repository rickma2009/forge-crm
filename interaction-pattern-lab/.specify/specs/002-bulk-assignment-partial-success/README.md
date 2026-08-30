# 002 批量分配与部分成功验证

> 状态：specified-awaiting-specification-gate
> Business Gate：approved（`REQSRC-009`）
> Specification Gate：pending
> Architecture Gate：not-started

本切片交付一个从分类目录发现批量操作候选、理解证据边界、体验批量选择与部分成功、再形成采用判断的最小验证闭环。

## 文件职责

- `requirements/original.md`：批准的业务来源与切片输入；
- `clarification.md`：规格决策、假设及后续 Gate 问题；
- `spec.md`：What / Why、业务规则与验收标准；
- `testcases.md`：待执行的验证设计，不记录虚构结果；
- `traceability.md`：BUS、REQ/NFR、AC 与 TC 的追溯；
- `specification-gate-review.md`：人工 Specification Gate 评审清单；
- `pipeline-state.json`：当前阶段和 Gate 状态。

## 当前允许与禁止

允许评审 Spec、验收标准、状态覆盖和测试设计。

Specification Gate 批准前不得创建技术 Plan；Architecture Gate 批准前不得建立资产索引文件、修改 Demo 注册机制或编写实现代码。
