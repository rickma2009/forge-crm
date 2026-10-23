# 公共抽屉焦点回归

2026-10-03，范围为 DrawerWorkspace 已有关闭与焦点行为；L2 局部修复，不增加业务状态、API 或自动保存。依据为样式规范的 Agent 右侧抽屉统一焦点行为及实际源码。

## 复现与修复

1. 普通按钮设置 tabIndex=-1 后仍被原查询选择器收集。当它位于末尾，真实最后一个 Tab 停留点不再被识别；按 Tab 无法由容器环回首项，Shift+Tab 还会聚焦本应排除的按钮。现在按 DOM tabIndex >= 0 过滤候选项，保留原有可见矩形检查。
2. 内嵌输入或弹层用 preventDefault 处理 Escape 后，冒泡到抽屉仍调用 onClose。现在先检查 defaultPrevented；未消费的 Escape 仍触发原回调，由宿主决定是否确认离开。

新测试首次运行 2 失败、1 通过。修复后执行：

```sh
pnpm --filter @forge-crm/web test -- src/common/DrawerWorkspace.test.tsx src/common/agent/AgentAssistantDrawer.test.tsx
```

两文件共 6 项通过（2.79 秒）。新回归覆盖正反向循环排除负 tabindex、子控件消费 Escape、普通 Escape 仍请求关闭、挂载焦点及卸载恢复触发按钮。既有 AgentAssistantDrawer 三项也通过。

## 证据边界与复用

JSDOM 没有布局，循环测试将 getClientRects 模拟为可见。该测试证明事件分支与焦点候选筛选，不证明真实浏览器 Tab 序、CSS visibility/inert、Shadow DOM、多层抽屉、背景滚动锁定或触发节点移除后的回退。本轮没有浏览器/读屏器验收，也没有实现滚动锁。不要把 aria-modal=true 视为这些能力已经具备。

可复用的是事件消费与焦点归属的判断方法；业务是否可关闭、未保存确认、任务是否继续由宿主控制。候选接入仍需在真实浏览器中逐个按 Tab、Shift+Tab、Escape，并观察背景页面和关闭后的焦点。源码位置：[DrawerWorkspace](../../packages/web/src/common/DrawerWorkspace.tsx)、[回归测试](../../packages/web/src/common/DrawerWorkspace.test.tsx)。

## 后续真实浏览器验证

同日新增 [CMP-11 独立宿主演练](../../_methodology/examples/drawer-workspace-adoption/README.md)，独立安装并构建后，在 Chrome 桌面和触控视口通过上述焦点循环、Escape 消费及关闭恢复，并验证宿主可以拒绝关闭。此补充解除“尚无真实浏览器基本键盘验证”的缺口，不替代嵌入 Agent 页面验收。背景程序化滚动仍可发生（0→180px）；尚无滚动锁、inert、多层弹窗和读屏器证据，继续保留边界。
