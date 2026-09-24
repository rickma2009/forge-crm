# Test Cases: 005

| ID | 验收 | 覆盖 | 预期 |
|---|---|---|---|
| `TC-501` | `AC-501` | 单树菜单 | API 与 UI 不存在管理专区，系统管理按普通排序出现 |
| `TC-502` | `AC-502` | 工具栏 | 跨页面常驻、无搜索框、空提醒明确、退出真实生效 |
| `TC-503` | `AC-503` | 页签基础 | 菜单点击打开/激活页签，URL 同步，首页不可关闭 |
| `TC-504` | `AC-503` | 页签批量动作 | 刷新、关闭其他/右侧/全部和相邻接续正确 |
| `TC-505` | `AC-501`、`AC-503` | 权限失败 | viewer 不可见页面不能通过 URL/搜索/页签访问 |
| `TC-506` | `AC-503` | 上限 | 第 13 个页签被拒绝，既有页签不丢失 |


### 2026-09-24 工作区菜单字体修正
REQ-TAB-FONT-01 → UI-TAB-01 → AC-TAB-FONT-01 / TC-TAB-FONT-01：右键菜单字体族/字号与路由 Tab 标题一致，当前为全局12px，Portal 不得退回 body 默认字号。浏览器比较菜单各项（含禁用/焦点）与Tab的 computed fontFamily/fontSize；原有六项动作不变。来源 `.specify/sources/2026-09-24-tab-menu-font/original.md`；当前态需求见 global-page-style/requirement.md。用户直接授权本样式修正，无 Architecture 数据/安全变更。
