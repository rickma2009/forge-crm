# 026 需求追踪矩阵

| 验收标准 | 实现位置 | 自动化/事实证据 | 状态 |
|---|---|---|---|
| AC-026-01 | `ShowcaseApp.tsx` 登录后固定注入入口并跳过该页 page-access | `ShowcaseApp.test.tsx`；浏览器 network 无 page-access 请求 | 通过 |
| AC-026-02 | `InteractionIndexPage.tsx` 仅使用 gateway API，无运行时 JSON import | 页面失败态测试、隔离校验、源码搜索 | 通过 |
| AC-026-03 | taxonomy API + `TreeWorkspace` 类型/分组命名空间节点 | 服务测试、页面测试、浏览器 PAGE/系统与任务入口类筛选 | 通过 |
| AC-026-04 | `RecordQueryBar` 的关键词、类型、分组、成熟度与统一重置 | 页面测试；浏览器筛选后 1 条、重置后 124 条 | 通过 |
| AC-026-05 | `CatalogRow` + `InteractionDetail` 覆盖式详情 | 页面测试确认无 `role=dialog`；浏览器详情成功 | 通过 |
| AC-026-06 | `DetailHeader` 标准返回；目录状态保留在父组件 | 页面状态恢复测试；浏览器返回保留关键词/PAGE/分组 | 通过 |
| AC-026-07 | `style-scene.seed.ts` 按系统+资产编码 upsert | seed 单测；连续两次 seed；数据库 103=103 唯一 | 通过 |
| AC-026-08 | 迁移仅新增 nullable 字段/索引；seed 不处理 NULL 编码记录 | migration/seed 测试；数据库仍有 21 条历史记录 | 通过 |
| AC-026-09 | `parseRootRoute` + 应用启动时 `replaceState` | domain/App 测试；浏览器旧 URL 重载验证 | 通过 |

结论：AC-026-01 至 AC-026-09 均有实现、自动化测试和/或运行时事实证据，可进入 Release Review。
