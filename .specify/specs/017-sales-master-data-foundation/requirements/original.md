# 上游需求

- `../../../requirements/009-opportunity-management/requirement.md`：`FR-OPP-001`—`FR-OPP-003`。
- `REQSRC-059`：企业域前缀和 32 字符约束。
- `REQSRC-060`：连续实施及统一 `opp` 命名授权。

## 2026-09-24 全局页面整改当前有效约定

来源：`UIAUDIT-20260923`，关联 `REQ-STYLE-01/04/09`。以下规则替代该范围历史呈现/接口冲突描述：产品、竞争对手采用公共业务列表工作区和服务端个人视图。产品编码、竞争对手名称为详情入口；新增位于查询下方工具栏，行修改仅使用图标；无操作权限省略操作列。

本次授权为用户要求按推荐方案直接整改；源码、单元测试与真实接口证据见 `.specify/requirements/global-page-style/audit.md`。历史 Release Gate 不覆盖本次增量；无新发布动作。
