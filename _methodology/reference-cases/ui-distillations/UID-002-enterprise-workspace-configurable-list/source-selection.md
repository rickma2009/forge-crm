# UID-002 来源选择记录

## 目标页面与能力

- 取消特殊底部管理区，所有菜单按同一树结构和排序规则展示；
- 内容区顶部保留全局工具栏，不包含全局搜索框；
- 菜单页面以路由多页签打开；
- 标准查询列表支持系统视图、个人视图、查询栏配置和默认视图；
- 本地数据字典支撑客户状态、类别、行业和等级等选项。

## 本轮选用来源

### 主来源

- 仓库：`_ref/gf_scm/`
- 提交：`3c8b69304d78c7bd01dd9627454fe8d496be8f07`
- 工作区：读取时存在未提交改动；本轮全程只读，结论同时绑定文件路径，不能仅凭提交 SHA 复现读取时全部字节。

| 文件 | 用途 |
|---|---|
| `packages/scs-web/src/components/Layout.tsx` | 顶部工具栏、导航区和 Tab/内容区组合 |
| `packages/scs-web/src/components/TabBar.tsx`、`src/lib/tab-store.ts` | URL 驱动页签、关闭/刷新/溢出与上限 |
| `packages/scs-web/src/components/ListPage/**`、`components/SearchForm/**` | 查询、表格、系统/个人视图和查询栏配置 |
| `packages/scs-web/src/pages/settings/resources/ResourceViewConfig.tsx` | 系统视图配置和用户视图只读目录 |
| `packages/scs-server/prisma/schema.prisma` | 系统视图、角色视图分配、个人视图和客户表结构 |
| `packages/scs-web/src/pages/opportunities/customers/**` | 客户列表、字段、查询和操作入口 |
| `packages/scs-server/src/modules/customer/**` | 客户分页查询、新增、编辑、详情和编号生成 |
| `packages/scs-web/src/pages/settings/dict/**`、`hooks/useDictManage.ts` | 字典类型树和字典项管理交互 |
| `packages/scs-server/src/modules/system/dict/**` | 字典消费、管理、缓存与历史的服务边界 |

### 用户指定在线页面

- URL：`https://scssit.gz.cvte.cn/opportunities/customers`
- 结果：浏览器能打开并取得标题“供服协同平台”，但后续 DOM 快照超时；本轮没有取得可复核的页面结构或截图证据。
- 处理：不宣称已完成在线视觉核验，源码和 Schema 继续作为主证据。

## 保留内容

- 工具栏的稳定槽位以及“预警/待办、消息、当前用户、退出”语义；
- URL 作为页签导航事实源、固定首页、相邻页签接续、刷新和批量关闭；
- 每个列表至少一个系统默认视图，个人视图只能在授权基线上收窄；
- 视图可保存列顺序/显隐/宽度/固定、查询栏显隐/折叠、默认过滤和分页大小；
- 字典“管理接口”和“业务消费接口”分离，变更可审计；
- 客户列表的服务端分页、过滤、排序以及新增/编辑/详情闭环。

## 排除内容

- 来源品牌、业务菜单、业务字段全集、路由编码和数据库 schema 名；
- 固定底部管理区；
- 顶栏全局搜索框和模拟登录横幅；
- 外部身份、组织、租户、OMS/SCRM、企业工商查询、黑名单和主数据平台；
- 数据字典的外部平台客户端、固定 `CSB_SCS` 根节点、缓存清理和 SQL 导出运维接口；
- 来源前端硬编码枚举和来源专属字典编码；
- 客户删除、员工主数据和数据范围权限。

## 冲突与未知

- 当前验证场 004 已批准并实现 `APPLICATION/SYSTEM_MANAGEMENT` 双区；新目标要求统一菜单，必须通过新 Business/Specification/Architecture Gate 和增量迁移处理。
- 预警和消息是否接真实数据源尚未批准；候选只定义扩展槽位。
- “点击昨天菜单”按语境推测为“点击左边菜单”，在业务评审中显式确认，不静默固化。
- 客户类别是否也由数据字典提供、客户编号生成规则、个人视图上限等仍需业务决定。
