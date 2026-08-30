# 切片 002 业务来源

## 权威来源

| 来源 | 作用 |
|---|---|
| `REQSRC-007` | 将项目重新定义为企业交互模式验证场 |
| `REQSRC-008` | 确认 99 项目录、首个新增切片、批量语义、状态覆盖、样式和证据边界 |
| `REQSRC-009` | 批准新业务基线通过 Business Gate，并授权形成切片 002 Spec |
| `.specify/requirements/002-validation-field-baseline/requirement.md` | 当前批准的业务需求与切片范围 |
| `_methodology/08-企业管理系统交互模式分类方法.md` | PAGE、ACT、VIEW、STATE、SPECIAL、SCENE 分类语言 |
| `_methodology/09-资产类型、成熟度与晋升规范.md` | 成熟度和证据边界 |

## 切片意图

使用者需要从完整分类目录找到批量操作相关候选，先辨认其成熟度和证据缺口，再通过确定性的交互演示理解：当前页全选与全部查询结果不是同一范围；批量执行前需要预检查和确认快照；执行结果可能部分成功。

## 分类映射

本切片验证但不自动晋升以下分类项：

- `EPM-PAGE-010` 查询列表页；
- `EPM-ACT-002` 筛选；
- `EPM-ACT-031` 责任分配；
- `EPM-ACT-042` 批量变更；
- `EPM-ACT-043` 批量选择；
- `EPM-STATE-003` 空数据；
- `EPM-STATE-005` 校验失败；
- `EPM-STATE-008` 部分成功；
- `EPM-SPECIAL-002` 批量操作。

切片使用项目级 `VAL-002` 表达验证案例，不新增 `EPM-SCENE-008`。

