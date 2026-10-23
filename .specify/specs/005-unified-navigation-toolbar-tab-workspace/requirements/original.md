# 原始需求定位

- 主来源：`REQSRC-022`；
- Business Gate 与连续实施授权：`REQSRC-023`；
- 上游业务需求：`.specify/requirements/005-enterprise-workspace-configurable-customer-directory/requirement.md` 中 `FR-501`—`FR-503`；
- 被增量修改的历史基线：切片 004。

本文件只定位来源，不重写用户原文。


### 2026-09-24 工作区菜单字体修正
REQ-TAB-FONT-01 → UI-TAB-01 → AC-TAB-FONT-01 / TC-TAB-FONT-01：右键菜单字体族/字号与路由 Tab 标题一致，当前为全局12px，Portal 不得退回 body 默认字号。浏览器比较菜单各项（含禁用/焦点）与Tab的 computed fontFamily/fontSize；原有六项动作不变。来源 `.specify/sources/2026-09-24-tab-menu-font/original.md`；当前态需求见 global-page-style/requirement.md。用户直接授权本样式修正，无 Architecture 数据/安全变更。

## 2026-10-09 当前有效入口规则

REQ-DEFAULT-AGENT：登录成功、切换系统或已有会话从根入口进入时，具有Agent工作台页面权限的账号默认进入 `/showcase/agent`。没有Agent权限则回退我的工作台，不扩大权限。已有会话刷新明确业务地址继续保持该地址。数字员工根菜单及各二级分类默认收起，可由用户展开，搜索保留匹配结果展开。替代之前默认我的工作台及数字员工预展开行为。来源UIRULE-20261009-default-agent；用户直接授权本次局部入口交互变更。Business/Architecture Gate不受影响。AC-DEFAULT-AGENT：有权限登录进入Agent，无权限回退工作台，数字员工初始aria-expanded=false且点击可展开。
