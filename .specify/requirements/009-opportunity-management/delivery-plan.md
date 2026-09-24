# 商机管理交付 Plan（Business/Architecture 前草案）

> 状态：`draft-not-approved-for-implementation`  
> 目的：说明可执行顺序与拟议技术边界；不是 Architecture Gate 批准记录，不创建 Tasks、不授权编码。
> 数据命名治理：`REQSRC-059`

## 1. 总体策略

1. 先建立受控来源：产品、竞争对象、模板和阶段。
2. 再打通“列表快速新建 → 商机详情 → 商品信息”的首条纵向链路。
3. 在同一商机授权边界内追加跟进和分析，不为子对象建立独立数据范围。
4. 最后交付阶段配置 UI，并另行评审赢丢单和批量转交。

## 2. 模块与唯一责任

| 模块 | 权威职责 | 只读依赖 |
|---|---|---|
| `product` | 产品主数据的唯一写入口 | 数据字典中的产品线候选值 |
| `competitor` | 竞争对象清单的唯一写入口 | 无 |
| `opportunity` | 模板、阶段、商机、商品行、跟进、分析的唯一写入口 | customer/contact、sys_user/org_employee、product、competitor |
| `customer`（现有） | 客户和联系人事实 | 不因本项目改变所有权 |
| `auth/rbac/organization`（现有） | 登录用户、员工显示和角色授权 | 不复制用户/员工表 |

跨模块只通过应用服务/API 使用；商机模块不得更新客户、联系人、产品、竞争对象或用户主数据。

## 3. 拟议数据设计

| 物理对象 | 数据层级 | 作用域 | 删除/历史策略 |
|---|---|---|---|
| `md_product` | 企业共享产品主数据 | `tenant_id` | 停用；被引用后 Restrict |
| `sd_competitor` | 销售业务清单 | `tenant_id` | 停用；分析保存名称快照 |
| `sd_opp_template` | 销售流程配置 | `tenant_id + application_id` | 停用；编码不可改 |
| `sd_opp_stage` | 销售流程配置 | 模板作用域 | 停用；同模板一个默认阶段 |
| `sd_opp` | 销售交易聚合 | `tenant_id + application_id` | 停用/业务状态；版本并发 |
| `sd_opp_product` | 商机依附明细 | 商机作用域 | 未发布阶段允许删除；保留产品快照 |
| `sd_opp_follow_up` | 商机过程事实 | 商机作用域 | 逻辑停用 |
| `sd_opp_analysis` | 商机分析事实 | 商机作用域 | 建议追加不可改；保存判断快照 |
| `sd_opp_analysis_competitor` | 分析—竞争对象关系 | 分析作用域，rank 1/2 | 随分析保存；两个 rank 唯一 |

关键约束建议：

- 新物理表在 `_methodology/database-table-registry.json` 登记；不得新增 `crm_*`、`iam_*`、`ui_*` 或 `mdm_*` 表。
- 物理表名和字段名全部使用小写 `snake_case` 且不超过 32 个字符；商机聚合统一使用已登记的 `opp` 缩写。
- 业务表采用 UUID 主键、`timestamptz`、`numeric` 金额、`version`、创建/更新审计字段和显式 `@@map`。
- 商机模板编码在应用内唯一；阶段编码在模板内唯一；同模板只有一个启用默认阶段。
- 阶段赢率、把握度使用 0～100 整数并由数据库 `CHECK` 约束。
- 商机联系人使用 `(contact_id, customer_id, system_code)` 复合关系或同事务强校验，禁止引用其他客户联系人。
- 商机销售负责人使用 `(user_id, tenant_id)` 同租户外键；客户仍使用当前对象，不复制数据。
- 分析新增与商机阶段/把握度更新使用 Serializable 或带行锁/版本条件的单事务。
- 当前 `crm_customer`、`crm_customer_contact`、`crm_customer_address` 作为登记的遗留表继续由现有客户模块负责；本切片只引用现有对象，不静默改表。后续以独立迁移保留数据重命名为 `md_customer`、`md_customer_contact`、`md_customer_address`。

## 4. API 与权限草案

| 能力 | 拟议路由族 | 权限边界 |
|---|---|---|
| 产品 | `/api/systems/:systemCode/products` | product.view / product.manage |
| 竞争对象 | `/api/systems/:systemCode/competitors` | competitor.view / competitor.manage |
| 模板阶段 | `/api/systems/:systemCode/opportunity-templates` | opportunity.view；配置写入单独 manage-stage |
| 商机 | `/api/systems/:systemCode/opportunities` | opportunity.view/create/update |
| 商品行 | `/api/systems/:systemCode/opportunities/:id/products` | 继承父商机范围 + opportunity.product.manage |
| 跟进 | `/api/systems/:systemCode/opportunities/:id/follow-ups` | 继承父商机范围 + opportunity.follow-up.manage |
| 分析 | `/api/systems/:systemCode/opportunities/:id/analyses` | 继承父商机范围 + opportunity.analysis.create |

所有 DTO 使用 contracts 严格 Zod Schema；服务端从会话和应用解析租户/应用，不信任前端传入作用域。列表与详情权限、直接 API 写入和不可见数据 ID 均采用 fail-closed。

## 5. 页面与导航草案

- “基本信息”下新增：产品管理、竞争对象。
- 新增一级业务菜单“商机管理”，默认进入商机列表。
- 商机详情继续进入全局多 Tab 工作区；页面内部再显示商机信息、跟进记录、商机分析记录三个业务 Tab。
- 产品、竞争对象、商机分别注册 list-view `pageCode`，但用户视图不得扩大字段和数据权限。

## 6. 逐步执行

### Step 0：业务确认

- 批准 Business Gate 和 `Q-1701`—`Q-1711`；重点确认招投标阶段及阶段赢率。
- 未批准前只允许继续评审文档，不允许创建 migration 或代码。

### Step 1：切片 017 主数据基础

- 形成 017 Spec/Testcases，覆盖产品、竞争对象、模板阶段的字段、状态、唯一性、权限和 Seed。
- Architecture 设计表、复合外键、索引、迁移、回滚和双 Seed 验证。
- Gate 后再实现 Prisma → contracts → service/controller → RBAC → web 页面。

### Step 2：切片 018 商机核心

- 实现商机编号、列表查询、快速新建、详情基本信息和商品明细。
- 验证联系人归属、负责人作用域、默认模板/阶段、金额、停用产品和并发冲突。

### Step 3：切片 019 跟进

- 在父商机授权范围内实现跟进列表、新增、编辑和停用。
- 验证直接访问其他商机跟进 ID 被拒绝。

### Step 4：切片 020 分析

- 实现分析表单、双竞争对手、快照和历史列表。
- 用数据库集成测试证明分析与当前阶段/把握度原子一致，覆盖版本冲突和事务回滚。

### Step 5：切片 021 阶段配置

- 核心流程稳定后开放模板/阶段维护 UI。
- 重点验证默认阶段唯一、停用保护、已引用阶段历史展示及编码不可改。

## 7. 迁移、恢复与验证

- 采用新增表和新增约束的前滚 migration，不改写已应用迁移；对现有客户/联系人只增加必要复合唯一约束，不删除重建。
- Seed 区分系统必需模板/阶段与演示产品、竞争对象、商机；连续执行计数稳定。
- 本地验证至少覆盖空库全部 migration、双 Seed、唯一/外键/作用域/停用约束、权限、乐观锁、分析事务回滚和无孤儿关系。
- 每片执行 contracts、server、web 测试及 `pnpm verify`、`check-sdd.sh`；只有真实运行后才记录通过。
- 若需撤回未发布页面，先回退菜单/代码并保留新表；已应用 migration 使用前滚修复，不直接删除含业务记录的表。

## 8. 当前禁止动作

- 未过 Business Gate 就把推荐阶段、赢率或产品字段写成最终事实；
- 复制外部 MCRM 表或代码、修改外部项目；
- 为商机另建客户、联系人、用户副本；
- 用通用数据字典代替模板—阶段关系；
- 分析记录与商机当前值分两个非原子请求保存；
- 在未批准对应切片 Gate 前创建 Tasks、实施 migration、编码或声明发布。
