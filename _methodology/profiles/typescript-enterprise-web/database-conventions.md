# PostgreSQL / Prisma 数据库实现约定

> 适用 Profile：`typescript-enterprise-web`  
> 上位规范：[`../../11-数据库设计与数据分层规范.md`](../../11-数据库设计与数据分层规范.md)

本文只规定 PostgreSQL 与 Prisma 的实现方式，不扩大 Profile 对认证、租户或业务模块的默认范围。只有批准的切片需要持久化时才适用。

## 1. Schema 与命名映射

- 当前基线使用 PostgreSQL 默认 Schema，通过 `sys_`、`org_`、`md_`、`sd_`、`scm_`、`rd_`、`fin_`、`int_`、`stg_`、`dim_`、`fact_` 分层。
- Prisma Model 使用可读的 PascalCase；物理表必须通过 `@@map("snake_case_name")` 显式登记。
- 物理表名和物理字段名必须为小写 `snake_case` 且不超过 32 个字符。Prisma 字段名不满足物理规则时必须使用 `@map("snake_case_name")`；禁止依赖 ORM 默认或 PostgreSQL 截断产生无意命名漂移。
- PostgreSQL `public` Schema 不代表“公共数据”；不得用其替代所有权设计。

## 2. 类型基线

- 内部主键使用 PostgreSQL `uuid`；生成位置由项目统一选择，禁止同一实体混用多种生成方式。
- 时间点使用 `timestamptz`，Prisma 显式声明 `@db.Timestamptz`；自然日期使用 `date`。
- 金额使用定点 `numeric(precision, scale)`，禁止使用浮点数保存金额。
- 结构化扩展字段可以使用 `jsonb`，但核心可查询、可约束的业务字段必须建模为列和关系。
- 封闭技术状态可使用 PostgreSQL enum 或 `CHECK`；业务分类使用字典或主数据外键。
- 字典引用列保存稳定字典项编码（当前公共字典消费值为 `itemValue`），不保存可变显示名称；其他表的可变引用保存稳定外键 ID，必要时附业务编码。列表、详情和其他关键展示按作用域受控关联解析当前名称。仅初始化后按业务规则不可变的文本（如员工姓名）可作为快照保存；可变关系（如员工部门）必须引用并重新解析。历史交易快照与当前名称须分字段表达、明确使用边界。

## 3. 约束分工

Prisma Schema 表达模型、普通唯一键、关系和索引；以下 PostgreSQL 能力在不可改写 migration SQL 中补充：

- partial unique index；
- `CHECK` 约束；
- 跨作用域复合外键；
- 有效期不重叠的 exclusion constraint；
- Prisma 无法完整表达的级联和延迟约束。

任何 migration SQL 补充都必须有直接数据库集成测试，不能只测试 Prisma Service。

## 4. 租户与应用隔离

- 租户表建立 `(id, tenant_id)` 或满足同作用域复合外键的等价唯一键。
- 应用内实体建立包含 `tenant_id`、`application_id` 的候选键，并用复合外键阻止跨租户或跨应用关系。
- 服务查询必须显式带作用域；禁止先按裸 `id` 查询再在内存中补判断。
- PostgreSQL RLS 默认关闭；采用时必须有项目 ADR、连接身份模型、迁移、故障测试和运维方案。

## 5. 删除、树与时间

- Prisma 关系默认采用 `Restrict` 或等价行为；`Cascade` 仅用于经评审的纯依附数据。
- 自引用树建立同作用域父子外键；防环由事务内校验和数据库集成测试覆盖。
- 有效期使用 `[effective_at, expires_at)`；需要防止重叠时优先使用 PostgreSQL range/exclusion 约束，或使用同事务锁定与冲突检查并记录理由。
- 涉及当前时间的授权查询必须统一时钟来源，测试使用可控时间。

## 6. 索引

- 为外键、常用租户/应用过滤、稳定分页排序和有效期查询建立经查询证明的索引。
- 软停用数据的唯一性按业务规则决定使用全量唯一键还是 partial unique index。
- 大表在线增加索引时评审 `CONCURRENTLY`、事务限制和部署步骤；不能直接套用本地小表迁移。
- 使用 `EXPLAIN (ANALYZE, BUFFERS)` 或等价证据验证高风险查询，记录数据规模。

## 7. Migration 与 Seed

- `packages/server/prisma/migrations/` 是唯一 PostgreSQL DDL 历史；禁止维护会漂移的第二份完整建库 SQL。
- 已应用 migration 永不编辑；修复使用新 migration 前滚。
- 重命名使用 `ALTER TABLE/INDEX/CONSTRAINT ... RENAME` 或经验证的数据保留迁移，不删除重建。
- 数据回填与约束收紧分阶段执行：先兼容写入和回填，再验证，最后设为非空或增加严格约束。
- Seed 幂等；系统管理员完整授权、同作用域关系和默认视图等跨行不变量在事务提交前校验。
- Seed 字段维护权必须列入 Plan：Prisma `upsert.create` 包含首次默认值，`upsert.update` 仅列代码权威字段；禁止未经分类把完整创建对象复用于更新。派生字段需注明计算来源和重算时机；审计字段按实际执行主体更新，不伪装成人工操作。
- 验证“首次初始化 → 人工修改运行期字段 → 再次初始化”：代码权威字段同步、人工字段保留、记录不重复、其他作用域不变。涉及多表原子初始化时，另验证中途失败整批回滚。单纯执行两次且只比对记录数量不能证明保留行为。

## 8. 测试门槛

涉及 Schema 的切片至少验证：

1. 空库应用全部 migration；
2. Seed 首次执行和重复执行；
3. 唯一键、外键、同租户/同应用约束；
4. 删除限制、有效期重叠和树防环；
5. 数据迁移前后的数量、关键值和关联完整性；
6. 数据库不可用时安全能力 fail-closed；
7. 备份恢复或批准的前滚修复路径。

没有可用 PostgreSQL 时可以运行纯单元测试，但数据库验证状态必须明确标记为未完成，不得据此批准 Release Gate。

## 9. Prisma 评审清单

- [ ] 每个 Model 都有符合分层规范的 `@@map`。
- [ ] UUID、时间和金额映射为正确的 PostgreSQL 类型。
- [ ] 租户/应用作用域进入唯一键、查询和关系约束。
- [ ] 多对多关联有防重复唯一约束。
- [ ] `onDelete` 行为经过明确评审。
- [ ] Prisma 无法表达的约束存在 migration SQL 和集成测试。
- [ ] migration 未改写历史，Seed 可重复执行。
- [ ] 敏感字段不进入日志、普通 DTO 或无授权导出。
