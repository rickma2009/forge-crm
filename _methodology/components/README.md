# 插件组件目录

首次跨项目接入请从[组件接入快速指南](quickstart.md)开始：选择证据 → 检查依赖 → 导出源码 → 目标工程适配 → 验证与回流。

本目录登记已经在 CRM 中落地、具有明确源码入口的公共组件。它们在[交互模板库](http://localhost:5173/#/showcase/style-scenes)中以“插件组件”为一级目录，二级直接显示组件名称。页面模板（`TPL-*`）描述任务交互，插件组件（`CMP-*`）描述可调用的代码单元，两者互不替代。

目录中的“项目内可复用”只表示 Forge CRM 中已有公共源码和接入案例；当前登记成熟度仍为 `candidate`，截图、源码路径与示例都不能证明跨项目可直接采用。复用范围与成熟度按[资产晋升规范](../09-资产类型、成熟度与晋升规范.md)区分。其他项目采用时先按[采用记录模板](../templates/ui/adoption-record-template.md)记录保留、调整、排除、依赖与回归结果；取得独立项目证据后再评审成熟度。

`index.json` 是登记源。每个组件必须记录稳定编码、用途、源码路径、最小接入示例、配置与依赖、实际应用页面，以及该页面中组件区域的真实截图和截图来源。没有适用内容的说明项可以留空，不应编造能力。展示截图存于 `packages/web/public/template-previews/`，截图时排除系统菜单和顶栏，仅保留能说明该组件效果的业务区域；页面更新后应重新采集。

复制接入前阅读[依赖与接入核对](dependency-guide.md)：源码入口并非完整复制清单，需跟踪静态/动态导入、领域契约和全局样式。目录中的依赖记录不表示已经发布独立 npm 包，也不表示这些依赖在目标项目已验证兼容。

可运行 `node _methodology/scripts/inspect-component-dependencies.mjs CMP-01` 生成只读源码依赖报告；报告中的人工检查项需补齐后再做隔离接入，不能把未解析引用为零当成直接可复制的证明。

需要复制时运行 `node _methodology/scripts/export-component-source.mjs CMP-01 /absolute/new-output-directory`。目标父目录须已存在、目标目录须不存在；导出相对源码、文件 SHA-256、依赖及人工检查清单，不覆盖既有文件、不安装包。输出为源码快照，不是可发布 npm 包；接入与验收见[依赖指南](dependency-guide.md)。

当前登记命令：`pnpm --filter @forge-crm/server exec tsx scripts/seed-template-library.ts`。它会把页面模板和插件组件分别按稳定编码幂等登记到演示系统，不删除历史业务记录。组件可用 `?interactionComponent=CMP-07#/showcase/style-scenes` 直接定位；在详情中查看效果预览、源码入口、接入示例和实际应用案例。登记时会校验源码和截图文件存在。

已有本机组件目录的日常更新优先使用[增量维护命令](../../docs/testing/component-library-maintenance.md)：`pnpm --filter @forge-crm/server exec tsx scripts/sync-component-library.ts --system demo-portal` 默认只预览；追加 `--apply` 才写入有差异的源码字段，缺少登记则拒绝，不初始化业务数据。首次登记和日常更新分开，不依赖聊天中的临时脚本。

重复登记只刷新源码维护的目录内容；已有成熟度、进度状态、证据、下一步验证项和页面关联继续保留，备注与完成时间也不被清空。默认 `candidate` 与 `DONE` 仅用于新建组件记录；其中 DONE 表示项目内实现状态，不表示跨项目成熟度。新版本是否使既有证据失效，应另行复审并保留版本依据，不能由登记脚本擅自清除评审记录。

新增组件时，先确认源码确实以公共接口导出且已有实际业务页面在使用，再登记；领域专用组件应在“接入配置与边界”中说明限制。示例是接入入口，实际页面仍应按组件 Props、对象数据契约和权限规则配置。示例中的业务数据、回调和网关由接入页面提供。

CMP-01、CMP-05、CMP-07、CMP-08、CMP-09 的接入说明也登记在 `index.json` 的 `steps/config` 中，供系统组件详情的“使用步骤”“接入配置与边界”直接展示：包含隔离演练命令、说明路径及证据限制。运行步骤以各自演练 README 为准，元数据不复制完整验证日志；更新时同步这两个入口，避免系统目录停留在旧用法。

元数据登记不能自动改动人工评审的成熟度或证据。本次目录补充只说明已具备的源码级采用流程，不新增“跨项目已验证”结论，也不把页面中的项目内可复用标签当成发布独立包的证明。

组件详情的“复制参考指令”由统一[组件接入指令模板](../templates/ui/component-adoption-prompt-template.md)与该组件的源码、适用范围、步骤、依赖和配置生成。更新模板后需重新登记才能更新页面中的指令；它是交给目标项目 AI 的任务上下文，不会自动执行命令。目标需求与已有授权仍由目标项目提供，模板不替代需求分析、权限决策或实际验收。

## 接入证据复审

| 组件 | 可复现入口 | 当前记录及边界 |
|---|---|---|
| CMP-01 查询栏 | `node _methodology/scripts/rehearse-query-bar.mjs` | [导出链路](../examples/query-bar-adoption/export-chain-verification.json)：默认依赖模式类型/构建；其他历史安装与浏览器范围见该演练 README |
| CMP-05 视图选择器 | `node _methodology/scripts/rehearse-query-bar.mjs --component CMP-05 --clean-install` | [干净安装](../examples/list-view-selector-adoption/clean-install-verification.json)：独立安装、构建、Chrome 桌面/触控；无真实视图服务采用 |
| CMP-07 树形工作区 | `node _methodology/scripts/rehearse-query-bar.mjs --component CMP-07 --clean-install` | [接入演练](../examples/tree-workspace-adoption/README.md)：独立安装、构建、Chrome 桌面/触控搜索、联动、菜单、收放；无业务维护服务采用 |

CMP-07 的首次干净安装属于历史版本；当前样式归属调整见[后续复验](../examples/tree-workspace-adoption/style-ownership-verification.json)。旧记录出现 STALE 是预期结果，不能用于证明当前源码；新记录明确区分链接依赖构建、独立演示交互与原业务页面样式比较。

引用前运行 `node _methodology/scripts/check-rehearsal-source.mjs <记录路径>`。`MATCH` 仅表示记录中所有文件的字节一致；`STALE` 表示文件缺失或已变化；`INVALID` 表示空记录、无效哈希、重复或越界路径等。后两者返回非零，保留原记录，不自动重写哈希或清空证据。

2026-10-03 最初核对 CMP-01/05 记录均为 MATCH，各 4 个文件；后续 CMP-07 增加独立接入记录，并纳入演练与浏览器脚本哈希。工具不证明记录覆盖了全部依赖，也不检查未登记的宿主配置、依赖包、脚本、浏览器或业务环境。源文件变化后按影响重验；新增依赖时先重新生成依赖报告。历史记录可继续说明历史版本，但不得再宣称覆盖当前改动。新记录应与旧记录区分，注明替代范围；不要仅为恢复 MATCH 更新哈希。
