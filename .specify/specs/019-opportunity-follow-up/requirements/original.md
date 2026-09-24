# 上游需求

`../../../requirements/009-opportunity-management/requirement.md` 中 `FR-OPP-006`。

## 2026-09-24 全局页面整改当前有效约定

来源：`UIAUDIT-20260923`，关联 `REQ-STYLE-06`。以下规则替代该范围历史呈现/接口冲突描述：新增与修改跟进接口在成功后返回完整商机详情，与前端契约一致；不改变跟进权限和业务字段。

本次授权为用户要求按推荐方案直接整改；源码、单元测试与真实接口证据见 `.specify/requirements/global-page-style/audit.md`。历史 Release Gate 不覆盖本次增量；无新发布动作。
