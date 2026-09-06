# Implementation Evidence: 009

- 项目级令牌位于 `packages/web/src/styles/index.css`：`--ipl-font-family`、`--ipl-font-size`、`--ipl-font-size-large`、`--ipl-line-height`。
- 演示门户及登录页所有文字型元素统一引用字体族和基准字号；显式 `.ipl-type-large` 才使用大字号令牌。
- 专项样式测试 2/2、Web 全套 67/67、完整 `pnpm verify`、来源检查和切片 SDD 检查通过。
- 浏览器实际计算值：菜单、标题、内容、按钮、下拉、表格均为 `12px`，字体族为 `Avenir Next / Segoe UI / PingFang SC / Microsoft YaHei / sans-serif`。
- 仅发布到本地验证场；未执行外部部署或方法论模式晋升。
