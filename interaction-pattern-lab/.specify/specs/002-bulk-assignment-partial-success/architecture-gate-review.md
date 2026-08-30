# Architecture Gate 评审：批量分配与部分成功验证

> 评审对象：`plan.md`、`docs/adr/ADR-002-资产索引与验证切片扩展架构.md`  
> 状态：pending-human-decision  
> 决策人：Rick  
> Specification Gate：approved（`REQSRC-010`）

## 1. 建议批准的技术边界

- 沿用 React、TypeScript、Vite 静态单包和显式懒加载 Demo Adapter；
- `_methodology/patterns/index.json` 作为机器资产登记册，08 保留分类语义，双向检查防漂移；
- Lab 目录投影由登记册确定性生成，不再手工维护第二规范源；
- Lab validation-slices manifest 独立记录 `VAL-002` 与 `coveredBy`；
- `maturity` 与 `coveredBy` 类型、展示和测试全程分离；
- 场景契约作为 JSON 测试 oracle，不建设通用 UI 渲染器；
- VAL-002 使用纯内存、确定性 fixture 和 reducer，无真实后端或持久化；
- 不新增运行时依赖。

## 2. 本 Gate 不批准

- 具体 fixture 数量、分页大小和最终虚构文案；
- 将 99 项批量晋升为 pattern/template/example；
- 真实权限、锁、事务、后端、数据库、审计或异步作业；
- MCRM/GF_SCM 代码、业务字段或品牌样式复用；
- 部署、外部发布、方法论资产成熟度晋升或 Release Gate。

## 3. 关键决策对照

| 问题 | 建议决策 | 理由 |
|---|---|---|
| `Q-ARCH-201` 资产索引 | 方法论登记册 + Schema + 双向检查 | 机器可用且不让 Lab 成为事实源 |
| `Q-ARCH-202` VAL-002 关联 | Lab validation-slices manifest | 项目证据不污染通用资产状态 |
| `Q-ARCH-203` 场景契约 | JSON 测试 oracle + runner | 可跨实现复用且避免低代码过度抽象 |
| `Q-ARCH-204` 历史架构 | 保留 ADR-001 基线，由 ADR-002 替代固定两项部分 | 已有工程证据，变化集中在真实扩展点 |

## 4. 风险核对

| 风险 | 控制 | Gate 后证据 |
|---|---|---|
| 99 项录入错配 | 类别计数、ID/名称双向检查、人工抽查 | 方法论检查日志 |
| 投影漂移 | 生成器 `--check` 比较已提交结果 | `pnpm verify` |
| 成熟度误升 | 类型分离、禁止推导、UI/测试断言 | Catalog 测试与浏览器证据 |
| 模拟规则被误解 | 固定“演示样例”声明、失败代码与边界说明 | 页面与评审证据 |
| Adapter 扩展失控 | 显式注册 + manifest 契约检查 | 注册契约测试 |
| 可访问性遗漏 | reducer/页面自动化 + 真实键盘路径 | TC 与浏览器验收 |

## 5. Architecture Gate 通过后的允许事项

1. 把 Plan 转换为稳定 `TASK-*`；
2. 按 TDD 建立失败测试后实施 99 项索引、投影、目录扩展和 VAL-002；
3. 运行完整工程与真实浏览器验证；
4. 形成评审和候选回流总结。

Architecture Gate 通过仍不等于资产晋升或 Release 批准。

## 6. 建议结论

技术方案复用已验证基线，只在已出现的扩展点增加登记册、生成投影、切片 manifest 和场景契约；职责边界、失败语义、测试与回滚完整。建议人工结论为 `approved`。

## 7. 人工决定

- 结论：`pending`
- 批准人：待人工填写
- 时间：待人工填写
- 备注：待人工填写
- 批准来源：批准后新增独立 `REQSRC-*`
