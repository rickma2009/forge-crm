# 技术计划：批量分配与部分成功验证

> 功能编号：002-bulk-assignment-partial-success  
> 状态：approved-for-implementation
> Specification Gate：approved（`REQSRC-010`）  
> Architecture Gate：approved（`REQSRC-011`）

## 1. 输入与约束

- 关联 Spec：`spec.md`；
- 关联测试：`testcases.md`；
- 项目宪法：`../../memory/constitution.md`；
- 架构候选：`../../../docs/adr/ADR-002-资产索引与验证切片扩展架构.md`；
- `_methodology/08-企业管理系统交互模式分类方法.md` 继续定义分类语义；
- `_methodology/` 是通用资产权威来源，Lab 只消费投影并产生验证证据；
- 保持静态、无后端、无真实业务数据、无生产接口和无 Demo 操作持久化；
- 本 Plan 不批准实现，不改变任何分类项成熟度。

## 2. 方案概述

沿用已验证的 React、TypeScript、Vite 静态单包和原生 Demo Adapter 边界，不增加后端、数据库、路由库、状态库或 UI 组件库。对历史 ADR-001 做增量复审：保留静态工作台与 Adapter seam，替换“两个模式专用投影”为可容纳 103 个分类项、可选 Demo 和多个验证切片的资产投影管线。

```text
_methodology/08 分类语义
        +
_methodology/patterns/index.json 机器可读资产登记册
        │ Schema + 双向一致性检查
        ▼
Lab 生成式只读目录投影 ─── Lab validation-slices manifest
        │                              │
        └──── Catalog Module ── Demo Registry
                                      │
                         VAL-002 Adapter + 场景契约测试
```

## 3. 架构分解与影响范围

| 层/模块 | 变化 | 不变化 |
|---|---|---|
| 方法论分类 | 为 103 项建立机器可读登记册与 Schema；检查 Markdown 分类编号双向一致 | 08 仍定义分类含义；不把 103 项称为正式 pattern |
| Lab 投影 | 从登记册生成确定性目录数据，允许无 Demo 项 | 投影不是第二规范源，不在运行时修改方法论 |
| Validation Slice Manifest | 登记 `VAL-002`、主要发现项、覆盖项、Demo ID 和 Spec 引用 | `coveredBy` 不改变资产成熟度 |
| Catalog Module | 支持六类/子分组、搜索、成熟度和 Demo 可用性筛选 | URL 选择、说明优先和错误隔离总体边界保留 |
| Demo Registry | 去掉两个字面量联合类型和“必须正好两个”检查，未知/无 Demo 返回明确空态 | 仍使用显式懒加载 Adapter，不做通用低代码渲染器 |
| VAL-002 Demo | 新增内存状态机、确定性样例、批量分配界面和场景入口 | 不实现真实权限、锁、事务、API 或持久化 |
| 视觉系统 | 使用验证场语义令牌和 Demo 命名空间 | 不继承 MCRM 或 GF_SCM 品牌值 |

## 4. 数据设计

### 4.1 方法论资产登记册

计划新增 `_methodology/patterns/index.json`，由 JSON Schema 约束。每项最少包含：

- `assetId`、`kind`、`group`、`name` 和稳定排序；
- `maturity`，使用方法论统一成熟度枚举；
- `definitionRef`，定位 08 中的定义或正式 pattern；
- `artifacts`、`evidence`、`nextEvidence`。

08 与登记册分别承担“分类语义”和“机器资产状态”。项目级 `coveredBy` 与 Lab Demo 可用性不写入方法论登记册，由 Lab manifest 持有。自动检查必须验证 103 个编号唯一、六类数量与名称一致、引用存在、成熟度证据合法，避免双源漂移。

### 4.2 Lab 派生投影

构建脚本把方法论登记册与 Lab validation-slices manifest 合并为 Lab 只读 JSON 投影。生成结果进入版本库以支持确定性静态构建；`--check` 模式比较再生成结果与已提交文件，禁止人工静默修改。运行时只读取生成文件，不跨目录读取 Markdown。

### 4.3 验证切片 Manifest

Lab 自有 manifest 记录项目事实：

```text
validationId: VAL-002
primaryAssetId: EPM-SPECIAL-002
coveredAssetIds: [页面、操作、状态和特殊操作的既有编号]
demoId: bulk-assignment-partial-success
specRef: .specify/specs/002-bulk-assignment-partial-success/spec.md
```

资产的 `maturity` 与 `coveredBy` 分字段读取；Catalog 不允许根据覆盖关系推导或提升成熟度。

### 4.4 Demo 状态

VAL-002 使用纯内存 reducer/domain module 管理查询快照、分页、选择范围、目标负责人、预检查和执行结果。记录 ID、失败代码和结果由固定 fixture 与显式场景入口决定，不使用随机数、系统时间或远端响应。刷新或重置重新装载初始 fixture。

## 5. 接口与错误契约

| ID | 用途 | 输入 | 输出 | 错误/边界 |
|---|---|---|---|---|
| `IDX-001` | 列出资产 | query、maturity、hasDemo | 稳定排序的资产摘要 | 空结果保留过滤条件 |
| `IDX-002` | 读取资产 | assetId | 资产详情或 null | 未知 ID 回退到稳定可用状态 |
| `VAL-001` | 读取验证切片 | validationId | 覆盖关系、Demo ID、Spec 引用 | 不修改资产 maturity |
| `DEMO-001` | 解析 Demo | demoId | 懒加载组件或 null | 无 Demo/未知 Demo 分开表达 |
| `BULK-001` | 预检查 | query snapshot、selection scope、owner | 逐项可执行/拒绝结果 | 一个确定性主失败代码 |
| `BULK-002` | 执行模拟 | precheck snapshot、confirmation | 成功/失败/未处理结果 | 系统失败为零变更 |

以上均为前端内部接口，不是业务 API。未来引入远端内容、后端权限或真实事务时必须重新打开 Architecture Gate。

## 6. 场景契约

建立技术栈中立的版本化 JSON 场景契约，包含 fixture 引用、初始场景、动作序列、预期可观察状态、失败代码与键盘路径。它作为测试 oracle，被 React 测试 helper 消费；未来独立 HTML Example 若晋升，可读取同一契约。

场景契约不驱动生产 UI，不建立通用 Schema 渲染器，也不声称模拟权限等同真实权限。契约 Schema 与首批实例位于 Lab 内；只有资产晋升获批后，才决定是否移动到 `_methodology/examples/`。

## 7. 用户体验实现边界

- 目录采用六类—子分组—分类项层级，搜索和筛选结果仍保留所属上下文；
- 详情页默认显示说明、边界、成熟度、证据缺口和下一证据；只有可解析 Demo 时开放交互页签；
- 批量 Demo 默认只选择当前页，升级为全部查询结果必须显式操作并持续显示范围；
- 查询、筛选或排序改变时由 reducer 原子清空选择并发送可访问状态消息；
- 预检查、确认、取消、全成功、部分成功、系统失败、重试和重置均有确定性入口；
- 使用语义化表格/列表、原生控件、焦点管理、`aria-live` 状态反馈和可见焦点；
- 验证场语义令牌定义颜色、间距、层级和反馈，本地 Demo 只为被验证差异增加命名空间覆盖。

## 8. 安全、性能与可观测

### 安全

- fixture 仅含虚构工作项和负责人；
- 不调用生产域名、第三方写接口、浏览器持久化或真实鉴权；
- UI 中的拒绝、锁定和权限只标记为模拟失败代码；
- 构建与测试扫描禁止的生产 URL、Token 形态和持久化调用。

### 性能

- 103 项静态元数据一次加载，Demo 继续按 Adapter 懒加载；
- 搜索和筛选为纯内存操作，不新增依赖；
- 记录构建产物和目录交互基线，Architecture Gate 不虚构硬预算；出现可感知回归后再以测量结果设阈值。

### 可观测

- 自动检查对索引缺项、重复、引用漂移、非法成熟度和无效 Demo 关联明确失败；
- Demo Boundary 继续隔离加载异常并提供重试；
- 不引入远程遥测。测试证据记录命令、浏览器场景和版本点。

## 9. 测试实现策略

| 层次 | 覆盖 | 主要证据 |
|---|---|---|
| 方法论契约 | 103 ID、六类数量、名称、唯一性、引用、成熟度证据 | Node 检查脚本 |
| 投影契约 | 生成结果可复现、无手工漂移、无 Demo 项合法 | Node 检查 + Vitest |
| Catalog Module | 搜索、筛选、层级、空结果、准确 maturity/coveredBy | Vitest |
| Domain reducer | 选择范围、查询失效、预检查、确认、执行和零变更失败 | Vitest 单元测试 |
| 页面集成 | 说明优先、Demo 可用性、VAL-002 全流程、错误隔离、重置 | Testing Library |
| 场景契约 | Spec 所列确定性状态与失败代码 | JSON Schema + 共享 runner |
| 真实浏览器 | 键盘、焦点、窄屏、URL、网络零生产请求和视觉层级 | `agent-browser` |
| 全项目 | lint、typecheck、test、build、资产与投影校验 | `pnpm verify` + 根工作台校验 |

`TC-301`—`TC-318` 与边界用例保持 `not-run`，实现完成后才能记录真实证据。

## 10. 实施顺序候选

Architecture Gate 通过后才允许转换为稳定 `TASK-*`：

1. 先建立资产登记册 Schema、103 项内容和双向一致性失败测试；
2. 建立生成式 Lab 投影，移除“正好两个”约束并修复历史成熟度文案；
3. 扩展 Catalog Module 与目录页面，先完成无 Demo 内容体验；
4. 建立 validation-slices manifest、可扩展 Demo Registry 和关联检查；
5. 建立 VAL-002 场景契约、fixture 与纯 reducer 的失败测试；
6. 实现批量分配 Adapter 和全状态/键盘路径；
7. 完成项目测试、真实浏览器证据、三视角评审和回流候选总结。

## 11. 风险与 ADR

| ID | 决策/风险 | 处理 | 复审条件 |
|---|---|---|---|
| `ADR-002` | 机器资产登记册、生成投影、切片 manifest 与显式 Adapter | 采用候选，见 ADR | 第二消费者、在线编辑或第二渲染技术出现 |
| `RISK-201` | 08 与 JSON 名称/数量漂移 | 双向检查，任何差异使验证失败 | Markdown 结构频繁变动 |
| `RISK-202` | 103 项一次录入产生错配 | 分类别校验、稳定排序、人工抽查现有两个证据项 | 首次录入评审失败 |
| `RISK-203` | coveredBy 被误读为成熟度 | 类型分离、禁止推导、UI 文案和测试断言 | 引入新的证据模型 |
| `RISK-204` | 通用场景引擎过度抽象 | JSON 仅作测试 oracle，UI 显式实现 | 第二种消费端出现真实共同变化 |
| `RISK-205` | 模拟批量操作被误当真实事务证据 | 页面声明、失败代码命名和评审边界 | 真实项目采用 |

## 12. 回滚与恢复

- 资产索引或投影失败时，保留历史两个 Demo 与方法论 Markdown，回退最后一个通过检查的生成投影；
- VAL-002 Adapter 失败时从 manifest 暂停其 Demo 可用性，目录说明和证据边界仍可访问；
- 纯静态数据无迁移、数据库或外部写入，代码回滚不需要数据恢复；
- 不删除历史截图、测试和 Gate 证据，回滚只恢复可运行版本，不改写历史。

## 13. 明确不做

- 不建立后端、数据库、登录、真实权限、审计或异步作业；
- 不把 103 项批量生成 103 个 Demo、pattern 或模板；
- 不创建通用低代码页面渲染器；
- 不把 MCRM/GF_SCM 业务字段、品牌令牌或实现代码复制进验证场；
- 不在本 Gate 批准具体 fixture 数量、分页大小或展示文案；这些在 Plan 获批后的任务细化中确定，但不得改变 Spec 语义。

## 14. Architecture Gate

- 结论：approved
- 批准人：Rick
- 时间：2026-08-31T01:44:02+08:00
- 备注：批准本 Plan 和 ADR-002；不包含资产晋升、部署或 Release。
- 批准来源：`REQSRC-011`
- 批准后允许：将方案转换为 Tasks 并按 TDD 实现；不自动批准资产晋升或 Release。
