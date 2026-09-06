# 带底部管理分组的企业导航壳层候选

> 状态：`candidate`

## 结构

```text
Navigation Rail
├── Brand：图标 + 系统名称 + 折叠控制
├── Menu Search
├── Primary Navigation（独立滚动）
│   ├── Home
│   └── Expandable Groups
└── Management Navigation（固定底部）
    └── Expandable Management Group
```

## 组件槽位

- `BrandSlot`：系统图标、名称和折叠按钮；
- `MenuSearch`：按名称搜索并保留命中祖先；
- `PrimaryNavigation`：首页、业务组和页面入口；
- `ManagementNavigation`：固定底部分组，与主导航以边框分隔；
- `NavigationItem`：图标、标签、徽标、展开状态和激活状态；
- `CollapsedOverlay`：折叠时展示分组子项；
- `RouteGuardPort`：由采用项目提供最终路由授权。

## 通用行为

1. 主导航可以滚动，管理分组保持在底部；
2. 搜索同时过滤主导航和管理分组；
3. 搜索命中子项时保留祖先；
4. 当前路由具有明显激活状态；
5. 菜单数据只保存稳定 icon key；
6. 成功返回空权限菜单时不回退全量菜单；
7. 折叠偏好可以本地保存，权限结果不得作为本地可信事实。

## 当前未验证

- 浏览器视觉一致性；
- 键盘聚焦与折叠浮层；
- 不同窗口高度下底部管理菜单的滚动策略；
- `admin` 与受限账号的 capability 行为；
- 220/34 与既有 232/36 密度变体的取舍。
