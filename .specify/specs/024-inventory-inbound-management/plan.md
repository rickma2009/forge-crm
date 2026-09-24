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


## 2026-09-24 单据详情整改完成记录
基于现有数据/API与权限，以DocumentWorkspace组合DetailHeader/DetailSection；抽取DetailBackButton，入库详情单独实现查看/编辑状态、主表+明细表格、保存与离开保护，Showcase壳登记守卫。无需数据库迁移。来源及当前需求见本切片spec与global-page-style/requirement.md。源归档、实现、规范/模板/检查、15项测试及桌面/窄屏浏览器验证完成；证据global-page-style/verification-document.md。全仓既有CONTEXT冲突不计为通过，无发布操作。
