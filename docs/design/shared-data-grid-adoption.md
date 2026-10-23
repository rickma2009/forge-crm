# 全系统公共网格接入清单

公共引擎：`packages/web/src/common/data-grid/BusinessDataGrid.tsx`；按需加载入口为`LazyBusinessDataGrid`。当前默认单行32px、表头40px；高级工具、列筛选、排序入口默认关闭。保留现有顶部业务查询、视图选择和分页。多行说明、校验提示等复杂单元格按内容增高。当前规则见[UI-BUSINESS-GRID-01](../../_methodology/style-index.md)，下方迁移时的验证记录保留历史口径。

本次逐项检查21个源文件的39处独立表格声明，并接入同一引擎。加上已接入的客户与物料产品页面，以及公共适配器自身，源码检查登记22个消费文件、42个绑定点（不是42个独立菜单）。

|范围|源文件|接入内容|
|---|---|---|
|通用业务目录|common/BusinessDirectory.tsx|产品、商机、报价、竞争对象及固定关联范围的列表|
|基础及库存|InventoryPages.tsx|法人、仓库、入库单列表、库存余额；物料产品原已接入|
|人员及参数|EmployeeDirectoryPage.tsx、SystemParametersPage.tsx|员工及参数设置|
|客户明细|CustomerDetailPage.tsx|联系人、地址|
|入库单|InboundOrderDetailPage.tsx|只读/编辑明细、增删行、数量和金额|
|产品附件|AttachmentPanel.tsx|附件说明、版本及授权操作|
|商机|OpportunityPages.tsx|商品、跟进、阶段配置|
|报价|QuotationPages.tsx、QuotationCreateDialog.tsx|阶梯价、报价明细、来源商品预览|
|字典|EnterprisePages.tsx|字典值、导入预览；客户网格原已接入|
|产品选择|common/ProductPickerDialog.tsx|单选/多选、跨页勾选、分页|
|用户和授权|AccessAdminPages.tsx|账号、角色、成员、权限目录及授权选择|
|角色管理|RoleUserPanel.tsx、RoleSubjects.tsx、RoleViews.tsx、RolePolicyPanel.tsx|成员批量维护、动态绑定、来源成员、视图授权、字段权限、发布历史|
|资源菜单|ResourceMenuPage.tsx|子页面、工具/行按钮、页签、菜单挂载|
|展示与模板|ShowcaseApp.tsx、demos/record-workspace/RecordWorkspaceDemo.tsx|资源演示、记录查询与详情|
|可编辑模板|ui-assets/components/editable-line-grid/EditableLineGrid.tsx|选择、Enter进入、Tab移动、Escape取消、复制、删行、撤销、错误定位、汇总；销售订单和BOM模板共用|

## 接入方式与边界

新页面使用类型化`GridColumn<T>`和数据/查询适配器直接绑定BusinessDataGrid。已有复杂页面可使用DeclarativeDataGrid声明式适配：解释原表头/行/单元格声明，DOM始终由BusinessDataGrid生成，不执行任意子组件、不自行获取数据。旧原生表格事件和业务权限保持在页面；网格只统一展示和布局。空态使用内联空行声明或GridEmpty。

已有分页仍是权威来源：服务端分页不得由浏览器对当前结果再次分页，固定关联范围不得被视图覆盖。未实现服务端列筛选/排序的页面不启用这些高级功能。勾选/行内编辑不因更换容器而扩大操作权限。

树、导航菜单、交互模板缩略图画廊、时间线和AI工作区属于不同交互模式，保留原组件。

## 验证与防回退

`pnpm validate:data-grids`使用TypeScript语法树扫描生产TSX中的独立原生table，检查失败时应改为公共网格；已加入项目validate。没有原生table仅证明接入覆盖，交互仍需回归测试。

重点覆盖：受控输入连续更新、表头全选、跨页选择、个人视图、加载→空态、记录删除即时移除、行事件、键盘与焦点、撤销、明细版本提交、金额计算及权限只读入口。浏览器补充菜单入口、网格尺寸及运行错误检查。

### 迁移时验证结果（历史记录）

- 全前端58个测试文件、282项测试通过；最终操作列布局补充27项编辑回归、长文本补充7项回归通过。
- 前端typecheck、全前端lint、项目validate及生产构建通过；构建仍有既有大分块体积提示，网格与Excel按需加载。
- 迁移时浏览器完整导航检查18个业务/管理菜单，确认实际记录渲染、默认高级工具隐藏、无原生table及无相关运行错误；当时单行记录实测34px，参数的多行使用说明按内容增高。此结果不代表当前32px规则的浏览器验收。
- 浏览器临时挂载纯本地销售订单演示，验证数量输入与Tab提交、300px文字操作列；不调用业务写入接口。
- 生产源码检查：22个消费文件、42个绑定点，独立原生table为0。
