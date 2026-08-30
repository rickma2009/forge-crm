# SDD 规范与质量门禁

> 版本：v0.2  
> 目标：让“阶段完成”成为可验证状态，而不是主观声明。

## 1. 功能状态机

```text
draft → clarified → specified → planned → implementing
      → verified → approved → released → archived
```

任何回退都必须记录原因。业务语义变化回退到 `specified` 之前，架构变化回退到 `planned` 之前。

## 2. Definition of Ready

进入实现前必须满足：

- 原始需求和澄清记录存在；
- Spec Gate 已人工批准；
- 每个 P0/P1 需求都有可测试的 AC；
- 每个 AC 至少关联一个 TC；
- Plan 不新增未批准的业务需求；
- Architecture Gate 已批准重大技术决策；
- 每个 Task 有依赖、产出、验收标准和追溯 ID；
- 未解决问题均有负责人和处理结论。

## 3. Definition of Done

功能完成必须满足：

- 所有范围内需求有实现证据；
- 所有 P0/P1 测试通过；
- lint、typecheck/compile、相关测试和构建门禁通过；
- 安全、权限、数据迁移和回滚已评审；
- 追溯矩阵无孤儿项；
- 文档与实际实现一致；
- 遗留风险有负责人和期限；
- Release Gate 已明确批准。

## 4. 四个人工 Gate

### Business Gate

批准人：业务负责人/产品负责人。  
批准：目标、指标、范围、优先级、角色、系统边界。

### Spec Gate

批准人：业务负责人 + 产品负责人。  
批准：用户故事、业务规则、验收标准、边界和异常行为。

### Architecture Gate

批准人：技术负责人；涉及数据和安全时加入对应负责人。  
批准：技术方案、数据模型、接口、安全、迁移、可观测和回滚。

### Release Gate

批准人：产品、测试、技术和发布责任人。  
批准：测试证据、遗留风险、发布窗口、回滚条件和运营准备。

批准记录必须包含批准人、时间、结论和备注。AI 不得代填为已批准。

## 5. 自动检查

`scripts/check-sdd.sh` 负责最低限度的结构检查：

- 必需文件存在；
- `pipeline-state.json` 是合法 JSON；
- 不残留模板占位符；
- 不出现 `_spec/`；
- 通用模板和金标准案例不残留典型旧项目技术标识；
- traceability 至少包含 REQ、AC、TC 和 TASK。

检查按门禁阶段执行：

```bash
# Specification Gate 前：不要求提前创建 plan/tasks/review
bash _methodology/scripts/check-sdd.sh <feature-directory> spec

# 实现/评审闭环：检查完整目录和 TASK 追溯
bash _methodology/scripts/check-sdd.sh <feature-directory> full
```

禁止为了让完整检查提前通过而创建空的技术 Plan、虚假 TASK 或评审结论。

自动检查不能替代人工业务判断和代码测试。

## 6. 评审报告

问题按严重度分级：

| 级别 | 定义 | 处理 |
|---|---|---|
| P0 | 安全、数据损坏、核心目标无法达成 | 阻断 |
| P1 | 主要需求错误、关键边界缺失 | 阻断 |
| P2 | 质量、维护性或次要体验问题 | 原则上修复或登记 |
| P3 | 建议性优化 | 可后续处理 |

多 Agent 评审可以增加视角，但不能用“多数票”覆盖可复现的 P0/P1 证据。
