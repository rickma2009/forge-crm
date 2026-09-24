# 追溯矩阵

来源：REQSRC-051 → REQSRC-052 → REQSRC-053；用户授权按推荐决策连续本地实施。以下验收行未作为整体通过声明；部分实现证据见末尾映射与 implementation-evidence.md。

| 业务 | 需求 | 验收 | 测试 | 状态 |
|---|---|---|---|---|
| BUS-021 | REQ-1501 | AC-1501 | TC-1501 | designed-not-run |
| BUS-021 | REQ-1502 | AC-1502 | TC-1502 | designed-not-run |
| BUS-021 | REQ-1503 | AC-1503 | TC-1503 | designed-not-run |
| BUS-021 | REQ-1504 | AC-1504 | TC-1504 | designed-not-run |
| BUS-021 | REQ-1505 | AC-1505 | TC-1505 | designed-not-run |
| BUS-021 | REQ-1506 | AC-1506 | TC-1506 | designed-not-run |
| BUS-021 | REQ-1507 | AC-1507 | TC-1507 | designed-not-run |
| BUS-021 | REQ-1508 | AC-1508 | TC-1508 | designed-not-run |
| BUS-021 | REQ-1509 | AC-1509 | TC-1509 | designed-not-run |
| BUS-021 | REQ-1510 | AC-1510 | TC-1510 | designed-not-run |
| BUS-021 | REQ-1511 | AC-1511 | TC-1511 | designed-not-run |
| BUS-021 | REQ-1512 | AC-1512 | TC-1512 | designed-not-run |
| BUS-021 | REQ-1513 | AC-1513 | TC-1513 | designed-not-run |
| BUS-021 | REQ-1514 | AC-1514 | TC-1514 | designed-not-run |
| BUS-021 | REQ-1515 | AC-1515 | TC-1515 | designed-not-run |
| BUS-021 | REQ-1516 | AC-1516 | TC-1516 | designed-not-run |
| BUS-021 | REQ-1517 | AC-1517 | TC-1517 | designed-not-run |
| BUS-021 | REQ-1518 | AC-1518 | TC-1518 | designed-not-run |
| BUS-021 | REQ-1519 | AC-1519 | TC-1519 | designed-not-run |
| BUS-021 | REQ-1520 | AC-1520 | TC-1520 | designed-not-run |
| BUS-021 | NFR-SEC-1501 | AC-1518 | TC-1521 | designed-not-run |
| BUS-021 | REQ-1521 | AC-1521 | TC-1525 | designed-not-run |
| BUS-021 | REQ-1522 | AC-1522 | TC-1526 | designed-not-run |
| BUS-021 | NFR-DATA-1501 | AC-1520 | TC-1522 | designed-not-run |
| BUS-021 | NFR-UI-1501 | AC-1519 | TC-1523 | designed-not-run |
| BUS-021 | NFR-PERF-1501 | AC-1501 | TC-1524 | designed-not-run |

## 实施任务映射（部分完成，不替代全部验收）

| 任务 | 需求范围 | 技术接口 / 决策 | 当前实现与证据 |
|---|---|---|---|
| TASK-1501 | REQ-1501—REQ-1505 | API-1501 / ADR-015 | role-management.service、role-tree、role-contract；真实 HTTP 防环/冲突/保护验证 |
| TASK-1502 | REQ-1501—REQ-1504、REQ-1519 | API-1501 / ADR-015 | RoleWorkspace；组件测试通过，真实浏览器尺寸验收待登录 |
| TASK-1503 | REQ-1506、REQ-1508、REQ-1518 | API-1502 / ADR-015 | AccessService batchMembers、RoleMembers、RolePermissions；原子批量与撤权接口验证 |
| TASK-1504 | REQ-1507 | API-1504 / ADR-015 | role-subject.service/controller、role-scope、RoleSubjects；群组授权/离组/停用真实接口，组织层级纯函数测试；组织完整 HTTP 场景待补 |
| TASK-1505 | REQ-1509—REQ-1511、REQ-1521、REQ-1522 | API-1503 / ADR-015 | RolePolicyService + CustomerService；默认拒绝/字段响应/查询侧通道通过；完整目录与子表字段待补 |
| TASK-1506 | REQ-1512、REQ-1513 | API-1503 / ADR-015 | 发布/历史/回滚追加版本通过；视图分配通过，导出未完成 |
| TASK-1507 | REQ-1514—REQ-1517 | API-1504 / ADR-015 | 旧范围只读边界已表达；仪表盘/组件/分类真实消费未完成 |
| TASK-1508 | REQ-1520、NFR-SEC-1501、NFR-DATA-1501、NFR-UI-1501、NFR-PERF-1501 | ADR-015 | 增量备份、隔离恢复、单元与接口回归已执行；完整对账、性能、浏览器 QA、Release 包待完成 |
## REQSRC-057 两页签增量追溯

| 来源 | 验收 | 测试 | 实现与结果 |
|---|---|---|---|
| REQSRC-057 / two-tab-refinement.md | AC-1551 | TC-1551 | RoleWorkspace.tsx；组件与真实角色 API 测试通过 |
| REQSRC-057 / two-tab-refinement.md | AC-1552 | TC-1552 | RoleUserPanel.tsx；分页、添加、移除、失败反馈测试通过 |
| REQSRC-057 / two-tab-refinement.md | AC-1553 | TC-1553 | RolePermissionTree.tsx、permission-catalog API；组件与真实 API 测试通过 |
| REQSRC-057 / two-tab-refinement.md | AC-1554 | TC-1554 | 数据权限说明入口；不写策略测试通过 |

## 全局整改追溯

UIAUDIT-20260923 → REQ-STYLE-07 → 本切片当前有效约定 → 全局页面样式 testcases.md / audit.md；具体公共实现及本切片接入位置由 audit.md 登记。


## 2026-09-24 统一树形工作区（当前有效补充）
来源：`.specify/sources/2026-09-24-tree-workspace/request.md`。REQ-TREE-WORKSPACE-01 / NFR-TREE-01 / AC-TREE-01：本模块的左树右内容区域调用 TreeWorkspace，统一搜索/工具/新增、无装饰图标和业务徽标的紧凑节点、授权菜单、总数与调宽、侧边中点收放。替代原局部树容器；业务API/权限/编辑保护保持。详细最新需求见 `.specify/requirements/global-page-style/requirement.md` 和 UI-TREE-WORKSPACE-01。
TC-TREE-01：搜索子节点保留祖先、全展开/收起、刷新、键盘选择；TC-TREE-02：操作菜单权限/回调、总数/调宽/收放及右侧状态保持；TC-TREE-03：只读与空态、桌面/窄屏布局。组件与页面测试及浏览器脚本为验证入口，实际执行结果见全局需求 verification-tree.md。
Gate：本次用户开发与全系统接入指令授权本UI变更，未扩展后端数据/权限；未执行发布。标准只复用布局/交互，业务特有控制不可直接跨模块复用。
