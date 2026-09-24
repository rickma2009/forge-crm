# Interaction Pattern Lab SDD 工作区

## 当前 CRM 报价增量（2026-09-23）

[切片 022：商机报价与销售定价](specs/022-opportunity-quotation-pricing/README.md) 基于 REQSRC-062 和 REQSRC-063 连续实施委托，已完成本地实现和测试。Gate、证据及既有仓库限制见切片 review.md 和 pipeline-state.json；没有 Release、资产晋升或外部部署批准。下文其他切片状态保留为历史，不代表本增量状态。

本目录是项目唯一规格目录，不使用 `_spec/`。

## 目录

- `project-state.json`：验证场项目级状态入口；历史切片状态仍保留在其 `pipeline-state.json`。
- `memory/`：项目章程、业务上下文和项目宪法；
- `sources/`：不可改写的用户原文和后续参考资料；
- `requirements/`：业务可评审需求与转换记录；
- `specs/`：仅在 Business Gate 通过后创建功能切片。

当前状态：切片 004—010 的既有批准和验证证据已登记，其中切片 005—009 由 `REQSRC-023` 的连续授权完成验证场内发布，切片 010 由 `REQSRC-035` 单独批准验证场内发布；切片 002 仍为 `review-complete-awaiting-release-gate`。切片 011“导入—校验—执行”的 Business Gate 已由 `REQSRC-037` 批准，当前等待 Specification Gate；批准前不得创建 Plan、Tasks 或实现。所有发布均不包含外部部署、真实项目采用或方法论资产自动晋升。
