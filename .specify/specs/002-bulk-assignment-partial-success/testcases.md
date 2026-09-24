# 测试用例：批量分配与部分成功验证

> 功能编号：002
> 状态：automated-and-browser-passed-with-one-deferred-cross-renderer-case
> 本文描述验证行为，不包含实现代码或虚构结果。

## 1. 测试策略

- 核心旅程：查找分类项 → 判断成熟度与 Demo 可用性 → 打开 `VAL-002` → 选择范围 → 预检查 → 确认 → 查看结果 → 重置；
- 主要风险：把 103 项误称成熟模板、把当前页误作全结果、覆盖关系传播成熟度、部分成功范围不清、键盘不可达、Demo 状态被持久化；
- 测试层次：资产/场景契约、组件行为、集成工作区和真实浏览器任务；具体工具留给 Architecture Gate。

## 2. 目录与证据行为

| ID | 类型 | 关联 AC/NFR | Given | When | Then | 优先级 |
|---|---|---|---|---|---|---|
| `TC-301` | contract | `AC-301`、`NFR-304` | 分类源包含 103 项 | 校验资产内容清单 | 六类计数合计 103、编号唯一、每项有成熟度和下一证据 | P0 |
| `TC-302` | component | `AC-302` | 目录已显示全部分类项 | 搜索编号/名称并组合成熟度与 Demo 筛选 | 结果准确，条件可见 | P0 |
| `TC-303` | component | `AC-302` | 筛选后无结果 | 清空条件 | 保留上下文后恢复完整目录 | P1 |
| `TC-304` | component | `AC-303` | 一个 `idea` 分类项没有 Demo | 打开分类项 | 默认说明完整，交互入口不可用且解释原因 | P0 |
| `TC-305` | contract | `AC-304`、`NFR-304` | 两个历史模式成熟度不同 | 校验投影并查看 UI | 精确显示各自状态和证据，不出现统一“已验证一次” | P0 |
| `TC-306` | integration | `AC-305` | 多个分类项 `coveredBy` 同一 `VAL-002` | 从不同分类项打开覆盖关系 | 定位同一案例，分类项成熟度不变 | P0 |

## 3. 批量选择与执行行为

| ID | 类型 | 关联 AC/NFR | Given | When | Then | 优先级 |
|---|---|---|---|---|---|---|
| `TC-307` | component | `AC-306` | 查询结果 N 大于当前页 M | 选择当前页 | 只选择 M 条并显示当前页范围 | P0 |
| `TC-308` | component | `AC-307` | 当前页已选择 | 选择全部查询结果 | 显示全部 N 条及当前查询范围 | P0 |
| `TC-309` | component | `AC-308` | 当前页或全结果已选择 | 修改查询、筛选或排序 | 清空选择并发布可感知说明 | P0 |
| `TC-310` | integration | `AC-309` | 选择包含可执行与拒绝记录 | 选择负责人并预检查 | 每项仅有明确结果，汇总数相加等于选择数 | P0 |
| `TC-311` | component | `AC-310` | 预检查完成且确认框已打开 | 取消 | 记录不变且保留选择和负责人 | P0 |
| `TC-312` | integration | `AC-311` | 全部记录可执行 | 确认批量分配 | 所有选中项更新负责人并显示全部成功 | P0 |
| `TC-313` | integration | `AC-312` | 存在拒绝或执行失败项 | 确认批量分配 | 成功、失败、未处理计数完整，失败项原因保留 | P0 |
| `TC-314` | integration | `AC-313`、`NFR-302` | 场景为系统失败 | 执行、重试并重置 | 首次无变更且上下文保留；后续结果确定；重置恢复初始状态 | P0 |

## 4. 可访问性、隔离与恢复

| ID | 类型 | 关联 AC/NFR | Given | When | Then | 优先级 |
|---|---|---|---|---|---|---|
| `TC-315` | browser | `AC-314`、`NFR-301` | 仅使用键盘 | 完成目录、筛选、案例、选择、预检查、确认、结果和重置 | 焦点可见、顺序合理、控件有名称、状态可感知 | P0 |
| `TC-316` | browser | `AC-314`、`NFR-303` | 开启网络与存储观察 | 完成所有 Demo 状态并刷新 | 无生产请求、无业务写入、刷新后不恢复操作状态 | P0 |
| `TC-317` | contract | `AC-314`、`NFR-302` | HTML Example 与 React Demo 使用同一场景契约 | 运行相同行为序列 | 关键可观察结果和失败代码一致 | P1 |
| `TC-318` | integration | `AC-303`、`NFR-305` | 目录包含 103 项但只有少量 Demo | 加载、搜索和切换 | 无 Demo 项正常可读，案例数量不受两个种子限制 | P0 |

## 5. 边界与失败

| ID | 关联项 | 场景 | 期望结果 |
|---|---|---|---|
| `TC-EDGE-301` | `AC-309` | 目标负责人不可用 | 预检查拒绝受影响项，不进入执行 |
| `TC-EDGE-302` | `AC-312` | 失败项同时可能有多个内部原因 | UI 展示一个可行动主原因，不泄露模拟权限细节 |
| `TC-EDGE-303` | `AC-303`、`NFR-304` | 分类项来源或成熟度缺失 | 不展示伪造状态，检查明确失败 |
| `TC-EDGE-304` | `AC-314`、`NFR-301` | 确认层按 Escape 取消 | 焦点返回触发操作，记录不变 |

## 6. 执行证据

| 执行时间 | 环境/版本 | 命令或入口 | 结果 | 证据位置 |
|---|---|---|---|---|
| 2026-08-31 | Node 24 / pnpm / Vitest | `pnpm validate:patterns && pnpm validate:scenarios && pnpm typecheck && pnpm test` | PASS：7 files / 28 tests | 终端执行记录；源测试位于 `src/**/*.test.ts(x)` |
| 2026-08-31 | Vite production build | `pnpm verify` | PASS：projection、5 个场景契约、隔离扫描、lint、typecheck、28 tests、build | 本地终端执行记录 |
| 2026-08-31 | Chromium / agent-browser / 1440×900、390×844 | 目录→VAL-002→当前页选择→预检查→确认→部分成功；Escape；刷新；窄屏抽屉 | PASS：结果 2/3/0、焦点恢复、刷新复位、窄屏可用 | `evidence/desktop-partial-success.png`、`evidence/keyboard-focus.png`、`evidence/narrow-catalog-drawer.png` |
| 2026-08-31 | Chromium 网络与存储观察 | `network requests`、`storage local` | PASS：仅本地 Vite 静态模块请求；无 localStorage 条目 | agent-browser 终端执行记录 |
| 2026-08-31 | 工作台 + MCRM + Lab | `bash _methodology/scripts/verify-all.sh` | PASS；MCRM 数据库套件因无测试库仍按项目既有规则跳过 16 项 | 本地终端执行记录 |

`TC-317` 未声称双渲染器已通过：Architecture Gate 将独立 HTML Example 明确留到资产晋升之后；当前已验证 JSON Schema、五个场景契约和 reducer runner oracle。该跨渲染器用例保持 `deferred-by-architecture-boundary`，不会阻断本切片的本地验证，也不能作为资产晋升证据。
