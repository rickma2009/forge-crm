# KanbanBoard

位置：`packages/web/src/common/KanbanBoard.tsx`，样式同目录 `kanban-board.css`。来源：REQSRC-094/P2商机看板。当前是本项目公共候选组件，仅商机场景验证，不宣称跨项目成熟。

参数：columns提供id/title/summary/items/readOnly/more/loading；rowKey提供稳定ID；render提供卡片内容；canMove提供移动资格；onMove只提出移动意图；onMore按列加载。无网络请求、权限推断或业务状态写入。

接入方必须提供键盘可操作的变更入口、理由确认、版本/幂等校验和权限；只有服务端成功后才能更新业务数据。调用示例见 `showcase/OpportunityKanban.tsx`。商机模板、业务状态、金额口径均在调用方，不进入公共组件。

样式：查询区和工具栏沿用BusinessDirectory；列宽288px、12px间隔、独立纵向滚动、整体横向滚动；字号沿用系统12px；编码链接进入详情，拖动手柄独立避免误打开。停止自由卡片排序；默认每列20条由业务API控制。确认框按统一右下角按钮规范，Escape关闭、Tab焦点限制、取消恢复焦点。

验证：OpportunityKanban.test.tsx覆盖拖动/键盘/取消/冲突/重试/分页；实际页面验收见 docs/testing/opportunity-kanban-p2.md。其他业务复用前需补该业务状态和授权验收。
