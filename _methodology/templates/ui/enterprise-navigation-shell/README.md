# 企业系统双层导航壳层模板

这个模板用于新系统在架构/交互设计阶段选择导航模式。先阅读 `../../../patterns/enterprise-two-level-navigation-shell.md`，再复制令牌和 JSON 配置骨架到目标技术栈。

## 使用步骤

1. 在 Business/Specification Gate 确认系统名称、首页、一级业务域、二级功能、角色可见性和全局搜索范围。
2. 复制 `navigation-shell.tokens.css`，按品牌调整令牌，不在页面散落色值。
3. 根据 `navigation-schema.example.json` 建立项目菜单配置和图标 registry。
4. 实现默认闭合、搜索保留祖先、激活反馈、Rail 折叠、折叠态悬停/聚焦浮层、移动抽屉和键盘焦点。
5. 顶部查询与目标列表 URL/query 保持同步；移动抽屉支持遮罩和 `Escape` 关闭。
6. 保留目标项目的 Route Guard 和服务端权限；不要把菜单隐藏当成授权。
7. 使用金标准交互案例对照，并完成真实浏览器验收。

## 选择记录

采用时在项目 Plan 或 ADR 记录：选择原因、菜单规模、搜索范围、品牌令牌差异、移动端策略和不采用的能力。
