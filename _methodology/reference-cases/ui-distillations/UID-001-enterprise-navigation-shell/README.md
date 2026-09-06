# UID-001：带底部管理分组的企业导航壳层

> 状态：`candidate-superseded-for-current-target`
> 日期：2026-09-03
> 目标资产：页面壳层、菜单组件、导航主题候选

## 目标

从一个已有企业系统中萃取“上方业务菜单 + 底部管理菜单”的稳定导航结构，替换来源业务文字后用于企业页面模板展示门户。

## 文件

- `source-selection.md`：本轮明确选用与未选用的来源；
- `evidence-matrix.md`：结构、样式、图标和行为的定位证据；
- `distillation.md`：八章萃取报告；
- `candidate/README.md`：去来源化候选说明；
- `candidate/navigation-schema.example.json`：演示门户菜单配置；
- `candidate/navigation-shell.tokens.css`：视觉和密度令牌候选。

## 当前边界

本包尚未接入验证场，未通过新切片 Specification/Architecture Gate，也未产生浏览器交互证据。它不能替代正式模式或模板。

2026-09-04 用户明确取消“系统管理固定在底部”的目标设计。该包继续作为来源事实和反例证据保留，不再作为当前演示门户的候选目标；后续目标由 `UID-002` 承接。
