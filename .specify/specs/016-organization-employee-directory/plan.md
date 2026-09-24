# 技术计划

## 数据与所有权

- 数据层：`org_` 组织主数据；唯一责任模块 `packages/server/src/organization`。
- 新表：`org_employee`、`org_employment`、`org_position`、`org_employee_assignment`；`sys_user.employee_id` 建同租户复合外键。
- 主键 UUID；工号 `(tenant_id, employee_no)`、岗位编码 `(tenant_id, position_code)` 唯一；开放主职使用 partial unique index。
- 组织、员工、岗位和任职使用 `RESTRICT`；普通页面仅停用，不物理删除。联系方式为敏感数据，列表脱敏。
- 当前切片以事务服务阻止跨租户组织/岗位引用；有效期为半开区间，数据库检查结束晚于开始。

## API 与权限

- `GET/POST/PATCH /api/systems/:systemCode/organization/employees` 及详情、选项接口。
- `organization.employee.view/manage` 是稳定服务端权限；菜单/按钮只是投影。
- 新增员工同事务创建账号、雇佣、主职任职、账号组织关系、viewer 角色成员和审计。

## 迁移、恢复与验证

- 只新增前滚 migration，不修改已应用历史；保留既有组织 ID并将旧中性 Seed 编码迁移为批准组织树。
- 共享环境执行前备份；失败通过新 migration 前滚修复。验证空库迁移、Seed 重跑、唯一/外键/主职约束、API 权限与全仓测试。
