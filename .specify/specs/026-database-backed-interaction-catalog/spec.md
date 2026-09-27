# Specification：数据库驱动的交互案例目录

状态：DESIGN APPROVED / WRITTEN SPEC REVIEW READY

来源：`REQSRC-079`

## 1. 目标与范围

将 `/showcase/style-scenes` 建设为登录后可访问的交互案例目录。页面运行时从 `style_scene` 表读取数据，采用“类型 → 分组”两级树和右侧案例列表；选择案例后，以覆盖当前目录工作区的详情页面展示完整定义及可运行演示，并通过全局标准返回箭头回到目录。

本规格包括：数据库迁移、初始化、查询与详情 API、前端目录和详情页面、旧本地页面退役、自动化与浏览器验证。不包括交互案例在线新增、在线编辑、删除、独立角色授权和新的业务工作流。

## 2. 核心需求

- REQ-026-01：`/showcase/style-scenes` 登录后始终可见，不调用页面级权限断言；用户仍必须具备目标系统登录和导航访问资格。
- REQ-026-02：运行时案例数据只从数据库读取，不再从前端 `interaction-index.data.json` 直接渲染。
- REQ-026-03：左侧树固定为两级：一级为类型，二级为该类型下的分组；节点显示名称及记录数量。
- REQ-026-04：顶部查询区复用 `RecordQueryBar`，提供关键词、类型、分组、成熟度条件以及重置、查询操作。
- REQ-026-05：右侧列表至少显示序号、案例编码、案例名称、类型、分组、成熟度、当前状态；案例编码是详情入口。
- REQ-026-06：选择案例后，以详情页面替换查询区、分类树和列表，不使用抽屉或弹窗；详情页复用 `DetailWorkspace`、`DetailHeader`、`DetailBackButton`。
- REQ-026-07：详情展示案例定义、定义来源、产物、证据、证据卡、下一步证据及确定性的本地交互演示。
- REQ-026-08：返回目录时恢复本次组件生命周期内的关键词、查询条件、选中树节点和列表页码。
- REQ-026-09：旧 `/showcase/interaction-index` 继续规范化到 `/showcase/style-scenes`；原独立页面壳层、抽屉入口和本地运行时数据读取全部退役。
- REQ-026-10：原 `style_scene` 历史数据不删除；未具备交互资产扩展字段的历史记录仍可作为普通场景显示。

## 3. 数据模型

继续使用 `style_scene`，保留现有字段并恢复其有效业务用途：

| 字段 | 用途 |
|---|---|
| `category` | 交互资产类型，例如 `PAGE`、`ACT`、`VIEW` |
| `sub_category` | 类型下的分组 |
| `scene_name` | 案例名称 |
| `description` | 列表摘要；初始化时由定义数组拼接 |
| `status` | 场景记录状态，独立于成熟度 |
| `page_path` | 可选演示地址 |
| `note` | 普通备注 |
| `sort_no` | 类型、分组内显示顺序 |

新增字段：

| 字段 | 类型 | 规则 |
|---|---|---|
| `asset_code` | `varchar(32)` nullable | 交互资产稳定编码；初始化资产必填 |
| `maturity` | `varchar(32)` nullable | 成熟度原值 |
| `definition_json` | `jsonb` nullable | 字符串数组 |
| `definition_ref_json` | `jsonb` nullable | `{path, section}` |
| `artifacts_json` | `jsonb` nullable | 产物引用数组 |
| `evidence_json` | `jsonb` nullable | 证据引用数组 |
| `evidence_cards_json` | `jsonb` nullable | 证据卡数组 |
| `next_evidence` | `varchar(500)` nullable | 下一步证据说明 |

增加唯一索引 `style_scene_asset_uk(system_code, asset_code)`。PostgreSQL 允许历史记录的 `asset_code` 为 NULL，因此不会破坏已有数据。所有新增名称均为小写且不超过 32 个字符。

`status` 与 `maturity` 不混用。初始化登记册记录默认 `status=DONE`，成熟度按登记册原值保存；历史普通场景继续保留原状态。

## 4. 初始化与数据来源

权威初始化来源为 `_methodology/patterns/index.json`。数据库 seed 读取并验证该文件，将 103 条资产按以下规则幂等写入：

- 唯一键：`system_code + asset_code`。
- `kind → category`，`group → sub_category`，`name → scene_name`。
- `definition.join('；') → description`，完整数组同时写入 `definition_json`。
- 其余定义来源、产物、证据和证据卡分别写入对应 JSON 字段。
- 已存在同编码资产时更新登记册管理的字段，不改变数据库主键。
- 不删除登记册已不存在的记录；需要废弃时由成熟度 `deprecated` 明确表达。
- 初始化不得覆盖没有 `asset_code` 的历史普通场景。

前端投影文件可继续由方法论同步脚本生成用于校验，但页面代码不得导入它作为运行时数据源。

## 5. API 设计

### 5.1 分类树

`GET /api/systems/:systemCode/style-scenes/taxonomy`

返回每个类型及其分组、记录数；服务端按 `category`、`sub_category` 聚合，不受列表分页影响。仅要求有效登录和目标系统访问资格。

### 5.2 列表

`GET /api/systems/:systemCode/style-scenes`

查询参数：`page`、`pageSize`、`keyword`、`category`、`subCategory`、`maturity`、`status`。

列表只返回摘要字段，不返回大型 JSON 明细。关键词匹配 `asset_code`、`scene_name`、`description`。排序为 `sort_no`、`asset_code`、`created_at`。

### 5.3 详情

`GET /api/systems/:systemCode/style-scenes/:id`

返回单条完整结构化明细。记录不存在或不属于当前系统时返回 404。JSON 字段必须经过 contracts schema 校验，非法历史 JSON 返回可诊断的服务错误，不把原始数据库异常暴露给页面。

原 POST/PATCH 接口保持兼容，但本次新页面不暴露维护入口；后续如恢复维护能力，再单独定义权限和表单规格。

## 6. 页面与交互设计

### 6.1 目录态

- 页面根容器沿用企业页面间距和全局字体。
- 查询区使用 `RecordQueryBar`，默认单行显示常用条件。
- 主工作区使用 `TreeWorkspace`，左侧标题为“交互案例分类”。
- 树节点 ID 使用前端命名空间，例如 `type:PAGE`、`group:PAGE:系统与任务入口类`，不把显示名称当数据库主键。
- 选择类型节点时按 `category` 过滤；选择分组节点时同时按 `category + subCategory` 过滤；工具区提供“全部分类”。
- 右侧使用统一企业表格，空态、加载态、错误及重试均在对应区域显示。
- 不提供新增、修改、删除按钮。

### 6.2 详情态

- 点击案例编码加载详情；加载成功后，详情替换整个目录态内容。
- 顶部使用 `DetailHeader`：标题为案例名称，状态区域显示成熟度，摘要显示案例编码、类型和分组。
- 返回按钮使用 `DetailBackButton`，标签为“返回交互案例目录”。
- 内容按“案例定义、来源与产物、验证证据、交互演示”分区，不使用抽屉。
- 交互演示保持纯前端确定性，不调用业务写接口；重置只重置当前演示状态。
- 返回时不重新创建目录状态；筛选条件、树选择及当前页保持不变。

## 7. 路由与退役规则

- 正式入口保持 `/showcase/style-scenes`。
- `/showcase/interaction-index` 只作为旧书签兼容入口，进入时替换为正式地址。
- `InteractionIndexShell`、旧抽屉页面适配和运行时本地索引读取标记退役并从应用入口移除。
- 方法论源文件和生成脚本不删除，因为它们仍是数据库初始化及一致性校验来源。

## 8. 错误与边界

- 分类树失败：左侧显示重试，不伪造分类。
- 列表失败：右侧显示错误和重试，保留查询条件及树选择。
- 详情失败：保留详情框架、显示错误和返回按钮，不自动退回列表。
- 历史记录无 `asset_code` 时显示“—”，仍允许进入详情。
- 历史记录 JSON 为空时以空数组或“暂无”展示。
- 类型存在但分组为空时，类型节点仍可选择，该记录不生成二级分组节点。
- 查询、树选择和分页任一变化都取消先前未完成请求或忽略过期响应。

## 9. 验收标准

- AC-026-01：admin 和 viewer 登录后均能看到并访问“交互案例索引”，且不产生该页面的权限断言请求。
- AC-026-02：断开数据库或场景接口后页面不得回退显示本地 JSON 数据。
- AC-026-03：树中一级节点为类型、二级节点为分组，选择节点后列表结果全部符合该分类。
- AC-026-04：查询区视觉和交互与物料产品管理一致，重置恢复全部条件和分类选择。
- AC-026-05：案例编码打开覆盖式详情；页面中不存在 `role=dialog` 的案例抽屉。
- AC-026-06：详情返回箭头符合 `UI-BACK-01`，返回后目录状态保持。
- AC-026-07：103 条方法论资产通过幂等 seed 写入，重复执行不产生重复记录。
- AC-026-08：原历史场景记录、主键和数据不被迁移删除。
- AC-026-09：旧地址重载后地址栏为 `/showcase/style-scenes`。

## 10. 测试策略

- Contracts：列表摘要、分类树、详情 JSON 的正常与非法载荷。
- Migration：新增字段、唯一索引、历史 NULL 记录兼容。
- Seed：103 条映射、重复执行幂等、历史记录不覆盖。
- Server：关键词及组合筛选、分类聚合、详情系统隔离、404、登录要求。
- Web：树节点构造、查询/重置、过期响应、列表到详情、标准返回、状态恢复、错误重试、无抽屉。
- Portal：viewer 登录可见、无页面权限断言、旧地址规范化。
- Browser QA：桌面首屏、树滚动、表格横向空间、详情返回、控制台错误和框架覆盖层。

## 11. 非目标与发布约束

- 不实现在线维护分类和交互案例内容。
- 不把类型或分组迁移为数据字典。
- 不删除旧表、历史数据、方法论生成源。
- 不改变其他菜单的角色权限规则。
- 数据库迁移必须先执行，再运行 seed 和启动新服务；旧后端构建不能与新 contracts/schema 混用。
