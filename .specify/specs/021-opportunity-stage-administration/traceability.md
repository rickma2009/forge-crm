# 追溯矩阵

| 目标 | 需求 | 验收 | 测试 | 任务 |
|---|---|---|---|---|
| `BUS-022` | `REQ-2101` | `AC-2101` | `TC-2101` | `TASK-2102`,`TASK-2103` |
| `BUS-022` | `REQ-2102` | `AC-2102` | `TC-2102` | `TASK-2101`,`TASK-2102`,`TASK-2104` |
| `BUS-022` | `REQ-2103` | `AC-2103`,`AC-2105` | `TC-2103`,`TC-2105` | `TASK-2105`,`TASK-2107` |
| `BUS-022` | `REQ-2104` | `AC-2104`,`AC-2105` | `TC-2104`,`TC-2105` | `TASK-2106`,`TASK-2107` |
| `REQSRC-071` | `REQ-2106` | `AC-2106` | 单表格商机阶段增量验收 | `OpportunityStageAdminPage`,`OpportunityStages.test.tsx` |

增量实现：`packages/contracts/src/opportunity.ts`、`packages/server/src/opportunity/opportunity.controller.ts`、`packages/server/src/opportunity/opportunity.service.ts`、`packages/web/src/showcase/gateway.ts`、`packages/web/src/showcase/OpportunityPages.tsx`。

验证：`packages/web/src/showcase/OpportunityStages.test.tsx`、`packages/server/src/opportunity/opportunity-stage.service.spec.ts`、`packages/contracts/src/opportunity-contracts.spec.ts`、`packages/server/scripts/verify-opportunity-stage-crud.ts`。

增量来源：`REQSRC-071`。页面已移除模板树，模板作为表格头查询字段，默认为“公共”。
