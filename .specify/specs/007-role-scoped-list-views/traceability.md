# Traceability: 007

2026-09-23：UIRULE-20260923-list-workspace → FR-506/507 → REQ-705/706 → AC-707 / AC-708 → TC-702 / TC-707 → 全局 UI-LIST-VIEW-01。此前仅登记规范；本轮已完成页面/服务适配，最新证据见全局样式 audit.md，不能沿用历史发布批准。

| 业务/功能 | 需求 | 验收 | 测试 | 任务 |
|---|---|---|---|---|
| `BUS-015` / `FR-505` | `REQ-701`、`REQ-702`、`REQ-705`、`NFR-701` | `AC-505` | `TC-701`,`TC-702`,`TC-705` | `TASK-621`,`TASK-622`,`TASK-624` |
| `BUS-015` / `FR-506` | `REQ-703`、`REQ-704`、`REQ-705`、`NFR-701` | `AC-506` | `TC-703`,`TC-704`,`TC-705` | `TASK-622`,`TASK-624` |
| `BUS-015` / `FR-507` | `REQ-706` | `AC-505` | `TC-706` | `TASK-623`,`TASK-624` |

## 全局整改追溯

UIAUDIT-20260923 → REQ-STYLE-05/09 → 本切片当前有效约定 → 全局页面样式 testcases.md / audit.md；具体公共实现及本切片接入位置由 audit.md 登记。

| `BUS-015` / `FR-506`、`FR-507` | `REQ-705`、`REQ-706` | `AC-707`、`AC-708` | `TC-702`、`TC-707` | `TASK-622`、`TASK-623`、`TASK-624` |

REQ-VIEW-ALIGN-001 / AC-VIEW-ALIGN-001 / TC-VIEW-ALIGN-001：依UIRULE-20260924-view-selector及UI-VIEW-CONTROL-01，当前视图/下拉/设置全部通过ListViewSelector组合，32px外框对齐。覆盖选项回调、设置权限、加载空态及浏览器桌面/窄屏三段几何比较；源为公共组件与两处接入。用户明确指令授权本地实施，无数据架构变化。
