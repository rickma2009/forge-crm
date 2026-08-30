# 测试用例：线索评审工作流

| ID | 关联项 | 场景 | 期望 | 优先级 |
|---|---|---|---|---|
| TC-001 | AC-001 | active 提交评审 | 进入 in_review，历史 +1 | P0 |
| TC-002 | AC-002 | in_review 判定合格 | 进入 qualified，历史完整 | P0 |
| TC-003 | AC-003 | in_review 带原因拒绝 | 进入 rejected，保留原因 | P0 |
| TC-004 | AC-004 | active 直接判定合格 | INVALID_TRANSITION，数据不变 | P0 |
| TC-005 | AC-005 | in_review 无原因拒绝 | VALIDATION_ERROR，数据不变 | P0 |

执行：`node --test implementation/lead-review-workflow.test.mjs`。
