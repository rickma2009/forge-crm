# ADR-002：SDD 作为治理主流程与唯一规格事实源

> 状态：accepted  
> 日期：2026-08-30

## 背景

工作台同时使用 SDD Forge 与 Matt Pocock 工程 Skills。两者都涉及澄清、规格、拆票和评审；若原样并行，会在 `.specify/`、tracker、`CONTEXT.md` 和 ADR 之间形成重复事实源，并可能由 `ready-for-agent` 越过人工 Gate。

## 决策

1. SDD 管理来源、权威规格、Gate、追溯、验收和发布。
2. Matt Skills 提供探索、决策、研究、原型、拆票、TDD、设计和评审技法。
3. `.specify/` 是批准后的业务与功能规格唯一事实源；tracker 仅作请求、决策和任务协作。
4. `CONTEXT.md` 只做薄词汇索引；完整业务事实保留在 `business-context.md`。
5. `ready-for-agent` 不具有 Gate 效力；实现必须同时满足 SDD Gate 和 Definition of Ready。

## 后果

- 不能原样采用 Matt local tracker 的 `.scratch/<feature>/spec.md` 约定；
- `to-spec`、`to-tickets`、`code-review` 必须按集成规范适配；
- Skills 可以改进执行质量，但不会扩大授权或改变事实源。

## 复审条件

只有当未来工具能原生读取和维护 `.specify/` 且保证 Gate/追溯语义时，才复审适配层。
