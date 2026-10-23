# 需求追溯：我的收藏

| 追溯项 | Spec / 验收 | 测试 | 实现证据 |
|---|---|---|---|
| BUS-042-01 个人统一管理常用业务记录 | REQ-042-01, REQ-042-05 | TC-042-06, TC-042-07 | 收藏 API、门户工具栏和六类目录入口 |
| REQ-042-01 六类记录收藏与幂等 | AC-042-01 | TC-042-01 | `FavoriteService.add`、唯一键和 `createMany(skipDuplicates)` |
| REQ-042-02 用户/租户/应用隔离 | AC-042-02 | TC-042-02 | `sys_user_favorite` 租户/应用/用户字段、复合键、scope query |
| REQ-042-03 不新增收藏权限并沿用目标读取权限 | AC-042-03 | TC-042-04, TC-042-05 | `FavoriteService.canRead/resolve`、客户 `customerScope` |
| REQ-042-04 六类列表无编辑权限依赖的行收藏 | AC-042-04 | TC-042-07 | `EnterprisePages`、`OpportunityPages`、`InventoryPages`、`QuotationPages`、`sales-live/SalesLivePage` |
| REQ-042-05 顶栏入口 | AC-042-05 | TC-042-06 | `ShowcaseApp`、`FavoritesProvider`、`FavoritePanel` |
| REQ-042-06 收藏列表字段及倒序 | AC-042-06 | TC-042-03, TC-042-06 | `FavoriteService.list` 和 `FavoritePanel` |
| REQ-042-07 当前对象名称/编号解析 | AC-042-07 | TC-042-03 | `FavoriteService.resolve` 六个固定批量 resolver |
| REQ-042-08 有权详情跳转和不可用占位 | AC-042-08 | TC-042-04, TC-042-09 | resolver 的可读范围、`FavoritePanel` 对象链接 |
| REQ-042-09 确认取消并同步列表状态 | AC-042-09 | TC-042-08, TC-042-09 | DELETE API、确认对话框、Provider 状态更新 |
| NFR-042-01 复合唯一约束及查询索引 | AC-042-01, AC-042-02 | TC-042-01, TC-042-02 | Prisma `SysUserFavorite`、migration `20261006090000_personal_favorites` |
| NFR-042-02 有界批量名称查询 | AC-042-03, AC-042-07 | TC-042-03 | 按目标类型最多六次集合查询，非逐条 N+1 |
| NFR-042-03 可访问图标尺寸与键盘操作 | AC-042-04, AC-042-09 | TC-042-07, TC-042-09 | `FavoriteToggle` aria-label/title、共享 28×28 row-action 样式 |
| TASK-042-01 来源与需求/Spec | REQ-042-01 | TC-042-01 | `REQSRC-108` source、requirements/017、当前 Spec |
| TASK-042-02 模型与迁移 | REQ-042-02, NFR-042-01 | TC-042-02 | Prisma 模型和 `20261006090000_personal_favorites` |
| TASK-042-03 API 与解析 | REQ-042-01..03, REQ-042-07..08 | TC-042-01..05 | `FavoriteController`、`FavoriteService`、contracts |
| TASK-042-04 顶栏列表与确认 | REQ-042-05..06, REQ-042-09 | TC-042-06, TC-042-08, TC-042-09 | `Favorites.tsx`、`ShowcaseApp.tsx`、gateway |
| TASK-042-05 列表入口 | REQ-042-04 | TC-042-07 | 六类目录列表行操作 |
| TASK-042-06 L3 验证与记录 | NFR-042-01..03 | TC-042-01..09 | `review.md` 记录通过项和数据库/浏览器/基线限制 |

原始来源：`../../sources/REQSRC-108-personal-favorites-20261006/source.md`。详细当前态需求：`../../requirements/017-personal-favorites/requirement.md`。
