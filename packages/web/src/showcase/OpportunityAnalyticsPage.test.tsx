import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import type { GridProps } from '../common/data-grid/BusinessDataGrid';
import { call } from './gateway';
import { OpportunityAnalyticsPage } from './OpportunityAnalyticsPage';
vi.mock('./gateway', () => ({ call: vi.fn() }));
vi.mock('../common/data-grid/LazyBusinessDataGrid', () => ({ BusinessDataGrid: (props: GridProps<Record<string, unknown>>) => <div aria-label={props.name}>{props.columns.map(col => <span key={col.key}>{col.label}</span>)}{props.rows.map(row => <div key={props.rowKey(row)}>{props.columns.map(col => <span key={col.key}>{col.render ? col.render(row) : String(col.value(row))}</span>)}</div>)}{props.showPagination !== false && <button onClick={() => props.onPageChange(props.page + 1)}>下一页</button>}</div> }));
const stageId = '11111111-1111-4111-8111-111111111111';
const fixture = { query: { dateFrom: '2026-10-01', dateTo: '2027-03-31' }, organizations: [{ id: '22222222-2222-4222-8222-222222222222', name: '销售部', parentId: null }], templates: [{ id: '33333333-3333-4333-8333-333333333333', name: '公共' }], months: ['2026-10','2026-11','2026-12','2027-01','2027-02','2027-03'], stages: [{ id: stageId, name: '初始线索', templateId: '33333333-3333-4333-8333-333333333333', templateName: '公共', probability: 10, count: 2, amount: '200000.00', monthlyAmounts: ['200000.00','0','0','0','0','0'], missingAmount: 0 }], totals: { count: 2, amount: '200000.00', monthlyAmounts: ['200000.00','0','0','0','0','0'], weightedAmounts: ['20000.00','0','0','0','0','0'], missingAmount: 0 } };
const record = { id: '44444444-4444-4444-8444-444444444444', code: 'DEMO-01', name: '示例商机', customer: '示例客户', owner: '示例销售', stage: '初始线索', businessStatus: 'FOLLOWING', expectedSignDate: '2026-10-15', amount: '100000.00' };
function response(body: unknown) { return { json: async () => body } as Response; }
beforeEach(() => { vi.mocked(call).mockReset(); vi.mocked(call).mockImplementation(async path => response(path.includes('/records?') ? { items: [record], pagination: { page: 1, pageSize: 20, total: 2, totalPages: 1 } } : fixture)); });
describe('opportunity analysis interactions', () => {
  it('drills into a stage with the same query and opens an opportunity by code', async () => {
    const navigate = vi.fn(); render(<OpportunityAnalyticsPage systemCode="demo-portal" onNavigate={navigate} />);
    expect(screen.queryByRole('combobox', { name: '商机模板' })).not.toBeInTheDocument();
    const stage = await screen.findByRole('button', { name: /公共 · 初始线索：2 个项目/ }); fireEvent.click(stage);
    await waitFor(() => expect(vi.mocked(call).mock.calls.some(([url]) => url.includes(`/records?`) && url.includes(`stageId=${stageId}`) && url.includes('dateFrom=2026-10-01') && url.includes('pageSize=20'))).toBe(true));
    fireEvent.click(await screen.findByRole('button', { name: 'DEMO-01' })); expect(navigate).toHaveBeenCalledWith(`/showcase/opportunities/${record.id}`);
  });
  it('shows six months and both original and weighted totals using the configured win rate', async () => {
    render(<OpportunityAnalyticsPage systemCode="demo-portal" onNavigate={vi.fn()} />); await screen.findByRole('button', { name: /公共 · 初始线索/ });
    fireEvent.click(screen.getByRole('tab', { name: '保有量分析' }));
    expect(await screen.findByText('原始商机金额合计')).toBeInTheDocument(); expect(screen.getByText('商机金额 × 赢率合计')).toBeInTheDocument();
    expect(screen.getByText('2026-10（万元）')).toBeInTheDocument(); expect(screen.getByText('2027-03（万元）')).toBeInTheDocument(); expect(screen.getByText('2.00')).toBeInTheDocument();
  });
  it('applies organization and date filters and recovers after a failed request', async () => {
    render(<OpportunityAnalyticsPage systemCode="demo-portal" onNavigate={vi.fn()} />); await screen.findByRole('button', { name: /公共 · 初始线索/ });
    fireEvent.change(screen.getByRole('combobox', { name: '负责人所在组织' }), { target: { value: fixture.organizations[0].id } });
    fireEvent.change(screen.getByLabelText('预签开始日期'), { target: { value: '2026-11-01' } });
    vi.mocked(call).mockRejectedValueOnce(new Error('统计服务不可用')); fireEvent.click(screen.getByRole('button', { name: '查询' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('统计服务不可用');
    expect(vi.mocked(call).mock.calls.some(([url]) => url.includes(`orgUnitId=${fixture.organizations[0].id}`) && url.includes('dateFrom=2026-11-01'))).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: '重试统计' })); expect(await screen.findByRole('button', { name: /公共 · 初始线索/ })).toBeInTheDocument();
  });
});
