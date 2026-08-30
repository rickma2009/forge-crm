# 002 企业交互模式验证场业务基线

> 状态：ready-for-business-gate-review
> 来源：`REQSRC-007`、`REQSRC-008`

## 文件职责

- `requirement.md`：新定位下可供 Business Gate 评审的业务需求；
- `clarification.md`：已解决决策与后续 Gate 才处理的问题；
- `transformation.md`：来源、旧基线冲突和增量转换记录；
- `business-gate-review.md`：人工 Business Gate 评审清单与结论位置。

## 当前边界

- 本需求包取代 001 作为验证场当前业务基线；001、历史切片和 Gate 证据继续只读保留。
- 本包已完成业务问题收敛，可以提交人工 Business Gate。
- Business Gate 未批准前，不创建切片 002 的 Spec，不准备索引技术方案，不修改验证场功能代码；索引文件与检查器还须等待 Architecture Gate。
