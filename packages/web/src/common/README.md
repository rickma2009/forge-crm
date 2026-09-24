# 公共页面操作接入

- `RowActionButton`：传中文 `label` 与既有按钮 props。组件统一图标、尺寸、提示和可访问名称；调用者负责权限、状态、确认和 API。查看使用真实业务链接，详情弹层可使用链接样式按钮。
- `useTreeNodeMenu`：每棵树一个实例。为各节点构造 `TreeNodeAction[]`，右键调用 `open(event, nodeName, actions)`，右侧渲染 `button(nodeName, actions)`，页面渲染 `menu`。空数组不展示维护入口。按节点自身 ID 绑定回调，不使用右侧选中项代替。CSS 随模块导入，浮层经 Portal 避免裁切。
- `BusinessDirectory`：传对象标识、系统标识、满足 `ListViewGateway` 的适配器、分页加载方法、行标识和列渲染函数。业务提供详情路由、新增和修改权限；组件负责查询、视图选择/设置、总数与分页。登记字段见 contracts 的 `list-view-objects.ts`，后端必须同步验证。新增对象先登记配置能力、默认数据和验收，不能只添加前端选项。
- `route-tabs/`：路由页签纯模型、状态 hook 与显示组件；详细接入与状态语义见该目录 README。

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
