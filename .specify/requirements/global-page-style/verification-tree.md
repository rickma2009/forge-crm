# 统一树形工作区验证（2026-09-24）

来源：`.specify/sources/2026-09-24-tree-workspace/original.md` 与三张归档截图。当前需求：requirement.md 的 REQ-TREE-WORKSPACE-01 / NFR-TREE-01 / AC-TREE-01。实现：common/TreeWorkspace.tsx + tree-workspace.css，统一调用 useTreeNodeMenu；页面仅提供节点、权限和业务回调。

## 实施与边界
- 接入角色、组织、资源菜单、数据字典、物料分类五处，树行去装饰图标/徽标、紧凑化，新增公共工具区、总数与滑条、侧边中点收放。
- 角色内置保护/脏权限离开确认、资源拖放、字典停用/固定值保护、组织编辑及分类查询保持原接口语义。不新增数据库、权限或写入能力。
- 例外：角色权限勾选树、导航菜单、表格层级列、表单树选择器，以及 ui-assets/scenarios/bom 的只读层级预览（演示差异标注，不是左树右详情）。商机阶段当前是表格。
- 桌面左栏280–440px，默认320px；窄屏上下排列、隐藏无意义的宽度滑条。宽度是当前挂载期间的展示偏好，不增加持久化表。

## 真实执行证据
- Web TypeScript typecheck 通过。
- TreeWorkspace.test.tsx：3项通过（搜索祖先/展开收起/刷新，键盘/菜单/计数/调宽/收放/右侧状态，空态只读）。
- RoleWorkspace、OrganizationUnitsPage、ResourceMenuPage、EnterprisePages 测试：22项通过。资源测试仍有非失败的既有异步 act 警告。
- scripts/tree-workspace-browser-qa.mjs：五页面各1440px/390px共10个布局检查通过；搜索、工具、菜单、宽度、收放、32px节点行高、箭头中点位置、无整页溢出、无页面JS异常。只读核验，无业务写入。
- 浏览器结果与截图：`/tmp/tree-workspace-qa/result.json` 及同目录页面截图；已人工查看角色桌面、字典桌面、组织窄屏，发现并修复窄屏组织字段挤压，复跑通过。
- check-page-style.mjs、check-list-action-rule.mjs 通过；旧逐页菜单实现检查已改为检查统一组件双入口及调用方actions。
- 全仓 verify-all 执行后仍被根 CONTEXT.md 与 CONTEXT-MAP.md 并存阻断；不是本次UI检查失败，未修改该独立治理问题。

## 回流与状态
可复用：树形工作区布局、尺寸、搜索/键盘/菜单/收放交互与验收。不可直接复用：领域操作、内置限制、API和授权。规则/模板/金标准案例/接入说明/自动检查已同步。确认范围内无待定业务规则；不宣称所有形态树均迁移，不宣称全仓门禁通过或已发布。Specification按用户本次实施指令落实；无新增Architecture数据影响，未申请Release。

## 后续小修：Tab 右键菜单字体（2026-09-24）
REQ-TAB-FONT-01 / TC-TAB-FONT-01：移除公共菜单按钮14px覆盖，Tab容器与Portal菜单显式共用全局字体族/字号。UI-TAB-01、模板、金标准说明、组件README及静态检查同步更新。RouteTabs既有3项交互测试通过；scripts/tab-menu-font-browser-qa.mjs 在1440/390宽度验证六项菜单（含禁用、焦点及悬停）与标题fontFamily相同、fontSize均12px，无页面JS异常，未触发业务写入；结果 `/tmp/tab-menu-font-qa/result.json`。本次完成样式修正，无发布操作。跨页面复用公共组件，未修改六项菜单业务语义。

## 后续整改：内容Tab统一组件（2026-09-24）
REQ-CONTENT-TABS-01 / AC-CONTENT-TABS-01：复用既有DetailTabs/DetailPanel，不新建重复组件；将样式从仅DetailWorkspace后代适用改为组件自身语义选择器，树右侧可独立使用。资源菜单五页签接入，移除旧resource-detail-tabs按钮样式。UI-CONTENT-TABS-01记录参数、选中/未选中状态、权限边界及键盘约定，模板/金标准/自动检查同步。
类型检查通过，公共详情组件与资源菜单6项测试通过（资源既有异步act警告不影响结果）。scripts/content-tabs-browser-qa.mjs 比较客户详情与资源菜单选中/未选中共16项计算样式一致；1440/390宽度均验证5个面板点击、左右/Home键、tab-panel关联及无整页溢出、无JS异常通过，结果`/tmp/content-tabs-qa/result.json`。仅展示/只读操作，无业务写入。已确认样式与接入范围，无新增业务待确认；无数据/安全架构变更，无发布操作。全仓治理既有CONTEXT冲突仍单独记录，不宣称全仓通过。

最终补测：修复通用按钮hover边框规则覆盖未选中Tab底线的问题；浏览器追加未选中hover比较并通过。复测期间后端3000端口停止监听，已重新启动现有dev服务（未迁移/初始化数据库），完整浏览器复测通过。
