# SDD 与 Matt 工程流程集成规范

> 版本：v1.0  
> 更新：2026-08-30

## 1. 定位

SDD 是治理主流程：决定事实源、阶段、Gate、追溯和验收。Matt Pocock 工程 Skills 是探索与执行工具：帮助澄清决策、研究、原型、拆票、TDD、模块设计和代码评审。后者不能替代或越过前者。

## 2. 唯一事实源

- 原始输入：`.specify/sources/`，追加归档，不静默改写。
- 业务上下文：`.specify/memory/business-context.md`。
- 批准的功能规格与交付链：`.specify/specs/<feature>/`。
- 稳定项目规则：`.specify/memory/constitution.md` 与 `AGENTS.md`。
- Tracker：请求、决策讨论、研究、原型和执行协作面，不是第二规格源。
- `CONTEXT.md`：薄词汇索引，帮助工具使用一致语言，不复制完整业务事实。
- ADR：只记录难逆转、有真实权衡且未来读者会困惑的决策。

## 3. 生命周期映射

| SDD 阶段 | 可用 Matt 技法 | 输出边界 |
|---|---|---|
| 模糊目标/Business discovery | `wayfinder`、`grilling`、`domain-modeling`、`research` | 决策地图、问题、证据；批准事实回写 `.specify/` |
| 不确定方案 | `prototype` | 可丢弃原型与结论；原型本身不晋升资产 |
| Specification | 适配后的 `to-spec` | 产出 SDD `spec.md`、AC、testcases；不得使用 `.scratch/spec.md` 作为业务规范 |
| Architecture/Tasks | `codebase-design`、适配后的 `to-tickets` | Plan/ADR 与 TASK 投影；票据反向链接权威 TASK |
| Implement | `tdd`、tracer bullet | 一次穿透可观察 seam；仍受任务和 Gate 约束 |
| Review | `code-review` | Standards 与 Spec 两轴是子检查，还需追溯、安全、集成和 Release 检查 |
| Release/回流 | SDD Gate 与资产晋升规范 | Matt tracker 状态不能代替 Release Gate 或成熟度证据 |

## 4. `ready-for-agent` 语义

`ready-for-agent` 只表示“Agent 可承接当前已授权阶段”。当票据要求实现时，还必须满足：

1. 业务范围已通过 Business Gate；
2. 行为和验收已通过 Specification Gate；
3. 涉及架构、数据或安全的方案已通过 Architecture Gate；
4. 权威 TASK、依赖、测试 seam 和完成证据明确；
5. tracker 票据链接而不复制权威内容。

缺少任一条件时只能继续研究、澄清或原型，不得借标签越 Gate。

## 5. 每仓库 Setup 规则

`setup-matt-pocock-skills` 是 per-repo 协作配置，不是 SDD 初始化器或项目脚手架。

| 位置 | 是否单独 Setup | 原因 |
|---|---|---|
| `sdd-forge/` 根仓库 | 是，采用适配配置 | 管理方法论与验证场协作 |
| `_methodology/` | 否 | 不是独立 Git 仓库 |
| `interaction-pattern-lab/` | 否 | 继承根仓库配置；若将来拆成独立仓库再 Setup |
| `mcrm/` | 是，采用项目内适配配置 | 独立 Git 仓库和独立任务边界 |
| 未来独立项目 | 按需 | 只有确实使用 Matt 协作流时才 Setup |

通用 Skills 保持用户级或工作台发现链接，不复制到每个项目。只有项目独有、重复、可测试且无敏感配置的能力才成为项目本地 Skill。

## 6. 研究和评审证据

- 外部研究仍需按来源治理归档，引用不能成为游离事实源。
- `prototype` 的选中结论必须在正式切片中重新实现和验证。
- Matt code review 的 Standards/Spec 结论要与 SDD 追溯、安全、集成和 Release 检查合并报告。
- Skills 的“完成”只说明该操作完成，不等于 Gate 批准、业务验证或发布完成。
