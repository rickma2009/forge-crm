# 001 模式目录与交互预览

> 状态：历史实现切片保留；新定位下暂停推进
> Business Gate：reopened（`REQSRC-007`）
> Specification Gate：历史批准保留，新范围需重新确认
> Architecture Gate：历史批准保留，新范围需重新确认
> 主功能：`FR-001`—`FR-005`

本切片交付一个最小可评审闭环：用户从左侧分类目录找到两个种子模式，在右侧体验案例、查看模式说明并重置临时状态。

## 文件职责

- `requirements/original.md`：本切片采用的已批准业务来源；
- `clarification.md`：规格阶段已解决和留待架构阶段的问题；
- `spec.md`：可观察功能与验收标准；
- `prototype.md`：页面与原型输入包；
- `testcases.md`：计划验证场景，不记录虚构结果；
- `tasks.md`：Architecture Gate 后的稳定实现任务；
- `traceability.md`：目标、需求、功能、页面、验收和测试追溯；
- `pipeline-state.json`：当前阶段和 Gate 状态。

## 当前允许与禁止

允许检查、复现和整理既有实现证据，不得据此扩大范围或晋升资产成熟度。

在新的 Business Gate 批准前，禁止继续实现、部署或宣称新定位已发布。
