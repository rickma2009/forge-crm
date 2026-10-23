# 追溯

BUS-WFD-01 ← 20261005-workflow-designer

|需求|验收|测试|任务|
|---|---|---|---|
|REQ-WFD-01|AC-WFD-01|TC-WFD-01|TASK-WFD-03|
|REQ-WFD-02|AC-WFD-01|TC-WFD-01|TASK-WFD-01|
|REQ-WFD-03|AC-WFD-03|TC-WFD-03|TASK-WFD-02,TASK-WFD-03|
|REQ-WFD-04|AC-WFD-02|TC-WFD-02|TASK-WFD-01,TASK-WFD-02|
|REQ-WFD-05|AC-WFD-04|TC-WFD-04|TASK-WFD-02,TASK-WFD-04|
|REQ-WFD-06|AC-WFD-05|TC-WFD-05|TASK-WFD-01,TASK-WFD-02|
|NFR-WFD-01|AC-WFD-06|TC-WFD-06|TASK-WFD-02,TASK-WFD-04|

## 实现证据

- 对象、节点、连线与条件协议：`packages/contracts/src/workflow/index.ts`
- 草稿与发布校验：`packages/server/src/workflow/workflow-definition.ts`
- 目录、CRUD、不可变版本与销售订单接入：`packages/server/src/workflow/sales-workflow.service.ts`
- HTTP 权限边界：`packages/server/src/workflow/sales-workflow.controller.ts`
- Flowable 安全编译：`services/workflow-engine/src/main/java/com/forge/workflow/TemplateCompiler.java`
- 设置列表与设计详情：`packages/web/src/showcase/workflow/WorkflowSettings.tsx`
- 数据迁移：`packages/server/prisma/migrations/20261005180000_workflow_designer/migration.sql`
