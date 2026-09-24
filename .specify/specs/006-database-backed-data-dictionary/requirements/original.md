# 原始需求指针

本切片不改写用户原始输入，权威来源依次为：

1. `../../../sources/REQSRC-022-navigation-toolbar-tabs-customer-view-dictionary-request-20260904/source.md`：本地数据字典与客户字段消费需求；
2. `../../../sources/REQSRC-023-requirement-005-business-and-default-gate-authorization-20260904/source.md`：Business Gate 及后续推荐默认项、连续实施授权；
3. `../../../sources/REQSRC-026-hierarchical-initialized-dictionary-values-maintenance-20260904/source.md`：两表、父级、初始化类别、值维护与 Excel 导入增量；
4. `../../../sources/REQSRC-027-dictionary-tree-maintenance-and-export-refinement-20260904/source.md`：左侧简化、父级值维护、折叠修复与 Excel 导出增量。
4. `../../../requirements/005-enterprise-workspace-configurable-customer-directory/requirement.md`：已批准上游业务包中的 `FR-504`、`AC-504`、`AC-508`。

参考页面和 `_ref/gf_scm/` 仅作为交互与实现证据；目标代码排除来源组织名称、外部平台代理和历史运维接口。


## 2026-09-24 统一树形工作区（当前有效补充）
来源：`.specify/sources/2026-09-24-tree-workspace/request.md`。REQ-TREE-WORKSPACE-01 / NFR-TREE-01 / AC-TREE-01：本模块的左树右内容区域调用 TreeWorkspace，统一搜索/工具/新增、无装饰图标和业务徽标的紧凑节点、授权菜单、总数与调宽、侧边中点收放。替代原局部树容器；业务API/权限/编辑保护保持。详细最新需求见 `.specify/requirements/global-page-style/requirement.md` 和 UI-TREE-WORKSPACE-01。
TC-TREE-01：搜索子节点保留祖先、全展开/收起、刷新、键盘选择；TC-TREE-02：操作菜单权限/回调、总数/调宽/收放及右侧状态保持；TC-TREE-03：只读与空态、桌面/窄屏布局。组件与页面测试及浏览器脚本为验证入口，实际执行结果见全局需求 verification-tree.md。
Gate：本次用户开发与全系统接入指令授权本UI变更，未扩展后端数据/权限；未执行发布。标准只复用布局/交互，业务特有控制不可直接跨模块复用。
