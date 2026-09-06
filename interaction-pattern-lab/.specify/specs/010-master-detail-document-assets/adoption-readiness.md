# 切片 010 真实项目采用评估交接包

> 状态：`draft-ready-for-target-project-evaluation`  
> 当前证据：`REQSRC-035` 仅批准在 `interaction-pattern-lab` 内发布  
> 本文件不构成 MCRM Specification/Architecture/Release Gate，不构成资产晋升或外部部署批准。

## 1. 交接结论

切片 010 已具备进入独立真实项目“采用评估”的条件，但尚不具备 `project-adopted` 证据。首选评估对象是 MCRM 后续“商机 + 产品明细”纵向切片，而不是销售订单：MCRM 当前业务基线包含商机产品明细，同时明确排除订单、报价和合同。

在 MCRM 的详细需求和对应 Gate 完成前，只允许阅读、比较和形成项目级采用建议；不得复制实现、修改 MCRM 代码或把候选资产状态从 `idea` 晋升。

## 2. 可以评估复用的内容

| 层级 | 可评估资产 | 保留的不变量 | 必须由目标项目决定 |
|---|---|---|---|
| 行为契约 | `SchemaForm` | 字段受控、必填/格式错误可观察、错误摘要可定位 | 商机字段、可编辑条件、角色权限 |
| 行为契约 | `EditableLineGrid` | 稳定行标识、显式新增/删除、行级错误、键盘路径 | 产品明细字段、数量金额规则、删除语义 |
| 反馈契约 | `ValidationSummary` | 聚合错误不替代字段内错误；可回到首个错误 | 错误优先级、业务提示文本 |
| 反馈契约 | `AsyncOutcome` | 保存中、成功、失败和可恢复路径显式可见 | API 错误分类、重试、幂等和权限失败 |
| 页面组合 | `MasterDetailDocument` | 表头与明细一致保存；脏状态和保存边界明确 | 商机状态机、服务端事务、并发策略 |
| 质量契约 | `acceptance-checklist.md`、`state-matrix.md` | 空态、错误态、窄屏、键盘和恢复路径均需验证 | 真实数据规模、性能阈值与业务验收人 |

## 3. 明确不能直接复用

- 销售订单编号、客户、币种、价格、税、交期等演示字段；
- BOM 三层六行的确定性样例及其规模假设；
- 纯内存保存、失败模拟和 Demo Adapter；
- Lab 的路由、视觉品牌、假数据、角色假设和文案；
- 对后端事务、并发、权限、审计、生产性能或异常恢复的任何推断；
- `gf_scm` 或其他参考项目的组织专属规则与遗留实现。

## 4. MCRM 适配前置条件

目标项目至少需要先补齐并批准：

1. 商机和产品明细的详细字段、必填性、默认值与计算口径；
2. 明细新增、编辑、删除、排序和保存后的持久化语义；
3. 商机阶段/结果变化与产品明细编辑之间的限制；
4. 销售、销售经理、总监的查看与编辑权限；
5. 金额精度、数量正整数、并发冲突、重复提交和失败恢复；
6. 明细规模、窄屏策略、键盘操作和可访问性验收边界；
7. 目标切片的 Specification Gate；如引入新数据模型、API、事务或组件边界，再完成 Architecture Gate。

MCRM 当前 003、004 仍处在 Specification Gate 重新确认状态，不应以切片 010 的 Lab Release 绕过这些项目级门禁。

## 5. 推荐采用路径

1. 在 MCRM `.specify/sources/` 归档新的详细需求，不改写既有来源；
2. 做增量需求转换、冲突分析和影响评估；若改变业务范围则重新打开 Business Gate；
3. 新建或明确“商机 + 产品明细”纵向切片，在 Spec 中逐项记录 `adopt / adapt / reject`；
4. 用本交接包和方法论模板作为证据输入，不把 Lab 实现当成目标项目规范；
5. Specification Gate 后再设计技术接入，Architecture Gate 后才允许实现；
6. 执行目标项目单元、集成、权限、真实数据和浏览器回归；
7. 形成采用记录：采用了什么、排除了什么、版本点、回归结果和已知限制；
8. 只有上述证据齐全，才可另行评审 `EPM-PAGE-013` 是否晋升为 `project-adopted`；业务角色验收再单独支持 `business-validated`。

## 6. 采用证据最小清单

- [ ] 目标项目和切片可定位；
- [ ] 项目级采用决定已批准；
- [ ] `adopt / adapt / reject` 差异表完整；
- [ ] 业务字段、权限、事务和失败行为已批准；
- [ ] 接入提交或版本点可定位；
- [ ] 单元、集成、权限和浏览器回归结果真实可查；
- [ ] 适用/不适用边界和遗留风险已记录；
- [ ] 业务验收与资产晋升分别决定，未相互替代。

## 7. 当前允许与禁止

当前允许：在 MCRM 或另一个独立项目中创建需求来源、影响评估和 Specification Gate 草案。  
当前禁止：修改 MCRM 实现、宣称 MCRM 已采用、晋升 `EPM-PAGE-013`、发布独立包、外部部署或宣称业务验证完成。

## 8. 证据定位

- 方法论成熟度规则：`_methodology/09-资产类型、成熟度与晋升规范.md`；
- 候选模板：`_methodology/templates/ui/master-detail-document/`；
- 资产登记：`_methodology/patterns/index.json` 中 `EPM-PAGE-013` / `EVID-VAL-010-MASTER-DETAIL`；
- Lab 实施与 QA：`implementation-evidence.md`；
- Lab Release 决定：`release-gate-review.md` / `REQSRC-035`；
- MCRM 业务边界：`mcrm/.specify/memory/business-context.md`；
- MCRM 当前 Gate：`mcrm/.specify/project-state.json`。
