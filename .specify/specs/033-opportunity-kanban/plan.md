# 实施与数据边界

复用 BusinessDirectory 视图/查询，新增受控 KanbanBoard；业务组件负责查询和阶段命令。contracts显式DTO，后端验证过滤和分页。ListView仅商机允许看板配置；系统基线控制卡片字段。

新增 sd_opp_stage_event（销售域，OpportunityService唯一写入），tenant/application/opportunity复合外键，UUID主键，timestamptz时间，记录阶段前后ID/名称、理由、来源、操作者、版本、请求号/内容指纹。复合唯一请求键阻止重放；无删除API、不回填无证据历史。新增索引覆盖看板读取。迁移只新增表/索引/候选键，不重建业务表；恢复使用前滚修复，应用回退保留审计数据。

独立命令锁定商机行后判重并校验version；详情/分析已有乐观锁，事件与原写入共享事务。同阶段不写事件。不修改签约/丢单/库存流程。

L3针对性验证：真实隔离Postgres验证汇总/分页、状态/模板、事务事件、幂等冲突/并发、HTTP权限、视图兼容；组件键盘/确认/加载/冲突；编译与实际页面。避免无关模块全量回归。
