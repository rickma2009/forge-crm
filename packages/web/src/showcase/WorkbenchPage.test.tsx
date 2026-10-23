import { fireEvent, render, screen, within } from '@testing-library/react';
import { vi } from 'vitest';
import { call } from './gateway';
import { amountInWan, WorkbenchPage } from './WorkbenchPage';
vi.mock('./NotificationPanel',()=>({NotificationPanel:()=>null}));
vi.mock('./gateway', () => ({ call: vi.fn() }));
const fixture = { month: '2026-10', generatedAt: '2026-10-01T01:00:00Z', following: { count: 2, amount: '155000.00', missingAmount: 0 }, signed: { count: 1, amount: '85000.00', missingAmount: 0 }, inventory: [{ currency: 'CNY', amount: '340000.00' }], opportunityAllowed: true, pending: { total: 1, items: [{ id: 'demo-1', title: '示例商机', description: '示例客户 · 待跟进商机', date: '2026-10-15', path: '/showcase/opportunities/demo-1' }] }, warnings: { total: 0, items: [] }, agentTodos: { total: 0, items: [] } };
describe('workbench page', () => {
  beforeEach(() => vi.mocked(call).mockReset());
  it('rounds amounts to whole ten-thousands', () => { expect(amountInWan('155000.00')).toBe('16'); expect(amountInWan('0')).toBe('0'); });
  it('renders actual metric values and navigates a pending record', async () => {
    vi.mocked(call).mockResolvedValue({ json: async () => fixture } as Response);
    const navigate = vi.fn(); render(<WorkbenchPage systemCode="demo-portal" onNavigate={navigate} />);
    expect(await screen.findByText('16 万元')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /示例商机/ }));
    expect(navigate).toHaveBeenCalledWith('/showcase/opportunities/demo-1');
    expect(within(screen.getByRole('region', { name: '预警' })).getByText('暂无预签逾期的商机')).toBeInTheDocument();
  });
  it('distinguishes unavailable permissions from zero metrics and permits retry after failure', async () => {
    vi.mocked(call).mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ json: async () => ({ ...fixture, following: null, signed: null, inventory: null, opportunityAllowed: false, pending: { total: 0, items: [] } }) } as Response);
    render(<WorkbenchPage systemCode="demo-portal" onNavigate={vi.fn()} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('工作台加载失败');
    fireEvent.click(screen.getByRole('button', { name: '刷新工作台' }));
    expect(await screen.findAllByText('无查看权限')).toHaveLength(3);
    expect(screen.getAllByText('当前账号没有商机查看权限')).toHaveLength(2);
    expect(screen.queryByText('0 万元')).not.toBeInTheDocument();
  });
});
