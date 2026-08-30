# 记录管理工作区模式

> 状态：validated-once  
> 首次验证项目：MCRM / 004-customer-record-workspace  
> 来源：`reference-cases/gf-scm-customer-record-workspace-distillation.md`

## 适用场景

适用于桌面企业系统中具有“查询记录—新增记录—浏览详情”主链路的主数据和业务单据模块。不适用于只有单个表单、移动端优先、强流程向导或需要同时编辑复杂关系图的页面。

## 页面骨架

```text
Workspace Tabs
└── Active Page
    ├── List：Page Header → Query Panel → Command Bar → Table → Pagination
    ├── Create：Object Header → Grouped Form → Sticky Actions
    └── Detail：Object Header → Metadata → Grouped Descriptions
```

## 不变量

1. URL 是页面身份来源；列表、新增和每个详情可形成独立页签。
2. 工作台页签不可关闭；关闭当前业务页签回到相邻页签或工作台。
3. 查询控件必须对应真实服务端查询能力；未接通条件不得伪装可用。
4. 查询、重置、刷新、新增与行操作集中在明确的命令区。
5. 新增和详情使用同一信息分组与字段语言，字段来自目标项目 Spec。
6. 新增、编辑、删除等按钮按能力显示，但服务端仍独立授权。
7. 加载、空数据、无权/不存在、校验失败、保存失败都有页面内状态。
8. 模板不绑定具体表格库、数据连接器、动态 IAM 或页面缓存方案。

## 基线密度

| 对象 | 基线 |
|---|---:|
| 工作区页签 | 38px 高、13px 字号、激活底边 2px |
| 页面标题 | 19px / 650 |
| 分区标题 | 13.5px / 650 |
| 表头 | 36px、12px / 600 |
| 表格行 | 36px、12px |
| 面板 | 白底、1px 边框、8px 圆角 |

## 验收清单

- 列表页查询、重置和 API/URL 一致；
- 表格列满足验收且详情入口可键盘访问；
- 创建权限与服务端权限一致，负责人等系统字段只读；
- 保存成功进入详情，失败保留表单并显示原因；
- 详情显示目标 Spec 全部字段，越权与不存在使用统一提示；
- 页签可打开、切换、关闭和从 URL 恢复；
- 小屏不破坏表单和命令栏，表格允许水平滚动；
- 没有引入参考项目的业务字段和平台依赖。

完整起点见 `templates/ui/record-management-workspace/`，交互案例见 `examples/003-golden-interaction-record-management-workspace/`。
