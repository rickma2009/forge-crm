# 当前系统差异与调整建议

检查日期：2026-09-23。证据类型：本地源码、契约、Prisma 模型与需求文档静态检查；不是报价功能测试或生产状态证明。

## 结论

将报价纳入商机域需求管理，但作为独立单据能力实现；允许不关联商机而直接关联客户。复用现有产品主数据、客户/联系人、字典、认证/RBAC 和工作区，不替换商机商品明细，不复建商品主数据。新增销售定价、报价状态/快照/PDF；接受后的预签金额回写必须是专用、可审计的操作。

| 模块 | 当前实现证据 | 本次处理 |
|---|---|---|
| 产品主数据 | `packages/server/prisma/schema.prisma` 的 MdProduct 映射 md_product；`packages/contracts/src/opportunity.ts` 产品契约含编码、名称、型号、可空单位/产品线，无价格 | 复用 md_product；不照搬原文“无主数据”的背景。产品线当前是文本，应规划受控字典映射与存量兼容；不能直接把存量空值改成全库必填 |
| 产品维护责任 | `packages/server/src/opportunity/opportunity.controller.ts` 的 ProductController；产品方法实际位于 OpportunityService；`packages/web/src/showcase/OpportunityPages.tsx` 产品编码、单位、产品线是输入项 | 当前不是已独立完成的产品服务。价格另设清晰责任模块，产品服务可渐进抽离，避免借报价启动无关大重构。既有产品自动编码计划与手输实现差异单列既有缺口 |
| 价格 | 已检查 contracts、Prisma、opportunity 服务，无独立标准价/阶梯价模型和接口 | 新增销售定价与不可变价格版本；原文“三种价格”修正为实际范围中的标准价、阶梯价，不增加渠道价 |
| 商机金额 | SdOpp.expectedAmount 为预签金额，customerBudget 为客户预算；`opportunity-domain.ts` 明细金额采用 JS number/Math.round | 回写只更新 expectedAmount。正式报价用精确十进制与明确舍入，不直接复用 JS 浮点金额实现，不把预算或明细额强行同步 |
| 商机商品行 | SdOppProduct 数量 Decimal(18,4)，价格/金额 Decimal(18,2)；`OpportunityService.replaceProducts` 删除后重建，并取当前商品名称/型号快照 | 保持原商机行不变；报价采用自己的稳定行 ID、商业快照和状态锁定。不要把商机保存逻辑当成可冻结的报价单逻辑 |
| 商机详情 | 009 基线约定信息/跟进/分析三个页签；OpportunityPages 已有对应工作区 | 推荐新增“报价”关联页签，这是显式需求变更。报价详情在容器独立页签打开，商机侧仅呈现关联清单及入口 |
| 客户和联系人 | 当前模型仍有 crm_customer、crm_customer_contact 等遗留映射；商机服务按客户/联系人/systemCode 校验关联 | 复用责任模块/API和关系校验；提交时保存商业快照。另有前缀治理迁移，不在本次需求整理中改表或假定迁移已完成 |
| 认证与功能权限 | `opportunity.controller.ts` 使用会话、写操作 CSRF 与 assertAction；RBAC 有资源动作授权能力 | 复用底座，但补齐报价/价格资源动作和业务对象范围，隐藏按钮不能替代服务端鉴权 |
| 对象级范围风险 | 所检查 listOpportunities/detail 查询以 application 等条件过滤，业务服务查询未传入 actor 做 owner/org 范围限制 | 关联报价和金额回写前必须验证并补齐本链路对象级策略。此为代码链路风险，不等于断言整个 RBAC 不存在或已证实越权漏洞 |
| 并发风险 | updateOpportunity 先读 version，后 update(where:{id})；版本未同时作为更新条件 | 回写不能复用普通编辑接口。必须条件更新/锁与事务；并发冲突不得覆盖用户后续改动。已有分析操作的条件更新可作为本仓库实现参考，仍需独立测试 |
| 弹窗失败 | `docs/agents/dialog-form-errors.md`、`packages/web/src/showcase/useDialogSubmit.tsx` 有弹窗提交错误归属约定 | 复用局部错误边界：错误在当前弹窗显示、保留输入。整页明细另做表头/行级错误定位，不把所有错误送到底层列表 |
| PDF、过期任务、报价历史 | 当前被检查业务实现无完整报价链路 | 作为新增范围单独设计；模板、字体、冻结字段、时间边界、失败重试均需验收，不能用演示成功替代持久化验证 |

## 可复用交互资产及边界

- `_methodology/templates/ui/master-detail-document/`：主从表头、稳定行、错误定位、保存状态、离开提醒；其状态为候选，不能继承真实权限/事务/审计证明。报价整单保存必须原子成功或失败，不采用模板的“部分成功”作为报价保存语义。
- `_methodology/patterns/record-management-workspace.md`：列表查询、工作区页签和详情身份。文件仅记录 implementation-verified，真实浏览器/业务证据不自动转移到本模块。
- 表头—明细、服务端计价、显式版本回写可跨项目复用；CNY、折扣口径、阶梯边界、商机预签金额、内部代登记接受与 PDF 企业条款属于本项目业务选择，不能直接晋升通用规范。

## 既有状态的处理

009 目录 requirement/delivery-plan 部分旧段落仍标草案，而 REQSRC-060 与 `.specify/specs/018-opportunity-core-workspace/pipeline-state.json` 记录既有商机连续本地实施授权。此处保留历史，不替另一执行任务重写 Gate。新报价增量初稿使用独立待批准状态；后续由 REQSRC-063 单独授权连续实施，而非继承旧授权。当前交付程度见切片 022 代码与 review.md，不称为已 Release。

## 调整优先级

1. Business：接受产品复用、独立报价、商业冻结、单行阶梯、显式覆盖回写与权限责任。
2. Specification：补齐小数边界、草稿/提交校验、复制、状态时间、角色范围、PDF 字段样例。
3. Architecture：确定销售定价版本、报价快照、精确金额、对象授权、CAS/幂等/事务、迁移恢复方案。
4. 实现：按 [分步计划](plan.md) 逐包开展，不通过重建商品/客户或覆盖原商机行来简化实现。
