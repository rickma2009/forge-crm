# 公共表格分页配置

分页由页面开发时固定配置，用户界面没有“分页 / 不分页”选择框，不进入个人视图设置。默认分页。

```tsx
<BusinessDataGrid {...props} /> // 默认分页
<BusinessDataGrid {...props} paginationMode="all" loadAllRows={loadAll} /> // 固定不分页
<DeclarativeDataGrid paginationMode="all" pagination={{ ...paging, loadAllRows: loadAllRowElements }}>{children}</DeclarativeDataGrid>
```

`paginationMode?: 'paged' | 'all'` 默认 `paged`，不分页隐藏整个分页栏，展示全部查询结果，保留网格滚动和行操作。此参数是页面配置，不是用户偏好；不改写持久化视图协议。

`loadAllRows?: () => Promise<T[]>` 负责按当前授权、查询、排序获取完整数据；未提供时使用既有 `exportAll` 全量查询能力，不生成导出文件。已持有全部本地记录时直接使用当前rows。服务端全量查询可用 `loadAllGridRows`，不突破接口pageSize上限。组件校验总数与主键唯一；失败显示错误并可重试，不展示不完整结果。

声明式适配器通过 `pagination.loadAllRows?: () => Promise<ReactNode>` 返回全部 `<tr>` 节点，每行须有稳定key，保留原有操作。自动序号在不分页时从1开始。没有完整数据加载能力的页面保持默认分页。

`showPagination={false}` 保留旧有隐藏分页栏/外部分页的兼容行为，不表示组件已自动取得全部数据；新增不分页页面使用 `paginationMode="all"` 明确行为。原有显式无分页明细不自动改变。

2026-10-22用户澄清取代此前的运行时切换设计；仅修改公共配置/呈现，不改后端权限或数据库。
