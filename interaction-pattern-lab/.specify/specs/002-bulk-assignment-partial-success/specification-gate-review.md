# Specification Gate 评审：批量分配与部分成功验证

> 评审对象：`spec.md`、`testcases.md`、`traceability.md`
> 状态：approved
> 决策人：Rick
> Business Gate：approved（`REQSRC-009`）

## 1. 本 Gate 批准什么

- 99 项目录的可观察展示、搜索、筛选和无 Demo 行为；
- 成熟度与覆盖关系的准确表达；
- `VAL-002` 与现有分类项的关联，不新增 EPM 编号；
- 当前页/全部查询结果选择、批量分配、预检查、确认和部分成功行为；
- 加载、空、取消、成功、部分成功、系统失败、重试和重置状态；
- 键盘、隔离、确定性和追溯验收要求。

## 2. 本 Gate 不批准什么

- 99 项索引 JSON Schema、生成器或检查器实现；
- Demo manifest/loader、React 组件结构或状态管理；
- 场景契约文件格式和测试 runner；
- 示例数据精确数量、分页大小和具体虚构文案；
- 技术 Plan、Tasks、代码、资产晋升、部署或 Release。

## 3. 完整性检查

| 检查项 | 结果 | 证据 |
|---|---|---|
| Business Gate 已批准 | ready | `REQSRC-009` |
| 用户故事与范围明确 | ready | `spec.md` §1—§2 |
| P0/P1 需求有来源 | ready | `REQ-301`—`REQ-313` |
| 批量选择和失败语义明确 | ready | `spec.md` §4、§7 |
| 每个 REQ/NFR 有 AC | ready | `traceability.md` |
| 每个 AC 有 TC | ready | `testcases.md`、`traceability.md` |
| 测试结果未虚构 | ready | `testcases.md` 为 `designed-not-run` |
| Architecture 问题被隔离 | ready | `clarification.md` §2 |
| spec 阶段自动检查 | passed | `check-sdd.sh ... spec` |

## 4. 关键评审判断

1. `VAL-002` 是验证场案例，不是新的通用模式编号；
2. 99 项进入目录不代表 99 项已经成熟；
3. “选择全部”始终限定当前查询结果，并且必须显式触发；
4. Demo 中的权限、锁定和失败是交互样例，不证明真实后端规则；
5. 部分成功结果必须可复核，系统失败必须零变更；
6. Specification Gate 通过后只能准备 Architecture 方案，不能直接实现。

## 5. 建议结论

规格和验证设计已经完整覆盖已批准业务范围，建议人工结论为 `approved`。批准后允许形成 Plan 候选、复审历史 ADR-001，并提交 Architecture Gate；在 Architecture Gate 批准前仍禁止 Tasks 和编码。

## 6. 人工决定

- 结论：`approved`
- 批准人：Rick
- 时间：2026-08-31T01:30:45+08:00
- 备注：仅批准可观察行为和测试设计；Architecture、Plan、Tasks、实现、资产晋升和 Release 均未批准。
- 批准来源：`REQSRC-010`
