# 006 数据库驱动的数据字典

> 状态：`reqsrc-027-increment-released-in-validation-lab`

本切片验证可跨业务页面复用的数据字典闭环：系统隔离的初始化类别、类别父级树、固定/可维护模式、按角色授权的值维护、Excel 事务导入/导出，以及客户页面的数据库字典消费。

## 文件职责

- `requirements/original.md`：不可改写来源和上游需求指针；
- `clarification.md`：本增量采用的业务与技术默认项；
- `spec.md`：可观察行为、失败规则和验收标准；
- `testcases.md`：测试设计与实际结果入口；
- `plan.md`：已批准技术方案；
- `tasks.md`：实现任务；
- `traceability.md`：业务目标至实现证据；
- `review.md`、`implementation-evidence.md`：评审和真实验证结果；
- `release-gate-review.md`、`pipeline-state.json`：本地验证场 Release 状态。

## 范围边界

允许在本地验证场继续演示和积累采用证据；禁止把示例字典值视为其他项目业务事实，也不包含外部字典平台、物理删除、缓存运维、值级级联和生产部署。
