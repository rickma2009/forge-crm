# 追溯矩阵：数据库驱动的导航与角色授权

> 状态：`released-in-validation-lab`；Release Gate 证据为 `REQSRC-021`，执行详情见 `implementation-evidence.md`。

## 1. 业务目标到切片规格

| 业务目标 | 上游业务需求 | 切片需求 |
|---|---|---|
| `BUS-009` | `REQ-401`—`REQ-404` | `REQ-501`—`REQ-503`、`REQ-510`、`REQ-513` |
| `BUS-010` | `REQ-405`—`REQ-407` | `REQ-503`—`REQ-509`、`REQ-512` |
| `BUS-011` | `REQ-408`—`REQ-410` | `REQ-504`、`REQ-507`—`REQ-511` |
| `BUS-012` | `REQ-402`—`REQ-404`、`REQ-412` | `REQ-505`、`REQ-516` |
| 范围约束 | `REQ-411` | `REQ-514`、`REQ-515` |

## 2. 规格到验收与测试

| 目标 | 需求/NFR | 用户故事 | 验收 | 测试 | 状态 |
|---|---|---|---|---|---|
| 身份与系统上下文 | `REQ-501`、`REQ-502`、`NFR-501/502` | `US-501` | `AC-501` | `TC-501`—`TC-503` | passed |
| 有效角色与纯角色授权 | `REQ-503`、`REQ-504` | `US-501/503` | `AC-501`、`AC-504` | `TC-503`、`TC-505`、`TC-509` | passed |
| 双区授权菜单 | `REQ-505`、`REQ-506`、`NFR-502` | `US-501` | `AC-501/502` | `TC-503/504/506`、`TC-EDGE-501/502` | passed |
| 页面操作与服务端拒绝 | `REQ-507`—`REQ-509`、`NFR-501` | `US-502` | `AC-503` | `TC-507/508`、`TC-EDGE-503/504` | passed |
| 系统管理角色与显式 grant | `REQ-510`、`REQ-511`、`NFR-505` | `US-503/504` | `AC-504/505` | `TC-509/510/513`、`TC-EDGE-505` | passed |
| 权限及时变化 | `REQ-512`、`NFR-503` | `US-504` | `AC-506` | `TC-511`、`TC-EDGE-506` | passed |
| 故障默认拒绝 | `REQ-513` | `US-504` | `AC-507` | `TC-512` | passed |
| 明确非目标 | `REQ-514`、`REQ-515` | `US-504` | `AC-505` | `TC-510/513` | passed |
| 既有交互回归 | `REQ-516`、`NFR-506` | `US-501/502` | `AC-508` | `TC-504/514` | passed |
| 性能预算 | `NFR-504` | `US-501` | `AC-501/502` | `TC-515` | passed |

## 3. 完整性检查

- [x] `BUS-009`—`BUS-012` 均映射到切片需求；
- [x] `REQ-501`—`REQ-516` 和 `NFR-501`—`NFR-506` 均有测试设计；
- [x] `AC-501`—`AC-508` 均有至少一个测试；
- [x] 401/403/404/503、跨系统、父子环、ACTION 无 MENU、撤权缓存均有反例；
- [x] Business Gate 定位到 `REQSRC-018`；
- [x] 参考实现只作为证据，没有成为目标技术方案；
- [x] 测试执行状态与 `testcases.md`、`implementation-evidence.md` 一致，没有复用历史执行结果；
- [x] Specification Gate 已由 `REQSRC-019` 人工批准；
- [x] Architecture Plan 与 ADR 已由 `REQSRC-020` 批准；
- [x] `TASK-501`—`TASK-509` 已完成；实现与全部范围内执行证据已登记。
- [x] Release Gate 已由 `REQSRC-021` 人工批准；未把验证场 Release 冒充为外部部署或方法论晋升。

## 4. Architecture 候选映射

| 需求/NFR | 技术候选 | 状态 |
|---|---|---|
| `REQ-501`、`REQ-502`、`NFR-501` | `API-501`—`API-505`、签名 Cookie、Origin/CSRF、`ADR-004` | architecture-approved |
| `REQ-503`、`REQ-504`、`REQ-507`—`REQ-512` | 六表约束、AuthorizationService、一致性事务、无权限缓存 | architecture-approved |
| `REQ-505`、`REQ-506`、`REQ-516`、`NFR-506` | `API-504/505`、NavigationGateway、现有壳层受控搬迁 | architecture-approved |
| `REQ-508`、`REQ-509`、`REQ-513`、`NFR-501`—`NFR-503` | 统一错误协议、具体操作端点、默认拒绝和无敏感日志 | architecture-approved |
| `REQ-510`、`REQ-511`、`NFR-505` | 配置白名单、幂等种子、显式 grant 和来源词扫描 | architecture-approved |
| `REQ-514`、`REQ-515` | 六表模块化单体，不创建管理 UI 或数据权限模块 | architecture-approved |
| `NFR-504` | PostgreSQL 16 固定数据集与 P95 测试 | architecture-approved |

Architecture Gate 已由 `REQSRC-020` 批准；下一步在用户明确指令下把这些决策转换为 Tasks 和实现追溯。

## 5. 可机读 ID 清单

- 需求：`REQ-501`、`REQ-502`、`REQ-503`、`REQ-504`、`REQ-505`、`REQ-506`、`REQ-507`、`REQ-508`、`REQ-509`、`REQ-510`、`REQ-511`、`REQ-512`、`REQ-513`、`REQ-514`、`REQ-515`、`REQ-516`；
- 非功能：`NFR-501`、`NFR-502`、`NFR-503`、`NFR-504`、`NFR-505`、`NFR-506`；
- 验收：`AC-501`、`AC-502`、`AC-503`、`AC-504`、`AC-505`、`AC-506`、`AC-507`、`AC-508`；
- 测试：`TC-501`、`TC-502`、`TC-503`、`TC-504`、`TC-505`、`TC-506`、`TC-507`、`TC-508`、`TC-509`、`TC-510`、`TC-511`、`TC-512`、`TC-513`、`TC-514`、`TC-515`、`TC-EDGE-501`、`TC-EDGE-502`、`TC-EDGE-503`、`TC-EDGE-504`、`TC-EDGE-505`、`TC-EDGE-506`。

## 6. 实现任务映射

| TASK | 需求/技术来源 | 验收与测试 | 状态 |
|---|---|---|---|
| `TASK-501` | `REQ-516`、`NFR-506`、`ADR-004` | `AC-508`、`TC-514` | completed |
| `TASK-502` | `REQ-501/502/505/507/508/513`、`API-501`—`API-506` | 契约覆盖 `AC-501/003/007` | completed |
| `TASK-503` | `REQ-503`—`REQ-511`、`NFR-502/505` | `AC-501/004/005`、`TC-503/505/506/509/510/513`、数据库边界反例 | completed |
| `TASK-504` | `REQ-501`—`REQ-504`、`NFR-501` | `TC-501/502/509/511` | completed |
| `TASK-505` | `REQ-503`—`REQ-513`、`NFR-501`—`NFR-504` | `AC-501/002/004/006/007`、授权/失败/性能测试 | completed |
| `TASK-506` | `REQ-507/509/513`、`API-506` | `AC-503`、`TC-507/508/512` | completed |
| `TASK-507` | `REQ-501/505`—`REQ-509/513/516`、`NFR-506` | `AC-501/002/003/008`、`TC-501`—`TC-504`、`TC-507/508/514` | completed |
| `TASK-508` | 全部 `REQ-501`—`REQ-516`、`NFR-501`—`NFR-506` | 全部 `AC-501`—`AC-508`、`TC-501`—`TC-515`、`TC-EDGE-501`—`506` | completed |
| `TASK-509` | 全部 Gate、`ADR-004` | 三视角 review 与 Release Gate 候选 | completed |
