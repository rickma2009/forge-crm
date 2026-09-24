# Product Design QA — 企业工作台与主从工作区

- source visual truth: `.scratch/workbench-design-20260905/source-sales-order-and-shell.png`
- workbench screenshot: `.scratch/workbench-design-20260905/workbench-implementation-v2.png`
- master-detail screenshot: `.scratch/workbench-design-20260905/master-detail-implementation-final.png`
- combined comparison: `.scratch/workbench-design-20260905/source-vs-master-detail.png`
- responsive evidence: `.scratch/workbench-design-20260905/master-detail-tablet.png`、`.scratch/workbench-design-20260905/master-detail-mobile-final.png`
- desktop viewport/state: `1440 × 1024`，默认工作队列与首条销售审批选中

## Full-view comparison

本轮不是复制销售订单的业务结构，而是以其门户壳层、密度、令牌、控件尺度和数据表达为视觉事实。并排检查显示：工作台与主从工作区保留同一深色导航、顶栏、多页签、白色工作面、细边框、低圆角、蓝色主操作和紧凑中文排版；布局由订单的“表头—表体”有意转为“发现工作”和“保持队列处理对象”。

## Required fidelity surfaces

- 字体与层级：沿用门户字体栈；标题、说明、业务对象、元数据和状态标签层级清楚，无拥挤断行。
- 布局与间距：个人工作台采用指标—队列—辅助区；主从工作区采用队列—详情—行动上下文。桌面区域对齐，平板将上下文降到下方，窄屏改为单列。
- 色彩与令牌：沿用既有蓝色主色、海军蓝导航、白色表面、中性分隔线及红/黄/绿语义状态。
- 图标与资产：新增界面均使用 `@tabler/icons-react`，没有 emoji、CSS 图形、手绘 SVG 或占位插图。
- 内容：提醒、待办、预警、消息、审批和快捷入口分别表达，不用统一“消息卡片”混淆业务含义。
- 可访问性：搜索、筛选、页签和动作使用语义控件与可读标签；状态反馈使用 live status；键盘焦点沿用浏览器控件顺序。

## Findings and fixes

### Iteration 1 — blocked

- P2 / content：主从工作区紧凑筛选错误显示为“常”，无法表达异常语义。修复为显式短标签映射并补失败优先测试。
- P2 / responsive：窄屏顶栏产品名被压成逐字竖排，且会挤压系统与消息操作。为产品上下文增加不换行和溢出约束，并在窄屏隐藏该重复上下文、收缩系统选择器与用户入口。

### Iteration 2 — passed

桌面并排比较、平板降级和窄屏纵向流程均无 P0/P1/P2 阻断项。移动端仅用于快速查看和轻量动作；深度批量录入仍明确不属于此候选的适用范围。

## Interaction verification

- 主队列筛选为“全部 / 审批 / 跟进 / 异常”，选择库存项后详情、负责人、截止和动态同步更新。
- “30 分钟后提醒”仅产生提醒反馈；“标记完成”将待处理计数从 4 降为 3。
- 工作台“只看待审批”保留销售审批并隐藏库存异常工作项。
- 新建个人待办“确认下周交付计划”后，列表与 live status 同步出现。
- 浏览器控制台错误：0。

## Boundary

本次结果仅证明验证场内的交互和视觉候选可运行；不证明真实数据源、服务端权限、通知渠道、审批状态机、业务价值、项目采用、Release Gate 或正式资产晋升。

final result: passed
