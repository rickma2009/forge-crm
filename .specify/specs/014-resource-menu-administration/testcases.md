# Test Cases

- 资源契约拒绝未知类型、非法编码、跨字段无效值。
- 拖拽到自身或后代失败；同级顺序规范化为稳定间隔。
- 根资源删除失败；普通资源删除后后代和导航均停用。
- 跨应用父级、页签目标和挂载失败。
- admin 可维护和导出；viewer 无页面入口且 API 返回 403。
- 右键菜单提供新建子节点、编辑、删除；只读状态不出现写操作。
- 按钮、页签、左菜单保存后重新加载保持一致。
- migration 空库、Seed 两次、唯一键、外键和审计写入通过。
- 系统根节点、类型缩写和页面编码不出现在左侧树；停用资源不呈现；基本信息不显示内部 ID。
- 左侧树为受高度约束的独立纵向滚动容器，右侧详情保持独立滚动。
- 停用资源查询只返回启用记录；物理清理前必须证明不存在启用子节点或保留引用。

## UIAUDIT-20260923 增量验收

REQ-STYLE-01/07 的 AC/TC 统一见 `.specify/requirements/global-page-style/testcases.md`。本切片需验证：资源树右键和省略号菜单一致，提供新建同级、子节点、编辑及已有删除/停用流程；表格行操作统一图标且保留中文提示。


## 2026-09-24 统一树形工作区（当前有效补充）
来源：`.specify/sources/2026-09-24-tree-workspace/request.md`。REQ-TREE-WORKSPACE-01 / NFR-TREE-01 / AC-TREE-01：本模块的左树右内容区域调用 TreeWorkspace，统一搜索/工具/新增、无装饰图标和业务徽标的紧凑节点、授权菜单、总数与调宽、侧边中点收放。替代原局部树容器；业务API/权限/编辑保护保持。详细最新需求见 `.specify/requirements/global-page-style/requirement.md` 和 UI-TREE-WORKSPACE-01。
TC-TREE-01：搜索子节点保留祖先、全展开/收起、刷新、键盘选择；TC-TREE-02：操作菜单权限/回调、总数/调宽/收放及右侧状态保持；TC-TREE-03：只读与空态、桌面/窄屏布局。组件与页面测试及浏览器脚本为验证入口，实际执行结果见全局需求 verification-tree.md。
Gate：本次用户开发与全系统接入指令授权本UI变更，未扩展后端数据/权限；未执行发布。标准只复用布局/交互，业务特有控制不可直接跨模块复用。


## 2026-09-24 右侧内容Tab统一
REQ-CONTENT-TABS-01 / AC-CONTENT-TABS-01 / TC-CONTENT-TABS-01：五个内容页签复用客户详情 DetailTabs/DetailPanel，去除各项独立边框圆角，以蓝字/600字重/2px下划线表示选中，其他项白底常规文字。计数与业务操作保持；验证鼠标切换、键盘/Home/End、tabpanel关联及与客户详情的计算样式一致。来源 `.specify/sources/2026-09-24-content-tabs/original.md`；完整当前态需求见global-page-style/requirement.md。本次UI修正按用户直接指令实施，无新增数据/安全设计，无发布授权变化。
