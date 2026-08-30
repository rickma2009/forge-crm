# Interaction Pattern Lab

> 中文名：企业管理系统交互模式工作台  
> 项目状态：`release-approved-hosting-pending`  
> 当前 Gate：Business、Specification、Architecture、Release Gate `approved`

本项目用于把企业管理系统中重复出现的页面、操作、展示状态和特殊交互整理成可浏览、可点击、可评审的 Demo 工作台。

计划中的核心体验是：左侧按分类选择模式，右侧即时展示交互原型和总结说明。Demo 中的点击和录入只改变当前浏览器会话，不写入业务数据库；模式定义、来源证据和验收结论仍由 Git 中的 Markdown、Schema、模板与案例管理。

## 当前阶段

用户已于 2026-08-30 依次批准默认 MVP、首个纵向切片规格、前端架构和静态 Demo 发布。第一个可运行闭环已通过项目验证与实现评审；当前可本地预览，外部私有托管等待可用连接器。

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

允许：评审实现与证据、提交 Release Gate，或归档新来源并为下一切片补详细需求。

禁止：扩展到在线编辑、后端、生产接口、外部发布，或在没有真实证据时宣称新增模式/发布已经验证。
