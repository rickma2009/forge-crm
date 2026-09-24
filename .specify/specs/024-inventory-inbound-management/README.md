# 024 库存与入库管理切片

本切片实现统一物项迁移、法人和仓库主数据、入库过账/冲销闭环及库存明细只读页面。

状态：implemented-and-verified

## 仓库类型与性质字典
当前仓库页面读取warehouse_type/warehouse_nature。已有数据库按目标系统运行：
```bash
SYSTEM_CODES=demo-portal pnpm --filter @interaction-pattern-lab/server exec tsx scripts/init-warehouse-dictionaries.ts
```
该命令幂等，仅补齐预设，停用尚未被用户维护的旧种子分类，保留已有仓库值并记录初始化审计；不要以全量演示seed替代。首次安装seed使用同一预设定义。
