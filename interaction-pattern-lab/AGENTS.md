# AGENTS.md

> 企业交互模式验证场的 AI 执行入口。

## 项目状态

- 当前阶段：`architecture-proposed-awaiting-architecture-gate`。
- 重新定义证据：`REQSRC-007`。本目录是交互模式验证场，不是模板规范源或真实业务项目。
- 既有 `REQSRC-002`—`REQSRC-006` 及实现证据作为历史切片证据保留，不改写、不冒充新边界的批准。
- 新定位 Business Gate 已由 `REQSRC-009` 批准；切片 002 Specification Gate 已由 `REQSRC-010` 批准；Architecture 与 Release Gate 仍须按切片推进。
- 当前评审对象：`.specify/specs/002-bulk-assignment-partial-success/architecture-gate-review.md`。

## 开始工作前

1. 检查并保留已有改动。
2. 使用工作台 `sdd-forge-workflow`。
3. 阅读 `.specify/memory/project-charter.md`、`business-context.md` 和 `constitution.md`。
4. 新材料先进入 `.specify/sources/`，再做增量转换、冲突分析和影响评估。
5. 检查 `_methodology/08-企业管理系统交互模式分类方法.md`、`patterns/` 与 `templates/ui/` 的现有资产。

## 稳定约束

- `_methodology/` 是通用模式的唯一规范源；本项目负责探索与验证，不另建一套冲突事实源。
- Demo 交互默认只保留在当前浏览器会话，不写业务数据库。
- 模式内容需要版本化保存；“不保存”只指 Demo 操作数据，不指方法论资产。
- 来源项目是证据，不是答案。源码优先于截图，推断必须与事实分开。
- 不复制参考项目的业务字段、组织平台、认证体系或技术遗留。
- Open Design 或其他工具生成的原型属于设计建议，不能替代项目 Spec、测试证据或人工 Gate。
- 不虚构模式验证、测试、发布或外部系统状态。

## 上下文路由

- 项目总体规划：`docs/product/企业管理系统交互模式工作台总体规划.md`
- 当前业务需求：`.specify/requirements/002-validation-field-baseline/requirement.md`
- Business Gate 评审：`.specify/requirements/002-validation-field-baseline/business-gate-review.md`
- 历史产品基线：`.specify/requirements/001-product-baseline/`
- 场景台账：`docs/pattern-backlog.md`
- 参考证据：`docs/reference-inventory.md`
