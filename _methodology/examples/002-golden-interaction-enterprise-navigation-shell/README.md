# 金标准交互案例：企业系统双层导航壳层

这是无需构建即可运行的交互案例，用于评审企业系统菜单的结构、样式与关键状态。它不包含真实权限和后端数据。

分类映射：`EPM-PAGE-001` 应用壳层；同时覆盖导航与发现操作、页面级容器展示，以及无结果、折叠和移动抽屉状态。分类定义见 `../../08-企业管理系统交互模式分类方法.md`。

## 运行

```bash
python3 -m http.server 4174 --directory _methodology
```

打开 `http://127.0.0.1:4174/examples/002-golden-interaction-enterprise-navigation-shell/`，验证：

- 两个一级分组默认闭合；
- 点击父项展开/收起；
- 菜单搜索命中子项时保留并展开父项；
- 左侧 Rail 可折叠并持久化；
- 折叠态悬停或聚焦一级菜单可打开二级浮层；
- `/` 聚焦顶部搜索；
- 860px 以下切换为移动抽屉，遮罩或 `Escape` 可关闭。

规范与适用边界见 `../../patterns/enterprise-two-level-navigation-shell.md`。
