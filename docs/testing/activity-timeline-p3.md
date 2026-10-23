# P3 活动时间轴交付记录

日期：2026-10-03。范围：[034规格](../../.specify/specs/034-activity-timeline/spec.md)。L3针对性验证，未运行无关模块全量测试，未生产发布。

## 已实现

客户及商机详情新增“活动时间轴”。支持拜访、电话、人工邮件登记、跟进、备注的记录、筛选、展开和加载更多。保存后可上传附件；作者在仍有来源写权限时可以修订或作废，修改必须填写理由且保留版本审计。系统阶段、金额和本次开始的生命周期变更作为只读事实展示。

商机跟进复用原表和服务，标题/下一步为兼容可空字段，原结果字段不拼接下一步。客户聚合关联商机来源，撤销来源查看权限后不显示其数据，附件各入口同样重验。新增写入幂等、未来时间限制、关联锁定和复合外键保护。

公共呈现组件：[ActivityTimeline](../../packages/web/src/common/ActivityTimeline.md)；业务适配ActivityPanel，使用既有详情Tab、弹窗及附件组件。未扩展未来待办、财务单据事件聚合、协作、推荐及评分。

## 验证结果

| 检查 | 实际结果 |
|---|---|
| contracts构建、server与web TypeScript | 通过 |
| `node scripts/test-activity-timeline-integration.mjs` | 11项通过；当前基线建隔离库，实际执行新增增量SQL，覆盖事务/权限/附件；结束已删除临时库及附件目录 |
| `pnpm --filter @forge-crm/web test ActivityPanel.test.tsx CustomerDetailPage.test.tsx CustomerWorkspace.test.tsx` | 20项通过 |
| server Jest：opportunity-domain、opportunity-detail-contract、file-storage | 初次6项通过；兼容修订新增用例后detail-contract单独3项通过，最终合计7个不同用例 |
| `node scripts/check-activity-timeline-browser.mjs` | 客户/商机入口、展开、筛选、未来时间拒绝且保留表单、390px展示通过；无JS pageerror或Vite错误覆盖层 |
| web Vite生产构建 | 通过；存在既有大包体积提示，不作为本包额外优化范围 |
| 本地现有数据库增量升级 | 仅本次20261003160000_activity_timeline待应用，执行成功，无其他待迁移 |

共38个不同的针对性自动测试用例通过，另有真实浏览器验证。浏览器测试只提交故意无效的未来时间请求，预期HTTP400；未向现有业务库新增测试活动。截图保存在本机临时目录：`/tmp/activity-timeline-opportunity.png`、`/tmp/activity-timeline-customer.png`、`/tmp/activity-timeline-editor.png`、`/tmp/activity-timeline-mobile.png`，不发布业务数据截图到仓库。

可复现浏览器需本地服务、测试管理员环境配置、Playwright Chromium；本轮使用已有Playwright运行时，通过PLAYWRIGHT_MODULE_PATH指定。脚本仅允许localhost。隔离库脚本仅允许本地数据库，并在finally清理自己创建的库。

## 边界与遗留限制

P2已登记历史空库迁移链在20260922071848_add_role_tree_fields缺少org_unit（42P01）；本轮未修复或声称完整空库迁移通过。采用当前Prisma基线和本次真实增量SQL验证，本地既有数据库迁移已完成。依赖pg有并发query弃用提示，测试通过；不在本包升级底层驱动。

不回填不存在的历史状态事件；销售单据事务继续在原模块查看。旧跟进中可能有人工登记的计划文字，本包保留原始记录，不自动重分类。系统权限沿用当前客户数据策略及商机菜单/应用范围，不宣称新增商机行级策略。

P3完成后停止，P4规则建议、P5协作、P6评分尚未开发，长期目标保持暂停。
