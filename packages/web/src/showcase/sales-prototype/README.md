# 销售管理交互原型

此目录独立承载销售订单与销售出货原型。页面使用现有 `DocumentWorkspace`、`DetailSection`、`RecordQueryBar`、`ListViewSelector`、`DeclarativeDataGrid` 和 `RowActionButton`；菜单由 `seed-data.ts` 登记，运行中环境可用 `packages/server/scripts/init-sales-prototype.ts` 增量安装。

入口：`/#/showcase/sales-orders`、`/#/showcase/sales-outbounds`、`/#/showcase/sales-returns`。销售退回当前只有菜单与说明页。

销售订单与销售出货列表共用公共网格分页栏，默认每页 20 条，可设置每页条数并跳转首页、上一页、下一页和末页。分页基于本原型当前会话中的全部演示记录；查询、重置及视图切换会回到第一页，序号跨页连续。

从销售订单列表点击“新增销售订单”会打开工作区页签 `/#/showcase/sales-orders/new`，不使用弹窗。订单来源使用单选圆点，默认“按客户新建”，也可选择“引入商机”或“引入报价单”；下方列表分别按客户名称、商机名称、客户或报价说明查询，表格单选一条记录后点击“确定”。此时才生成草稿，并进入可编辑的订单详情。

订单可选择按客户新建、进行中商机或已接受且有效的报价来源。演示来源与客户/产品均为虚构样例；来源字段创建后只读。草稿可编辑，提交、撤回/驳回和审核会更新当前会话中的状态。出货只能从已审核且有剩余量的订单创建；演示按仓库、批次校验数量，并支持审核后模拟冲销。

数据保存在浏览器 `sessionStorage` 的 `forge-crm:sales-prototype:v1` 键中，关闭会话即失效；不调用销售订单、库存过账或退货后端接口。后续正式开发应替换本目录的 `model.ts` 数据源及模拟命令，并在服务端重新实施审核、批次库存与幂等校验。
