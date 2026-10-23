# AGENTS.md

> {{project_name}} 的 AI 执行入口。

## 当前状态

- 当前为治理初始化阶段。
- `.specify/` 是批准后的业务和功能规格唯一事实源。
- Business、Specification、Architecture、Release Gate 均须由人类明确批准。

## 开始工作前

1. 检查并保留已有改动。
2. 阅读 `.specify/project-state.json`、`.specify/memory/project-charter.md` 和 `.specify/memory/constitution.md`，按本项目目标评估方案。
3. 新输入先追加归档到 `.specify/sources/`，再转换为业务需求。
4. 未通过对应 Gate 时只允许研究、澄清和获授权的原型，不得实现或发布。

若项目章程明确追求跨项目复用或团队培训，每个切片完成时记录来源、可复用与不可复用部分、验证证据和候选回流位置；培训材料提供可复现任务与已知限制。未声明该目标的项目不被强制抽象，也不得把单项目测试通过称为通用最佳实践。

## 执行边界

- 列表遵循 `UI-LIST-VIEW-01`：单据与关键业务对象菜单入口为“查询区 → 新增/视图选择/设置工具栏 → 网格与分页”；每个对象独立配置视图，当前用户有效个人引用优先，否则使用可访问的系统默认视图。每次设计明确是否有视图设置、对象标识、配置范围、权限与失效回退；不提供时记录理由。完整规范见工作台 `_methodology/style-index.md`，独立项目仍遵循本条规则。

- 按钮遵循工作台 `_methodology/style-index.md` 的 `UI-BUTTON-01`：默认最小高度 32px、字号 12px、圆角 5px、边框 1px、左右内边距 11px；行操作图标按钮 28 × 28px / 图标 16px，工具栏图标按钮 32 × 32px。统一主次/危险与 hover/focus/disabled/loading 状态，触控点击区域至少 44 × 44px。独立项目没有工作台文件时，仍遵循此条默认值。

- 页面设计遵循工作台 `_methodology/style-index.md` 的 `UI-LIST-01`：列表行编辑、删除、审核等使用带中文提示和可访问名称的图标按钮；操作列不提供“查看”按钮或图标，以本行业务编码、名称或单号链接进入详情。无查看权限时显示普通文本；页面级按钮不受此限制。独立项目没有工作台文件时，此条内嵌规则仍有效。

- 禁止创建 `_spec/` 或第二份业务 Spec。
- 外部 Skill 只提供执行方法，不覆盖本项目事实源、宪法或 Gate。
- 不虚构测试、批准、部署或外部状态。
- 未经明确授权，不部署、不写生产数据、不执行破坏性操作。
- 只有项目独有、重复、可测试且无敏感配置的能力才成为项目本地 Skill。
- 新增或修改持久化数据前，必须符合工作台 `_methodology/11-数据库设计与数据分层规范.md`；采用 PostgreSQL/Prisma Profile 时同时遵循对应 `database-conventions.md`。
- 数据 Plan 必须明确数据层级、唯一责任模块、作用域隔离、迁移恢复和数据库测试；多系统共享数据禁止无责任边界地共同直写。
- 新表按所有权使用 `sys_`、`org_`、`md_`、`sd_`、`scm_`、`rd_`、`fin_` 等批准前缀；所有物理表名和字段名必须为小写 `snake_case` 且不超过 32 个字符。

## 需求变更回写

- 新增、修改或补充需求逻辑时，先在 `.specify/sources/` 追加不可改写来源，再同步更新受影响的业务需求或功能切片 `requirements/original.md`、`spec.md`。
- 当前态需求文档必须整合历次有效变更；仅保存增量说明、聊天记录或 Tasks 不算完成。
- 行为变化同步更新需求 ID、验收标准、测试用例、追溯矩阵与 Gate 状态。
- 完成标准：新来源已归档，完整当前态需求已回写，替代/废弃/待确认内容已标明，追溯和 Gate 状态一致。

## Agent skills

### Issue tracker

协作票据使用适配后的本地 `.scratch/`；`.specify/` 是批准规格唯一事实源。见 `docs/agents/issue-tracker.md`。

### Triage labels

使用 Matt 默认五状态词汇；`ready-for-agent` 仍受 SDD Gate 和 Definition of Ready 约束。见 `docs/agents/triage-labels.md`。

### Domain docs

采用单上下文薄词汇索引；完整业务事实位于 `.specify/memory/business-context.md`。见 `docs/agents/domain.md`。

## 树节点与路由页签补充约束

页面设计同时遵循全局样式入口的 `UI-TREE-01` 与 `UI-TAB-01`：可维护树节点必须提供右键和右侧省略号两个一致的操作入口，按已有权限展示新增、编辑、删除/停用、增加子节点；内置节点保护、删除确认、只读树例外必须保留。顶部路由页签复用公共状态与菜单，支持刷新当前、关闭当前/其他/右侧/全部、新窗口打开，保护固定首页及未保存内容。菜单支持键盘、外部关闭和可视区域定位。业务列表 `UI-LIST-VIEW-01` 必须落实实际页面和持久化个人视图，不能只完成文档或增加无效设置按钮。

## 详情工作区统一约束

遵循总样式索引 `UI-DETAIL-01`：第一行返回箭头+名称/单号+可选状态/操作；第二行只读“字段名：字段值”。Tab采用客户详情下划线样式，与标题、正文同属一个白色容器；内部不再套卡片，使用标题、留白或分隔线。可调用 `DetailWorkspace / DetailHeader / DetailTabs / DetailPanel / DetailSection`，保留权限与未保存离开保护。无Tab不强加，窄屏允许换行及Tab横向滚动。验收客户、商机、报价及键盘返回/Tab切换，不以静态规则检查替代浏览器验证。

列表“当前视图/下拉框/设置”遵循 UI-VIEW-CONTROL-01，共用ListViewSelector，三段32px外框对齐（触控44px），不得受输入框34px默认最小高度影响。


- UI-TREE-WORKSPACE-01：左树右详情统一调用 TreeWorkspace，搜索/展开工具/新增、紧凑无图标与徽标节点、省略号业务菜单、总数/宽度滑条、中点收放箭头均由组件提供。权限与业务操作由调用方传参；只读树不新增写能力，授权勾选树/导航为专项例外。完整参数与验收见总样式规范及 common/TreeWorkspace.md。


- UI-DOCUMENT-01 / UI-BACK-01：单据详情默认无内容Tab，主表上/明细下；查看时隐藏明细新增及操作列，状态与权限允许才进入编辑，编辑变保存，失败保留输入。共用DocumentWorkspace/DetailSection；页面返回统一DetailBackButton（客户同款），保留离开保护。字段口径、例外与验收见总样式规范。
