# ADR-003：采用两阶段项目初始化与可选技术 Profile

> 状态：accepted  
> 日期：2026-08-30

## 背景

新项目必须在技术栈选择前归档来源并建立 Gate，但现有检查器又把 Node、`package.json` 和固定脚本当作所有项目的必需结构。把治理与工程骨架一次生成会把未经批准的技术选择固化为事实。

## 决策

1. `forge init` 只创建技术栈中立的治理骨架。
2. Business 与 Architecture Gate 明确后，使用 `forge apply-profile` 应用显式选择的技术 Profile。
3. 核心结构检查与 Profile 工程检查分离。
4. 首个可选 Profile 为 `typescript-enterprise-web`，但不作为默认或唯一技术栈。
5. 初始化产物必须能脱离父工作台独立版本化和使用。

## 后果

- 来源归档、章程、上下文和 Gate 状态可在编码前建立；
- 不同技术栈共享治理契约，各自拥有 Profile 检查；
- 初始化器需要记录方法论/Profile 版本，且不得覆盖已有项目文件。

## 复审条件

当两个以上非 TypeScript 项目验证出相同工程骨架，或 Profile 机制无法表达实际差异时复审。
