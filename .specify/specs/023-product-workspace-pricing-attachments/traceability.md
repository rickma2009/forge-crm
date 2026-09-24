# 切片 023 追溯矩阵

`BUS-023`：建立可安全删除、按业务日期定价并可复用附件能力的产品工作区，同时保持历史报价可追溯。

| 业务目标 / 来源 | 需求 | 验收 | 测试 | 任务/实现 |
|---|---|---|---|---|
| BUS-023 / REQSRC-066 | REQ-2301、REQ-2302 | AC-2301 | TC-2301 | TASK-2303、TASK-2305 |
| BUS-023 / REQSRC-066 | REQ-2303 | AC-2302 | TC-2302、TC-2303 | TASK-2303 |
| BUS-023 / REQSRC-066 | REQ-2304 | AC-2303 | TC-2304、TC-2305 | TASK-2301、TASK-2302 |
| BUS-023 / REQSRC-066 | REQ-2305 | AC-2304 | TC-2305、TC-2306 | TASK-2302 |
| BUS-023 / REQSRC-066 | REQ-2306 | AC-2305 | TC-2307、TC-2308 | TASK-2301、TASK-2304、TASK-2305 |
| BUS-023 / REQSRC-066 | REQ-2307 | AC-2306 | TC-2308、TC-2309 | TASK-2301、TASK-2304 |
| BUS-023 / REQSRC-066 | REQ-2308 | AC-2307 | TC-2310 | TASK-2303、TASK-2304、TASK-2306 |

数据库表、迁移、API、前端文件和自动测试的实现证据在 Architecture/Tasks 完成后补齐；当前不得虚构。

## 全局整改追溯

UIAUDIT-20260923 → REQ-STYLE-01 → 本切片当前有效约定 → 全局页面样式 testcases.md / audit.md；具体公共实现及本切片接入位置由 audit.md 登记。
