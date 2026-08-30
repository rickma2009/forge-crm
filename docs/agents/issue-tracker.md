# Issue Tracker: Adapted Local Markdown

根仓库没有远程 issue tracker。方法论建设和验证场协作事项使用 `.scratch/<effort>/`；MCRM 由其独立仓库管理，不汇总到这里。

## Authority Boundary

- `.scratch/` 只承载请求、决策问题、研究、原型和执行任务。
- `.specify/` 承载经批准的业务/功能规格、验收、计划、任务与 Gate 状态；它是唯一 SDD 事实源。
- 禁止创建 `.scratch/<feature>/spec.md` 作为第二份业务规格。
- Matt `to-spec` 对业务功能必须输出到 `.specify/` 的 SDD 链并等待 Gate；只有不改变业务语义、架构或发布边界的低风险工程事项，才可直接在 tracker 中形成工程契约。
- Matt `to-tickets` 只把已批准的 `TASK-*` 投影为协作票据；票据必须反向链接权威 TASK，不能改写验收标准。

## Conventions

- 决策地图：`.scratch/<effort>/map.md`。
- 子问题或执行票据：`.scratch/<effort>/issues/<NN>-<slug>.md`。
- 使用 `Type:`、`Status:`、`Blocked by:` 表达 Matt 工作流状态。
- 涉及 SDD 时增加 `Authority:` 和 `Trace:`，例如 `Authority: .specify/specs/002.../tasks.md#TASK-004`。
- `ready-for-agent` 只表示可承接当前已授权阶段；若票据要求实现，Business、Specification、Architecture Gate 与 Definition of Ready 必须满足。

## Publishing

当 Skill 说“发布到 issue tracker”时，按上述边界写入 `.scratch/`。若产物属于业务事实、规格、测试、计划或 Gate，转写到 `.specify/` 并在 tracker 中只保留链接和讨论上下文。
