# 实施边界与数据计划

沿用SDD工作流，验证L3针对权限、写事务和迁移。新增sd_sales_activity（销售域，ActivityService权威）：tenant/application/system、customerId、可选opportunityId、类型、标题/内容/结果/下一步、发生/录入时间、creator/版本/启停、请求ID/hash。客户为legacy systemCode隔离，复合外键customerId/systemCode；应用复合外键applicationId/tenantId/systemCode；商机复合外键opportunityId/tenantId/applicationId。活动关联创建后不可换。所有新FK Restrict。新表/索引只增量迁移，恢复走前滚，保留已有记录。

跟进表增加可空幂等请求字段、标题及下一步元数据和请求索引，旧客户端兼容；创建/修改未来时间校验，作者及版本保护，修订写SysAuditLog。新增销售活动修订亦写SysAuditLog。商机状态变更写同一审计表的专用事件actionCode，不暴露任意系统审计。

读取使用数据库UNION ALL各权威源，各源先授权/作用域过滤，再排序限量；签名游标绑定actor/对象/筛选/页长，发生时间及录入/更新时间不得超过快照上限。更新期间列表需刷新获取新快照，不以缓存绕过授权。

沿用customer.update + write数据策略、opportunity.follow-up；系统事件来源只读。不新造自动管理员授权，不拓展其他菜单权限。附件复用SysAttachment/FileStorage，新增受控owner类型，在全部列表、修改、下载、删除入口重验来源权限。

已知历史空库迁移20260922071848依赖缺失沿P2记录；本轮隔离库采用当前基线并实际执行本次增量SQL，不改写旧迁移。测试库自动清理，现有业务库不写测试活动。
