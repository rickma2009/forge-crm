# 技术计划

- 数据：`md_product`、`sd_competitor`、`sd_opp_template`、`sd_opp_stage`；UUID、租户/应用作用域、版本、审计、Restrict。
- 服务：新增 `product`、`competitor`、`opportunity` 模块，严格 Zod Contract 和 RBAC。
- 页面：基本信息下产品管理、竞争对象，复用客户列表查询、表格和弹窗。
- 迁移：只新增前滚 migration；Seed 幂等；数据库约束、API 和页面测试后方可完成。
