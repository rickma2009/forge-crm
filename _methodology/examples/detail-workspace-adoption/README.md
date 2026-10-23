# DetailWorkspace 独立接入演练

CMP-09：统一返回、只读摘要、内容页签及平铺分区。使用合成设备资料；不连接 CRM API、数据库、权限服务或真实保存，不代表独立业务项目采用。

从仓库根目录执行：

```sh
node _methodology/scripts/inspect-component-dependencies.mjs CMP-09
node _methodology/scripts/rehearse-query-bar.mjs --component CMP-09 --clean-install
```

脚本导出实际组件源码到新临时工程，生成 `src/DetailWorkspace.ts` 再导出入口；本目录 main.tsx 不是可独立直接编译的工程。保留输出 manifest、result.json、日志和锁文件。省略 `--clean-install` 会链接源仓库依赖，不能证明独立安装。

## 接口及责任

| 能力 | 组件负责 | 宿主负责 |
|---|---|---|
| 返回 | 有标签的箭头、回调、焦点及触控尺寸 | 目标路由、未保存保护；不从 history 猜测 |
| 摘要 | 标题、状态槽、字段名和值、null 空值占位 | 对象字段、可见权限、格式、关联链接 |
| 页签 | 选中外观、左右/Home/End 键、tab/panel 关联 | `active` 状态、授权后的 tabs、权限变化时回退有效页签 |
| 表单 | 接收正文内容 | 字段状态及保存；本例将输入提升到宿主，切换不丢值 |
| 分区 | 标题、留白和分隔线 | 业务表格与行为，不擅自给单据添加 Tab |

`id` 必须在同一页面唯一，tabs 内 id 唯一且 active 必须在 tabs 中。组件当前没有自动处理空页签、失效 active 或离开保护；权限导致列表变化时调用方应同步回退或渲染独立空态。不要把隐藏标签视为服务端授权。

样式依赖自身 CSS 与宿主字体/控件基础样式，使用 `--ipl-font-family`、`--ipl-font-size`、`--ipl-primary` 等令牌。演练 host.css 是最小宿主示例，不应与整套 CRM CSS 一起复制。现有样式包含 `.enterprise-page`、`.enterprise-card` 等选择器；须评估目标命名冲突。本轮没有改变生产组件或声称彻底去除样式耦合。

## 浏览器复验

若要验证实际构建产物，在成功构建后的临时工程运行 `./node_modules/.bin/vite preview --host 127.0.0.1 --port 5196 --strictPort`，再执行下方同一浏览器脚本。记录应明确标注 dist 预览，不能用开发服务器结果替代。以下 dev 命令仅适用于开发态验证。

在输出的临时工程中运行 `npm run dev -- --port 5196 --strictPort`，再从源仓库执行：

```sh
node _methodology/scripts/verify-detail-workspace-adoption.mjs http://127.0.0.1:5196/
```

需要已有 Playwright 和 Chrome；可通过 `PLAYWRIGHT_MODULE_PATH` 指定现有模块入口，不自动安装浏览器。脚本仅接受本机 HTTP 地址，检查桌面和触控尺寸、选中/未选中样式、键盘首尾及循环、表单保留、宿主权限回退、回调及无页面横向溢出。结果与截图写入新临时目录，运行后关闭预览服务。

这些验证不覆盖真实路由、后端鉴权、保存失败、未保存离开确认、复杂表单或其他浏览器。采用前阅读[接入指南](../../components/quickstart.md)，在目标项目填写[采用记录](../../templates/ui/adoption-record-template.md)。成熟度保持候选。

## 2026-10-03 实际结果

[clean-install-verification.json](clean-install-verification.json) 保存实际源码哈希、依赖版本、锁文件哈希和浏览器结果。npm 独立安装 16.8 秒、类型检查 1.6 秒、构建 114.2 秒，均退出 0；node_modules 为独立目录。React 19.1.1、Tabler 3.48.0、TypeScript 5.7.3、Vite 5.4.20。Chrome 154.0.8037.95 下 1440×1000 桌面及 390×844 触控验证通过，无控制台 error/warning；返回按钮分别为 32×32 和 44×44。触控截图已由本次 AI 执行过程查看核对，摘要、操作、页签与输入未被裁切。

Browser plugin not available，使用已有 Playwright。浏览器访问临时开发服务器；构建另行成功，未声称浏览器验证的是 dist 预览。预览服务已关闭。临时截图路径记录在 JSON，文件可能被系统清理；需复验时重新运行上述命令，不复制历史结果作为当前结果。

源文件是否与证据一致可运行：`node _methodology/scripts/check-rehearsal-source.mjs _methodology/examples/detail-workspace-adoption/clean-install-verification.json`。MATCH 仅表示记录中的源码未变化，不证明依赖或运行环境未变化。本轮扩展了公共演练脚本；其他组件旧记录若包含该脚本哈希，可能显示 STALE，应评估影响并按需复验，不能直接改旧哈希。

## 当前构建产物复验（2026-10-03）

旧记录检查只有公共演练脚本变化，组件与夹具哈希仍一致。重新独立安装、检查和构建后，新增 [dist-preview-verification.json](dist-preview-verification.json)，旧记录保留。npm 21.6 秒、tsc 1.7 秒、Vite 115.9 秒，均退出 0；使用独立 node_modules。浏览器直接访问 `vite preview` 提供的 dist，桌面 1440×1000 和触控 390×844 的既有交互断言通过，错误列表为空。触控截图已查看，无页面横向裁切；临时服务已关闭。

新记录额外保存 dist 文件哈希、预览命令及导出/依赖分析脚本哈希，便于识别验证对象。当前源码核对命令：`node _methodology/scripts/check-rehearsal-source.mjs _methodology/examples/detail-workspace-adoption/dist-preview-verification.json`。它不重新校验可能已清理的临时 dist，也不代替浏览器脚本。此次没有真实业务宿主接入、后端保存或鉴权验证，成熟度不变。
