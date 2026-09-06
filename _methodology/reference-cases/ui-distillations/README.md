# UI 多来源候选萃取索引

本目录保存从既有系统源码、页面原型和截图中形成的候选萃取包。它是证据与候选区，不是正式模式、模板或组件规范源。

## 使用规则

1. 每次萃取先固定来源版本并建立 `source-selection.md`；
2. 源码、路由、样式和测试优先于截图；
3. 事实、实现支持的推断、未知项和来源冲突分别记录；
4. `candidate/` 内的名称、菜单、字段和文案必须去来源项目化；
5. 候选完成验证并通过人工评审后，才按类型晋升到 `patterns/`、规划中的 `ui-assets/`、`templates/ui/` 和 `examples/`；
6. 不允许因存在可运行页面就自动宣称 `project-adopted`、`business-validated` 或 `released`。

## 当前候选

| 萃取 ID | 通用名称 | 当前状态 | 入口 |
|---|---|---|---|
| `UID-001` | 带底部管理分组的企业导航壳层 | `candidate-superseded-for-current-target` | `UID-001-enterprise-navigation-shell/README.md` |
| `UID-002` | 统一导航、常驻工具栏、多页签与可配置列表工作区 | `candidate-evidence-collected` | `UID-002-enterprise-workspace-configurable-list/README.md` |
