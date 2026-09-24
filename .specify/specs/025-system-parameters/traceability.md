# 追溯

BUS-2501：通过系统管理统一维护可被业务按编码读取的默认参数。来源 PARAMETERS-20260924，原文已归档；最新 PARAMETERS-20260924-text-values 替代原引用选择设计。

| 业务 | 需求 | 验收 | 用例 | 任务 | 实现 |
|---|---|---|---|---|---|
| BUS-2501 | REQ-2501 | AC-2501 | TC-2501 | TASK-2503 | SystemParametersPage / registry |
| BUS-2501 | REQ-2502 | AC-2502 | TC-2502 | TASK-2502 | parameterUpdateSchema / controller / gateway |
| BUS-2501 | REQ-2503 | AC-2503 | TC-2503 | TASK-2502 | 原始文本DTO / input[type=text] |
| BUS-2501 | REQ-2504 | AC-2504 | TC-2504 | TASK-2502 | SystemParameterService.update（独立保存） |
| BUS-2501 | REQ-2505 | AC-2505 | TC-2505 | TASK-2502 | getValue / InventoryDefaultsService.getDefaults |
| BUS-2501 | NFR-2501 | AC-2506 | TC-2506 | TASK-2504 | migration / initializer / integration tests |

TASK-2501 完成来源、spec、plan和已确认决策。各项验证见 review.md 与 evidence/；不把跳过或失败记为通过。
