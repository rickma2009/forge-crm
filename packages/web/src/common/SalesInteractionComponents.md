# 销售建议、协作与评分组件

状态：本项目候选公共组件，2026-10-04。客户与商机共同采用；没有跨项目成熟度证据。遵循[总样式规范](../../../../_methodology/style-index.md)。

## 组件职责与参数

| 组件 | 输入与事件 | 适用边界 |
|---|---|---|
| `SuggestionPanel` | `items: SalesSuggestion[]`，`onAction(item, ADOPT / IGNORE / SNOOZE)` | 只展示标题、状态、理由、依据时间和可用操作；不计算规则、不直接创建待办 |
| `ScoreBreakdown` | `score: PriorityScore` | 分开显示生效分、系统分、人工覆盖和四项依据；优先级不是成交概率 |
| `RecordCommentPanel` | `items`，`onReply/onEdit/onWithdraw/onHide`，`renderExtra` | 纯文本、作者、时间、版本、一级回复和附件插槽；不生成 HTML、不授权用户 |
| `SalesActionDialog` | `title/children/afterFields/onClose/onSave/saveLabel` | 通用提交与错误保留、忙碌防重、Escape/Tab/焦点恢复；`onSave` 返回 Promise，失败应抛出错误 |

实现：[建议](SuggestionPanel.tsx)、[评分](ScoreBreakdown.tsx)、[评论](RecordCommentPanel.tsx)、[操作弹窗](SalesActionDialog.tsx)。业务适配器分别为 `SalesGuidancePanel`、`PriorityScorePanel`、`RecordCollaborationPanel`、`NotificationPanel`，位于 `showcase`。它们负责接口、分页、草稿、旧请求隔离及对象切换。服务端最终检查权限、版本和来源，不能以按钮隐藏代替授权。

## 统一呈现

- 详情继续复用 `DetailWorkspace` 和下划线式 `DetailTabs`，不新增带框按钮式 Tab。
- Tab 本身是大容器，内容采用留白或细分隔线；建议、评论与评分不嵌套多层卡片。
- 正文、表单和操作按钮沿用全局字号；状态用文字与现有状态样式共同表达，不只依赖颜色。
- 评分分项宽屏两列、窄屏一列，保留理由；“待更新”“未评估”不能假装为零分或最新结果。
- 评论保留换行并按纯文本显示，撤回/隐藏保留占位，回复最多一级；附加内容通过插槽复用附件与加载更多。
- 提及必须显式选人，输入 `@姓名` 不等于已选择接收人；通知只展示当前仍有权读取的内容。
- 评论与通知使用游标“加载更多”，不展示未经完整权限过滤的总条数。

样式集中于 [sales-interaction.css](../showcase/sales-interaction.css)，宿主页需加载该样式。

## 表单组合和错误处理

`children` 放普通字段；拥有自己表单的附件组件必须放在 `afterFields`，不得嵌套 `<form>`。附件上传对话框开启或正在上传时，业务适配层拒绝发送评论，避免未完成附件落后于发布。上传失败保留草稿；评论提交失败保留正文、提及和原请求标识。取消、对象/Tab 切换应保留现有未保存提示机制。

```tsx
<SalesActionDialog
  title="发表评论"
  onClose={closeEditor}
  onSave={publishDraft}
  saveLabel="发送"
  afterFields={<AttachmentPanel {...attachmentProps} />}
>
  <label>内容<textarea value={body} onChange={e => setBody(e.target.value)} /></label>
</SalesActionDialog>
```

示例中的适配函数必须校验附件忙碌状态，并使用服务端返回的草稿 ID、版本和幂等请求 ID。组件不负责这些业务数据。

## 权限与验证

操作能力使用服务端返回的 `canAct/canEdit/canModerate` 等字段；无权限 Tab 不挂载请求。独立的源对象访问检查仍由后端执行。弹窗覆盖键盘循环、嵌套附件对话框事件消费和关闭后恢复焦点；不宣称通用多层模态管理器或全站无障碍审计已完成。

定向测试与浏览器流程见 [P4—P6 交付记录](../../../../docs/testing/sales-enhancement-p4-p6.md)。
