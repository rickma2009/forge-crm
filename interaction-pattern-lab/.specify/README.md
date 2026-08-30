# Interaction Pattern Lab SDD 工作区

本目录是项目唯一规格目录，不使用 `_spec/`。

## 目录

- `project-state.json`：验证场项目级状态入口；历史切片状态仍保留在其 `pipeline-state.json`。
- `memory/`：项目章程、业务上下文和项目宪法；
- `sources/`：不可改写的用户原文和后续参考资料；
- `requirements/`：业务可评审需求与转换记录；
- `specs/`：仅在 Business Gate 通过后创建功能切片。

当前状态：`paused-awaiting-scope-correction`。`REQSRC-010/011` 已分别批准切片 002 的 Specification 与 Architecture Gate，但首个 TDD 红测发现方法论 08 实际为 103 项，而 `REQSRC-008/009` 批准的是 99 项。当前评审入口是 `specs/002-bulk-assignment-partial-success/scope-discrepancy.md`；计数纠正确认前不得实现，资产晋升和 Release 仍未获授权。
