# 技术计划

- 数据：新增 `org_unit`，`(tenant_id, unit_code)` 唯一，`(parent_id, tenant_id)` 复合外键，半开有效期和非自引用检查；层级在服务读取时计算。
- API：`GET/POST/PATCH /api/systems/:systemCode/organization/units`；稳定权限为 `organization.unit.view/manage`。
- 审计：写入与 `sys_audit_log` 同事务；乐观锁冲突返回受控错误。
- Web：新增层级表、展开/收起、三条件查询和新增/编辑弹窗；注册系统管理菜单。
- 样式：查询区复用 `.enterprise-card.query-card`、`.query-grid`、`.query-buttons`。
- 恢复：新 migration 不改写历史；共享环境只通过后续 migration 前滚修复。
