# Interaction Pattern Lab

> 中文名：企业交互模式验证场
> 项目状态：`paused-awaiting-scope-correction`
> 当前 Gate：切片 002 Architecture Gate 已批准；等待 103/99 范围计数纠正确认

本项目用于探索、实现和验证企业管理系统中重复出现的页面、操作、展示状态和特殊交互。它是验证场，不是通用模板的权威来源，也不代表真实业务系统。

计划中的核心体验是：左侧按分类选择模式，右侧即时展示交互原型和总结说明。Demo 中的点击和录入只改变当前浏览器会话，不写入业务数据库；模式定义、来源证据和验收结论仍由 Git 中的 Markdown、Schema、模板与案例管理。

## 当前阶段

首个可运行切片已有实现、自动化和本地浏览器证据，这些历史证据继续保留。`REQSRC-009` 批准新的 Business Gate，`REQSRC-010/011` 分别批准切片 002 的 Specification 与 Architecture Gate。实现首个资产契约红测时发现权威分类实际为 103 项而非批准基线中的 99 项，当前按 `scope-discrepancy.md` 暂停并等待范围事实纠正。

## 权威入口

- 项目章程：`.specify/memory/project-charter.md`
- 业务上下文：`.specify/memory/business-context.md`
- 项目宪法：`.specify/memory/constitution.md`
- 原始需求：`.specify/sources/`
- 当前需求与 Gate 评审：`.specify/requirements/002-validation-field-baseline/`
- 历史产品基线：`.specify/requirements/001-product-baseline/`
- 产品总体规划：`docs/product/企业管理系统交互模式工作台总体规划.md`
- 场景台账：`docs/pattern-backlog.md`
- 参考证据台账：`docs/reference-inventory.md`

## 当前允许与禁止

允许：评审 103/99 分类数量差异并确认是否按 103 项纠正既有 Gate 文档。

禁止：纠正确认前继续 Tasks、建立资产索引、修改 Demo 注册或编码；禁止把历史 Demo 授权称为新定位下的发布批准，也禁止提前晋升资产成熟度。
