# Traceability: 005

| 业务/功能 | 需求 | 验收 | 测试 | 任务 |
|---|---|---|---|---|
| `BUS-007`、`BUS-012` / `FR-501` | `REQ-501`、`REQ-502`、`NFR-501` | `AC-501` | `TC-501`,`TC-505` | `TASK-601`,`TASK-602`,`TASK-605` |
| `BUS-007` / `FR-502` | `REQ-503` | `AC-502` | `TC-502` | `TASK-603`,`TASK-605` |
| `BUS-007` / `FR-503` | `REQ-504`、`REQ-505`、`NFR-501` | `AC-503` | `TC-503`,`TC-504`,`TC-505`,`TC-506` | `TASK-604`,`TASK-605` |


### 2026-09-24 工作区菜单字体修正
REQ-TAB-FONT-01 → UI-TAB-01 → AC-TAB-FONT-01 / TC-TAB-FONT-01：右键菜单字体族/字号与路由 Tab 标题一致，当前为全局12px，Portal 不得退回 body 默认字号。浏览器比较菜单各项（含禁用/焦点）与Tab的 computed fontFamily/fontSize；原有六项动作不变。来源 `.specify/sources/2026-09-24-tab-menu-font/original.md`；当前态需求见 global-page-style/requirement.md。用户直接授权本样式修正，无 Architecture 数据/安全变更。

| REQ-DEFAULT-AGENT | UIRULE-20261009-default-agent | AC-DEFAULT-AGENT / TC-DEFAULT-AGENT | ShowcaseApp.tsx loadNavigation / openGroups | 用户授权实施；类型检查见交付，浏览器登录验收待执行 |

复用候选：根据授权导航选择默认入口并提供有权限回退；项目专属为Agent路径与数字员工菜单名称。不抽取公共组件，本次仅两个入口状态变更。
