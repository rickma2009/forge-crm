# 需求 009：商机管理与销售过程记录

## 产品工作区与有效期定价修订（2026-09-23）

REQSRC-066 将产品管理扩展为三页签详情工作区，并将报价取价规则修订为按报价日期匹配唯一有效价格。完整产品需求见 [需求 010](../010-product-management/README.md)；本需求中的报价完整规则已同步更新，旧“最新版本取价”实现不再代表当前需求。

## 报价与商品定价增量（2026-09-23）

新增 [商机报价需求包](quotation-and-pricing/README.md)：[需求说明书](quotation-and-pricing/requirement.md)、[现有系统差异](quotation-and-pricing/impact-analysis.md)、[分步交付计划](quotation-and-pricing/plan.md)。来源 REQSRC-062；后续 REQSRC-063 单独授权连续实施，切片 022 已完成本地开发与测试，尚未 Release。以下为原商机基线与历史状态记录。

## 原商机基线

> 状态：`business-approved-continuous-local-implementation-REQSRC-060`  
> 来源：`REQSRC-058`  
> 需求基线：`requirement.md`  
> 交付拆解：`slice-map.md`  
> 执行建议：`delivery-plan.md`

本需求包在复用当前客户、联系人、用户和角色权限对象的前提下，新增产品、竞争对象、商机、商机商品、跟进记录、商机分析以及专用商机模板/阶段能力。

本次用户指令改变了外部 MCRM V2.0 中“不做产品主数据、可配置阶段、把握度和分析记录”的边界，因此必须重新经过本项目 Business Gate。当前文档是可评审草案，不代表 Business、Specification 或 Architecture Gate 已批准，也不授权编码。
