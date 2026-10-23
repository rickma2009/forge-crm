# P2 商机看板交付记录

日期：2026-10-03。来源：[REQSRC-094](../../.specify/sources/REQSRC-094-opportunity-kanban-start-20261003/source.md)。规格：[033商机看板](../../.specify/specs/033-opportunity-kanban/spec.md)。状态：本包实现并完成针对性验证，本机开发库已应用增量迁移；未生产部署。P3—P6未启动，长期目标仍暂停。

## 使用

进入“商机管理 → 商机信息”，工具栏选择“看板”和阶段模板。默认显示启用且初始/跟进中的商机；选择已签约、已丢单、已作废可查看历史，只读卡片没有移动入口。每列显示全筛选数量、精确预计金额和未填金额数量，独立加载更多；金额尚无币种，明确不进行币种换算。

有商机修改权限时，拖动卡片右上角手柄或点击“变更阶段”，选择目标并填写理由后确定。服务端同步写阶段和事件；网络重试使用同一请求号；版本冲突刷新看板后重新操作。详情编辑、人工分析修改阶段也要求理由，并使用相同事件校验，不影响业务签约/丢单状态。商机分析保留实际内容，不制造空分析。

切换模式/模板保存到个人视图，切回表格保留列宽和分页；设置中可控制可见卡片字段。旧视图默认表格，原模板失效提示并回退表格。沿用既有view/update/analyze权限，不默认扩权。

## 实现边界

- 后端：OpportunityService.board/changeStage及统一recordStageChange；控制器SessionGuard、WriteRequestGuard、view/update校验。
- 事件表sd_opp_stage_event：同tenant/application/opportunity复合外键、请求唯一键、阶段必须改变和非空理由约束；原事务失败全部回滚；操作者为账号快照。历史数据不伪造事件。
- 模板共享锁与阶段管理的模板写锁互斥，防止并发停用目标；商机版本和行锁阻止覆盖/重复提交。
- KanbanBoard为公共渲染候选组件，业务API/模板/生命周期留在OpportunityKanban。组件说明：[KanbanBoard](../../packages/web/src/common/KanbanBoard.md)，规范入口：[style-index](../../_methodology/style-index.md)。只有本项目商机采用，尚不宣称跨项目成熟。
- 现有商机权限边界是菜单/操作及应用作用域，本轮未额外声称具备负责人等行级策略。

## 已执行验证

| 验证 | 结果与范围 |
|---|---|
| contracts构建、前后端tsc --noEmit | 通过 |
| 既有商机领域、阶段服务、详情契约、视图服务 | 4个文件20项通过 |
| OpportunityKanban / BusinessDirectory | 2个文件10项通过：键盘、取消焦点恢复、拖动确认、409刷新、重试请求号、分页去重、视图设置兼容 |
| 隔离PostgreSQL业务/接口 | 9项通过：精确汇总/分页、关闭/停用/跨模板拒绝、原子回滚、重复请求/并发、阶段配置并发停用、数据库约束、个人配置及HTTP403 |
| 增量迁移 | 在已有商机的隔离基线执行实际migration.sql，原商机数量不变；本机开发库只待此一个迁移，migrate deploy成功 |
| Vite构建到/tmp/forge-kanban-dist | 通过；存在原有大chunk警告 |
| 实际本机浏览器 | 通过：桌面看板、刷新恢复个人模式、切回表格、键盘打开确认并取消、窄屏呈现；无pageerror；恢复原个人视图，不提交业务阶段变更 |
| 本包SDD检查及改动diff空白检查 | 通过 |

复现：`node scripts/test-opportunity-kanban-integration.mjs` 创建随机本机临时库并清理；`pnpm --filter @forge-crm/web test -- src/showcase/OpportunityKanban.test.tsx src/common/BusinessDirectory.test.tsx`；`scripts/check-opportunity-kanban-browser.mjs` 通过PLAYWRIGHT_MODULE_PATH指向现有Playwright，需本机5173/3000服务和本地初始管理员配置，不输出凭据。测试库最终sdd_kanban_2b11e6ba1163已删除。

截图：[/tmp/opportunity-kanban-desktop.png](/tmp/opportunity-kanban-desktop.png)、[/tmp/opportunity-kanban-confirm.png](/tmp/opportunity-kanban-confirm.png)、[/tmp/opportunity-kanban-mobile.png](/tmp/opportunity-kanban-mobile.png)。临时截图供本机验收，不是仓库长期资产。

## 独立记录的既有问题

完整历史迁移链从空库重放未通过：20260922071848_add_role_tree_fields引用尚未创建的org_unit（42P01），失败发生在本包迁移之前。没有改写历史迁移；本包隔离测试使用当前Prisma基线，再移除本包空表/索引并执行实际新增SQL。这证明增量迁移及业务行为，不等同于全链新装验收。修复历史迁移依赖需另立有限任务；当前本机库全部迁移已正常应用。

本包结束后停止，不自动开发P3时间轴、P4建议、P5协作、P6评分，也不扩展历史迁移修复。
