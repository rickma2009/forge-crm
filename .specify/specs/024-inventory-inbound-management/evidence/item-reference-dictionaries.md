# 物料来源与生命周期字典实现证据

来源：`REQSRC-102`，2026-10-05 用户确认按推荐方案实现。

## 实现

- `md_item.item_source` / `md_item.item_lifecycle` 为可空 `varchar(32)` 稳定字典项编码；迁移不猜测回填存量。
- `item_source` 初始值：`PURCHASED` 外购、`SELF_MANUFACTURED` 自制、`OUTSOURCED_PROCESSING` 委外加工。
- `item_lifecycle` 初始值：`INITIAL` 初始、`SAMPLE` 样品、`TRIAL_PRODUCTION` 试产、`SMALL_BATCH` 小批量、`MASS_PRODUCTION` 批量、`PHASE_OUT` 即将退市、`DISCONTINUED` 已退市、`VOIDED` 已作废。
- Seed 与专项既有系统初始化器只补缺项、不覆盖维护值；服务端校验字典所属系统与启用状态，并允许原停用引用在不改选时随其他字段保存。
- API 通过一次系统字典读取返回当前名称；物料表单、列表、导出及详情使用字典显示名。
- 数据迁移为旧系统/个人物料列表视图追加两列，保留现有列配置。
- 规范更新同步到数据库规范、PostgreSQL Profile、Plan 模板、金标准示例和数据库治理检查器。

## 已执行检查

- `pnpm --filter @forge-crm/server exec prisma validate`：通过。
- `pnpm --filter @forge-crm/server typecheck`：通过（含脚本 TypeScript 检查）。
- `pnpm --filter @forge-crm/web typecheck`：通过。
- `pnpm --filter @forge-crm/contracts build`：通过。
- `node _methodology/scripts/check-database-governance.mjs .`：通过。
- `pnpm --filter @forge-crm/web test -- src/showcase/InventoryPages.test.tsx`：8/8 通过。
- `pnpm --filter @forge-crm/server test -- --runTestsByPath src/inventory/item-reference-dictionary.spec.ts`：4/4 通过。
- 本机 PostgreSQL 已应用 migration，`prisma migrate status` 为 up to date；只读核对确认 `md_item` 两列存在、系统物料列表视图已包含两字段。
- `demo-portal` 字典初始化写入 11 项，随后重复执行变更数为 0；数据库核对 11 项均为 ACTIVE。
- 启动就绪检查 `/api/health/ready` 通过。
- Chrome 已登录 CRM 门户打开物料产品列表；页面正常渲染，列表视图设置中“物料来源”和“生命周期阶段”两列均存在且勾选。前端实现将这两列分别映射到服务端返回的当前字典名称；列表网格的独立测试为本次 Web 8 项通过结果之一。

`SYSTEM_CODES` 中的 `secondary-demo` 初始化因本地库不存在该应用作用域而按设计拒绝；demo-portal 初始化已独立提交成功。浏览器验收确认物料目录可访问且新列已进入有效默认视图配置；列标题与动态数据映射另由对应组件测试覆盖。发布/部署不在本次授权内。

`prisma migrate deploy` 同时应用了当时数据库中另一个既有待执行 migration `20261005170000_sales_workflow`；该迁移不属于本需求，执行前已存在于仓库。
