# Architecture Gate 评审：认证式企业导航壳层

> 评审对象：`plan.md`、`docs/adr/ADR-003-认证式导航展示壳层架构.md`
> 状态：`approved`
> 决策人：Rick
> Specification Gate：approved（`REQSRC-015`）

## 1. 建议批准的技术边界

- 延用现有 React、TypeScript、Vite 静态单包及既有测试工具，不新增运行时依赖；
- 使用 `#/showcase/*` 并行入口，保留现有 103 项目录默认入口和 `?pattern=` 深链；
- 模拟身份由 Showcase 子树内 React Context + reducer 管理，仅驻留内存；
- 使用受 JSON Schema 和 Node 校验器约束的 Registry v1，统一菜单、页面、路由、capability、角色、renderer 与 icon key；
- 使用纯 Access Resolver 统一菜单、搜索、直接路由、页面模式和操作权限；
- `admin` 使用集中式 `all-registered` 角色绑定，`viewer` 使用显式能力列表；
- 页面使用 overview、resource-catalog、description 三类显式 Adapter，不建设通用页面渲染器；
- 图标使用中性内联 SVG Registry，样式使用 `--showcase-nav-*` / `.showcase-*` 作用域；
- 扩展隔离检查覆盖新门户，继续禁止网络、持久化、远端 URL、凭据和真实业务数据；
- `UID-001` 保持候选，本 Gate 不创建或晋升方法论正式 UI 资产。

## 2. 本 Gate 不批准

- 替换现有 Lab 默认入口或重写切片 002；
- React Router、状态库、AJV、图标库或其他新运行时依赖；
- 真实账号、密码、Token、Cookie、服务端鉴权、远端菜单、数据库或审计；
- 通用低代码 Renderer、动态插件、生产组件包或方法论 UI 资产登记册；
- 来源系统组件、Less、SVG、品牌、接口、IAM 或缓存策略复用；
- Tasks、已完成实现、资产晋升、部署或 Release。

## 3. 关键决策对照

| 问题 | 建议决策 | 理由 |
|---|---|---|
| `Q-ARCH-301` 会话 seam | Showcase Context + reducer + 纯权限函数 | 隔离跨组件身份状态，同时保留可测试领域逻辑 |
| `Q-ARCH-302` 会话保存 | 仅内存，不保存身份或页面状态 | 直接满足刷新、退出、重置清理要求 |
| `Q-ARCH-303` 契约 | Registry v1 JSON + Schema + 跨引用校验器 | 可检查、可追溯，不用 TS 组件隐含业务配置 |
| `Q-ARCH-304` 资产治理 | 只形成 Lab 验证证据，暂不建立正式登记册 | 避免候选越过真实验证和晋升 Gate |
| `Q-ARCH-305` 集成 | 并行 Hash 入口，现有目录默认入口不变 | 静态直达、回归面小、回滚简单 |
| `Q-ARCH-306` 图标 | 中性内联 SVG Adapter + 稳定 key | 不带入来源资产，不新增图标依赖 |
| `Q-ARCH-307` 依赖 | 当前不新增 | 规模有限，现有平台足以实现和测试 |

## 4. 安全与失败行为核对

| 风险 | 控制 | Gate 后证据 |
|---|---|---|
| 前端权限被误当生产授权 | UI 持续声明、无安全模块导出、无服务端术语 | 页面检查 + code review |
| 隐藏菜单经搜索泄露 | capability 过滤先于搜索，契约 mutation 测试 | `TC-408`、`TC-EDGE-402` |
| 无权页面内容闪现 | session gate 优先，身份切换销毁子树 | `TC-413`、`TC-414` |
| admin 使用组件特判 | 只允许 Access Resolver 的 all-registered 绑定 | `TC-411`、`TC-415` |
| Registry/Adapter 漂移 | Schema、跨引用、renderer/icon 映射校验阻断构建 | Registry contract 证据 |
| 来源术语污染运行资产 | Registry 禁用词检查、作用域令牌、中性图标 | 校验日志 + 浏览器截图 |
| 新入口破坏现有目录 | 并行入口和现有 URL 回归测试 | App 集成 + 全量验证 |
| 操作失败改变 fixture | reducer 原子结果，denied/failure 零变更 | `TC-EDGE-405`、`406` |

## 5. 数据、迁移、恢复与回滚

- 只有版本化本地 Registry 和虚构 fixture，无业务数据库或外部数据迁移；
- 身份、导航和资源操作状态仅驻留 React 内存；
- Registry 不完整时构建失败，不运行半成品配置；
- 新门户阻断时移除入口链接并停用 Hash 分支，默认目录保持可用；
- 回滚不删除来源、Spec、测试或失败证据，不修改历史 Gate；
- 切片 002 继续独立等待 Release Gate。

## 6. Gate 后允许事项

若批准，仅允许：

1. 把 Plan 转换为稳定 `TASK-*`；
2. 先写 Registry、权限、路由和回归失败测试，再按任务实施；
3. 执行 `pnpm verify`、Specification 追溯检查和工作台全量验证；
4. 使用真实浏览器完成 1440/1280、低高度、键盘、权限、刷新、网络与存储验收；
5. 形成需求、代码安全、集成运行三视角 review 和候选回流总结。

批准后仍不授权资产晋升、部署或 Release。

## 7. 建议结论

方案复用已验证工程基线，但通过并行入口、Checked Registry、纯权限内核和作用域样式隔离新候选；安全、测试、兼容、迁移和回滚边界明确。建议人工结论为 `approved`。

## 8. 人工决定

- 结论：`approved`
- 批准人：Rick
- 时间：2026-09-03T18:29:56+08:00
- 备注：批准 Plan 与 ADR-003；允许后续创建 Tasks 和实施，不包含资产晋升、部署或 Release。本条批准消息未要求当前步骤直接编码。
- 批准来源：`REQSRC-016`
