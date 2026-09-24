# Specification Gate 评审：切片 012

## 评审对象

- `requirements/original.md`
- `clarification.md`
- `spec.md`
- `testcases.md`
- `traceability.md`
- 上游 Business Gate：`REQSRC-045`

## 评审结论

`approved-REQSRC-046`

## 建议批准范围

- `US-1201`—`US-1205`；
- `REQ-1201`—`REQ-1230` 与 `NFR-SEC-1201`、`NFR-DATA-1201`、`NFR-AUD-1201`、`NFR-PERF-1201`、`NFR-A11Y-1201`、`NFR-UI-1201`、`NFR-OBS-1201`、`NFR-TRACE-1201`；
- 平台表无损迁移的可观察对账结果；
- 用户启停、普通角色生命周期、角色成员有效期和最后管理员保护；
- 只读权限目录、分组权限矩阵、差异确认、原子保存和并发冲突；
- viewer 只读边界、服务端授权、默认拒绝和结构化审计；
- `AC-1201`—`AC-1217`、`TC-1201`—`TC-1221` 与 `TC-EDGE-1201`—`TC-EDGE-1208`；
- `Q-SPEC-1201`—`Q-SPEC-1212` 推荐答案。

## 关键推荐值

- 第一切片只管理账号，不提前建立员工档案；
- 用户页面只维护 `ACTIVE ⇄ DISABLED`，`LOCKED` 只读；
- 普通角色编码创建后不可修改，不做物理删除；
- 成员默认立即生效、无结束时间，可选到期时间；
- 权限矩阵保存完整集合，移除前展示差异，过期版本禁止覆盖；
- 权限目录只读，权限点通过系统发布；
- admin 与 viewer 均通过角色授权；
- 目标客户管理页是视觉基线，参考项目不提供目标 CSS 或组件依赖。

## 明确不包含

- 物理表、字段类型、SQL、迁移步骤、API、组件、并发和审计存储实现；
- 组织员工、数据权限、外部身份、租户运营、菜单管理页和审计查询页；
- Architecture、Plan、Tasks、代码实现、生产迁移、部署或 Release。

## 风险与后续 Gate

- 平台表改名和作用域回填具有数据损坏风险，Architecture 必须给出映射、对账、兼容窗口、前滚恢复和数据库测试；
- 系统管理员保护与权限发布必须在同一安全不变量下设计，不能只靠前端禁用按钮；
- 审计失败是否阻断不同风险操作需在 Architecture 中细化，但角色权限等高风险变更不得出现无审计成功；
- Specification Gate 批准后只允许创建 `plan.md`、ADR 和 Architecture Gate 评审包，不自动授权 Tasks 或实现。

## 人工决定

- 结论：approved
- 批准人：用户（本任务业务决策人）
- 时间：2026-09-21
- 批准来源：`REQSRC-046`
- 批准对象：`Q-SPEC-1201`—`Q-SPEC-1212` 推荐答案、用户故事、功能/非功能需求、业务状态、不变量、异常、验收标准和测试设计
- 批准边界：允许创建 Plan、ADR 和 Architecture Gate 评审包；不包含 Tasks、实现、数据库迁移执行、生产部署或 Release
