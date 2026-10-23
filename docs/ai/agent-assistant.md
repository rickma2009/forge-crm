# Agent小助手：开发范围与接入

第一期入口为商机详情“Agent小助手”，右侧抽屉带入当前对象。任务类型：分析跟进、生成沟通计划。公共引擎控制模型→工具→模型循环，商机适配器限定只读当前商机资料；不联网、不执行任意SQL/脚本、不跨对象检索。业务文本视为数据，不能改变工具授权。

复用AI_PROVIDER/AI_BASE_URL/AI_AUTH_TOKEN配置；Agent可用AGENT_AI_MODEL单独指定模型，未设置时沿用AI_MODEL。Anthropic兼容网关需实测tools/tool_use/tool_result支持，不能根据普通AI分析成功推定支持。兼容网关额外返回的thinking块不会展示或写入会话。未配置模型展示明确状态；mock只用于测试，结果显著标注。真实模型故障不自动降级到mock。

新agent_task保存独立任务、输入快照、调用步骤、模型用量、原稿和确认稿。关闭抽屉仅停止前端轮询，后台任务继续；重新打开读取本人最近任务。取消为协作式取消：不继续后续工具，正在发送的模型请求可能已发生用量，其迟到结果不会写入。任务有步数、输入长度、超时和每日次数限制。

权限沿用当前商机view/ai-analyze；保存还需follow-up。工具执行和保存再次检查权限/用户状态，每个任务限定系统、商机和发起人。工具仅接受空参数，当前上下文由服务器注入，不允许模型指定其他对象。后续新增Agent须注册独立业务适配器、工具和结果校验，不复制公共运行机制。

确认沟通计划时检查快照是否过期；用户编辑工作事项、计划及日期后保存为明确标记“待执行”的商机跟进记录，保留Agent原稿和确认内容。幂等保存同一任务最多一个记录，不改商机阶段/金额/把握度。未保存编辑离开提示；生成草稿在后台保留。

先执行公共契约构建、prisma generate与本地db:migrate:deploy，再启动后端。迁移仅新增agent_task，不重置数据。独立数据库测试使用mock，不向真实模型发送资料。运行入口与截图完成后登记智能交互TPL-08-04/08-05（执行/过程）及TPL-05-03（抽屉查看）关联案例。

验证命令：`pnpm --filter @forge-crm/server exec jest --runInBand agent-runtime.spec.ts agent-provider.spec.ts`、`node scripts/test-agent-integration.mjs`、`pnpm --filter @forge-crm/web exec vitest run src/common/agent/AgentAssistantDrawer.test.tsx src/showcase/OpportunityPages.test.tsx`。集成测试创建并销毁随机`sdd_agent_*`数据库，不改现有业务数据；覆盖任务去重、工具循环、恢复、运行中取消、过期快照、并发幂等保存、CSRF及权限撤销。

2026-09-29：真实商机详情入口与初始抽屉截图已浏览验证；TPL-08-04及TPL-05-03为可预览，TPL-08-05登记应用与流程但尚无独立过程截图。配置网关已用非业务合成ping资料验证tools→tool_use→tool_result→end_turn。业务流程用隔离数据库mock验证，未向真实模型发送CRM资料，也未自动保存任何现场沟通计划。

## 场景增强规划（2026-10-09）

后续商机抽屉可增强文字会议纪要和多行动草稿，并与个人工作台共用来源和确认规则；不扩大为通用跨系统执行器。知识/采购/质量/指标工具只在独立数据与授权条件就绪后接入。待实施计划见[场景增强 Plan](../../.specify/specs/ai-scenario-enhancement/plan.md)，当前运行范围不因规划改变。
