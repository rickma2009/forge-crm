# 工作流图组件

正式候选公共组件，用于定义设计与实例进度；不导入 prototypes。

传入服务端版本化 `WorkflowGraph`，节点与边的ID、坐标直接来自同一发布定义。`design` 只改变状态文案，不改变布局。运行时调用方根据真实 visits/tasks/waitingActions 构造 `states` 和 `activeEdges`，不得按列表次序猜测已完成，也不能删除未命中分支。`onSelect`用于展示节点记录，`selected`标识当前查看节点。

状态：pending/current/complete/skipped/returned/rejected/failed/cancelled。支持文字状态、键盘选择、缩放、适配与当前节点定位。调用方负责权限、节点详情及历史轮次；图组件不能判断审批权。

单据接入：主表、明细和附件保持原样，最底部用 DetailSection 标题“工作流”承载本组件及审批记录。正式界面接入在P2.2实施，本阶段仅完成组件及独立验证。

`ControlledWorkflowDesigner` 在同一图形语义上提供受控设计能力：流程按从上到下的方向自动排列，分支在同一层横向展开；可选择节点或连接线，在连接线上插入审批、排他条件或唯一业务动作，并编辑审批职责、连接目标、默认路径和结构化条件。它不提供自由坐标拖动、任意 BPMN 节点或脚本。

证据：`ApprovalProgressDiagram.test.tsx` 验证未执行节点保留、设计与运行坐标一致、键盘访问；`ControlledWorkflowDesigner.test.tsx` 验证自动布局和连接线插入节点。
