# 024 库存与入库管理切片

2026-10-05 增量：新增物料来源/生命周期字典及可变引用保存稳定键、展示时关联解析的要求，来源 REQSRC-102。字段采用可空稳定编码，不推断性回填存量；实现与验证证据由本次更新补齐。

既有系统补齐字典：设置 `DATABASE_URL` 与 `SYSTEM_CODES` 后运行 `pnpm --filter @forge-crm/server exec tsx scripts/init-item-reference-dictionaries.ts`。脚本按系统范围幂等创建缺失值并写审计，不覆盖已有项；数据库结构及存量视图列配置由 `20261005110000_item_source_lifecycle` 前滚迁移。

本切片实现统一物项迁移、法人和仓库主数据、入库过账/冲销闭环及库存明细只读页面。

状态：implemented-and-verified

## 仓库类型与性质字典
当前仓库页面读取warehouse_type/warehouse_nature。已有数据库按目标系统运行：
```bash
SYSTEM_CODES=demo-portal pnpm --filter @interaction-pattern-lab/server exec tsx scripts/init-warehouse-dictionaries.ts
```
该命令幂等，仅补齐预设，停用尚未被用户维护的旧种子分类，保留已有仓库值并记录初始化审计；不要以全量演示seed替代。首次安装seed使用同一预设定义。
