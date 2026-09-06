# Specification Clarification：导入—校验—执行

| ID | 规格问题 | 推荐并采用的评审草案 | 状态 |
|---|---|---|---|
| `Q-SPEC-1101` | 首轮资源字段 | 唯一编码、名称、分类、启用日期、数量；另允许不参与写入的备注列 | proposed-for-spec-gate |
| `Q-SPEC-1102` | 文件边界 | 单个 `.xlsx`、一个数据工作表、最大 5 MiB、最多 5,000 条数据行；加密、宏和多数据表拒绝 | proposed-for-spec-gate |
| `Q-SPEC-1103` | 表头与映射 | 表头必须唯一；已识别列自动映射，未识别列可忽略；必填目标字段必须且只能映射一次 | proposed-for-spec-gate |
| `Q-SPEC-1104` | 首轮错误规则 | 缺必填值、类型错误、未知分类、负数量、非法日期、文件内或目标快照内编码重复为阻断错误 | proposed-for-spec-gate |
| `Q-SPEC-1105` | 首轮警告规则 | 可安全规范化的首尾空格和未映射可选列作为警告，不静默修改原值 | proposed-for-spec-gate |
| `Q-SPEC-1106` | 部分执行 | 仅 `import.execute-valid-rows` 能力可选择；确认页同时展示排除行数、警告数与不可撤销说明，并要求第二次确认 | proposed-for-spec-gate |
| `Q-SPEC-1107` | 异步状态 | `queued → running → succeeded / partially-succeeded / failed`；仅 queued 可转 `cancelled` | proposed-for-spec-gate |
| `Q-SPEC-1108` | 重复确认与重试 | 同一确认动作重复触发只得到同一任务；重试创建新任务并显示来源任务 ID | proposed-for-spec-gate |
| `Q-SPEC-1109` | 错误明细 | 错误下载为 `.xlsx`，包含任务、源行、源列、目标字段、错误码、原值、原因和修复建议 | proposed-for-spec-gate |
| `Q-SPEC-1110` | Demo 会话边界 | 同一浏览器页签刷新可恢复任务；重置或结束会话后不承诺恢复，并始终标记为本地确定性模拟 | proposed-for-spec-gate |

以上是 `REQSRC-038` 授权下采用的推荐规格草案，仍须由 Specification Gate 明确批准后才成为实现约束。
