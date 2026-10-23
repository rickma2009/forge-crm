# 销售交互增强 P4—P6 交付与验证

日期：2026-10-04。来源：[REQSRC-096](../../.specify/sources/REQSRC-096-sales-enhancements-complete-20261004/source.md)。规格：[035](../../.specify/specs/035-sales-guidance-collaboration/spec.md)。本轮完成已批准的一期剩余三包；不是生产部署，也不恢复长期自动目标。

## 页面入口与交付范围

| 入口 | 交付能力 |
|---|---|
| 客户详情 → 销售建议 | 按当前可见有效活动识别超过 7 个上海自然日未跟进，显示依据；采纳、忽略、稍后提醒；本人待办完成/取消必须填写结果 |
| 商机详情 → 销售建议 | 未跟进、预计签约日逾期、关键资料不足三类规则；关闭/停用不新增建议；采纳事件与结果进入只读时间轴 |
| 客户/商机详情 → 协作 | 评论、一级回复、修订理由、撤回/管理隐藏、草稿附件、显式选人提及；失败保留输入，发布附件不再改写 |
| 工作台 → 通知/个人待办 | 本人通知、未读数、逐条/全部已读、分页；撤权后隐藏来源内容；建议待办要求实际处理结果 |
| 商机详情 → 跟进优先级 | 信息完整度 30 + 来源 20 + 有效活跃 20 + 金额潜力 30；系统分与人工覆盖分离，显示规则、理由及计算时间 |
| 跟进优先级 → 评分规则 | 结构化来源分值、按币别的三个金额阈值；新草稿、显式发布/停用；已发布内容不可变 |

评分是跟进优先级，不是成交概率。人工覆盖默认 30 天，可恢复系统评分；系统分继续计算。采纳创建本人待办，不伪造已完成的销售活动。处理结果不会自动生成拜访/电话记录。

## 本地接入与权限

本地已执行增量迁移 `20261004090000_sales_interaction_remaining` 和专用初始化；迁移状态共 47 项。没有对当前业务库执行全量 seed，浏览器及集成样本只在临时数据库生成并清除。

在其他已有环境升级时，先备份并按正常发布流程执行：

```sh
pnpm --filter @forge-crm/server exec prisma generate
pnpm --filter @forge-crm/server exec prisma migrate deploy
pnpm --filter @forge-crm/server exec tsx scripts/initialize-sales-enhancement.ts
```

当前专用初始化脚本限制本地 PostgreSQL，远程正式环境应按发布流程调用同一受控初始化服务；不能删除限制后临时直连生产。初始化可重复，不覆盖已有角色授权、状态或业务规则配置。内置系统管理员获得新增动作，普通角色由管理员明确分配：

- 客户/商机：`suggestion-view`、`suggestion-adopt`、`comment-view`、`comment-create`、`comment-edit-own`、`comment-moderate`。
- 商机额外：`score-view`、`score-override`、`score-rule-manage`。
- 上述动作同时依赖现有源对象读取范围，附件、提及对象、通知及待办也重验，不因被提及而扩权。

初始评分规则的来源映射和币别阈值为空，相关维度明确显示未配置/未评估。业务管理员填写适合企业的参数并发布后才参与计分；既有商机不猜测币别，可在商机编辑中填写三位币别。金额以定点数比较，禁止不同币别共用隐含阈值。

## 数据与运行机制

新增 9 张表记录建议、规则、系统评分、覆盖、评论、修订、提及、事务 outbox 和通知；业务归属列、组合外键、唯一约束及状态约束见实际迁移。待办继续使用原表，由所属服务提供适配接口。业务修改与审计/待办/outbox 同事务；幂等键、版本及数据库锁处理重复请求与并发。

- 建议后台每 60 秒分批扫描 20 条已有非失效建议，按用户/对象去重并重验权限；查看页面时同时刷新当前对象，条件消失或再次触发会调整周期。
- 评分后台每 60 秒扫描最多 30 个未关闭商机，读时校准；输入摘要含应用自然日，支持跨日活跃度衰减。异常保留历史分并标记待更新。
- 通知后台每 30 秒处理最多 50 条 outbox，采用数据库锁与唯一投递约束；失败保留待投递记录。前端可见时每 30 秒轮询，后台页暂停。
- 评论草稿有效期 24 小时，过期草稿及其附件由有界清理处理；已发布正文/附件不因草稿清理而删除。
- 后台任务在服务进程内运行，没有新增队列基础设施；服务停止时任务暂停，重启后继续。大规模积压的监控、独立调度与运维报警另立任务。

## 验证结果（L3，限定本包相关链路）

| 验证 | 结果 | 重点 |
|---|---|---|
| 新增数据库集成 | 21 项通过 | 实际增量 DDL、重复初始化、并发采纳、周期变化、评分精度/覆盖竞争、评论事务回滚、通知撤权、附件、游标与 HTTP/CSRF |
| 页面回归 | 27 项通过 | 新增强交互 11、客户详情 8、客户工作区 5、工作台 3；后台轮询测试修正后增强交互 11 项再次通过 |
| 规则/现有契约单测 | 10 项通过 | 自然日、7/14 日边界、精确金额、原型属性键、工作台、商机契约及存储 |
| P3 数据库回归 | 11 项通过 | 原活动、来源、权限与附件链路兼容 |
| 真实 Chromium | 通过 | 采纳→完成结果；覆盖 82 分与规则弹窗；上传附件→发布纯文本→回复；客户 Tab；工作台通知及 390px 页面，无运行错误 |
| 编译 | 通过 | contracts/server 构建，web 生产构建，server/web 类型检查 |

共 69 项不同测试通过；浏览器作为额外链路验收。没有把重复运行计入测试总数，也未运行无关全量套件。关键命令：

```sh
node scripts/test-sales-enhancement-integration.mjs
pnpm --filter @forge-crm/web exec vitest run src/showcase/SalesInteraction.test.tsx src/showcase/CustomerDetailPage.test.tsx src/showcase/CustomerWorkspace.test.tsx src/showcase/WorkbenchPage.test.tsx
pnpm --filter @forge-crm/server exec jest --runInBand sales-facts.spec.ts workbench.service.spec.ts opportunity-detail-contract.spec.ts file-storage.spec.ts
node scripts/test-activity-timeline-integration.mjs
# Vite 本地服务运行中，PLAYWRIGHT_MODULE_PATH 指向已安装 Playwright：
RUN_SALESX_BROWSER=1 SALESX_BROWSER_ONLY=1 node scripts/test-sales-enhancement-integration.mjs
pnpm --filter @forge-crm/web build
pnpm --filter @forge-crm/server exec tsc --noEmit
```

数据库测试脚本仅允许本地 PostgreSQL，创建随机 `sdd_salesx_*` 临时库；以当前 Prisma 基线建库，再回退本包新表/列并执行实际迁移验证已有数据保留，结束删除数据库、附件和测试进程。它不是完整历史空库迁移验收。

浏览器临时截图在本次机器 `/tmp/salesx-suggestions.png`、`/tmp/salesx-priority.png`、`/tmp/salesx-collaboration.png`、`/tmp/salesx-score-rules.png`、`/tmp/salesx-workbench-mobile.png`，可能被系统清理，不作为长期制品依赖。

## 边界与保留问题

历史空库迁移在 `20260922071848_add_role_tree_fields` 存在 `org_unit` 前置依赖问题（42P01），此前已登记，本轮未改写旧迁移。当前已有本地库升级成功，不代表全新空库完整安装已通过。

相似客户、历史赢率、独立线索模块、外部消息通道、大模型推荐、库存业务变更和生产发布均不在本包内。初始化中性规则能运行，但来源/金额的业务有效性仍需要企业配置；不可将未配置维度视为算法预测。

组件用法见[公共组件说明](../../packages/web/src/common/SalesInteractionComponents.md)及[样式总规范](../../_methodology/style-index.md)。本阶段交付后停止扩展。

生产构建通过，同时提示现有聚合包超过 500 kB；本轮未将代码分包优化扩大为额外任务。SDD完整检查与本包文档链接检查通过。
