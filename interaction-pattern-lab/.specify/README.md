# Interaction Pattern Lab SDD 工作区

本目录是项目唯一规格目录，不使用 `_spec/`。

## 目录

- `project-state.json`：验证场项目级状态入口；历史切片状态仍保留在其 `pipeline-state.json`。
- `memory/`：项目章程、业务上下文和项目宪法；
- `sources/`：不可改写的用户原文和后续参考资料；
- `requirements/`：业务可评审需求与转换记录；
- `specs/`：仅在 Business Gate 通过后创建功能切片。

当前状态：`architecture-proposed-awaiting-architecture-gate`。`REQSRC-009` 已批准新定位 Business Gate，`REQSRC-010` 已批准切片 002 Specification Gate；当前评审入口是 `specs/002-bulk-assignment-partial-success/architecture-gate-review.md`。历史 Architecture Gate 只适用于切片 001，切片 002 的实现、资产晋升和 Release 均未获授权。
