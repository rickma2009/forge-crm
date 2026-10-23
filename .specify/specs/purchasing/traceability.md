# 追溯
|需求|验收|用例|任务|
|---|---|---|---|
|REQ-PC-01|AC-PC-01|TC-PC-01|TASK-PC-01/TASK-PC-02/TASK-PC-04|
|REQ-PC-02/REQ-PC-03|AC-PC-02|TC-PC-02|TASK-PC-02/TASK-PC-03|
|REQ-PC-04|AC-PC-03|TC-PC-03|TASK-PC-02/TASK-PC-04|
|REQ-PC-05/NFR-PC-01|AC-PC-04|TC-PC-04|TASK-PC-01/TASK-PC-02/TASK-PC-04|
|REQ-PC-01/REQ-PC-02/REQ-PC-04|AC-PC-05|TC-PC-05|TASK-PC-03/TASK-PC-04|

## 实现与证据

- REQ-PC-01：contracts/purchasing.ts、purchasing.service/controller、prisma/schema及迁移、apply-purchasing.ts、PurchasingPage；TC-PC-01由服务/HTTP集成测试及重复初始化状态摘要证明。
- REQ-PC-02/03：pricePurchase、saveOrder/command、单据工作区；TC-PC-02由领域金额、审核分离、版本保护与UI草稿测试证明。
- REQ-PC-04：saveReceipt/command、PurchasePostingService、来源选择/拆批；TC-PC-03由批次、尾差、超收、请求幂等与浏览器实测证明。
- REQ-PC-05/NFR-PC-01：事务服务、库存责任模块、作用域复合外键/CHECK、控制器Guard；TC-PC-04由并发、冲销回滚、边界及HTTP权限测试证明。
- AC-PC-05：共享BusinessDirectory/DocumentWorkspace、注册表/菜单/对象视图、演示与只读核对脚本；TC-PC-05由UI/HTTP测试、注册表检查与数据库核对证明。

最终结果、命令与截图集中于[交付记录](../../../docs/testing/purchasing-management.md)；[评审](review.md)记录自主验收及未包含范围。
