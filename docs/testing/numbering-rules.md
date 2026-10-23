# 编码规则交付与验证

日期：2026-10-04。范围：[036规格](../../.specify/specs/036-numbering-rules/spec.md)；来源：[REQSRC-097](../../.specify/sources/REQSRC-097-numbering-rules-20261004/source.md)。L3定向验证，涉及跨对象调用、权限、数据迁移和并发。

## 交付

系统管理新增“编码规则”，使用公共查询区、网格与分页，弹窗新增/编辑/只读查看，图标编辑/删除及删除确认。初始12条规则全部按用户给定前缀、日期及位数。固定辅助配置表不提供个人列视图，理由已写规格。员工新增显示“保存后自动生成”。

客户、员工、商机、报价新建/复制、销售订单、入库、销售出库使用NumberingService；供应商/采购/退货/调拨先登记规则，未扩展不存在的业务模块。详细字段、失败行为、接口示例和接入步骤见[编码规则规范](../database/business-document-numbering.md)。

本地使用新迁移与专用增量初始化，没有执行全量业务seed。历史编码与引用未重写。普通角色不自动授予管理权限。

## 验证命令与证据

- `node scripts/test-numbering-integration.mjs`：11项实际数据库/HTTP集成通过；涵盖24并发不同请求、8并发同请求、日期周期、开始数/位数/前缀变更、历史编码避让、跨应用、数据库CHECK/FK、权限/CSRF和真实客户/员工/商机/报价创建。
- `node scripts/test-sales-posting-integration.mjs`：7项销售过账/库存查询回归通过；通过现有业务服务创建订单、入库和出库，测试批次扣减、冲销和并发过账。
- `pnpm --filter @forge-crm/server exec jest --runInBand quotation-create.spec.ts opportunity-configured-template.spec.ts`：15项报价/商机创建回归通过。
- `pnpm --filter @forge-crm/contracts exec vitest run src/employee-contracts.spec.ts`：2项员工契约验证通过。
- `pnpm --filter @forge-crm/web exec vitest run src/showcase/NumberingRulesPage.test.tsx`：5项页面交互验证通过，覆盖字段、权限、默认值、错误保留及删除确认。
- 真实浏览器：`RUN_NUMBERING_BROWSER=1 NUMBERING_BROWSER_ONLY=1 PLAYWRIGHT_MODULE_PATH=<已安装Playwright模块路径> node scripts/test-numbering-integration.mjs`，需本地Vite5173运行；临时后端3107。最终浏览器及构建结果在下方收尾记录登记。

共40项不同测试。新测试发现PostgreSQL substring参数未显式转integer时可能被解释为正则模式，已修正并用`C0000042`避让到`C0000043`的回归覆盖；也修正了前端注册类型及测试类型声明问题。

隔离脚本建立随机`sdd_numbering_*`数据库，基于当前Prisma schema与种子数据建立旧业务基线，删除本包新空表后执行实际新migration；核对已有商机数量不变。退出清理数据库、附件与临时进程。历史全空库迁移仍存在`20260922071848`的org_unit前置依赖问题，本轮未修改旧历史，不能将增量测试视为全历史空库通过。

## 有限范围与复用

不改变历史业务编码、不强制修改未登记规则的产品/组织编码，不开发尚未存在的采购/供应商/退货/调拨创建模块。统一接口支持这些已登记对象供后续服务接入。取号保证唯一且幂等，业务新建防重仍遵循各业务原有机制。当前规则未提供任意公式、SQL或手工重置计数器。

候选复用资产：NumberingService的事务锁/计数器/发号账本，以及规则CRUD；公共页面直接复用已有组件，没有创建新的独立表格组件。默认对象及现有表字段映射不可不加判断地移植。迁移后保留账本、前滚修复，不回收断号。

## 最终收尾记录

40项定向测试全部通过。真实Chromium验收输出PASS：查询列表、新增、编辑、只读查看、删除，页面无运行错误；截图已检查，临时证据位于`/tmp/numbering-list.png`与`/tmp/numbering-editor.png`（可能被系统清理）。前端生产构建、服务端构建及最终类型检查通过。构建仍提示现有大包超过500kB，本轮未扩大为分包优化。Showcase Registry、数据库治理、036完整SDD检查通过。

本地仅应用新迁移20261004100000_numbering_rules，共48项迁移；专用初始化返回12条规则。最后补充的报价复制、客户改名不改号及SO/IB/OB单号断言均通过。临时数据库与测试进程已清理，真实业务库未写入验收客户/单据。
