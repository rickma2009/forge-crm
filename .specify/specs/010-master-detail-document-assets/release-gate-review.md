# Release Gate 评审包：010 主从单据与企业组件资产化

> 状态：`approved-released-in-validation-lab`
> 准备日期：2026-09-06
> Gate 决定：`REQSRC-035` 批准 `approve-for-lab-release-only`；不构成资产晋升或外部部署批准。

## 1. 请求决定

请求人工决定是否批准切片 010 在 `interaction-pattern-lab` 验证场内发布。当前建议结论为：`approve-for-lab-release-only`。

## 2. 建议批准范围

- `SchemaForm`、`EditableLineGrid`、`ValidationSummary`、`AsyncOutcome` 与 `MasterDetailDocument` 的验证场实现；
- 销售订单与 BOM 两个确定性内存场景；
- 基础规范最小令牌、Registry 追溯、`VAL-010` 验证场候选证据；
- 本切片的测试、浏览器 QA、可复用/不可复用边界和回滚记录。

## 3. 明确不包含

- `EPM-PAGE-013` 或其他 EPM 资产成熟度晋升；
- 将组件发布为独立 workspace/npm 包；
- MCRM、`gf_scm` 或其他真实项目采用；
- 真实 API、数据库、订单、库存、价格、审批或 BOM 写入；
- 外部部署、生产可用性、安全/性能认证；
- 删除旧 `SalesOrderPrototype.tsx` 回滚资产。

## 4. Gate 输入

- Specification：`spec.md`、`testcases.md`，已由 `REQSRC-032` 批准；
- Architecture：`plan.md`、`ADR-005`，已由 `REQSRC-034` 批准；
- 执行：`tasks.md`；
- 实施证据：`implementation-evidence.md`；
- 追溯：`traceability.md`；
- 三视角自审：`review.md`；
- 方法论候选：`_methodology/templates/ui/master-detail-document/` 与 `VAL-010`。

## 5. 验证摘要

- 聚焦测试 31/31，Web 172/172；
- `pnpm verify` PASS；
- `bash _methodology/scripts/verify-all.sh` PASS；
- 1440/1024/390 响应式、主路径与错误路径浏览器 QA 完成，控制台无 warning/error；
- `TC-1013` PASS：已连接 Chrome 从页面初始焦点开始，仅用键盘完成有效保存、必填错误触发、摘要定位、字段修复与再次保存；
- 页面资源全部为 localhost，隔离检查确认场景不调用真实服务或浏览器存储；
- 候选资产成熟度仍为 `idea`，未发生自动晋升。

## 6. 已知限制与风险接受

- 纯内存验证不能证明后端事务、并发、权限或生产异常恢复；
- BOM 仅验证 3 层/6 行预算，超大数据与虚拟化仍未知；
- Codex In-app Browser 不能迁移全局 Tab 焦点；已改用已连接 Chrome 完成原生全键盘走查，该工具差异不再构成验收缺口；
- 构建仍有既有的大 chunk 警告；Server 集成测试按既有环境配置跳过 2 suites / 14 tests。

这些限制已被限定在“验证场内发布”范围，不支持任何生产或资产成熟度主张。

## 7. 人工决定区

- 当前决定：`approve-for-lab-release-only`
- 建议决定：`approve-for-lab-release-only`
- 批准人：Rick
- 批准时间：2026-09-06
- 批准来源：`REQSRC-035`

本批准只允许登记为验证场内已发布。资产晋升、独立包发布、真实项目采用和外部部署仍须各自取得新的证据与批准。
