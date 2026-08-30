# Context Map

`sdd-forge` 根仓库包含两个需要分开表达的上下文。`mcrm/` 是独立 Git 仓库，不属于本上下文图；进入 MCRM 工作时读取它自己的 `CONTEXT.md`。

## Contexts

- [AI 工程方法与资产](./_methodology/CONTEXT.md)：定义治理方法、初始化契约、可复用资产及其晋升规则。
- [企业交互模式验证](./interaction-pattern-lab/CONTEXT.md)：探索并验证企业管理交互模式，为方法论资产提供证据。

## Relationships

- **AI 工程方法与资产 → 企业交互模式验证**：提供 Gate、追溯、资产分类、模板和验证口径。
- **企业交互模式验证 → AI 工程方法与资产**：提供实现、交互和验收证据；只有满足晋升条件的结论才回流 `_methodology/`。
- **MCRM → AI 工程方法与资产**：MCRM 作为独立消费者提供真实项目证据，不由根仓库的 tracker 或上下文图管理。
