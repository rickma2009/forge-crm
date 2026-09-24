# Architecture Plan

## 数据与所有权

- 公共系统层 `rbac` 是唯一责任模块。
- 新增 `sys_page_resource`、`sys_page_button`、`sys_page_tab`；现有 `sys_menu` 继续作为实际导航挂载，新增 `page_resource_id`、打开方式与备注字段。
- 所有资源以 `application_id` 隔离；父子使用同应用复合外键；按钮与页签为资源依附数据，物理删除仅限未被发布的依附记录，资源本身只停用。
- `sys_permission` / `sys_role_permission` 继续作为角色权限唯一事实源；不引入个人授权。

## 不变量

- 同应用页面编码唯一；同页面按钮编码和页签名称唯一。
- 资源树、导航树均禁止自引用和循环；根系统资源不可删除。
- 页签目标、导航挂载与所属页面必须处于同一应用。
- 自动挂载和按钮权限发布与资源写入在同一事务完成；写入携带 `version`，冲突失败。
- 所有配置变更写结构化审计日志。

## API 与前端

- `/api/systems/:systemCode/resource-menu/pages`：树查询、CRUD、拖拽与导出。
- `/pages/:pageId/buttons`、`/tabs`：子资源维护。
- `/navigation-mounts`：当前系统左侧菜单挂载的查询与原子替换。
- Web 新增 `ResourceMenuPage`，复用项目级字体和企业表单样式，右键菜单具备键盘可达的等价操作。

## 迁移与恢复

- 新 migration 前滚建表、扩展 `sys_menu` 并从现有导航回填页面资源，不修改历史迁移。
- Seed 幂等发布页面资源、按钮与新权限；重复执行不得产生重复资源或授权。
- 回退通过后续 migration 停用新入口并保留数据；不删除已产生的审计事实。
- REQSRC-055 的一次性清理采用显式资源编码白名单，只删除 `demo-portal` 中已停用的目标资源；存在启用子节点或保留引用时事务失败。该不可逆数据清理的恢复依赖执行前数据库备份，不提供反向重建迁移。

## 验证

- Contracts、树移动规则、组件交互、API/DB 集成、两次 Seed、全仓 `pnpm verify`。
- 浏览器验证 admin 可操作、viewer 无入口，并检查右键菜单、拖拽、弹窗和刷新后持久化。
