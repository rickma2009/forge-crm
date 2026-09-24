# 追溯矩阵

| 目标 | 用户故事 | 需求 | 验收 | 测试 | 技术 | 任务 | 证据 | 状态 |
|---|---|---|---|---|---|---|---|---|
| `BUS-020` | `US-1301` | `REQ-1301`、`REQ-1302`、`REQ-1306` | `AC-1301`、`AC-1302` | `TC-1301`、`TC-1303`、`TC-1305` | `API-1301` | `TASK-1301`、`TASK-1302`、`TASK-1303`、`TASK-1304` | Registry、Seed、OrganizationService/Page；自动测试通过 | implemented-db-pending |
| `BUS-020` | `US-1301` | `REQ-1303`、`REQ-1304`、`REQ-1305`、`REQ-1307` | `AC-1303`、`AC-1304` | `TC-1302`、`TC-1304`、`TC-1306`、`TC-1308` | `API-1302`、`API-1303` | `TASK-1301`、`TASK-1302`、`TASK-1303`、`TASK-1304`、`TASK-1306`、`TASK-1307`、`TASK-1308` | Prisma、migration、contracts、service；DB 实测待完成 | partial |
| `BUS-020` | `US-1301` | `REQ-1308` | `AC-1305` | `TC-1307` | `UI-1301` | `TASK-1301`、`TASK-1305`、`TASK-1306` | AccessAdminPages 组件测试通过 | implemented |

## 完整性

- 所有 `REQ-1301`—`REQ-1308` 均进入实现和任务追溯。
- 所有 `AC-1301`—`AC-1305` 均由至少一个 `TC-1301`—`TC-1308` 覆盖。
- Release 保持未批准，数据库实测、浏览器证据和独立评审不得虚构。

## 全局整改追溯

UIAUDIT-20260923 → REQ-STYLE-07 → 本切片当前有效约定 → 全局页面样式 testcases.md / audit.md；具体公共实现及本切片接入位置由 audit.md 登记。


## 2026-09-24 统一树形工作区（当前有效补充）
来源：`.specify/sources/2026-09-24-tree-workspace/request.md`。REQ-TREE-WORKSPACE-01 / NFR-TREE-01 / AC-TREE-01：本模块的左树右内容区域调用 TreeWorkspace，统一搜索/工具/新增、无装饰图标和业务徽标的紧凑节点、授权菜单、总数与调宽、侧边中点收放。替代原局部树容器；业务API/权限/编辑保护保持。详细最新需求见 `.specify/requirements/global-page-style/requirement.md` 和 UI-TREE-WORKSPACE-01。
TC-TREE-01：搜索子节点保留祖先、全展开/收起、刷新、键盘选择；TC-TREE-02：操作菜单权限/回调、总数/调宽/收放及右侧状态保持；TC-TREE-03：只读与空态、桌面/窄屏布局。组件与页面测试及浏览器脚本为验证入口，实际执行结果见全局需求 verification-tree.md。
Gate：本次用户开发与全系统接入指令授权本UI变更，未扩展后端数据/权限；未执行发布。标准只复用布局/交互，业务特有控制不可直接跨模块复用。
