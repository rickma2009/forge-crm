# 技术计划：客户线索登记

> 功能编号：000  
> 状态：planned-example  
> Architecture Gate：example-approved

## 1. 方案

使用无外部依赖的 ECMAScript 模块实现 `CustomerLeadService`。服务持有可替换的仓储接口；教学实现使用内存仓储，以便真实运行测试而不引入数据库和框架。

## 2. 数据

线索字段：`id`、`name`、`email`、`source`、`status`、`createdAt`。  
邮箱在写入前规范化；仓储按规范化邮箱查找活动线索。

## 3. 契约

| ID | 用途 | 输入 | 输出 | 错误 |
|---|---|---|---|---|
| API-001 | 创建线索的领域服务契约 | name/email/source | lead | VALIDATION_ERROR、DUPLICATE_EMAIL |
| API-002 | 按 ID 查询 | id | lead 或 null | 无 |

## 4. 关键决策

| ID | 决策 | 原因 | 复审条件 |
|---|---|---|---|
| ADR-001 | 示例使用内存仓储和 Node 内置测试 | 保持零依赖、突出追溯和行为 | 用于真实项目时必须替换为项目架构并重新评审 |

## 5. 安全、性能、观测和回滚

- 安全：示例不处理身份；真实项目不得沿用这一缺省。
- 性能：本切片不设生产性能承诺。
- 观测：业务错误带稳定代码；不记录个人信息。
- 回滚：删除示例目录即可，不影响任何项目。
