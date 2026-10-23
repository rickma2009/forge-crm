# ListViewSelector 隔离接入演练

用于验证 CMP-05 从源码导出到独立宿主的接入，不连接业务视图、权限、数据库或模型，也不是独立业务项目采用。

仓库根目录执行：

```sh
node _methodology/scripts/rehearse-query-bar.mjs --component CMP-05
```

沿用已有演练入口以兼容 CMP-01 默认调用。输出新的临时目录，包含 component-source 源码快照、manifest 哈希、再导出入口、独立宿主、构建日志和 result.json。main.tsx 中的本地组件入口由脚本生成，不能直接在本目录编译。默认复用已安装 node_modules；添加 `--clean-install` 可验证独立安装，两种模式的结果分别记录。

## 宿主与业务边界

引用记录前可运行 `node _methodology/scripts/check-rehearsal-source.mjs _methodology/examples/list-view-selector-adoption/clean-install-verification.json`。它只比较记录中的源码字节；依赖版本、宿主配置及浏览器变化仍需另行评估。不通过时保留旧记录并重验受影响范围，不直接改旧哈希。

宿主通用控件最小高度为 38px，以检查组件自己的 32px/触控 44px 规则能否覆盖冲突。宿主负责字体、按钮颜色、禁用反馈；组件负责三段布局和回调。选项、当前值、设置权限及加载逻辑仍由调用方负责；本例不模拟真实视图保存，设置仅累计回调次数。

## 2026-10-03 实际证据

[verification.json](verification.json)记录源码与接入文件哈希、依赖版本、类型检查/构建及 Chrome 154.0.8037.95 验证。默认模式类型检查和构建通过；1440×900 桌面、390×844 触控检查三段分别为 32px/44px 且顶部对齐。切换值、设置回调、仅禁设置、全部禁用、空选项、Tab 焦点与无页面横向溢出均通过，控制台无 error/warning。

Browser plugin not available；使用已有 Playwright。临时截图 `/tmp/list-view-adoption-desktop.png`、`/tmp/list-view-adoption-touch.png`，脚本 `/tmp/list-view-adoption-qa.mjs`。临时文件可能被清理，重新验收时按上述状态重新操作并记录，不能仅复制历史结果。预览服务已停止。

本轮同时重新执行不带参数的 CMP-01 演练，类型检查及构建通过，保持入口兼容。没有重跑 CMP-01 浏览器，也没有把它的旧证据套用到 CMP-05。

目标项目接入前按[依赖指南](../../components/dependency-guide.md)核对样式和依赖，并填写[采用记录](../../templates/ui/adoption-record-template.md)。示例验证不提高资产成熟度；其他浏览器、真实权限和持久化视图仍需目标项目验证。

## 可重复运行的浏览器检查

2026-10-03 补充完成干净安装，见 [clean-install-verification.json](clean-install-verification.json)：npm 安装约 14.5 秒、类型检查约 1.7 秒、构建约 115 秒，全部退出 0。确认 node_modules 为独立目录；实际图标库为 3.48.0，区别于默认模式的 3.46.0。通过下述持久化浏览器脚本验证同一构建产物的桌面/触控交互，无控制台错误或警告，预览服务已停止。锁文件哈希和源文件哈希保存在记录中；未验证其他浏览器或真实视图服务。

构建后在生成目录执行 `npm run dev -- --port 4189 --strictPort`，然后在仓库根目录执行 `node _methodology/scripts/verify-list-view-adoption.mjs http://127.0.0.1:4189/`。脚本使用调用环境已有的 Playwright 和 Chrome；若本仓库未安装 Playwright，可用 `PLAYWRIGHT_MODULE_PATH` 指向现有运行时的入口，不自动安装依赖。

检查仅接受本机 HTTP 地址，并核对页面标题与组件身份。每次产生新的临时证据目录，保存截图和 result.json；失败保存 failure.json 并返回非零。检查包括桌面/触控三段高度、选择/设置回调、三种禁用/空态、Tab 焦点及页面溢出，结束后关闭浏览器。预览服务由启动者在验收后停止。
