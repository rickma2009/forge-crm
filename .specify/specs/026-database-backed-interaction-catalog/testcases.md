# 026 数据库驱动的交互案例目录 — 测试用例与结果

验证日期：2026-09-28
环境：本地 PostgreSQL 16、Node.js 24、桌面浏览器自动化、`demo-portal`

| 编号 | 验证内容 | 结果 | 证据 |
|---|---|---|---|
| TC-026-01 | contracts 接受摘要、完整详情、无分组类型；拒绝非法证据卡 | 通过 | `style-scene.test.ts`，4/4 |
| TC-026-02 | seed 读取真实登记册 113 条、校验重复/超长编码、重复执行幂等 | 通过 | `style-scene.seed.spec.ts`；`pnpm db:seed` 成功 |
| TC-026-03 | taxonomy/list/detail 支持聚合、组合筛选、系统隔离、历史 NULL、非法 JSON 诊断 | 通过 | `style-scene.service.spec.ts` |
| TC-026-04 | Web gateway 使用编码后的 taxonomy/list/detail URL 且严格解析响应 | 通过 | `gateway.test.ts`，2/2 |
| TC-026-05 | 两级树、无分组类型、查询/重置、摘要列和分页 | 通过 | `InteractionIndexPage.test.tsx` |
| TC-026-06 | 详情替换目录、无 dialog、返回恢复关键词/树节点/页码 | 通过 | `InteractionIndexPage.test.tsx` |
| TC-026-07 | 列表失败不回退本地资产，失败可重试；过期请求不覆盖新结果 | 通过 | `InteractionIndexPage.test.tsx` |
| TC-026-08 | viewer 登录可见，跳过 page-access，旧地址规范化 | 通过 | `ShowcaseApp.test.tsx`，16/16 |
| TC-026-09 | 数据库事实：113 条非空编码、113 个唯一编码、21 条历史空编码 | 通过 | PostgreSQL 只读聚合查询；`COMPONENT=10` |
| TC-026-10 | 完整仓库验证 | 通过 | `pnpm verify`：validate/lint/typecheck/test/build 全部通过 |
| TC-026-11 | viewer 浏览器端到端访问正式地址 | 通过 | 树筛选 4 条；关键词筛选 1 条；详情/演示复位/返回状态恢复通过 |
| TC-026-12 | 旧书签整页加载 | 通过 | `#/showcase/interaction-index` 重载后为 `#/showcase/style-scenes` |
| TC-026-13 | `COMPONENT` 分类生成、schema 校验与 seed 幂等更新 | 通过 | 方法论测试 4/4；schema 检查；seed 单测 4/4 |
| TC-026-14 | 目录列表按 `page_path` 展示业务页面名称；无地址显示占位 | 通过 | `InteractionIndexPage.test.tsx`，6/6 |
| TC-026-15 | 演示入口使用现有工作区路由页签，保留目录页签并打开真实业务页 | 通过 | `ShowcaseApp.test.tsx`；浏览器实测双页签和状态保持 |

## 自动化汇总

- contracts：10 个文件、44 个测试通过。
- server：38 个套件、128 个测试通过；7 个集成套件按现有环境策略跳过。
- web：55 个文件、273 个测试通过。
- 构建：contracts、server、web 全部成功。

## 已知非阻断提示

- `ResourceMenuPage.test.tsx` 保留 3 条既有 React `act(...)` 警告；与本切片无关，测试通过。
- Vite 报告主包大于 500 kB；属于既有性能优化项，不影响本次功能正确性。

## REQSRC-098：已有页面映射回填（2026-10-04）

| 编号 | 验证内容 | 结果 | 证据 |
|---|---|---|---|
| TC-026-16 | 42条目录的结构与元数据校验；32条有真实页面应用，21条有实页截图 | 通过 | `template-library.seed.spec.ts` 定向6项通过；截图PNG签名和路径校验 |
| TC-026-17 | 指定模板示例匹配实际页面交互，缺少完整业务调用的模板不虚构案例 | 通过 | 已核对 `ResourceMenuPage`、`QuotationPages`、`BomPage`、`OpportunityKanban`、`ActivityPanel`、`PersonalAgentPage`、`AiAnalysisDialog` 源码；10条保留空应用 |
| TC-026-18 | 数据库按系统及编码更新目录，既有评审字段和历史数据不清空 | 通过 | 定向登记脚本：`demo-portal`、`secondary-demo` 各42模板、15组件；幂等测试通过 |
| TC-026-19 | 运行页可查看新案例说明和应用入口 | 通过 | 登录本地 `:5173` 后，TPL-02-03、TPL-07-05、TPL-08-01、TPL-05-06、TPL-06-03 的详情和应用案例可见；有图预览加载成功 |

本次未调整业务页面、接口或权限；独立Demo与无截图条目的待提炼状态保留。此处仅记录本轮针对性验证，不继承上方历史全量验证为本轮结果。
