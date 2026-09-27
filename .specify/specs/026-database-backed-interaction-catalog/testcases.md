# 026 数据库驱动的交互案例目录 — 测试用例与结果

验证日期：2026-09-28  
环境：本地 PostgreSQL 16、Node.js 24、桌面浏览器自动化、`demo-portal`

| 编号 | 验证内容 | 结果 | 证据 |
|---|---|---|---|
| TC-026-01 | contracts 接受摘要、完整详情、无分组类型；拒绝非法证据卡 | 通过 | `style-scene.test.ts`，4/4 |
| TC-026-02 | seed 读取真实登记册 103 条、校验重复/超长编码、重复执行幂等 | 通过 | `style-scene.seed.spec.ts`；两次 `pnpm db:seed` 成功 |
| TC-026-03 | taxonomy/list/detail 支持聚合、组合筛选、系统隔离、历史 NULL、非法 JSON 诊断 | 通过 | `style-scene.service.spec.ts` |
| TC-026-04 | Web gateway 使用编码后的 taxonomy/list/detail URL 且严格解析响应 | 通过 | `gateway.test.ts`，2/2 |
| TC-026-05 | 两级树、无分组类型、查询/重置、摘要列和分页 | 通过 | `InteractionIndexPage.test.tsx` |
| TC-026-06 | 详情替换目录、无 dialog、返回恢复关键词/树节点/页码 | 通过 | `InteractionIndexPage.test.tsx` |
| TC-026-07 | 列表失败不回退本地资产，失败可重试；过期请求不覆盖新结果 | 通过 | `InteractionIndexPage.test.tsx` |
| TC-026-08 | viewer 登录可见，跳过 page-access，旧地址规范化 | 通过 | `ShowcaseApp.test.tsx`，15/15 |
| TC-026-09 | 数据库事实：103 条非空编码、103 个唯一编码、21 条历史空编码 | 通过 | PostgreSQL 只读聚合查询 |
| TC-026-10 | 完整仓库验证 | 通过 | `pnpm verify`：validate/lint/typecheck/test/build 全部通过 |
| TC-026-11 | viewer 浏览器端到端访问正式地址 | 通过 | 树筛选 4 条；关键词筛选 1 条；详情/演示复位/返回状态恢复通过 |
| TC-026-12 | 旧书签整页加载 | 通过 | `#/showcase/interaction-index` 重载后为 `#/showcase/style-scenes` |

## 自动化汇总

- contracts：10 个文件、44 个测试通过。
- server：38 个套件、128 个测试通过；7 个集成套件按现有环境策略跳过。
- web：55 个文件、271 个测试通过。
- 构建：contracts、server、web 全部成功。

## 已知非阻断提示

- `ResourceMenuPage.test.tsx` 保留 3 条既有 React `act(...)` 警告；与本切片无关，测试通过。
- Vite 报告主包大于 500 kB；属于既有性能优化项，不影响本次功能正确性。
