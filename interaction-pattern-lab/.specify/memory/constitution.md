# 项目宪法：企业管理系统交互模式工作台

> 版本：0.2  
> 生效状态：随项目立项生效；Business Gate 已于 2026-08-30 通过

## 1. 权威来源

- 通用交互分类与模式：`../_methodology/`，以仓库根目录为参照；
- 项目目标：`.specify/memory/project-charter.md`；
- 项目业务定义：`.specify/memory/business-context.md`；
- 原始输入：`.specify/sources/`；
- 功能行为：Business Gate 后创建的对应 `spec.md`；
- 技术决策：Architecture Gate 后的 `plan.md` 与 ADR。

## 2. 不可违反的约束

1. `_methodology/` 是通用规范唯一来源，Demo 不维护冲突副本。
2. 新来源必须先归档，原始副本不可改写。
3. 参考案例必须区分事实、推断、未知和项目批准决策。
4. Demo 操作不得访问生产服务或写真实业务数据。
5. 未经验证的模式只能标记为 `idea` 或 `candidate`。
6. 机密不得进入代码、文档、日志或版本库。
7. 未经授权不得执行部署、外部写入或破坏性操作。

## 3. 架构边界

Architecture Gate 已批准 React、TypeScript、Vite 的静态单包方案。首片无后端、数据库、账户、在线编辑、第三方运行时内容或生产接口；保持“规范资产—模式投影—Demo Adapter—项目采用决策”分层，展示代码不是方法论唯一来源。

## 4. 数据与安全

- Demo 数据使用虚构、去标识化或用户明确授权的样例；
- 用户提供系统若含敏感信息，必须先确认允许的导入范围和脱敏方式；
- 外部链接、截图和源码分别记录来源及授权边界；
- 前端隐藏、禁用和模拟权限不等于真实服务端授权。

## 5. 质量门禁

- 当前必需：来源哈希检查、Markdown 链接检查、方法论一致性检查；
- 实现后必需：lint、typecheck、自动化测试、构建和真实浏览器验收；
- 核心行为：分类导航、案例切换、状态演示、重置、键盘操作和来源追溯；
- 发布证据：待 Release Gate 定义，不得提前声称已发布。

## 6. SDD 职责边界

| 文档 | 职责 |
|---|---|
| requirement | 经业务评审的详细需求 |
| spec | 独立切片的 What / Why |
| testcases | Verify |
| plan | How |
| tasks | Execute |
| traceability | Evidence chain |

## 7. 例外机制

任何例外必须记录原因、风险、批准人、有效期和恢复计划。AI 不得自行批准例外或人工 Gate。
