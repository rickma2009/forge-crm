# 技术计划：线索评审工作流

> 功能编号：001  
> 状态：planned-example  
> Architecture Gate：example-approved

## 1. 方案

以显式状态机实现三种命令：submit、qualify、reject。所有成功迁移统一走一个内部迁移函数，保证状态更新与历史记录不可分离；失败先校验，不修改对象。

## 2. 契约

| ID | 命令 | 前置状态 | 结果 | 错误 |
|---|---|---|---|---|
| API-001 | submit | active | in_review | INVALID_TRANSITION |
| API-002 | qualify | in_review | qualified | INVALID_TRANSITION |
| API-003 | reject(reason) | in_review | rejected | INVALID_TRANSITION、VALIDATION_ERROR |

## 3. 决策

| ID | 决策 | 原因 | 复审条件 |
|---|---|---|---|
| ADR-001 | 使用显式状态迁移表，不使用通用工作流引擎 | 当前只有三条稳定迁移，引擎会增加无收益复杂度 | 出现动态流程、并行节点或业务配置需求 |

## 4. 生产差距

真实项目必须补充鉴权、持久化、并发版本、事务、通知、观测和恢复设计；本示例不提供这些生产承诺。
