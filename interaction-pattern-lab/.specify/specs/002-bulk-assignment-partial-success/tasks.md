# 实现任务：批量分配与部分成功验证

> 功能编号：002-bulk-assignment-partial-success  
> 状态：in-progress
> Architecture Gate：approved（`REQSRC-011`）

## 已确认测试 seam

以下 seam 已由批准的 Plan 明确，测试与调用者使用同一 Interface：

1. 资产登记册检查：`index.json → validation result`；
2. Catalog Module：`listPatterns(filters)`、`getPattern(id)`、`resolvePatternId(id)`；
3. Validation Slice Module：分类项与 `VAL-002` 的覆盖查询；
4. Demo Registry：`getDemo(demoId) → Adapter | null`；
5. 批量分配 Module：`state + action → next state`；
6. App 与 Demo：通过可访问页面交互观察目录、状态与结果。

## 任务列表

### TASK-201 建立 103 项机器资产登记册

- 来源：`REQ-301`、`REQ-304`、`NFR-304`、`AC-301`、`AC-304`、`TC-301`、`TC-305`、`TC-EDGE-303`
- 依赖：无
- 产出：`_methodology/patterns/index.json`、Schema、同步/检查脚本、方法论校验入口
- 实施边界：只登记分类项与现有证据，不晋升成熟度
- 验收：103 个唯一编号、六类计数准确、引用与成熟度证据合法
- 验证命令/入口：`node _methodology/scripts/check-enterprise-interaction-index.mjs`
- 状态：completed
- 实际证据：首个红测发现并由 `REQSRC-012` 纠正 99/103 范围；`check-enterprise-interaction-index.mjs` 与 2 个契约测试通过

### TASK-202 建立生成式 Lab 投影与目录 Module

- 来源：`REQ-302`—`REQ-305`、`NFR-304`、`NFR-305`、`AC-302`—`AC-305`、`TC-302`—`TC-306`、`TC-318`
- 依赖：`TASK-201`
- 产出：生成式目录投影、validation-slices manifest、筛选与覆盖查询
- 实施边界：`maturity` 与 `coveredBy` 分离，无 Demo 项合法
- 验收：投影可复现，搜索/筛选准确，两个历史成熟度真实展示
- 验证命令/入口：Catalog Module 与投影契约测试
- 状态：completed
- 实际证据：`validate-pattern-projection.mjs` 通过；Catalog 9 个测试覆盖 103 项、筛选、成熟度、覆盖关系和 Registry

### TASK-203 扩展目录与 Demo Registry

- 来源：`REQ-301`—`REQ-305`、`NFR-301`、`NFR-305`、`AC-301`—`AC-305`、`TC-302`—`TC-306`、`TC-318`
- 依赖：`TASK-202`
- 产出：六类/子分组目录、成熟度/Demo 筛选、无 Demo 说明、开放式显式 Adapter 注册
- 实施边界：不建设动态插件或通用 UI 渲染器
- 验收：103 项可浏览，无 Demo 不报错，Demo 数量不再固定为两个
- 验证命令/入口：App 集成测试
- 状态：completed
- 实际证据：App 5 个测试通过；目录可浏览 103 项，三个显式 Demo Adapter 均有登记

### TASK-204 建立 VAL-002 场景契约与批量分配 Module

- 来源：`REQ-306`—`REQ-313`、`NFR-302`、`NFR-303`、`AC-306`—`AC-314`、`TC-307`—`TC-314`、`TC-317`、`TC-EDGE-301`—`TC-EDGE-302`
- 依赖：`TASK-202`
- 产出：JSON Schema、确定性 fixture/场景、纯 reducer 与 Module 测试
- 实施边界：纯内存模拟，不实现真实权限、事务或 API
- 验收：选择范围、预检查、取消、全部/部分成功、系统失败、重试和重置确定可复现
- 验证命令/入口：批量分配 Module 测试与场景契约检查
- 状态：completed
- 实际证据：场景契约检查与 reducer 5 个测试通过，覆盖部分成功、全部成功、系统失败与重试

### TASK-205 实现 VAL-002 Demo Adapter

- 来源：`REQ-306`—`REQ-313`、`NFR-301`—`NFR-303`、`AC-306`—`AC-314`、`TC-307`—`TC-316`、`TC-EDGE-304`
- 依赖：`TASK-203`、`TASK-204`
- 产出：批量分配交互 Demo、状态入口、键盘/焦点与中性语义令牌
- 实施边界：无生产请求、业务写入或持久化
- 验收：完整交互路径与所有状态可访问，Escape 取消并恢复焦点
- 验证命令/入口：Testing Library + 真实浏览器
- 状态：completed
- 实际证据：Demo 4 个组件测试与真实浏览器主路径通过；Escape 后焦点返回“确认执行批量分配”

### TASK-206 完成工程验证与浏览器验收

- 来源：全部 `AC-*`、`NFR-301`—`NFR-305`、`TC-301`—`TC-318`、`TC-EDGE-301`—`TC-EDGE-304`
- 依赖：`TASK-201`—`TASK-205`
- 产出：lint/typecheck/test/build、网络/存储/键盘/窄屏证据
- 实施边界：测试结果按真实执行记录，不声明部署或 Release
- 验收：质量命令通过，浏览器关键任务通过或缺口明确
- 验证命令/入口：`pnpm verify`、根工作台检查、`agent-browser`
- 状态：completed
- 实际证据：`pnpm verify`、`verify-all.sh` 通过；浏览器完成桌面/390px、键盘焦点、网络与存储检查，证据见 `evidence/`

### TASK-207 完成三视角评审与候选回流总结

- 来源：全部需求与 Gate 边界
- 依赖：`TASK-206`
- 产出：需求一致性、代码安全、集成运行评审和方法论回流候选
- 实施边界：不自动晋升资产，不批准 Release
- 验收：发现项修复或显式留存，追溯和状态与证据一致
- 验证命令/入口：固定提交基线双轴 review + 安全/集成核对
- 状态：in-progress
- 实际证据：实现提交 `0f12ec7` 已进入固定基线双轴评审；安全/隔离扫描已补入 `pnpm verify`

## Checkpoints

| Checkpoint | 条件 | 状态 |
|---|---|---|
| Ready | Business、Specification、Architecture Gate 均获人工批准，测试 seam 明确 | completed |
| Implemented | 范围内任务完成 | completed |
| Verified | 相关测试、浏览器验收和质量门禁通过 | completed |
| Accepted | Release Gate 通过 | pending |
