# Architecture Plan: 009

> 状态：`approved-under-REQSRC-023-standing-authorization`

- 在项目入口样式表的 `:root` 定义字体族、基准字号、行高和大字号令牌。
- 用演示门户根作用域统一覆盖旧页面残留的零散字体声明，避免影响验证场目录之外的布局行为。
- 保留 `.ipl-type-large` 作为唯一显式大字号入口；不自动判断标题语义。
- 不修改组件业务逻辑、数据库或 API。
