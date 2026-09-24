# 产品基线待确认事项（历史）

> 状态：historical-resolved-for-slice-001
> 批准证据：`REQSRC-002`
> 适用边界：`REQSRC-007` 已重新打开项目级 Business Gate；当前问题见 `../002-validation-field-baseline/clarification.md`。

## Business Gate 已解决事项

| ID | 问题 | 当前建议 | 影响 |
|---|---|---|---|
| `Q-001` | 这个工作台的第一目标用户是谁 | 产品/需求分析人员；兼顾设计和前端 | resolved-business-gate |
| `Q-002` | MVP 首批模式是否只包含双层导航与记录管理工作区 | 是，仅用两个已有验证案例打通闭环 | resolved-business-gate |
| `Q-003` | “不用保存到系统”是否指 Demo 操作不持久化 | 是；模式资产仍在 Git 中版本化 | resolved-business-gate |
| `Q-004` | 右侧只展示原型，还是同时展示总结、配置和源码 | “交互原型 / 模式说明”两个页签；源码和复制配置后置 | resolved-business-gate |
| `Q-005` | 模式选择是否需要搜索、标签和多维筛选 | MVP 提供分类与关键词搜索，不做复杂筛选 | resolved-business-gate |
| `Q-006` | 首期是否明确只支持桌面端 | 桌面优先，窄屏保证可恢复使用 | resolved-business-gate |
| `Q-007` | 谁批准模式进入 `validated-once` 或更高状态 | 由方法论维护者依据项目证据批准；具体人员不阻断首片 | deferred-governance |

## 可后续确认

| ID | 问题 | 当前建议 | 影响 |
|---|---|---|---|
| `Q-008` | 是否支持多个方案并排比较 | 后续独立切片评估 | 影响工作区布局 |
| `Q-009` | 是否需要全屏预览、设备尺寸和主题切换 | 在首个切片验证后决定 | 影响原型容器 |
| `Q-010` | 是否支持复制 Schema、令牌或接入代码 | 后续独立切片评估 | 影响资产分发方式 |
| `Q-011` | Open Design 的哪些具体案例允许作为来源 | 用户提供链接或明确案例后逐一归档 | 影响外部证据范围 |
| `Q-012` | 用户已完成系统将提供源码、部署页面还是截图 | 优先源码，其次可访问页面，截图仅补充 | 影响萃取可信度 |
| `Q-013` | 是否需要在线维护模式内容 | MVP 不做，通过 Git 评审维护 | resolved-business-gate |
| `Q-014` | 技术栈、部署位置和是否独立 Git 仓库 | Business Gate 后进入 Architecture Gate 决策 | 影响项目骨架 |
