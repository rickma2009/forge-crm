# 验收用例与证据

2026-10-04，以下均已通过。测试实现：`packages/server/src/sales-guidance/sales-enhancement.integration.spec.ts`、`sales-facts.spec.ts`、`packages/web/src/showcase/SalesInteraction.test.tsx`；浏览器：`scripts/check-sales-enhancement-browser.mjs`。

| 用例 | 验收 | 具体覆盖 |
|---|---|---|
| TC-SGC-01 | AC-SGC-01 | 上海自然日7/8/14/15日边界，备注排除，客户可见来源，关闭商机 |
| TC-SGC-02 | AC-SGC-02 | 并发采纳唯一待办/事件，过期版本，冷却/暂缓，消失再出现，后台刷新，必填结果与撤权工作台 |
| TC-SGC-03 | AC-SGC-03 | 草稿发布幂等，一层同对象回复，作者修订，撤回占位，21条稳定分页，附件草稿上传/发布冻结/过期清理 |
| TC-SGC-04 | AC-SGC-04 | 同范围提及，编辑不重复通知，强制outbox失败回滚，未读和本人已读，撤权隐藏，隐藏页轮询暂停 |
| TC-SGC-05 | AC-SGC-05 | 满分四项、精确小数临界值、未知币别/来源、原型属性键输入 |
| TC-SGC-06 | AC-SGC-06 | 发布不可变/单一有效版本，输入hash幂等，关闭冻结，失败保留旧分，规则编辑弹窗 |
| TC-SGC-07 | AC-SGC-07 | 并发覆盖、重新读取依据、防过期覆盖、恢复/到期审计，页面82分覆盖 |
| TC-SGC-08 | AC-SGC-08 | 租户/应用/对象约束，动作权限与CSRF，专用初始化不覆盖原授权，无嵌套form与脚本执行，真实页面流程 |

计数、命令、增量迁移验证方式和历史空库限制以[交付记录](../../../docs/testing/sales-enhancement-p4-p6.md)为准；不将其描述为全仓库或生产验收。
