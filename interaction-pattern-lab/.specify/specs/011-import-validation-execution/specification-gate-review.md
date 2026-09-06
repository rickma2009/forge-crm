# Specification Gate 评审：切片 011

## 评审对象

- `requirements/original.md`
- `clarification.md`
- `spec.md`
- `testcases.md`
- `traceability.md`
- 上游 Business Gate：`REQSRC-037`

## 评审结论

`ready-for-human-decision`

## 建议批准范围

- `US-1101`—`US-1104`；
- `REQ-1101`—`REQ-1120` 与 `NFR-1101`—`NFR-1106`；
- 文件与映射边界、错误/警告分类、部分执行权限和二次确认；
- 异步任务状态、取消、重复确认、错误下载、关联重试和 Demo 会话边界；
- `AC-1101`—`AC-1114`、`TC-1101`—`TC-1115` 与 `TC-EDGE-1101`—`TC-EDGE-1106`。

## 关键推荐值

- 单个 `.xlsx`、一个数据工作表、5 MiB、5,000 条数据行；
- 中性字段：唯一编码、名称、分类、启用日期、数量；
- 错误默认阻断，部分执行要求 `import.execute-valid-rows` 能力与二次确认；
- 所有确认创建异步任务，只有 queued 可取消；
- 重复确认复用同一任务，修复重试创建关联新任务；
- 错误下载使用绑定任务版本的 `.xlsx`；
- 同页签刷新恢复，重置或会话结束不承诺恢复。

## 明确不包含

- 解析库、文件存储、任务调度、数据库、API、鉴权实现或部署拓扑；
- Architecture、Plan、Tasks 或实现；
- 真实系统连接、生产数据、资产晋升、部署或 Release；
- 对切片 002 Gate 或成熟度的替代、继承或修改。

## 风险与后续 Gate

- 5 MiB/5,000 行是首轮验证预算，不是生产容量承诺；
- 目标快照变化需要重新校验，其一致性机制留给 Architecture；
- 文件内容安全和公式文本化属于必须保留的安全行为，具体实现留给 Architecture；
- Specification Gate 批准后只允许创建 `plan.md`、ADR 和 Architecture Gate 评审包，不自动授权 Tasks 或实现。

## 人工决定

- 结论：pending
- 批准人：
- 时间：
- 批准来源：
- 批准边界：
