# P1 追溯

来源REQSRC-093 → [规格](spec.md) → [验证记录](../../../docs/testing/customer-360-p1.md)。

| 验收 | 实现 | 验证 |
|---|---|---|
| AC01 | SalesService精确customerId、出货order关系过滤 | customer-related.integration.spec.ts真实数据库 |
| AC02 | CustomerRelatedService客户范围+源view校验、最小DTO | 服务9项+集成权限/范围拒绝 |
| AC03 | CustomerRelatedPanel请求key和清理、RelatedRecordList分页 | 面板测试4项+浏览器翻页 |
| AC04 | QuotationService.list(code, actor, query) | 集成本人与系统角色报价范围 |
| AC05 | ShowcaseApp既有导航/离开保护 | 工作区5项、详情8项、浏览器跳转 |

所有测试范围与限制以验证记录为准。无表迁移，无库存过账改动，未生产部署。
