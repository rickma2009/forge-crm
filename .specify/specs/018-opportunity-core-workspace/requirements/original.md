# 上游需求

`../../../requirements/009-opportunity-management/requirement.md` 中 `FR-OPP-004`—`FR-OPP-005`。

## 2026-09-24 全局页面整改当前有效约定

来源：`UIAUDIT-20260923`，关联 `REQ-STYLE-01/06/09`。以下规则替代该范围历史呈现/接口冲突描述：商机菜单进入公共列表工作区，编号链接打开详情，移除独立查看操作。详情返回严格契约，不将数据库关联字段直接返回；失败可重试，切换商机/刷新不使用上一条详情。

本次授权为用户要求按推荐方案直接整改；源码、单元测试与真实接口证据见 `.specify/requirements/global-page-style/audit.md`。历史 Release Gate 不覆盖本次增量；无新发布动作。
