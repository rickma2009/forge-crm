# 公共页面操作接入

- `RowActionButton`：传中文 `label` 与既有按钮 props。组件统一图标、尺寸、提示和可访问名称；开始、暂停、暂挂、回复、完成、备注、关注、忽略、恢复、重开、分派、观察、关闭事件、标记无关和标记误报等动作使用全局语义映射。业务页面不得自行用齿轮或同一图标表示不同动作；新增动作先在组件、测试及 `_methodology/style-index.md` 的 `UI-ACTION-ICON-01` 登记。关注态传 `aria-pressed`，并放在操作列。调用者负责权限、状态、确认和 API。查看使用真实业务链接，详情弹层可使用链接样式按钮。
- `useTreeNodeMenu`：每棵树一个实例。为各节点构造 `TreeNodeAction[]`，右键调用 `open(event, nodeName, actions)`，右侧渲染 `button(nodeName, actions)`，页面渲染 `menu`。空数组不展示维护入口。按节点自身 ID 绑定回调，不使用右侧选中项代替。CSS 随模块导入，浮层经 Portal 避免裁切。
- `BusinessDirectory`：传对象标识、系统标识、满足 `ListViewGateway` 的适配器、分页加载方法、行标识和列渲染函数。业务提供详情路由、新增和修改权限；组件负责查询、视图选择/设置、总数与分页。登记字段见 contracts 的 `list-view-objects.ts`，后端必须同步验证。新增对象先登记配置能力、默认数据和验收，不能只添加前端选项。
- `route-tabs/`：路由页签纯模型、状态 hook 与显示组件；详细接入与状态语义见该目录 README。
- `ProductPickerDialog`：通用物料产品选择弹窗。调用方提供分页查询函数，并通过 `mode="single"` 或 `mode="multiple"` 选择单选/多选模式。组件统一负责查询、分页、跨页选中、取消与确认；具体单据负责取价、默认数量和写入业务明细，避免把报价规则固化进公共组件。
- `SalesActionDialog`：通用新增、编辑和确认操作弹窗。取消、右上角关闭和 Escape 在非保存中状态直接关闭并丢弃本次输入，不弹出“未保存内容”二次确认；保存进行中禁用关闭，删除、发布、发送等产生业务副作用的动作仍按各自规则确认。
- `RecordQueryBar`：列表查询栏。默认布局适应窄屏换行；业务明确要求单行时传 `layout="singleRow"`，字段区横向滚动而查询按钮保持可见。单个较宽字段可设置 `--record-query-field-width`，不在业务页面重写栏、字段组与按钮组布局。

通用方法不存放业务权限判断，视图服务仍需会话、动作授权、用户和应用作用域。个人视图保存到服务端，不以 localStorage 冒充持久化。新项目复用交互组件与服务契约时，需要替换对象字段、授权适配器、数据库初始化及详情路由，不能复制 CRM 业务数据。当前依赖 React、ReactDOM、Tabler Icons、现有 contracts 和 CSS；不引入新组件框架。

跨项目验收：编码详情链接、无查看图标、权限不扩大、无默认失败关闭、个人配置恢复、树双入口/键盘、页签固定项/未保存保护。项目全局规则见 `_methodology/style-index.md`，本文件是实现接入说明，不是第二套样式规范。

## DetailWorkspace（UI-DETAIL-01）

列表详情使用一个 DetailWorkspace，内部放 DetailHeader（title、fields、backLabel、onBack、actions）。有页签时放 DetailTabs 和 DetailPanel，二者使用同一个对象id和active；分区用 DetailSection，勿再嵌套 enterprise-card。fields只传授权可见字段。onBack调用原路由与未保存保护。DetailTabs自动处理左右/Home/End、roving tabIndex及ARIA关联。

```tsx
<DetailWorkspace>
  <DetailHeader title="报价单号" backLabel="返回报价列表" onBack={backToList}
    fields={[{ label: '客户名称', value: customerName }]} />
  <DetailSection title="报价产品明细">{lines}</DetailSection>
</DetailWorkspace>
```

已采用页面：客户、商机、报价；源证据与适用边界见总样式索引。此组件不处理数据读写、授权或业务状态。

## 列表视图组合控件（UI-VIEW-CONTROL-01）

“当前视图 / 下拉框 / 设置”统一调用 `ListViewSelector`，不得逐页复制。三段使用border-box，桌面外框高度/最小高度/最大高度均32px，边框1px，首尾圆角5px，中段无圆角；触控统一44px，不能只有一段增高。控件需覆盖全局输入框34px最小高度，禁止只设置height却遗漏min-height。三段上下边缘一致，加载/禁用/选中/聚焦时不改变尺寸；焦点轮廓允许超出但不能裁切。窄屏组合整体可换行，内部不拆行，select可收缩；记录数和刷新在组合外。

组件参数：value、options[{value,label}]、onChange、onSettings、disabled、settingsDisabled、emptyLabel、ariaLabel。页面负责对象、权限、数据查询与保存；组件不扩大权限，无可用视图时禁用选择和设置。客户列表及所有BusinessDirectory业务列表统一接入。员工/场景等仅计数刷新工具栏不强加视图功能。

验收：三段getBoundingClientRect的y/height相同；客户和通用业务列表桌面与窄屏一致；选择回调、设置权限、加载/空态不回归。与UI-BUTTON-01、UI-LIST-VIEW-01共同执行。

- `data-grid/BusinessDataGrid`：基于 MIT 许可的 AG Grid Community 36.2 公共业务网格，客户与物料产品已接入。业务传字段定义、字典选项、显示值/详情渲染、分页结果、受控视图配置、行标识、查询/导出和个人视图保存适配器。网格统一提供表头拖动、列宽、可见性、对齐、左右固定、独立列筛选、排序、自定义每页条数及 Excel/CSV 导出。字段有 `required` 时不允许隐藏详情入口。
- 网格请求适配器须将 `columnFilters`（JSON 字段→值）、`orderBy`、`order`、`page`、`pageSize` 发到服务端。服务端使用字段白名单、类型校验、租户/系统范围和数据权限，先筛选排序再分页；禁止只筛选或排序当前页。`loadAllGridRows` 按同一查询条件和稳定排序收集全部分页，失败不下载残缺文件。导出使用列定义的 `value`，不会导出按钮、隐藏列或原始未脱敏数据。
- 布局变更即时应用，保存并使用个人视图后通过现有视图接口持久化；重新进入默认恢复个人引用视图。未来页面优先复用此网格，业务字段及权限不得写进组件。所有表格类列表、详情明细、选择弹窗、授权矩阵及模板示例均接入此引擎；`BusinessDirectory` 保留对象查询/视图协议，其表格区域调用 `DeclarativeDataGrid` → `BusinessDataGrid`。

- 公共网格高级交互默认关闭：`showColumnSettings`、`enableColumnFilters`、`enableColumnSorting`、`enableExport` 默认false。常规页面不显示独立列设置/清除筛选/导出工具、不显示表头筛选和排序箭头，表头40px；仅具体需求明确时逐项开启。原列表视图设置入口保留。关闭列筛选时页面查询适配器不提交历史columnFilters，避免不可见条件影响结果。

- 公共网格单行文本数据行高统一32px，文字、图标和控件上下居中；多行或复杂内容按需增高，不按单行规则强制裁切。当前约定以总样式索引 `UI-BUSINESS-GRID-01` 为准。

- `data-grid/DeclarativeDataGrid` 是同一公共网格的声明式迁移适配器，解释已有表头/行/单元格声明，不在DOM生成原生table。保留数据、权限、勾选、编辑、行事件、汇总和外部分页；不会执行任意子组件或重复分页服务端结果。空态可使用 `GridEmpty`。新页面优先直接传 typed `GridColumn<T>` 与rows给 `BusinessDataGrid`。小型明细自适应高度，单行32px，多行/校验提示按内容增高；已有分页以页面原查询协议为准，禁止伪造总数或仅对当前API页再分页。
- `pnpm validate:data-grids` 用TypeScript语法树检查生产TSX，禁止独立原生table；已并入项目validate。迁移清单见 `docs/design/shared-data-grid-adoption.md`。

- 声明式列表可传`pagination={page,pageSize,total,loading,maxPageSize,onPageChange,onPageSizeChange}`接入同一公共分页栏；数据必须是服务端当前页，不能在适配器里再次切片。未传pagination的已有明细/外部分页保持原行为。员工与用户列表默认20条，接口上限100条，查询/重置/每页条数变更回到第一页，跨页序号连续。`BusinessDataGrid.maxPageSize`可限定具体接口上限，默认200。


## Agent小助手与右侧抽屉

`DrawerWorkspace`统一右侧抽屉标题、滚动内容、固定页脚、Escape、焦点约束与关闭后焦点恢复；调用方提供未保存关闭保护。`agent/AgentAssistantDrawer`通过注入`AgentGateway`使用公共任务交互，业务路由和读写留在适配器。首个案例为商机详情；权限、工具、结果校验和保存方式见[Agent接入说明](../../../../docs/ai/agent-assistant.md)。模板关联TPL-08-04/08-05、TPL-05-03。后续对象注册自己的只读工具与上下文，复用执行引擎和抽屉，不复制商机业务规则。
