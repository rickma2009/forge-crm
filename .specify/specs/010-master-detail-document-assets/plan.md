# 技术计划：主从单据与企业组件资产化

> 功能编号：`010-master-detail-document-assets`
> 状态：`architecture-approved-implementation-authorized`
> Specification Gate：approved（`REQSRC-032`）
> Architecture Gate：approved（`REQSRC-034`）

## 1. 技术路线与边界

- 延续已落地的 `typescript-enterprise-web` v0.2：pnpm 9、Turbo 2、TypeScript 5.7、React 19、Vite 5、Vitest、Testing Library、Tabler Icons；不重新初始化工程。
- 本切片只改 `packages/web`、验证场脚本/登记数据和 `_methodology` 的候选模板目录；不需要 NestJS、PostgreSQL、Prisma、真实接口或业务数据库。
- 继续使用 React 原生受控状态、纯函数 reducer 和 CSS Variables；不新增 UI 组件库、表格库、表单库或状态库。
- Demo Adapter 必须确定性、纯内存、可重置；网络与持久化隔离检查继续生效。
- 暂不创建独立 npm/Workspace 组件包。组件先在验证场内部形成清晰边界，待两个独立场景和真实项目采用证据后再评审包化与晋升。
- `_methodology/patterns/index.json` 仍是 103 项分类资产的唯一机器登记册；Showcase Registry 只保存路由、渲染器和对权威资产/证据的引用，不成为第二套资产事实源。
- 本 Plan 已由 `REQSRC-034` 通过 Architecture Gate；执行必须从其追溯任务清单开始，仍不得把基线或局部验证称为资产晋升、部署或 Release。

## 2. 目标分层

```text
_methodology（唯一方法资产源）
  taxonomy → patterns/index.json → templates/ui/*（候选模板与中立契约）
                       │ 生成/引用
                       ▼
interaction-pattern-lab（验证与展示）
  showcase registry ── traceability refs ── validation-slices manifest
         │
         ▼
  ui-assets/
    foundation/          最小设计令牌与消费者清单
    primitives/          现有 HTML/React 原语的薄适配层
    components/          SchemaForm / EditableLineGrid / ValidationSummary
    templates/           MasterDetailDocument
    scenarios/           sales-order / bom
         │
         ▼
  Showcase routes + deterministic in-memory Demo Adapter
```

五层依赖只能向下：场景 → 页面模板 → 企业组件 → 原语适配 → 基础规范。核心组件不得 import 销售订单或 BOM 场景类型。

## 3. 目录与文件职责

```text
packages/web/src/ui-assets/
├── foundation/
│   ├── enterprise-tokens.css
│   ├── foundation-manifest.ts
│   └── FoundationSpecimen.tsx
├── primitives/
│   └── field-adapters.tsx
├── components/
│   ├── schema-form/{types,rules,SchemaForm}.ts(x)
│   ├── editable-line-grid/{types,reducer,EditableLineGrid}.ts(x)
│   ├── validation-summary/ValidationSummary.tsx
│   └── async-state/AsyncOutcome.tsx
├── templates/master-detail-document/
│   ├── types.ts
│   ├── reducer.ts
│   └── MasterDetailDocument.tsx
└── scenarios/
    ├── sales-order/{adapter,config,SalesOrderScenario}.ts(x)
    └── bom/{adapter,config,BomScenario}.ts(x)

_methodology/templates/ui/master-detail-document/
├── README.md
├── schema-form.schema.example.json
├── editable-line-grid.schema.example.json
├── state-matrix.md
├── acceptance-checklist.md
└── master-detail-document.tokens.css
```

测试与源文件同目录，以 `*.test.ts(x)` 表达单元/组件契约；浏览器与最终验证证据仍记录在本切片目录，不把测试结果写进通用模板。

## 4. 核心契约

### 4.1 SchemaForm

```ts
type FieldKind = 'text' | 'number' | 'date' | 'select' | 'remote-select';
type FieldMode = 'editable' | 'readonly' | 'disabled' | 'hidden';

interface FieldSchema<TValues> {
  id: keyof TValues & string;
  kind: FieldKind;
  label: string;
  groupId: string;
  requiredWhen?: Rule<TValues>;
  visibleWhen?: Rule<TValues>;
  readonlyWhen?: Rule<TValues>;
  disabledReason?: string;
  helpText?: string;
}

interface SchemaFormProps<TValues> {
  schema: FieldSchema<TValues>[];
  values: TValues;
  errors: FieldError[];
  mode: 'create' | 'view' | 'edit';
  onChange(next: TValues, change: FieldChange): void;
  onRevealError?(error: FieldError): void;
}
```

组件完全受控。规则求值是无副作用纯函数；隐藏字段的错误由场景策略明确选择 `reveal` 或 `clear`。远程选择通过 Adapter 接收 `{id,label}` 已解析值，组件本身不发请求。

### 4.2 EditableLineGrid

```ts
type PersistedState = 'draft' | 'persisted' | 'marked-for-deletion';

interface LineRecord { rowId: string; persistedState: PersistedState }
interface LineMutation<TLine> {
  type: 'append-empty' | 'append-candidate' | 'copy' | 'update' |
        'remove-draft' | 'mark-delete' | 'undo-delete' | 'select';
  payload: unknown;
}

interface EditableLineGridProps<TLine extends LineRecord> {
  rows: TLine[];
  columns: LineColumn<TLine>[];
  selection: Set<string>;
  errors: LineError[];
  summary: SummaryItem[];
  mode: 'create' | 'view' | 'edit';
  onMutation(mutation: LineMutation<TLine>): void;
}
```

稳定 `rowId` 不取数组下标或时间戳；场景 Adapter 使用确定性序列分配新 ID。删除草稿行立即移除；删除已保存行转为 `marked-for-deletion` 并保存 `{rowId,index,snapshot,revision}` 撤销令牌，只有 revision 匹配时可恢复。

### 4.3 主从单据模板与 Demo Adapter

```ts
interface DocumentScenario<THeader, TLine> {
  scenarioId: string;
  headerSchema: FieldSchema<THeader>[];
  lineColumns: LineColumn<TLine>[];
  initialState: DocumentState<THeader, TLine>;
  validate(state: DocumentState<THeader, TLine>): ValidationResult;
  save(command: SaveCommand<THeader, TLine>): Promise<DemoSaveOutcome>;
  extensions?: DocumentExtension<THeader, TLine>[];
}

type DemoSaveOutcome =
  | { kind: 'success'; nextStatus: string; message: string }
  | { kind: 'validation-failed'; errors: ValidationError[] }
  | { kind: 'business-rejected'; reason: string }
  | { kind: 'partial-success'; succeeded: number; failed: Failure[]; unprocessed: number };
```

`MasterDetailDocument` 持有模式、dirty、saving、validation summary、leave guard 和最近结果；字段值、行值、选择与撤销通过同一 reducer 更新。保存命令只调用注入的 Adapter。BOM 的层级、候选匹配和差异高亮通过 `extensions`/列描述器提供，不进入核心组件条件分支。

## 5. 单一登记册与可追溯投影

1. `_methodology/patterns/index.json` 保存 EPM 定义、成熟度、资产和验证证据，是方法资产唯一事实源。
2. `packages/web/src/catalog/validation-slices.data.json` 新增 `VAL-010`，主资产为 `EPM-PAGE-013`，覆盖 `EPM-PAGE-012/013`、`EPM-ACT-010/011/012/013/017/043/044`、`EPM-VIEW-007/010/013/018`、`EPM-STATE-002/004/005/006/007/008`；它只登记项目验证，不直接提高成熟度。
3. Showcase page 增加结构化 `traceability`：`directSourceRefs`、`extractionRefs`、`assetRefs`、`implementationRefs`、`qaRefs`。`template-form`、`template-workbench`、`template-master-detail` 必须使用直接的 `REQSRC-029/030`，不能继续只写 `UID-001`。
4. 校验器检查 ID 格式、EPM 是否存在、文件路径是否存在、交互页是否明确说明证据状态，以及交互/说明计数。尚未产生的 QA 证据用 `qaStatus: "not-run"` 表达，不创建虚假路径。
5. Portal 从同一投影展示分类资产视角与 Showcase 视角；数量分别显示 `interactive-slice` 和 `description-only`，不将登记数冒充实现数。

## 6. 交互状态与失败语义

| 事件 | 状态变化 | 用户可见结果 | 恢复策略 |
|---|---|---|---|
| 字段/行修改 | clean → dirty | 未保存标记 | 暂存或取消 |
| 保存/提交 | dirty → saving | 禁用重复提交、显示范围 | 完成后恢复动作 |
| 校验失败 | saving → dirty | 摘要、字段/行定位、保留输入 | 修正后重试 |
| 业务拒绝 | saving → dirty | 单独拒绝原因、状态不改变 | 调整业务条件 |
| 部分成功 | saving → dirty/partial | 成功/失败/未处理分列，保留失败原因 | 仅处理失败范围 |
| 成功 | saving → clean | 保存反馈；提交时另行改变业务状态 | 继续查看或编辑 |
| 离开 dirty 对象 | dirty → confirm-leave | 可取消提醒 | 取消时上下文不变 |
| reset demo | any → initial | 明确恢复预置状态 | 确定性重建 Adapter |

只读表示信息可读取、复制和聚焦；禁用表示当前动作不可执行，并必须提供原因。二者不得只靠同一种灰色表达。

## 7. 两阶段场景验证

### 阶段 A：销售订单

- 先把现有 `SalesOrderPrototype.tsx` 的业务状态迁入 `sales-order/adapter.ts`，保持现有路由可用；
- 使用 SchemaForm 组装客户、日期、币种、价格表、结算和地址；
- 使用 EditableLineGrid 组装产品、数量、价格、税率、交期、仓库和汇总；
- 补验证失败、业务拒绝、部分成功、离开提醒和保存防重复，不再使用 `Date.now()` 作为身份；
- 旧页面在契约测试和视觉回归通过后才切换渲染器，禁止一次性删除可工作的原型。

### 阶段 B：BOM 交叉验证

- 复用同一 SchemaForm、EditableLineGrid 和 MasterDetailDocument；
- 仅通过扩展提供树层级、候选物料匹配、差异高亮和 BOM 专属列；
- 添加架构测试，扫描核心目录不得出现 `bom`、产品编码等场景专属字段；
- 如果必须修改核心契约，记录通用原因并让销售订单回归，避免以 BOM 特例污染核心。

## 8. 测试与质量门禁

| 层级 | 证据 |
|---|---|
| Contract | Registry 孤立引用、计数、EPM/REQSRC/路径、VAL-010 覆盖关系 |
| Unit | 条件规则、稳定 rowId、删除/撤销 revision、金额汇总、状态 reducer |
| Component | SchemaForm 字段矩阵；行表新增/复制/删除/撤销/错误聚焦；只读/禁用 |
| Integration | 销售订单保存防重、三类失败、部分成功、离开提醒；BOM 扩展隔离 |
| Isolation | 无生产网络、无浏览器持久化、reset 恢复固定数据 |
| Browser | 1440/1024/窄屏、键盘完整路径、焦点可见、控制台无错误 |
| Workspace | `pnpm verify` 与根 `bash _methodology/scripts/verify-all.sh` |

测试按红—绿—重构推进。金额用整数最小货币单位或显式精度函数计算，不能直接依赖浮点显示偶然正确。浏览器 QA 结果只在真实运行后记录。

## 9. 迁移、回滚与兼容

- 每次抽取只替换一个边界：纯函数 → SchemaForm → Grid → Template → 场景；每一步保留旧销售订单路由绿线。
- 若新组件导致阻断，Showcase renderer 可暂时回指旧 `SalesOrderPrototype`；该回滚不删除新契约测试，也不宣称切片完成。
- Methodology 候选模板与 Lab 实现分开提交；验证失败时保留反例和来源，不提升 `maturity`。
- 不迁移数据库、不改服务端 API，无数据回滚问题；Demo reset 是运行态恢复，不是 Release 回滚。
- 不更改已有切片 002/004—009 的 Gate 和发布状态。

## 10. 风险与控制

| ID | 风险 | 控制 |
|---|---|---|
| `RISK-1001` | 从销售订单直接抽组件导致过拟合 | BOM 第二场景 + 核心目录禁用领域词扫描 |
| `RISK-1002` | 方法登记册与门户形成双源 | 方法索引唯一事实源，Lab 只存 manifest/引用并做确定性校验 |
| `RISK-1003` | 通用组件 API 过早膨胀 | 只覆盖批准 Spec；未知字段安全失败；第三场景前不包化 |
| `RISK-1004` | 巨型状态组件难测试 | reducer、规则、Adapter 纯函数化；视图只分发显式事件 |
| `RISK-1005` | 表格键盘与焦点在重渲染中丢失 | 稳定 rowId、焦点目标模型、Testing Library + 浏览器 QA |
| `RISK-1006` | 删除撤销恢复错误版本 | revision 令牌和同一身份/位置契约；冲突时拒绝错误恢复 |
| `RISK-1007` | “部分成功”演示被误解为生产事务 | Demo 标识、隔离扫描、确定性 Adapter；不连接真实 API |
| `RISK-1008` | 资产成熟度被实现自动抬高 | 证据分级；实现/QA/真实采用分别记录，晋升必须另开 Gate |

## 11. Architecture Gate 候选决策

已批准：现有 TS 路线、五层依赖、受控组件、单一方法登记册 + Lab 引用投影、纯内存 Demo Adapter、销售订单后 BOM 双场景、渐进迁移和上述测试/回滚策略。批准来源为 `REQSRC-034`，原话为 `Architecture Gate 批准`，其对话 referent 是本 `plan.md` 与 `ADR-005`。执行从 `.specify/specs/010-master-detail-document-assets/tasks.md` 开始，并保持 `docs/superpowers/plans/2026-09-05-master-detail-document-assets.md` 的既定顺序。

本 Gate 允许创建和执行 Tasks，但不表示任何 Tasks、代码、功能测试、独立包、方法论晋升、部署或 Release 已完成或获批。
