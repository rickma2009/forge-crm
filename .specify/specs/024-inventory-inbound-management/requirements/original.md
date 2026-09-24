# 原始需求引用

当前态完整业务需求：`../../../requirements/011-inventory-inbound-management/requirement.md`。

不可改写来源：

- `../../../sources/REQSRC-070-inventory-inbound-requirement-20260924/`
- `../../../sources/REQSRC-071-stage-item-reference-query-ui-refinement-20260924/`
- `../../../sources/REQSRC-072-item-detail-route-repair-20260924/`


## 2026-09-24 统一树形工作区（当前有效补充）
来源：`.specify/sources/2026-09-24-tree-workspace/request.md`。REQ-TREE-WORKSPACE-01 / NFR-TREE-01 / AC-TREE-01：本模块的左树右内容区域调用 TreeWorkspace，统一搜索/工具/新增、无装饰图标和业务徽标的紧凑节点、授权菜单、总数与调宽、侧边中点收放。替代原局部树容器；业务API/权限/编辑保护保持。详细最新需求见 `.specify/requirements/global-page-style/requirement.md` 和 UI-TREE-WORKSPACE-01。
TC-TREE-01：搜索子节点保留祖先、全展开/收起、刷新、键盘选择；TC-TREE-02：操作菜单权限/回调、总数/调宽/收放及右侧状态保持；TC-TREE-03：只读与空态、桌面/窄屏布局。组件与页面测试及浏览器脚本为验证入口，实际执行结果见全局需求 verification-tree.md。
Gate：本次用户开发与全系统接入指令授权本UI变更，未扩展后端数据/权限；未执行发布。标准只复用布局/交互，业务特有控制不可直接跨模块复用。

## 仓库分类字典（2026-09-24 当前有效规则）
来源：`.specify/sources/WAREHOUSE-DICT-20260924/source.md`，用户明确要求添加字典并接入仓库管理。
REQ-024-13 / AC-WDICT-01：仓库类型 warehouse_type 默认按顺序提供 RAW_MATERIAL=原材料仓、FINISHED_GOODS=成品仓、SAMPLE=样品仓、SCRAP=报废仓；仓库性质 warehouse_nature 默认提供 OWNED=自有仓、VIRTUAL=虚拟仓、IN_TRANSIT=在途仓。字典沿用现有维护功能。
REQ-024-14 / AC-WDICT-02：仓库新增、编辑使用当前系统启用字典值下拉，保存 itemValue，列表显示字典中文名称。无选项/加载失败不得使用硬编码兜底创建，允许重试。仓库操作权限保持；不要求拥有字典管理权限。
REQ-024-15 / AC-WDICT-03：服务端拒绝新增或改选不存在/停用/其他系统字典值。历史值不强行改分类，旧 PHYSICAL=实体仓、WIP=在制品仓停用并保留回显，编辑未改分类可以保存其他字段。该规则替代旧自由文本输入和旧默认值；不将实体仓自动等同自有仓。
NFR-WDICT-01：复用sys_dictionary/sys_dictionary_item，按systemCode隔离；初始化幂等、事务化，不跑全量演示seed，不覆盖用户维护值；保留旧仓库数据。


## 2026-09-24 入库单详情展示变更（当前有效）
REQ-DOCUMENT-DETAIL-01 → AC-DOCUMENT-DETAIL-01 → TC-DOCUMENT-DETAIL-01：客户详情同款返回箭头；单页主表在上、明细在下，无多Tab。默认查看只读，隐藏明细新增和操作列；符合既有权限/状态时编辑按钮启用编辑，编辑变保存，允许维护的字段和明细可操作，固定身份字段仍只读。成功保存回查看，失败不丢输入；返回防止未保存丢失。来源 `.specify/sources/2026-09-24-document-detail/original.md`，完整当前态规则见 global-page-style/requirement.md。替代过去详情默认编辑或查看态显示明细操作的约定。用户直接授权此交互实现；不改变后端业务状态、权限、数据结构，无新增Architecture数据影响。

本变更明确替代入库详情旧的“基本信息/入库明细”双Tab和“修改入库单”弹窗；新增单据入口仍沿用创建流程。真实执行证据见 `.specify/requirements/global-page-style/verification-document.md`。
