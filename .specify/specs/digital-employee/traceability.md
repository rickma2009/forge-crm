# 追溯

| 需求 | 实现 | 验证 |
|---|---|---|
| BUS-DE-NAV-01 | 左侧场景目录与异构场景工作区 | AC-DE-NAV-01 至 AC-DE-NAV-05 |
| REQ-DE-01 | `ShowcaseApp.tsx` 工具栏机器人入口 | TC-DE-NAV-02；原有数字员工验收用例 1 |
| REQ-DE-01/02 | `packages/web/src/showcase/digital-employee/`、`ShowcaseApp.tsx` | Web 组件测试、浏览器检查 |
| REQ-DE-02 | `RecordQueryBar`、`DeclarativeDataGrid` 与数字员工页面 | 数字员工任务/邮件工作区列表检查 |
| REQ-DE-03/04 | digital-employee 前后端模块 | 契约与服务集成测试 |
| REQ-DE-04 | digital-employee 管理服务与配置页面 | 配置权限、人工确认边界检查 |
| REQ-DE-05/06 | connection API、运行配置、加密存储 | 配置校验和失败关闭测试 |
| REQ-DE-06 | 邮箱连接状态与同步入口 | 无密钥/连接失败时不得同步或发送 |
| REQ-DE-07 | controller RBAC、作用域过滤、审计写入 | API 权限测试 |
| REQ-DE-08 | `imap-mail.adapter.ts`、`mail-classifier.ts`、邮件同步 API | 分类单测、真实连接/同步检查、重复同步去重检查 |
| REQ-DE-09 | `mail-automation.service.ts` 调度器、`int_de_mail_run` | 运行计划契约测试、计划运行记录检查 |
| REQ-DE-10/12 | 邮件规则/消息模型、`MailAutomationCenter.tsx` | 契约测试、浏览器五个功能页检查 |
| REQ-DE-12 | 邮件消息状态模型与人工处理页面 | 状态流转与动作确认检查 |
| REQ-DE-11 | 回复模板、SMTP 适配器、白名单/黑名单与限流 | 默认关闭契约测试、服务端保护逻辑检查 |
| REQ-DE-13 | 邮件动作队列、IMAP move、幂等键与重试 | 类型检查、动作状态回归检查、数据库汇总检查 |
| REQ-DE-14 / AC-DE-NAV-01 | `seed-data.ts` 分类导航树与 RBAC 投影 | TC-DE-NAV-01 |
| REQ-DE-15 / AC-DE-NAV-02 | 旧路由子页及工具栏快捷入口 | TC-DE-NAV-02 |
| REQ-DE-16 / AC-DE-NAV-05 | 路由分发、DetailTabs、RouteTabs | TC-DE-NAV-05 |
| REQ-DE-17 / AC-DE-NAV-03 | 邮件场景、MailAutomationCenter、邮件 API | TC-DE-NAV-03 |
| REQ-DE-18 / AC-DE-NAV-04 | 公共信息获取场景工作区与来源状态 | TC-DE-NAV-04 |
| REQ-DE-19 / AC-DE-NAV-05 | 其他场景壳与等待配置状态 | TC-DE-NAV-06 |
| TASK-DE-NAV-01 | 来源归档、规格回写、验收和追溯 | 文档链接与当前态完整性检查 |
| TASK-DE-NAV-02 | `packages/server/prisma/seed-data.ts` | Seed 菜单层级与角色授权检查 |
| TASK-DE-NAV-03 | `packages/web/src/showcase/ShowcaseApp.tsx`、场景路由页面 | Web 类型检查、菜单访问与页面分发检查 |
| TASK-DE-NAV-04 | `DigitalEmployeeScenarioPage.tsx`、`MailAutomationCenter.tsx` | Web 类型检查；浏览器场景状态待验收 |
| TASK-DE-NAV-05 | `plan.md`、`pipeline-state.json`、实现边界说明 | Architecture Gate 数据与恢复登记 |
| TASK-DE-NAV-06 | 邮件/信息获取场景工作区 | 登录态恢复后检查连接等待、实际邮件/信息及无数据状态 |
| TASK-DE-NAV-07 | 定向回填脚本、菜单默认展开及工作台 API 动作授权编码 | 数据库父子关系核对、浏览器侧栏菜单核对、服务端/前端类型检查 |
| REQ-DE-14 | 数字员工菜单 Seed、RBAC 导航投影 | 菜单层级、未授权过滤及直接路由拒绝检查 |
| REQ-DE-15 | 现有数字员工路由与顶部工具栏快捷入口 | 机器人图标仍导航至既有路由，页面内容回归核对 |
| REQ-DE-16 | 场景路由分发与 DetailTabs 工作区 | 路由页签/页面内 Tab 独立状态检查，不同场景可用不同内容 |
| REQ-DE-17 | 邮件场景工作区、MailAutomationCenter 与邮件 API | 真实连接记录显示、未连接/无记录失败状态、凭据不回显 |
| REQ-DE-18 | 信息获取场景工作区与连接器状态 | 有真实来源数据时显示；未配置或失败不得伪造数据 |
| REQ-DE-19 | 场景菜单及适配器状态页 | 未接入场景显示等待配置，不触发外部动作 |
| REQ-DE-20 / AC-DE-NAV-06 | `ShowcaseApp.tsx` 默认展开数字员工目录与分类；菜单定向回填脚本 | TC-DE-NAV-07，当前系统侧栏可见性检查 |

| REQ-DE-21 / AC-DE-NAV-07 | `seed-data.ts` 菜单名称及定向回填停用项 | TC-DE-NAV-08、菜单 Seed 静态检查与数据库核对 |
| REQ-DE-22 / AC-DE-NAV-08 | `de-mail-processing` 菜单、Showcase 路由分发、`DigitalEmployeeScenarioPage` 邮件工作区 | TC-DE-NAV-09、路由和邮箱状态检查 |
| TASK-DE-NAV-08 | 用户来源归档、当前态规格、菜单 Seed、定向数据库回填、邮件工作区路由 | 来源/追溯核对、类型检查、数据库菜单核对 |

| REQ-DE-23 / AC-DE-NAV-09 | `DetailHeader` 可选返回控件；数字员工独立场景及邮件中心不传返回处理器 | TC-DE-NAV-10、Web 类型检查与页面交互核对 |
| TASK-DE-NAV-09 | `DetailWorkspace.tsx`、`DigitalEmployeeScenarioPage.tsx`、`MailAutomationCenter.tsx`、`ShowcaseApp.tsx` | 类型检查；浏览器验收待执行 |

| REQ-DE-24 / AC-DE-NAV-10 | `MailAutomationCenter.tsx`、`digital-employee.css`、DetailWorkspace/DetailTabs、SalesActionDialog | TC-DE-NAV-11、Web 类型检查与视觉检查 |
| TASK-DE-NAV-10 | 邮件计划/接口表单、规则与模板编辑弹窗统一项目控件和外框 | Web 类型检查；浏览器视觉验收待执行 |
| REQ-DE-OPINION-01 | `public-opinion.adapter.ts`、`matchOpinionItem`、主题与词库配置 | TC-DE-OPINION-01、服务单测 |
| REQ-DE-OPINION-02 | `PublicOpinionService.startRun/executeRun`、手工运行弹窗 | TC-DE-OPINION-02、页面回归测试 |
| REQ-DE-OPINION-03 | 五类来源适配器、加密凭据、SSRF 防护 | TC-DE-OPINION-03、适配器单测 |
| REQ-DE-OPINION-04 | 规则评分、`AiProvider.generateText` 与降级路径 | TC-DE-OPINION-04、服务单测与运行记录 |
| REQ-DE-OPINION-05 | 事件聚合、数字员工任务复用与任务动作接口 | TC-DE-OPINION-05、页面回归测试 |
| REQ-DE-OPINION-06 | `nextOpinionEventStatus`、事件动作接口与审计记录 | TC-DE-OPINION-06、状态机单测 |
| REQ-DE-OPINION-07 | `PublicOpinionCenter.tsx`、DetailTabs、DeclarativeDataGrid、CSV 导出 | TC-DE-OPINION-07、Web 组件测试 |
| REQ-DE-OPINION-08 | Prisma 五表、迁移和幂等演示数据初始化 | TC-DE-OPINION-08、迁移与真实 API 冒烟 |
| REQ-DE-OPINION-09 / REQ-STYLE-13 | `PublicOpinionCenter.tsx`、`public-opinion.css`、`RowActionButton.tsx` 与 `UI-ACTION-ICON-01` | TC-DE-OPINION-09、前端组件与语义图标测试 |

| REQ-DE-MARKET-01 | 场景路由和大宗商品监控四 Tab 工作区 | TC-DE-MARKET-01 |
| REQ-DE-MARKET-02/09 | 行情/汇率服务端适配器、凭据配置、调度与运行状态 | TC-DE-MARKET-01、02、09；供应商和许可核验 |
| REQ-DE-MARKET-03 | 监控商品及来源代码/基准/单位配置 | TC-DE-MARKET-02 |
| REQ-DE-MARKET-04/08 | 月行情/日汇率采集、每商品游标、运行记录、幂等与重试 | TC-DE-MARKET-03、04、05、09 |
| REQ-DE-MARKET-05/06 | 月价格/汇率快照及查询 API/列表 | TC-DE-MARKET-06、07 |
| REQ-DE-MARKET-07 | 月度价格趋势查询与走势图 | TC-DE-MARKET-08 |
| TASK-DE-MARKET-01 | 来源归档、当前态规格、方案、验收和追溯 | 文档链接与一致性检查 |
| TASK-DE-MARKET-02 | 数据责任、作用域、唯一性、迁移/恢复和表注册 | Architecture Gate、数据库约束/集成验证 |
| TASK-DE-MARKET-03 | 世界银行月度价格工作簿、Frankfurter 汇率和字段口径 | 官方目录及真实工作簿解析证据 |
| TASK-DE-MARKET-04 | 四 Tab、免 Key 来源/商品设置、月列表和走势图 | Web 类型检查与浏览器验收 |
| TASK-DE-MARKET-05 | 12 个月回补、每月续取、游标、失败重试和来源快照更新 | TC-DE-MARKET-03 至 09、数据库集成验证 |

| REQ-MAIL-ACTION-LAYOUT | UIRULE-20261009-mail-action-layout | AC-MAIL-ACTION-LAYOUT / TC-MAIL-ACTION-LAYOUT | MailAutomationCenter.tsx / common/row-actions.css | 用户授权UI局部变更；静态检查见交付记录，浏览器视觉待验收 |

复用候选：双行操作布局适用于最多6个密集行操作，需支持自动行高；业务动作、权限和邮件确认规则不属于通用布局。来源与接入/验收见UI-ACTION-LAYOUT-01；仅项目实现，尚无跨项目验证。
