# AGENTS.md

> 本文件是所有 AI 助手的项目执行入口；保持短小，只做路由和稳定约束。

## 项目

- 名称：{{project_name}}
- 目标：{{project_goal}}
- 技术概览：{{technology_summary}}

## 开始工作前

1. 检查并保留已有未提交改动。
2. 阅读 `.specify/memory/project-charter.md` 与 `.specify/memory/constitution.md`。
3. 阅读当前功能目录中的 spec、testcases、plan、tasks 和 traceability。
4. 未通过对应人工 Gate 时不得推进下一阶段。

若项目章程明确追求跨项目复用或团队培训，每个切片完成时记录来源、可复用与不可复用部分、验证证据和候选回流位置；培训材料提供可复现任务与已知限制。未声明该目标的项目不被强制抽象，也不得把单项目测试通过称为通用最佳实践。

## Skills 路由

- 优先使用工作台已初始化的 `sdd-forge-workflow`，不在项目内复制通用 SDD Skill。
- 按 `_methodology/07-Skills初始化与使用规范.md` 在对应阶段调用条件 Skill。
- 只有项目独有、会重复使用且有测试场景的能力才创建项目专属 Skill。
- 外部 Skill 不得覆盖项目 Spec、宪法或人工 Gate 决策。

## 执行规则

- 列表遵循 `UI-LIST-VIEW-01`：单据与关键业务对象菜单入口为“查询区 → 新增/视图选择/设置工具栏 → 网格与分页”；每个对象独立配置视图，当前用户有效个人引用优先，否则使用可访问的系统默认视图。每次设计明确是否有视图设置、对象标识、配置范围、权限与失效回退；不提供时记录理由。完整规范见工作台 `_methodology/style-index.md`。

- 按钮遵循工作台 `_methodology/style-index.md` 的 `UI-BUTTON-01`：默认最小高度 32px、字号 12px、圆角 5px、边框 1px、左右内边距 11px；行操作图标按钮 28 × 28px / 图标 16px，工具栏图标按钮 32 × 32px。统一主次/危险与 hover/focus/disabled/loading 状态，触控点击区域至少 44 × 44px。

- 页面设计遵循工作台 `_methodology/style-index.md` 的 `UI-LIST-01`：列表行编辑、删除、审核等使用带中文提示和可访问名称的图标按钮；操作列不提供“查看”按钮或图标，以本行业务编码、名称或单号链接进入详情。无查看权限时显示普通文本；页面级按钮不受此限制。

- 表格遵循 `UI-BUSINESS-GRID-01`：默认数据行32px、内容上下居中；序号首列，有行操作时操作第二列，其后优先业务编码或单号。修改、删除、审核使用统一行图标；标识可进入详情时使用一致的链接与悬停样式。普通列单行省略，明确的完整文本或复合字段按列换行并自动增高。选择、授权矩阵等特例须在页面 Spec 说明。

- 只实施已批准范围，业务语义变化必须回到 Spec Gate。
- 架构、数据或安全边界变化必须回到 Architecture Gate。
- 修改后执行项目规定的最小充分校验并报告真实结果。
- 不虚构测试、批准、发布或外部系统状态。
- 未经明确授权，不部署、不写生产数据、不发送外部消息。
- 机密只从受控环境注入，不写入代码、文档和日志。
- 新增或修改持久化数据前，阅读并符合 `_methodology/11-数据库设计与数据分层规范.md`；适用 PostgreSQL/Prisma Profile 时同时遵循其 `database-conventions.md`。
- 数据 Plan 必须说明数据层级、唯一责任模块、作用域隔离、迁移恢复和数据库测试；多系统共享不等于多系统直接写表。
- 新表按所有权使用 `sys_`、`org_`、`md_`、`sd_`、`scm_`、`rd_`、`fin_` 等批准前缀；所有物理表名和字段名必须为小写 `snake_case` 且不超过 32 个字符。

## 需求变更回写

- 新增、修改或补充需求逻辑时，先在 `.specify/sources/` 追加不可改写来源，再同步更新受影响的业务需求或功能切片 `requirements/original.md`、`spec.md`。
- 当前态需求文档必须整合历次有效变更；仅保存增量说明、聊天记录或 Tasks 不算完成。
- 行为变化同步更新需求 ID、验收标准、测试用例、追溯矩阵与 Gate 状态。
- 完成标准：新来源已归档，完整当前态需求已回写，替代/废弃/待确认内容已标明，追溯和 Gate 状态一致。

## 常用入口

- 安装：`{{install_command}}`
- 开发：`{{dev_command}}`
- 校验：`{{verify_command}}`
- SDD 检查：`{{sdd_check_command}}`

## 进一步上下文

- 项目章程：`.specify/memory/project-charter.md`
- 业务上下文：`.specify/memory/business-context.md`
- 项目宪法：`.specify/memory/constitution.md`
- 功能规格：`.specify/specs/`
- 架构决策：`docs/adr/`
- 数据库规范：`_methodology/11-数据库设计与数据分层规范.md`

## 树节点与路由页签补充约束

页面设计同时遵循全局样式入口的 `UI-TREE-01` 与 `UI-TAB-01`：可维护树节点必须提供右键和右侧省略号两个一致的操作入口，按已有权限展示新增、编辑、删除/停用、增加子节点；内置节点保护、删除确认、只读树例外必须保留。顶部路由页签复用公共状态与菜单，支持刷新当前、关闭当前/其他/右侧/全部、新窗口打开，保护固定首页及未保存内容。菜单支持键盘、外部关闭和可视区域定位。业务列表 `UI-LIST-VIEW-01` 必须落实实际页面和持久化个人视图，不能只完成文档或增加无效设置按钮。

## 详情工作区统一约束

遵循总样式索引 `UI-DETAIL-01`：第一行返回箭头+名称/单号+可选状态/操作；第二行只读“字段名：字段值”。Tab采用客户详情下划线样式，与标题、正文同属一个白色容器；内部不再套卡片，使用标题、留白或分隔线。可调用 `DetailWorkspace / DetailHeader / DetailTabs / DetailPanel / DetailSection`，保留权限与未保存离开保护。无Tab不强加，窄屏允许换行及Tab横向滚动。验收客户、商机、报价及键盘返回/Tab切换，不以静态规则检查替代浏览器验证。

列表“当前视图/下拉框/设置”遵循 UI-VIEW-CONTROL-01，共用ListViewSelector，三段32px外框对齐（触控44px），不得受输入框34px默认最小高度影响。


- UI-TREE-WORKSPACE-01：左树右详情统一调用 TreeWorkspace，搜索/展开工具/新增、紧凑无图标与徽标节点、省略号业务菜单、总数/宽度滑条、中点收放箭头均由组件提供。权限与业务操作由调用方传参；只读树不新增写能力，授权勾选树/导航为专项例外。完整参数与验收见总样式规范及 common/TreeWorkspace.md。


- UI-DOCUMENT-01 / UI-BACK-01：单据详情默认无内容Tab，主表上/明细下；查看时隐藏明细新增及操作列，状态与权限允许才进入编辑，编辑变保存，失败保留输入。共用DocumentWorkspace/DetailSection；页面返回统一DetailBackButton（客户同款），保留离开保护。字段口径、例外与验收见总样式规范。
