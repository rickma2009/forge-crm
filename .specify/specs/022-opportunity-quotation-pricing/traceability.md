# 实施追溯

BUS-QUO-001：可追溯地制定销售价格、形成客户报价并显式辅助商机金额维护。REQ-QUO-001—012 为 FR-QUO-001—012 的本切片追溯别名，不新增业务范围。

| 需求 | 验收 / 测试设计 | 任务 | 实现与验证入口 |
|---|---|---|---|
| REQ-QUO-001 / FR-QUO-001 | AC-QUO-001 / TC-QUO-001 | TASK-022-01 | pricing.service.ts；quotation.integration.spec.ts |
| REQ-QUO-002 / FR-QUO-002 | AC-QUO-002 / TC-QUO-002 | TASK-022-01 | contracts quotation.ts；quotation.test.ts |
| REQ-QUO-003 / FR-QUO-003 | AC-QUO-003 / TC-QUO-003 | TASK-022-01 | PricingEditor；QuotationPages.test.tsx |
| REQ-QUO-004 / FR-QUO-004 | AC-QUO-004 / TC-QUO-004 | TASK-022-02 | QuotationDirectory；列表提交筛选测试 |
| REQ-QUO-005 / FR-QUO-005 | AC-QUO-005 / TC-QUO-005 | TASK-022-02 | quotation.service.ts；真实数据库整单保存与快照测试 |
| REQ-QUO-006 / FR-QUO-006 | AC-QUO-006 / TC-QUO-006 | TASK-022-02/03 | QuotationDetail；稳定行、手工价与离页测试 |
| REQ-QUO-007 / FR-QUO-007 | AC-QUO-007 / TC-QUO-007 | TASK-022-03 | quotation-domain.ts；提交冻结、反馈、过期 API 测试 |
| REQ-QUO-008 / FR-QUO-008 | AC-QUO-008 / TC-QUO-008 | TASK-022-03 | 复制新 ID、源单关联、并发 CAS 集成测试 |
| REQ-QUO-009 / FR-QUO-009 | AC-QUO-009 / TC-QUO-009 | TASK-022-04 | quotation-pdf.ts/spec.ts；浏览器下载及七页 PDF 检查 |
| REQ-QUO-010 / FR-QUO-010 | AC-QUO-010 / TC-QUO-010 | TASK-022-05 | OpportunityPages 关联入口；CustomerDetailPage.test.tsx 验证客户详情不提供报价入口；来源 customer-detail-remove-quotation/source.md |
| REQ-QUO-011 / FR-QUO-011 | AC-QUO-011 / TC-QUO-011 | TASK-022-05 | opportunity-amount.service.ts；金额来源、双版本、重放不覆盖、大金额回归 |
| REQ-QUO-012 / FR-QUO-012 | AC-QUO-012 / TC-QUO-012 | TASK-022-06 | controller RBAC；403、租户 FK、局部错误、浏览器 QA |

测试入口不是每条业务验收已获人工签署的证明；实际运行结果与已知限制见 review.md。源码根为 packages/server/src/quotation、packages/web/src/showcase、packages/contracts/src；测试脚本为 scripts/quotation-browser-qa.mjs。

REQSRC-066 对 `REQ-QUO-002/003` 的有效期增量追溯到切片 023 的 `REQ-2304/2305 → AC-2303/2304 → TC-2304/2305/2306`。旧实现证据仅覆盖按最新版本取价的历史基线，不能替代新增验收。

查询/弹窗增量：REQSRC-QUO-UI-001 → REQ-QUO-004/006 → AC-QUO-004/006 → TC-QUO-013、TC-QUO-014 → TASK-022-07。实现为 QuotationPages、QuotationLineDialog、quotation.css；说明见 query-line-dialog-increment.md。

来源 REQSRC-QUO-CREATE-20260924，新建与详情重设计：

| 需求 | 验收 / 测试设计 | 任务 | 实现与验证入口 |
|---|---|---|---|
| REQ-QUO-013 | AC-QUO-013 / TC-QUO-015 | TASK-022-08 | packages/server/src/quotation/quotation.service.ts；packages/web/src/showcase/QuotationCreateDialog.tsx；packages/web/src/showcase/QuotationPages.tsx；creation-redesign-review.md |
| REQ-QUO-014 | AC-QUO-014 / TC-QUO-016 | TASK-022-08 | packages/server/src/quotation/quotation.service.ts；packages/web/src/showcase/QuotationCreateDialog.tsx；packages/web/src/showcase/QuotationPages.tsx；creation-redesign-review.md |
| REQ-QUO-015 | AC-QUO-015 / TC-QUO-017 | TASK-022-08 | packages/server/src/quotation/quotation.service.ts；packages/web/src/showcase/QuotationCreateDialog.tsx；packages/web/src/showcase/QuotationPages.tsx；creation-redesign-review.md |
| REQ-QUO-016 | AC-QUO-016 / TC-QUO-018 | TASK-022-08 | packages/server/src/quotation/quotation.service.ts；packages/web/src/showcase/QuotationCreateDialog.tsx；packages/web/src/showcase/QuotationPages.tsx；creation-redesign-review.md |
| NFR-QUO-013 | AC-QUO-014 / TC-QUO-016 / TC-QUO-017 | TASK-022-08 | packages/server/src/quotation/quotation-create.spec.ts；packages/server/src/quotation/quotation.integration.spec.ts |

跨切片有效定价验证 TC-2306 见 023-product-workspace（保留其原 Gate，不以本次创建测试替代）。

## 全局整改追溯

UIAUDIT-20260923 → REQ-STYLE-01/04/09 → 本切片当前有效约定 → 全局页面样式 testcases.md / audit.md；具体公共实现及本切片接入位置由 audit.md 登记。

| 需求 | 验收与测试 | 任务 | 实现 |
|---|---|---|---|
| REQ-QUO-017 | AC-QUO-017 / TC-QUO-019 | TASK-022-09 | OpportunityPages.tsx / QuotationCreateDialog.tsx / quotation.service.ts；opportunity-entry-review.md |
| REQ-QUO-018 | AC-QUO-018 / TC-QUO-020 | TASK-022-09 | OpportunityPages.tsx / QuotationCreateDialog.tsx / quotation.service.ts；opportunity-entry-review.md |
| REQ-QUO-019 | AC-QUO-019 / TC-QUO-021 | TASK-022-09 | OpportunityPages.tsx / QuotationCreateDialog.tsx / quotation.service.ts；opportunity-entry-review.md |
| REQ-QUO-020 | AC-QUO-020 / TC-QUO-022 | TASK-022-09 | OpportunityPages.tsx / QuotationCreateDialog.tsx / quotation.service.ts；opportunity-entry-review.md |

### 2026-09-24 报价方式与稳定性（REQSRC-QUO-RADIO-20260924）

REQ-QUO-021 → AC-QUO-021 → TC-QUO-023 → TASK-022-10 → QuotationCreateDialog.tsx、quotation.css、quotation-create-browser-qa.mjs。

### UIRULE-20260924-detail-workspace 当前有效详情样式

REQ-DETAIL-001 / AC-DETAIL-001 / TC-DETAIL-001：遵循总样式 UI-DETAIL-01，替代旧独立摘要卡片/record-tabs/内部卡片组合。使用公共头部（返回+标题、带标签摘要）、客户式下划线Tab及平铺正文；无Tab不强加。适用客户、商机、报价，保留权限、离开保护和数据操作。验收返回目标、Tab箭头/Home/End、手机布局、表格滚动和无内部卡片边框。实现对应 DetailWorkspace.tsx、三个详情页及组件/浏览器回归。Specification按用户明确呈现变更更新并授权本地实施；不涉及数据库和Architecture变更，Release状态不变。

### 商机最新报价入口（REQSRC-QUO-LATEST-20260924）

REQ-QUO-022 / AC-QUO-022 / TC-QUO-024 / TASK-022-11：删除商机详情的报价单Tab及内嵌列表，替代此前“保留报价Tab入口”的约定。保留商机信息、跟进记录、商机分析记录三个Tab。顶部新增报价单继续保留，不因已有报价而隐藏或禁止；原创建权限、停用和未保存校验不变。已有可查看报价时，在新增旁显示“报价单详情”，无报价不显示，无查看权限不查询/显示。按createdAt倒序、相同时id正序确定最后新增的可见报价，不按updatedAt，不限制只能有一单。初次打开、返回商机或窗口恢复焦点刷新，点击详情时重新查询避免陈旧指向；失败提示并允许重试，不等同无报价。复用列表API sortBy=createdAt、pageSize=1，默认列表排序仍为updatedAt。无表结构变化。

验收：存在/不存在、查看/创建权限独立、已有报价仍可新增、无报价Tab、点击前出现新报价时打开最新、服务端先排序后取1条并保留租户/用户/商机过滤。Specification按用户本次指令更新并授权本地实施，Architecture沿用现有API作用域，不涉及迁移，Release不变。

### REQSRC-QUO-NO-LINE-20260924 当前有效规则

REQ-QUO-001 / AC-QUO-001 更新：产品与产品线字典不构成报价引用约束。前端手工选产品、后端商机导入/草稿保存/提交统一仅检查产品存在、租户范围、PRODUCT类型和ACTIVE状态；不查产品线字典、不要求单位/产品线非空。原有效价格、数量、金额及权限规则保留。旧报价行product_line物理列为非空文本，新增行缺失产品线时用空字符串表示未提供，既有快照保留，不创建字典值、不建立外键、不修改主数据，无DDL。

TC-QUO-025 / TASK-022-12：覆盖空/未知/停用产品线均允许、停用或越界产品仍拒绝、无字典查询、商机整单导入与空快照落库数据、前端无产品线产品手工添加。替代此前“有效产品线才能报价”的要求。Specification因明确业务校验变更更新并授权本地实施，Architecture沿用现有表，无迁移，Release不变。
