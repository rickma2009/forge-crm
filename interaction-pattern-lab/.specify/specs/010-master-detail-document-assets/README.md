# 010 主从单据与企业组件资产化

> 状态：release-gate-review-ready-awaiting-user-approval
> Business 边界：`REQSRC-014` 已批准的 `BUS-005`—`BUS-007`
> Specification Gate：approved（`REQSRC-032`）
> Architecture Gate：approved（`REQSRC-034`）

本切片已完成主从单据、SchemaForm、可编辑行表和组件状态矩阵的实现、自动验证、响应式浏览器 QA 与全键盘浏览器走查，并已准备 Release Gate 评审包。候选资产仍仅在验证场内，资产晋升、外部部署和 Release 均未获得批准。

## 文件职责

- `requirements/original.md`：原始来源定位；
- `clarification.md`：已决策、默认项与未决架构问题；
- `spec.md`：可观察行为与验收标准；
- `testcases.md`：验证设计，不含虚构执行结果；
- `traceability.md`：业务目标、需求、验收和测试关系；
- `specification-gate-review.md`：已批准的 Specification Gate 评审记录；
- `architecture-gate-review.md`：已批准的 Architecture Gate 评审记录；
- `tasks.md`：Architecture Gate 后的唯一执行顺序与追溯；
- `implementation-evidence.md`：自动测试、浏览器 QA、隔离与逐用例证据；
- `review.md`：产品、架构、QA 三视角实施后自审；
- `release-gate-review.md`：等待独立人工决定的 Release Gate 评审包；
- `pipeline-state.json`：真实阶段状态。
