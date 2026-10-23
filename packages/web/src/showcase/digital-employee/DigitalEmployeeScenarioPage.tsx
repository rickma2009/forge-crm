import { useEffect, useMemo, useState } from 'react';
import type { DeScenario, DeWorkspace } from '@forge-crm/contracts';
import { DeclarativeDataGrid } from '../../common/data-grid/DeclarativeDataGrid';
import { DetailHeader, DetailPanel, DetailTabs } from '../../common/DetailWorkspace';
import { digitalEmployeeApi } from './api';
import { MailAutomationCenter } from './MailAutomationCenter';
import { PublicOpinionCenter } from './PublicOpinionCenter';
import { CommodityMarketCenter } from './CommodityMarketCenter';
import { BusinessSceneCenter } from './BusinessSceneCenter';
import './digital-employee.css';
import './digital-employee-scenario.css';

type RiskTab = 'collection' | 'analysis' | 'sources';

export function digitalEmployeeScenarioTitle(code: string): string {
  const names: Record<string, string> = {
    'SCN-RISK': '舆情监控', 'SCN-RFQ': '邮件处理',
    'SCN-BI': '经营分析', 'SCN-ECOM': '电商评论', 'SCN-PO': '采购订单执行',
    'SCN-KIT': '生产工单执行', 'SCN-STOCK': '库存管理',
    'SCN-QUOTE': '研发过程执行', 'SCN-MARKET': '大宗商品监控',
    'SCN-SMT': 'SMT 换线准备门禁检查', 'SCN-YIELD': '质量过程执行',
    'SCN-TRACE': '序列号与批次正反向追溯', 'SCN-RMA': '客诉及质量事件',
  };
  return names[code] ?? '数字员工场景';
}

export function DigitalEmployeeScenarioPage({ systemCode, scenarioCode, allowedActions }: {
  systemCode: string; scenarioCode: string; allowedActions: string[];
}) {
  const [workspace, setWorkspace] = useState<DeWorkspace | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<RiskTab>('collection');
  const [loading, setLoading] = useState(true);
  const canManage = allowedActions.includes('manage');
  const canExecute = allowedActions.includes('execute');

  useEffect(() => {
    if(['SCN-PO','SCN-RMA','SCN-BI'].includes(scenarioCode))return;
    let active = true;
    setLoading(true); setError('');
    digitalEmployeeApi.get(systemCode).then((data) => { if (active) setWorkspace(data); })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : '无法读取场景信息'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [systemCode, scenarioCode]);

  const scenario = workspace?.scenarios.find((row) => row.code === scenarioCode);
  const mailConnection = workspace?.connections.find((row) => row.category === 'MAIL' && row.status === 'CONNECTED');
  const dataSources = useMemo(() => workspace?.connections ?? [], [workspace]);
  if (scenarioCode==='SCN-PO'||scenarioCode==='SCN-RMA'||scenarioCode==='SCN-BI') return <BusinessSceneCenter key={scenarioCode} systemCode={systemCode} scenarioCode={scenarioCode} canManage={canManage} canExecute={canExecute}/>;
  if (scenarioCode === 'SCN-MARKET') return <CommodityMarketCenter systemCode={systemCode} canManage={canManage} canExecute={canExecute} />;
  if (scenarioCode === 'SCN-RISK') return <PublicOpinionCenter systemCode={systemCode} canManage={canManage} canExecute={canExecute} />;
  if (scenarioCode === 'SCN-RFQ') {
    if (!workspace && loading) return <p>正在加载邮件数字员工…</p>;
    if (!scenario) return <ScenarioUnavailable code={scenarioCode} error={error} />;
    if (!mailConnection) return <MailWaiting scenario={scenario} error={error} />;
    return <MailAutomationCenter key={mailConnection.code} systemCode={systemCode} connectionCode={mailConnection.code} connection={mailConnection} initialTab="tasks" showConnectionTab title="邮件处理" canManage={canManage} canExecute={canExecute} />;
  }

  if (!scenario && loading) return <p>正在加载数字员工场景…</p>;
  if (!scenario) return <ScenarioUnavailable code={scenarioCode} error={error} />;
  const isInformation = scenarioCode === 'SCN-RISK' || scenarioCode === 'SCN-MARKET';
  const availableSources = dataSources.filter((source) => source.category !== 'MAIL');
  return <div className="enterprise-page digital-employee-scenario">
    <DetailHeader title={scenario.name} status={<span>{isInformation ? '信息获取' : '场景工作区'}</span>} fields={[
      { label: '场景编码', value: scenario.code }, { label: '业务领域', value: scenario.domain },
      { label: '数据状态', value: availableSources.some((source) => source.status === 'CONNECTED') ? '连接已就绪，等待场景数据接入' : '等待配置' },
    ]} />
    {isInformation ? <>
      <DetailTabs id={`scenario-${scenario.code}`} label="信息获取场景功能" active={tab} onChange={setTab} tabs={[
        { id: 'collection', label: '采集结果' }, { id: 'analysis', label: '数据分析' }, { id: 'sources', label: '来源与接口' },
      ]} />
      <DetailPanel id={`scenario-${scenario.code}`} active={tab}>
        {tab === 'collection' && <section className="enterprise-card digital-source-state"><h2>采集结果</h2><p>{availableSources.some((source) => source.status === 'CONNECTED') ? '连接已就绪，当前没有该场景的采集结果。' : '尚未配置可用的信息来源，采集结果将在来源接入并成功采集后显示。'}</p><strong>当前状态：等待配置</strong></section>}
        {tab === 'analysis' && <section className="enterprise-card digital-source-state"><h2>数据分析</h2><p>暂无已采集数据，系统不会基于空数据生成分析结论。</p><strong>分析状态：等待采集数据</strong></section>}
        {tab === 'sources' && <section className="enterprise-card table-card"><div className="table-toolbar"><strong>已登记的数据连接</strong><span>凭据不在此处显示</span></div><DeclarativeDataGrid aria-label="信息获取数据源"><thead><tr><th>连接名称</th><th>类型</th><th>状态</th><th>最近检查</th><th>说明</th></tr></thead><tbody>{availableSources.map((source) => <tr key={source.id}><td>{source.name}</td><td>{source.category}</td><td>{source.status === 'CONNECTED' ? '已连接' : source.status === 'ERROR' ? '异常' : '等待配置'}</td><td>{source.lastCheckedAt ? new Date(source.lastCheckedAt).toLocaleString('zh-CN') : '—'}</td><td>{source.lastError ?? '当前连接没有该场景的数据采集适配器'}</td></tr>)}</tbody></DeclarativeDataGrid>{availableSources.length === 0 && <p className="digital-source-state">当前没有已登记的信息来源。</p>}</section>}
      </DetailPanel>
    </> : <>
      <DetailTabs id={`scenario-${scenario.code}`} label="数字员工场景功能" active={tab} onChange={setTab} tabs={[
        { id: 'collection', label: '场景数据' }, { id: 'analysis', label: '场景说明' }, { id: 'sources', label: '来源与接口' },
      ]} />
      <DetailPanel id={`scenario-${scenario.code}`} active={tab}>
        {tab === 'collection' && <section className="enterprise-card digital-source-state"><h2>场景数据</h2><p>此场景依赖业务数据接口，目前尚未接入；配置完成前不会展示模拟业务记录或执行外部操作。</p><strong>当前状态：等待配置</strong></section>}
        {tab === 'analysis' && <section className="enterprise-card digital-source-state"><h2>场景说明</h2><dl className="digital-scene-detail"><dt>触发条件</dt><dd>{scenario.trigger}</dd><dt>输入与证据</dt><dd>{scenario.sources}</dd><dt>预期交付</dt><dd>{scenario.output}</dd><dt>人工控制</dt><dd>{scenario.control}</dd></dl></section>}
        {tab === 'sources' && <section className="enterprise-card digital-source-state"><h2>来源与接口</h2><p>{scenario.sources}</p><p>接口配置入口：数字员工工作台 → 集成。尚未接入的连接会保持等待配置。</p></section>}
      </DetailPanel>
    </>}
    {error && <p className="enterprise-alert" role="alert">{error}</p>}
  </div>;
}

function MailWaiting({ scenario, error }: { scenario: DeScenario; error: string }) {
  return <div className="enterprise-page digital-employee-scenario"><DetailHeader title={scenario.name} status={<span>等待配置</span>} fields={[{ label: '场景编码', value: scenario.code }, { label: '数据状态', value: '未连接邮箱' }]} /><section className="enterprise-card digital-source-state"><h2>待处理邮件</h2><p>{error || '尚未连接可用邮箱。连接并完成健康检查后，真实待处理邮件会显示在此工作区。'}</p><strong>当前状态：等待配置</strong><p>邮箱连接入口：数字员工工作台 → 集成。系统不会展示虚构邮件或模拟处理成功状态。</p></section></div>;
}

function ScenarioUnavailable({ code, error }: { code: string; error: string }) {
  return <div className="enterprise-page digital-employee-scenario"><DetailHeader title={digitalEmployeeScenarioTitle(code)} fields={[{ label: '场景编码', value: code }]} /><p className="enterprise-alert" role="alert">{error || '该场景当前未登记或不可用。'}</p></div>;
}
