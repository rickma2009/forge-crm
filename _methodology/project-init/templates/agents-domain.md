# Domain Docs

本仓库采用单上下文布局。工程 Skills 先读根 `CONTEXT.md` 获取词汇，再读 `.specify/memory/business-context.md` 获取完整业务事实。

难逆转、存在真实权衡且未来读者会困惑的跨切片决策写入 `docs/adr/`；切片局部决定保留在相应 `plan.md`。不得在词汇、业务上下文、Spec 和 ADR 之间复制同一事实。
