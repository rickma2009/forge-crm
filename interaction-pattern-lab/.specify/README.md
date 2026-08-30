# Interaction Pattern Lab SDD 工作区

本目录是项目唯一规格目录，不使用 `_spec/`。

## 目录

- `project-state.json`：验证场项目级状态入口；历史切片状态仍保留在其 `pipeline-state.json`。
- `memory/`：项目章程、业务上下文和项目宪法；
- `sources/`：不可改写的用户原文和后续参考资料；
- `requirements/`：业务可评审需求与转换记录；
- `specs/`：仅在 Business Gate 通过后创建功能切片。

当前状态：`business-gate-reopened`。首个历史切片已有自动化、构建和本地浏览器证据，但用户在 `REQSRC-007` 中把本目录重新定义为“企业交互模式验证场”，改变了目标和边界。既有 Gate 记录只保留为历史切片证据；新定位须先重新通过 Business Gate。
