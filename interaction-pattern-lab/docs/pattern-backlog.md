# 企业交互验证场工作台账

> 状态：validation-lab-releases-active-awaiting-real-project-adoption
> 当前业务基线：`.specify/requirements/002-validation-field-baseline/`
> 用途：分别管理 Lab 验证、方法论资产成熟度和外部项目采用；本文件不直接改变任何 Gate 或成熟度。

## 1. 分类目录覆盖

方法论 08 当前包含 103 个分类项：页面 25、操作 33、展示 16、状态 12、特殊操作 10、组合场景 7。

| 工作 | 当前状态 | 下一证据 | Gate 边界 |
|---|---|---|---|
| 建立 103 项权威资产索引 | verified-in-validation-lab | ID 唯一、六类覆盖、状态与链接检查已自动验证 | 不改变资产成熟度 |
| Lab 展示 103 项资产投影 | verified-in-validation-lab | 搜索、成熟度和 Demo 可用性筛选已有自动测试与浏览器证据 | 不把投影作为规范源 |
| 无 Demo 分类项诚实状态 | verified-in-validation-lab | 说明、证据缺口、下一证据；无假交互入口 | 不等于独立模式验证 |
| 纠正历史 Demo 状态文案 | verified-in-validation-lab | 分别展示 `interaction-verified` / `implementation-verified` / `idea` | 不改变资产实际成熟度 |

分类项被某个 Demo 覆盖只记录 `coveredBy`，不自动改变其 `maturity`。

## 2. Lab 验证切片轨道

| 顺序 | 切片 | 验证问题 | 当前状态 | 允许的下一步 |
|---|---|---|---|---|
| 历史 001 | `001-pattern-catalog-preview` | 两个种子案例能否在统一目录中体验和说明 | historical-implementation-evidence | 保留证据，不扩大旧 Gate |
| P0 | `002-bulk-assignment-partial-success` | 当前页/全查询结果选择、预检查和部分成功能否被准确理解 | review-complete-awaiting-release-gate | 单独取得 Release Gate 决定；后续切片的批准不向前覆盖 |
| 已发布 | `004-database-backed-navigation-rbac` | 数据库菜单、角色授权与认证壳层能否形成可运行验证闭环 | released-in-validation-lab | 收集真实项目采用与运维证据 |
| 已发布 | `005-unified-navigation-toolbar-tab-workspace` | 统一导航、工具栏和页签工作区能否稳定组合 | released-in-validation-lab | 收集独立项目采用决策与回归结果 |
| 已发布 | `006-database-backed-data-dictionary` | 树形字典维护、初始化值和导出能否在真实数据层验证 | released-in-validation-lab | 收集业务角色验收与真实采用证据 |
| 已发布 | `007-role-scoped-list-views` | 角色范围列表视图能否保持权限和展示边界 | released-in-validation-lab | 收集独立项目采用与权限回归证据 |
| 已发布 | `008-customer-directory-demo` | 客户目录页面族能否支撑可解释的业务演示 | released-in-validation-lab | 与真实项目字段和操作边界做差异评估 |
| 已发布 | `009-project-wide-enterprise-typography` | 企业排版规范能否跨页面一致落地 | released-in-validation-lab | 收集第二项目采用与视觉回归证据 |
| 已发布 | `010-master-detail-document-assets` | Schema 表单、可编辑行表、错误汇总和异步结果能否组成技术栈中立主从单据契约 | released-in-validation-lab | 按 `adoption-readiness.md` 进入真实项目采用评估；不得自动晋升 |
| 候选 | 导入—校验—执行 | 异步任务、映射、部分成功和失败下载 | idea | 先形成来源、边界、业务规则和候选卡 |
| 候选 | 提交—审批—生效 | 状态机、意见、代理和审计反馈 | idea | 先取得独立业务规则与来源 |
| 候选 | 规则—模拟—发布 | 冲突、版本、生效范围和回滚 | idea | 先取得独立业务规则与来源 |

切片 002 暂不新增 `EPM-SCENE-008`。它先引用现有 PAGE、ACT、STATE 和 SPECIAL 分类项，验证后再做模式晋升评审。

## 3. 方法论资产成熟度轨道

| 资产 | 当前成熟度 | Lab 可提供 | Lab 不能独自提供 | 下一证据 |
|---|---|---|---|---|
| `EPM-PAGE-001` 企业双层导航壳层 | `interaction-verified` | 交互回归与投影检查 | 第二项目采用、业务验证、发布 | 独立项目采用决策 |
| `EPM-SCENE-001` 记录管理工作区 | `implementation-verified` | 去业务化实现与组件交互证据 | 真实数据详情、销售角色验收、业务验证 | MCRM 或其他真实项目补证据 |
| 批量选择与部分成功候选 | `idea` | 场景契约、切片实现、浏览器证据 | 服务端事务、真实权限、项目采用 | 先取得切片 002 Release Gate；之后仍需单独晋升评审 |
| `EPM-PAGE-013` 主从明细页 | `idea` | `VAL-010` 双场景实现、自动检查、响应式与键盘浏览器证据、Lab Release | 真实项目采用、真实业务规则、服务端事务、权限与业务验收 | 独立真实项目作出采用决定并完成接入回归；见切片 010 `adoption-readiness.md` |
| 其余分类项 | 默认 `idea` | 目录说明和覆盖关系 | 独立模式成熟度 | 来源、候选卡、边界和 AC |

任何晋升必须同步 pattern、template/example、check 和权威索引；仅新增 Demo 不自动晋升。

## 4. 外部项目采用与业务验证轨道

| 项目/依赖 | 涉及资产 | 当前事实 | 所属责任 |
|---|---|---|---|
| MCRM 003 | 企业双层导航壳层 | 有实现/浏览器证据，Specification Gate 待重确认，Release pending | MCRM |
| MCRM 004 | 记录管理工作区 | 有实现证据；真实数据详情和销售角色复核不足，Specification Gate 待重确认 | MCRM |
| MCRM 后续“商机 + 产品明细”切片 | `EPM-PAGE-013` 及切片 010 组件契约 | 业务基线包含商机产品明细，但明确排除订单；尚无采用决定、接入或回归证据 | MCRM；Lab 仅提供采用评估交接包 |
| 第二个独立项目 | 待定 | 尚无证据 | 对应项目 |
| BUS-003 观察任务 | 验证场目录与 Demo | 基线尚未执行 | Rick 组织；不足时保持 `baseline-pending` |

Lab 只链接这些证据，不在本目录完成真实项目 Gate、业务验收或发布。

## 5. 新场景准入条件

每个新场景至少具备：

- 不可改写来源；
- 明确要消除的不确定性；
- 候选卡与适用/不适用边界；
- 目标分类项与覆盖关系；
- 场景契约、验收草案和失败行为；
- 所需 Business、Specification、Architecture Gate；
- Demo、Example 和检查计划；
- 下一成熟度所需证据。

未达到条件时保持 `idea`。切片 002 已获 Business、Specification、Architecture Gate 批准并进入实现；后续新切片仍须分别经过适用 Gate。
