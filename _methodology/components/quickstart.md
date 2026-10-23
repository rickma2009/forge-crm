# 将公共组件接入另一个项目

本入口串联现有工具，以 CMP-05 视图选择器为例。适用于已有 React 工程的源码级接入；不是 npm 包发布，也不自动创建业务功能。查询栏可使用 CMP-01；左树右详情可参考 [CMP-07 独立演练](../examples/tree-workspace-adoption/README.md)。其他组件先检查依赖，不承诺都有隔离演练。

统一对象详情可参考 [CMP-09 独立演练](../examples/detail-workspace-adoption/README.md)，其中页签权限与字段状态由宿主管理；组件不自动保存、不负责返回路由或离开保护。

顶部多页面工作区可参考 [CMP-08 独立演练](../examples/route-tabs-adoption/README.md)，从公共入口同时接入视图与 Hook，核对页签状态和宿主导航同步；真实路由、身份切换和草稿保护另由宿主实现。

单据主表与明细可参考 [CMP-10 独立演练](../examples/document-workspace-adoption/README.md)。容器不处理审批、持久化或库存；宿主管理编辑态、取消恢复、操作列和行增删。

需要新增独立演练时，先阅读[按组件拆分的配置约定](rehearsals/README.md)，避免为了新增一种夹具修改共享 runner、使所有组件的历史工具哈希失配。

侧边任务面板可参考 [CMP-11 抽屉演练](../examples/drawer-workspace-adoption/README.md)：检查 Portal 样式、子控件 Escape 消费和宿主关闭守卫；背景 inert、滚动锁和多层弹窗不能假定已提供。

## 1. 在源仓库选择组件与证据

先运行 `node _methodology/scripts/component-evidence-inventory.mjs` 获取只读 JSON 清单。它逐项列出目录中的组件及 examples 下全部 `*verification.json`，保留每份记录的 MATCH / STALE / INVALID，不按日期挑一份代替其他证据。`NO_ASSOCIATED_RECORD` 仅表示未找到声明该组件的记录，不表示该组件没有测试。历史记录缺少 component 或声明了未知编号时列入 unassigned，必须人工查阅来源，工具不会根据文件夹名字猜测归属。

MATCH 仅检查记录列出的文件字节，无法证明依赖闭包完整、当前环境通过或真实业务项目采用；STALE 给出变化文件，先判断影响，再重跑相关演练并保存新证据，不覆盖历史哈希。命令退出码 0 表示完成清单生成，不表示所有组件通过验收；资产成熟度仍按原有评审流程判定。

以下命令在 Forge CRM 根目录运行，需要仓库已安装依赖及可用 Node。Node/包管理器版本以根 package.json 为准，不把本机绝对目录带入目标项目。

```sh
node _methodology/scripts/inspect-component-dependencies.mjs CMP-05
node _methodology/scripts/check-rehearsal-source.mjs _methodology/examples/list-view-selector-adoption/clean-install-verification.json
```

读取[组件目录](index.json)、[依赖说明](dependency-guide.md)和[演练记录](../examples/list-view-selector-adoption/README.md)。确认目标需求确实需要三段视图选择器；如果需要树形导航或分页，它不提供这些功能。`MATCH` 仅说明记录的文件未变化，不证明当前机器已执行测试。

使用 AI 协助接入时，可从系统组件详情复制参考指令，并同时提供目标页面需求、目标仓库及可访问的源码快照。该指令由[统一模板](../templates/ui/component-adoption-prompt-template.md)生成，包含组件实际登记的边界。不要只复制指令中的来源路径却不给源码访问条件，也不要把它当成已完成的采用报告。

## 2. 导出独立的源码快照

下面使用新的临时父目录，避免覆盖已有工程。输出目录由导出器独占创建：

```sh
component_export_parent="$(mktemp -d)"
node _methodology/scripts/export-component-source.mjs CMP-05 "$component_export_parent/CMP-05"
```

输出包含 `README.md`、`manifest.json` 及 `source/`。保留 manifest，用其哈希与源文件对应；不要只复制截图或从聊天中重建源码。此命令不安装依赖，CSS 资源、项目别名、契约包及隐式 JSX runtime 不会自动补齐。

CMP-05 当前导出两个文件：ListViewSelector.tsx 和 list-view-selector.css。将它们放在目标工程同一组件目录，保持相对 CSS 导入；其他复杂组件应按报告保留相对目录，不能一律扁平化复制。

## 3. 在目标工程补齐宿主与业务适配

| 责任 | CMP-05 接入要求 | 不应复制的内容 |
|---|---|---|
| 编译和依赖 | React JSX 编译、与目标 React 兼容的 Tabler Icons；按目标包管理器安装并保存锁文件 | 源仓库 node_modules 链接、整套 package.json |
| 样式 | 字体、按钮颜色及禁用反馈；核对 32px 桌面和 44px 触控三段高度 | 整套 CRM 页面 CSS 或临时宿主演示样式 |
| 数据 | 目标视图列表、当前选择、加载和失效回退 | CRM 演示视图 ID、组织或用户数据 |
| 行为 | onChange 更新业务状态；onSettings 打开目标配置入口 | 演练中只累计点击次数的回调 |
| 权限 | disabled/settingsDisabled 反映目标权限和状态；保存端再鉴权 | 只用前端禁用代替服务端权限 |

最小调用形式：

```tsx
<ListViewSelector value={selectedViewId} options={availableViews}
  onChange={selectView} onSettings={openViewSettings}
  disabled={loading} settingsDisabled={!canConfigureViews} />
```

以上变量和函数由目标页面提供，不是可直接运行的完整页面。组件不负责持久化；如果目标需要个人视图、系统默认视图或字段权限，应在目标需求中另行定义。

## 4. 验证并记录采用

先验证目标工程自身的类型和构建，再检查真实页面的选择/设置行为、加载失败、禁用、空选项、键盘及窄屏。需要参考独立宿主时，在源仓库运行：

```sh
node _methodology/scripts/rehearse-query-bar.mjs --component CMP-05 --clean-install
```

该命令在新的临时工程安装依赖，可能访问包源，但禁用安装生命周期脚本；不访问业务数据库。它证明的是演练宿主，不能代替目标页面验收。浏览器重复验证方法见演练 README。

将[采用记录模板](../templates/ui/adoption-record-template.md)放入目标工程文档目录，填写采用/适配/排除内容、manifest、目标依赖版本、实际命令和结果、剩余缺口。不把 Forge CRM 已通过的输出当作自己的执行结果，也不自动提升组件成熟度。

## 5. 更新与回流

源组件更新后导出到新目录。比较新旧 manifest、源码变化及目标适配代码，再决定如何合并；不要覆盖目标工程。变更涉及接口、样式或权限时，重验对应行为。证据过期时保留历史记录并新增当前记录，不能只改哈希让检查变绿。

回流有价值的通用改动时说明：原需求、目标项目差异、保留的公共接口、排除的业务规则、实际验证和影响范围。仅有复制成功不够；如果没有第二个真实业务项目，仍记录为隔离演练。团队练习及评审见[培训路径](../../docs/training/learning-path.md)。

## 常见失败处理

| 现象 | 下一步 |
|---|---|
| 导出提示目标已存在 | 选择新的输出目录，保留原有适配成果 |
| 依赖检查有 unresolved | 修复/明确缺失引用后再导出，不手工忽略错误 |
| 清单没有外部包但 TSX 不能编译 | 检查 JSX runtime 和目标编译配置；空包列表不表示零依赖 |
| 能构建但样式不一致 | 检查宿主样式、令牌与选择器冲突，使用实际页面截图/尺寸证据 |
| 下拉可切换但刷新后失效 | 检查调用方的持久化与恢复逻辑，组件本身不保存视图 |
| 旧证据显示 STALE | 确认变更和受影响范围，执行必要复验并新增证据 |

本页于 2026-10-03 对照现有工具与 CMP-05 实际演练整理；尚未进行团队试讲或独立业务项目采用。这里没有附加发布批准。
