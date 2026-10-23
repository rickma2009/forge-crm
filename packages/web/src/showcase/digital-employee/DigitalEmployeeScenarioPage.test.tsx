import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DigitalEmployeeScenarioPage } from './DigitalEmployeeScenarioPage';
import { digitalEmployeeApi } from './api';

vi.mock('./api', () => ({ digitalEmployeeApi: { get: vi.fn(), getMailCenter: vi.fn() } }));
vi.mock('./MailAutomationCenter', () => ({
  MailAutomationCenter: ({ connectionCode, initialTab, canExecute }: { connectionCode: string; initialTab: string; canExecute: boolean }) => <div>MAIL_WORKSPACE:{connectionCode}:{initialTab}:{canExecute?'execute':'readonly'}</div>,
}));
vi.mock('./BusinessSceneCenter',()=>({BusinessSceneCenter:({scenarioCode,canExecute}:{scenarioCode:string;canExecute:boolean})=><div>BUSINESS:{scenarioCode}:{String(canExecute)}</div>}));
vi.mock('./PublicOpinionCenter', () => ({
  PublicOpinionCenter: ({ canManage, canExecute }: { canManage: boolean; canExecute: boolean }) => <div>OPINION_WORKSPACE:{canManage?'manage':'readonly'}:{canExecute?'execute':'no-execute'}</div>,
}));

const scenario = { code: 'SCN-RISK', name: '品牌舆情与供应商风险雷达', domain: '风险', maturity: 'READ_ONLY', trigger: '外部风险源命中实体', output: '来源与受影响对象', sources: '官方公告、授权舆情', control: '外部事实需复核，不自动发布', assessmentScore: 0, assessmentStatus: 'NOT_ASSESSED' };
const baseWorkspace = { version: 1, tasks: [], employees: [], scenarios: [scenario], rules: [], audits: [], connections: [] };

describe('DigitalEmployeeScenarioPage', () => {
  beforeEach(() => {
    vi.mocked(digitalEmployeeApi.get).mockResolvedValue(baseWorkspace as never);
  });

  it.each(['SCN-PO','SCN-RMA','SCN-BI'])('opens %s without loading the generic employee workspace',async scenarioCode=>{
    vi.mocked(digitalEmployeeApi.get).mockClear();
    render(<DigitalEmployeeScenarioPage systemCode="demo-portal" scenarioCode={scenarioCode} allowedActions={['view','execute']} />);
    expect(await screen.findByText(`BUSINESS:${scenarioCode}:true`)).toBeInTheDocument();
    expect(digitalEmployeeApi.get).not.toHaveBeenCalled();
  });

  it('opens the dedicated public-opinion employee with route permissions', async () => {
    render(<DigitalEmployeeScenarioPage systemCode="demo-portal" scenarioCode="SCN-RISK" allowedActions={['view']} />);
    expect(await screen.findByText('OPINION_WORKSPACE:readonly:no-execute')).toBeInTheDocument();
  });

  it('opens the connected RFQ mail worker on its scenario task tab', async () => {
    vi.mocked(digitalEmployeeApi.get).mockResolvedValue({
      ...baseWorkspace,
      scenarios: [{ ...scenario, code: 'SCN-RFQ', name: '客户 RFQ 解析与规格澄清', domain: '销售' }],
      connections: [{ id: '00000000-0000-4000-8000-000000000001', code: 'mail-main', name: '企业邮箱', category: 'MAIL', provider: 'IMAP_SMTP', status: 'CONNECTED', config: {}, secretConfigured: true, lastCheckedAt: null, lastError: null, version: 1 }],
    } as never);
    render(<DigitalEmployeeScenarioPage systemCode="demo-portal" scenarioCode="SCN-RFQ" allowedActions={['execute']} />);
    expect(await screen.findByText('MAIL_WORKSPACE:mail-main:tasks:execute')).toBeInTheDocument();
  });
});
