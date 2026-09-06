# Architecture Plan: 005

> 状态：`approved-by-REQSRC-023-default-authorization`

1. 新迁移删除 `ui_menu.menu_zone` 和 `MenuZone` 枚举；不改写 004 历史迁移。
2. 合同将 `NavigationResponse.primary/management` 改为 `items`，授权服务构造单树。
3. Web 壳层拆为普通滚动导航、常驻 `GlobalToolbar`、`RouteTabs` 与保活内容容器。
4. 页签状态保存在 React 内存，以路径为键；页面实例按页签保留，刷新通过 `refreshKey` 重新挂载。
5. 不引入新状态库；保持 React/TypeScript 现有技术栈和 Hash URL。

失败策略：授权或路由校验失败不创建可见业务内容；工具栏消息无数据源显示零和空态。
