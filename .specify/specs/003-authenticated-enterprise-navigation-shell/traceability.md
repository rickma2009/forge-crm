# 追溯矩阵：认证式企业导航壳层

> 变更提示：本矩阵对应 `REQSRC-014/015/016` 批准的纯前端边界。`REQSRC-017` 已重新打开 Business、Specification 与 Architecture Gate；新版追溯将在 `requirements/004-database-backed-navigation-rbac/` 获批后建立，不在本文件静默覆盖历史链。

## 1. 上游业务基线到切片需求

| 业务目标 | 上游需求 | 切片需求 |
|---|---|---|
| `BUS-007`、`BUS-008` | `REQ-317`、`REQ-321`、`NFR-303` | `REQ-401`、`REQ-402`、`REQ-415`、`NFR-404` |
| `BUS-007` | `REQ-312`—`REQ-316`、`NFR-301`、`NFR-302` | `REQ-403`—`REQ-410`、`NFR-401`、`NFR-402` |
| `BUS-008` | `REQ-318`—`REQ-320` | `REQ-411`—`REQ-414`、`NFR-403` |
| `BUS-005`、`BUS-006` | `REQ-302`、`REQ-306`、`REQ-311`、`NFR-305`、`NFR-306` | `REQ-404`、`REQ-410`、`NFR-405`、`NFR-406` |
| `BUS-007` | `REQ-313`、`REQ-314`、`REQ-315`、`NFR-304` | `REQ-404`、`REQ-406`、`REQ-409`、`REQ-410`、`NFR-402` |
| `BUS-008` | `REQ-319` | `REQ-407`、`REQ-411`、`REQ-413` |

## 2. 切片行为到测试

| 目标 | 需求/NFR | 用户故事 | 验收 | 测试 | 当前状态 |
|---|---|---|---|---|---|
| `BUS-008` | `REQ-401`、`REQ-402` | `US-401` | `AC-401` | `TC-401`—`TC-403` | designed-not-run |
| `BUS-007` | `REQ-403`、`REQ-405`、`REQ-406` | `US-402` | `AC-402` | `TC-404`—`TC-406`、`TC-EDGE-401` | designed-not-run |
| `BUS-007` | `REQ-404`、`REQ-408` | `US-402` | `AC-403` | `TC-404`、`TC-407` | designed-not-run |
| `BUS-007`、`BUS-008` | `REQ-407` | `US-402`、`US-404` | `AC-404` | `TC-408`、`TC-EDGE-402` | designed-not-run |
| `BUS-007` | `REQ-409` | `US-402` | `AC-405` | `TC-409`、`TC-EDGE-403` | designed-not-run |
| `BUS-006`、`BUS-007` | `REQ-410` | `US-405` | `AC-406` | `TC-410` | designed-not-run |
| `BUS-008` | `REQ-411`、`REQ-412` | `US-403` | `AC-407` | `TC-411`、`TC-415` | designed-not-run |
| `BUS-008` | `REQ-411`、`REQ-413` | `US-404` | `AC-408` | `TC-412`、`TC-415`、`TC-EDGE-405` | designed-not-run |
| `BUS-008` | `REQ-411`、`REQ-414` | `US-404` | `AC-409` | `TC-413`、`TC-EDGE-404` | designed-not-run |
| `BUS-008` | `REQ-411`、`REQ-415` | `US-401`、`US-404` | `AC-410` | `TC-403`、`TC-414`、`TC-417`、`TC-EDGE-406` | designed-not-run |
| `BUS-007`、`BUS-008` | `REQ-401`—`REQ-415` | `US-401`—`US-405` | `AC-411` | `TC-416` | designed-not-run |
| `BUS-007` | `NFR-401` | `US-402` | `AC-402` | `TC-404`、`TC-405` | designed-not-run |
| `BUS-007`、`BUS-008` | `NFR-402` | `US-401`、`US-402`、`US-404` | `AC-405`、`AC-411` | `TC-409`、`TC-416`、`TC-EDGE-403` | designed-not-run |
| `BUS-008` | `NFR-403` | `US-403`、`US-404` | `AC-407`—`AC-410` | `TC-408`、`TC-411`—`TC-415`、`TC-EDGE-401`、`TC-EDGE-402` | designed-not-run |
| `BUS-008` | `NFR-404` | `US-401`、`US-404` | `AC-401`、`AC-410` | `TC-402`、`TC-403`、`TC-414`、`TC-417` | designed-not-run |
| `BUS-005`、`BUS-006` | `NFR-405` | `US-405` | `AC-406` | `TC-404`、`TC-418` | designed-not-run |
| `BUS-006` | `NFR-406` | `US-405` | `AC-406` | `TC-418` | designed-not-run |

## 3. 完整性检查

- [x] 每个 P0/P1 REQ/NFR 都有 AC；
- [x] 每个 AC 都有至少一个 TC；
- [x] Business Gate 证据定位到 `REQSRC-014`；
- [x] 来源候选定位到 `UID-001`，未把来源项目实现当成目标架构；
- [x] 测试均标记 `designed-not-run`，未虚构执行结果；
- [x] Specification Gate 已由 `REQSRC-015` 批准；
- [x] Architecture 已由 `REQSRC-016` 批准；
- [x] TASK 已按批准 Plan 创建并进入实施；
- [ ] 实现与验证证据随 TASK 完成逐项登记。

## 4. Architecture 候选映射

| 需求/NFR | 技术契约/决策 | 当前状态 |
|---|---|---|
| `REQ-401`、`REQ-402`、`NFR-404` | `AUTH-001`、Showcase 内存 Session、`ADR-003` | architecture-approved |
| `REQ-403`—`REQ-410`、`NFR-401`、`NFR-402` | `REG-001`、`PORTAL-001`、`NAV-001`、`NAV-002`、页面 Adapter、作用域令牌 | architecture-approved |
| `REQ-411`—`REQ-414`、`NFR-403` | `AUTHZ-001`、`AUTHZ-002`、统一 Access Resolver | architecture-approved |
| `REQ-415`、`NFR-404` | 扩展隔离扫描、内存 fixture、`RESOURCE-001` | architecture-approved |
| `NFR-405`、`NFR-406` | Registry 来源引用、并行 Hash 入口、`ADR-003` | architecture-approved |

## 5. 实现任务映射

| TASK | 需求/技术来源 | 验收与测试 | 当前状态 |
|---|---|---|---|
| `TASK-401` | `REQ-403`—`REQ-410`、`REQ-412`—`REQ-415`、`NFR-403`、`NFR-405`、`REG-001` | `AC-402`—`AC-410`、`TC-404`、`TC-411`、`TC-415`、`TC-418`、`TC-EDGE-401` | in-progress |
| `TASK-402` | `REQ-401`、`REQ-407`—`REQ-414`、`NFR-403`、`NFR-404`、`AUTH-001`、`AUTHZ-001/002`、`NAV-001/002`、`PORTAL-001` | `AC-401`、`AC-404`、`AC-407`—`AC-410`、`TC-401/402/408/411`—`415`、`TC-EDGE-402` | pending |
| `TASK-403` | `REQ-402`、`REQ-411`、`NFR-404`、`NFR-406`、`PORTAL-001`、`ADR-003` | `AC-401`、`AC-410`、`TC-403`、`TC-414`、`TC-418` | pending |
| `TASK-404` | `REQ-401`—`REQ-409`、`REQ-411`—`REQ-415`、`NFR-401`—`NFR-404` | `AC-401`—`AC-405`、`AC-407`—`AC-411`、`TC-401`—`TC-409`、`TC-411`—`TC-417`、`TC-EDGE-402`—`404` | pending |
| `TASK-405` | `REQ-410`—`REQ-415`、`NFR-403`、`NFR-404`、`PAGE-001`、`RESOURCE-001` | `AC-406`—`AC-410`、`TC-410`—`TC-415`、`TC-EDGE-405/406` | pending |
| `TASK-406` | 全部 `REQ-*`、`NFR-401`—`NFR-406` | `AC-401`—`AC-411`、`TC-401`—`TC-418`、`TC-EDGE-401`—`406` | pending |
| `TASK-407` | 全部需求、Gate、`ADR-003`、`UID-001` | 三视角评审与全量复验 | pending |
