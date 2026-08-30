# 原始需求转换记录：企业管理系统交互模式工作台

## 来源

| 来源 ID | 管理副本 | SHA-256 | 适用版本 |
|---|---|---|---|
| `REQSRC-001` | `.specify/sources/REQSRC-001-interaction-pattern-lab-concept-20260830/source.md` | `de8f9a2aba691113bec87a5fb3c9eea7ea78f1c3b6d9a768102b40083b70eba8` | 初始构想 |
| `REQSRC-002` | `.specify/sources/REQSRC-002-mvp-default-decisions-approved-20260830/source.md` | `2f98c6de2de464ff6e7ceab4b3d2c1ee22608444a1ff8b8f08d0d6d64c4d9c6b` | 默认 MVP 决策批准 |
| `REQSRC-003` | `.specify/sources/REQSRC-003-specification-gate-approved-20260830/source.md` | `95e89d0f6badd09ce00dbcf814768de95efde58d4c5ab27fddd4d6d26e14e43c` | 首个纵向切片规格批准 |
| `REQSRC-004` | `.specify/sources/REQSRC-004-architecture-gate-approved-20260830/source.md` | `8a0b45b9736275fd5c442826cfce3c642d747a37031ddcff4234db6a787859c6` | 首个纵向切片架构批准 |
| `REQSRC-005` | `.specify/sources/REQSRC-005-private-demo-release-approved-20260830/source.md` | `06e6932e1fd79535e2d81ba1cabd460e099ef850e5385e89e6b7c2134c94b5bd` | 已完成静态 Demo 发布授权 |

## 转换原则

- 原始副本保持不变；
- 来源事实、分析建议、假设和待确认项分开；
- 不补造负责人、指标目标值、技术栈或批准状态；
- 现有案例只作为证据和种子内容；
- Open Design 与用户系统只在获得具体材料后逐项归档和评估。

## 映射

| 原文要点 | 目标位置/编号 | 归一说明 |
|---|---|---|
| 所有模板按分类做成系统 | `REQ-001`、项目范围 | 归一为交互模式目录，不承诺一次覆盖全部模板 |
| 左侧点击、右侧展示交互原型 | `REQ-002`、`REQ-003` | 保留为核心体验，具体布局待确认 |
| 不用保存到系统 | `REQ-004`、`Q-003` | 暂解释为 Demo 操作不持久化，待用户确认 |
| 最重要的是总结 | `REQ-005` | 扩展为边界、契约、状态、风险、来源和验证状态 |
| 借鉴 Open Design 案例 | `REQ-010`、`Q-011` | 作为候选来源，不预先宣称最佳实践 |
| 用户可提供已完成系统样式 | `REQ-007`、`Q-012` | 新材料必须先归档并进行证据萃取 |
| 项目已有菜单与表格案例 | `REQ-006` | 对应两个 `validated-once` 模式和 MCRM 验证证据 |
| 边完善模型边构建系统 | `REQ-008` | 转换为双循环：方法论沉淀与 Demo 验证互相回流 |
| “确认，请开始” | Business Gate、`Q-001`—`Q-006`、`Q-013` | 按上一轮明确列出的默认 MVP 决策解释，不扩展为 Spec 或 Architecture Gate 批准 |

## 分析建议

- 首期不要建设在线编辑、账户、数据库和发布后台；
- 首个纵向切片用两个已有验证案例打通“查找—体验—总结—重置”；
- Demo 使用统一模式清单驱动导航和说明，方法论仍是权威源；
- 每次新增场景必须同时补来源、候选卡、Demo、验收和自动检查。

## 未决问题

Business Gate 阻断项已经关闭。`Q-007` 的具体责任人以及 `Q-008`—`Q-012`、`Q-014` 留待后续治理或架构评审，不阻断首个 Spec 草案。

## 下一 Gate

Business、Specification 与 Architecture Gate 均已批准。允许按稳定 Tasks 实现和验证首个切片；完成评审前不得声称可发布，Release Gate 仍未开始。

## 增量影响与冲突分析

- `REQSRC-002` 没有改变项目目标或系统边界，而是确认上一轮明确列出的默认 MVP 方案；
- 角色从“多角色假设”收敛为产品/需求分析人员优先，设计和前端为兼顾用户；
- 首期范围从开放场景库收敛为两个种子案例和一个最小浏览闭环；
- “不保存”明确为 Demo 操作不持久化，与模式资产 Git 版本化不冲突；
- Open Design、方案比较、源码复制和在线编辑被明确留在首片之外；
- 技术栈、部署和具体模式加载机制仍未知，不在本次业务确认中补造。
- `REQSRC-003` 只批准首个切片的可观察行为、原型输入和验收，不改变业务范围，也不构成 Architecture Gate 或实现授权。
- `REQSRC-004` 批准 `ADR-001` 与 `plan.md` 的架构边界，不改变目标、角色、业务规则或切片范围；因此不重开 Business/Specification Gate。
- `REQSRC-005` 授权发布当前已验证静态 Demo，不授权新增外部服务、业务数据、账户、生产接口或公开访问范围；托管平台和访问级别仍须遵循最小暴露原则。
