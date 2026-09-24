# 企业管理页面与交互候选研究（2026-09-05）

> 状态：研究与原型候选。不是规范源，不代表方法论晋升或真实项目采用。

## 来源与可萃取能力

| 来源 | 技术/定位 | 建议萃取 | 不直接复用 |
|---|---|---|---|
| [Ant Design ProComponents](https://github.com/ant-design/pro-components) | React / TypeScript 企业组件 | 可编辑表格、查询表格、表单联动、字段配置的组件契约 | 不默认绑定 Umi、Ant Design 主题或组件 API |
| [React-admin](https://github.com/marmelab/react-admin) | React / TypeScript 管理系统框架 | 列表、批量操作、内联编辑、数据提供器和权限边界 | Enterprise 组件与商业授权需单独核对；不复制资源模型 |
| [Refine](https://github.com/refinedev/refine) | React / TypeScript 无头 CRUD 框架 | 路由、数据、访问控制与 UI 解耦的工程组织 | 不把框架钩子变成模板规范 |
| [TanStack Table](https://github.com/TanStack/table) | TypeScript 无头表格引擎 | 排序、选择、列固定、虚拟化等状态模型 | 它不提供完整视觉与业务交互，需自行定义可访问性和样式 |
| [AG Grid Tree Data](https://www.ag-grid.com/javascript-data-grid/tree-data/) | 企业级数据网格 | BOM 树表、分组列、固定列、大数据量与键盘导航 | 许可、包体和高级能力成本必须在项目级 ADR 评估 |
| [ERPNext](https://github.com/frappe/erpnext) | Python / JavaScript 开源 ERP | 销售订单行、BOM、生产计划、交期与库存之间的业务证据 | 不复制 Frappe 文档模型、组织字段或 ERPNext 工作流 |
| [SAP Fiori 表格指南](https://experience.sap.com/fiori-design-web/table-overview/) | 企业 UX 规范 | 响应式表格与桌面网格的选型边界、对象页与表格组合 | 不把 SAP 控件命名和产品约束作为通用实现要求 |
| [SAP Fiori Tree Table](https://experience.sap.com/fiori-design-web/tree-table/) | 层级数据交互规范 | BOM 树表的展开、列对齐、紧凑密度与层级扫描 | 不用树表替代关系图、工艺路线或网络依赖图 |

## 首批候选资产拆分

1. 页面模板：`Document Header + Editable Line Grid + Sticky Actions`。
2. 交互模式：新增空白行并聚焦第一个业务键；产品选择后回填规格、单位、BOM 与价格候选。
3. 交互模式：空白草稿行直接移除；已存在行删除后提供时限撤销；有下游单据时禁止删除并解释原因。
4. 交互模式：行级校验贴近单元格，不用整页弹窗承载可定位错误。
5. 组件：行项目命令栏、可编辑网格行、产品搜索选择器、合计栏、撤销 Toast。
6. BOM 页面模板：树表适合“层级 + 多属性横向比较”；关系图适合“依赖路径与影响分析”；两者不应强行合并成一种组件。

## 仍需业务确认

- 销售订单允许的状态、修改窗口、审批与反审批规则。
- 价格、税额、折扣、币种换算和舍入的口径。
- 删除行对预留、采购、生产、发运和发票的真实影响。
- BOM 版本选择、替代料、虚拟件、损耗率、生效日期和不展开节点规则。
- 行数规模与性能目标，以决定普通表格、虚拟化网格或服务端分段加载。

## 当前结论

本次选择的方案 1 适合作为高频录单候选：它把常用字段保留在表格内，减少行间切换成本。适用前提是行字段数量可控、用户熟悉键盘录入、复杂行属性可通过抽屉或详情展开承载。当前仅完成验证场原型，不能替代正式销售订单的详细需求和 Gate。
