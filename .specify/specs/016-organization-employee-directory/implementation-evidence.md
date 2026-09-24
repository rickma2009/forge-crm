# 实现证据

## 数据与迁移

- Migration `20260922220000_employee_directory` 已成功应用。
- Prisma 新增 `org_employee`、`org_employment`、`org_position`、`org_employee_assignment`，`sys_user.employee_id` 与员工可选一对一绑定。
- 连续重跑 Seed 后稳定为：9 个组织、12 个岗位、14 名员工、14 个雇佣记录、14 个在职主职、14 个员工绑定账号；孤儿作用域关系为 0。
- 初始化组织与用户为演示数据；名称、工号、账号和初始密码不属于可跨项目复用资产。

## API 与权限

- 组织响应改为公开字段白名单，数据库集成测试确认不再返回 `tenantId`、`createdBy` 等内部字段。
- 员工新增在 Serializable 事务中创建员工、雇佣、主职、系统用户、组织用户关系和 viewer 角色成员，并写审计日志。
- 员工列表联系方式脱敏；完整联系方式只允许管理权限读取。
- 数据库集成测试：14 项通过；覆盖必填校验、登录、菜单、admin 管理权限和 viewer/员工越权 403。

## 前端与浏览器

- 组织架构采用资源菜单一致的左树右详情结构，右侧仅展示基本信息。
- 员工管理位于组织架构下方，采用查询区、列表和新增/编辑弹窗；组织和岗位均为必选。
- 浏览器在 `http://localhost:5173` 验证：组织树展示 9 个节点；员工列表展示 14 条；新增弹窗展示完整组织树和 12 个岗位。

## 自动验证

- `pnpm verify`：通过（registry/场景/隔离/资产校验、Lint、类型检查、测试、生产构建）。
- 前端：36 个文件、170 项测试通过。
- Contracts：5 个文件、14 项测试通过。
- 默认后端：15 个套件、35 项测试通过；数据库集成测试另有 14 项通过。
- `bash _methodology/scripts/check-sdd.sh .specify/specs/016-organization-employee-directory full` 在补齐评审与追溯后通过。
