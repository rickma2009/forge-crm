# Business Gate 评审包：组织与访问管理基础

> 状态：`approved`  
> 拟议切片：`012-organization-access-administration-foundation`  
> 来源：`REQSRC-043`、`REQSRC-044`

## 1. 请求决定

请求批准 `BUS-018`、`BUS-019` 及 `Q-1201`—`Q-1210` 的推荐答案，允许进入切片 012 的 Specification 与测试设计。

## 2. 建议批准范围

- 先实现平台访问管理和现有平台表的无损迁移，组织员工能力另立后续切片；
- 以默认租户和演示门户应用落地正式作用域；
- 建立稳定、首轮只读的权限目录；
- 实现用户、普通角色、角色成员和角色权限矩阵的数据库闭环；
- 保护系统管理员角色，admin 和 viewer 均通过角色获权；
- 所有写操作由服务端授权并写入审计；
- 页面沿用客户管理页风格，只借鉴 `supply` 的信息结构和交互。

## 3. 明确不包含

- 字段 Schema、表映射、SQL、API、组件、测试用例和迁移执行细节；
- 组织员工、数据权限、SSO/MFA、租户运营、菜单管理页和审计查询页；
- Architecture、Tasks、代码实现、生产迁移、部署或 Release；
- 对既有切片 Gate 状态的继承或替代。

## 4. 风险与停止条件

- 若迁移方案不能证明保留 ID、关系和记录计数，Architecture Gate 前停止；
- 若系统管理员可能通过普通操作失去管理权限，Specification Gate 前停止；
- 若页面只隐藏按钮而 API 未强制权限，禁止进入 Release；
- 若必须同时引入完整组织员工或数据权限才能运行，应重新打开 Business Gate，而不是静默扩范围。

## 5. 人工决定

- 结论：`approved-business-scope-and-recommended-clarifications`
- 批准人：用户（本任务业务决策人）
- 时间：2026-09-21
- 批准来源：`REQSRC-045`
- 批准对象：`BUS-018`、`BUS-019`、业务范围、目标角色、业务不变量、切片顺序及 `Q-1201`—`Q-1210` 推荐答案
- 批准边界：不包含 Specification、Architecture、Tasks、实现、生产迁移、部署或 Release
- 下一步：允许创建切片 012 的 `spec.md`、验收标准和 `testcases.md`，并停在 Specification Gate。
