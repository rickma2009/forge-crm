# Interaction Pattern Lab SDD 工作区

本目录是项目唯一规格目录，不使用 `_spec/`。

## 目录

- `project-state.json`：验证场项目级状态入口；历史切片状态仍保留在其 `pipeline-state.json`。
- `memory/`：项目章程、业务上下文和项目宪法；
- `sources/`：不可改写的用户原文和后续参考资料；
- `requirements/`：业务可评审需求与转换记录；
- `specs/`：仅在 Business Gate 通过后创建功能切片。

当前状态：`specified-awaiting-specification-gate`。`REQSRC-009` 已批准新定位 Business Gate；当前评审对象是 `specs/002-bulk-assignment-partial-success/`。既有 Gate 记录只保留为历史切片证据，Architecture、实现和 Release 均未获新授权。
