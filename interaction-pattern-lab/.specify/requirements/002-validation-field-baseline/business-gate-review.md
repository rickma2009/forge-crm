# Business Gate 评审：企业交互模式验证场业务基线

> 评审对象：`requirement.md` v1.0-rc1
> 状态：approved
> 决策人：Rick
> 来源：`REQSRC-007`、`REQSRC-008`

## 1. 评审范围

本 Gate 只评审：验证场定位、目标用户、业务成果、99 项目录范围、首个新增验证切片、价值基线、人工责任和明确不做内容。

本 Gate 不批准：JSON Schema、React/Vite 延续方案、Demo loader、场景契约 runner、具体 UI 实现、测试通过、资产晋升、部署或发布。

## 2. 完整性检查

| 检查项 | 证据 | 结果 |
|---|---|---|
| 目标与系统边界明确 | `requirement.md` §1、§7 | ready |
| 第一用户与核心任务明确 | `requirement.md` §2 | ready |
| 目录和资产权威边界明确 | `requirement.md` §3 | ready |
| 首个新增切片业务目标明确 | `requirement.md` §5 | ready |
| 关键批量语义与失败范围明确 | `REQ-213`—`REQ-219` | ready |
| 成功证据与未知项明确 | `BUS-001`—`BUS-004`、`transformation.md` §5 | ready |
| Out of Scope 明确 | `requirement.md` §7 | ready |
| 决策人与后续 Gate 边界明确 | `requirement.md` §8 | ready |
| Business Gate 阻断问题关闭 | `clarification.md` §1、§3 | ready |

## 3. 主要风险与控制

| 风险 | 控制 |
|---|---|
| 99 项被误读为 99 个成熟模板 | 分类项默认 `idea`；成熟度与覆盖关系分开；无 Demo 不开放交互入口 |
| Lab 成为第二规范源 | `_methodology` 持有分类和资产索引；Lab 只消费受检查投影 |
| 新切片范围膨胀为异步导入平台 | 首片限定同步批量分配；异步能力独立切片 |
| Demo 工程通过被误作业务验证 | 实现、交互、项目采用和业务验证状态分开 |
| 来源样式被普适化 | 中性语义令牌；局部覆盖必须记录验证目的 |
| 旧批准被扩大解释 | 旧需求和 ADR 标记历史适用范围；新 Gate 单独记录 |

## 4. 建议结论

评审材料已满足 Business Gate 的目标、范围、用户、业务规则、成功证据和责任完整性要求。建议人工结论为 `approved`，批准后允许：

1. 准备 99 项资产内容清单和索引 Schema 需求；索引文件与检查器须等待 Architecture Gate；
2. 创建 `.specify/specs/002-bulk-assignment-partial-success/` 的 Spec 与测试设计；
3. 对历史 ADR-001 启动复审，但不预设技术结论。

批准后仍禁止直接编码，必须分别通过切片 Specification Gate 和 Architecture Gate。

## 5. 人工决定

- 结论：`approved`
- 批准人：Rick
- 时间：2026-08-31T01:19:59+08:00
- 备注：批准范围不包含 Specification、Architecture、实现、资产晋升或 Release
- 批准来源：`REQSRC-009`
