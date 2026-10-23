# DrawerWorkspace 独立接入演练

CMP-11 提供右侧浮层、标题、滚动正文、页脚、关闭请求、基础键盘循环及关闭后的入口焦点恢复。本例使用合成任务，不导入 AgentAssistantDrawer、AI、契约包或后端接口。

## 接入与验证

```sh
node _methodology/scripts/rehearse-query-bar.mjs --component CMP-11 --clean-install
```

在输出临时工程中执行 `./node_modules/.bin/vite preview --host 127.0.0.1 --port 5198 --strictPort`；从源仓库执行 `node _methodology/scripts/verify-drawer-workspace-adoption.mjs http://127.0.0.1:5198/`。浏览器脚本需要已有 Chrome/Playwright，可用 PLAYWRIGHT_MODULE_PATH 指定；结束后关闭预览。使用产物预览不能省略先构建的步骤。

依赖为 React、ReactDOM Portal、Tabler 及自身 CSS；导出后保留相对目录。Portal 挂到 document.body，宿主需要提供页面级字体和令牌，不能只给某个 React 根节点设置样式。agent-* 业务选择器现已移至 AgentAssistantDrawer 显式导入的 agent-assistant-drawer.css；通用抽屉导出不携带该文件。仍应审查 drawer-* 命名、全局字体和业务内容样式，不因这次分离就宣称全部适配问题已解决。

## 责任和限制

- onClose 只是请求，宿主控制 open 和真正卸载。演练用 dirty 拒绝关闭，撤销后才允许关闭；生产项目应采用自己的保存、放弃确认和失败处理。
- 子控件消费 Escape 后外层不应关闭，普通 Escape 请求关闭。负 tabIndex 元素不参与循环；正 tabindex 重排、隐藏/失效元素、Shadow DOM 和多层弹层仍需目标项目验证。
- 关闭恢复之前的入口；若入口移除或被禁用，目标页面需定义回退，不声称组件已自动处理。
- 当前容器不设置背景 inert，也不锁定页面滚动。aria-modal 声明不能替代这些行为。本脚本仅记录 window.scrollTo 能否改变背景位置，不将其当作滚轮或触摸滚动验证。
- 单独关闭抽屉不等于取消后台任务；后台继续、取消、权限和持久化由业务宿主决定。

接入时填写[采用记录](../../templates/ui/adoption-record-template.md)。候选资产状态不因单个合成宿主通过而晋升。

## 实际结果（2026-10-03）

[dist-preview-verification.json](dist-preview-verification.json) 记录独立安装（18.2 秒）、类型检查（1.5 秒）、构建（115.3 秒），均退出 0。Chrome 154.0.8037.95 直接访问 dist 预览，1440×1000 桌面与 390×844 触控均通过真实 Tab/Shift+Tab 循环、子控件消费 Escape、宿主 dirty 拦截关闭、普通关闭及入口焦点恢复。关闭按钮为 32px/44px，页面无横向溢出，pageerror 为空。触控截图已查看，正文、关闭按钮、页脚可见。临时预览服务已关闭。

桌面和触控都观察到 window.scrollTo 将背景从 0 移至 180px，body overflow 为 visible；这与源码未实现滚动锁一致。该观察不是滚轮/触摸穿透或读屏器隔离测试，不能据此声称完整模态可用。后续采用前须按目标宿主补齐背景隔离及层叠策略。

新增 CMP-11.json 无需改变 runner，已有 CMP-08 recipe-migration 记录仍 MATCH。新配置通过自动扫描夹具测试；当前证据检查命令为 `node _methodology/scripts/check-rehearsal-source.mjs _methodology/examples/drawer-workspace-adoption/dist-preview-verification.json`。临时产物可被系统清理，哈希检查也不等于重跑浏览器。

## 业务样式分离验证（2026-10-03）

[style-ownership-verification.json](style-ownership-verification.json) 保存迁移前 CSS 哈希和迁移后源码，以及真实 Chrome 对比结果：桌面 1440×1000、触控 390×844，各 27 个合成元素的全部计算样式和几何位置一致。首轮截图发现夹具遗漏 viewport 导致触控缩放；补齐声明与 innerWidth 断言后完整重跑通过，最终触控截图已查看。6 项组件测试、6 项导出测试通过。

运行方式：迁移前保存原 CSS，再运行 `node _methodology/scripts/verify-drawer-style-ownership.mjs <preserved-before.css>`，可指定现有 PLAYWRIGHT_MODULE_PATH。这是合成 DOM 的 CSS 对比，不是完整 Agent 页面验收；本轮没有重新安装、构建或调用后端。原 dist 记录因 CSS 改变显示 STALE，保留为历史证据；不得用本次样式比对替代全部交互或独立安装复验。
