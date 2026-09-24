# Specification：库存与入库管理

状态：APPROVED（用户已授权全部后续门禁按推荐方案执行）

## 功能需求

- REQ-024-01：系统维护租户内唯一且不可改码的统一物项，产品和物料用 `item_type` 区分。
- REQ-024-02：系统维护法人及其管理组织归属，维护法人所属仓库。
- REQ-024-03：系统创建草稿入库单，自动生成 `RKyyyyMMdd#####` 单号，一单一仓、一次整体过账。
- REQ-024-04：草稿允许维护表头和多条明细，非草稿只读；作废保留审计。
- REQ-024-05：过账在单事务内改变状态、原子累计余额、逐行生成流水和事件；重复请求幂等。
- REQ-024-06：已过账单只允许整单冲销一次；冲销生成反向流水，余额不足拒绝。
- REQ-024-07：库存明细只读并支持筛选、分页、汇总/批次视图、视图配置和导出。
- REQ-024-08：旧 `md_product` 及产品定价、报价、商机商品引用迁移到 `md_item.item_code`，迁移前后无孤儿数据。
- REQ-024-09：页面和动作由角色权限控制；admin 全权限，viewer 只读。
- REQ-024-10：“物料产品管理”使用左侧物料大/中/小类级联树和右侧列表；`md_item` 保存三级分类引用，列表及详情显示分类名称。
- REQ-024-11：新增物料使用弹窗，批次管理使用 Y/N 下拉框；浏览和编辑进入“物料基本信息 / 物料定价 / 附件”三页签详情，不再通过编辑弹窗浏览。
- REQ-024-12：入库单、入库明细及其他引用主数据的页面只显示业务编码和名称，不显示 UUID；API 必须批量解析引用名称。

## 状态机

```text
DRAFT --post--> POSTED --reverse--> REVERSED
  |
  +--void--> VOIDED
```

其他转换一律返回409。

## API

- `GET/POST/PATCH /api/systems/:systemCode/legal-entities`
- `GET/POST/PATCH /api/systems/:systemCode/warehouses`
- `GET/POST/PATCH /api/systems/:systemCode/items`
- `GET/POST /api/systems/:systemCode/inbound-orders`
- `GET/PATCH /api/systems/:systemCode/inbound-orders/:id`
- `POST /api/systems/:systemCode/inbound-orders/:id/post`
- `POST /api/systems/:systemCode/inbound-orders/:id/reverse`
- `POST /api/systems/:systemCode/inbound-orders/:id/void`
- `GET /api/systems/:systemCode/inventory-balances`

写接口必须使用 CSRF、角色动作权限、版本号；post/reverse 还要求 `requestKey`。

## 失败行为

- 无权限：403；对象不存在：404；版本或状态冲突、重复业务键：409；输入或主数据不合法：400。
- 数据库或流水写入失败时不得留下部分余额或已过账状态。
- 相同 requestKey 和相同载荷回放原结果；相同 requestKey 不同载荷返回409。

## 页面规格

物料产品、法人、仓库、入库单、库存明细均使用 `UI-QUERY-01` 统一查询区。编码或单号为详情入口，操作列只使用有提示和 aria-label 的图标。物料产品左侧为数据字典驱动的三级分类树，右侧为列表；物料详情为三页签。入库详情顶部展示返回、单号和状态，Tab 为基本信息和入库明细；草稿行用弹窗维护。引用字段保存 ID，但页面显示引用对象名称。

REQ-024-16：物料详情动态地址 `/showcase/items/{itemId}` 的页面授权必须映射到已登记的物料产品菜单 `/showcase/items`；`itemId` 只决定加载哪条记录，不参与菜单资源匹配。浏览与编辑复用该动态地址和同一个三页签详情组件，页签为“物料基本信息、物料定价、附件”。

AC-024-16：管理员从物料编码进入详情时不出现“页面未找到”；三个页签均可见。具有更新权限时可在详情页进入编辑态；不具有更新权限时保持只读。未知静态页面仍返回门户 404，详情记录本身不存在时由业务接口返回对象不存在状态。


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
