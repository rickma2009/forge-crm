# 架构与数据计划

L3，围绕新增权限、事务和迁移做真实隔离数据库及前端/浏览器验证，不因工具存在运行全项目测试。代码层分sales-guidance、record-collaboration、personal-todo、notification；通过服务适配复用现有ActivityAccess、SysAttachment和SysPersonalTodo。

新增sd_sales_suggestion（sales-guidance唯一写）、sd_score_rule_set、sd_opp_score、sd_score_override、sd_record_comment/sd_comment_revision/sd_comment_mention（collaboration唯一写）、sys_event_outbox及sys_notification（notification唯一写）。UUID主键，tenant/application/systemCode作用域，时间timestamptz，评分整数、金额阈值字符串定点解析。对象显式customerId/opportunityId恰一非空，生成subjectKey用于同对象唯一/父子FK，不作为外键替代。应用与用户、商机、客户复合FK均Restrict；评论根FK同对象，服务限制一级回复。JSON只存版本化规则与证据，不代替主业务字段。

建议按用户+对象+规则+触发cycle唯一；待办sourceSuggestionId唯一，引用建议同作用域。用户行锁序列化采纳/评论重试，商机行锁序列化覆盖；规则应用行锁发布。评论版本修订、提及与投递事件同事务，outbox唯一事件键，通知outboxId唯一。草稿24小时有效，作废/撤回不硬删正式历史。

评分按规则+商机+输入hash唯一，历史保留；人工覆盖独立表，partial unique保证一个有效覆盖，过期或主动恢复修改状态并留审计。后台逐页扫描开放商机，读时重算保障详情时效；计算失败不修改旧结果。周期含应用当天以支持自然日衰减。

权限使用现有菜单动作新增suggestion-view/adopt、comment-view/create/edit-own/moderate、score-view/override/rule-manage。代码权威权限元数据可同步，角色人工授权不覆盖；仅系统管理员按既有完整授权策略首次获得新权限。候选成员经本人访问权限逐个过滤，数量分页限制；通知正文按请求时源权限生成，存储只引用。

兼容新增可空商机currencyCode及待办sourceSuggestionId/result/version，旧接口不能绕过建议待办的结果/来源校验。新迁移只增量，不改已应用迁移；失败前滚，必要回滚先备份，禁止清空业务库。隔离库验证FK/唯一/幂等/并发/撤权/过期、重复权限初始化与数据保留；已知旧空库链问题继续记录。

公共组件候选：SuggestionPanel、RecordCommentPanel、ScoreBreakdown；API/权限由业务适配负责。来源/验收/样式同步交付文档，不晋升跨项目标准。
