# Traceability

| 需求 | Spec | Test | 实现证据 |
| --- | --- | --- | --- |
| REQ-024-01/02 | 主数据 API 与唯一性 | TC-01/07/13 | Prisma migration、InventoryService、contracts tests |
| REQ-024-03/04 | 入库状态机与详情 | TC-02/03 | InventoryController/Service、InventoryPages tests |
| REQ-024-05 | 原子过账与幂等 | TC-03/04/05/06 | Serializable transaction、event requestKey、真实数据库过账验证 |
| REQ-024-06 | 整单冲销 | TC-08/09 | 负向流水、余额保护、真实数据库冲销恢复验证 |
| REQ-024-07 | 只读库存明细 | TC-12 | 只读 GET API、无写路由、前端只读测试 |
| REQ-024-08 | md_item 迁移 | TC-13 | `20260924110000_item_code_references`、产品/定价/商机服务兼容层 |
| REQ-024-09 | 角色权限 | TC-11 | 数据库 seed grants、item authorization regression test、数据库导航验证 |
| REQSRC-071 | 物料三级分类、三页签详情、引用名称展示、统一查询区 | 增量验收清单 | `RecordQueryBar`、`ItemDirectoryPage`、`ItemDetailPage`、`InventoryService.itemDtos/orderDtos`、`20260924152000_item_categories`、`20260924173000_inventory_item_id_refs` |
| REQ-024-16 / REQSRC-072 | 物料详情动态路由继承菜单权限并保持三页签 | TC-14、TC-15 | `ShowcaseApp` 动态路由授权映射、`ItemDetailPage`、`ShowcaseApp.test.tsx`、`InventoryPages.test.tsx` |

增量来源：`REQSRC-071`。引用字段按规范保存 ID，API 与页面展示法人、仓库、客户和物料的名称或编码，不展示内部 UUID。


## 2026-09-24 统一树形工作区（当前有效补充）
来源：`.specify/sources/2026-09-24-tree-workspace/request.md`。REQ-TREE-WORKSPACE-01 / NFR-TREE-01 / AC-TREE-01：本模块的左树右内容区域调用 TreeWorkspace，统一搜索/工具/新增、无装饰图标和业务徽标的紧凑节点、授权菜单、总数与调宽、侧边中点收放。替代原局部树容器；业务API/权限/编辑保护保持。详细最新需求见 `.specify/requirements/global-page-style/requirement.md` 和 UI-TREE-WORKSPACE-01。
TC-TREE-01：搜索子节点保留祖先、全展开/收起、刷新、键盘选择；TC-TREE-02：操作菜单权限/回调、总数/调宽/收放及右侧状态保持；TC-TREE-03：只读与空态、桌面/窄屏布局。组件与页面测试及浏览器脚本为验证入口，实际执行结果见全局需求 verification-tree.md。
Gate：本次用户开发与全系统接入指令授权本UI变更，未扩展后端数据/权限；未执行发布。标准只复用布局/交互，业务特有控制不可直接跨模块复用。

| REQ-024-13/14/15、NFR-WDICT-01 | AC-WDICT-01/02/03 | TC-WDICT-01/02/03 | TASK-WDICT-01：warehouse-dictionaries.seed、InventoryService、WarehousePage及专项测试 |

## 显式追溯补齐（不代表旧测试本次重跑）
BUS-WDICT-01：仓库分类统一由公共数据字典维护，避免自由文本差异；见当前态需求。

| 需求 | 验收与测试 | 实现 |
| --- | --- | --- |
| REQ-024-02 | TC-01、TC-10 | InventoryService法人/仓库接口 |
| REQ-024-04 | TC-02 | InventoryService草稿更新与状态限制 |
| REQ-024-05 | TC-03、TC-04、TC-05、TC-06 | InventoryService事务过账与幂等 |
| REQ-024-01 | TC-01、TC-07 | InventoryService、inventory-domain批次校验 |
| REQ-024-06 | TC-08、TC-09 | InventoryService冲销及余额保护 |
| REQ-024-10 | TC-TREE-01、TC-TREE-02 | ItemDirectoryPage、TreeWorkspace |
| REQ-024-11 | 物料增量验收清单 | ItemDetailPage、InventoryPages.test.tsx |
| REQ-024-12 | 引用名称增量验收清单 | InventoryService.orderDtos、InventoryPages.test.tsx |
| BUS-WDICT-01、REQ-024-13、NFR-WDICT-01 | AC-WDICT-01、TC-WDICT-01 | TASK-WDICT-01、warehouse-dictionaries.seed.ts、init-warehouse-dictionaries.ts、真实数据库专项 |
| REQ-024-14 | AC-WDICT-02、TC-WDICT-02 | TASK-WDICT-01、WarehousePage.test.tsx、浏览器截图 |
| REQ-024-15 | AC-WDICT-03、TC-WDICT-03 | TASK-WDICT-01、warehouse-dictionary.spec.ts、InventoryService、WarehouseEditor |


## 2026-09-24 入库单详情展示变更（当前有效）
REQ-DOCUMENT-DETAIL-01 → AC-DOCUMENT-DETAIL-01 → TC-DOCUMENT-DETAIL-01：客户详情同款返回箭头；单页主表在上、明细在下，无多Tab。默认查看只读，隐藏明细新增和操作列；符合既有权限/状态时编辑按钮启用编辑，编辑变保存，允许维护的字段和明细可操作，固定身份字段仍只读。成功保存回查看，失败不丢输入；返回防止未保存丢失。来源 `.specify/sources/2026-09-24-document-detail/original.md`，完整当前态规则见 global-page-style/requirement.md。替代过去详情默认编辑或查看态显示明细操作的约定。用户直接授权此交互实现；不改变后端业务状态、权限、数据结构，无新增Architecture数据影响。

本变更明确替代入库详情旧的“基本信息/入库明细”双Tab和“修改入库单”弹窗；新增单据入口仍沿用创建流程。真实执行证据见 `.specify/requirements/global-page-style/verification-document.md`。
