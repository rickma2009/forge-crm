# 004 数据库驱动的导航与角色授权

> 状态：`business-specification-architecture-approved`
> 权威来源：`REQSRC-017`
> 批准证据：`REQSRC-018`
> Specification 批准证据：`REQSRC-019`
> Architecture 批准证据：`REQSRC-020`
> 影响对象：`003-authenticated-enterprise-navigation-shell`

本需求包承接用户对切片 003 的实质变更：演示门户不再只验证前端模拟权限，而要形成可供未来项目复用的前端、后端和数据库闭环。旧切片实现保留为历史交互证据，但不得作为当前目标完成证据。

## 文件职责

- `requirement.md`：业务范围、角色授权不变量、六类逻辑表和验收方向；
- `transformation.md`：新旧需求冲突、参考源码事实、保留/排除决定与 Gate 影响；
- `clarification.md`：已批准 Business 问题及后续阶段边界；
- `business-gate-review.md`：本次重新打开的 Business Gate 评审入口。

## 当前边界

- 允许：在明确指令下创建 Tasks，并按已批准方案实施本地数据库、认证、API 和前端替换；
- 禁止：扩大为第七张系统/Session 表、用户直授权、数据权限、完整 IAM 管理 UI，或连接参考项目数据库、部署、Release；
- 当前事实：Tasks 与实现尚未开始。
