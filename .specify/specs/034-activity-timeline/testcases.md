# 验收用例

| 用例 | 验证内容 | 证据 |
|---|---|---|
| TC-TL-01 | 同一商机跟进在客户/商机使用同一来源键、长文本及原结果不丢失 | activity.integration、opportunity-detail-contract |
| TC-TL-02 | 同时间稳定分页、后补录隔离、游标签名及筛选绑定、失效清空缓存 | activity.integration、ActivityPanel |
| TC-TL-03 | 五类活动、时间不能未来、作者关联不可伪造、并发重复提交幂等 | activity.integration、ActivityPanel、浏览器 |
| TC-TL-04 | 作者修订/作废、理由、版本冲突、审计、系统事件只读 | activity.integration、ActivityPanel |
| TC-TL-05 | 生命周期变更同事务留痕、真实阶段及金额源读取 | activity.integration、浏览器 |
| TC-TL-06 | 未登录拒绝、撤权不可读写、客户过滤无权限商机、作用域FK | activity.integration |
| TC-TL-07 | 附件上传下载、撤权阻断、10个上限、作废禁写、产品兼容 | activity.integration、file-storage |
| TC-TL-08 | 详情Tab、未保存保护、旧请求不覆盖新对象、移动端展示 | ActivityPanel、CustomerDetailPage、CustomerWorkspace、浏览器 |

实际命令、数量及限制以[交付记录](../../../docs/testing/activity-timeline-p3.md)为准。

验收映射：AC-TL-01 → TC-TL-01、TC-TL-02、TC-TL-08；AC-TL-02 → TC-TL-03；AC-TL-03 → TC-TL-04；AC-TL-04 → TC-TL-05；AC-TL-05 → TC-TL-06；AC-TL-06 → TC-TL-07。
