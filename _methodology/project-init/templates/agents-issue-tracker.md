# Issue Tracker: Adapted Local Markdown

本仓库使用 `.scratch/<effort>/` 管理请求、决策、研究、原型和协作任务。

## Authority Boundary

- `.specify/` 是业务需求、功能规格、验收、计划、任务和 Gate 的唯一事实源。
- 禁止创建 `.scratch/<feature>/spec.md` 作为第二业务规格。
- `to-spec` 对业务功能必须走 SDD `spec → testcases → plan → tasks`。
- `to-tickets` 只投影已批准的 `TASK-*`，票据必须通过 `Authority:` 或 `Trace:` 反向链接权威任务。
- `ready-for-agent` 只表示当前已授权阶段可承接；实现仍须满足 Gate 与 Definition of Ready。

## Conventions

- 决策地图：`.scratch/<effort>/map.md`。
- 票据：`.scratch/<effort>/issues/<NN>-<slug>.md`。
- 使用 `Type:`、`Status:`、`Blocked by:`、`Authority:` 和 `Trace:` 字段。
