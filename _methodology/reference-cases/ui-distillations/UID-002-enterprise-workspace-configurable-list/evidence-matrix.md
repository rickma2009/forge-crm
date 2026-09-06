# UID-002 证据矩阵

| 判断 | 类型 | 证据 | 置信度 | 缺口/处理 |
|---|---|---|---|---|
| 来源壳层把顶栏放在内容区上方并常驻 | F | `Layout.tsx:415-443` | 高 | 目标移除其中搜索框 |
| 顶栏已有待办、消息、用户和退出入口 | F | `Layout.tsx:426-441` | 高 | 计数和数据源未萃取为通用能力 |
| 来源导航把系统管理拆到底部 | F | `Layout.tsx:397-412` | 高 | 用户明确要求目标不采用，作为反例保留 |
| 页签以 URL 为事实源，点击页签执行路由跳转 | F | `TabBar.tsx:8-16,27-31`、`tab-store.ts:8-15` | 高 | 无 |
| 首页不可关闭，支持刷新、关闭当前/其他/右侧/全部和新窗口 | F | `TabBar.tsx:64-145` | 高 | 新窗口是否纳入 MVP 待 Spec |
| 页签溢出支持左右按钮、滚轮和方向键 | F | `TabBar.tsx:40-62,148-212` | 高 | 可访问性仍需目标实现测试 |
| 页签上限为 12，超限阻止新开而不自动丢页 | F | `tab-store.ts:72-75,134-141` | 高 | 上限是否沿用待业务批准 |
| 标准列表把查询、工具栏、表格、分页和视图设置组合为声明式页面 | F/I | `ListPage/ListPage.tsx` 文件注释及组件参数 | 高 | 目标不复制具体框架内部实现 |
| 系统视图是只读基线，个人视图可另存但不能突破授权字段 | F | `authorization-view-runtime.ts:31-70,91-137` | 高 | 目标首期不实现字段权限，但保留收窄原则 |
| 视图保存列、查询条件树和分页大小 | F | `ColumnViewSettings.tsx:23-56,118-173` | 高 | 目标字段模型待 Architecture Gate |
| 系统视图绑定资源、页面、操作，并可由角色分配 | F | `schema.prisma:3310-3360`、使用指南“核心表”章节 | 高 | 目标可简化资源目录，但不能丢失作用域 |
| 当前视图解析顺序包含上次选择、用户默认、系统默认和首个可用视图 | F | `协同平台前端视图配置开发与使用指南.md` 的“默认视图解析” | 高 | 目标需形成自动测试 |
| 客户列表已有服务端分页、多条件筛选和排序 | F | `customer.service.ts:137-220`、`query-customer.dto.ts` | 高 | 目标只保留用户指定字段 |
| 来源客户编号由服务端按月生成 | F | `customer.service.ts:117-135` | 高 | 生成格式需目标业务批准 |
| 来源客户域支持新增、编辑、详情，没有客户删除接口 | F | `customer.controller.ts:42-112` | 高 | 首版建议不增加删除 |
| 来源字典管理提供类型树、字典项 CRUD、排序、启停与历史 | F | `pages/settings/dict/**`、`dict-manage.service.ts` | 高 | 数据实际来自外部平台，不可直接迁移 |
| 来源字典服务不是本地数据库事实源 | F | `dict.service.ts`、`dict-manage.service.ts` 注入 `TzcDictClient*` | 高 | 目标需要独立本地表和迁移 |
| 在线客户页已完成视觉核验 | U | 浏览器 DOM 快照超时 | 低 | 不作该结论，后续可补证据 |
| 查询区由统一 `SearchForm` 声明式渲染，默认首屏最多 3 个字段，其余进入带数量的“更多” | F | `components/SearchForm/SearchForm.tsx`、`search-layout.ts`、《协同平台前端视图配置开发与使用指南》5.2 | 高 | 复用交互契约，不复制 Ant Design 实现 |
| 查询字段的首屏/折叠状态由 `queryVisible` 与 `queryCollapsed` 分别控制 | F | `components/SearchForm/types.ts`、`SearchForm.tsx`、使用指南 5.2 | 高 | 目标视图配置已具备对应字段 |
| 当前视图选择与设置入口由统一 `ColumnViewSettings` 组合，系统视图只读且可另存个人视图 | F | `components/ListPage/ColumnViewSettings.tsx` | 高 | 目标首版保留列显示、查询显示、折叠三个配置维度 |
| 来源头像组件仅负责头像渲染，不负责用户名截断与会话菜单 | F | `components/Avatar.tsx`；`components/Layout.tsx` 用户入口 | 高 | 目标账号槽位由壳层负责，限制为 5 个汉字宽度 |
