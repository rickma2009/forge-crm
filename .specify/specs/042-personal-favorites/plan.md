# 技术计划：我的收藏

> 功能编号：042-personal-favorites  
> 状态：proposed-under-user-development-request  
> Architecture Gate：按用户开发授权及本计划推荐方案推进；生产发布仍不在范围

## 1. 范围

打通收藏表、无收藏专属授权的 API、门户顶栏列表入口、六类列表行操作及取消确认。保留业务目标读取授权、客户数据范围和当前应用隔离。

## 2. 架构方案

公共系统层新增 `FavoriteController/Service`，复用 `SessionGuard`、`WriteRequestGuard`、`AuthorizationService` 与各领域现有查询/可见性策略。 contracts 提供类型、Schema 与 API 契约；前端在 `ShowcaseApp` 顶栏统一展示收藏面板并给六类列表注入受控行操作。

## 3. 数据设计

- 分层：`sys_` 用户偏好/系统平台数据；登记 `sys_user_favorite`。
- 唯一责任模块：`packages/server/src/favorites/`；通过 API 访问，禁止其他模块直接写收藏表。
- 字段：UUID `id`、`tenant_id`、`application_id`、`user_id`、`target_type`、`target_id`、`created_at`。
- 类型：`CUSTOMER`、`PRODUCT`、`ITEM`、`OPPORTUNITY`、`QUOTATION`、`SALES_ORDER`；API 不接受自由表名/动态 SQL。
- 唯一键：`(application_id,user_id,target_type,target_id)`；索引 `(application_id,user_id,created_at DESC,id DESC)`。
- 作用域：从会话及系统代码解析 tenant/application，不信任客户端租户或用户 ID。`target_id` 为多态目标，无法声明单一外键；收藏创建与显示均经服务端类型注册解析器验证目标及同作用域，不可见/缺失收藏保持可清理。
- 名称字段不复制到收藏表；显示时按类型有限次批量加载，输出当下对象名称/单号。无权、缺失、跨作用域记录统一输出 `available=false` 与“对象不可用”。
- 审计：偏好关系保留 `created_at` 作为收藏时间，创建主体即 `user_id`；取消物理删除，无独立审核审计需求。
- Seed：不涉及。
- 迁移恢复：只增新表与索引，无历史回填；回滚通过新迁移删除收藏表，仅限开发/预发布经批准后使用。

## 4. API

| ID | 路由 | 用途 | 授权 |
|---|---|---|---|
| API-042-01 | `GET /api/systems/:systemCode/favorites` | 当前用户当前系统收藏与批量当前名称解析 | 登录 + 对每种可见对象既有读取授权 |
| API-042-02 | `POST /api/systems/:systemCode/favorites` | 收藏目标，重复时幂等 | 登录 + CSRF + 目标类型现有读取授权及数据范围；无收藏 action |
| API-042-03 | `DELETE /api/systems/:systemCode/favorites/:favoriteId` | 取消当前用户的收藏 | 登录 + CSRF；只按会话 user 和 app 删除 |

## 5. 页面

- 工具栏加入星形图标，名称“我的收藏”，位于现有工作区首页入口后/消息前。弹层或抽屉显示完整列表，收藏值链接进入对应对象详情。
- 客户、产品、物料产品、商机、报价单、销售订单列表添加图标按钮；提供 aria-label/title“收藏/取消收藏”，不依赖编辑、删除权限。
- 收藏列表行取消后先固定右下角确认区弹窗，主动作“确认取消收藏”在右，取消动作在左。

## 6. 安全与性能

- API 不使用客户端提供的 userId/tenantId；跨用户/应用的 ID 不可被收藏或解析。
- 不增加全局 favorite permission；但在 GET/POST 逐目标类型校验既有查看权限与客户数据策略，防止收藏成为读取旁路。
- ID 解析全部使用固定 resolver 与作用域查询；多态目标名称以最多六次批量查询完成。
- 列表按时间和 ID 稳定排序。当前不设定硬性收藏数上限；若实际数据量需要分页，作为后续规格变更处理。

## 7. 验证

按 L3 验证：Schema 与 migration 数据库用例、收藏服务/API 授权用例、六类名称 resolver、前端行操作/顶栏/确认流程、类型/格式及浏览器验收。运行完整 SDD 检查和项目必要完整验证；结果只按实际记录。

## 8. 风险和恢复

多态目标缺少数据库外键，依靠目标类型白名单、同一事务写入校验、作用域查询和可用性复核；测试需要覆盖 ID 伪造和对象删除/失权。收藏是可重建个人偏好，不支持迁移数据回填。
