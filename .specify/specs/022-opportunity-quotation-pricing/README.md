# 切片 022：商机报价与销售定价

> 2026-09-23：REQSRC-066 将取价规则从“最新版本”改为“报价日期内唯一有效版本”，并补充币别和生效/失效日期。既有本地验证证据仅证明旧基线；定价相关 Specification 已由切片 023 重新打开，未完成迁移前不得宣称新规则已实现。

状态：本地实现与测试完成，等待独立 Release 评审；没有外部部署或资产晋升。

REQSRC-062 提供详细需求；REQSRC-063 授权按推荐完成需求拆解、Plan、开发与测试，不是逐份人工审阅记录。

- [规格](spec.md) / [测试设计](testcases.md) / [计划](plan.md) / [任务](tasks.md)
- [验证与限制](review.md) / [追溯](traceability.md) / [使用与数据治理](operations.md)
- [业务需求](../../requirements/009-opportunity-management/quotation-and-pricing/requirement.md)

页面入口：`/#/showcase/quotations`。现有客户与商机详情也可进入关联报价。

最新页面调整：[两条件查询与明细新增/编辑弹窗](query-line-dialog-increment.md)，来源 REQSRC-QUO-UI-001，覆盖旧列表多条件展示和明细行内编辑设计，不改变数据库与计价规则。
