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

- 数据分层与表登记：{{data_classification_and_registry}}
- 物理命名检查：表/字段使用批准的领域前缀和小写 `snake_case`，且均不超过 32 个字符；{{physical_identifier_validation}}
- 唯一责任模块与共享方式：{{system_of_record_and_consumers}}
- 数据库规范符合性：`_methodology/11-数据库设计与数据分层规范.md`；{{profile_database_conventions}}
- 业务实体与关系：{{data_model}}
- 所有权和权限：{{ownership}}
- 租户/应用作用域与数据库不变量：{{scope_and_invariants}}
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
