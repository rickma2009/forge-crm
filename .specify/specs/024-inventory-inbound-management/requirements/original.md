# 原始需求引用

## 2026-10-03 当前库存与库存事务明细（当前有效）

来源：`.specify/sources/REQSRC-089-current-inventory-transaction-pages-20261003/source.md`。

REQ-024-STOCK-01 / AC-024-STOCK-01：库存管理新增“当前库存”菜单。法人、仓库、物料编码/名称、大/中/小类在同一查询行；上表按查询范围及物料汇总数量、金额，物料编码可点击；下表初始为空，点击后按所选物料展示法人、仓库、批次维度余额，两个表分别分页，当前查询结果可导出。不同币别不得混合金额求和。

REQ-024-STOCK-02 / AC-024-STOCK-02：原“库存明细”改名“库存事务明细”，仅展示入库、冲销、出库流水。事务类型、单号、物料编码/名称及起止期间同一查询行；首列为“事务时间”，末列为对应单据行号。流水必须可追溯至来源单据及行；现有库存事务记录的 `line_no` 为必填且已在入库与销售出库过账时持久化，无需新增迁移。

REQ-024-21 / AC-024-21：物料编码允许大写字母、数字、英文句点`.`、`-`、`_`，最长32字符；逗号、空格、小写字母及其他标点无效。规则适用于 `md_item.item_code` 及其业务引用，不放宽其他系统编码。本批 Excel 演示产品和物料恢复来源点号编码，BOM 关联及数量保持完整。来源：`REQSRC-104`。

REQ-024-22 / AC-024-22：物料产品手工新建时由服务端使用启用的大类、中类数据字典编码，按“中类完整层级编码.中类下最大七位流水+1”生成不可修改的物料编码；停用记录参与最大值计算，并发通过数据库事务锁串行化。来源：`REQSRC-105`。

REQ-024-23 / AC-024-23：当前既有产品和物料全部停用，半成品与 BOM 保持原状，历史数据和引用不删除。来源：`REQSRC-105`。

上述内容替代旧“库存明细”单页同时显示余额与流水的展示约定；不改变库存余额唯一维度、过账和冲销规则。

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

REQ-024-17 / AC-024-17：物料详情返回入口必须复用 `DetailBackButton` 并返回物料列表；浏览态与编辑态复用相同字段控件及网格，浏览态只读、编辑态只解锁获准字段，物料编码永久只读，不再在浏览态切换为纯文本详情。来源 `.specify/sources/REQSRC-074-item-detail-view-edit-parity-20260925/source.md`；三个Tab、权限和API不变。

本变更明确替代入库详情旧的“基本信息/入库明细”双Tab和“修改入库单”弹窗；新增单据入口仍沿用创建流程。真实执行证据见 `.specify/requirements/global-page-style/verification-document.md`。
## 2026-10-05 用户确认增量：物料来源与生命周期字典

来源归档：`.specify/sources/REQSRC-102-item-source-lifecycle-and-reference-codes-20261005/source.md`。物料增加来源（`item_source`：外购、自制、委外加工）与生命周期（`item_lifecycle`：初始、样品、试产、小批量、批量、即将退市、已退市、已作废）。字段保存稳定字典编码，关键页面和列表显示时关联当前字典值。用户确认采纳推荐方案：字段可空、无默认猜测回填，存量保持空；字典值使用稳定英文编码；原有停用编码可原样保留但不可改选；初始化只补缺不覆盖人工维护。
