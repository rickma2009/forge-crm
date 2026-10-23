# 追溯

BUS-NUM-01：集中可配置与并发安全取号（REQSRC-097）。

|需求|验收|测试|任务|
|---|---|---|---|
|REQ-NUM-01|AC-NUM-01|TC-NUM-01|TASK-NUM-01|
|REQ-NUM-02|AC-NUM-02|TC-NUM-02|TASK-NUM-01|
|REQ-NUM-03|AC-NUM-03|TC-NUM-03|TASK-NUM-02|
|REQ-NUM-04|AC-NUM-04|TC-NUM-04|TASK-NUM-02|
|REQ-NUM-05|AC-NUM-05|TC-NUM-05|TASK-NUM-02|
|REQ-NUM-06|AC-NUM-06|TC-NUM-06|TASK-NUM-03|
|REQ-NUM-07|AC-NUM-07|TC-NUM-07|TASK-NUM-04|

实现：NumberingRulesPage→numbering-api→NumberingController/NumberingService；numbering-defaults与initialize-numbering管理12条配置及权限。业务接入CustomerService、EmployeeService、OpportunityService、QuotationService、SalesService、InventoryService。迁移20261004100000_numbering_rules；已按[测试矩阵](testcases.md)验证。[评审](review.md)。
