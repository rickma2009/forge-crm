# Interaction Pattern Lab SDD 工作区

本目录是项目唯一规格目录，不使用 `_spec/`。

## 目录

- `project-state.json`：验证场项目级状态入口；历史切片状态仍保留在其 `pipeline-state.json`。
- `memory/`：项目章程、业务上下文和项目宪法；
- `sources/`：不可改写的用户原文和后续参考资料；
- `requirements/`：业务可评审需求与转换记录；
- `specs/`：仅在 Business Gate 通过后创建功能切片。

当前状态：`review-complete-awaiting-release-gate`。`REQSRC-009/010/011` 已批准 Business、Specification 与 Architecture Gate，`REQSRC-012` 已把目录范围纠正为 103 项。当前交接入口是 `specs/002-bulk-assignment-partial-success/review.md`；资产晋升、部署和 Release 仍未获授权。
