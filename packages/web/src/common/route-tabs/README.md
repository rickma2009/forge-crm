# 通用页面页签

公共入口 `index.ts`。无 CRM、权限服务、注册表、路由库或状态库依赖。React 19 + react-dom；样式自动随组件导入。新 React 项目复制整个目录即可使用；其他技术栈可单独复用 `model.ts` 的状态规则。

## 接入模板

```tsx
const { tabs, execute, refreshKey } = useRouteTabs({
  home: { path: '/', title: '工作台' },
  current: authorized ? { path, title } : null,
  activePath: path,
  onNavigate: navigate,
});
return <>
  <RouteTabs tabs={tabs} activePath={path} onNavigate={navigate}
    onAction={execute} getHref={(tab) => routerHref(tab.path)} />
  <main key={`${path}:${refreshKey}`}>{authorized && page}</main>
</>;
```

`path` 是唯一页签标识，`title` 是显示名，`closable: false` 保护固定页，`refreshKey` 是内容版本。宿主负责 URL 构造（Hash / History / 子路径）、授权检查和页面渲染；`getHref` 必须来自可信内部路由。退出或切换身份时卸载宿主，避免泄漏会话页签。页面标题不包含敏感对象数据。

本项目的可交互实例：启动 Web 后进入 `/?preview=workbench#/showcase/system/resources`（仅本地预览主机可用），从侧栏打开多个页面，再右键或 Shift+F10。生产模式仍经过原有登录与服务端鉴权。

## 操作契约 / 验收清单

- 右键目标与激活页面可以不同；刷新和关闭其他激活目标。
- 关闭激活页优先右邻、再左邻；关闭后台页不跳转。
- 关闭右侧后若原激活页已消失，必须使用返回的 activePath 同步 URL。
- 固定页在所有批量关闭中保留；关闭全部回第一个固定页。宿主应配置固定首页。
- 刷新只重建目标内容；浏览器、导航壳和其他页签不重载。
- 菜单显示六项操作，禁用无意义动作；右键、Shift+F10、上下方向键、Home/End、Esc、外部点击均可使用。
- 菜单通过 Portal 脱离滚动容器，并根据实际尺寸限制位置；小视窗内可滚动。
- 新窗口使用宿主提供的完整地址，noopener/noreferrer 隔离 opener；浏览器决定显示为窗口或浏览器标签。

## 来源与复用结论

原始证据：`_ref/supply/packages/scs-web/src/components/TabBar.tsx`、`_ref/supply/packages/scs-web/src/lib/tab-store.ts`，保留原相对路径，supply 未修改。用户来源：`.specify/sources/REQSRC-038-common-route-tabs-20260921/`。

| 类型 | 结论 |
|---|---|
| 源码事实 | supply 用 Dropdown contextMenu 和 Zustand store；刷新递增 refreshKey；固定首页；批量关闭与新窗口打开 |
| 实现推断 | store 与路由分开更新容易遗漏跳转：源 closeToRight 更新 activeKey，TabBar 未导航 |
| 当前项目采用 | 保留操作语义，改为纯函数统一返回 tabs/activePath；React hook 对接路由，菜单不依赖业务 |
| 排除 | supply 的菜单树、首页路径、路由归并、Ant Design、Zustand、12 页上限、KeepAlive 容器均未复制 |
| 适用条件 | 企业系统中可信路由的页面切换；已有授权检查；需要可迁移的公共交互 |
| 风险 / 未确认 | 未保存表单确认策略不在本次请求内；刷新/关闭会卸载内容。需要保留草稿的项目必须先设计保护策略 |
| 成熟度 | 候选公共资产；本地测试与浏览器证据见增量评审，不宣称跨项目最佳实践或业务验收 |

本次确认六项操作、固定页和导航不变量；业务路由、身份策略不能跨项目原样复用。现有切片 005 的规格还描述页面状态缓存和 12 页限制，当前壳未实现；本次限于用户指定菜单公共操作，不将整个切片重新声明为完整通过。

验证入口：`pnpm --filter @interaction-pattern-lab/web exec vitest run src/common/route-tabs src/showcase/ShowcaseApp.test.tsx`。测试覆盖纯函数边界、组件键盘与菜单行为、真实壳刷新与关闭导航。未来提升到方法论正式模式时，按来源证据 → 项目验证 → 模式/模板/案例 → 自动检查流程评审；当前模板和实例随公共模块交付。


UI-TAB-01 字体：工作区Tab标题和右键菜单共用 --ipl-font-family / --ipl-font-size（当前12px）；Portal容器显式应用同一令牌，菜单按钮 font: inherit，不得单独放大为14px。验收比较菜单普通/禁用/焦点项与Tab标题的计算字体族、字号。
