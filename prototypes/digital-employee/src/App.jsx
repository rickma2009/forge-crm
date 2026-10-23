import { useMemo, useState } from 'react';
import {
  IconActivity, IconAlertTriangle, IconAssembly, IconBell, IconBolt, IconBox,
  IconBuildingFactory2, IconCalendarDue, IconCheck, IconChevronRight, IconClipboardCheck,
  IconFileAnalytics, IconFilter, IconHistory, IconMail, IconMessage, IconPackage,
  IconPlugConnected, IconRefresh, IconRobot, IconSearch, IconSettings, IconShieldCheck,
  IconSparkles, IconTool, IconTruckDelivery, IconUserCheck, IconUsers, IconX,
  IconWorldSearch, IconChartLine, IconShoppingCart,
} from '@tabler/icons-react';

const nav = [
  ['dashboard', '工作台', IconActivity], ['tasks', '任务中心', IconClipboardCheck],
  ['employees', '数字员工', IconRobot], ['scenarios', '场景中心', IconAssembly],
  ['signals', '外部信号', IconWorldSearch],
  ['confirmations', '待确认', IconUserCheck], ['rules', '规则策略', IconSettings],
  ['integrations', '集成', IconPlugConnected], ['audit', '审计', IconHistory],
];

const initialTasks = [
  { id: 'DE20261007001', title: '客户 RFQ 已解析，6 项关键信息待澄清', employee: '客户需求与报价专员', domain: '销售', object: 'RFQ-84721', risk: '中', status: '待处理', due: '今天 10:30', owner: '周然', trigger: '客户邮件及 3 个附件到达', output: '结构化 RFQ、缺失项清单与回复草稿', action: '向客户发送规格澄清邮件', finding: '已识别 4 个料号和年度需求 36 万件，但缺少工作温度、RoHS 版本、包装方式、目标价、PPAP 等级和试产日期。', evidence: ['邮件 RFQ for Smart Controller', '客户规格书 V2.1', '产品族 CTRL-8', '历史报价 QT20250918012'], plan: ['核对客户及商机', '逐项列出缺失规格', '生成中英文澄清邮件草稿'], requiresApproval: true },
  { id: 'DE20261007002', title: '控制板报价成本受铜价与汇率影响', employee: '客户需求与报价专员', domain: '报价', object: 'QT-DRAFT-1027', risk: '高', status: '待确认', due: '今天 11:00', owner: '刘颖', trigger: 'RFQ 技术评审完成', output: '成本分解、毛利风险与报价单草稿', action: '确认成本假设并生成正式报价', finding: '按当前铜价及 USD/CNY 口径，材料成本较上次报价增加 3.8%；若维持目标价，预计毛利率低于审批线 1.6 个百分点。', evidence: ['BOM CTRL-8 V5', '供应商有效报价 12 份', '上期所铜行情 09:45', '记账汇率 7.12', '目标毛利规则'], plan: ['锁定行情与汇率时间点', '列出 3 项未报价物料', '比较三种报价有效期方案', '提交毛利例外审批'], requiresApproval: true },
  { id: 'DE20261007003', title: '采购订单未回签，可能影响齐套日', employee: '电子物料采购专员', domain: '采购', object: 'PO202610060018', risk: '高', status: '待处理', due: '今天 11:30', owner: '林薇', trigger: '采购订单发出 24 小时未确认', output: '交期差异、影响订单及催办草稿', action: '向供应商发送交期确认邮件，并通知计划员', finding: '供应商未确认 MCU 的 10 月 15 日交期；当前承诺晚于生产齐套日 2 天，影响销售订单 SO202610050012。', evidence: ['采购订单 PO202610060018', '供应商往来邮件', '工单 MO202610070006', 'MCU 库存与在途'], plan: ['核对可用库存与替代料', '生成供应商催办邮件', '提醒计划员评估排程影响'], requiresApproval: true },
  { id: 'DE20261007004', title: '三张工单缺料，已计算最早齐套日', employee: '订单交付协调员', domain: '计划', object: 'KIT-20261007-A', risk: '高', status: '处理中', due: '今天 12:00', owner: '方哲', trigger: '每日 08:00 齐套巡检', output: '缺料清单、最早齐套日与订单影响', action: '提交挪料与交付优先级调整方案', finding: '连接器 J12 缺 1,200 件、MCU-U7 缺 600 件；最早齐套日为 10 月 12 日，涉及 3 张工单和 2 张客户订单。', evidence: ['工单需求展开', '法人+仓库+批次库存', '采购在途', '替代料规则', '销售订单优先级'], plan: ['排除冻结与待检库存', '核对替代料授权', '比较挪料与拆单方案', '提交计划员确认'], requiresApproval: true },
  { id: 'DE20261007005', title: 'SMT 二线换线准备缺少首件程序签核', employee: '生产运营专员', domain: '生产', object: 'CHANGEOVER-SMT2-046', risk: '中', status: '待处理', due: '今天 13:20', owner: '赵诚', trigger: '换线前 90 分钟门禁检查', output: '换线准备检查表与缺项责任人', action: '通知工艺工程师完成程序与首件签核', finding: '物料、钢网、飞达和治具已齐套；程序 PGM-CTRL8-V5 尚未签核，首件检查表缺少 AOI 黄金样本版本。', evidence: ['排程 SMT2', '料站表 V5', '程序库', '钢网/治具台账', '首件检查标准'], plan: ['锁定生产版本', '核对程序校验值', '补齐 AOI 黄金样本', '班组长复核后放行换线'], requiresApproval: true },
  { id: 'DE20261007006', title: 'AOI 桥连缺陷连续上升，需要工程复核', employee: '质量追溯专员', domain: '质量', object: 'YIELD-SMT2-1007', risk: '高', status: '待处理', due: '今天 13:40', owner: '陈敏', trigger: '缺陷率连续三批超过预警线', output: '缺陷 Pareto、关联线索与复检队列', action: '创建质量异常并建议隔离两个批次', finding: 'U7 焊桥缺陷从 0.18% 上升至 0.74%，集中在 SMT2、夜班及锡膏批次 SP-0929-03；模型只给出关联线索，尚未确认根因。', evidence: ['SPI/AOI 明细', '回流炉温曲线', '锡膏批次 SP-0929-03', '设备与班次', '返修记录'], plan: ['复核 AOI 伪缺陷', '抽查 SPI 与炉温曲线', '比较其他线体同物料表现', '质量工程师确认隔离范围'], requiresApproval: true },
  { id: 'DE20261007007', title: '批次 B20260928007 影响范围已完成追溯', employee: '质量追溯专员', domain: '质量', object: 'TRACE-B20260928007', risk: '高', status: '待确认', due: '今天 14:00', owner: '陈敏', trigger: '客户投诉录入序列号', output: '正反向追溯图、在库和已交付影响范围', action: '确认隔离建议并创建 8D 问题单', finding: '追溯到 3 张销售出库单、2 个客户、320 件在库和 80 件在途；关键物料来自同一供应商批次。', evidence: ['客户投诉与序列号', '成品/物料批次谱系', '检验记录 IQC-0928-17', '销售出库与物流', '当前库存'], plan: ['冻结在库 320 件', '拦截在途 80 件', '通知客户经理', '创建 8D 草稿'], requiresApproval: true },
  { id: 'DE20261007008', title: '海外客户 RMA 已形成 8D 初稿', employee: '质量追溯专员', domain: '售后', object: 'RMA20261007009', risk: '中', status: '处理中', due: '今天 15:00', owner: '何静', trigger: 'RMA 附件与测试日志上传', output: '失效模式、验证计划、8D 与客户回复草稿', action: '提交质量工程师复核并准备客户回复', finding: '现象与历史“高温重启”案例相似，但当前证据不足以确认根因；已列出电源纹波、焊点和固件三个验证方向。', evidence: ['RMA 图片/视频', '客户测试日志', 'FCT 数据', '历史 8D-2025-031', '固件版本记录'], plan: ['验证样品身份与保修状态', '建立失效分析任务', '引用追溯结果', '生成不含根因承诺的回复草稿'], requiresApproval: true },
  { id: 'DE20261007009', title: '18 项呆滞物料存在可消耗路径', employee: '库存与物流专员', domain: '仓储', object: 'SLOWMOVING-202610', risk: '中', status: '待处理', due: '今天 16:00', owner: '孙启', trigger: '月度库存健康巡检', output: '呆滞原因、可消耗工单与处置建议', action: '提交调拨、退供和报废候选清单', finding: '总金额 43.6 万元；其中 18 项可由未来订单或已批准替代料消耗，7 项与已停用版本相关。', evidence: ['库存库龄', '未来 90 天需求', 'BOM 使用关系', 'ECN 切换记录', '供应商退货条款'], plan: ['排除客户专用料', '匹配替代关系', '计算跨仓调拨成本', '分类提交责任部门'], requiresApproval: true },
  { id: 'DE20261007010', title: '电商平台出现集中“连接不稳定”差评', employee: '电商客户运营专员', domain: '电商', object: 'VOC-SKU-C8-1007', risk: '高', status: '待处理', due: '今天 16:20', owner: '罗清', trigger: '近 2 小时同主题负面评论达到阈值', output: '评论主题、关联订单/批次与回复草稿', action: '升级产品质量复核并生成平台回复草稿', finding: '已授权店铺新增 23 条相关评论，集中于 SKU-C8 与固件 2.3.1；其中 5 条包含断连视频，物流与包装未见共同特征。', evidence: ['抖店/天猫授权评论', '订单与 SN', '售后工单', '固件版本', '知识库答复'], plan: ['去重并识别真实订单', '按固件与批次聚类', '创建质量复核任务', '生成不承诺赔付的回复草稿'], requiresApproval: true },
  { id: 'DE20261007011', title: '供应商外部风险信号需要采购复核', employee: '品牌与外部风险专员', domain: '风险', object: 'RISK-SUP-0048', risk: '中', status: '待处理', due: '明天 10:00', owner: '梁月', trigger: '公开风险源命中供应商实体', output: '来源链接、实体匹配与受影响料号', action: '创建供应商风险复核任务', finding: '公开信息显示供应商生产基地所在地区发布强降雨红色预警；内部有 6 张未交采购订单，但尚无停产事实。', evidence: ['官方气象预警', '供应商主数据', '采购未交订单', '单一来源物料', '安全库存'], plan: ['人工确认实体与地点', '询问供应商实际影响', '评估安全库存天数', '必要时启动备选供应商'], requiresApproval: false },
  { id: 'DE20261007012', title: '铜价与 USD/CNY 波动触发成本敞口提醒', employee: '市场价格风险专员', domain: '市场风险', object: 'MARKET-20261007', risk: '中', status: '已完成', due: '已完成', owner: '顾衡', trigger: '官方行情达到预设变化阈值', output: '行情来源、敞口测算和敏感性日报', action: '查看材料与汇率敞口日报', finding: '铜价周涨幅触发 3% 阈值；未来 60 天未锁价铜材采购敞口约 286 万元，USD 应收净敞口可部分对冲。', evidence: ['上期所延迟行情', '人民银行/记账汇率', '未交采购订单', '有效报价与销售订单', '敞口口径 V1.2'], plan: ['已保存来源与时间', '已按合同币种计算敞口', '已生成情景分析', '未产生任何交易指令'], requiresApproval: false },
];

const initialEmployees = [
  ['客户需求与报价专员', '销售', 'RFQ 解析、规格澄清、报价成本与订单变更影响', '邮件 / CRM / BOM / 报价 / 行情', '运行中', '92%'],
  ['订单交付协调员', '计划', '订单风险、齐套日期、排程影响与物流异常协同', '订单 / BOM / 库存 / 产能 / 物流', '运行中', '89%'],
  ['电子物料采购专员', '采购', '供应商报价归一、订单确认、交期与供应风险', '邮件 / 采购 / 供应商 / 库存', '运行中', '90%'],
  ['工程变更协调员', '工程', 'BOM/ECN 影响、元器件合规与试产准备门禁', 'PLM / BOM / 工艺 / 库存 / 订单', '试运行', '83%'],
  ['生产运营专员', '生产', 'SMT 换线、交班、工单偏差与异常闭环', 'MES / 工单 / 安灯 / SOP / 设备', '运行中', '94%'],
  ['质量追溯专员', '质量', '良率分析、批次追溯、客诉 RMA 与 8D', 'QMS / AOI / 批次 / 工艺 / 客诉', '运行中', '91%'],
  ['库存与物流专员', '仓储', '事务差异、循环盘点、呆滞效期与履约异常', 'WMS / 库存 / 流水 / 承运商', '运行中', '88%'],
  ['设备健康专员', '设备', '告警归并、维修知识、备件与保养周期建议', 'EAM / IoT / 备件 / 文档', '试运行', '82%'],
  ['财务核对专员', '财务', '三单匹配、毛利变化、回款与费用异常', '发票 / 订单 / 收货 / 成本 / 应收', '试运行', '85%'],
  ['电商客户运营专员', '电商', '多平台订单、客服、售后、评论和物流异常', '平台 API / OMS / CRM / 物流', '运行中', '88%'],
  ['品牌与外部风险专员', '风险', '品牌舆情、供应商公开风险和客户信用线索', '授权舆情 / 工商 / CRM / 供应商', '试运行', '79%'],
  ['市场价格风险专员', '市场风险', '材料行情、汇率、采购和报价敞口日报', '官方行情 / 汇率 / 采购 / 报价', '运行中', '93%'],
].map((row, index) => ({ id: index + 1, name: row[0], domain: row[1], description: row[2], sources: row[3], status: row[4], success: row[5] }));

const scenarios = [
  { code:'ES-01', name:'客户 RFQ 解析与规格澄清', domain:'销售', maturity:'草稿协同', trigger:'客户邮件或附件到达', output:'结构化 RFQ、缺失项、回复草稿', sources:'邮件、客户、产品、历史报价', control:'承诺价格、交期及对外发送需确认' },
  { code:'ES-02', name:'报价成本与毛利风险汇总', domain:'报价', maturity:'受控执行', trigger:'RFQ 技术评审完成', output:'成本分解、敏感性、报价单草稿', sources:'BOM、采购价、工艺、行情、汇率', control:'成本口径、毛利例外与正式报价需审批' },
  { code:'EP-02', name:'采购订单确认与交期跟催', domain:'采购', maturity:'草稿协同', trigger:'订单超时未回签或交期变化', output:'差异清单、影响订单、催办草稿', sources:'邮件、采购订单、供应商、库存', control:'订单变更及对外催办需确认' },
  { code:'EM-01', name:'工单齐套与缺料影响分析', domain:'计划', maturity:'只读建议', trigger:'定时巡检或工单释放', output:'缺料、最早齐套日、方案比较', sources:'订单、BOM、库存、采购、替代料', control:'挪料、替代和计划变更需审批' },
  { code:'EM-03', name:'SMT 换线准备门禁检查', domain:'生产', maturity:'草稿协同', trigger:'换线前预设时间', output:'齐套检查表、缺项和责任人', sources:'排程、程序、钢网、飞达、首件标准', control:'程序下发和首件放行不可自动执行' },
  { code:'EQ-01', name:'AOI/SPI 不良聚类与良率早报', domain:'质量', maturity:'只读建议', trigger:'缺陷率或趋势越界', output:'Pareto、关联线索、复检队列', sources:'SPI、AOI、ICT/FCT、工艺参数', control:'根因和合格判定由质量工程师确认' },
  { code:'EQ-02', name:'序列号与批次正反向追溯', domain:'质量', maturity:'受控执行', trigger:'投诉、异常或人工输入 SN', output:'追溯图和在库/在途/已交付范围', sources:'批次谱系、工单、检验、出库、物流', control:'冻结、召回和客户通知必须审批' },
  { code:'EQ-03', name:'客诉、RMA 与 8D 协同', domain:'售后', maturity:'草稿协同', trigger:'客诉或 RMA 建立', output:'失效模式、验证计划、8D/回复草稿', sources:'客诉、测试、追溯、历史 8D', control:'根因、责任、赔付与回复需确认' },
  { code:'EW-03', name:'呆滞、超储与效期风险分析', domain:'仓储', maturity:'只读建议', trigger:'日/月度库存健康巡检', output:'原因、消耗路径、处置建议', sources:'库龄、需求、BOM、ECN、退供条款', control:'报废、退供和跨法人调拨需审批' },
  { code:'EC-03', name:'电商评论与用户之声分析', domain:'电商', maturity:'草稿协同', trigger:'授权平台新评论或主题聚集', output:'翻译、情感主题、批次关联、回复草稿', sources:'平台 API、订单、SN、售后、知识库', control:'公开回复、退款和补偿需确认' },
  { code:'MR-01', name:'品牌舆情与供应商风险雷达', domain:'风险', maturity:'只读建议', trigger:'公开信号命中企业实体', output:'来源、实体匹配、影响对象和复核任务', sources:'授权舆情、官方公告、客户/供应商主数据', control:'外部信号仅作线索，回应和冻结需审批' },
  { code:'MK-01', name:'材料行情与汇率敞口日报', domain:'市场风险', maturity:'只读建议', trigger:'定时或行情达到阈值', output:'来源时间、趋势、敞口和敏感性', sources:'官方/授权行情、汇率、采购、报价', control:'不得自动生成交易或套保指令' },
];

const rules = [
  ['RFQ 缺失项阻断', '必填技术/商务字段缺失≥1', '生成澄清清单，不进入正式报价', 'L2', '启用'],
  ['供应商交期风险升级', '承诺交期晚于齐套日或 24 小时未回复', '生成催办草稿 + 通知计划员', 'L2', '启用'],
  ['良率异常升级', '同缺陷连续三批超过控制线', '建立质量复核 + 计算候选隔离范围', 'L3', '启用'],
  ['集中差评预警', '2 小时内同 SKU 同主题负评≥10', '关联订单/SN + 转质量与客服', 'L2', '启用'],
  ['行情敞口提醒', '材料周变化≥3%或汇率变化≥1%', '生成敞口日报，不执行交易', 'L1', '启用'],
];

const externalSignals = [
  { type:'材料行情', signal:'铜主力周涨幅达到 3.2%', source:'上海期货交易所延迟行情', time:'09:45', impact:'未锁价铜材采购敞口 286 万元', risk:'中', object:'MARKET-20261007', task:'DE20261007012' },
  { type:'汇率', signal:'USD/CNY 较报价基准变化 0.9%', source:'人民银行中间价 / 企业记账汇率', time:'09:20', impact:'影响 7 份有效外币报价', risk:'低', object:'FX-USD-1007', task:'DE20261007012' },
  { type:'电商评论', signal:'SKU-C8 “连接不稳定”主题快速上升', source:'抖店、天猫已授权店铺', time:'09:38', impact:'23 条评论、19 个订单、2 个批次', risk:'高', object:'VOC-SKU-C8-1007', task:'DE20261007010' },
  { type:'物流', signal:'4 个包裹超过承运商节点 SLA', source:'顺丰 / DHL 授权轨迹', time:'09:31', impact:'2 个客户订单存在延误风险', risk:'中', object:'LOG-EXCEPTION-38', task:'DE20261007004' },
  { type:'供应风险', signal:'供应商所在地强降雨红色预警', source:'官方气象预警', time:'08:50', impact:'6 张未交采购订单，需核实实际影响', risk:'中', object:'RISK-SUP-0048', task:'DE20261007011' },
  { type:'品牌舆情', signal:'未发现达到升级阈值的新话题', source:'授权新闻与公开渠道', time:'09:40', impact:'近 24 小时 128 条有效信号已去重', risk:'低', object:'BRAND-DAILY-1007', task:'DE20261007011' },
];

function Badge({ children, tone = '' }) { return <span className={`de-badge ${tone}`}>{children}</span>; }
function Risk({ value }) { return <Badge tone={value === '高' ? 'danger' : value === '中' ? 'warning' : 'success'}>{value}风险</Badge>; }
function Status({ value }) { return <Badge tone={value === '待确认' ? 'warning' : value === '已完成' ? 'success' : value === '已驳回' ? 'danger' : value === '处理中' ? 'info' : ''}>{value}</Badge>; }

export default function App() {
  const embedded = new URLSearchParams(location.search).get('embedded') === '1';
  const [active, setActive] = useState('dashboard');
  const [tasks, setTasks] = useState(initialTasks);
  const [employees, setEmployees] = useState(initialEmployees);
  const [selected, setSelected] = useState(null);
  const [keyword, setKeyword] = useState('');
  const [domain, setDomain] = useState('全部');
  const [toast, setToast] = useState('');
  const [suggested, setSuggested] = useState(new Set());
  const [modal, setModal] = useState(null);
  const [logs, setLogs] = useState([
    ['09:42:18', '采购协同员', '读取采购订单 PO202610060018 与供应商邮件', '成功'],
    ['09:38:06', '质量追溯助手', '完成批次 B20260928007 影响范围计算', '成功'],
    ['09:25:11', '生产运营助手', '生成 B 班交班摘要并通知主管', '成功'],
    ['08:55:02', '库存运营助手', '盘点差异任务转交仓库负责人', '人工接管'],
  ]);
  const filtered = useMemo(() => tasks.filter((task) => (domain === '全部' || task.domain === domain) && (!keyword || `${task.id}${task.title}${task.object}`.toLowerCase().includes(keyword.toLowerCase()))), [tasks, domain, keyword]);
  const pending = tasks.filter((task) => task.status === '待确认').length;
  const high = tasks.filter((task) => task.risk === '高' && task.status !== '已完成').length;

  const notify = (message) => { setToast(message); window.setTimeout(() => setToast(''), 2200); };
  const updateTask = (id, status) => {
    setTasks((current) => current.map((task) => task.id === id ? { ...task, status } : task));
    setSelected((current) => current?.id === id ? { ...current, status } : current);
    setLogs((current) => [[new Date().toLocaleTimeString('zh-CN', { hour12: false }), selected?.employee ?? '数字员工', `${id} 状态更新为${status}`, status === '已驳回' ? '人工驳回' : '成功'], ...current]);
  };

  return <div className={`digital-prototype ${embedded ? 'embedded' : ''}`}>
    {!embedded && <header className="de-standalone"><div><IconRobot size={22}/><strong>制造业数字员工</strong><Badge>交互原型</Badge></div><span>模拟数据 · 不执行真实业务动作</span></header>}
    <section className="de-page-head"><div><p>DIGITAL WORKFORCE</p><h1>数字员工工作台</h1><span>把跨系统信息整理成可审阅、可确认、可追溯的制造业务任务</span></div><div className="de-head-actions"><button type="button" onClick={() => notify('已刷新原型数据状态')}><IconRefresh size={16}/>刷新</button><button type="button" className="is-primary" onClick={() => { setActive('employees'); notify('已进入数字员工管理'); }}><IconRobot size={16}/>管理数字员工</button></div></section>
    <nav className="de-tabs" aria-label="数字员工功能导航">{nav.map(([key, label, Glyph]) => <button type="button" key={key} aria-current={active === key ? 'page' : undefined} onClick={() => setActive(key)}><Glyph size={16}/>{label}{key === 'confirmations' && pending > 0 && <b>{pending}</b>}</button>)}</nav>
    <main className="de-main">
      {active === 'dashboard' && <Dashboard tasks={tasks} employees={employees} onTask={setSelected} onOpen={setActive} pending={pending} high={high}/>} 
      {active === 'tasks' && <TaskCenter tasks={filtered} keyword={keyword} setKeyword={setKeyword} domain={domain} setDomain={setDomain} onTask={setSelected} onCreate={() => setModal({ type:'new-task' })} onView={() => notify('当前视图已打开：我的待处理任务')}/>} 
      {active === 'employees' && <EmployeeCenter rows={employees} onCreate={() => setModal({ type:'new-employee' })} onConfig={(row) => setModal({ type:'employee', row })} onToggle={(id) => { setEmployees((rows) => rows.map((row) => row.id === id ? { ...row, status: row.status === '运行中' ? '已暂停' : '运行中' } : row)); notify('数字员工运行状态已更新（原型）'); }}/>} 
      {active === 'scenarios' && <ScenarioCenter onCard={(row) => setModal({ type:'scenario', row })} onAssess={(row) => setModal({ type:'assessment', row })}/>}
      {active === 'signals' && <ExternalSignalCenter onTask={(taskId) => { const match = tasks.find((task) => task.id === taskId); if (match) setSelected(match); }}/>} 
      {active === 'confirmations' && <ConfirmationCenter tasks={tasks.filter((task) => task.status === '待确认')} onTask={setSelected}/>} 
      {active === 'rules' && <RuleCenter onCreate={() => setModal({ type:'new-rule' })} onOpen={(row) => setModal({ type:'rule', row })}/>}
      {active === 'integrations' && <IntegrationCenter onCreate={() => setModal({ type:'new-integration' })} onOpen={(row) => setModal({ type:'integration', row })}/>}
      {active === 'audit' && <AuditCenter logs={logs} onExport={() => notify('审计记录导出任务已生成（原型）')}/>} 
    </main>
    {selected && <TaskDrawer task={selected} hasSuggestion={suggested.has(selected.id)} onEvidence={(item) => setModal({ type:'evidence', row:{ name:item, task:selected } })} onClose={() => setSelected(null)} onSuggest={() => { setSuggested((old) => new Set(old).add(selected.id)); notify('已生成结构化建议，未执行任何外部动作'); }} onSubmit={() => { updateTask(selected.id, '待确认'); notify('已提交人工确认'); }} onConfirm={() => { updateTask(selected.id, '已完成'); notify('模拟执行完成，已写入审计记录'); }} onReject={() => { updateTask(selected.id, '已驳回'); notify('已驳回，数字员工不会执行该计划'); }}/>} 
    {modal && <PrototypeModal modal={modal} scenarios={scenarios} employees={employees} onChange={setModal} onClose={() => setModal(null)} onNotify={notify} onCreateTask={(scene, object) => { const task = { id:`DE20261007${String(tasks.length + 1).padStart(3,'0')}`, title:`人工发起：${scene.name}`, employee:'待分配数字员工', domain:scene.domain, object:object || '未关联', risk:'低', status:'待处理', due:'今天 18:00', owner:'当前用户', trigger:'用户从任务中心发起', output:scene.output, action:'生成场景处理建议', finding:'任务已建立，等待数字员工读取授权数据并生成建议。', evidence:['用户输入', `场景定义 ${scene.code}`], plan:['校验业务对象', '读取授权数据', '生成结构化建议'], requiresApproval:false }; setTasks((rows) => [task, ...rows]); setModal(null); notify(`已创建任务 ${task.id}`); }}/>} 
    {toast && <div className="de-toast" role="status"><IconCheck size={16}/>{toast}</div>}
  </div>;
}

function Dashboard({ tasks, employees, onTask, onOpen, pending, high }) {
  const open = tasks.filter((task) => !['已完成', '已驳回'].includes(task.status));
  const running = employees.filter((row) => row.status === '运行中');
  return <>
    <section className="de-metrics">
      <Metric icon={IconClipboardCheck} label="待处理任务" value={open.length} note="2 项将在 2 小时内到期" tone="blue"/>
      <Metric icon={IconUserCheck} label="等待我确认" value={pending} note="正式动作不会自动执行" tone="amber"/>
      <Metric icon={IconAlertTriangle} label="高风险事项" value={high} note="按交付、质量和客户影响排序" tone="red"/>
      <Metric icon={IconRobot} label="运行中员工" value={running.length} note={`共 ${employees.length} 个岗位员工`} tone="green"/>
    </section>
    <section className="de-dashboard-grid">
      <div className="de-panel de-task-panel"><PanelHead title="需要我处理" note="按风险与截止时间排序" action="全部任务" onAction={() => onOpen('tasks')}/><TaskTable rows={open.slice(0, 4)} onTask={onTask}/></div>
      <div className="de-panel"><PanelHead title="今日运营态势" note="来自当前模拟业务快照"/><div className="de-situation">
        <Situation icon={IconTruckDelivery} title="订单交付" value="3 项风险" text="1 张销售订单受供应商延期影响" tone="warning"/>
        <Situation icon={IconPackage} title="物料供应" value="2 项缺料" text="控制板与连接器需计划员复核" tone="warning"/>
        <Situation icon={IconShieldCheck} title="质量" value="1 项升级" text="批次 B20260928007 等待隔离确认" tone="danger"/>
        <Situation icon={IconShoppingCart} title="电商口碑" value="1 项升级" text="SKU-C8 集中差评已关联订单和批次" tone="danger"/>
        <Situation icon={IconChartLine} title="市场信号" value="2 项关注" text="铜价和 USD/CNY 已进入成本敞口日报" tone="warning"/>
        <Situation icon={IconTool} title="设备" value="运行正常" text="近 4 小时无停线级告警" tone="success"/>
      </div></div>
      <div className="de-panel de-span-2"><PanelHead title="运行中的数字员工" note="最近 24 小时处理 126 项任务，人工接管 4 项" action="管理" onAction={() => onOpen('employees')}/><div className="de-employee-strip">{running.map((row) => <article key={row.id}><div className="de-avatar"><IconRobot size={18}/></div><div><strong>{row.name}</strong><span>{row.domain} · 成功率 {row.success}</span></div><Badge tone="success">运行中</Badge></article>)}</div></div>
    </section>
  </>;
}

function Metric({ icon: Glyph, label, value, note, tone }) { return <article className={`de-metric ${tone}`}><div><Glyph size={19}/></div><section><span>{label}</span><strong>{value}</strong><small>{note}</small></section></article>; }
function PanelHead({ title, note, action, onAction }) { return <header className="de-panel-head"><div><h2>{title}</h2><span>{note}</span></div>{action && <button type="button" onClick={onAction}>{action}<IconChevronRight size={15}/></button>}</header>; }
function Situation({ icon: Glyph, title, value, text, tone }) { return <article><div className={tone}><Glyph size={18}/></div><section><strong>{title}<Badge tone={tone}>{value}</Badge></strong><p>{text}</p></section></article>; }

function TaskCenter({ tasks, keyword, setKeyword, domain, setDomain, onTask, onCreate, onView }) {
  const [status, setStatus] = useState('全部状态');
  const rows = tasks.filter((task) => status === '全部状态' || task.status === status);
  return <div className="de-panel de-full"><header className="de-section-title"><div><h2>任务中心</h2><p>统一查看数字员工发现、分析、确认和执行的任务</p></div><button className="is-primary" type="button" onClick={onCreate}><IconSparkles size={16}/>发起协同任务</button></header><form className="de-query" onSubmit={(event) => event.preventDefault()}><label>任务搜索<input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="任务编号 / 业务对象 / 标题"/></label><label>业务领域<select value={domain} onChange={(event) => setDomain(event.target.value)}>{['全部','销售','报价','采购','计划','生产','质量','售后','仓储','电商','风险','市场风险'].map((item) => <option key={item}>{item}</option>)}</select></label><label>状态<select value={status} onChange={(event) => setStatus(event.target.value)}><option>全部状态</option><option>待处理</option><option>处理中</option><option>待确认</option><option>已完成</option></select></label><div><button type="button" onClick={() => { setKeyword(''); setDomain('全部'); setStatus('全部状态'); }}>重置</button><button className="is-primary" type="submit"><IconSearch size={16}/>查询</button></div></form><div className="de-table-toolbar"><button type="button" onClick={onView}><IconFilter size={15}/>当前视图</button><span>共 {rows.length} 条</span></div><TaskTable rows={rows} onTask={onTask}/><footer className="de-pagination"><span>共 {rows.length} 条 · 第 1 / 1 页</span><button disabled>首页</button><button disabled>上一页</button><button disabled>下一页</button><button disabled>末页</button></footer></div>;
}

function TaskTable({ rows, onTask }) { return <div className="de-table-wrap"><table><thead><tr><th>任务编号</th><th>任务</th><th>数字员工</th><th>业务对象</th><th>风险</th><th>状态</th><th>责任人</th><th>截止时间</th></tr></thead><tbody>{rows.map((task) => <tr key={task.id}><td><button className="de-link" type="button" onClick={() => onTask(task)}>{task.id}</button></td><td>{task.title}</td><td>{task.employee}</td><td>{task.object}</td><td><Risk value={task.risk}/></td><td><Status value={task.status}/></td><td>{task.owner}</td><td>{task.due}</td></tr>)}</tbody></table></div>; }

function EmployeeCenter({ rows, onToggle, onCreate, onConfig }) { return <div className="de-panel de-full"><header className="de-section-title"><div><h2>数字员工</h2><p>每个员工都有明确岗位目标、数据范围、工具权限、责任人和指标</p></div><button type="button" className="is-primary" onClick={onCreate}><IconRobot size={16}/>新增数字员工</button></header><div className="de-employee-grid">{rows.map((row) => <article key={row.id}><header><div className="de-avatar"><IconRobot size={20}/></div><div><h3>{row.name}</h3><span>{row.domain}数字员工</span></div><Status value={row.status}/></header><p>{row.description}</p><dl><div><dt>数据与系统</dt><dd>{row.sources}</dd></div><div><dt>近30日成功率</dt><dd>{row.success}</dd></div></dl><footer><button type="button" onClick={() => onConfig(row)}><IconSettings size={15}/>配置</button><button type="button" disabled={row.status === '规划中'} onClick={() => onToggle(row.id)}>{row.status === '运行中' ? '暂停' : '启用'}</button></footer></article>)}</div></div>; }

function ScenarioCenter({ onCard, onAssess }) { const [filter, setFilter] = useState('全部'); const rows = scenarios.filter((row) => filter === '全部' || row.domain === filter); return <div className="de-panel de-full"><header className="de-section-title"><div><h2>电子制造场景中心</h2><p>每个场景明确触发、证据、交付物和人工控制点</p></div><select aria-label="场景业务领域" value={filter} onChange={(event) => setFilter(event.target.value)}>{['全部','销售','报价','采购','计划','生产','质量','售后','仓储','电商','风险','市场风险'].map((item) => <option key={item}>{item}</option>)}</select></header><div className="de-scenario-grid">{rows.map((row) => <article key={row.code}><header><Badge>{row.code}</Badge><Badge>{row.domain}</Badge><Badge tone={row.maturity === '受控执行' ? 'warning' : row.maturity === '草稿协同' ? 'info' : 'success'}>{row.maturity}</Badge></header><h3>{row.name}</h3><dl className="de-scenario-detail"><div><dt>触发</dt><dd>{row.trigger}</dd></div><div><dt>交付物</dt><dd>{row.output}</dd></div><div><dt>证据</dt><dd>{row.sources}</dd></div><div><dt>控制点</dt><dd>{row.control}</dd></div></dl><footer><button type="button" onClick={() => onCard(row)}>查看场景卡</button><button type="button" className="is-primary" onClick={() => onAssess(row)}>启用评估</button></footer></article>)}</div></div>; }

function ExternalSignalCenter({ onTask }) { const [filter, setFilter] = useState('全部'); const types = ['全部', ...new Set(externalSignals.map((row) => row.type))]; const rows = externalSignals.filter((row) => filter === '全部' || row.type === filter); return <div className="de-panel de-full"><header className="de-section-title"><div><h2>外部信号</h2><p>统一查看授权平台、官方公告、物流、行情与汇率；外部信号只作为可追溯的业务线索</p></div><select aria-label="外部信号类型" value={filter} onChange={(event) => setFilter(event.target.value)}>{types.map((item) => <option key={item}>{item}</option>)}</select></header><div className="de-signal-summary"><article><IconWorldSearch size={20}/><div><span>有效信号</span><strong>{externalSignals.length}</strong></div></article><article><IconAlertTriangle size={20}/><div><span>高风险</span><strong>{externalSignals.filter((row) => row.risk === '高').length}</strong></div></article><article><IconShoppingCart size={20}/><div><span>客户与电商</span><strong>2</strong></div></article><article><IconChartLine size={20}/><div><span>市场与供应</span><strong>3</strong></div></article></div><div className="de-table-wrap"><table><thead><tr><th>类型</th><th>最新信号</th><th>来源</th><th>更新时间</th><th>业务影响</th><th>风险</th><th>关联对象</th></tr></thead><tbody>{rows.map((row) => <tr key={row.object}><td><Badge>{row.type}</Badge></td><td>{row.signal}</td><td>{row.source}</td><td>{row.time}</td><td>{row.impact}</td><td><Risk value={row.risk}/></td><td><button className="de-link" type="button" onClick={() => onTask(row.task)}>{row.object}</button></td></tr>)}</tbody></table></div><div className="de-signal-note"><IconShieldCheck size={17}/><span>行情、舆情与平台数据必须保留来源、授权范围和更新时间；系统不会自动调价、交易、退款、召回或发布公开回应。</span></div></div>; }

function ConfirmationCenter({ tasks, onTask }) { return <div className="de-panel de-full"><header className="de-section-title"><div><h2>待确认中心</h2><p>对外发送、正式写入和高风险动作必须确认固定版本的执行计划</p></div></header>{tasks.length ? <div className="de-confirm-list">{tasks.map((task) => <article key={task.id}><div className="de-confirm-icon"><IconUserCheck size={20}/></div><section><header><Risk value={task.risk}/><span>{task.employee}</span><time>{task.due}</time></header><h3>{task.title}</h3><p>{task.action}</p><small>业务对象：{task.object} · 责任人：{task.owner}</small></section><button type="button" className="is-primary" onClick={() => onTask(task)}>审阅确认</button></article>)}</div> : <div className="de-empty"><IconShieldCheck size={34}/><strong>当前没有等待确认的动作</strong><span>数字员工不会绕过确认直接执行正式或对外动作。</span></div>}</div>; }

function RuleCenter({ onCreate, onOpen }) { return <div className="de-panel de-full"><header className="de-section-title"><div><h2>规则与行动策略</h2><p>确定性规则负责边界，AI 判断负责理解；低置信度只给建议</p></div><button className="is-primary" type="button" onClick={onCreate}>新增规则</button></header><div className="de-table-wrap"><table><thead><tr><th>规则</th><th>触发条件</th><th>动作</th><th>风险等级</th><th>状态</th></tr></thead><tbody>{rules.map((row) => <tr key={row[0]}><td><button type="button" className="de-link" onClick={() => onOpen(row)}>{row[0]}</button></td><td>{row[1]}</td><td>{row[2]}</td><td><Badge tone={row[3] === 'L3' ? 'warning' : 'info'}>{row[3]}</Badge></td><td><Status value={row[4]}/></td></tr>)}</tbody></table></div></div>; }

function IntegrationCenter({ onCreate, onOpen }) { const rows = [['企业邮箱','已连接','3 分钟前','RFQ、供应商邮件、客诉和草稿'],['飞书','已连接','实时','个人提醒、确认卡片、异常升级'],['Forge CRM','已连接','1 分钟前','客户、商机、报价、订单'],['ERP / PLM','模拟','—','BOM、ECN、采购、生产、成本'],['MES / WMS / QMS','待评估','—','工单、批次、仓储、良率与追溯'],['电商开放平台','模拟','5 分钟前','授权订单、售后、评论与物流'],['官方行情与汇率','模拟','15 分钟延迟','材料行情、汇率与来源时间'],['授权舆情与公告','待评估','—','品牌、供应商与外部风险信号'],['设备与 IoT','未连接','—','告警、状态、工单']]; return <div className="de-panel de-full"><header className="de-section-title"><div><h2>系统集成</h2><p>连接授权与数字员工权限分离；模型不能读取连接密钥</p></div><button className="is-primary" type="button" onClick={onCreate}><IconPlugConnected size={16}/>添加连接</button></header><div className="de-integration-grid">{rows.map((row) => <article key={row[0]}><div className="de-avatar"><IconPlugConnected size={19}/></div><section><h3>{row[0]}</h3><p>{row[3]}</p><small>最近同步：{row[2]}</small></section><Status value={row[1]}/><button type="button" onClick={() => onOpen(row)}>设置</button></article>)}</div></div>; }

function AuditCenter({ logs, onExport }) { return <div className="de-panel de-full"><header className="de-section-title"><div><h2>执行与审计</h2><p>记录输入、规则/模型版本、工具调用、确认人、结果和人工接管</p></div><button type="button" onClick={onExport}>导出审计记录</button></header><div className="de-table-wrap"><table><thead><tr><th>时间</th><th>数字员工</th><th>事件</th><th>结果</th></tr></thead><tbody>{logs.map((row, index) => <tr key={`${row[0]}-${index}`}><td>{row[0]}</td><td>{row[1]}</td><td>{row[2]}</td><td><Status value={row[3]}/></td></tr>)}</tbody></table></div></div>; }

function TaskDrawer({ task, hasSuggestion, onClose, onSuggest, onSubmit, onConfirm, onReject, onEvidence }) { return <div className="de-drawer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><aside className="de-drawer" role="dialog" aria-modal="true" aria-label="数字员工任务详情"><header><div><span>{task.id}</span><h2>{task.title}</h2></div><button type="button" aria-label="关闭任务详情" onClick={onClose}><IconX size={18}/></button></header><div className="de-drawer-body"><section className="de-task-summary"><div><Risk value={task.risk}/><Status value={task.status}/></div><dl><div><dt>数字员工</dt><dd>{task.employee}</dd></div><div><dt>业务对象</dt><dd>{task.object}</dd></div><div><dt>责任人</dt><dd>{task.owner}</dd></div><div><dt>截止时间</dt><dd>{task.due}</dd></div></dl></section><section className="de-trigger-output"><div><span>触发条件</span><strong>{task.trigger}</strong></div><IconChevronRight size={18}/><div><span>本次交付物</span><strong>{task.output}</strong></div></section><section><h3>发现与判断</h3><p>{task.finding}</p></section><section><h3>来源证据</h3><ul className="de-evidence">{task.evidence.map((item) => <li key={item}><IconFileAnalytics size={15}/><button type="button" onClick={() => onEvidence(item)}>{item}</button></li>)}</ul></section><section><h3>建议执行计划</h3>{hasSuggestion || task.status === '待确认' || task.status === '已完成' ? <ol className="de-plan">{task.plan.map((item, index) => <li key={item}><b>{index + 1}</b><span>{item}</span></li>)}</ol> : <div className="de-empty small"><IconSparkles size={25}/><span>生成建议后展示结构化步骤、风险和需要确认的动作。</span></div>}</section><section className="de-action-box"><h3>拟执行动作</h3><p>{task.action}</p><small>{task.requiresApproval ? '该动作涉及对外沟通或正式业务处理，必须人工确认。' : '该动作只形成分析、线索或内部任务，不执行正式业务变更。'}</small></section></div><footer><button type="button" onClick={onClose}>关闭</button>{task.status === '待确认' ? <><button type="button" className="danger" onClick={onReject}>驳回</button><button type="button" className="is-primary" onClick={onConfirm}>确认并模拟执行</button></> : !['已完成','已驳回'].includes(task.status) && <>{!hasSuggestion && <button type="button" onClick={onSuggest}><IconSparkles size={15}/>生成处理建议</button>}{hasSuggestion && <button type="button" className="is-primary" onClick={onSubmit}>提交人工确认</button>}</>}</footer></aside></div>; }

function PrototypeModal({ modal, scenarios: sceneRows, employees: employeeRows, onChange, onClose, onNotify, onCreateTask }) {
  const title = { scenario:'场景卡', assessment:'场景启用评估', employee:'数字员工配置', 'new-employee':'新增数字员工', 'new-task':'发起协同任务', rule:'规则配置', 'new-rule':'新增规则', integration:'连接设置', 'new-integration':'添加连接', evidence:'证据详情' }[modal.type] || '原型页面';
  return <div className="de-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="de-modal" role="dialog" aria-modal="true" aria-label={title}><header><div><small>数字化员工 / {title}</small><h2>{modal.row?.name || modal.row?.[0] || title}</h2></div><button type="button" aria-label="关闭" onClick={onClose}><IconX size={18}/></button></header><div className="de-modal-body">
    {modal.type === 'scenario' && <ScenarioCardPanel row={modal.row} onAssess={() => onChange({ type:'assessment', row:modal.row })}/>} 
    {modal.type === 'assessment' && <AssessmentPanel row={modal.row} onClose={onClose} onNotify={onNotify}/>} 
    {['employee','new-employee'].includes(modal.type) && <EmployeeConfigPanel row={modal.row} onClose={onClose} onNotify={onNotify}/>} 
    {modal.type === 'new-task' && <NewTaskPanel scenes={sceneRows} onClose={onClose} onCreate={onCreateTask}/>} 
    {['rule','new-rule'].includes(modal.type) && <RuleConfigPanel row={modal.row} onClose={onClose} onNotify={onNotify}/>} 
    {['integration','new-integration'].includes(modal.type) && <IntegrationConfigPanel row={modal.row} onClose={onClose} onNotify={onNotify}/>} 
    {modal.type === 'evidence' && <EvidencePanel row={modal.row} onClose={onClose} onNotify={onNotify}/>} 
  </div></section></div>;
}

function ScenarioCardPanel({ row, onAssess }) {
  const steps = ['接收触发并锁定业务对象', '读取授权数据与来源证据', '按规则校验并生成判断', '形成可追溯交付物', '在控制点等待人工确认'];
  return <div className="de-scene-card"><div className="de-scene-hero"><div><Badge>{row.code}</Badge><Badge>{row.domain}</Badge><Badge tone="info">{row.maturity}</Badge></div><h3>{row.name}</h3><p>把高频、可复用的业务判断固化为可审计的数字员工工作单元。</p></div><section className="de-detail-grid"><Detail label="业务目标" value={`缩短${row.domain}处理周期，减少人工查数和漏项。`}/><Detail label="触发条件" value={row.trigger}/><Detail label="输入与证据" value={row.sources}/><Detail label="标准交付物" value={row.output}/><Detail label="人工控制点" value={row.control}/><Detail label="建议责任人" value={`${row.domain}业务负责人 / 系统管理员`}/></section><section><h3>执行流程</h3><ol className="de-flow">{steps.map((item, index) => <li key={item}><b>{index + 1}</b><span>{item}</span></li>)}</ol></section><section><h3>启用后的衡量指标</h3><div className="de-kpi-row"><article><strong>≥ 95%</strong><span>证据完整率</span></article><article><strong>≤ 10 分钟</strong><span>首次响应</span></article><article><strong>100%</strong><span>高风险人工确认</span></article></div></section><footer className="de-modal-actions"><button type="button" onClick={() => window.print()}>打印场景卡</button><button type="button" className="is-primary" onClick={onAssess}>进入启用评估</button></footer></div>;
}

function AssessmentPanel({ row, onClose, onNotify }) {
  const initial = [{ id:'owner', label:'已明确业务负责人和异常接管人', done:true },{ id:'data', label:'关键输入数据可通过授权接口稳定获取', done:true },{ id:'evidence', label:'交付物可回溯到原始证据与版本', done:true },{ id:'rule', label:'业务阈值、权限边界和停止条件已确认', done:false },{ id:'sample', label:'已准备至少 20 个历史样本做离线验证', done:false },{ id:'accept', label:'已定义成功率、时效和人工接管验收口径', done:false }];
  const [checks, setChecks] = useState(initial); const [result, setResult] = useState(false); const score = Math.round(checks.filter((item) => item.done).length / checks.length * 100);
  return <div className="de-assessment"><div className="de-assess-summary"><div className="de-score"><strong>{score}</strong><span>准备度</span></div><div><h3>{row.name}</h3><p>启用采用“历史数据验证 → 影子运行 → 限定范围试运行 → 正式启用”四段式。</p></div></div><section><h3>启用检查清单</h3><div className="de-check-list">{checks.map((item) => <label key={item.id}><input type="checkbox" checked={item.done} onChange={() => setChecks((rows) => rows.map((row) => row.id === item.id ? { ...row, done:!row.done } : row))}/><span>{item.label}</span><Badge tone={item.done ? 'success' : 'warning'}>{item.done ? '已就绪' : '待补充'}</Badge></label>)}</div></section><section className="de-form-grid"><label>试运行范围<select defaultValue="一个法人 / 一个业务组"><option>一个法人 / 一个业务组</option><option>一个产品线</option><option>全组织</option></select></label><label>影子运行周期<select defaultValue="14 天"><option>7 天</option><option>14 天</option><option>30 天</option></select></label><label>低置信度处理<select defaultValue="转人工任务"><option>转人工任务</option><option>只记录不提醒</option><option>停止本次任务</option></select></label><label>正式动作<select defaultValue="始终人工确认"><option>始终人工确认</option><option>仅低风险自动执行</option></select></label></section>{result && <section className="de-assess-result"><IconShieldCheck size={20}/><div><strong>{score >= 80 ? '可进入影子运行' : '暂不建议启用'}</strong><p>{score >= 80 ? '基础条件已满足。正式动作仍需人工确认，并保留一键暂停与回滚。' : '请先补齐未就绪项，再提交启用。当前可保存为评估草稿。'}</p></div></section>}<footer className="de-modal-actions"><button type="button" onClick={() => { onNotify('评估草稿已保存（原型）'); onClose(); }}>保存草稿</button><button type="button" onClick={() => setResult(true)}>生成评估结论</button><button type="button" className="is-primary" disabled={score < 80} onClick={() => { onNotify('已提交场景启用申请（原型）'); onClose(); }}>提交启用</button></footer></div>;
}

function EmployeeConfigPanel({ row, onClose, onNotify }) {
  const isNew = !row; const [level, setLevel] = useState(isNew ? '只读分析' : '草稿协同');
  return <form className="de-config-form" onSubmit={(event) => { event.preventDefault(); onNotify(isNew ? '数字员工草稿已创建（原型）' : '数字员工配置已保存（原型）'); onClose(); }}><section className="de-form-grid"><label>员工名称<input required defaultValue={row?.name || ''} placeholder="例如：订单交付协调员"/></label><label>业务领域<select defaultValue={row?.domain || '销售'}>{['销售','采购','计划','生产','质量','售后','仓储','电商','风险'].map((item) => <option key={item}>{item}</option>)}</select></label><label className="span-2">岗位目标<textarea defaultValue={row?.description || ''} placeholder="说明处理对象、交付物和业务目标"/></label><label>业务责任人<input defaultValue="周然"/></label><label>异常接管人<input defaultValue="业务平台主管"/></label><label>运行级别<select value={level} onChange={(event) => setLevel(event.target.value)}><option>只读分析</option><option>草稿协同</option><option>受控执行</option></select></label><label>低置信度阈值<select defaultValue="低于 80% 转人工"><option>低于 80% 转人工</option><option>低于 90% 转人工</option><option>始终转人工</option></select></label><label className="span-2">授权数据范围<textarea defaultValue={row?.sources || '客户、商机、报价单、订单（仅负责人所属组织）'}/></label></section><section><h3>工具与动作权限</h3><div className="de-permission-grid">{['读取业务数据','生成分析与摘要','创建内部待办','生成邮件/消息草稿','写入正式单据','对外发送消息'].map((item, index) => <label key={item}><input type="checkbox" defaultChecked={index < 4}/><span>{item}</span>{index >= 4 && <Badge tone="warning">需确认</Badge>}</label>)}</div></section><footer className="de-modal-actions"><button type="button" onClick={onClose}>取消</button><button type="submit" className="is-primary">保存配置</button></footer></form>;
}

function NewTaskPanel({ scenes, onClose, onCreate }) {
  const [code, setCode] = useState(scenes[0]?.code || ''); const scene = scenes.find((item) => item.code === code) || scenes[0]; const [object, setObject] = useState('');
  return <form className="de-config-form" onSubmit={(event) => { event.preventDefault(); onCreate(scene, object); }}><section className="de-form-grid"><label className="span-2">选择场景<select value={code} onChange={(event) => setCode(event.target.value)}>{scenes.map((item) => <option key={item.code} value={item.code}>{item.code} · {item.name}</option>)}</select></label><label className="span-2">关联业务对象<input value={object} onChange={(event) => setObject(event.target.value)} placeholder="输入单号、客户、批次或任务对象"/></label></section>{scene && <section className="de-preview-box"><Badge>{scene.domain}</Badge><h3>{scene.name}</h3><p>触发：{scene.trigger}</p><p>预期交付：{scene.output}</p><small>创建后只会进入任务队列，不会自动执行正式业务动作。</small></section>}<footer className="de-modal-actions"><button type="button" onClick={onClose}>取消</button><button type="submit" className="is-primary">创建任务</button></footer></form>;
}

function RuleConfigPanel({ row, onClose, onNotify }) {
  return <form className="de-config-form" onSubmit={(event) => { event.preventDefault(); onNotify('规则已保存并生成新版本（原型）'); onClose(); }}><section className="de-form-grid"><label>规则名称<input defaultValue={row?.[0] || ''} required/></label><label>适用场景<select defaultValue="全部场景"><option>全部场景</option><option>报价风险分析</option><option>交付风险巡检</option><option>质量异常追溯</option></select></label><label className="span-2">触发条件<textarea defaultValue={row?.[1] || ''} placeholder="使用业务字段设置阈值与组合条件"/></label><label className="span-2">命中动作<textarea defaultValue={row?.[2] || ''}/></label><label>风险等级<select defaultValue={row?.[3] || 'L2'}><option>L1</option><option>L2</option><option>L3</option></select></label><label>状态<select defaultValue={row?.[4] || '启用'}><option>草稿</option><option>启用</option><option>停用</option></select></label></section><div className="de-signal-note"><IconShieldCheck size={17}/><span>L3、对外发送和正式写入动作必须转人工确认，规则版本会随任务写入审计记录。</span></div><footer className="de-modal-actions"><button type="button" onClick={onClose}>取消</button><button type="submit" className="is-primary">保存规则</button></footer></form>;
}

function IntegrationConfigPanel({ row, onClose, onNotify }) {
  const name = row?.[0] || '新连接';
  return <form className="de-config-form" onSubmit={(event) => { event.preventDefault(); onNotify(`${name}连接配置已保存（原型）`); onClose(); }}><section className="de-connection-head"><div className="de-avatar"><IconPlugConnected size={20}/></div><div><h3>{name}</h3><p>{row?.[3] || '选择系统类型并配置最小授权范围'}</p></div><Status value={row?.[1] || '未连接'}/></section><section className="de-form-grid"><label>连接类型<select defaultValue={row ? '现有连接' : '企业应用'}><option>现有连接</option><option>企业应用</option><option>标准 API</option><option>数据库只读视图</option></select></label><label>同步频率<select defaultValue="每 5 分钟"><option>实时</option><option>每 5 分钟</option><option>每小时</option><option>每天</option></select></label><label className="span-2">服务地址<input defaultValue="https://api.example.local"/></label><label className="span-2">授权范围<textarea defaultValue={row?.[3] || '仅读取场景所需对象；写入权限单独申请'}/></label></section><section className="de-health-row"><span><i className="ok"/>鉴权检查通过</span><span><i className="ok"/>字段映射已加载</span><span><i/>回调地址待验证</span><button type="button" onClick={() => onNotify('连接测试成功（原型）')}>测试连接</button></section><footer className="de-modal-actions"><button type="button" onClick={onClose}>取消</button><button type="submit" className="is-primary">保存连接</button></footer></form>;
}

function EvidencePanel({ row, onClose, onNotify }) { return <div className="de-evidence-detail"><section className="de-evidence-title"><IconFileAnalytics size={28}/><div><h3>{row.name}</h3><p>该证据在数字员工开始分析时保存了引用信息，原始数据仍由业务系统管理。</p></div></section><dl><Detail label="关联任务" value={`${row.task.id} · ${row.task.title}`}/><Detail label="业务对象" value={row.task.object}/><Detail label="来源系统" value="Forge CRM / 授权业务系统"/><Detail label="读取时间" value="2026-10-07 09:42:18"/><Detail label="数据版本" value="snapshot-20261007-094218"/><Detail label="完整性校验" value="SHA-256 · 7C91…B21F"/></dl><section className="de-preview-box"><h3>证据摘要</h3><p>此原型展示证据索引、来源、时间与版本。生产实现只展示当前用户有权访问的字段，敏感内容按权限脱敏。</p></section><footer className="de-modal-actions"><button type="button" onClick={onClose}>关闭</button><button type="button" className="is-primary" onClick={() => onNotify('已打开关联业务对象（原型）')}>打开业务对象</button></footer></div>; }

function Detail({ label, value }) { return <div><dt>{label}</dt><dd>{value}</dd></div>; }
