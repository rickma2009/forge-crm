# 追溯矩阵：批量分配与部分成功验证

## 上游业务基线到切片需求

| 上游业务需求 | 切片需求 |
|---|---|
| `REQ-201` | `REQ-301` |
| `REQ-205` | `REQ-302` |
| `REQ-206` | `REQ-303` |
| `REQ-203` | `REQ-304` |
| `NFR-202` | `REQ-304` |
| `REQ-213`、`REQ-214` | `REQ-306` |
| `REQ-214`、`REQ-215` | `REQ-307` |
| `REQ-216` | `REQ-308` |
| `REQ-217` | `REQ-309` |
| `REQ-218` | `REQ-310` |
| `REQ-211` | `REQ-313` |

## 切片行为到测试

| 业务目标 | 需求/NFR | 用户故事 | 验收标准 | 测试用例 | 当前状态 |
|---|---|---|---|---|---|
| `BUS-001` | `REQ-301` | `US-201` | `AC-301` | `TC-301` | specified |
| `BUS-001` | `REQ-302` | `US-201` | `AC-302` | `TC-302`、`TC-303` | specified |
| `BUS-002` | `REQ-303` | `US-201` | `AC-303` | `TC-304`、`TC-318`、`TC-EDGE-303` | specified |
| `BUS-002` | `REQ-304` | `US-201`、`US-203` | `AC-304` | `TC-305` | specified |
| `BUS-004` | `REQ-305` | `US-201`、`US-203` | `AC-305` | `TC-306` | specified |
| `BUS-004` | `REQ-306` | `US-202` | `AC-306`、`AC-307` | `TC-307`、`TC-308` | specified |
| `BUS-004` | `REQ-307` | `US-202` | `AC-307`、`AC-308` | `TC-308`、`TC-309` | specified |
| `BUS-004` | `REQ-308` | `US-202` | `AC-309` | `TC-310`、`TC-EDGE-301`、`TC-EDGE-302` | specified |
| `BUS-004` | `REQ-309` | `US-202` | `AC-310` | `TC-311`、`TC-EDGE-304` | specified |
| `BUS-004` | `REQ-310` | `US-202` | `AC-311`、`AC-312` | `TC-312`、`TC-313` | specified |
| `BUS-004` | `REQ-311` | `US-202` | `AC-313` | `TC-314` | specified |
| `BUS-004` | `REQ-312` | `US-202`、`US-203` | `AC-314` | `TC-314`、`TC-317` | specified |
| `BUS-004` | `REQ-313` | `US-203` | `AC-314` | `TC-316` | specified |
| `BUS-001`、`BUS-004` | `NFR-301` | `US-201`—`US-203` | `AC-314` | `TC-315`、`TC-EDGE-304` | specified |
| `BUS-004` | `NFR-302` | `US-202`、`US-203` | `AC-313`、`AC-314` | `TC-314`、`TC-317` | specified |
| `BUS-004` | `NFR-303` | `US-203` | `AC-314` | `TC-316` | specified |
| `BUS-001`、`BUS-002` | `NFR-304` | `US-201`、`US-203` | `AC-301`、`AC-304`、`AC-305` | `TC-301`、`TC-305`、`TC-306`、`TC-EDGE-303` | specified |
| `BUS-001` | `NFR-305` | `US-201` | `AC-303`、`AC-305` | `TC-306`、`TC-318` | specified |

## 完整性检查

- [x] 每个本切片 REQ/NFR 都有 AC；
- [x] 每个 AC 都有 TC；
- [x] Business Gate 证据定位到 `REQSRC-009`；
- [x] Specification Gate 已由 `REQSRC-010` 批准；
- [x] Architecture Gate 已由 `REQSRC-011` 批准；
- [x] TASK 已按批准的 Plan 生成并进入实施；
- [x] 自动化测试已真实执行通过，浏览器验收仍待执行；
- [x] 目录计数已由 `REQSRC-012` 纠正为 103 项。
