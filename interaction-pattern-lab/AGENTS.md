# AGENTS.md

> 企业交互模式验证场的 AI 执行入口。

## 项目状态

- 迁移稳定基线已记录为 `interaction-pattern-lab-baseline-20260906`；切片 011“导入—校验—执行”的 Business Gate 已由 `REQSRC-037` 批准，`REQSRC-038` 允许非 Gate 事项按推荐持续推进。当前为 Specification Gate 草案；明确批准前不得创建 Plan、Tasks 或实现。
- 切片 010“主从单据与企业组件资产化”已完成实施、自动验证、响应式与全键盘浏览器 QA；Release Gate 已由 `REQSRC-035` 批准为 `released-in-validation-lab`。该批准不包含方法论资产晋升、独立包发布、真实项目采用或外部部署。
- 当前阶段：切片 004 Release Gate 已由 `REQSRC-021` 批准，状态为 `released-in-validation-lab`；未执行外部部署或方法论晋升。原纯前端 `TASK-401`—`TASK-406` 及验证证据保留；既有切片 002 仍为 `review-complete-awaiting-release-gate`。
- 重新定义证据：`REQSRC-007`。本目录是交互模式验证场，不是模板规范源或真实业务项目。
- 既有 `REQSRC-002`—`REQSRC-006` 及实现证据作为历史切片证据保留，不改写、不冒充新边界的批准。
- 新定位 Business Gate 已由 `REQSRC-009` 批准；切片 002 Specification/Architecture Gate 已由 `REQSRC-010/011` 批准；99/103 计数差异已由 `REQSRC-012` 纠正。
- `REQSRC-013` 新增多来源 UI 萃取、演示门户和模拟权限范围，`REQSRC-014` 已批准该增量 Business Gate，不覆盖旧批准。
- `REQSRC-015/016` 只批准历史纯前端边界；切片 004 的四个 Gate、`TASK-501`—`TASK-509` 与实现证据已闭环。下一步是积累真实项目采用证据，并在新增页面模式前处理 `REL-RISK-501`；不得扩大为生产 IAM、外部部署或自动晋升方法论模式。切片 002 的 Release 评审入口仍保持原路径。

## 开始工作前

1. 检查并保留已有改动。
2. 使用工作台 `sdd-forge-workflow`。
3. 阅读 `.specify/memory/project-charter.md`、`business-context.md` 和 `constitution.md`。
4. 新材料先进入 `.specify/sources/`，再做增量转换、冲突分析和影响评估。
5. 检查 `_methodology/08-企业管理系统交互模式分类方法.md`、`patterns/` 与 `templates/ui/` 的现有资产。

## 稳定约束

- `_methodology/` 是通用模式的唯一规范源；本项目负责探索与验证，不另建一套冲突事实源。
- Demo 交互默认只保留在当前浏览器会话，不写业务数据库。
- 模式内容需要版本化保存；“不保存”只指 Demo 操作数据，不指方法论资产。
- 来源项目是证据，不是答案。源码优先于截图，推断必须与事实分开。
- 不复制参考项目的业务字段、组织平台、认证体系或技术遗留。
- Open Design 或其他工具生成的原型属于设计建议，不能替代项目 Spec、测试证据或人工 Gate。
- 不虚构模式验证、测试、发布或外部系统状态。

## 上下文路由

- 项目总体规划：`docs/product/多来源交互资产萃取与演示门户规划.md`
- 多来源业务基线：`.specify/requirements/003-multi-source-ui-distillation-showcase/requirement.md`
- 当前数据库导航业务基线：`.specify/requirements/004-database-backed-navigation-rbac/`
- 当前已批准 Architecture：`.specify/specs/004-database-backed-navigation-rbac/architecture-gate-review.md`
- 当前 Release Gate 评审：`.specify/specs/004-database-backed-navigation-rbac/release-gate-review.md`
- 历史纯前端导航切片：`.specify/specs/003-authenticated-enterprise-navigation-shell/`
- 已批准业务基线：`.specify/requirements/002-validation-field-baseline/`
- 历史产品基线：`.specify/requirements/001-product-baseline/`
- 场景台账：`docs/pattern-backlog.md`
- 参考证据：`docs/reference-inventory.md`
