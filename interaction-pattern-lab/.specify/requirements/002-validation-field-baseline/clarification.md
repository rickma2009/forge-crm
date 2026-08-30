# 企业交互模式验证场业务澄清

> 状态：business-questions-resolved-awaiting-gate
> 来源：`REQSRC-008`

## 1. 已解决的 Business Gate 问题

| ID | 问题 | 已确认结论 |
|---|---|---|
| `Q-201` | 下一阶段做全量 Demo 还是最小验证 | 99 项先可浏览，只新增一个完整验证切片 |
| `Q-202` | 交付物是单 HTML 还是统一应用 | 统一 React 验证应用，Demo 独立接入 |
| `Q-203` | 第一目标用户是谁 | 产品/需求分析人员；兼顾设计与前端 |
| `Q-204` | Demo 数据是否接后端 | 浏览器内确定性数据，不接真实业务后端 |
| `Q-205` | 无 Demo 条目是否展示 | 展示说明和证据缺口，不伪装可交互 |
| `Q-206` | 分类、索引与 Lab 谁是权威 | 方法论分类 + 权威资产索引；Lab 是受检查投影 |
| `Q-207` | 首个新增切片是什么 | 批量选择、批量分配与部分成功 |
| `Q-208` | 批量选择范围是什么 | 当前页与显式全部查询结果均支持 |
| `Q-209` | 首片同步还是异步 | 同步确定性；异步另开后续切片 |
| `Q-210` | HTML 与 React 如何防漂移 | 共享场景契约，不共享 UI 代码 |
| `Q-211` | 覆盖是否传播成熟度 | 不传播，`maturity` 与 `coveredBy` 独立 |
| `Q-212` | 是否立即新增组合场景编号 | 不新增，验证后评审 |
| `Q-213` | UI 风格是否统一 | Lab 统一中性语义令牌，Demo 按验证需要局部覆盖 |
| `Q-214` | 如何衡量价值 | 先建立观察任务基线，不虚构提升比例 |
| `Q-215` | 谁承担人工决策 | Rick；AI 不代批 Gate，MCRM 独立治理 |

## 2. 后续 Gate 才需决定

| ID | 问题 | 进入阶段 | 是否阻断 Business Gate |
|---|---|---|---|
| `Q-ARCH-201` | 权威索引的精确 JSON Schema 与生成/校验方向 | Architecture Gate | 否 |
| `Q-ARCH-202` | Demo 注册从硬编码联合类型演进为何种 manifest/loader | Architecture Gate | 否 |
| `Q-ARCH-203` | 场景契约文件格式、runner 与两种实现的测试 seam | Architecture Gate | 否 |
| `Q-ARCH-204` | 现有 React/Vite 静态架构是否沿用及升级边界 | Architecture Gate | 否 |
| `Q-SPEC-201` | 代表性样例记录、负责人和值域的具体文案 | Specification Gate | 否 |
| `Q-SPEC-202` | 各拒绝原因在结果表中的准确可见信息 | Specification Gate | 否 |
| `Q-OPS-201` | BUS-003 参与者和观察任务排期 | 业务验证准备 | 否；不足时保持 pending |
| `Q-PROMOTE-201` | 验证后是否新建 `EPM-SCENE-008` 或扩展现有模式 | 资产晋升评审 | 否 |

## 3. 结论

目标、用户、范围、价值证据、第一切片和人工责任均已明确，没有剩余 Business Gate 阻断问题。技术格式、样例文案和晋升结论不得在 Business Gate 中提前固化。

