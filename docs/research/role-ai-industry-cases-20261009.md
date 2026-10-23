# 岗位 AI 应用与企业案例研究笔记

检索日期：2026-10-09。用途：支撑[企业 AI 蓝图](../design/digital-employee/enterprise-ai-transformation-plan.md)岗位规划；不是供应商选型结论。

## 1. 证据使用规则

企业自述和供应商客户故事均属公开披露，未由本项目独立审计。产品能力页只证明产品的公开定位；GitHub README 只证明仓库展示的功能，不能证明生产可靠性、企业授权隔离或本公司收益。研究没有下载、运行或评审仓库代码。

案例发布日期以明确可见信息为准；没有日期的不补造。所有岗位优先级都是规划推演，不是本企业需求频率调查结果。外部收益不用于本企业预算测算。

## 2. 企业与产品案例证据

| ID | 企业/来源及类型 | 可确认的公开内容 | 可借鉴内容与限制 |
|---|---|---|---|
| CASE-01 | [奔驰/GitHub 客户故事](https://github.com/customer-stories/mercedes-benz)，供应商客户披露 | 介绍统一研发平台及 Copilot/Copilot Chat 的使用，辅助编码、理解代码和协作 | IDE、代码和评审链结合；采纳代码量不是质量或净提效指标 |
| CASE-02 | [阿里云灵码客户案例](https://lingma.aliyun.com/community/use-cases)，供应商案例集合 | 披露哈啰、亚信、信也、盖雅等研发辅助实践 | 分团队验证编码、测试和知识辅助；不是阿里全公司内部收益证明 |
| CASE-03 | [Morgan Stanley Debrief](https://www.morganstanley.com/press-releases/ai-at-morgan-stanley-debrief-launch)，企业自述，2024-06-26 | 经客户同意辅助会议记录、行动项、邮件初稿和 Salesforce 记录；顾问编辑和决定发送 | 可迁移到销售会议和跟进；不能迁移其金融业务权限或自动发送规则 |
| CASE-04 | [Wiley/Salesforce](https://www.salesforce.com/customer-stories/wiley/)，供应商客户披露 | 描述知识库与 CRM 支撑客服自助、回复草稿、分类和案例总结 | 标准问题自动服务，复杂问题交人工；页面整体 ROI 不可归因于单一 Agent |
| CASE-05 | [IBM AskHR](https://www.ibm.com/case-studies/ibm-askhr)，企业自述 | 常规员工服务与人工顾问分工，连接 Workday/SAP/Concur 等业务系统 | 先简化流程，再自动化；本公司系统和政策须独立盘点 |
| CASE-06 | [Eaton/Microsoft](https://www.microsoft.com/en/customers/story/19830-eaton-microsoft-365-copilot)，供应商客户披露，2024-11-19 | 财务 SOP 文档整理、知识传承和数据访问；客服及销售能力也有推进计划 | SOP 初稿是可独立试点的任务；其中客服响应改善属于预期，不能写为已兑现 |
| CASE-07 | [美的智能体工厂](https://www.midea.com.cn/zh/about-midea/news/_16)，企业自述 | 描述工厂智能体覆盖生产、品质、运维等，并以首检连接研发图纸、物料和品质结果为例 | 学习证据链和业务闭环；依赖工业数据、视觉和现场条件，不能归功于聊天界面 |
| CASE-08 | [西门子 Industrial Copilot](https://press.siemens.com/global/en/pressrelease/siemens-and-microsoft-scale-industrial-ai)，企业新闻，2024-10-24 | 描述工程编程、配置和文档辅助；thyssenkrupp 的全球推广当时为计划 | 工程软件内嵌与人工验证；不能把计划日期当后续已完成事实 |
| CASE-09 | [华为/长安汽车渝北工厂](https://e.huawei.com/cn/case-studies/industries/manufacturing/202412-changan-yubei-new-factory)，供应商客户案例 | IT/OT 数据统一、治理、高级排产和全息质量等建设 | 数据与专用算法优先；属于工业数字化/AI 案例，不证明全流程由 LLM Agent 驱动 |
| CASE-10 | [用友采购云](https://www.yonyou.com/subject/mobile/index.html?code=caigou-liucheng&withYonyouMenu=&zixun=0)，产品能力页 | 展示采购寻源、协同、分析、价格、供应商及合同等智能体分类 | 用于采购岗位任务分解；客户 SRM 成功不等于全部 AI 功能已验证 |
| CASE-11 | [金蝶 AI 产品中心](https://www.kingdee.com/resources/ai-agent)，产品能力页/检索摘要 | 列出应付收票补录、三单匹配和报表编制等能力 | 用于财务候选场景；全文读取受限，不采信未核对的效果数字 |
| CASE-12 | [McKinsey Lilli 发布介绍](https://www.mckinsey.com/about-us/new-at-mckinsey-blog/meet-lilli-our-generative-ai-tool)，企业自述 | 内部知识检索与综合，支持研究、客户服务和专业资料查找 | 知识维护、来源和专家复核；不是无授权访问所有文档 |
| CASE-13 | [McKinsey Lilli 安全声明](https://www.mckinsey.com/about-us/media/statement-on-strengthening-safeguards-within-the-lilli-tool)，企业自述，2026-03-11 | 确认收到漏洞报告并修复；声明调查未发现客户机密被未授权访问的证据 | 成功案例也需检查运行安全；不推断具体漏洞或数据外泄 |

未为了凑知名企业名额将普通社区文章、招聘信息或模型宣传写为腾讯/字节/华为内部全员提效实绩。后续若获取可靠一手资料，再增量加入。

## 3. GitHub 候选参考（按功能，不按热度）

| ID | 仓库 | 公开定位/可参考资产 | 明确不等同于 |
|---|---|---|---|
| OSS-01 | [microsoft/ai-agents-for-beginners](https://github.com/microsoft/ai-agents-for-beginners) | Agent 教学、工具使用、可信和生产主题示例 | 可直接部署的企业产品 |
| OSS-02 | [langgenius/dify](https://github.com/langgenius/dify) | 应用与 Agent 工作流、模型/工具及 RAG 编排 | 自动满足项目 RBAC、业务事务和组织治理 |
| OSS-03 | [infiniflow/ragflow](https://github.com/infiniflow/ragflow) | 文档检索增强与上下文处理 | 权威知识、准确答案或已有业务权限集成 |
| OSS-04 | [stanford-oval/storm](https://github.com/stanford-oval/storm) | 主题研究、知识整理及带引用报告 | 内部受密级约束的研究服务或事实认证 |
| OSS-05 | [microsoft/data-formulator](https://github.com/microsoft/Data-Formulator) | 交互数据探索与可视化 | 企业指标语义层、财务口径及数据权限 |
| OSS-06 | [browser-use/browser-use](https://github.com/browser-use/browser-use) | 基于 Agent 的浏览器任务执行 | 稳定的无人值守 BI 调度及登录授权 |
| OSS-07 | [microsoft/OmniParser](https://github.com/microsoft/OmniParser) | 屏幕解析，供视觉 GUI Agent 参考 | 完整电脑执行器、权限和风险控制 |
| OSS-08 | [anthropics/skills](https://github.com/anthropics/skills) | Skill 结构与可复用任务方法示例 | 调度器、业务服务或可默认商用的全部内容 |

本轮不选用或安装以上仓库。准备采用时固定版本/提交，核对各模块许可证、商用与再分发条件、模型/数据条款、维护和安全记录；分别记录代码许可及部署依赖。Dify 等带附加条件的许可尤须核对，不笼统称为无条件可商用。不同仓库只作为候选，不同时堆入现有系统。

## 4. 可复用结论与验证状态

候选复用：岗位场景卡、评测方法、证据引用、工具契约与运行观测。业务专属部分：客户政策、供应商规则、产品/BOM/批次、审批和发送权限。候选企业资产尚未通过跨项目验证，不写入通用方法论作为已证明标准。
