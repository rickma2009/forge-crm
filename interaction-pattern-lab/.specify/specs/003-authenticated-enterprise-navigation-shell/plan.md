# 技术计划：认证式企业导航壳层

> 功能编号：003-authenticated-enterprise-navigation-shell
> 状态：`architecture-approved-ready-for-task-breakdown`
> Specification Gate：approved（`REQSRC-015`）
> Architecture Gate：approved（`REQSRC-016`）

## 1. 输入与约束

- 关联 Spec：`spec.md`；
- 关联测试设计：`testcases.md`；
- 项目宪法：`../../memory/constitution.md`；
- 架构候选：`../../../docs/adr/ADR-003-认证式导航展示壳层架构.md`；
- 来源候选：`UID-001-enterprise-navigation-shell`，仅提供结构、视觉与边界证据，不提供目标代码；
- 延用现有 React 19、TypeScript 5.7、Vite 5、Vitest、Testing Library、原生 CSS 和静态单包；
- 不新增路由库、状态库、Schema 运行库、图标库、后端、数据库或生产认证；
- 不修改 `_ref/`，不把来源品牌、业务菜单、接口、IAM 或缓存策略带入运行资产；
- 本 Plan 已由 `REQSRC-016` 批准；该批准允许后续创建 Tasks，但不等于 Tasks 已创建、实现已完成、资产已晋升、已部署或已发布。

## 2. 方案概述

采用“并行入口 + 壳层模块 + 受检查 Registry + 纯权限内核”的最小架构。现有分类目录继续作为默认入口；新门户通过 `#/showcase/...` 进入，静态部署不依赖服务器 history fallback。入口层只根据 Hash 选择既有目录或新门户，不把新身份状态扩散到历史切片。

```text
浏览器入口
├── 默认/既有 URL ── Existing Pattern Catalog（行为不变）
└── #/showcase/* ── Showcase Session Gate
                    ├── in-memory identity/context
                    ├── checked registry
                    │   ├── navigation tree
                    │   ├── page + route definitions
                    │   ├── capabilities + role bindings
                    │   └── icon keys + source references
                    ├── pure access resolver
                    └── Showcase Shell
                        ├── navigation/search/flyout
                        └── explicit page adapter outlet
```

权限处理顺序固定为：加载并校验 Registry → 根据身份生成有效 capability 集 → 过滤菜单 → 搜索可见树 → 路由解析 → 页面访问判定 → 页面模式/操作判定。搜索、菜单组件和页面按钮不得自行发明权限规则。

## 3. 架构分解与影响范围

| 层/模块 | 计划变化 | 保持不变 |
|---|---|---|
| 应用入口 | 增加轻量入口选择器，识别 `#/showcase/*`，并从现有目录提供显式入口链接 | 既有 `?pattern=` 深链、103 项目录、Demo Registry 和切片 002 行为 |
| Showcase Session | 新增只在门户子树生效的 Context + reducer，管理未登录/admin/viewer、登录错误和退出/重置 | 不进入浏览器持久化，不调用认证 API |
| Showcase Registry | 新增版本化 JSON、JSON Schema 和确定性校验器，统一页面、路由、菜单、能力、角色、图标 key 与来源引用 | `_methodology/` 仍是通用资产事实源；Registry 只记录本切片项目事实 |
| Access Resolver | 新增纯函数计算有效 capability、菜单可见性、route access、page mode 和 action access | 不把 UI 隐藏当服务端授权，不加入页面内 admin 特判 |
| Hash Router | 新增切片内 Hash 监听与导航函数，输出 registered/forbidden/not-found | 不引入第三方路由库，不改变默认目录 URL |
| Navigation Shell | 新增品牌、搜索、主滚动区、管理区、折叠和浮层组件 | 不复用来源 React/Less 代码或来源图标 |
| Page Adapters | 显式登记 overview、resource-catalog、description 三类 renderer | 不建立通用低代码 Schema 页面渲染器 |
| Visual Tokens | 新增切片作用域 CSS 令牌和组件样式，默认 220/64/34 | 既有 `--ipl-*` 和历史 Demo 样式不被覆盖 |
| Validation | 新增 Registry、权限、路由、组件、集成和浏览器检查；扩展隔离扫描范围 | 既有 28 项测试、构建和工作台检查继续运行 |

## 4. 数据与契约设计

### 4.1 Registry v1

Registry 是 Lab 内项目资产，计划包含：

- `version`：Schema 主版本；
- `system`：中性名称、logo key、默认页面；
- `capabilities`：全部稳定 capability ID；
- `roles`：`admin` 使用 `all-registered` 授权模式，`viewer` 使用显式 capability 列表；
- `pages`：稳定 page ID、Hash path、标题、coverage、view capability、renderer key、操作及来源引用；
- `navigation`：主区树和底部管理树，叶节点只引用 page ID；
- `icons`：允许的稳定 icon key 清单。

核心不变量：

1. page ID、path、capability ID 唯一；
2. 菜单叶节点必须引用已登记页面；
3. 页面 view capability 和操作 capability 必须已登记；
4. 所有 icon key 必须能在允许清单和 Adapter 中解析；
5. `admin` 的有效集合等于 Registry 当前全部 capability；
6. `viewer` 只能引用存在的显式 capability；
7. `description-only` 页面不得登记会改变资源的操作；
8. 运行文案和菜单不得出现来源项目名称；来源信息只使用 `UID-001`、Spec 和需求包引用。

JSON Schema 描述形状和枚举，本地 Node 校验器负责跨引用、唯一性、admin 覆盖、viewer 边界、禁用词和 Adapter 完整性。Registry 作为源文件直接提交，不生成或回写 `_methodology/`。

### 4.2 页面与 Renderer

| renderer key | 职责 | 数据变化 |
|---|---|---|
| `overview` | 显示壳层目的、身份、权限矩阵和模拟边界 | 无 |
| `resource-catalog` | 显示确定性资源 fixture，演示只读、维护、导出、失败和重置 | 仅 reducer 内存副本 |
| `description` | 显示页面标题、用途、成熟度、下一证据和“互动演示未接入” | 无 |

页面 Adapter 使用显式静态映射，不允许 Registry 提供任意模块路径或执行内容。未知 renderer key 在校验阶段失败，运行时进入可诊断错误边界。

### 4.3 身份与权限

- `admin`：角色绑定模式为 `all-registered`，由单一授权函数从 Registry 生成全部有效 capability；
- `viewer`：显式绑定全部主菜单页面 view capability、资源目录 view capability，不绑定系统管理其他 view capability、资源维护或导出 capability；
- `can(capability)`：只判断有效 capability 集；
- `resolvePageAccess(route, identity)`：返回 `allowed-readwrite`、`allowed-readonly`、`forbidden` 或 `not-found`；
- 菜单树只从 `allowed-*` 页面投影；父分组是否显示由可见后代决定；
- 操作保留在页面上时，使用相同 capability 计算 enabled/disabled 及可感知原因。

`all-registered` 是集中式角色绑定策略，不是组件内管理员绕过。契约测试必须证明新增 capability 后 admin 自动覆盖、viewer 不自动获得。

### 4.4 会话与 UI 状态

Session reducer 只持有当前身份和登录错误；导航 reducer 持有 query、open group IDs、collapsed、active flyout；resource reducer 持有确定性 fixture 和最近反馈。三者边界分离：

- 刷新导致 React 内存重建并回到身份页；
- 登录成功统一导航到 overview，不恢复刷新前路径；
- 退出/重置销毁门户子树，清除旧页面与资源状态；
- 身份未建立时不渲染受保护页面或菜单，避免内容闪现；
- 不使用 `localStorage`、`sessionStorage`、cookie、IndexedDB 或 URL 保存身份。

## 5. 内部接口与错误契约

| ID | 用途 | 输入 | 输出 | 失败/边界 |
|---|---|---|---|---|
| `PORTAL-001` | 解析门户 Hash | hash string | normalized route | 非门户 Hash 交还既有目录；空门户 Hash 归一到 overview |
| `REG-001` | 校验 Registry | registry + adapter/icon keys | valid registry 或诊断列表 | 任一跨引用、重复、禁用词或未知 key 使检查失败 |
| `AUTH-001` | 解析演示身份 | 用户输入 + role registry | admin/viewer 或 invalid | trim + 大小写归一；不处理密码 |
| `AUTHZ-001` | 计算有效能力 | role + capability registry | capability set | 未知角色为空集合；admin 为 all-registered |
| `AUTHZ-002` | 解析页面访问 | route + identity + registry | allowed/read-only/forbidden/not-found | forbidden 不返回受限页面标题、fixture 或操作 |
| `NAV-001` | 投影可见菜单 | navigation + access resolver | 保留祖先的可见树 | 无可见后代的分组移除 |
| `NAV-002` | 搜索可见菜单 | visible tree + query | 匹配树 | 过滤权限后搜索；零结果保留 query |
| `PAGE-001` | 解析页面 Renderer | renderer key | 静态 Adapter 或 error | 不执行 Registry 中的路径或代码 |
| `RESOURCE-001` | 执行资源 Demo 操作 | identity + action + fixture mode | success/failure/denied | denied/failure 都是零变更；结果确定性 |

这些都是前端内部契约，不是业务 API。未来接入远端菜单、真实账户、服务端授权或业务写入时必须重新打开 Business、Specification 和 Architecture Gate。

## 6. 路由与兼容策略

- 默认路径及现有 `?pattern=<id>` 继续渲染既有分类目录；
- `#/showcase/login`、`#/showcase/overview` 和 `#/showcase/<section>/<page>` 由新门户处理；
- 未登录时所有门户 Hash 只显示身份页，登录成功后 replace 到 overview；
- 登录后 Hash 改变先做精确注册，再做权限判定；forbidden 和 not-found 使用不同内部状态，但 forbidden 不展示页面元数据；
- 从既有目录进入门户、从门户返回目录均使用明确链接，不共享 session 或筛选状态；
- Hash 路由确保开发服务和静态构建直接打开链接时不依赖服务器重写规则。

## 7. 用户体验实现边界

- 导航结构和文案严格来自已批准 Spec 与 Registry，不从来源项目动态读取；
- 系统管理区使用独立布局槽，最大高度 45%，自身滚动；主区使用剩余空间滚动；
- 折叠态浮层由单一浮层控制器管理，Escape、失焦、选择后关闭并恢复焦点；
- 视觉使用 `--showcase-nav-*` 切片作用域令牌，不能覆盖全局 `--ipl-*`；
- 中性内联 SVG 通过稳定 key 解析；图标装饰性时隐藏，交互控件由文字或 aria-label 命名；
- 禁用操作同时提供可见原因和辅助说明，不能只依赖灰色；
- 页面错误使用局部边界，不让一个 renderer 错误破坏导航或身份退出。

## 8. 安全、隐私、性能与可观测

### 安全与隐私

- 无密码字段、Token、真实账号、组织信息或生产域名；
- 权限只作交互演示，身份页、概览和资源目录持续显示该边界；
- 权限过滤先于搜索，身份 Gate 先于页面渲染；
- Registry 文案禁用来源项目术语，fixture 使用虚构数据；
- 扩展隔离扫描到新门户源码，禁止 fetch/XHR/WebSocket、持久化 API、远端 URL 和凭据形态；
- 前端 authorization 不导出为可供真实系统依赖的安全模块。

### 性能

- Registry 与壳层随门户入口加载；既有目录默认入口不加载新页面 Adapter；
- overview/resource renderer 可静态或懒加载，由实现任务按构建证据选择，不增加通用插件框架；
- 菜单规模小，权限投影与搜索采用纯内存确定性计算；当前不虚构毫秒预算。

### 可观测

- 构建前校验输出稳定诊断代码和 Registry 路径；
- UI 只记录当前会话的可感知状态消息，不上报遥测或账号输入；
- 测试证据记录命令、Node/浏览器版本、Hash 入口、视口和截图；
- 失败时区分 Registry 错误、身份无效、forbidden、not-found 和 renderer error。

## 9. 测试实现策略

| 层次 | 覆盖 | 主要证据 |
|---|---|---|
| Registry contract | Schema 形状、唯一性、引用、禁用词、角色与 Adapter/icon 完整性 | Node 校验脚本 + fixture mutation tests |
| Domain unit | 身份归一、all-registered、viewer 显式授权、route/access、菜单过滤、搜索、资源零变更失败 | Vitest 纯函数测试 |
| Component | 身份表单、菜单展开/折叠、浮层、焦点恢复、禁用原因、说明页 | Testing Library + user-event |
| Integration | admin 全路径、viewer 四层反例、身份切换清理、forbidden/not-found、现有目录兼容 | App 集成测试 |
| Isolation | 新门户无网络、持久化、远端 URL 或凭据调用 | 扩展 Node 隔离扫描 |
| Browser | 1440/1280、低高度双滚动、键盘、焦点、刷新、Hash 直达、网络/存储观察 | `agent-browser` + 截图/终端记录 |
| Full project | 既有 28 项与新测试、lint、typecheck、build、项目和工作台检查 | `pnpm verify` + `verify-all.sh` |

实现时按 TDD 顺序先建立 Registry/权限/路由失败测试，再实现组件和视觉；`TC-401`—`TC-418`、`TC-EDGE-401`—`406` 在真实执行前继续保持 `not-run`。

## 10. 实施顺序候选

按用户明确实施指令转换为稳定 `TASK-*`：

1. 建立 Registry Schema、数据候选、校验器和失败测试；
2. 建立身份、权限、路由和菜单投影纯函数测试与实现；
3. 建立并行入口，锁定既有 URL 和切片 002 回归测试；
4. 实现身份页、Showcase Shell、双区滚动、搜索和折叠浮层；
5. 实现 overview、description 和 resource-catalog Adapter 及确定性 reducer；
6. 扩展隔离检查，完成 admin/viewer 集成、可访问性和失败场景；
7. 执行全工程与真实浏览器验证，形成三视角 review 和回流候选总结。

## 11. 风险与 ADR

| ID | 决策/风险 | 处理 | 复审条件 |
|---|---|---|---|
| `ADR-003` | 并行 Hash 门户、Checked Registry、内存会话和纯权限内核 | 采用候选，见 ADR | 门户成为默认产品入口、出现第二消费者或接入真实服务 |
| `RISK-401` | 新壳层与既有分类目录争夺全局布局和样式 | 并行入口、切片 CSS 命名空间、默认入口回归测试 | 需要正式替换根布局 |
| `RISK-402` | `all-registered` 被误写成组件级 admin bypass | 只在角色解析器支持，契约测试比较全 capability 集 | 引入生产授权或多租户角色 |
| `RISK-403` | JSON Schema 与手写跨引用校验器漂移 | 同一 mutation fixture 同时覆盖形状和语义检查，变更 Registry 必须运行校验 | 引入通用 Schema validator 或外部消费者 |
| `RISK-404` | Hash route 与当前 query deep link 冲突 | 入口选择顺序固定，既有 URL 全量回归 | 默认入口迁移到门户 |
| `RISK-405` | 权限过滤泄露隐藏菜单或旧页面内容 | session gate 优先、过滤后搜索、身份切换销毁子树 | 接入异步数据或真实 API |
| `RISK-406` | 来源视觉值污染正式主题 | 作用域 token、禁用词校验、候选成熟度保持不变 | 资产晋升或第二项目采用 |

## 12. 回滚、恢复与迁移

- 本切片无数据库、业务数据或远端迁移；
- 新门户使用并行 Hash 入口，出现阻断问题时移除入口链接并停止注册 Showcase 路由，既有目录仍可运行；
- Registry 或 Adapter 校验失败时构建失败，不发布不完整门户；
- 资源 fixture 每次登录和重置重新初始化，失败/拒绝均零变更；
- 回滚保留 Spec、测试、来源与失败证据，不改写历史 Gate；
- 不自动把验证结果写回 `_methodology/`，资产晋升另行评审。

## 13. 明确不做

- 不替换当前 103 项分类目录的默认入口；
- 不引入 React Router、Zustand、AJV 或图标库；
- 不接入远端菜单、真实账户、密码、JWT、Cookie、数据库或审计服务；
- 不复制来源系统组件、Less、SVG、品牌文案、菜单接口或权限协议；
- 不建立通用页面 Schema Renderer、插件平台或生产组件包；
- 不创建 `_methodology/ui-assets/` 正式登记册，不晋升 `UID-001`；
- 不提前创建 Tasks、实现或 Release 证据。

## 14. Architecture Gate

- 结论：approved
- 批准人：Rick
- 时间：2026-09-03T18:29:56+08:00
- 备注：批准本 Plan 与 ADR-003；允许后续转换为 Tasks 并按 TDD 实施，不包含资产晋升、部署或 Release。
- 批准来源：`REQSRC-016`
