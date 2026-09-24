# Traceability: 008

2026-09-23：`UIRULE-20260923-list-record-actions` → 全局 `UI-LIST-01` → `FR-514` / `REQ-810` → `AC-810` → `TC-810`。本次交付为规则和当前态文档更新；页面适配与新验收执行待核查，历史 TASK-635/636 的验证不能替代此次证据。

| 业务/功能 | 需求 | 验收 | 测试 | 任务 |
|---|---|---|---|---|
| `BUS-016` / `FR-508` | `REQ-801`、`REQ-802`、`NFR-801` | `AC-507`、`AC-508` | `TC-801`,`TC-807` | `TASK-631`,`TASK-632`,`TASK-633` |
| `BUS-016` / `FR-509` | `REQ-803`、`REQ-804`、`REQ-805`、`NFR-801` | `AC-507`、`AC-509` | `TC-802`,`TC-803`,`TC-804`,`TC-805` | `TASK-631`,`TASK-632`,`TASK-634` |
| `BUS-016` / `FR-510` | `REQ-806` | `AC-508` | `TC-806` | `TASK-632`,`TASK-633` |
| `BUS-016` / `FR-511—516` | `REQ-807`、`REQ-808`、`REQ-809`、`REQ-810`、`REQ-811`、`REQ-812` | `AC-507`、`AC-509` | `TC-808`,`TC-809`,`TC-810`,`TC-811` | `TASK-635`,`TASK-636` |

## 全局整改追溯

UIAUDIT-20260923 → REQ-STYLE-01/05/09 → 本切片当前有效约定 → 全局页面样式 testcases.md / audit.md；具体公共实现及本切片接入位置由 audit.md 登记。

### UIRULE-20260924-detail-workspace 当前有效详情样式

REQ-DETAIL-001 / AC-DETAIL-001 / TC-DETAIL-001：遵循总样式 UI-DETAIL-01，替代旧独立摘要卡片/record-tabs/内部卡片组合。使用公共头部（返回+标题、带标签摘要）、客户式下划线Tab及平铺正文；无Tab不强加。适用客户、商机、报价，保留权限、离开保护和数据操作。验收返回目标、Tab箭头/Home/End、手机布局、表格滚动和无内部卡片边框。实现对应 DetailWorkspace.tsx、三个详情页及组件/浏览器回归。Specification按用户明确呈现变更更新并授权本地实施；不涉及数据库和Architecture变更，Release状态不变。
