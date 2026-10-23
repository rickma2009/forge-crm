# RelatedRecordList：只读关联业务列表

用途：对象详情的关联记录Tab；调用公共DeclarativeDataGrid及其分页，不内置销售规则。

输入：label、columns（key/label/render）、rows（含稳定id）、page/pageSize/total、loading/error；事件：onRetry、onPageChange、onPageSizeChange。调用方负责API、权限、过滤条件、请求过期保护和详情导航。分页默认由调用方设20，组件上限100。加载与错误期间不展示上一查询行；空结果与失败分开。

```tsx
<RelatedRecordList label="关联记录" columns={columns} rows={result.items}
  page={page} pageSize={20} total={result.pagination.total}
  loading={loading} error={error} onRetry={reload}
  onPageChange={setPage} onPageSizeChange={setPageSize} />
```

使用现有企业页面主题/table-toolbar，不带新UI框架。业务身份列使用真实链接，由调用方接入现有工作区离开保护；不添加独立查看按钮。只读关联清单不另建个人视图设置，对象主列表继续使用原有个人视图。

客户360例：`showcase/CustomerRelatedPanel.tsx`。切换客户/关联类型时由宿主key重置分页；查询变化清空旧数据并丢弃旧请求。需验证分页、无数据、失败重试、权限撤销和导航。当前只在本项目使用，属于复用候选，不声称已被其他项目采用。
