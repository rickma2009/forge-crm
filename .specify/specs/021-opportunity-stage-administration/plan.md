# 技术计划

复用 017 的 `sd_opp_template`、`sd_opp_stage`；新增管理 API 和左模板右阶段页面，所有修改写审计并使用版本冲突检查。

增量继续由 opportunity 模块唯一写入销售域 sd_opp_stage，租户和应用通过所属模板推导；不新增表/字段或改写历史迁移。UUID 主键、模板内编码唯一、赢率范围、默认唯一与引用 RESTRICT 沿用现有模型/迁移。默认阶段只能通过设置其他阶段为默认而替换；阶段新增/修改/删除使用 Serializable 事务并更新模板版本协调配置变更，引用检查包括全部状态的商机和历史分析，失败回滚审计和默认变更。仅未引用非默认配置允许物理删除；审计保留快照。其他应用只能经有权限的接口访问，禁止直接写表。

API：POST `opportunity-templates/:templateId/stages`、DELETE `opportunity-templates/stages/:stageId`（version 请求体），同现有 PATCH 使用 `opportunity-stage-admin/manage` 与写请求保护；三种写入均返回提交后的模板列表。无数据库迁移；回退代码不会删除已有阶段。集成测试只允许本机 `opp_stage_test_*` 隔离库，验证原迁移补充的默认唯一索引、历史外键和事务回滚。
