# 项目宪法：{{project_name}}

> 版本：{{version}}  
> 生效日期：{{date}}

## 1. 权威来源

- 业务目标：`.specify/memory/project-charter.md`
- 业务定义：`.specify/memory/business-context.md`
- 功能行为：对应 `spec.md`
- 技术决策：对应 `plan.md` 和 ADR

## 2. 不可违反的约束

1. {{iron_rule}}
2. 机密不得进入代码、文档、日志或版本库。
3. 权限、认证和数据安全异常必须 fail-closed。
4. 未经授权不得执行生产发布、生产写入或破坏性操作。

## 3. 架构边界

{{architecture_boundaries}}

## 4. 数据与安全

{{data_security_rules}}

## 5. 质量门禁

- 必须通过：{{required_checks}}
- 核心行为测试范围：{{critical_test_scope}}
- 发布证据：{{release_evidence}}

## 6. SDD 职责边界

| 文档 | 职责 |
|---|---|
| spec | What / Why |
| testcases | Verify |
| plan | How |
| tasks | Execute |
| traceability | Evidence chain |

## 7. 例外机制

例外必须记录原因、风险、批准人、有效期和恢复计划。AI 不得自行批准例外。
