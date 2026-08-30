# 企业管理系统交互模式候选卡

> 模式名称：`{{pattern_name}}`  
> 模式编号：`{{EPM-PAGE|ACT|VIEW|STATE|SPECIAL|SCENE-NNN}}`  
> 状态：`idea | candidate | validated-once | validated-multiple | deprecated`  
> 负责人：`{{owner}}`  
> 最近更新：`{{YYYY-MM-DD}}`

## 1. 用户任务与业务意图

- 目标角色：`{{roles}}`
- 用户要完成的任务：`{{user_task}}`
- 业务价值：`{{business_value}}`
- 触发入口：`{{entry_points}}`

## 2. 适用与不适用边界

### 适用

- `{{applicable_condition}}`

### 不适用

- `{{excluded_condition}}`

## 3. 页面与信息结构

- 页面模式：`{{page_patterns}}`
- 展示模式：`{{view_patterns}}`
- 主要区域：`{{regions}}`
- 响应式与密度要求：`{{responsive_and_density}}`
- 设计令牌或业务不变量：`{{tokens_or_invariants}}`

## 4. 操作行为契约

| 操作 | 作用对象 | 可见/可用条件 | 输入与校验 | 成功结果 | 失败与恢复 | 权限与审计 |
|---|---|---|---|---|---|---|
| `{{action}}` | `{{target}}` | `{{conditions}}` | `{{validation}}` | `{{success}}` | `{{failure}}` | `{{authorization}}` |

## 5. 状态与反馈

- 初始：`{{initial_state}}`
- 加载：`{{loading_state}}`
- 空数据/无结果：`{{empty_state}}`
- 成功：`{{success_state}}`
- 校验或业务拒绝：`{{rejected_state}}`
- 系统失败：`{{error_state}}`
- 权限不足/不存在：`{{secure_state}}`
- 并发、异步或部分成功：`{{special_states}}`

## 6. 特殊操作与风险

- 特殊操作分类：`{{special_patterns}}`
- 主要风险：`{{risks}}`
- 影响范围：`{{impact_scope}}`
- 二次确认、预检查或模拟：`{{safeguards}}`
- 幂等、事务、补偿或回滚：`{{recovery}}`

## 7. 接入步骤

1. 在目标项目详细需求和 Spec 中确认业务语义；
2. 将操作、状态和权限映射到稳定需求与验收 ID；
3. 选择或创建 UI 模板，并替换项目字段和设计令牌；
4. 接入真实接口、服务端权限、状态机和审计；
5. 验证主路径、失败路径、边界和可访问性；
6. 记录项目差异和方法论回流建议。

## 8. 验收清单

- [ ] 主任务可以从明确入口完成；
- [ ] 操作的可见条件和服务端授权一致；
- [ ] 加载、空、成功、失败、无权和不存在状态完整；
- [ ] 特殊操作的影响、恢复和审计机制明确；
- [ ] 页面字段、规则和状态可追溯到项目 Spec；
- [ ] 真实浏览器验证覆盖键盘操作和关键响应式状态；
- [ ] 未携带来源项目的业务字段、组织平台或技术遗留。

## 9. 来源与验证证据

| 来源位置 | 证据类型 | 明确事实 | 实现推断 | 保留内容 | 排除内容 |
|---|---|---|---|---|---|
| `{{source_location}}` | `{{source_type}}` | `{{facts}}` | `{{inferences}}` | `{{retained}}` | `{{excluded}}` |

- 验证项目：`{{validated_projects}}`
- 验收/测试证据：`{{evidence_links}}`
- 当前未知：`{{unknowns}}`
- 下次复审条件：`{{review_trigger}}`

