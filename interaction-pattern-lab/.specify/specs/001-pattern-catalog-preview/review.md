# 实现评审：模式目录与交互预览

> 功能编号：001-pattern-catalog-preview  
> 评审时间：2026-08-30  
> 结论：实现证据齐备，允许提交 Release Gate 评审；未批准部署。

## 1. 范围与 Gate

- Business Gate：approved（`REQSRC-002`）；
- Specification Gate：approved（`REQSRC-003`）；
- Architecture Gate：approved（`REQSRC-004`）；
- 实现保持首片边界：静态单包、两个 `validated-once` 模式、无后端/数据库/登录/在线编辑/生产接口；
- Release Gate：not-started。本评审不代表已发布或可直接投入生产。

## 2. 需求追溯视角

| 检查 | 结果 | 证据 |
|---|---|---|
| 两个模式目录、分类、编号、状态 | pass | Pattern Catalog 6 tests；来源投影检查 |
| 搜索、无结果、清空和非法地址回退 | pass | App/Catalog tests；浏览器 URL |
| 原型、说明、模式头同一上下文 | pass | App tests；浏览器交替选择 |
| 导航案例声明交互 | pass | Adapter test；桌面浏览器路径 |
| 记录工作区声明交互 | pass | Adapter test；桌面/窄屏浏览器路径 |
| 说明、边界、风险、来源和真实状态 | pass | 投影 Schema 检查；说明页浏览器验收 |
| 重置、切换和刷新不保留案例状态 | pass | App test；浏览器重置/刷新；storage 空 |
| 原型失败隔离和重试 | pass | DemoBoundary test；说明/目录位于 Boundary 外 |

结论：`REQ/NFR → FR → AC → TC → TASK` 无断链，详细映射见 `traceability.md`。

## 3. 代码与安全视角

- `pnpm verify` 真实通过：来源指纹、ESLint、TypeScript、5 个测试文件 / 13 个测试、Vite 生产构建；
- 源码检索未发现 `fetch`、XHR、WebSocket、localStorage 或 sessionStorage 调用；唯一 URL 字符串是内联 favicon 的 SVG namespace；
- Demo 使用 PAT 编号与“示例记录”占位，不含 MCRM 客户、销售角色、认证、业务接口或真实组织字段；
- 方法论内容以带 SHA-256 的只读展示投影接入，来源漂移会令校验失败；
- Demo Adapter 懒加载且由错误边界隔离；工作台用重新挂载实现统一重置；
- 依赖锁定在 `pnpm-lock.yaml`，运行时无第三方脚本或远程字体。

未发现 P0/P1 安全或数据问题。

## 4. 集成与浏览器视角

### 自动化与构建

- Node：`v24.16.0`；pnpm：`9.15.0`；
- `pnpm verify`：pass；
- 根工作台 `bash _methodology/scripts/verify-workbench.sh`：pass；
- 构建：41 modules；主入口 197.56 kB / gzip 63.77 kB；两个 Demo 分别独立为 3.95 kB 和 5.31 kB chunk；
- 控制台：无 error、无 warning；开发环境只有 Vite debug 与 React DevTools info；
- 网络：全新 session 只有 `127.0.0.1:5173` 文档、模块和静态资源 GET；
- 存储：`No storage entries`。

### 真实交互

- 桌面 1440×1000：目录、导航 Demo、记录 Demo、说明、URL、重置均通过；
- 窄屏 390×844：目录抽屉、Escape、焦点返回、原型/说明和横向表格访问均通过；
- 键盘：首次 Tab 聚焦“搜索交互模式”，主要控件具有可访问名称和可见焦点；
- 截图：`evidence/desktop-record-workspace.png`、`evidence/mobile-record-workspace.png`。

### 评审中修复

1. 窄屏关闭目录最初仍存在于 accessibility tree；已使用 `inert`、`aria-hidden`，并补打开聚焦、Escape 关闭和焦点返回，复验通过。
2. 初次开发加载出现 favicon 404；已改为内联本地图形，新 session 无 404。
3. 390px 下“新建记录”发生非必要换行；已设为不换行并重新截图。

## 5. 已知边界

- 原型失败路径通过组件测试验证，未在最终浏览器 session 注入故障；
- 本切片没有服务端、真实权限、真实查询、保存或发布能力；
- 两个模式仍为 `validated-once`，本 Demo 的再次实现不能替代第二个真实业务项目验证；
- 未执行部署、生产演练、外部可用性或 Release Gate。

## 6. 允许与禁止

Release Gate 已于 2026-08-30 获得用户批准（`REQSRC-005`）。当前生产构建已作为本机只读预览打开；外部私有托管因当前会话没有可用 Sites 连接器而待执行。

允许：在本机预览评审页面，待私有托管能力可用后发布同一已验证构建，或继续按新来源新增下一切片的详细需求与 Specification Gate。

禁止：把当前状态描述为已发布、接入真实业务、具备生产授权，或把两个模式直接称为跨项目最佳实践。

## 7. `REQSRC-006` 平台导航增量评审

- 用户指出工作台左侧未复用“企业双层导航壳层”，并明确要求修改；原始反馈和截图已归档为 `REQSRC-006`。
- 变更只涉及 PAGE-001 的信息架构和交互表现：平台改用深色导轨，一级为实际分类、二级为模式页面；未新增空分类，也未改变后端、数据、角色或系统边界。
- 按 test-first 新增平台导航集成测试，先观察旧结构失败；实现后 5 个测试文件 / 14 个测试、类型检查和生产构建通过。
- 全量工作台并行验证暴露测试进程启动抖动；将交互平台 Vitest 改为文件串行、单用例 10 秒上限后，项目 `pnpm verify` 与根工作台全量校验均稳定通过，不改变生产运行逻辑。
- 桌面 1440×1000 验证分类展开、二级切换、URL 与整体收起；窄屏 390×844 验证抽屉、遮罩、Escape 与焦点恢复；控制台和页面错误为空。
- 截图：`evidence/desktop-platform-navigation-v2.png`、`evidence/mobile-platform-navigation-v2.png`。

结论：增量 Specification Gate 证据为 `REQSRC-006`，Architecture Gate 不需重开；原 Release 授权范围内的本地只读 Demo 已完成重新构建与回归，可继续用于本机评审，外部私有托管仍待可用连接器。
