# AGENTS.md

> 企业管理系统交互模式工作台的 AI 执行入口。

## 项目状态

- 当前阶段：`release-approved-hosting-pending`。
- Business Gate：用户于 2026-08-30 批准，证据为 `REQSRC-002`。
- Specification Gate：用户于 2026-08-30 批准，证据为 `REQSRC-003`。
- Architecture Gate：用户于 2026-08-30 批准，证据为 `REQSRC-004`。
- Release Gate：用户于 2026-08-30 批准当前静态 Demo 发布，证据为 `REQSRC-005`；不包含新增外部能力或扩大公开范围。

## 开始工作前

1. 检查并保留已有改动。
2. 使用工作台 `sdd-forge-workflow`。
3. 阅读 `.specify/memory/project-charter.md`、`business-context.md` 和 `constitution.md`。
4. 新材料先进入 `.specify/sources/`，再做增量转换、冲突分析和影响评估。
5. 检查 `_methodology/08-企业管理系统交互模式分类方法.md`、`patterns/` 与 `templates/ui/` 的现有资产。

## 稳定约束

- `_methodology/` 是通用模式的唯一规范源；本项目是浏览、组合和验证这些模式的 Demo，不另建一套冲突事实源。
- Demo 交互默认只保留在当前浏览器会话，不写业务数据库。
- 模式内容需要版本化保存；“不保存”只指 Demo 操作数据，不指方法论资产。
- 来源项目是证据，不是答案。源码优先于截图，推断必须与事实分开。
- 不复制参考项目的业务字段、组织平台、认证体系或技术遗留。
- Open Design 或其他工具生成的原型属于设计建议，不能替代项目 Spec、测试证据或人工 Gate。
- 不虚构模式验证、测试、发布或外部系统状态。

## 上下文路由

- 项目总体规划：`docs/product/企业管理系统交互模式工作台总体规划.md`
- 业务需求草案：`.specify/requirements/001-product-baseline/requirement.md`
- 待确认事项：`.specify/requirements/001-product-baseline/clarification.md`
- 场景台账：`docs/pattern-backlog.md`
- 参考证据：`docs/reference-inventory.md`
