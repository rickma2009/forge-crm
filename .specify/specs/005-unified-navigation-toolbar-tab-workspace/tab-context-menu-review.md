# 公共页签菜单增量评审（2026-09-21）

来源与授权见 `tab-context-menu-increment.md`。本次只修改公共页签模块、ShowcaseApp 外壳及其测试、移除旧页签样式，并新增来源归档与复用文档。supply 保持只读；没有提交、发布或修改其他切片 Gate。

## 需求与实现

REQ-TAB-01—05 对应 `packages/web/src/common/route-tabs/` 和 `ShowcaseApp.tsx`。公共纯函数、React hook、UI 组件分层，宿主负责 URL/授权/内容；六项操作及固定页保护已实现。参考代码的后台页签“关闭右侧”导航遗漏由返回目标地址的方式修正。

## 验证证据

- TC-TAB-01—03：`pnpm --filter @interaction-pattern-lab/web test -- src/common/route-tabs src/showcase/ShowcaseApp.test.tsx`，最终 3 文件、23 测试通过（11 外壳、3 菜单、9 状态规则）。
- 本次改动的 TS/TSX：`pnpm --filter @interaction-pattern-lab/web exec eslint src/common/route-tabs src/showcase/ShowcaseApp.tsx src/showcase/ShowcaseApp.test.tsx`，通过。
- `check-sdd.sh .../005-unified-navigation-toolbar-tab-workspace full`，通过；它校验既有切片文档和 Gate 结构，不代表未覆盖行为已经验收。
- 修复本次测试查询参数后，项目 typecheck 仍失败于本次未修改的 CustomerDetailPage.tsx（隐式 any）、EnterprisePages.test.tsx（过期 customer 属性）、gateway.ts（缺少详情/联系人/地址接口实现）。本次页签文件未再报告类型错误。
- 项目 lint 失败于未修改的客户详情与 gateway 文件中的未使用声明。完整 build 已尝试但被类型检查阻断；不能声称项目整体可构建。
- `bash _methodology/scripts/verify-all.sh` 在根 CONTEXT.md 与 CONTEXT-MAP.md 并存检查处失败，后续未执行；未改写用户现有目录迁移。

## 安全与集成边界

浏览器核对：本地 5199 预览中从资源目录进入用户管理，在后台资源目录页签用 Shift+F10 打开六项菜单，截图确认菜单未被页签滚动区裁剪且与现有界面协调；截图归档于 `evidence/common-route-tabs/context-menu.png`。右键事件和键盘退出行为另有组件测试覆盖。

随后使用真实鼠标右键在后台“用户管理”页签打开菜单，当前页面为其右侧“资源目录”。点击“关闭右侧”后，浏览器 URL 返回 `#/showcase/system/users`，页签列表仅余概览与用户管理，内容标题也恢复用户管理。该浏览器路径通过。

授权成功且路径匹配后才登记新页签；页面和后端鉴权保留。窗口链接由可信宿主生成，保留完整应用位置及查询参数，使用 noopener/noreferrer。菜单通过 React 文本输出，不引入 HTML 注入。事件监听随菜单关闭/组件卸载清理。

复用资产与接入模板见 `packages/web/src/common/route-tabs/README.md`。本次未增加 KeepAlive、12 页限制、未保存草稿拦截；前两项在旧规格中有描述但当前壳存在实现差距，不能将本次菜单测试解释为整个旧规格重新通过。涉及编辑草稿的项目需先补保护策略。

当前允许本地体验、继续修复独立的项目基线问题和追加验收；不据此声明全量 Gate 或生产发布通过。没有跨项目业务验证证据，公共模块仍按候选资产记录。
