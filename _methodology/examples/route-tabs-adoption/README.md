# RouteTabs 独立接入演练

CMP-08 使用公共 `route-tabs/index.ts` 同时导入 RouteTabs 与 useRouteTabs，源码快照包含 Hook、状态模型和 CSS。该例是独立合成宿主，不连接 CRM、路由库、权限或业务保存。

## 运行

仓库根目录执行 `node _methodology/scripts/rehearse-query-bar.mjs --component CMP-08 --clean-install`，创建新临时工程、导出源码、独立安装 React/ReactDOM 并执行类型检查和构建；不安装图标库。入口 `src/RouteTabs.ts` 由脚本生成，本目录不可直接作为完整工程启动。

在生成目录运行 `npm run dev -- --port 5197 --strictPort`，从源仓库运行 `node _methodology/scripts/verify-route-tabs-adoption.mjs http://127.0.0.1:5197/`。需已有 Playwright 和 Chrome，可用 `PLAYWRIGHT_MODULE_PATH` 指定现有模块。浏览器检查仅接受本机 HTTP，生成新的临时截图/结果目录；完成后停止预览服务。

## 宿主契约

- `home` 为固定首页；path 唯一，title 是展示名称。这里只允许四个合成路径，真实项目必须先鉴权再传 current，并处理无效路由和身份切换。
- 关闭/批量关闭的 next activePath 必须同步宿主导航。本例用 React state 代表路由，不证明 Hash、History 或目标路由库已集成。
- 页面内容 key 为 path + refreshKey，刷新重建当前内容，宿主计数保持。该例切换会卸载原内容，没有 KeepAlive 或草稿保存；真实系统应先决定未保存保护策略。
- Portal 菜单在 body 下，字体令牌必须可继承。不要只在局部容器配置字体而遗漏 Portal。
- `getHref` 由宿主生成可信内部完整地址。本例查询参数仅用于观察参数生成，不实现跨窗口打开指定页面；测试拦截 window.open 检查参数，不测试弹窗策略或跨窗口通信。

## 验证与限制

浏览器脚本检查固定首页禁关、右键/Shift+F10、菜单 Home/End/向下/Escape、禁用项跳过、关闭后台页不导航、关闭当前选相邻页、关闭右侧同步活动路径、关闭其他与全部、刷新内容而保留宿主状态、所有菜单项与页签字体一致，以及菜单在视口内。

触控视口使用键盘打开菜单，未测试原生长按。截图和检查覆盖 1440×1000 与 390×844；不代表所有分辨率、浏览器、缩放或真实工作区都已验收。独立演练不提升候选成熟度，接入后填写[采用记录](../../templates/ui/adoption-record-template.md)，回到真实页面验证。

来源说明：[组件 README](../../../packages/web/src/common/route-tabs/README.md)；公共入口缺失反例见[培训案例](../../../docs/training/cases/query-bar-component-extraction.md)。不同宿主应保留操作不变量，替换自己的授权、路由和离开保护。

## 2026-10-03 执行记录

[clean-install-verification.json](clean-install-verification.json) 保存源码、锁文件哈希、版本和实际结果。npm 独立安装 14.6 秒、类型检查 1.5 秒、构建 111.8 秒，均退出 0；node_modules 非符号链接。React/ReactDOM 19.1.1、TypeScript 5.7.3、Vite 5.4.20，无 Tabler 依赖。

Chrome 154.0.8037.95 的桌面与触控视口验证通过，控制台无 error/warning，所有菜单项与页签字体同为 system-ui/sans-serif、12px。触控截图已由本次 AI 执行过程查看，菜单未被宿主容器裁切。Browser plugin not available，使用已有 Playwright。浏览器检查开发服务器，构建另行验证，没有检查 dist 预览。临时服务器已关闭。

运行 `node _methodology/scripts/check-rehearsal-source.mjs _methodology/examples/route-tabs-adoption/clean-install-verification.json` 可比较记录的源码字节。MATCH 不证明目标依赖和环境一致；公共演练脚本扩展会使包含旧脚本哈希的历史记录变为 STALE，保留历史记录并按变更影响复审，不直接覆盖哈希。
## 配置拆分验证补充（2026-10-03）

[recipe-migration-verification.json](recipe-migration-verification.json) 来自公共 runner 改为读取单组件 JSON 后的真实执行。生成入口、tsc（1.3 秒）和 Vite（1.3 秒）均通过，记录自动包含 CMP-08.json、公共工具和 web/package.json 哈希。本次链接源仓库 node_modules，未独立安装、未运行浏览器；不得替代此前 clean-install 和交互记录。旧记录因共享工具变化仍可显示 STALE，历史证据不改写。
