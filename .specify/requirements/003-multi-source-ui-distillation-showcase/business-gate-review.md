# Business Gate 评审：多来源 UI 萃取与演示门户

> 评审对象：`requirement.md` v0.1-rc1
> 状态：`approved`
> 决策人：Rick
> 来源：`REQSRC-013`

## 1. 评审范围

本 Gate 只评审：多来源 UI 萃取目标、目标用户、来源选择规则、UI 候选资产范围、演示门户信息架构、模拟账号/权限边界、首个导航切片和明确非目标。

本 Gate 不批准：具体 JSON Schema、UI 资产登记册实现、React 状态方案、账号密码、页面代码、测试结果、资产晋升、部署、切片 002 Release 或生产 IAM。

## 2. 完整性检查

| 检查项 | 证据 | 结果 |
|---|---|---|
| 目标和业务成果明确 | `requirement.md` §1 | ready |
| 目标用户和核心任务明确 | `requirement.md` §2 | ready |
| 多来源选择与证据边界明确 | `REQ-301`—`REQ-306` | ready |
| UI 资产与字段配置边界明确 | `REQ-307`—`REQ-311` | ready |
| 演示门户和首个切片明确 | `REQ-312`—`REQ-316` | ready |
| 模拟身份与生产安全边界明确 | `REQ-317`—`REQ-321` | ready |
| 非功能、In/Out Scope 明确 | `requirement.md` §7—§8 | ready |
| 与 002 基线的冲突已处理 | `transformation.md` §4 | ready |
| Business Gate 阻断问题已关闭 | `clarification.md` §1、§4 | ready |

## 3. 主要风险与控制

| 风险 | 控制 |
|---|---|
| 来源系统被误当通用答案 | 每页来源选择、事实/推断分离、正式资产去来源项目化 |
| 多来源被静默拼接 | 明确选中/未选来源并记录冲突 |
| Demo 登录被误认为生产安全 | 只使用本地模拟身份，UI 和文档明示边界 |
| `admin` 变成绕过所有检查的特例 | 通过统一 role-to-capability 绑定获得全部 Demo 权限 |
| 导航切片扩大成完整后台系统 | 首片只验证壳层、菜单、身份和权限反例 |
| 新 UI 类型污染现有 EPM 103 项索引 | 使用独立候选模型，正式登记册等待 Architecture Gate |
| 新范围覆盖切片 002 Release 状态 | 项目状态分别记录全局 Gate 和各切片状态 |

## 4. 建议结论

目标、范围、角色、来源边界、首个切片和非目标已经具备 Business Gate 评审条件。建议人工结论为 `approved`。

若批准，下一步仅允许：

1. 创建新的“认证式导航展示壳层”Spec；
2. 明确菜单状态、模拟身份、权限反例和验收标准；
3. 准备 Architecture Gate 方案，评审菜单 registry、capability、会话、主题令牌和 Demo 隔离；
4. 继续保持切片 002 的 Release Gate 独立。

批准后仍禁止直接编码，必须分别通过该切片的 Specification Gate 和 Architecture Gate。

## 5. 人工决定

- 结论：`approved`
- 批准人：Rick
- 时间：2026-09-03T17:49:49+08:00
- 备注：批准业务目标、范围、角色、来源边界、演示门户、模拟权限边界和首个导航切片；不批准 Specification、Architecture、实现、资产晋升、部署或 Release。
- 批准来源：`REQSRC-014`
