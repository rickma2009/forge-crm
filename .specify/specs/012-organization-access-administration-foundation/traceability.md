# Traceability：组织与访问管理基础

| 目标 | 用户故事 | 需求 | 验收 | 测试 | 技术 | 任务 | 证据 | 状态 |
|---|---|---|---|---|---|---|---|---|
| `BUS-018` | `US-1205` | `REQ-1201`、`REQ-1202`、`REQ-1203`、`REQ-1204`、`REQ-1205`、`NFR-DATA-1201`、`NFR-OBS-1201` | `AC-1201`、`AC-1202`、`AC-1203`、`AC-1214` | `TC-1201`、`TC-1202`、`TC-1203`、`TC-1217`、`TC-EDGE-1206`、`TC-EDGE-1207` | `ADR-006` | `TASK-1201`、`TASK-1202`、`TASK-1203`、`TASK-1206` | migration mapping 3/3；DB integration 15/15；Seed repeat PASS | partial-restore-pending |
| `BUS-018` | `US-1201` | `REQ-1210`、`REQ-1211`、`REQ-1212`、`REQ-1213`、`NFR-SEC-1201`、`NFR-AUD-1201` | `AC-1204`、`AC-1205`、`AC-1213` | `TC-1204`、`TC-1205`、`TC-1216`、`TC-EDGE-1201`、`TC-EDGE-1205` | `API-1201`—`API-1203`、`ADR-006` | `TASK-1201`、`TASK-1204`、`TASK-1205`、`TASK-1206` | API integration admin/viewer PASS；Web component tests PASS | implemented-browser-pending |
| `BUS-018` | `US-1202` | `REQ-1214`、`REQ-1215`、`REQ-1216`、`REQ-1217`、`REQ-1218`、`REQ-1219`、`REQ-1220`、`NFR-DATA-1201` | `AC-1206`、`AC-1207`、`AC-1211` | `TC-1206`、`TC-1207`、`TC-1208`、`TC-1209`、`TC-1214`、`TC-EDGE-1202`、`TC-EDGE-1204`、`TC-EDGE-1208` | `API-1204`—`API-1210`、`ADR-006` | `TASK-1201`、`TASK-1202`、`TASK-1204`、`TASK-1205`、`TASK-1206` | DB constraints PASS；role/member API + component tests PASS | implemented-browser-pending |
| `BUS-018` | `US-1203` | `REQ-1206`、`REQ-1207`、`REQ-1208`、`REQ-1209`、`REQ-1221`、`REQ-1222`、`REQ-1223`、`REQ-1224`、`NFR-DATA-1201` | `AC-1208`、`AC-1209`、`AC-1210`、`AC-1211` | `TC-1210`、`TC-1211`、`TC-1212`、`TC-1213`、`TC-1214`、`TC-EDGE-1203` | `API-1211`—`API-1213`、`ADR-006` | `TASK-1201`、`TASK-1202`、`TASK-1204`、`TASK-1205`、`TASK-1206` | permission API、原子替换、roleVersion、系统角色只读实现；自动测试 PASS | implemented-manual-matrix-pending |
| `BUS-018` | `US-1201`、`US-1204` | `REQ-1225`、`REQ-1226`、`REQ-1227`、`REQ-1228`、`REQ-1229`、`NFR-SEC-1201`、`NFR-AUD-1201`、`NFR-OBS-1201` | `AC-1212`、`AC-1213`、`AC-1214` | `TC-1215`、`TC-1216`、`TC-1217`、`TC-EDGE-1207` | `API-1201`—`API-1213`、`ADR-006` | `TASK-1203`、`TASK-1204`、`TASK-1205`、`TASK-1206` | viewer read 200/write 403；审计同事务；授权默认拒绝集成测试 PASS | implemented |
| `BUS-019` | `US-1201`、`US-1202`、`US-1203`、`US-1204` | `REQ-1230`、`NFR-PERF-1201`、`NFR-A11Y-1201`、`NFR-UI-1201`、`NFR-TRACE-1201` | `AC-1215`、`AC-1216`、`AC-1217` | `TC-1218`、`TC-1219`、`TC-1220`、`TC-1221`、`TC-EDGE-1205` | `API-1201`—`API-1213`、`ADR-006` | `TASK-1205`、`TASK-1206`、`TASK-1207` | `pnpm verify` PASS；隔离 37 files；全局样式复用；无浏览器/性能实测 | partial |

## 完整性检查

- [x] 每个 P0/P1 REQ/NFR 均有关联 AC
- [x] 每个 AC 均有关联 TC
- [x] BUS、US、REQ/NFR、AC、TC 已形成规格阶段追溯
- [x] API/ADR 已进入 Architecture Gate 草案
- [x] TASK 已在 Architecture Gate 批准后创建并逐项追溯
- [x] 实现与自动验证证据已登记
- [ ] 恢复演练、规定规模性能、带身份浏览器与独立评审仍待补齐
