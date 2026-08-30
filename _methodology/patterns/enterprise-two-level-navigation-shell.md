# 企业系统双层导航壳层模式

> 状态：interaction-verified
> 首次验证项目：MCRM / 003-enterprise-navigation-shell  
> 来源萃取：`reference-cases/gf-scm-enterprise-navigation-shell-distillation.md`

## 适用场景

- 桌面端企业系统，存在 2 个以上业务域或 6 个以上功能入口；
- 菜单需要按角色裁剪，并保持系统名称、搜索和账户区稳定；
- 内容页面密度较高，需要导航与内容滚动区分离。

不适用于只有 1—3 个入口的简单工具、以移动端为主的产品、需要三层以上复杂信息架构但尚未完成菜单治理的系统。

## 结构

```text
App Shell
├── Rail
│   ├── Brand：图标 + 系统名称 + Rail 折叠
│   ├── Menu Search
│   ├── Home / Workbench
│   ├── Level-1 Group（默认闭合）
│   │   └── Level-2 Route
│   └── Management Group（按权限显示）
├── Topbar
│   ├── Global Search
│   └── Account / Actions
└── Main：独立滚动内容区
```

## 不变量

1. 菜单最多展示两层；更深的对象关系进入页面内部，不继续堆叠侧栏。
2. 一级分组默认闭合；当前路由所在分组和搜索命中分组可以自动展开。
3. 菜单搜索保留命中项的祖先；空结果给出明确状态。
4. 图标通过稳定语义 key 映射，不在业务配置中保存组件实例。
5. 颜色、字体、尺寸、圆角、激活和状态色必须令牌化。
6. 菜单可见性不等于授权；路由和服务端继续校验。
7. Rail 折叠、宽度等属于用户 UI 偏好，可以本地持久化；权限菜单不可仅依赖本地缓存。
8. 顶部全局搜索必须声明真实查询范围；未接通时不得伪装成可用功能。
9. 折叠态的二级浮层同时支持鼠标悬停和键盘聚焦，展开状态通过 `aria-expanded` 同步表达。
10. 移动抽屉必须可通过遮罩和 `Escape` 关闭；顶部查询在目标列表刷新后仍应反映 URL 中的查询条件。

## 推荐令牌

| 令牌 | 基线值 | 用途 |
|---|---:|---|
| `--nav-rail-bg` | `#0f1729` | Rail 背景 |
| `--nav-rail-bg-elevated` | `#1a2438` | 浮层/二级面 |
| `--nav-rail-fg` | `#c4ccdc` | 菜单文字 |
| `--nav-rail-muted` | `#6b768f` | 占位和次级信息 |
| `--nav-primary` | `#2f6bff` | 激活、焦点和主操作 |
| `--nav-rail-width` | `232px` | 默认展开宽度 |
| `--nav-rail-collapsed` | `64px` | 折叠宽度 |
| `--nav-topbar-height` | `52px` | 顶栏高度 |
| `--nav-item-height` | `36px` | 菜单密度 |
| `--nav-brand-font-size` | `14.5px` | 系统名称字号 |
| `--nav-primary-font-size` | `13px` | 首页及一级菜单字号 |

完整复制起点见 `templates/ui/enterprise-navigation-shell/`；无需构建的交互案例见 `examples/002-golden-interaction-enterprise-navigation-shell/`。

## 验收清单

- 默认只显示一级菜单；点击后展开二级菜单；
- 当前路由具有文字、背景和左侧色条反馈；
- 搜索父项或子项都能得到正确树结果，清空后恢复；
- Rail 折叠后仍能通过图标和可访问名称导航；
- 折叠态悬停或聚焦一级菜单可显示二级浮层，离开后收起；
- `/` 能聚焦顶部搜索，输入框内 `/` 不触发重复抢焦点；
- 角色不可见项不进入 DOM，直接访问仍由 Route Guard 拒绝；
- 860px 以下变成抽屉，主内容不被永久挤压；
- 移动抽屉可通过遮罩与 `Escape` 关闭，`aria-expanded` 与视觉状态一致；
- 字体、颜色、图标和间距由统一配置管理。

## 晋升与复审

当前已在 MCRM 完成组件、构建和真实浏览器交互验证，因此记录为 `interaction-verified`；MCRM 003 的 Specification Gate 仍待明确重确认，且没有业务验收或发布证据。第二个独立项目采用时继续记录差异，满足方法论 09 后才晋升 `project-adopted`。
