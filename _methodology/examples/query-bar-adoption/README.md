# 查询栏隔离接入演练

本例检验 `RecordQueryBar` 与宿主页面的边界：只复制查询栏源码及 CSS，宿主提供表单、按钮、卡片与字体样式。示例有七个模拟条件、默认/单行布局切换及已提交条件反馈，不接业务接口。

在 Forge CRM 根目录、已安装 Web 依赖的环境运行：

```sh
node _methodology/scripts/rehearse-query-bar.mjs
```

脚本在系统临时目录生成新的 `forge-query-bar-*` 工程，不修改已有目标项目。它按 Web package.json 生成包声明和独立 tsconfig，复制本目录的宿主示例及当前公共组件。默认链接本机 Web node_modules，不安装依赖；依次执行类型检查与生产构建。打印的目录含日志、dist 和带源码哈希的 result.json，失败返回非零退出码。两种模式均不访问数据库或模型。

需要验证独立依赖安装时运行：

```sh
node _methodology/scripts/rehearse-query-bar.mjs --clean-install
```

该模式不创建 node_modules 链接，使用 npm 在新的临时目录安装声明依赖，缓存也在该目录中；需要能访问配置的 npm 源。安装使用 `--ignore-scripts --no-audit --no-fund`，不运行依赖生命周期脚本，然后使用新目录的 tsc 和 vite。安装和类型检查超时为60秒，构建为180秒；失败保留日志和结果并停止后续步骤。包声明里的范围可能解析到不同版本，结果记录实际直接依赖版本、Node 版本、平台架构、命令耗时和生成锁文件哈希；精确重演需保留临时工程中的 package-lock.json 并使用 npm ci。此步骤不是依赖安全审计。

`main.tsx` 是生成工程的入口模板；它引用的 `./RecordQueryBar` 由脚本生成一个再导出入口，实际源码来自 `component-source/source/` 下的组件导出目录，因此不要直接在本示例目录运行 TypeScript 编译。`component-source/manifest.json` 记录复制范围和哈希，result.json 另记录接入文件哈希。生成工程可执行 `npm run dev`，按实际输出的本地 URL 打开。默认模式依赖源仓库的 node_modules 链接，不能连同该链接复制到其他机器冒充独立交付；干净安装模式需依据本次安装与构建结果判断是否可运行。

## 已观察结果与限制

同一脚本现可通过 `--component CMP-05` 运行[视图选择器演练](../list-view-selector-adoption/README.md)。不带参数仍为查询栏；不同组件的证据独立记录，不互相替代。

2026-10-03 演练已改为调用公共源码导出工具，再从导出目录构建宿主。[导出链路验证](export-chain-verification.json)记录此次默认依赖模式的类型检查与生产构建均退出 0，分别约 1.4 秒、3.4 秒。此轮没有重新独立安装依赖或运行浏览器；下列较早记录保留原来的来源复制方式和验证范围，不将旧浏览器证据当成本次脚本执行结果。

2026-10-03 执行通过：`tsc --noEmit` 退出 0；`vite build` 退出 0，生成 HTML、CSS、JS。可追溯的来源哈希和结果保存在 [verification.json](verification.json)，其对应源文件改变后应重新验证，旧记录只代表当时版本。

最初记录证明当前组件在独立源码和配置、不同宿主样式下可以编译构建，但当时复用了已安装依赖。后续干净安装的结果单独登记如下；业务接口和跨项目正式采用尚未验证，不会据此提高组件成熟度。

干净安装的首次尝试记录：npm 安装与类型检查通过，图标库按声明范围解析到 3.48.0；构建在旧的60秒上限被终止，日志为 ETIMEDOUT。确认该进程终止后，在同一工程重跑构建，用时约111秒成功。由此将脚本构建上限调整为180秒，而没有改动组件来迎合检查。此例说明安装版本、运行架构和超时策略应纳入复用证据；不能仅凭超时就断言源码不兼容，也不能忽略超时并宣称整条脚本成功。

2026-10-03 完整复验通过，见 [clean-install-verification.json](clean-install-verification.json)：npm 安装约14.7秒、类型检查约1.5秒、构建约112.6秒，均退出0；环境为 Node 24.16.0 / darwin x64。依赖实际位于新临时工程内，未链接源仓库，`npm ls --depth=0` 无缺失项。后续已对同一干净安装工程完成浏览器检查，并核对锁文件哈希、实际依赖版本及源码哈希一致；结果记录在同一文件的 browserVerification 字段。两次安装模式的记录各自保留，不能用任一结果推断未测试的版本组合。

## 浏览器核对步骤

1. 默认布局分别在宽屏和窄屏查看字段换行；切到单行模式确认字段保持一行。
2. 缩窄窗口，让条件区出现横向滚动；检查查询/重置按钮在可见范围内。
3. 用 Tab 到达每个条件，检查当前焦点可见；输入后按 Enter，核对下方已提交值。
4. 修改输入但不提交，确认下方仍为上次结果；点击重置，核对输入和已提交值同时清空。
5. 记录真实浏览器、视口、操作结果及问题，不以构建通过代替这些行为检查。

2026-10-03 已用本机 Chrome 154.0.8037.95 与 Playwright 1.61.1 对上述演练执行核对，视口为 1440×900 和 390×900，地址为 `http://127.0.0.1:4187/`。Browser plugin not available，因此按调试技能使用已有 Playwright。页面身份、非空内容、无框架报错覆盖层均通过；七字段同排、操作按钮可见、页面无横向溢出、Tab 可到达并显示最后字段、Enter 提交、未提交输入隔离、重置清空、默认模式换行均通过。

首次检查发现 `/favicon.ico` 404，已在生成页面声明空图标，并重新构建及运行同一流程，最终控制台无 error/warning。临时证据在 `/tmp/forge-query-bar-browser-20261003/`（两种布局各两张截图及 result.json），执行脚本为 `/tmp/forge-query-bar-browser-qa.mjs`；临时文件可能被系统清理，复验应按步骤重新生成。该浏览器结论仅针对隔离宿主，不代表 CRM 两个库存页面或其他浏览器已完成视觉验收。

干净安装模式也已执行同一组交互检查：Chrome 154.0.8037.95，1440×900 和390×900，所有检查通过，控制台无 error/warning。证据独立存放在 `/tmp/forge-query-bar-clean-browser-20261003/`，脚本为 `/tmp/forge-query-bar-clean-browser-qa.mjs`，不会覆盖前一模式的截图。验收结束已关闭临时预览服务。临时浏览器文件若被清理，永久保留的结果摘要仍可定位已验证版本，但截图需重新采集。

目标工程采用时仍需遵循[依赖指南](../../components/dependency-guide.md)并填写[采用记录](../../templates/ui/adoption-record-template.md)。培训任务见[组件提炼案例](../../../docs/training/cases/query-bar-component-extraction.md)。
