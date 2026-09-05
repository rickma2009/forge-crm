# Architecture Gate 评审：切片 010

> 评审对象：`plan.md`、`docs/adr/ADR-005-主从单据与企业组件资产架构.md`
> 状态：`approved`（`REQSRC-034`）
> Specification Gate：approved（`REQSRC-032`）

## 1. 建议批准的核心方案

- 保持现有 TypeScript/React/Vite/Turbo 路线，不重新初始化、不新增 UI 或状态依赖；
- 五层资产依赖与受控组件/纯 reducer/注入式 Adapter；
- 方法登记册单一事实源，validation manifest 与 Showcase 只做项目验证和引用投影；
- 结构化追溯覆盖直接 REQSRC、萃取来源、EPM、实现和 QA 状态；
- 确定性纯内存 Demo，不接真实 API/数据库；
- 销售订单渐进迁移，随后用 BOM 做跨场景隔离验证；
- 红—绿—重构、键盘/响应式/隔离/全工作台验证与可回指旧 Renderer 的回滚策略。

## 2. 本 Gate 不批准

- `tasks.md`、代码或模板已经实现、测试已经通过；Architecture Gate 只允许随后创建和执行追溯 Tasks；
- NestJS/数据库/API 改造或真实业务数据写入；
- 引入 UI/表格/表单/状态库；
- 独立 workspace/npm 组件包；
- 资产成熟度晋升、对外部署或 Release。

## 3. 评审检查

| 检查项 | 证据 | 状态 |
|---|---|---|
| 既有技术路线与增量边界 | `plan.md` §1 | ready |
| 五层架构与目录职责 | `plan.md` §2—§3 | ready |
| SchemaForm/行表/模板契约 | `plan.md` §4 | ready |
| 单一登记册与追溯 | `plan.md` §5 | ready |
| 状态、失败与恢复语义 | `plan.md` §6 | ready |
| 销售订单/BOM 双场景 | `plan.md` §7 | ready |
| 测试、迁移和回滚 | `plan.md` §8—§9 | ready |
| 风险和复审条件 | `plan.md` §10、`ADR-005` | ready |
| Gate 批准与未完成事实分离 | 本文件、`pipeline-state.json`、`tasks.md` | approved；未冒充实现或 Release |

## 4. 必须接受的限制

- 纯内存 Adapter 只验证可观察交互，不证明真实后端事务或网络失败处理；
- 本轮不处理超大表虚拟化、生产并发和第三方组件库适配；
- BOM 是第二个验证场景，不等于制造业 BOM 完整业务需求；
- 方法论模板仍是候选资产，不能因 Architecture 批准自动晋升为最佳实践；
- 组件先留在验证场内部，真实项目采用前不承诺稳定公共 API。

## 5. 人工决定

- 结论：approved
- 批准人：Rick
- 批准时间：2026-09-05
- 批准来源：`REQSRC-034`；原话为 `Architecture Gate 批准`，紧接在请求批准 `plan.md` 与 `ADR-005` 的对话之后。
- 已批准对象：`plan.md` 与 `ADR-005` 的核心方案和限制。
- 允许：创建 `tasks.md`，再按已批准计划实施和验证。
- 仍禁止：资产晋升、部署和 Release，除非后续独立 Gate 明确批准。
