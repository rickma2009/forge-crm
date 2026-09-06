# 实现任务：认证式企业导航壳层

> 功能编号：003-authenticated-enterprise-navigation-shell
> 状态：frontend-only-history-preserved / implementation-paused-by-REQSRC-017
> Business Gate：approved（`REQSRC-014`）
> Specification Gate：approved（`REQSRC-015`）
> Architecture Gate：approved（`REQSRC-016`）

## 已确认测试 seam

以下 seam 已在批准的 Plan/ADR-003 中明确，测试只通过这些公开边界观察行为：

1. Registry Contract：`registry + adapter/icon keys → validation diagnostics`；
2. Identity Module：`account input + role registry → identity | invalid`；
3. Access Resolver：`identity + registry + route/capability → access decision`；
4. Navigation Module：`visible tree + query → filtered tree with ancestors`；
5. Hash Route Module：`hash → catalog route | showcase route`；
6. Resource Module：`resource state + permitted action → next state + feedback`；
7. Root App / Showcase Portal：通过可访问页面交互观察并行入口、登录、导航、权限、清理和失败状态。

测试不依赖组件私有 state、CSS 类名、内部函数调用次数或来源项目实现。

## 任务列表

### TASK-401 建立 Showcase Registry 与阻断式校验

- 来源：`REQ-403`—`REQ-410`、`REQ-412`—`REQ-415`、`NFR-403`、`NFR-405`、`AC-402`—`AC-410`、`TC-404`、`TC-411`、`TC-415`、`TC-418`、`TC-EDGE-401`、`REG-001`
- 依赖：无
- 产出：Registry v1 JSON、JSON Schema、类型/读取边界、Node 校验器、mutation 契约测试和验证命令
- 实施边界：Registry 只记录 Lab 项目事实；不建立方法论正式 UI 登记册，不引入 Schema 运行库
- 验收：ID/path/capability 唯一，跨引用、renderer/icon、admin/viewer、description-only 和来源禁用词规则均可使非法配置明确失败
- 验证命令/入口：Registry contract tests、`pnpm validate:showcase`
- 状态：completed
- 实际证据：Registry v1（24 页/15 capability）、Schema、校验器与 9 个契约/mutation 测试通过；`pnpm validate:showcase` passed

### TASK-402 建立身份、权限、路由与菜单领域模块

- 来源：`REQ-401`、`REQ-407`—`REQ-414`、`NFR-403`、`NFR-404`、`AC-401`、`AC-404`、`AC-407`—`AC-410`、`TC-401`、`TC-402`、`TC-408`、`TC-411`—`TC-415`、`TC-EDGE-402`、`AUTH-001`、`AUTHZ-001`、`AUTHZ-002`、`NAV-001`、`NAV-002`、`PORTAL-001`
- 依赖：`TASK-401`
- 产出：身份归一、有效 capability、页面访问、可见菜单、搜索与 Hash 解析纯函数及测试
- 实施边界：权限是前端演示语义；无组件级 admin 特判，无浏览器持久化
- 验收：admin 自动覆盖全部登记能力，viewer 只获显式能力；权限过滤早于搜索；forbidden/not-found 分离且不泄露元数据
- 验证命令/入口：Domain Vitest tests
- 状态：completed
- 实际证据：身份、能力、访问、菜单投影/搜索与 Hash 路由纯函数共 7 个测试通过

### TASK-403 建立并行入口并锁定既有目录兼容

- 来源：`REQ-402`、`REQ-411`、`NFR-404`、`NFR-406`、`AC-401`、`AC-410`、`TC-403`、`TC-414`、`TC-418`、`PORTAL-001`、`ADR-003`
- 依赖：`TASK-402`
- 产出：默认目录/Showcase Hash 入口选择器、双向入口链接、既有 `?pattern=` 回归测试
- 实施边界：不替换现有目录，不改写切片 002 页面与 Demo Registry
- 验收：默认及现有深链行为不变；`#/showcase/*` 进入独立身份 Gate；两个入口不共享会话和筛选状态
- 验证命令/入口：Root App integration tests + 既有 App tests
- 状态：completed
- 实际证据：`RootApp` 并行入口与 2 个集成测试通过；既有 `?pattern=` 回归包含于全量测试

### TASK-404 实现身份页与双区企业导航壳层

- 来源：`REQ-401`—`REQ-409`、`REQ-411`—`REQ-415`、`NFR-401`—`NFR-404`、`AC-401`—`AC-405`、`AC-407`—`AC-411`、`TC-401`—`TC-409`、`TC-411`—`TC-417`、`TC-EDGE-402`—`TC-404`
- 依赖：`TASK-402`、`TASK-403`
- 产出：内存 Session Context/reducer、身份页、220/64/34 导航、主/管理双区、搜索、展开、折叠浮层、焦点恢复、无权/未找到状态和作用域样式
- 实施边界：桌面 1440/1280；不接入真实认证、远端菜单或来源组件
- 验收：两类身份、完整菜单、双区滚动、折叠访问、唯一激活、权限过滤、刷新/退出/重置清理与键盘路径符合 Spec
- 验证命令/入口：Testing Library integration/component tests
- 状态：completed
- 实际证据：身份 Gate、220/64/34 导航、双区滚动、权限搜索、折叠浮层与焦点恢复实现；7 个 Showcase 集成测试与浏览器验证通过

### TASK-405 实现页面 Adapter 与资源目录权限 Demo

- 来源：`REQ-410`—`REQ-415`、`NFR-403`、`NFR-404`、`AC-406`—`AC-410`、`TC-410`—`TC-415`、`TC-EDGE-405`、`TC-EDGE-406`、`PAGE-001`、`RESOURCE-001`
- 依赖：`TASK-401`、`TASK-402`、`TASK-404`
- 产出：overview、description、resource-catalog 显式 Adapter，确定性 resource reducer，成功/失败/拒绝反馈和重置
- 实施边界：fixture 仅内存；description-only 不产生资源变更；失败/拒绝零变更
- 验收：admin 可维护/导出，viewer 只读且操作禁用原因可感知；说明页诚实表达未接入；renderer 错误局部隔离
- 验证命令/入口：Resource domain + page integration tests
- 状态：completed
- 实际证据：3 类显式页面 Adapter 与确定性 resource reducer 完成；资源领域 3 个测试、admin/viewer 浏览器场景通过

### TASK-406 完成隔离、工程与真实浏览器验证

- 来源：全部 `REQ-*`、`NFR-401`—`NFR-406`、`AC-401`—`AC-411`、`TC-401`—`TC-418`、`TC-EDGE-401`—`TC-EDGE-406`
- 依赖：`TASK-401`—`TASK-405`
- 产出：Showcase 隔离扫描、lint/typecheck/test/build、1440/1280/低高度/键盘/权限/刷新/网络/存储浏览器证据
- 实施边界：只记录真实执行结果；不部署、不发布、不晋升资产
- 验收：质量门禁通过，P0/P1 场景有真实证据，未通过项明确记录并阻断评审完成
- 验证命令/入口：`pnpm verify`、`check-sdd.sh ... full`、`verify-all.sh`、`agent-browser`
- 状态：completed
- 实际证据：`pnpm verify` passed；12 files / 56 tests；1440/1280/低高度/键盘/刷新/网络/存储证据见 `evidence/browser-validation.md`

### TASK-407 完成三视角评审与候选回流总结

- 来源：全部需求、Gate、ADR-003 与 `UID-001`
- 依赖：`TASK-406`
- 产出：需求追溯、代码安全、集成运行三视角 review，整改复验，候选复用/排除/证据总结
- 实施边界：不自动晋升 `_methodology/` 资产，不批准 Release
- 验收：P0/P1 关闭，P2/P3 修复或登记；Spec、Plan、代码、测试和状态一致；下一 Gate 边界明确
- 验证命令/入口：固定工作区差异 review + 全量复验
- 状态：paused-requirement-boundary-changed
- 实际证据：代码评审启动后被 `REQSRC-017` 中断；新版目标需先重新通过 Business、Specification 与 Architecture Gate

## Checkpoints

| Checkpoint | 条件 | 状态 |
|---|---|---|
| Ready | 原纯前端边界曾获 Business、Specification、Architecture Gate 批准 | historical-completed |
| Implemented | 原纯前端 TASK-401—`TASK-405` 完成 | historical-completed |
| Verified | 原纯前端 TASK-406 质量与浏览器证据通过 | historical-completed |
| Reviewed | TASK-407 三视角评审完成 | paused-by-REQSRC-017 |
| Accepted | Release Gate 通过 | pending |
