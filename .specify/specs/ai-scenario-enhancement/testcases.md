# 验证与证据

- TC-AE-01 → AC-AE-01：mail-task-policy.spec.ts 邮箱隔离；digital-task.spec.ts 完成/重开/等待；MailAutomationCenter.test.tsx 状态反馈及校验失败保持弹窗。
- TC-AE-02 → AC-AE-02：personal-agent.integration.spec.ts 旧单草稿、多行动部分确认、防重、完成结果、过期版本冲突；PersonalAgentPage.test.tsx逐条保存。
- TC-AE-03 → AC-AE-03：personal-agent.integration.spec.ts 私有知识新旧版、外国账号、停用/过期/非法日期/未核查；AgentKnowledgePanel.test.tsx核查与不可变版本、取消。
- TC-AE-04 → AC-AE-04：personal-agent.integration.spec.ts 知识回复草稿、引用及未知sendMail工具拒绝；scenario-domain.spec.ts协议上限及未知字段。
- TC-AE-05 → AC-AE-05：personal-todo.service.spec.ts多个商机权限缓存隔离；test-agent-scenario-migration.mjs真实 SQL 兼容约束和同租户外键。

执行：server最小5个单测套件；web3个组件套件；scripts/test-agent-integration.mjs临时数据库3个集成套件；scripts/test-agent-scenario-migration.mjs。模型 mock、数据库临时创建后清理，不使用真实邮箱发送/删除回归。类型验证覆盖 contracts/server/web。

不将自动测试作为真实模型效果、SMTP投递或企业净提效的证据。详细结果见 review.md。

- TC-AE-06 → AC-AE-06：BusinessSceneCenter.test.tsx分页默认20、查询回第一页、详情；DigitalEmployeeScenarioPage.test.tsx三个独立入口；浏览器三页各15条。
- TC-AE-07 → AC-AE-07：business-scene-domain.spec.ts URL校验；business-scene.integration.spec.ts API空列表、失效连接引用与切回演示；配置组件取消与保存。
- TC-AE-08 → AC-AE-08：business-scene-domain.spec.ts分/天差异、8D根因和验证、BI排草稿及关闭条件；集成409及持久化；组件失败留窗/成功刷新/下一版本；浏览器采购核对关闭与质量模板。
- TC-AE-09 → AC-AE-09：business-scene.integration.spec.ts菜单动作权限/CSRF/跨场景及应用隔离、重复初始化保留编辑、正式订单库存表无写入；test-business-scene-migration.mjs唯一性、合法场景/版本及同租户外键。
