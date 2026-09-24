# TreeWorkspace 接入
适用：左树右详情/操作工作区，遵循 UI-TREE-WORKSPACE-01。

```tsx
<TreeWorkspace title="组织"
  nodes={items.map(i => ({ id: i.id, parentId: i.parentId, label: i.unitName, searchText: i.unitCode }))}
  selectedId={selectedId} onSelect={selectWithUnsavedGuard} onRefresh={reload}
  onCreate={canManage ? createRoot : undefined} createLabel="新建组织"
  actions={node => allowedActionsFor(node.id)}>
  <OrganizationDetails id={selectedId} />
</TreeWorkspace>
```

nodes按调用方顺序展示，id唯一；不存在的父节点按根节点处理。搜索保留祖先路径。菜单参数使用TreeNodeAction（key/label/run/danger/disabled）；移动/排序由业务回调提供，可通过rowProps挂接已有拖放。可选loading、searchLabel、selectLabel、collapseLabel、expandLabel、tools。组件不访问后端，不更改业务数据，不覆盖权限校验。

不要在节点label塞入图标或内置等状态；这些内容放右侧。不能为不支持的操作提供假按钮。只读分类树省略onCreate/actions。桌面左侧默认320px，可调280–440px；窄屏上下排列。授权勾选矩阵和主导航不使用本组件。

验收：组件测试、调用页面已有测试、浏览器五页面桌面/窄屏检查。规范在 `_methodology/style-index.md`，本文件是接入说明而非另一套样式来源。
