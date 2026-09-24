# 数据库表 DDL 审阅快照

生成时间：2026-09-23T06:39:33.584Z。来源：本地项目数据库 interaction_pattern_lab / public，一致性只读快照。

共 **54 张应用表**，另含 1 张 Prisma 内部迁移记录表。只导出结构，不包含业务记录、密码或令牌数据。

## 文件与权威来源

- [tables/](tables/)：每表一个 SQL，包含建表、主键、外键、索引、CHECK 等该表对象；跨表外键放在引用方文件中。
- [shared.sql](shared.sql)：公共枚举、函数及其他未归属到单表的 Schema 对象。
- [all-schema.sql](all-schema.sql)：pg_dump 原顺序的完整结构（省略所有者与授权），用于交叉核对。
- [manifest.json](manifest.json)：逐表字段/外键/索引计数、对象清单、已应用迁移和一致性检查。
- 正式 Prisma 模型：`packages/server/prisma/schema.prisma`。
- **唯一正式 DDL 历史：`packages/server/prisma/migrations/*/migration.sql`。本目录不是新的迁移源。**

## 使用边界

仅用于审阅现状，禁止手工维护后当迁移使用。单表文件依赖公共类型、函数和其他表，不保证独立执行或按文件名顺序执行。范围为 public Schema，不含库级扩展的安装语句（例如有效期排斥约束依赖 btree_gist）。未执行恢复演练；不包含数据、所有者或 GRANT，不能当完整备份。未修改数据库，未改变任何 Gate 状态。

可复用的是只读结构导出和核对流程；本项目具体表结构、角色策略不能未经目标项目评审直接复用。数据库行为正确性、字段业务含义与实际授权效果不在此次导出验证范围。

## 再次导出

在项目根执行（先确保本地 Postgres 已运行，并安装匹配版本的 pg_dump；连接读取根 .env 或 DATABASE_URL）：

```bash
node scripts/export-database-ddl.mjs docs/database/ddl-next
```

输出目录必须不存在，避免覆盖已有审阅记录。只连接 localhost，不连接参考项目或生产库。

## 核对结果

- 尚未应用的迁移：无
- 已应用迁移校验和不一致：无
- Prisma 定义存在但数据库没有的表：无
- 数据库存在但 Prisma 未声明的应用表：无

表名集合一致不代表所有字段与 Prisma 无漂移；实际 DDL 以本快照为准，约束中保留迁移 SQL 增加而 Prisma 不能完整表达的部分。

## 逐表索引

| 物理表 / DDL | 字段数 | 外键数 | 索引数 |
|---|---:|---:|---:|
| [_prisma_migrations](tables/_prisma_migrations.sql) | 8 | 0 | 1 |
| [crm_customer](tables/crm_customer.sql) | 18 | 0 | 5 |
| [crm_customer_address](tables/crm_customer_address.sql) | 19 | 1 | 2 |
| [crm_customer_contact](tables/crm_customer_contact.sql) | 18 | 1 | 3 |
| [md_product](tables/md_product.sql) | 14 | 1 | 4 |
| [org_employee](tables/org_employee.sql) | 12 | 3 | 3 |
| [org_employee_assignment](tables/org_employee_assignment.sql) | 16 | 5 | 5 |
| [org_employment](tables/org_employment.sql) | 13 | 3 | 3 |
| [org_position](tables/org_position.sql) | 10 | 3 | 4 |
| [org_unit](tables/org_unit.sql) | 16 | 2 | 5 |
| [org_user_assignment](tables/org_user_assignment.sql) | 12 | 4 | 3 |
| [sd_competitor](tables/sd_competitor.sql) | 15 | 1 | 3 |
| [sd_opp](tables/sd_opp.sql) | 31 | 6 | 7 |
| [sd_opp_amount_event](tables/sd_opp_amount_event.sql) | 10 | 2 | 2 |
| [sd_opp_analysis](tables/sd_opp_analysis.sql) | 15 | 2 | 2 |
| [sd_opp_analysis_competitor](tables/sd_opp_analysis_competitor.sql) | 6 | 2 | 3 |
| [sd_opp_follow_up](tables/sd_opp_follow_up.sql) | 13 | 1 | 2 |
| [sd_opp_product](tables/sd_opp_product.sql) | 16 | 2 | 2 |
| [sd_opp_stage](tables/sd_opp_stage.sql) | 13 | 1 | 4 |
| [sd_opp_template](tables/sd_opp_template.sql) | 12 | 1 | 4 |
| [sd_price_tier](tables/sd_price_tier.sql) | 5 | 1 | 2 |
| [sd_product_price](tables/sd_product_price.sql) | 7 | 1 | 4 |
| [sd_quotation](tables/sd_quotation.sql) | 24 | 6 | 7 |
| [sd_quotation_line](tables/sd_quotation_line.sql) | 22 | 2 | 2 |
| [sd_quote_event](tables/sd_quote_event.sql) | 11 | 1 | 3 |
| [style_scene](tables/style_scene.sql) | 16 | 0 | 2 |
| [sys_application](tables/sys_application.sql) | 8 | 1 | 5 |
| [sys_audit_log](tables/sys_audit_log.sql) | 11 | 0 | 3 |
| [sys_authorization_field](tables/sys_authorization_field.sql) | 13 | 1 | 3 |
| [sys_authorization_resource](tables/sys_authorization_resource.sql) | 11 | 3 | 4 |
| [sys_dictionary](tables/sys_dictionary.sql) | 15 | 1 | 5 |
| [sys_dictionary_item](tables/sys_dictionary_item.sql) | 14 | 1 | 4 |
| [sys_menu](tables/sys_menu.sql) | 20 | 2 | 6 |
| [sys_menu_action](tables/sys_menu_action.sql) | 11 | 1 | 4 |
| [sys_page_button](tables/sys_page_button.sql) | 15 | 1 | 3 |
| [sys_page_resource](tables/sys_page_resource.sql) | 22 | 2 | 4 |
| [sys_page_tab](tables/sys_page_tab.sql) | 13 | 2 | 4 |
| [sys_permission](tables/sys_permission.sql) | 11 | 1 | 4 |
| [sys_policy_revision](tables/sys_policy_revision.sql) | 7 | 2 | 2 |
| [sys_role](tables/sys_role.sql) | 21 | 2 | 8 |
| [sys_role_data_policy](tables/sys_role_data_policy.sql) | 9 | 3 | 3 |
| [sys_role_data_rule](tables/sys_role_data_rule.sql) | 7 | 1 | 2 |
| [sys_role_field_rule](tables/sys_role_field_rule.sql) | 8 | 2 | 2 |
| [sys_role_group](tables/sys_role_group.sql) | 9 | 1 | 2 |
| [sys_role_list_view](tables/sys_role_list_view.sql) | 4 | 2 | 2 |
| [sys_role_permission](tables/sys_role_permission.sql) | 11 | 2 | 3 |
| [sys_role_subject_binding](tables/sys_role_subject_binding.sql) | 15 | 5 | 4 |
| [sys_role_user](tables/sys_role_user.sql) | 12 | 2 | 4 |
| [sys_system_list_view](tables/sys_system_list_view.sql) | 18 | 0 | 4 |
| [sys_tenant](tables/sys_tenant.sql) | 7 | 0 | 2 |
| [sys_user](tables/sys_user.sql) | 14 | 1 | 7 |
| [sys_user_group](tables/sys_user_group.sql) | 12 | 3 | 3 |
| [sys_user_group_member](tables/sys_user_group_member.sql) | 13 | 4 | 3 |
| [sys_user_list_view](tables/sys_user_list_view.sql) | 13 | 2 | 4 |
| [sys_user_list_view_preference](tables/sys_user_list_view_preference.sql) | 7 | 1 | 1 |
