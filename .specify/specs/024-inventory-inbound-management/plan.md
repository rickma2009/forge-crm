# Architecture Plan

状态：APPROVED

## 数据所有权

| 表 | 层级/责任模块 | 作用域 | 删除 |
| --- | --- | --- | --- |
| `org_legal_entity` | 组织主数据 / organization | tenant | 停用 |
| `md_item` | 共享主数据 / item | tenant | 停用；未引用才可物理删除 |
| `scm_warehouse` | 库存主数据 / inventory | tenant + legal entity | 停用 |
| `scm_inbound_order` | 库存交易 / inventory | tenant + application | 作废/冲销 |
| `scm_inbound_line` | 入库聚合子项 / inventory | order | 随聚合保留 |
| `scm_inventory_balance` | 库存余额 / inventory posting service | tenant + legal + warehouse + item + batch | 禁止CRUD删除 |
| `scm_inventory_txn` | 不可变库存流水 / inventory posting service | tenant | 禁止更新删除 |
| `scm_inventory_event` | 幂等命令记录 / inventory | application + actor + request key | 保留 |

所有物理标识小于等于32字符。内部主键 UUID；入库明细使用 `item_id` 外键强关联 `md_item`，并保留 `item_code`、名称和单位快照用于展示与历史语义。金额和数量用 Decimal，API 用字符串。

## 迁移策略

1. 创建 `md_item`，从 `md_product` 复制数据并保留原 UUID 为 `item_id`；
2. 定价、商机商品、报价行保留 `item_id`/`product_id` 强关联，同时回填 `item_code` 作为业务编码快照；
3. 服务切换为 itemCode 读写；兼容期保留旧 product_id，验证无孤儿后在后续收缩迁移删除；
4. 创建法人、仓库、入库、余额、流水和事件表；
5. Seed 通用演示法人、仓库、物项、草稿及已过账入库单；
6. 回滚优先停用新菜单与服务；结构回滚前必须导出新交易数据，不静默删除流水。

## 并发与幂等

过账和冲销使用 Serializable 事务、单据行锁、CAS 状态更新、余额唯一键 upsert、事件唯一键 `(application_id,actor_id,request_key)`。流水唯一键 `(source_line_id,movement_type)` 防双记账。

## 安全与权限

资源：`item-directory`、`legal-entity-admin`、`warehouse-admin`、`inbound-order-directory`、`inventory-balance-directory`。动作按需求拆分；服务端逐接口 assertAction。

## 恢复与验证

迁移检查产品数、引用数和孤儿数；集成测试覆盖原子性、重复过账、并发、批次唯一、冲销、停用主数据、权限和只读库存。发布前执行 Prisma validate/generate、typecheck、tests、build、`verify-all.sh`。

## 仓库字典接入计划
复用sys_平台字典，责任模块dictionary；inventory只读字典验证，仓库保存既有varchar32业务值。本次无DDL或新表，不新增FK；沿用dictionaryId外键及(systemCode,dictCode)/(dictionaryId,itemValue)唯一键。类型/项启停与审计沿用现有设计，无新增有效期或删除动作。初始化按显式SYSTEM_CODES执行事务并写sys_audit_log，已存在配置保留，旧种子WIP/PHYSICAL仅停用；失败事务回滚，业务仓库不变，必要时通过原字典管理重新启用。字典新选值由服务校验，历史值不变可留存，名称批量查询无N+1。验证包括真实库幂等/隔离、页面交互及服务校验。Gate：本次用户明确变更指令授权切片规格与既有架构下实现，不声称独立人工评审；发布不在此次范围。


## 2026-10-05 物料来源/生命周期引用增量

- 数据层：`md_item`（`md_` 共享主数据责任模块 item），新增可空 `item_source`、`item_lifecycle` 两个 `varchar(32)` 字典项编码列；不新建表、不新增物理外键。存量行保持 NULL，不按名称推断回填；迁移同时对现有系统/个人物料列表视图配置追加两列，保留已有列设置。结构前滚迁移可用保留列的逆向迁移回滚；视图配置回滚前应保留当前展示配置备份。
- 字典唯一权威模块为 `sys_dictionary` / dictionary；按 systemCode 作用域通过 `item_source`、`item_lifecycle` 查找。Seed 初次建值；专项初始化脚本可对既有系统幂等补齐缺值并记录审计，不覆盖已存在字典项名称、状态或顺序。
- 初始编码：`PURCHASED`、`SELF_MANUFACTURED`、`OUTSOURCED_PROCESSING`；`INITIAL`、`SAMPLE`、`TRIAL_PRODUCTION`、`SMALL_BATCH`、`MASS_PRODUCTION`、`PHASE_OUT`、`DISCONTINUED`、`VOIDED`。两字段可空，无默认值，供调用方选择；已停用编码只允许原值保持，不允许新选或改选。
- API 返回编码及按系统关联解析的名称；目录列表、导出和详情用解析名称展示。查询按编码过滤；一次批量读取当前系统的两个字典，不做逐行查询。历史单据快照不变更，字段表示物料当前分类而非交易历史分类。
- 失败路径：不存在、停用或其他系统的值返回 400；字典名/值改名后重新查询即显示当前名；缺失值以“未匹配（编码）”呈现，不泄露内部 ID。用户负责字典维护的权限规则不变。
- Gate：本次用户“确认”授权按以上方案实施；本次验收以迁移/Prisma生成、契约/服务/页面及种子专项验证为边界，不扩展库存交易历史。

## 2026-10-05 物料编码点号规则增量

- 数据层级与责任模块不变：`md_item` 仍是共享主数据，库存及销售表继续通过 `item_id` 关联，并按既有用途保存 `item_code` 快照。
- 新增前向迁移替换 `md_item_code_format_ck`，允许大写字母、数字、英文句点、连字符和下划线；租户唯一、32字符、创建后不可改码和审计规则不变。
- Contracts 使用独立物料编码 schema，避免放宽法人、仓库、原因、工厂及字典项编码。
- 本地演示数据恢复采用单事务、导入批次范围和碰撞检查；更新所有实际命中的编码快照及导入 BOM 编码。执行前完整备份，失败整体回滚。
- 验收核对约束定义、迁移状态、514 条导入物料编码、BOM/明细/替代料数量及孤儿关系；生产发布不在本次范围内。

## 2026-10-05 物料产品自动编码与既有数据停用

- 新建契约不再接收 `itemCode`，要求 `majorCategoryId`、`middleCategoryId`；响应和更新契约保留编码只读语义。
- 服务端在 Serializable 事务内校验启用分类和父子关系，以租户和中类 ID 取得 PostgreSQL advisory transaction lock，再查询同中类全部历史编码的最大七位后缀并加一。生成失败时事务整体回滚。
- 中类字典值作为完整层级前缀，要求格式为 `DDD.DDD` 且首段等于大类三位数字编码；小类不参与编码。
- 无新物理表。`md_item` 的唯一约束和点号格式约束继续作为最终防线；流水达到 `9999999` 后失败关闭，不截断或循环。
- 当前数据停用使用一次性事务，只更新 `PRODUCT`、`MATERIAL` 的启用记录，递增版本并写审计；不改半成品和 BOM。执行前完整备份，恢复时使用备份或按审计快照核对后前滚修复。

## 2026-09-24 单据详情整改完成记录
基于现有数据/API与权限，以DocumentWorkspace组合DetailHeader/DetailSection；抽取DetailBackButton，入库详情单独实现查看/编辑状态、主表+明细表格、保存与离开保护，Showcase壳登记守卫。无需数据库迁移。来源及当前需求见本切片spec与global-page-style/requirement.md。源归档、实现、规范/模板/检查、15项测试及桌面/窄屏浏览器验证完成；证据global-page-style/verification-document.md。全仓既有CONTEXT冲突不计为通过，无发布操作。
