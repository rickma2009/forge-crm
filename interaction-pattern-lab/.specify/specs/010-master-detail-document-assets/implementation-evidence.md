# 实施与验证证据：010 主从单据与企业组件资产化

> 证据日期：2026-09-06（Asia/Shanghai）
> 结论：实现、自动验证、响应式浏览器 QA 与 `TC-1013` 全键盘浏览器走查均已完成；Release Gate 仍为 `awaiting-user-approval`。
> 边界：本文件不批准资产晋升、外部部署或 Release。

## 1. 实现结果

- 用技术栈中立 schema、纯规则与受控适配器实现 `SchemaForm`，覆盖查看/编辑、必填、只读、禁用、显隐、帮助文本、远程选项安全失败与错误定位。
- 用纯 reducer 与稳定 `rowId`/revision 实现 `EditableLineGrid`，覆盖新增、候选匹配、复制、删除、撤销、单元格编辑、选择、确定性整数金额与错误导航。
- 用同一个 `MasterDetailDocument` 组合表头、表体、汇总、异步结果、相关记录、离开保护和注入式 Demo Adapter。
- 销售订单已切换到新场景；旧 `SalesOrderPrototype.tsx` 仅保留为一阶段回滚资产，不再是当前 Registry 实现证据。
- BOM 通过相同模板 API 证明场景扩展只承载层级、候选复核、差异提示与 6 行演示预算；核心组件无 BOM/订单专属 import。
- 方法论只登记 `VAL-010` 的验证场候选证据；`EPM-PAGE-013` 成熟度保持 `idea`。

## 2. 自动验证

| 日期 | 命令与目录 | 结果 |
|---|---|---|
| 2026-09-06 | `pnpm --filter @interaction-pattern-lab/web test -- src/ui-assets/scenarios/sales-order/SalesOrderScenario.test.tsx src/ui-assets/scenarios/bom/BomScenario.test.tsx src/showcase/registry/registry.test.ts`，目录 `interaction-pattern-lab/` | PASS：3 files / 31 tests |
| 2026-09-06 | `pnpm verify`，目录 `interaction-pattern-lab/` | PASS：全部 validate、lint、typecheck、test、build；Web 28 files / 172 tests；Contracts 4 tests；Server 7 suites / 13 tests，另有 2 suites / 14 tests 按既有环境配置跳过 |
| 2026-09-06 | `bash _methodology/scripts/verify-all.sh`，工作台根目录 | PASS：Skills、初始化器、方法论、103 项登记册、来源、MCRM、Interaction Pattern Lab 与构建检查全部通过 |

构建仍报告既有的单个压缩前 JS chunk 大于 500 kB 警告；命令退出码为 0。当前切片未增加打包依赖，代码分包属于后续性能治理，不冒充已解决。

## 3. 真实浏览器 QA

运行时：Codex In-app Browser 与已连接的 Chrome，`http://localhost:5174`，通过 `?preview=sales-order` / `?preview=workbench` 使用纯内存 Preview Gateway。检查了最新本地代码的 DOM、截图、焦点、控制台和页面资源。

### 3.1 销售订单

- 主路径：添加 `PRD-5001`、复制已保存行、编辑数量并回车提交、删除已保存行、撤销删除、保存草稿；汇总随行变更确定更新。
- 错误路径：清空客户后保存，出现 1 项校验摘要；激活摘要后焦点落到 `schema-form-field-customer`；输入修正值后保存成功。
- 结果分型：业务拒绝显示“模拟信用额度不足”；部分成功显示成功 2、失败 1、未处理 0，总数守恒且保留 `line-3` 原因。
- 离开保护：修改客户后离开出现确认对话框；选择“继续编辑”后保留 `仅本次会话客户` 与原上下文。
- 截图：[1440px](evidence/browser/sales-order-1440.png)、[1024px](evidence/browser/sales-order-1024.png)、[390px](evidence/browser/sales-order-narrow-390.png)。

### 3.2 BOM

- 层级树可观察到 1—3 级结构、差异标记与候选 `MAT-AX-07`；复核反馈明确“尚未写入任何业务系统”。
- 添加候选并复制至 6 行后，新增空行、候选选择/添加与复制均停用；汇总保持 `当前行数：6 / 6`。
- 1024px 无页面横向溢出；390px 表格落在内容区内，关键说明与操作仍可读。
- 截图：[1440px](evidence/browser/bom-1440.png)、[390px](evidence/browser/bom-narrow-390.png)。

### 3.3 响应式、键盘与隔离

| 观察项 | 结果 |
|---|---|
| 1440px | 销售订单页面宽 1440、页面 scrollWidth 1440；主区、表格和固定动作完整 |
| 1024px | 页面 scrollWidth 与 viewport 同为 1024；销售订单表格 776px，保存/离开动作可见 |
| 390px | 菜单降级为 64px 图标栏；页面本身无横向溢出；销售订单长表通过内容区 92px 可恢复横向滚动展示全部列与操作，BOM 表格直接收敛至 298px |
| 键盘 | Chrome 从 `BODY` 初始焦点开始，经 33 次 Tab 到客户字段；仅用 Tab、Control+A、Backspace、文本输入和 Enter 完成有效保存。随后清空客户、经 57 次 Tab 到“保存模拟单据”、Enter 触发 1 项错误；经 44 次 Tab 到“客户不能为空。”摘要项，Enter 后焦点回到客户输入框；输入修复值、经 57 次 Tab 再次保存成功，摘要消失。组件测试另覆盖 Escape 与末单元格到行操作 |
| 控制台 | 销售订单与 BOM 检查期间无 `warn` / `error` |
| 页面资源 | Browser page-assets 观察到 54 个资源，全部来自 `http://localhost:5174`；未观察到外部或生产 origin |
| 存储/网络边界 | `validate:isolation` 检查 36 个源文件：网络与 CSRF Cookie 只允许在批准的 Gateway seam；销售订单/BOM 使用 Preview Gateway 与内存 Adapter，不调用真实 API/数据库/浏览器存储；刷新后恢复预置 4 行 |

Codex In-app Browser 的全局 Tab 指令不能迁移焦点，因此该运行时未用于证明 `TC-1013`。切换到已连接 Chrome 后，全局 Tab 焦点迁移与完整错误修复路径均可观察并完成；没有用程序化点击、填值或直接选取控件替代键盘路径。

## 4. 测试用例证据矩阵

| 用例 | 状态 | 主要证据 |
|---|---|---|
| `TC-1001` | PASS | Registry contract + 当前实现/QA 路径 |
| `TC-1002` | PASS | Registry mutation tests：孤立页、未知 EPM、缺失实现、计数/coverage |
| `TC-1003` | PASS | FoundationSpecimen 2 tests + 四路由浏览器检查 |
| `TC-1004` | PASS | rules 13、field adapters 14、SchemaForm 7 tests |
| `TC-1005` | PASS | SchemaForm/ValidationSummary 隐藏、禁用、远程回显失败与修复路径 |
| `TC-1006` | PASS | line reducer 10 + EditableLineGrid 6 tests + 浏览器新增/复制/删除/撤销 |
| `TC-1007` | PASS | 销售订单确定性整数汇总测试 + 浏览器编辑数量 |
| `TC-1008` | PASS | MasterDetailDocument/ValidationSummary tests + 浏览器客户错误聚焦 |
| `TC-1009` | PASS | 防重、校验失败、业务拒绝测试 + 浏览器拒绝反馈 |
| `TC-1010` | PASS | AsyncOutcome + 销售订单部分成功守恒测试和浏览器反馈 |
| `TC-1011` | PASS | document reducer 创建/查看/编辑状态测试 |
| `TC-1012` | PASS | 可取消离开测试 + 浏览器继续编辑保留输入 |
| `TC-1013` | PASS | Chrome 全键盘有效保存、必填错误触发、摘要定位、字段修复与再次保存；组件测试补充 Escape 和网格末端路径 |
| `TC-1014` | PASS | BOM 4 tests + boundary validator + 浏览器层级/候选/预算 |
| `TC-1015` | PASS | 1440/1024/390 DOM 尺寸检查与 5 张截图 |
| `TC-1016` | PASS | isolation validator + localhost-only page-assets + 刷新复位 |
| `TC-1017` | PASS | `pnpm verify` + 根 `verify-all.sh` |

边界用例 `TC-EDGE-1001`—`TC-EDGE-1005` 均由相应规则、reducer、组件和 BOM 预算测试覆盖。

## 5. 尚未证明

- 未接真实订单、价格、库存、审批、BOM、数据库或生产网络，因此不证明事务、并发、权限和远程失败恢复。
- 未验证超大表虚拟化、超过 3 层/6 行的 BOM、第三方 UI 表格库适配和真实移动端高频编辑。
- 未在 MCRM 等真实项目采用，不能把验证场结果解释为业务验证或资产晋升。
- Release Gate、资产晋升和外部部署均未批准。
