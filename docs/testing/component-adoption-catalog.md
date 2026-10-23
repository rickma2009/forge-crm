# 组件接入说明的目录展示验证

2026-10-03。范围：CMP-01 查询栏、CMP-05 视图选择器、CMP-07 树形工作区。对应总目标来源 REQSRC-090；本次补充已有采用能力的发现入口，不改变组件运行接口或成熟度。

## 变更与责任

`_methodology/components/index.json` 的 steps/config 增加演练 README 路径、独立安装演练命令、源码导出命令、目标目录前提和验证边界。沿用现有加载/登记逻辑，系统“插件组件”的使用步骤、接入配置与边界读取同一份元数据。完整依赖版本、历史与当前证据仍由演练 README 及其记录维护。

## 实际执行

- `pnpm --filter @forge-crm/server exec jest --runInBand src/style-scene/template-library.seed.spec.ts`：6 项通过，含重复登记保留评审字段和目录结构校验。
- 在本机 demo-portal 的数据库事务中调用现有 `seedComponentLibrary`，同步 15 个组件；对比全部原有记录，人工维护的成熟度、状态、证据、下一步验证、页面关联、备注、完成时间、版本与创建信息均保持不变；非组件记录完全一致，记录数未变。三个目标组件的 templateJson 与源元数据一致。断言在提交前执行，未修改业务单据或其他系统。
- Chrome/Playwright，1440×1000：逐一打开 `?interactionComponent=CMP-01#/showcase/style-scenes`、CMP-05 和 CMP-07 的详情，确认显示对应 `--component ... --clean-install` 命令、“接入演练通过不等于真实业务项目采用”及 STALE 边界。无页面运行异常。临时截图 `/tmp/adoption-catalog-CMP-01.png`、`CMP-05.png`、`CMP-07.png`（后两者同目录及 adoption-catalog- 前缀）；截图人工核对使用步骤与配置说明可阅读。
- JSON 内容与相关 diff 空白检查通过。

## 页面检查发现的补充修复

实际截图发现：组件没有 regions 时，条件渲染返回数组长度 `0`，页面出现孤立数字并把使用步骤挤到右半列。已将相关条件转换为 Boolean，并使双列区域仅有一个内容块时跨越两列。依赖列表为空时同样不输出 `0`。

`pnpm --filter @forge-crm/web exec vitest run src/showcase/InteractionIndexPage.test.tsx`：9 项通过，新增反例覆盖没有 regions/dependencies 的组件仍显示步骤且不出现数字零。该问题说明元数据加载通过不能替代真实详情页检查。

修复后再次检查上述三个真实组件详情：使用步骤区域仅有一个内容块、无数字零，计算样式 `grid-column: 1 / -1`；新接入说明仍显示，页面运行异常为空。临时截图已替换为本次修复后的画面。

Browser plugin 未提供，使用现有 Playwright/Chrome。此记录证明本机目录展示和元数据保护，不证明目标团队已完成接入、不再次声称三个组件均在本轮独立安装，也不改变其 candidate 成熟度。

后续维护：新增演练时同步目录入口与对应 README；登记后检查真实详情页，不仅检查 JSON 文件。历史证据被源码变化标为 STALE 时，应解释范围并新增验证记录，不能擅自覆盖人工证据或把日期改成当前日期。

## 后续：复制参考指令的上下文完整性

2026-10-03 将原来的简短参考语替换为统一模板生成：`_methodology/templates/ui/component-adoption-prompt-template.md`。15 个组件分别注入自己的源码入口、适用范围、步骤、依赖与配置；目标项目负责需求、授权、宿主适配与验收。模板不调用 AI，也不执行命令。

再次执行登记测试：6 项通过；新增断言核对 15 个生成结果均包含自身编码、所有源码/配置/依赖、目标约定优先和真实宿主验证边界，且没有未替换占位符。再次事务登记确认 15 个组件的人工评审字段保留、非组件记录不变。

浏览器对 CMP-01/05/07 实际点击“复制参考指令”：剪贴板内容与页面参考指令完全一致，包含对应组件编码、目标 AGENTS 优先及独立演示不替代真实页面验收的要求；三个页面无运行异常。未调用外部模型、未在另一业务项目执行这段指令，不能据此宣称 AI 接入质量已验证。培训案例与快速指南同步补充了如何提供目标需求和源码快照。

## 后续：CMP-09 演练入口接入真实目录

2026-10-03，CMP-09 的独立演练完成后，把 README、源码导出、独立安装及浏览器复验命令加入组件目录步骤。配置说明补充有效 active、唯一 id、宿主权限回退、表单状态与返回保护、CSS 类名冲突以及 MATCH/STALE 的证据边界。未改变生产组件和资产成熟度。

`pnpm --filter @forge-crm/server exec jest --runInBand template-library.seed.spec.ts`：6 项通过（2.83 秒）；既有 15 个组件的参考指令校验新增全部 steps，避免目录有步骤而复制指令遗漏。事务同步确认 15 个组件人工评审字段保留、非组件记录完全不变、CMP-01/05/07/09 元数据与源目录一致。

本机真实页面 `http://localhost:5173/?interactionComponent=CMP-09#/showcase/style-scenes` 已检查：使用步骤展示 CMP-09 独立安装命令；配置与参考指令展示演练不等于业务采用、STALE 及目标 AGENTS 优先等边界。实际点击复制，剪贴板全文与页面 `.template-library-prompt` 一致，包含 CMP-09。使用步骤没有空区域的数字零，单列区域占满宽度，无页面运行异常。临时截图 `/tmp/adoption-catalog-CMP-09.png` 已查看核对；脚本 `/tmp/detail-adoption-catalog-qa.mjs`，Browser plugin not available，使用已有 Playwright。

独立安装与桌面/触控行为的证据在[详情容器演练](../../_methodology/examples/detail-workspace-adoption/README.md)，本次目录检查没有重复执行它们，也没有宣称真实设备保存、路由或跨项目采用已实现。同步与检查脚本位于临时目录，可能被清理；需要复验时按上述断言重新执行，不把截图作为永久验收替代物。
## 单据、抽屉及助手样式说明同步（2026-10-03）

源目录补充 CMP-10/CMP-11 的独立演练入口、命令、宿主责任和证据边界；CMP-15 显式登记其自有 CSS。核对源码还发现 CMP-11 旧说明声称“点击遮罩退出”，但组件没有该事件，现改为未消费 Escape 或关闭按钮请求宿主关闭，并明确没有遮罩关闭行为。不因此给组件新增未要求的行为。

使用正式 `sync-component-library.ts --system demo-portal` 预览，差异仅 CMP-10/11 的 templateJson，以及 CMP-15 的 templateJson/artifactsJson；随后加 --apply 执行。事务内保护断言通过，人工字段与其他记录未改变。再次预览 changes=[]。没有全库 seed、业务数据写入或成熟度晋升。

Chrome/Playwright 实际访问 CMP-10 和 CMP-11 详情，核对对应演练命令、业务采用边界、STALE 说明及复制参考指令；剪贴板内容与页面指令一致，无 pageerror，步骤跨列显示且无孤立数字零。截图 `/tmp/adoption-catalog-CMP-10.png` 与 `/tmp/adoption-catalog-CMP-11.png`，后者已查看。临时脚本 `/tmp/document-drawer-catalog-qa.mjs` 循环明确为这两个编号，但沿用脚本末行仍打印 CMP-09，故不以该日志编号作验收依据；实际断言目标与截图可核对。CMP-15 本轮完成数据库同步，未单独做其页面截图或业务流程验证。
