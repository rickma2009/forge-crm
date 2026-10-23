# AI 任务数据归属与既有命名整改

核对日期：2026-10-03。本记录根据当前 Schema、建表迁移及实际写入代码登记既有事实，不修改数据库，不代表迁移已经完成。

| 现有表 | 数据责任模块 | 当前用途与作用域 | 目标命名 | 状态 |
|---|---|---|---|---|
| `ai_analysis_task` | `AiAnalysisService` | 商机分析任务快照、模型原稿、确认稿、用量；租户/应用/商机/发起人 | `sd_opp_ai_task` | migration-pending |
| `agent_task` | `AgentService` | Agent 执行任务、步骤、结果及确认计划；租户/应用/上下文/发起人 | `sys_agent_task` | migration-pending |

商机 AI 分析当前固定绑定 opportunityId，故归销售域。Agent 任务具有 contextType/contextId/agentCode 的运行机制，目标归平台执行层；当前实际接入仍是商机，不能据此声称其他业务适配器已经完成。`sys_agent_conversation` 等个人 Agent 会话表是另一聚合，不能因名称相似直接合表。

来源：[Schema](../../packages/server/prisma/schema.prisma)、[分析服务](../../packages/server/src/ai/ai-analysis.service.ts)、[Agent 服务](../../packages/server/src/agent/agent.service.ts)、[分析建表迁移](../../packages/server/prisma/migrations/20260925160000_opportunity_ai_analysis/migration.sql)、[Agent 建表迁移](../../packages/server/prisma/migrations/20260929100000_agent_assistant/migration.sql)。其他模块使用服务契约，不增加任务表的独立直写入口；确认后生成的业务分析/跟进记录仍受相应业务权限和状态约束。

## 登记边界

这两项加入 [表登记](../../_methodology/database-table-registry.json) 的具体表例外，不新增 `ai_` 或 `agent_` 为允许前缀。新表不得据此复制旧命名。两张表继续执行字段命名检查；例外必须有维护模块、证据文件、整改目标和待迁移状态。静态检查通过仅表示既有偏差被明确登记，不表示整改、数据库完整性或运行时权限已经验证。

## 后续迁移验收

1. 先检索 ORM 映射、原生 SQL、测试、脚本、外键、索引及部署版本兼容；Agent 队列当前含 `FROM agent_task`，不能仅修改 `@@map`。
2. 新增保留数据的重命名迁移，不编辑已存在的建表迁移。部署窗口需处理旧实例和后台工作者，制定恢复/前滚方案。
3. 在隔离数据库验证迁移前后行数、主键、快照/原稿/确认稿、请求去重键、业务关联不变；验证队列领取、取消、重启恢复和幂等确认。
4. 确认新表名、映射、原生 SQL、迁移和运行证据一致后删除例外，并更新文档与调用方。未执行上述过程前保持 `migration-pending`。

可复用的是“登记责任与偏差、明确整改目标、验证后移除例外”的过程。上述表名和业务域选择是本项目决策，不作为所有 AI 应用的固定表结构。

## 本轮验证

2026-10-03：`node _methodology/scripts/check-database-governance.mjs` 通过。临时目录复制校验输入后分别验证：完整登记通过；维护模块指向缺失文件时拒绝；在 `AiAnalysisTask` 添加无映射的驼峰物理字段时拒绝。临时输入已清理，未改真实 Schema 或数据库。此处为 L2 校验脚本针对性验证，不替代上方迁移验收。

同日补充：上述验证已落为 [持久化回归测试](../../_methodology/scripts/check-database-governance.test.mjs)，并接入工作台验证入口。执行 `node --test _methodology/scripts/check-database-governance.test.mjs`，5 项通过：有效登记、禁用/省略字段检查、缺失责任模块/证据、目标名称格式/长度/前缀、既有 AI 表物理字段检查。每项使用临时目录，结束时清理。本次还修复了新例外可关闭字段检查的漏洞；历史兼容集合不随登记文件自动扩张。
