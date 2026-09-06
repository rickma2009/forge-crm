# 切片 003 真实浏览器验证记录

> 执行时间：2026-09-03 19:04—19:08（Asia/Shanghai）
> 工具：`agent-browser`
> 地址：`http://127.0.0.1:5173/#/showcase/overview`

## 已验证结果

| 场景 | 结果 | 证据 |
|---|---|---|
| 1440×900 admin 初态 | 通过；220px 导航、主区默认折叠、系统区默认展开、概览唯一激活 | [admin-overview-1440.png](admin-overview-1440.png)；交互快照含全部 7 个主菜单与 6 个管理入口 |
| 1280×800 viewer 资源页 | 通过；主菜单完整，管理区只显示资源目录，维护/导出禁用且有说明 | [viewer-resource-1280.png](viewer-resource-1280.png) |
| 1280×540 低高度 | 通过；系统管理导航实际 `213.6875px / 540px = 39.6%`，低于 45%；滚动后资源目录可见 | `get box`、`scrollintoview`、`is visible = true` |
| 刷新清理 | 通过；admin 登录后 reload 回到“选择演示身份” | reload 后可访问性快照 |
| 浏览器存储 | 通过；`agent-browser storage local` 返回 `No storage entries` | 命令输出 |
| 网络隔离 | 通过；请求只有 `127.0.0.1:5173` 的 Document、Vite、React 与本地源码资源，无业务 API/远端资源 | `agent-browser network requests` |
| 键盘登录 | 通过；聚焦账号、键入 admin、Enter 后进入概览 | 键盘操作记录 |
| 折叠搜索焦点 | 通过；Enter 打开后 active element 为“搜索菜单”，Escape 后为“打开菜单搜索” | `document.activeElement` 读取结果 |

## 范围说明

- 本记录是本地实现验证证据，不代表 Release Gate 已批准；
- 未部署、未连接真实认证、后台、数据库或远端资源；
- 两张截图仅用于切片评审，不晋升为 `_methodology/` 正式资产。
