# 公共资产近期变更的工程集成检查

执行日期：2026-10-03。目的：核对公共抽屉、业务 CSS 归属、CSV 模块和库存导出调用经过近期调整后，仍能在实际 Web 工程中通过类型检查。未改变业务需求、服务端逻辑或资产成熟度。

## 本次执行

```sh
pnpm --filter @forge-crm/web typecheck
```

命令实际依次运行 `tsc --noEmit -p tsconfig.app.json` 和 `tsc --noEmit -p tsconfig.node.json`，退出 0。app 配置 include 为 src，包含生产代码及同目录测试文件；本次没有仅用 Vitest 转译代替 TypeScript 检查。使用当前本机依赖，没有重新安装。

直接相关改动包括：DrawerWorkspace 的负 tabIndex 排除和已消费键盘事件处理；AgentAssistantDrawer 显式加载自己的业务 CSS；纯 csv-export.ts 及 grid-export.ts 兼容再导出；库存导出使用公共编码与全量取数函数。实际文件内容以当前工作树为准，本记录不是未来版本的通过证明。

## 不同证据回答不同问题

| 证据 | 实际证明 | 不能据此声称 |
|---|---|---|
| 本次真实 Web 工程 typecheck | 当前工程类型和配置可解析，生产及测试调用能通过静态检查 | 页面操作正确、CSS 没有回归、其他项目可复制 |
| [CSV 单文件演练](../../_methodology/examples/csv-export-adoption/README.md) | 复制到无 node_modules 的临时宿主后可编译，Node 原生 Blob 输出符合样本预期 | 浏览器下载、所有表格软件导入安全、完整导出业务独立 |
| [库存页面与导出测试](current-inventory-acceptance.md) | 模拟接口下筛选、联动、实际 Blob 内容及数量不完整时拒绝下载 | 服务端快照一致、全部历史库存对账 |
| [抽屉焦点回归](drawer-focus-regression.md)与[独立演练](../../_methodology/examples/drawer-workspace-adoption/README.md) | 指定版本的事件/焦点检查与合成宿主浏览器行为 | 背景 inert、滚动锁、多层模态完整支持；后续 CSS 改动已全部重新构建 |
| [抽屉样式归属对比](../../_methodology/examples/drawer-workspace-adoption/style-ownership-verification.json) | 指定合成 DOM 在两视口中的样式/尺寸一致及导出文件归属 | 完整商机页面、后端任务、当前构建产物交互均已复验 |

这些证据不能简单累计成“全面验证通过”。后续改动按影响范围选择最小必要重验，保留旧记录的日期和边界；不通过批量刷新哈希维持绿灯。适用性判断仍由目标项目自己的需求、接口、依赖和验收决定。
