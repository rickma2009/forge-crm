# 需求来源与业务边界

原始请求不可改写归档见归档（本文件仅为导读；项目内路径为 `.specify/sources/REQSRC-051-supply-role-management-20260922/source.md` 与 `.specify/sources/REQSRC-052-supply-role-scope-confirmation-20260922/source.md`）。

BUS-021：通过角色树、角色详情及七个授权页签，提供与 supply 参考一致的可用管理体验；保留目标授权资产，对源未接线动作按已确认范围补齐，不移植供服专属规则。验收价值是管理员可以完成全链路维护，并由应用用户实际访问证明授权和撤销生效，而不是按钮数量。

来源事实与首轮差异见切片012的 `supply-role-management-increment.md`。本切片不重写012、013、014历史 Gate，不以“确认范围”冒充详细方案批准。

## 2026-09-24 全局页面整改当前有效约定

来源：`UIAUDIT-20260923`，关联 `REQ-STYLE-07`。以下规则替代该范围历史呈现/接口冲突描述：角色树两个入口使用公共菜单；支持同级/子角色新增和既有编辑、移动、删除，保留内置角色保护、版本校验及未保存权限离开确认。

本次授权为用户要求按推荐方案直接整改；源码、单元测试与真实接口证据见 `.specify/requirements/global-page-style/audit.md`。历史 Release Gate 不覆盖本次增量；无新发布动作。


## 2026-09-24 统一树形工作区（当前有效补充）
来源：`.specify/sources/2026-09-24-tree-workspace/request.md`。REQ-TREE-WORKSPACE-01 / NFR-TREE-01 / AC-TREE-01：本模块的左树右内容区域调用 TreeWorkspace，统一搜索/工具/新增、无装饰图标和业务徽标的紧凑节点、授权菜单、总数与调宽、侧边中点收放。替代原局部树容器；业务API/权限/编辑保护保持。详细最新需求见 `.specify/requirements/global-page-style/requirement.md` 和 UI-TREE-WORKSPACE-01。
TC-TREE-01：搜索子节点保留祖先、全展开/收起、刷新、键盘选择；TC-TREE-02：操作菜单权限/回调、总数/调宽/收放及右侧状态保持；TC-TREE-03：只读与空态、桌面/窄屏布局。组件与页面测试及浏览器脚本为验证入口，实际执行结果见全局需求 verification-tree.md。
Gate：本次用户开发与全系统接入指令授权本UI变更，未扩展后端数据/权限；未执行发布。标准只复用布局/交互，业务特有控制不可直接跨模块复用。
