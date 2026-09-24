# 原始需求

受控来源：`../../../sources/REQSRC-056-organization-employee-directory-20260922/source.md`。
上位设计：`../../../组织员工角色权限-方案设计.md`。

## 2026-09-24 全局页面整改当前有效约定

来源：`UIAUDIT-20260923`，关联 `REQ-STYLE-01`。以下规则替代该范围历史呈现/接口冲突描述：员工工号链接打开只读详情，修改为独立图标；只读用户无空操作列。此列表为固定组织权限管理目录，本次不扩展个人视图。

本次授权为用户要求按推荐方案直接整改；源码、单元测试与真实接口证据见 `.specify/requirements/global-page-style/audit.md`。历史 Release Gate 不覆盖本次增量；无新发布动作。
