# 原始需求定位

- 基线来源：`REQSRC-022`；
- Business Gate 与连续实施授权：`REQSRC-023`；
- 紧凑列表增量：`REQSRC-024`；
- 上游需求：需求包 005 的 `FR-508`—`FR-510`，增量 `FR-511`—`FR-516`。

本文件只定位不可改写来源。

## 2026-09-24 全局页面整改当前有效约定

来源：`UIAUDIT-20260923`，关联 `REQ-STYLE-01/05/09`。以下规则替代该范围历史呈现/接口冲突描述：移除查看图标，客户编码作为详情入口；无修改权限不显示空操作列。设置另存后同时使用个人视图并恢复其引用；系统视图禁止个人覆盖时禁用设置。

本次授权为用户要求按推荐方案直接整改；源码、单元测试与真实接口证据见 `.specify/requirements/global-page-style/audit.md`。历史 Release Gate 不覆盖本次增量；无新发布动作。

### UIRULE-20260924-detail-workspace 当前有效详情样式

REQ-DETAIL-001 / AC-DETAIL-001 / TC-DETAIL-001：遵循总样式 UI-DETAIL-01，替代旧独立摘要卡片/record-tabs/内部卡片组合。使用公共头部（返回+标题、带标签摘要）、客户式下划线Tab及平铺正文；无Tab不强加。适用客户、商机、报价，保留权限、离开保护和数据操作。验收返回目标、Tab箭头/Home/End、手机布局、表格滚动和无内部卡片边框。实现对应 DetailWorkspace.tsx、三个详情页及组件/浏览器回归。Specification按用户明确呈现变更更新并授权本地实施；不涉及数据库和Architecture变更，Release状态不变。
