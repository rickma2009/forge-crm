# 计划

TASK-SWF-01 CRM持久定义/申请/命令投递/通知与迁移。
TASK-SWF-02 人员解析、权限、可靠投递、销售适配器。
TASK-SWF-03 前端接入、隔离数据库/真实引擎及浏览器验证。

sys_wf_config、sys_wf_approval、sys_wf_delivery、sys_wf_notice为CRM审批模块所有；与独立引擎库sys_wf_*不同。UUID、tenant/application限定；申请引用订单复合scope外键，定义版本不变。订单活跃申请部分唯一，收件effectId唯一。命令请求键应用+actor+request唯一；领取租约避免并发投递，HTTP不占CRM事务；重试保持原始命令。订单审核动作由sales/workflow业务适配器唯一写入。

现有组织权威表只读；职责配置为发布配置的一部分，部门和人员有效性服务端检查。迁移只加表/索引，默认无启用流程，原业务不自动切换；回滚停新配置保留运行实例及账本，不删除审批数据。正式启用由配置发布触发；无负责人不初始化虚假配置。独立测试数据库验证，不批量修改历史销售订单。
