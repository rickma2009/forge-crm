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

## 2026-10-05 REQSRC-100 架构与数据增量

- 权威数据：组织业务标识与负责人员工关系归 `org_unit`（`organization` 模块）；员工职位代码归 `org_employee`；岗位/职位候选值归 `sys_dictionary`（`dictionary` 模块）。现有 `org_position` 与 `org_employee_assignment` 保留岗位主数据和任职关系，岗位字典代码在员工事务内解析为租户内岗位 ID。
- 新增三独立布尔列、`manager_employee_id` 和 `job_title_value`，不重建原表。负责人使用 `(manager_employee_id, tenant_id)` → `org_employee(id, tenant_id)` 复合外键；字段可空是历史数据过渡条件，新增/修改部门由契约和服务强制负责人。层级由父子关系计算，避免冗余列漂移。
- 销售组织的下游选择仅使用启用且 `is_sales_org=true` 的组织；商机分析筛选后仍在数据库查询时复核，销售订单写入同样校验。研发/平台属性本轮仅保存和展示，不更改授权或数据范围。
- 状态/有效期：沿用现有 `ACTIVE/DISABLED` 与时间窗。负责人需同租户、员工及雇佣均有效；停用当前负责启用组织的员工时拒绝。原有版本与审计机制沿用，后续人员变更不直接改写历史任职行。
- 迁移：`20261005090000_organization_business_fields` 仅增列、索引、复合外键并一次性分类演示组织与职位值；部署前可备份，失败前滚修复。`initializeOrganizationBusiness` 仅补缺预设字典和空负责人，重复执行不得覆盖人工维护。演示 Seed 首次建档写默认分类，重跑不覆盖分类/负责人/组织字典用户值。
- 验证：契约与页面定向测试、真实数据库 API 集成、跨租户负责人外键拒绝、定向初始化两次增量为零、迁移状态和前后记录数核对。该设计为当前项目实现证据；岗位代码、演示组织与职位名称不自动晋升通用模板。

部署边界：首条迁移的演示分类按组织编码回填；本地只读审计在非 `demo-portal` 租户中匹配且已分类的记录为 0。针对非演示租户进行批量重置的方案被自动审批审查拒绝，未创建或执行该修正迁移。共享多租户环境应用迁移前须先只读核对同名组织及预期分类，不能自动清空其他租户的业务标识。
