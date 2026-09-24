# 原始需求

受控副本：`../../../sources/REQSRC-049-organization-hierarchy-page-and-query-layout-20260922/source.md`。

上位业务设计：`../../../组织员工角色权限-方案设计.md`。

## 2026-09-24 全局页面整改当前有效约定

来源：`UIAUDIT-20260923`，关联 `REQ-STYLE-07`。以下规则替代该范围历史呈现/接口冲突描述：组织节点右键与右侧省略号复用同一公共菜单，提供新建同级、子组织、编辑。没有删除接口，不增加删除能力；只读用户不显示菜单。

本次授权为用户要求按推荐方案直接整改；源码、单元测试与真实接口证据见 `.specify/requirements/global-page-style/audit.md`。历史 Release Gate 不覆盖本次增量；无新发布动作。


## 2026-09-24 统一树形工作区（当前有效补充）
来源：`.specify/sources/2026-09-24-tree-workspace/request.md`。REQ-TREE-WORKSPACE-01 / NFR-TREE-01 / AC-TREE-01：本模块的左树右内容区域调用 TreeWorkspace，统一搜索/工具/新增、无装饰图标和业务徽标的紧凑节点、授权菜单、总数与调宽、侧边中点收放。替代原局部树容器；业务API/权限/编辑保护保持。详细最新需求见 `.specify/requirements/global-page-style/requirement.md` 和 UI-TREE-WORKSPACE-01。
TC-TREE-01：搜索子节点保留祖先、全展开/收起、刷新、键盘选择；TC-TREE-02：操作菜单权限/回调、总数/调宽/收放及右侧状态保持；TC-TREE-03：只读与空态、桌面/窄屏布局。组件与页面测试及浏览器脚本为验证入口，实际执行结果见全局需求 verification-tree.md。
Gate：本次用户开发与全系统接入指令授权本UI变更，未扩展后端数据/权限；未执行发布。标准只复用布局/交互，业务特有控制不可直接跨模块复用。
