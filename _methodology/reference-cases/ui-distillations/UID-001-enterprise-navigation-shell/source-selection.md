# UID-001 来源选择记录

## 目标页面

带品牌区、菜单搜索、业务菜单、底部管理分组和折叠能力的桌面企业导航壳层。

## 本轮选用来源

### 主来源

- 仓库：`_ref/gf_scm/`
- 固定提交：`3c8b69304d78c7bd01dd9627454fe8d496be8f07`
- 工作区状态：存在用户未提交改动；本轮只读，所有定位均指向读取时工作区，不能把提交 SHA 单独视为完整字节版本。

| 文件 | 用途 |
|---|---|
| `packages/scs-web/src/components/Layout.tsx` | 菜单组件、品牌、搜索、递归菜单、底部分组、折叠和布局组合 |
| `packages/scs-web/src/lib/nav.tsx` | 静态菜单数据、底部系统管理完整子项和图标映射入口 |
| `packages/scs-web/src/lib/nav-transform.ts` | 动态菜单树转换及底部管理分组拆分规则 |
| `packages/scs-web/src/hooks/useNavMenu.ts` | 动态菜单加载、失败降级、重试和刷新机制 |
| `packages/scs-web/src/index.less` | 颜色、字号、尺寸、间距、激活态、折叠态和搜索框样式 |
| `packages/scs-web/src/lib/icons.tsx` | 16px 导航 SVG 图标实现 |
| `packages/scs-web/src/lib/icon-map.tsx` | 稳定图标 key 与图标实现映射 |

### 视觉辅助来源

- `interaction-pattern-lab/.specify/sources/REQSRC-013-multi-source-ui-distillation-and-navigation-request-20260903/navigation-reference.png`
- 用途：确认上方业务菜单、下方管理菜单、分隔线、深色背景、密度和弱化色层级；不用于推断隐藏交互。

## 本轮未选来源

- `_ref/gscrm-sdd/`：已登记为未来候选来源，但用户尚未指定其中的具体页面或原型，本轮不参与菜单合成。
- 其他外部项目或 Open Design 原型：未指定具体版本和页面，本轮不参与。

## 保留内容

- 上方主导航和底部管理分组的空间结构；
- 品牌区、菜单搜索、当前项、可展开项、滚动区和底部分隔；
- 字体、尺寸、颜色、间距、折叠和浮层行为的可配置令牌；
- 图标使用稳定语义 key，而不是把组件对象写进菜单数据。

## 排除内容

- 来源项目名称、Logo、业务菜单、业务描述和路由；
- 来源系统动态 IAM、组织权限和模拟登录业务；
- 来源专属缓存 key、接口路径、Tab/KeepAlive 和顶部业务搜索；
- 未经新切片批准的真实后端权限或账号体系。

## 冲突与未知

- 现有正式导航模板基线宽度为 `232px`、菜单高度为 `36px`，本次源码实际为 `220px` 和 `34px`。候选暂按源码与截图记录，不静默覆盖正式模板；后续在验证场对比后决定是否形成密度变体。
- 截图没有展示折叠态、键盘操作和移动端，不可据此认定这些行为已验证。
