# 实现任务：数据库驱动的导航与角色授权

> 功能编号：004-database-backed-navigation-rbac
> 状态：`accepted-and-released-in-validation-lab`
> Business / Specification / Architecture / Release Gate：approved（`REQSRC-018/019/020/021`）

## 执行规则

- 按依赖顺序实施，每个任务先建立公共 seam 的失败测试，再写最小实现；
- 不修改 `_ref/`，不复制来源项目 IAM、菜单或组织字段；
- 数据库测试使用专用本地/测试 PostgreSQL，不连接参考或生产数据库；
- 只有实际执行的检查才能登记为 passed；
- 外部部署和资产晋升不在本 Tasks 范围；`REQSRC-021` 只批准验证场内 Release 状态登记。

## 任务清单

| ID | 任务 | 依赖 | 主要产出 | 验收/测试 | 状态 |
|---|---|---|---|---|---|
| `TASK-501` | 锁定现有前端绿线并受控迁移为 Profile v0.2 workspace | 无 | 根 workspace、`packages/web`、共享配置、等价质量命令 | `AC-508`；`TC-514`；历史 12 files / 56 tests | completed |
| `TASK-502` | 建立共享 HTTP 运行时契约与错误协议 | `TASK-501` | `packages/contracts`；`API-501`—`API-506` Schema 与类型 | `REQ-501/502/505/507/508/513`；契约测试 | completed |
| `TASK-503` | 建立六表 Prisma 模型、迁移、索引和幂等种子校验 | `TASK-501/502` | `schema.prisma`、唯一 migration、seed/config validator、测试数据库工具 | `AC-501/504/505`；`TC-503/505/506/509/510/513`；`TC-EDGE-501/502/503/505` | completed |
| `TASK-504` | 实现本地认证、Argon2id、签名 Cookie、Origin/CSRF | `TASK-502/503` | AuthModule、`API-501`—`API-503`、ACTIVE 用户校验 | `TC-501/502/509/511`；`NFR-501` | completed |
| `TASK-505` | 实现 AuthorizationService、导航树、页面直达和错误映射 | `TASK-502/503/504` | `API-504/505`、一致性事务、permissionVersion、403/404/503 | `AC-501/502/004/006/007`；`TC-503`—`TC-507`、`TC-511/512/515`、`TC-EDGE-501`—`506` | completed |
| `TASK-506` | 实现具体受保护 Demo 资源操作 | `TASK-505` | `API-506` 具体维护/导出端点、授权后事务和零变更拒绝 | `AC-503`；`TC-507/508/512` | completed |
| `TASK-507` | 将 Showcase 接入 Session/NavigationGateway 和真实授权结果 | `TASK-502/504/505/506` | 登录、系统上下文、加载/403/404/503、双区菜单与 allowedActions | `AC-501/502/003/008`；`TC-501`—`TC-504`、`TC-507/508/514` | completed（浏览器验收归 TASK-508） |
| `TASK-508` | 完成数据库、API、前端、性能和浏览器验证 | `TASK-501`—`TASK-507` | 集成测试、性能记录、浏览器证据、全量质量结果 | `TC-501`—`TC-515`、`TC-EDGE-501`—`506` | completed |
| `TASK-509` | 完成三视角实现评审与候选回流总结 | `TASK-508` | `review.md`、追溯状态、遗留风险、Release Gate 候选 | 全部需求/验收；需求、安全、集成运行评审 | completed |

## 当前公共测试 seam

Architecture Gate 已确认以下公共 seam，无需重新发明测试边界：共享运行时 HTTP Schema；`API-501`—`API-506`；PostgreSQL migration/seed；浏览器可观察的登录、双区导航、页面直达和具体操作结果。测试不得直接断言私有方法调用。

## 停止条件

- 历史 Web 绿线无法恢复：停止新增后端功能，保留迁移证据并修复回归；
- 六表无法落实同系统或 ACTION/MENU 不变量：返回 Architecture Gate，不用应用代码静默替代关键约束；
- 需要第七张系统/Session 表、DENY、数据权限或生产身份：停止并重新开相应 Gate；
- 本地/CI 无可用 PostgreSQL：可继续纯契约/单元实现，但数据库集成、性能和 Release 状态必须保持未验证。
