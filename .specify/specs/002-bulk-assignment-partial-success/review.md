# 切片 002 三视角评审

> 评审范围：`5c3c991..0f12ec7`，整改提交 `409552e`、`0e3aed2` 及最终状态闭环
> 评审时间：2026-08-31
> 当前结论：范围内实现与本地验证完成，等待 Release Gate；不触发资产晋升

独立 Standards 与 Spec 轴分别复审至无剩余 P1/P2；最终 Architecture 边界保持“契约只作测试 oracle，不驱动生产 UI”，`initialQuery` 由 runner 显式比对契约与模型初态。

## 1. 需求一致性

- 103 个分类项与六类计数由 `REQSRC-012` 纠正并在 Business、Specification、Architecture、Tasks、登记册和 Lab 投影中统一；
- 目录真实区分 `maturity`、`coveredBy` 与 Demo 可用性，无 Demo 分类项只显示说明和下一证据；
- VAL-002 覆盖当前页 / 全查询结果、查询失效、预检查、取消、全部成功、部分成功、系统失败、重试、失败项重选、重置、加载和空结果；
- `TC-317` 的跨 HTML / React 一致性按批准的 Architecture 边界延期到资产晋升后，当前不虚构双渲染器证据；
- BUS-003 的三次观察任务、两类目标角色仍未执行，保持 `baseline-pending`。

## 2. 工程标准评审与整改

| 严重度 | 发现 | 整改 | 复验证据 |
|---|---|---|---|
| P1 | 确认框未把焦点移入且未限制焦点环 | 初始聚焦取消；Tab / Shift+Tab 成环；Escape 关闭并恢复触发点 | 组件测试 + agent-browser |
| P1 | 部分成功后没有失败项重选入口 | reducer 新增 `select-failed`，结果区提供“仅重选失败 N 条” | reducer / Demo 测试 + 浏览器 |
| P1 | 场景契约未作为测试 oracle | 契约改为参数化动作与完整预期观察，五个场景逐一驱动 reducer | `BulkAssignmentModel.test.ts` |
| P2 | Schema 文件未被实际执行 | 增加可复用 Schema 子集校验器，并为登记册与场景契约加入负向探针 | 两个校验脚本 |
| P2 | 缺少确定可访问的加载入口 | 新增 `loading` 场景及 `role=status` 加载面板 | Demo 测试 + 浏览器 |
| P2 | 不可用负责人边界未实际测试 | 选择 `owner-disabled` 并断言五项均为 `OWNER_UNAVAILABLE` | reducer 测试 |
| P2 | 桌面 64px 折叠栏残留筛选和子层级 | 折叠时隐藏 controls / subgroup，移动抽屉显式恢复 | App 测试 + 64px 浏览器测量 |
| P2 | 项目 Release 状态写成不适用 | 统一为 `not-started` | `project-state.json` |
| P2 | Demo 隔离仅靠人工观察 | 新增源码扫描，阻止网络、持久化、远端 URL 和凭据形态 | `pnpm validate:isolation` |

## 3. 安全与集成运行

- Demo fixture 全为虚构数据；没有后端、生产域名、鉴权或业务写入；
- 浏览器网络只出现本地 Vite 静态模块请求，localStorage 无条目，刷新不恢复 Demo 操作状态；
- `bash _methodology/scripts/verify-all.sh` 通过方法论核心、来源完整性、MCRM 既有工程与 Lab 全检；
- MCRM 数据库测试仍因未提供测试库按项目既有规则跳过 16 项，本切片不借此声称数据库集成验证；
- 构建产物为静态文件，未执行部署。

## 4. 可回流与不可回流

可作为候选回流：机器资产登记册、成熟度 / 覆盖关系分离、生成式 Lab 投影、显式 Demo Adapter、场景契约 oracle、批量部分成功失败行为与验收清单。

当前不可回流为正式模式或模板：React 组件实现、模拟权限/锁定规则、固定 fixture、品牌或布局细节。缺少第二项目采用、真实服务端事务和资产晋升批准。

## 5. Release Gate 前置

- 由用户评审本切片可观察行为与已知限制；
- 决定是否执行 BUS-003 观察任务；未执行时继续保持 `baseline-pending`；
- 明确是否只接受本地验证，或另行授权部署；
- Release Gate 不自动批准资产晋升，后者需独立评审。
