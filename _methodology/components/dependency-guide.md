# 公共组件的依赖与接入核对

2026-10-03 根据当前源码核对。目录中的 `sourcePaths` 是实现、样式与说明入口，`dependencies` 列出已识别的软件包或组合组件；两者都不是自动生成的完整打包清单。版本以 [Web package.json](../../packages/web/package.json)及仓库锁文件为准，目标项目需自行验证兼容范围。

## 选择接入粒度

只需 CSV 编码时，可直接采用 [csv-export.ts 单文件工具](../examples/csv-export-adoption/README.md)，无需复制整个网格或 Excel 导出模块。旧 grid-export.ts 继续兼容再导出；单独复制时按纯模块入口选择，不以打包器可能 tree-shake 为由忽略类型解析依赖。

| 组件 | 主要配套条件 | 必须由调用方提供或适配 |
|---|---|---|
| RecordQueryBar | React、Tabler Icons、自带 CSS、全局表单与按钮样式 | 字段、状态、查询和重置；卡片颜色、输入高度和字体令牌 |
| BusinessDataGrid / DeclarativeDataGrid | React、AG Grid Community/React、视图配置类型、导出辅助文件；Excel 路径另用 ExcelJS | 数据、列、分页、权限与视图配置；类型包迁移或等价接口 |
| BusinessDirectory | 查询栏、声明式网格、视图选择器、图标、业务对象登记及视图契约 | 列表与视图服务适配；不能只复制 TSX 而丢掉对象登记 |
| ListViewSelector / RowActionButton | React、Tabler Icons、自带 CSS | 选项或动作、中文名称、授权及禁用条件 |
| TreeWorkspace | React、ReactDOM Portal、图标、节点菜单及两份 CSS | 树数据、选择状态、维护动作与权限 |
| RouteTabs | React、ReactDOM Portal、模型文件和 CSS | 路由同步、固定页签、未保存保护；检查目录内其他接入文件 |
| DetailWorkspace / DocumentWorkspace | React、详情容器、图标及对应 CSS | 返回动作、主表字段、状态、编辑/保存规则 |
| DrawerWorkspace | React、ReactDOM Portal、图标及 CSS | 开关状态、标题、关闭回调及业务离开保护 |
| ProductPickerDialog | React、声明式网格、Product 类型与 CSS | 产品分页查询与选择后业务处理；产品类型是领域依赖 |
| Dashboard | React、自带 CSS、全局指标文字样式 | 指标口径、格式化值与详情；不能遗漏 `ipl-type-metric` 样式 |
| SalesFunnel | React JSX runtime、自带 CSS | 阶段、金额文本、点击回调；现有“商机/赢率”文案需按领域适配 |
| AgentAssistantDrawer | React、DrawerWorkspace、AI/Agent 类型及标题映射 | AgentGateway、对象上下文与保存权限；属于带领域契约的组合组件 |

上表是源码检查结果，不代表这些组件均完成过独立工程安装。公共样式的部分值仍来自 Forge CRM 全局 CSS，其他项目采用时必须做实际页面核对。

## RecordQueryBar 最小接入示例

可先用 `node _methodology/scripts/export-component-source.mjs CMP-01 /absolute/new-output-directory` 导出。`source/` 下保留仓库相对目录，`manifest.json` 保存逐文件哈希与依赖检查限制，README 列出接入步骤。目录已存在时拒绝，不覆盖目标工程；复制完成后仍按以下说明适配。

2026-10-03 实际将 CMP-01 导出至本机 `/tmp/forge-cmp01-source-20261003`，包含 TSX 和 CSS 两个源码文件；4 项隔离测试验证字节/哈希一致、拒绝已有输出、缺失依赖无输出、仓库外符号链接拒绝。临时导出路径仅是本次证据，其他成员应选择自己的新目录。此结果不等于目标工程构建成功；查询栏独立宿主的构建与交互证据见下方演练入口。

若目标项目也采用 React，可先复制 `RecordQueryBar.tsx` 与 `record-query-bar.css` 到同一目录，并安装与目标 React 版本兼容的 `@tabler/icons-react`。其余条件如下：

- 配置 TSX 编译及 React JSX runtime。
- 自带 CSS 主要负责布局；`.enterprise-card`、按钮的 `.is-primary`、表单控件外观由目标项目样式提供。
- 映射 `--showcase-muted` 和 `--app-font-size`；核对字体、控件高度、边框、焦点及禁用效果。Forge CRM 来源在 [showcase.css](../../packages/web/src/showcase/showcase.css) 和 [styles/index.css](../../packages/web/src/styles/index.css)。不要为了一个查询栏直接搬入整套业务页面样式。
- 组件本身是 `form`，不能嵌入另一个 `form`。`children` 采用直接的 `label` 字段容器，以匹配现有布局选择器。

```tsx
import { useState } from 'react';
import { RecordQueryBar } from './RecordQueryBar';

export function SearchExample({ onSearch }: {
  onSearch: (keyword: string) => void;
}) {
  const [keyword, setKeyword] = useState('');
  return <RecordQueryBar layout="singleRow"
    onQuery={() => onSearch(keyword.trim())}
    onReset={() => { setKeyword(''); onSearch(''); }}>
    <label>名称<input value={keyword}
      onChange={(event) => setKeyword(event.target.value)} /></label>
  </RecordQueryBar>;
}
```

该示例只说明受控输入和回调，不提供加载、取消请求、分页或服务器过滤。不要先 `setKeyword('')` 再调用读取旧 `keyword` 的查询函数；重置应明确提交清空后的条件。`queryDisabled` 只禁用查询提交，不自动禁用重置或输入；竞态和加载策略由调用方处理。

## 接入与记录

树形工作区提供 [CMP-07 独立演练](../examples/tree-workspace-adoption/README.md)：`node _methodology/scripts/rehearse-query-bar.mjs --component CMP-07 --clean-install`。首次版本实际验证了独立安装、构建以及桌面/触控搜索、联动、菜单与面板操作；后续已把资源/组织页面选择器移回业务样式，验证记录按版本区分。节点菜单依赖 ReactDOM Portal，主题需覆盖 body 下菜单。演练不实现真实增删改或权限服务。

视图选择器现有[第二个组件接入演练](../examples/list-view-selector-adoption/README.md)：`node _methodology/scripts/rehearse-query-bar.mjs --component CMP-05`。2026-10-03 默认依赖和干净安装两种模式均完成类型检查、构建、桌面/触控高度对齐、禁用/空选项与回调、键盘验证，版本和记录分开保存。未执行真实业务视图服务验证，不等于独立业务项目采用。

查询栏的隔离演练已接入源码导出工具：`node _methodology/scripts/rehearse-query-bar.mjs` 会生成源码清单、宿主入口并执行类型/构建检查。2026-10-03 的[导出链路结果](../examples/query-bar-adoption/export-chain-verification.json)已验证当前导出可被该宿主消费；依然不等于其他组件或真实项目采用已通过。

先在仓库根运行 `node _methodology/scripts/inspect-component-dependencies.mjs CMP-01`（替换组件编码）。工具使用项目已安装的 TypeScript 解析 import/export 和字面量动态导入，递归列出相对源码与 CSS、外部包及未解析引用；发现缺失本地导入返回非零。它不修改目录、不复制文件、不安装依赖。

报告不是打包清单：裸包/项目别名不递归，CSS 的 import/url、全局样式与隐式 JSX runtime 需人工核对；例如源码没有显式 import React，也可能需要 React JSX runtime。计算式动态导入会列入人工检查，不能据此宣称自动依赖收集完整。

还必须检查**目录入口是否足以支撑文档示例**。2026-10-03 发现 CMP-08 原目录只登记 RouteTabs 视图及 model/CSS/README，依赖扫描显示 unresolved 为空，但示例所需的公共 index.ts 与 useRouteTabs.ts 没有导出。原因是 Hook 不被视图组件直接导入，遍历已登记入口无法发现它。目录现已补入 index.ts，由其再导出关系带入 Hook；新增真实目录回归，导出测试从 4 项扩为 5 项并全部通过。

本次导出的 6 文件快照在临时消费工程中经 `tsc --noEmit` 通过，同时调用 RouteTabs、useRouteTabs 和 applyTabAction。依赖链接本机 node_modules，未进行 CMP-08 干净安装、Vite 构建或浏览器复验。不要把原“15 项未解析引用为零”当作全部调用示例可用的证据。可复现检查：`node --test _methodology/scripts/export-component-source.test.mjs`；失效入口反例与培训问题见[组件萃取案例](../../docs/training/cases/query-bar-component-extraction.md)。

2026-10-03 实际扫描 15 个目录条目，未发现未解析的相对源码导入。组合依赖差异明确：CMP-03 声明式网格涉及 5 个本地文件、CMP-04 列表容器涉及 12 个、CMP-12 产品选择涉及 7 个；CMP-15 Agent 抽屉涉及 3 个，另依赖项目契约包。计数是该日源码快照，后续以运行报告为准；不改变成熟度，不等于独立接入通过。工具的 3 项隔离测试覆盖循环、再导出、延迟导入、缺失/计算式导入与越界入口。

1. 从 [组件目录](index.json)选入口，跟踪其静态导入、动态导入及所用全局 CSS。区分 npm 包、项目类型、组合组件、后端协议和设计令牌。
2. 填[采用记录](../templates/ui/adoption-record-template.md)，明确复制、替换与排除项；本项目公共组件可能仍需适配领域文案和数据契约。
3. 在目标工程检查依赖安装、类型/构建与相关交互；验证范围按风险选择。涉及数据、权限、保存时必须核对目标服务端规则。
4. 在真实页面核对默认、禁用、失败、键盘和窄屏状态。记录命令、版本及缺口；组件截图或导入成功不等于完成验收。

查询栏已有[隔离接入演练](../examples/query-bar-adoption/README.md)：复制当前组件和 CSS，使用不同宿主样式。复用本机依赖及独立安装依赖两种模式下，类型检查、构建与 Chrome 桌面/窄屏交互均通过；各自的版本、耗时与证据范围单独记录。隔离宿主结果不覆盖其他组件或 CRM 业务页面。没有发布新包或取得跨项目正式采用证据。源码依赖或公共样式变化时，应同步复核目录条目和本说明。
## 抽屉样式维护权（2026-10-03）

原 drawer-workspace.css 混合了容器和 agent-* 商机助手样式。源码精确类名搜索确认唯一调用者为 AgentAssistantDrawer，现将业务规则原样移入该组件的显式 CSS 导入。CMP-11 导出仍为两个文件且无 agent-* 规则；CMP-15 经导入遍历自动带入自己的 CSS。导出回归现 6 项通过，包含正向“助手必须带业务样式”和反向“通用抽屉不能携带业务样式”，不只检查相对依赖缺失。真实浏览器样式比对与边界见[抽屉演练](../examples/drawer-workspace-adoption/README.md)。
