# 企业交互验证场工作台账

> 状态：review-complete-awaiting-release-gate
> 当前业务基线：`.specify/requirements/002-validation-field-baseline/`
> 用途：分别管理 Lab 验证、方法论资产成熟度和外部项目采用；本文件不直接改变任何 Gate 或成熟度。

## 1. 分类目录覆盖

方法论 08 当前包含 103 个分类项：页面 25、操作 33、展示 16、状态 12、特殊操作 10、组合场景 7。

| 工作 | 当前状态 | 下一证据 | Gate 边界 |
|---|---|---|---|
| 建立 103 项权威资产索引 | implemented-awaiting-review | ID 唯一、六类覆盖、状态与链接检查已自动验证 | 不改变资产成熟度 |
| Lab 展示 103 项资产投影 | implemented-awaiting-review | 搜索、成熟度和 Demo 可用性筛选已由组件测试覆盖 | 不把投影作为规范源 |
| 无 Demo 分类项诚实状态 | implemented-awaiting-review | 说明、证据缺口、下一证据；无假交互入口 | 与目录切片一同验收 |
| 纠正历史 Demo 状态文案 | implemented-awaiting-review | 分别展示 `interaction-verified` / `implementation-verified` | 不改变资产实际成熟度 |

分类项被某个 Demo 覆盖只记录 `coveredBy`，不自动改变其 `maturity`。

## 2. Lab 验证切片轨道

| 顺序 | 切片 | 验证问题 | 当前状态 | 允许的下一步 |
|---|---|---|---|---|
| 历史 001 | `001-pattern-catalog-preview` | 两个种子案例能否在统一目录中体验和说明 | historical-implementation-evidence | 保留证据，不扩大旧 Gate |
| P0 | `002-bulk-assignment-partial-success` | 当前页/全查询结果选择、预检查和部分成功能否被准确理解 | review-complete-awaiting-release-gate | 用户评审本地证据并形成 Release Gate 决定 |
| P1 | 导入—校验—执行 | 异步任务、映射、部分成功和失败下载 | idea | 完成 002 后再形成候选卡 |
| P2 | 提交—审批—生效 | 状态机、意见、代理和审计反馈 | idea | 独立业务规则与来源 |
| P3 | 规则—模拟—发布 | 冲突、版本、生效范围和回滚 | idea | 独立业务规则与来源 |

切片 002 暂不新增 `EPM-SCENE-008`。它先引用现有 PAGE、ACT、STATE 和 SPECIAL 分类项，验证后再做模式晋升评审。

## 3. 方法论资产成熟度轨道

| 资产 | 当前成熟度 | Lab 可提供 | Lab 不能独自提供 | 下一证据 |
|---|---|---|---|---|
| `EPM-PAGE-001` 企业双层导航壳层 | `interaction-verified` | 交互回归与投影检查 | 第二项目采用、业务验证、发布 | 独立项目采用决策 |
| `EPM-SCENE-001` 记录管理工作区 | `implementation-verified` | 去业务化实现与组件交互证据 | 真实数据详情、销售角色验收、业务验证 | MCRM 或其他真实项目补证据 |
| 批量选择与部分成功候选 | `idea` | 场景契约、切片实现、浏览器证据 | 服务端事务、真实权限、项目采用 | 当前切片评审完成后形成晋升候选，不自动晋升 |
| 其余分类项 | 默认 `idea` | 目录说明和覆盖关系 | 独立模式成熟度 | 来源、候选卡、边界和 AC |

任何晋升必须同步 pattern、template/example、check 和权威索引；仅新增 Demo 不自动晋升。

## 4. 外部项目采用与业务验证轨道

| 项目/依赖 | 涉及资产 | 当前事实 | 所属责任 |
|---|---|---|---|
| MCRM 003 | 企业双层导航壳层 | 有实现/浏览器证据，Specification Gate 待重确认，Release pending | MCRM |
| MCRM 004 | 记录管理工作区 | 有实现证据；真实数据详情和销售角色复核不足，Specification Gate 待重确认 | MCRM |
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
