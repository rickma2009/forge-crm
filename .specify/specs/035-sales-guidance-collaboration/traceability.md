# 追溯矩阵

BUS-SX-01：销售过程可追溯、可解释，来源REQSRC-096。

| 需求 | 验收 | 用例 | 任务 |
|---|---|---|---|
| REQ-SGC-01 | AC-SGC-01 | TC-SGC-01 | TASK-SGC-01 |
| REQ-SGC-02 | AC-SGC-02 | TC-SGC-02 | TASK-SGC-01 |
| REQ-SGC-03 | AC-SGC-03 | TC-SGC-03 | TASK-SGC-02 |
| REQ-SGC-04 | AC-SGC-04 | TC-SGC-04 | TASK-SGC-02 |
| REQ-SGC-05 | AC-SGC-05 | TC-SGC-05 | TASK-SGC-03 |
| REQ-SGC-06 | AC-SGC-06 | TC-SGC-06 | TASK-SGC-03 |
| REQ-SGC-07 | AC-SGC-07 | TC-SGC-07 | TASK-SGC-03 |
| REQ-SGC-08 | AC-SGC-08 | TC-SGC-08 | TASK-SGC-04 |

实现映射：REQ-SGC-01、REQ-SGC-02对应sales-facts/suggestion和personal-todo服务；REQ-SGC-03、REQ-SGC-04对应record-collaboration/notification及附件适配；REQ-SGC-05、REQ-SGC-06、REQ-SGC-07对应score服务与规则配置；REQ-SGC-08贯穿controller、ActivityAccess及本包迁移。前端分别由SalesGuidancePanel、RecordCollaborationPanel、NotificationPanel和公共组件承担。

验收结果：[testcases](testcases.md)、[review](review.md)、[交付记录](../../../docs/testing/sales-enhancement-p4-p6.md)。
