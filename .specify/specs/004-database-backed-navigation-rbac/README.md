# 004 数据库驱动的导航与角色授权

> 状态：`released-in-validation-lab`
> Business Gate：approved（`REQSRC-018`）
> Specification Gate：approved（`REQSRC-019`）
> Architecture Gate：approved（`REQSRC-020`）
> Release Gate：approved（`REQSRC-021`）

本切片在保留切片 003 导航交互结果的基础上，验证一个可供未来项目采用的最小全栈闭环：认证用户传入目标系统，服务端按有效角色返回数据库中的应用菜单、系统管理菜单与页面操作，并在操作入口再次授权。

## 文件职责

- `requirements/original.md`：业务需求与 Gate 来源指针；
- `clarification.md`：Specification 层建议答案和剩余边界；
- `spec.md`：可观察行为、权限规则、失败行为与验收标准；
- `testcases.md`：待执行的验证设计；
- `traceability.md`：Business → Slice → AC → TC 追溯；
- `specification-gate-review.md`：已批准的 Specification Gate 记录；
- `plan.md`：Architecture 技术计划候选；
- `architecture-gate-review.md`：已批准的 Architecture Gate 记录；
- `tasks.md`：已创建任务、依赖、验收和执行状态；
- `implementation-evidence.md`：已实际执行的实现与验证证据、失败记录和剩余项；
- `review.md`：三视角实现评审与遗留 P2；
- `release-gate-review.md`：Release Gate 证据、边界、风险与待人工决定；
- `pipeline-state.json`：本切片 Gate 和阶段状态。

## 当前允许与禁止

切片 004 已完成四个 Gate，并登记为验证场内已发布切片。当前允许在本地或另行明确授权的验证环境使用并积累真实项目采用证据；未执行外部部署，生产使用、范围扩张和方法论正式模式晋升仍需独立批准。
