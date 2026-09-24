# 追溯矩阵

| 目标 | 需求 | 验收 | 测试 | 任务 | 实现证据 | 状态 |
|---|---|---|---|---|---|---|
| `BUS-021` | `REQ-1601` | `AC-1601` | `TC-1601` | `TASK-1602` | `OrganizationService.serialize`、数据库集成测试 | verified |
| `BUS-021` | `REQ-1602` | `AC-1601`、`AC-1602` | `TC-1602` | `TASK-1602` | `OrganizationUnitsPage`、浏览器组织树验证 | verified |
| `BUS-021` | `REQ-1603` | `AC-1603` | `TC-1603` | `TASK-1604` | `EmployeeDirectoryPage`、页面测试、浏览器验证 | verified |
| `BUS-021` | `REQ-1604` | `AC-1603` | `TC-1603` | `TASK-1604` | 员工 Contract、表格与新增/编辑弹窗 | verified |
| `BUS-021` | `REQ-1605` | `AC-1604` | `TC-1604` | `TASK-1603`、`TASK-1604` | Zod 严格契约、租户唯一约束、API 校验 | verified |
| `BUS-021` | `REQ-1606` | `AC-1603`、`AC-1605` | `TC-1605` | `TASK-1603` | Prisma schema、`20260922220000_employee_directory` migration | verified |
| `BUS-021` | `REQ-1607` | `AC-1604`、`AC-1606` | `TC-1606` | `TASK-1604` | 员工控制器鉴权、viewer 角色绑定与越权测试 | verified |
| `BUS-021` | `REQ-1608` | `AC-1604` | `TC-1606` | `TASK-1604` | 列表脱敏、审计日志、乐观锁 | verified |
| `BUS-021` | `REQ-1609` | `AC-1602`、`AC-1605`、`AC-1606` | `TC-1605`、`TC-1606` | `TASK-1605`、`TASK-1606` | 双 Seed、数据库计数、登录和浏览器验证 | verified |
| `BUS-021` | `REQ-1601`—`REQ-1609` | `AC-1601`—`AC-1606` | `TC-1601`—`TC-1606` | `TASK-1601` | 切片规格、计划、评审与证据归档 | verified |

Release Gate 尚未批准；`verified` 只表示实现与验证完成，不表示发布完成。

## 全局整改追溯

UIAUDIT-20260923 → REQ-STYLE-01 → 本切片当前有效约定 → 全局页面样式 testcases.md / audit.md；具体公共实现及本切片接入位置由 audit.md 登记。
