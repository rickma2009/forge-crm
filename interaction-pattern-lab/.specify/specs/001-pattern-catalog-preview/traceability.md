# 追溯矩阵：模式目录与交互预览

| 业务目标 | 业务需求/NFR | 功能 | 页面 | 用户故事 | 验收 | 测试 | 实现任务 | 状态 |
|---|---|---|---|---|---|---|---|---|
| `BUS-001` | `REQ-001` | `FR-001` | `PAGE-001` | `US-001` | `AC-001`、`AC-002`、`AC-012` | `TC-001`、`TC-002`、`TC-003`、`TC-013`、`TC-EDGE-001` | `TASK-002`、`TASK-009` | implementation |
| `BUS-001` | `REQ-002` | `FR-001`、`FR-002` | `PAGE-001` | `US-001` | `AC-002`、`AC-003` | `TC-002`、`TC-003`、`TC-004` | `TASK-002`、`TASK-003` | implementation |
| `BUS-001` | `REQ-003` | `FR-003` | `PAGE-001` | `US-002` | `AC-004`、`AC-005`、`AC-011` | `TC-005`、`TC-006`、`TC-012`、`TC-EDGE-004` | `TASK-004`—`TASK-006` | implementation |
| `BUS-001` | `REQ-004` | `FR-003`、`FR-005` | `PAGE-001` | `US-002` | `AC-007`、`AC-008` | `TC-008`、`TC-009`、`TC-EDGE-003` | `TASK-003`—`TASK-005`、`TASK-007` | implementation |
| `BUS-002` | `REQ-005` | `FR-004` | `PAGE-001` | `US-003` | `AC-006`、`AC-011` | `TC-007`、`TC-012`、`TC-EDGE-002` | `TASK-002`、`TASK-006` | implementation |
| `BUS-001` | `REQ-006` | `FR-001`—`FR-003` | `PAGE-001` | `US-001`、`US-002` | `AC-001`、`AC-004`、`AC-005`、`AC-012` | `TC-001`、`TC-005`、`TC-006`、`TC-013` | `TASK-002`、`TASK-004`、`TASK-005`、`TASK-009` | implementation |
| `BUS-002` | `REQ-009` | `FR-004` | `PAGE-001` | `US-003` | `AC-006` | `TC-007` | `TASK-002`、`TASK-006` | implementation |
| `BUS-002` | `NFR-001` | `FR-001`—`FR-005` | `PAGE-001` | `US-001`—`US-003` | `AC-009`、`AC-012` | `TC-010`、`TC-013` | `TASK-007`、`TASK-009` | implementation |
| `BUS-001` | `NFR-002` | `FR-001`—`FR-005` | `PAGE-001` | `US-001`—`US-003` | `AC-010`、`AC-012` | `TC-011`、`TC-013` | `TASK-007`、`TASK-009` | implementation |
| `BUS-001` | `NFR-003` | `FR-003`、`FR-005` | `PAGE-001` | `US-002` | `AC-008` | `TC-009`、`TC-EDGE-003` | `TASK-001`、`TASK-007` | implementation |
| `BUS-002` | `NFR-004` | `FR-004` | `PAGE-001` | `US-003` | `AC-006` | `TC-007`、`TC-EDGE-002` | `TASK-002`、`TASK-006` | implementation |
| `BUS-002` | `NFR-005` | `FR-002`—`FR-004` | `PAGE-001` | `US-001`—`US-003` | `AC-003` | `TC-004` | `TASK-002`、`TASK-003`、`TASK-008` | implementation-reviewed |

## 完整性检查

- [x] 每个本切片 REQ/NFR 都有 AC；
- [x] 每个 AC 都有 TC；
- [x] Business Gate 证据可定位；
- [x] 每个本切片 REQ/NFR 已映射稳定 TASK；
- [x] 自动测试、构建和真实浏览器执行证据已记录在 `testcases.md`、`review.md` 与 `evidence/`。
