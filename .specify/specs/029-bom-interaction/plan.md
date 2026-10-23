# BOM 交互技术方案

数据层级：`scm_bom` 是 BOM 头，`scm_bom_line` 是当前版本的直接组件，`scm_bom_alternative` 是行级替代料；`md_item` 为唯一物料主数据来源。BOM 模块负责写入，其他模块不直写。租户和应用均入表，外键在同一 tenant/application 范围内；物料外键按 tenant 约束。物理表登记在数据库表注册表。

发布版本不可变；草稿保存以事务内版本检查和整体替换完成。`scm_bom_current_key` 与 `scm_bom_draft_key` 限制同一产品的当前版和草稿。删除策略：不提供 BOM 删除；引用已发布子版本的父版本固定不变。创建、复制、保存、发布写审计。版本没有有效期字段，按当前标记和版本号区分。

迁移路径：`20261001090000_bom_interaction`。本地演示数据使用独立、幂等脚本，不运行会重置账号信息的全量种子。回滚需先备份并确认演示 BOM 数据可丢弃，再逆序删除替代料、组件、头表；正式环境禁止自动丢表。数据库测试覆盖多层累计数量、替代料、权限、导入校验和版本冲突。

前端使用 `BusinessDirectory`、`DeclarativeDataGrid`、`DrawerWorkspace`、`DetailBackButton` 和全局样式。交互模板库中可映射列表模板 TPL-01-02；BOM 详情作为后续树形明细模板的实际候选案例，完成截图与交互验收后登记效果预览。
