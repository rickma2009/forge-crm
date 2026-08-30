# Triage Labels

Matt Skills 使用以下五个标准状态角色；根仓库的本地 Markdown tracker 直接使用同名字符串。

| Matt 角色 | 本仓库状态 | 含义 |
|---|---|---|
| `needs-triage` | `needs-triage` | 等待维护者判断 |
| `needs-info` | `needs-info` | 等待补充可执行信息 |
| `ready-for-agent` | `ready-for-agent` | 当前已授权阶段可由 Agent 承接 |
| `ready-for-human` | `ready-for-human` | 必须由人完成判断或操作 |
| `wontfix` | `wontfix` | 不执行并保留原因 |

分类角色继续使用 `bug` 和 `enhancement`。每张已 triage 票据应只有一个分类角色和一个状态角色。

## SDD 约束

`ready-for-agent` 不是 Gate 批准。若票据要求实现，必须同时满足 Business、Specification、Architecture Gate、Definition of Ready，并通过 `Authority:` 或 `Trace:` 链接 `.specify/` 中的权威任务。
