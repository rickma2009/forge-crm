# 技术计划

TASK-WFE-01 独立容器化服务与持久化协议。
TASK-WFE-02 受限编译器、定义图、命令与作用域校验。
TASK-WFE-03 Nest客户端、测试、运维文档及证据。

数据层：独立workflow PostgreSQL库，Flowable官方ACT表为第三方命名例外。自有 sys_wf_command、sys_wf_definition、sys_wf_instance、sys_wf_audit 仅Java工作流服务写。tenant_id/application_id UUID组合隔离；业务库不跨库FK，门面验证真实组织用户与业务单据。实例引用同scope的不可变定义。无硬删除API。账本、审计与引擎推进同一本地事务，按scope串行锁和request UUID防重。命令请求摘要SHA256不存服务令牌。

迁移：应用SQL初始化使用CREATE IF NOT EXISTS；当前仅首次开发库，正式升级需独立版本迁移。Flowable开发schema-update开启；生产部署未授权，不直接用于生产升级。恢复：停止接入保留持久卷、备份独立数据库；不自动删库、不自动切换真实单据。引擎基础不创建CRM业务表。数据库测试覆盖实际Flowable与账本事务，直接使用独立临时PostgreSQL验证，不模拟引擎或依赖H2兼容模式。

安全：开发token文件忽略、权限600；服务只监听127.0.0.1映射。内网仍需生产TLS/mTLS。门面才有服务令牌，浏览器不可直连；人员合法性及转交职责在P2.2门面解析，基础服务再次校验当前承办人与scope。
