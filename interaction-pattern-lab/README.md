# Interaction Pattern Lab

> 中文名：企业交互模式验证场
> 项目状态：`business-gate-reopened`
> 当前 Gate：因定位和边界重新定义，Business Gate 已重新打开

本项目用于探索、实现和验证企业管理系统中重复出现的页面、操作、展示状态和特殊交互。它是验证场，不是通用模板的权威来源，也不代表真实业务系统。

计划中的核心体验是：左侧按分类选择模式，右侧即时展示交互原型和总结说明。Demo 中的点击和录入只改变当前浏览器会话，不写入业务数据库；模式定义、来源证据和验收结论仍由 Git 中的 Markdown、Schema、模板与案例管理。

## 当前阶段

首个可运行切片已有实现、自动化和本地浏览器证据，这些历史证据继续保留。用户于 2026-08-30 将本目录重新定义为“验证场”，因此原产品化 Demo 的批准不再代表新边界，Business Gate 已按 `REQSRC-007` 重新打开。

## 权威入口

- 项目章程：`.specify/memory/project-charter.md`
- 业务上下文：`.specify/memory/business-context.md`
- 项目宪法：`.specify/memory/constitution.md`
- 原始需求：`.specify/sources/`
- 需求草案：`.specify/requirements/001-product-baseline/`
- 产品总体规划：`docs/product/企业管理系统交互模式工作台总体规划.md`
- 场景台账：`docs/pattern-backlog.md`
- 参考证据台账：`docs/reference-inventory.md`

## 当前允许与禁止

允许：盘点和评审已有实现证据、归档新来源、澄清验证目标、形成新的项目章程和 Business Gate 评审包。

禁止：在 Business Gate 重新批准前扩展实现；禁止把原型或历史 Demo 授权称为新定位下的发布批准；禁止在没有真实证据时宣称模式已验证。
