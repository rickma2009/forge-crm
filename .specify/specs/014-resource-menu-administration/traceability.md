# Traceability

| 需求 | 来源 | 实现 | 验证 |
|---|---|---|---|
| 资源树与右键操作 | REQSRC-050；supply `MenuTree.tsx` | `ResourceMenuPage.tsx` | Web 组件测试、浏览器证据 |
| 页面字段与 CRUD | REQSRC-050；supply `PageModal.tsx` | Contracts、RBAC resource-menu service | Contracts/API/DB 测试 |
| 按钮与页签 | REQSRC-050；supply `ButtonModal.tsx`、`TabModal.tsx` | `sys_page_button`、`sys_page_tab` | API/DB、组件测试 |
| 左导航挂载 | REQSRC-050；supply `LeftMenuTree.tsx` | `sys_menu` + `page_resource_id` | 导航刷新与 DB 测试 |
| SQL 导出 | REQSRC-050；supply `useMenuManage.ts` | export endpoint | API 测试 |
| 角色权限 | REQSRC-043、REQSRC-050 | `sys_permission` / `sys_role_permission` | admin/viewer API 测试 |
| 树展示、内部 ID 隐藏与独立滚动 | REQSRC-054 | `ResourceMenuPage.tsx`、`resource-menu-scroll.css` | ResourceMenuPage 组件测试、浏览器核验 |
| 停用资源查询过滤 | REQSRC-054 | RBAC resource-menu service | API/DB 集成测试 |
| 停用数据物理清理 | REQSRC-054、REQSRC-055 | `20260922213000_remove_obsolete_disabled_page_resources` 白名单前滚 migration | 迁移后目标资源/菜单/权限计数均为 0；连续两次 Seed 未恢复；孤儿按钮/菜单操作/角色授权均为 0；资源菜单数据库集成场景与 `pnpm verify` 通过 |

## 全局整改追溯

UIAUDIT-20260923 → REQ-STYLE-01/07 → 本切片当前有效约定 → 全局页面样式 testcases.md / audit.md；具体公共实现及本切片接入位置由 audit.md 登记。


## 2026-09-24 统一树形工作区（当前有效补充）
来源：`.specify/sources/2026-09-24-tree-workspace/request.md`。REQ-TREE-WORKSPACE-01 / NFR-TREE-01 / AC-TREE-01：本模块的左树右内容区域调用 TreeWorkspace，统一搜索/工具/新增、无装饰图标和业务徽标的紧凑节点、授权菜单、总数与调宽、侧边中点收放。替代原局部树容器；业务API/权限/编辑保护保持。详细最新需求见 `.specify/requirements/global-page-style/requirement.md` 和 UI-TREE-WORKSPACE-01。
TC-TREE-01：搜索子节点保留祖先、全展开/收起、刷新、键盘选择；TC-TREE-02：操作菜单权限/回调、总数/调宽/收放及右侧状态保持；TC-TREE-03：只读与空态、桌面/窄屏布局。组件与页面测试及浏览器脚本为验证入口，实际执行结果见全局需求 verification-tree.md。
Gate：本次用户开发与全系统接入指令授权本UI变更，未扩展后端数据/权限；未执行发布。标准只复用布局/交互，业务特有控制不可直接跨模块复用。


## 2026-09-24 右侧内容Tab统一
REQ-CONTENT-TABS-01 / AC-CONTENT-TABS-01 / TC-CONTENT-TABS-01：五个内容页签复用客户详情 DetailTabs/DetailPanel，去除各项独立边框圆角，以蓝字/600字重/2px下划线表示选中，其他项白底常规文字。计数与业务操作保持；验证鼠标切换、键盘/Home/End、tabpanel关联及与客户详情的计算样式一致。来源 `.specify/sources/2026-09-24-content-tabs/original.md`；完整当前态需求见global-page-style/requirement.md。本次UI修正按用户直接指令实施，无新增数据/安全设计，无发布授权变化。
