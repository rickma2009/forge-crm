# 测试用例

| ID | 覆盖 | 预期 |
|---|---|---|
| `TC-2001` | `AC-2001` | 分析按时间倒序且快照完整 |
| `TC-2002` | `AC-2002` | 事务成功同步，失败全部回滚 |
| `TC-2003` | `AC-2003` | 重复竞争对象、停用和旧版本被拒绝 |

## UIAUDIT-20260923 增量验收

REQ-STYLE-06 的 AC/TC 统一见 `.specify/requirements/global-page-style/testcases.md`。本切片需验证：分析历史的 competitors 明确只输出 id/competitorId/competitorName/rank，排除数据库 analysisId；新增分析返回完整详情，避免写入成功但前端报失败。
