# 客户详情工作区：现状与增量影响评估

日期：2026-09-21。初始状态：设计建议。后续用户已通过 REQSRC-042 确认方案并要求修改代码；当前实现与验证记录见 `.specify/specs/008-customer-directory-demo/customer-detail-increment.md`。以下保留为实施前评估，不代表现行代码仍有这些缺口。本次原文：REQSRC-041（SHA-256 见其 metadata.json）。

## 用户明确要求

当前根工程建设 CRM，supply 仅为只读参考。新增客户保留主信息弹窗；详情、修改在容器页签打开。详情上方显示客户编码、简称、负责人，下方依次为客户基本信息、联系人、地址。联系人和地址属于客户的一对多子记录，支持新增、修改。联系人字段按原文完整保留，所属客户 ID 从当前客户关联，不让用户手工选择另一客户。

## 已有实现与缺口（静态代码证据）

- `packages/web/src/showcase/EnterprisePages.tsx`：新增和修改仍共用 CustomerEditor 弹窗；查看已经导航至动态详情 URL。
- `packages/web/src/showcase/ShowcaseApp.tsx`：有动态详情匹配和渲染，但容器页签新增依赖静态 localPage，尚未将每个客户登记为独立页签。findNodeByPath 按完整路径匹配，动态客户路径取不到客户菜单，详情传入的 allowedActions 因而为空；后端 authorization.service.ts 已将客户详情映射到客户列表权限。需修复前端菜单能力继承，不能通过强制授予 update 修复。
- `EnterprisePages.tsx` 的 BasicInfoTab：字段绑定值但没有 onChange、表单草稿或保存流程，不能视为可用编辑功能。
- 同文件 ContactsTab：目前为卡片网格，不是本次要求的行列表格。AddressesTab 已是表格。
- `packages/server/src/customer/customer.controller.ts`、`packages/contracts/src/index.ts` 和 `packages/server/prisma/schema.prisma`：已有联系人/地址的关系、契约和新增修改接口。存在实现不等于已有完整批准和验收；不重复建表，也不默认全部正确。
- 现有切片 008 的规格只明确客户主记录，不能把旧的主记录验收自动称作联系人、地址已验收。

## supply 参考证据与保留/排除

只读根：`/Users/malanjun/projects/supply`，本次没有复制、修改或回写其文件。

| 来源（相对 supply 根） | 明确事实 | 候选保留 | 排除/风险 |
|---|---|---|---|
| `packages/scs-web/src/pages/opportunities/customers/[id]/index.tsx` | 紧凑对象头部，简称、编码、负责人等摘要；内部 Tabs；联系人另有维护入口 | 对象头部与页签内容分层；编辑与浏览清晰区分 | 合作信息、日志、OMS 转正式客户不是本次范围；其联系人卡片不替代用户要求的表格 |
| 同目录 `detail.less` | 纵向 flex 容器，固定摘要头部，内容区滚动，局部命名空间 | 紧凑留白、内容区滚动、避免全局样式污染 | 不直接复制 Ant Design/LESS 依赖或整个样式体系 |
| 同目录 `CustomerRecordsPanel.tsx` | 地址用途、所在地区、完整地址列；开票资料独立管理 | 地址用途与地区/详细地址的分组语言 | OMS 同步状态、税号、银行账号不是普通地址字段 |
| `packages/scs-server/src/modules/customer/dto/customer-record.dto.ts` | 地址输入为 addressTypes（多用途）、areaCode、fullAddress、version；发票另有 DTO | 地址归属、用途、区域、详细地址、并发版本概念 | CRM 现有 addressType 为单值、省市区为独立字段；多用途和地区码体系不能静默照搬 |
| `packages/scs-server/prisma/schema.prisma:1047` 的 CustCustomerAddress | customerId、addressTypes、areaCode、areaName、fullAddress、version 及创建/更新时间；另含 syncStatus、omsRecordId、legacyStep、lastSyncError、syncedAt | 客户归属、地址表达与版本控制 | 不复制 gongfu schema、OMS 状态、遗留唯一键或级联删除规则 |

复用等级：交互与字段语义候选，未做代码级迁移，未做浏览器对照验收，未晋升通用资产。已有 `_methodology/patterns/record-management-workspace.md` 可作为候选，但该模式里的独立新增页不覆盖本次“新增弹窗”的明确要求。

## 推荐增量（待确认，不是已批准事实）

1. 新增继续用弹窗，成功后刷新列表并打开新客户详情，便于继续补充子记录。
2. 容器按“系统 + 客户 ID”唯一识别详情；同一客户查看/修改复用一个页签，不同客户可并行打开。标题用“客户 · 简称”，悬浮补充编码，避免同简称混淆。
3. 查看进入只读模式；修改进入同一详情的编辑模式。上方是对象摘要与编辑/保存/取消，下方是三个业务页签，不把客户编辑再放进弹窗。
4. 基本信息保存独立提交；联系人和地址表格的新增/修改推荐用局部弹窗逐条提交，不开启整页主从大事务，也不引入行内批量编辑。每条保存后刷新对应数据和数量。
5. 联系人表格显示姓名、部门、职位、决策角色、手机、电话、邮件、状态、备注和行操作；客户 ID 为只读关联，不作为需要重复录入的业务字段。决策角色、状态的选项口径需在增量规格中明确，不能因当前代码写死就视为业务决策。
6. 地址先复用现有 CRM 字段：所属客户、类型（开票/收货/办公，保留既有合同类型兼容）、收件人、联系电话、省/市/区县、详细地址、是否默认、状态、备注。暂不引入 supply 的多用途地址和地区码依赖；不等同于建立完整发票资料模块。“是否默认”唯一性范围需在增量规格中明确，不新增隐式规则。
7. 保留客户列表的查询、分页和视图状态；编辑未保存时切换内部页签保留草稿，离开/关闭/切换客户时提示丢弃或继续编辑。不得静默丢失输入或自动提交。
8. 沿用服务端 RBAC、CSRF、systemCode/客户归属检查与 version 冲突保护；只读角色不获得写权限，保存失败保留输入并显示原因。

## 验证方向与推进边界

后续验证：新增仍是弹窗；查看/修改同客户不重复开页签；多客户切换与列表返回；基本信息保存取消；联系人/地址增改重查；越权及跨客户写入拒绝；版本冲突与失败保留；未保存关闭；长表格和窄屏；路由刷新及客户不存在。

本次仅归档、只读参考和影响评估，没有修改产品代码、运行迁移、测试新功能、改变旧 Gate 记录或宣称 Release。按 sdd-forge-workflow 与 brainstorming，在本次增量设计确认后补齐客户切片规格/验收；旧 REQSRC-023 授权针对原范围，不将其扩大解释为 supply 地址语义和本次未呈现设计的批准。若需要改变数据模型/接口或安全策略，单独进入 Architecture Gate；不在这次参考过程中默认执行。

可复用思想：外层管理记录工作页，内层组织当前记录的信息；主记录快速创建，子记录在已保存主记录下独立维护。不可直接复用：supply 的组织级字典、OMS/开票业务规则、组件依赖和地区编码体系。
