import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ListViewConfig } from '@forge-crm/contracts';
import { BusinessDataGrid } from './BusinessDataGrid';
const config: ListViewConfig = { columns: ['code', 'status'].map((key) => ({ key, width: 160, visible: true, fixed: null, queryVisible: false, queryCollapsed: false })), pageSize: 20, sort: { field: 'code', direction: 'asc' }, filters: {} };
function Grid({ changed, saved, advanced = true }: { changed: ReturnType<typeof vi.fn>; saved?: ReturnType<typeof vi.fn>; advanced?: boolean }) {
  const [value, setValue] = useState(config);
  return <BusinessDataGrid showColumnSettings={advanced} enableColumnFilters={advanced} enableColumnSorting={advanced} enableExport={advanced} name="样例" columns={[{ key: 'code', label: '编码', value: (row: { code: string; status: string }) => row.code, required: true }, { key: 'status', label: '状态', value: (row) => row.status, options: [{ value: 'ACTIVE', label: '启用' }] }]} config={value} onConfigChange={(next) => { setValue(next); changed(next); }} rows={[{ code: 'P001', status: 'ACTIVE' }]} rowKey={(row) => row.code} total={200} page={1} onPageChange={vi.fn()} exportAll={async () => []} onSaveView={saved} />;
}
describe('public business grid', () => {
  it('defaults to plain headers without advanced tools, filters or sorting controls', async () => {
    render(<Grid changed={vi.fn()} advanced={false} />);
    expect(await screen.findByRole('columnheader', { name: '编码' })).toBeInTheDocument();
    for (const name of ['列设置', '清除列筛选', '导出', '编码排序']) expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
    for (const name of ['筛选编码', '筛选状态', '导出范围', '导出格式']) expect(screen.queryByLabelText(name)).not.toBeInTheDocument();
    expect(screen.getByLabelText('每页条数')).toBeInTheDocument();
  });
  it('reports column sorting, independent filters and a custom page size to its server adapter', async () => {
    const changed = vi.fn(), user = userEvent.setup(); render(<Grid changed={changed} />);
    await user.click(await screen.findByRole('button', { name: '编码排序' }));
    expect(changed.mock.lastCall?.[0].sort).toEqual({ field: 'code', direction: 'desc' });
    await user.type(screen.getByLabelText('筛选编码'), 'AB');
    expect(changed.mock.lastCall?.[0].columnFilters).toEqual({ code: 'AB' });
    await user.selectOptions(screen.getByLabelText('筛选状态'), 'ACTIVE');
    expect(changed.mock.lastCall?.[0].columnFilters).toEqual({ code: 'AB', status: 'ACTIVE' });
    await user.clear(screen.getByLabelText('每页条数')); await user.type(screen.getByLabelText('每页条数'), '25'); await user.tab();
    expect(changed.mock.lastCall?.[0].pageSize).toBe(25);
  });
  it('saves hidden columns, alignment, pinning and order through the existing view adapter', async () => {
    const changed = vi.fn(), saved = vi.fn<(name: string, config: ListViewConfig) => Promise<void>>(async () => {}), user = userEvent.setup(); render(<Grid changed={changed} saved={saved} />);
    await user.click(screen.getByRole('button', { name: '列设置' }));
    await user.selectOptions(screen.getByLabelText('编码固定'), 'left'); await user.selectOptions(screen.getByLabelText('编码对齐'), 'center');
    await user.click(screen.getByRole('button', { name: '下移编码' })); await user.click(screen.getByRole('checkbox', { name: '状态' }));
    await user.click(screen.getByRole('button', { name: '保存并使用个人视图' }));
    await waitFor(() => expect(saved).toHaveBeenCalled());
    expect(saved.mock.lastCall?.[1].columns).toEqual([expect.objectContaining({ key: 'status', visible: false }), expect.objectContaining({ key: 'code', fixed: 'left', align: 'center' })]);
  });
  it('uses a page-supplied fixed mode without showing a pagination mode selector', async () => {
    const pageChanged = vi.fn();
    const records = [{code:'A'}, {code:'B'}, {code:'C'}];
    const load = vi.fn(async () => records);
    const {rerender} = render(<BusinessDataGrid name="完整列表" columns={[{key:'code',label:'编码',value:(r:{code:string})=>r.code}]} config={{...config,pageSize:1}} onConfigChange={vi.fn()} rows={[records[1]]} rowKey={r=>r.code} total={3} page={2} onPageChange={pageChanged} exportAll={load}/>);
    expect(screen.getByText('共 3 条 · 第 2 / 3 页')).toBeInTheDocument();
    expect(screen.queryByLabelText('完整列表分页方式')).not.toBeInTheDocument();
    rerender(<BusinessDataGrid paginationMode="all" name="完整列表" columns={[{key:'code',label:'编码',value:(r:{code:string})=>r.code}]} config={{...config,pageSize:1}} onConfigChange={vi.fn()} rows={[records[1]]} rowKey={r=>r.code} total={3} page={2} onPageChange={pageChanged} exportAll={load}/>);
    expect(await screen.findByRole('gridcell', {name:'C'})).toBeInTheDocument();
    expect(screen.getByRole('gridcell',{name:'A'})).toBeInTheDocument();
    expect(screen.queryByLabelText('每页条数')).not.toBeInTheDocument();
    expect(screen.queryByRole('button',{name:'下一页'})).not.toBeInTheDocument();
    expect(screen.queryByText(/第 2 \/ 3 页/)).not.toBeInTheDocument();
    expect(pageChanged).not.toHaveBeenCalled();
    rerender(<BusinessDataGrid paginationMode="paged" name="完整列表" columns={[{key:'code',label:'编码',value:(r:{code:string})=>r.code}]} config={{...config,pageSize:1}} onConfigChange={vi.fn()} rows={[records[1]]} rowKey={r=>r.code} total={3} page={2} onPageChange={pageChanged} exportAll={load}/>);
    expect(screen.getByText('共 3 条 · 第 2 / 3 页')).toBeInTheDocument();
    expect(screen.queryByRole('gridcell',{name:'C'})).not.toBeInTheDocument();
  });
  it('rejects incomplete all-mode data and allows retry without showing a false complete list', async () => {
    const user = userEvent.setup();
    const load = vi.fn().mockResolvedValueOnce([{code:'A'}]).mockResolvedValueOnce([{code:'A'},{code:'B'}]);
    render(<BusinessDataGrid paginationMode="all" name="失败列表" columns={[{key:'code',label:'编码',value:(r:{code:string})=>r.code}]} config={config} onConfigChange={vi.fn()} rows={[{code:'A'}]} rowKey={r=>r.code} total={2} page={1} onPageChange={vi.fn()} exportAll={load}/>);
    expect(await screen.findByRole('alert')).toHaveTextContent('全部记录加载不完整');
    expect(screen.queryByRole('gridcell',{name:'A'})).not.toBeInTheDocument();
    await user.click(screen.getByRole('button',{name:'重试全部记录'}));
    expect(await screen.findByRole('gridcell',{name:'B'})).toBeInTheDocument();
  });
  it('uses supplied complete local data without a remote load, and preserves record actions', async () => {
    const user = userEvent.setup(), action=vi.fn(), load=vi.fn(async()=>[]);
    render(<BusinessDataGrid paginationMode="all" name="本地列表" columns={[{key:'code',label:'编码',value:(r:{code:string})=>r.code}]} config={config} onConfigChange={vi.fn()} rows={[{code:'A'}]} rowKey={r=>r.code} total={1} page={1} onPageChange={vi.fn()} exportAll={load} rowActions={()=> <button onClick={action}>测试操作</button>}/>);
    await user.click(await screen.findByRole('button',{name:'测试操作'}));
    expect(action).toHaveBeenCalledOnce(); expect(load).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('每页条数')).not.toBeInTheDocument();
  });

});
