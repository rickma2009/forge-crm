# 技术计划：{{feature_name}}

> 功能编号：{{feature_id}}  
> 状态：draft  
> Architecture Gate：pending

## 1. 输入与约束

- 关联 Spec：`spec.md`
- 关联测试：`testcases.md`
- 项目宪法：`../../memory/constitution.md`
- 明确约束：{{constraints}}

## 2. 方案概述

{{solution_overview}}

## 3. 影响范围

| 层/模块 | 变化 | 不变化 |
|---|---|---|
| {{area}} | {{change}} | {{non_change}} |

## 4. 数据设计

- 业务实体与关系：{{data_model}}
- 所有权和权限：{{ownership}}
- 兼容与迁移：{{migration}}
- 回滚：{{rollback}}

## 5. API/事件契约

| ID | 用途 | 输入 | 输出 | 鉴权 | 幂等/错误 |
|---|---|---|---|---|---|
| API-001 | {{purpose}} | {{input}} | {{output}} | {{auth}} | {{behavior}} |

## 6. 用户体验

{{ux_states_and_flow}}

## 7. 安全、性能与可观测

- 安全：{{security}}
- 性能：{{performance}}
- 日志/指标/告警：{{observability}}

## 8. 测试实现策略

{{test_strategy}}

## 9. 风险与 ADR

| ID | 决策/风险 | 处理 | 复审条件 |
|---|---|---|---|
| ADR-001 | {{decision}} | {{resolution}} | {{review_condition}} |

## 10. Architecture Gate

- 结论：pending
- 批准人：
- 时间：
- 备注：
