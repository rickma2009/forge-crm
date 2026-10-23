# 从 React 状态归属理解公共组件边界

目标：让学员能判断一个状态由谁维护，避免公共组件与业务页面各存一份相同状态。适合有 React 基础的成员，建议 30 分钟；包含源码核对及可运行契约测试，没有新增业务行为。

## 来源事实与本项目决策

2026-10-03 阅读 React 官方资料：

- [Sharing State Between Components](https://react.dev/learn/sharing-state-between-components)：需协同的状态可放到最近公共父级，以 props 和事件回调协调；每份状态应有明确维护者，并不要求所有状态都全局化。受控与非受控也不是非此即彼。
- [State as a Snapshot](https://react.dev/learn/state-as-a-snapshot)：事件处理函数读取当前渲染的状态快照；调用 setter 不会立即改掉该函数中的状态值。

官方资料解释 React 机制，不替本项目决定查询接口、权限或持久化。以下分工来自本项目源码核对及设计判断。

| 本项目对象 | 实际维护者 | 公共组件的责任 |
|---|---|---|
| 库存查询输入 form | CurrentInventoryPage | RecordQueryBar 只布局 children 并触发查询/重置 |
| 已提交条件 filters | CurrentInventoryPage | 不在查询栏内部请求库存接口 |
| 选中物料与下表内容 | CurrentInventoryPage | 不让查询栏知道物料、法人、币别 |
| 当前视图 value、options | ListViewSelector 调用方 | 显示 props，选择时通过 onChange 报告 |
| 设置是否允许 | 调用方传 settingsDisabled | 组件表现禁用；服务端仍负责实际保存授权 |

代码证据：[RecordQueryBar](../../../packages/web/src/common/RecordQueryBar.tsx)、[ListViewSelector](../../../packages/web/src/common/ListViewSelector.tsx)、[库存页面](../../../packages/web/src/showcase/InventoryStockPages.tsx)。目前两个公共组件都没有自己复制一份业务查询/视图状态，也没有接入业务 API。

form 和 filters 不是误复制：前者是未提交草稿，后者是已应用条件，业务语义不同。用户改输入但未点击查询时，结果不应偷偷按新条件变化。反之，若视图选择器同时维护 localValue 和父级 value，却没有明确覆盖规则，就可能在父级恢复默认视图后仍显示旧值。

## 一个需要警惕的重置写法

```tsx
// 反例：load 如果闭包读取 keyword，此刻仍读到旧值。
setKeyword('');
load();
```

可选修正是明确传递本次条件：

```tsx
const next = '';
setKeyword(next);
load(next);
```

这是示意片段，load 必须定义为接受该参数的函数；不能仅加一个参数就声称原页面已修复。库存页面目前采用另一种方式：分别设置 form 与 filters，查询 effect 读取已提交的 filters；重置同时清空明细选择。不要额外调用旧闭包造成第二次查询。

## 练习与验收

1. 阅读上述三个文件，列出“输入草稿、已提交条件、选择项、请求结果、加载状态”的维护者，指出哪些状态语义不同，哪些不应重复保存。
2. 阅读[查询栏宿主](../../../_methodology/examples/query-bar-adoption/main.tsx)与[视图选择器宿主](../../../_methodology/examples/list-view-selector-adoption/main.tsx)，解释为何 setValues/setValue 留在调用方。练习代码不需要业务数据库。
3. 在独立工作副本中尝试把 selectedView 的第二份状态放入子组件，设计父级重置后应如何显示的反例；比较受控方案与明确 defaultValue 的非受控方案。不要为了统一形式禁止所有组件内部状态。
4. 使用[演练入口](../../../_methodology/components/quickstart.md)构建需要的宿主，按 README 验证；记录自己的结果，不引用历史通过结果代替执行。
5. 交付一页责任表、一个失败场景及修正方案。验收重点：未提交输入不影响结果；重置使用清空条件；父级切换视图后显示一致；业务权限没有被移入纯展示组件。

可给 AI 的任务：请先列出每份状态的业务含义和唯一维护者，再提出组件接口。区分未提交输入与已应用条件，不把两者误合并；不要把 API、权限和持久化暗藏进公共查询栏。指出 setter 后读取旧快照的风险，并提供一个可观察的反例，而非只改变量名。

## 证据与复用限制

### 后续反例：相同条件不代表同一次查询

2026-10-03 库存页回归发现：form/filters 已分开，但查询 effect 只依赖序列化条件及页码。第一页再次提交相同条件时，尽管调用方执行了 setter，依赖值仍相同，没有重新取数；条件已空时重置也有同一缺陷。

新增两个页面的针对性用例，首次执行 2 失败、原 3 项通过（请求仍只有 1 次）。修正后显式查询和重置递增独立刷新序号，effect 同时依赖条件、页码和刷新序号；保留旧 effect 清理对过期结果的屏蔽，不额外在回调里直接请求旧闭包。5 项页面测试全部通过（3.98 秒）。业务查询不放入 RecordQueryBar，输入草稿也未改为自动提交。

反例说明：筛选值回答“查什么”，显式重新查询回答“何时再查一次”，两者不能误合并。目标项目也可用查询库的 refetch 或查询事件实现，不必复制刷新序号。先定义刷新、重置、在途请求和错误重试语义，再选择机制；此处不证明所有网络竞态或服务端缓存正确。

浏览器复验入口：`node scripts/check-inventory-refresh-browser.mjs`，需要本机应用服务与演示登录配置、已有 Playwright/Chrome（可设 PLAYWRIGHT_MODULE_PATH）。逐次捕获点击后的新 GET 请求，再检查该请求的响应，避免仅等到旧在途响应就误判刷新成功。实际执行记录见[库存查询验收](../../testing/current-inventory-acceptance.md)。

### 响应顺序与请求取消是不同证据

后续为两张库存页各补充“旧请求晚到成功/失败”用例，页面测试共 9 项通过（5.55 秒）。测试先保留第一次 Promise，再发起相同条件的第二次查询，让新结果先显示，然后显式 resolve/reject 旧 Promise；断言新结果不被替换，也没有出现旧错误。无需固定 sleep，顺序由测试直接控制。

现有 effect 清理把旧请求的 active 标记设为 false，已经满足这些断言，本轮无需更改组件运行逻辑。学员应说明：忽略过期结果保护了显示一致性，但没有证明 HTTP 请求被取消或服务端任务被停止。若目标项目需要节省资源，应另行设计 AbortSignal 或服务端任务取消，不能凭 UI 未变就声称已实现取消。

练习交付：画出 A 发起 → B 发起 → B 成功 → A 成功/失败的时间线，分别写结果、错误和加载状态应由哪个请求控制。然后核对自己的测试是否主动制造了这个顺序。只连续点击而不控制响应时序，可能一直命中正常顺序，不能充当乱序验证。

2026-10-03 先完成官方来源、源码和引用核对，随后补充并执行契约测试：在仓库根运行 `pnpm --filter @forge-crm/web exec vitest run src/common/RecordQueryBar.test.tsx src/common/ListViewSelector.test.tsx`，两个文件共 5 项通过。没有新增浏览器测试。已有[库存验收](../../testing/current-inventory-acceptance.md)与[视图选择器演练](../../../_methodology/examples/list-view-selector-adoption/README.md)只证明各自记录的行为和版本，不能证明本练习在团队中已完成或已提高效率。

| 测试来源 | 本次能证明的行为 | 不能证明 |
|---|---|---|
| [查询栏契约](../../../packages/web/src/common/RecordQueryBar.test.tsx) | 输入草稿不请求；Enter 提交当前值；重置提交空条件；queryDisabled 阻止直接 form 提交但仍允许重置 | 网络竞态、实际 API 参数、浏览器排版 |
| [视图选择器契约](../../../packages/web/src/common/ListViewSelector.test.tsx) | 父级未接受选择时显示原值；父级更新/重置后同步；回调与禁用/空态 | 真实权限校验、视图持久化、默认视图恢复策略 |

这些测试故意用父级暂不接受选择和输入未提交作为反例，保护状态归属，而非断言内部变量名。学员可在独立副本把组件改成不再响应父级重置的局部状态，观察契约测试失败，再撤销反例；不要修改测试来接受这种回归。

可复用的是状态归属分析、回调契约和反例设计；不能直接复制库存字段、默认视图优先级、权限 ID 或 API。组件需要局部焦点、展开等状态时应按实际协同要求决定，不能把“全部状态上移”写成通用规范。接口或状态语义变化时复审本案例。

## 延伸：关闭事件也需要明确维护者

DrawerWorkspace 的宿主决定是否真正关闭，内嵌输入或子弹层可以先消费 Escape。原代码未检查 defaultPrevented，导致子控件处理之后仍请求外层关闭；另一个焦点候选筛选缺陷把 tabIndex=-1 的按钮算作末项。这两项均先在回归测试中失败，再通过局部修复恢复，详见[抽屉焦点回归](../../testing/drawer-focus-regression.md)。

练习：解释“请求关闭”和“实际卸载”的区别；让子控件消费一次 Escape，观察外层回调应为零；再从抽屉本身按 Escape，回调应为一次。说明为什么模拟 getClientRects 的测试不能证明浏览器完整焦点隔离。这里可复用的是事件归属与验证方法，不是把商机的任务取消/后台继续规则复制给所有抽屉。
