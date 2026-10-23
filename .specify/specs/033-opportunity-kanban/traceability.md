# 追溯矩阵

业务目标 BUS-SX-01：受控、可追溯的销售阶段管理。上位需求 REQ-SX-02；实施来源 REQSRC-094。

| 需求 | 验收 | 测试 | 实现任务 |
|---|---|---|---|
| REQ-KB-01 | AC-KB-01 | TC-KB-01 | TASK-KB-01，board接口、模板选择 |
| REQ-KB-02 | AC-KB-02 | TC-KB-02 | TASK-KB-01，groupBy精确汇总、按列ID分页 |
| REQ-KB-03 | AC-KB-03 | TC-KB-04、TC-KB-07 | TASK-KB-02，KanbanBoard、StageDialog及权限 |
| REQ-KB-04 | AC-KB-04 | TC-KB-03、TC-KB-05 | TASK-KB-01，共享阶段校验/事件、数据库事务 |
| REQ-KB-05 | AC-KB-05 | TC-KB-06 | TASK-KB-02，ListViewConfig及BusinessDirectory扩展 |
| REQ-SX-02 | AC-KB-01—05 | 上述全部 | TASK-KB-03，针对性验证及交付 |

证据见 docs/testing/opportunity-kanban-p2.md；测试文件 opportunity-kanban.integration.spec.ts、OpportunityKanban.test.tsx、BusinessDirectory.test.tsx。不得把组件单测替代真实数据库和浏览器验证。
