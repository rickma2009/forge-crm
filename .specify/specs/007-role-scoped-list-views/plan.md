# Architecture Plan: 007

> 状态：`approved-by-REQSRC-023-default-authorization`

- 新增 `ui_system_list_view`、`iam_role_list_view`、`ui_user_list_view`、`ui_user_list_view_preference`。
- 配置使用结构化 JSON，经共享 Zod Schema 校验；字段目录由页面资源代码内声明，服务端校验允许字段。
- 视图解析服务先取当前角色集合，再解析个人视图和偏好；所有写接口从会话取用户。
- 客户列表作为首个适配器；通用 Web 组件不包含客户业务字段。
