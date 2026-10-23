import { useLayoutEffect, useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DeclarativeDataGrid, GridEmpty } from './DeclarativeDataGrid';
import { RowActionButton } from '../RowActionButton';

describe('declarative migration adapter', () => {
  it('keeps controlled cell changes current when displaying all local records', async () => {
    function Example() {
      const [checked,setChecked]=useState(false);
      return <DeclarativeDataGrid aria-label="本地全量" paginationMode="all" pagination={{page:1,pageSize:20,total:1,onPageChange:vi.fn(),onPageSizeChange:vi.fn()}}><thead><tr><th>选择</th></tr></thead><tbody><tr key="one"><td><input aria-label="全量行选择" type="checkbox" checked={checked} onChange={e=>setChecked(e.target.checked)}/></td></tr></tbody></DeclarativeDataGrid>;
    }
    const user=userEvent.setup();render(<Example/>);
    expect(screen.queryByLabelText('本地全量分页方式')).not.toBeInTheDocument();
    await user.click(await screen.findByLabelText('全量行选择'));
    expect(screen.getByLabelText('全量行选择')).toBeChecked();
  });
  it('loads complete server results through the adapter and preserves cell actions', async () => {
    const action=vi.fn(), user=userEvent.setup();
    render(<DeclarativeDataGrid aria-label="服务端适配" paginationMode="all" pagination={{page:1,pageSize:1,total:2,onPageChange:vi.fn(),onPageSizeChange:vi.fn(),loadAllRows:async()=>[<tr key="a"><td>A</td><td><button onClick={action}>处理A</button></td></tr>,<tr key="b"><td>B</td><td><button onClick={action}>处理B</button></td></tr>]}}><thead><tr><th>编码</th><th>操作</th></tr></thead><tbody><tr key="a"><td>A</td><td><button onClick={action}>处理A</button></td></tr></tbody></DeclarativeDataGrid>);
    expect(screen.queryByLabelText('服务端适配分页方式')).not.toBeInTheDocument();
    await user.click(await screen.findByRole('button',{name:'处理B'})); expect(action).toHaveBeenCalledOnce();
    expect(screen.queryByRole('button',{name:'下一页'})).not.toBeInTheDocument();
  });

  it('places sequence and authorized actions first while keeping ordinary cells compact', async () => {
    const { container } = render(<DeclarativeDataGrid aria-label="顺序规范"><thead><tr><th>编码</th><th>说明</th><th>操作</th><th data-wrap="true">完整备注</th></tr></thead><tbody><tr key="a"><td>A-001</td><td>默认单行内容</td><td><RowActionButton label="审核" onClick={() => {}} /><RowActionButton label="删除" onClick={() => {}} /><RowActionButton label="修改" onClick={() => {}} /></td><td>按设计完整显示的较长文字</td></tr></tbody></DeclarativeDataGrid>);
    await screen.findByRole('columnheader', { name: '编码' });
    expect(screen.getAllByRole('columnheader').map((header) => header.textContent)).toEqual(['序号', '操作', '编码', '说明', '完整备注']);
    expect(container.querySelector('.ag-cell-wrap-text')?.textContent).toContain('按设计完整显示');
    expect(screen.getByRole('button', { name: '修改' })).toHaveAttribute('data-row-action', 'edit');
    expect(screen.getByRole('button', { name: '删除' })).toHaveAttribute('data-row-action', 'delete');
    expect(screen.getByRole('button', { name: '审核' })).toHaveAttribute('data-row-action', 'review');
  });
  it('keeps header selection, controlled edits and row operations on the common grid', async () => {
    const action = vi.fn();
    function Example() {
      const [value, setValue] = useState('初始值'), [checked, setChecked] = useState(false);
      return <DeclarativeDataGrid aria-label="适配示例"><thead><tr><th><input aria-label="全选示例" type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} /></th><th>编码</th><th>参数值</th><th>操作</th></tr></thead><tbody><tr key="record"><td><input type="checkbox" aria-label="选择记录" checked={checked} onChange={(e) => setChecked(e.target.checked)} /></td><td><a href="#/record">R001</a></td><td><input aria-label="修改参数" value={value} onChange={(e) => setValue(e.target.value)} /></td><td><button onClick={action}>修改记录</button></td></tr></tbody><tfoot><tr><th>汇总</th><td>共1条</td></tr></tfoot></DeclarativeDataGrid>;
    }
    const user = userEvent.setup(); const { container } = render(<Example />);
    expect(await screen.findByRole('grid', { name: '适配示例' })).toBeInTheDocument();
    await user.click(screen.getByLabelText('全选示例')); expect(screen.getByLabelText('选择记录')).toBeChecked();
    await user.clear(screen.getByLabelText('修改参数')); await user.type(screen.getByLabelText('修改参数'), '连续输入123');
    expect(screen.getByLabelText('修改参数')).toHaveValue('连续输入123');
    await user.click(screen.getByRole('button', { name: '修改记录' })); expect(action).toHaveBeenCalledOnce();
    expect(screen.getByText('共1条')).toBeInTheDocument(); expect(container.querySelector('table')).toBeNull();
    expect(screen.queryByText('列设置')).not.toBeInTheDocument();
  });
  it('preserves Enter entry, Tab focus, amounts and undo for editable records', async () => {
    function EditableExample() {
      const [quantity, setQuantity] = useState(2), [editing, setEditing] = useState(false), [draft, setDraft] = useState('2'), [removed, setRemoved] = useState(false);
      useLayoutEffect(() => { if (editing) document.getElementById('qa-quantity')?.focus(); }, [editing]);
      return <DeclarativeDataGrid aria-label="编辑兼容验证"><thead><tr><th>数量</th><th>金额</th><th>操作</th></tr></thead><tbody><tr key="row" aria-label="编辑验证记录" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' && e.target === e.currentTarget) { e.preventDefault(); setEditing(true); } }}>
        <td>{editing ? <input id="qa-quantity" aria-label="输入数量" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Tab') { e.preventDefault(); setQuantity(Number(draft)); setEditing(false); document.getElementById('qa-action')?.focus(); } }} /> : <button onClick={() => setEditing(true)}>编辑数量</button>}</td><td>{quantity * 125}</td><td>{removed ? <button id="qa-action" onClick={() => setRemoved(false)}>撤销删除记录</button> : <button id="qa-action" onClick={() => setRemoved(true)}>删除记录</button>}</td>
      </tr></tbody></DeclarativeDataGrid>;
    }
    const user = userEvent.setup(); render(<EditableExample />);
    const row = await screen.findByRole('row', { name: '编辑验证记录' }); row.focus(); await user.keyboard('{Enter}');
    expect(screen.getByLabelText('输入数量')).toHaveFocus(); await user.clear(screen.getByLabelText('输入数量')); await user.type(screen.getByLabelText('输入数量'), '3'); await user.keyboard('{Tab}');
    expect(screen.getByRole('button', { name: '删除记录' })).toHaveFocus(); expect(screen.getByText('375')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '删除记录' })); await user.click(screen.getByRole('button', { name: '撤销删除记录' })); expect(screen.getByRole('button', { name: '删除记录' })).toBeInTheDocument();
  });
  it('keeps safe empty messages and does not render placeholder rows as records', async () => {
    const { container } = render(<DeclarativeDataGrid aria-label="空列表"><thead><tr><th>名称</th></tr></thead><tbody><GridEmpty>未配置&lt;测试&gt;</GridEmpty></tbody></DeclarativeDataGrid>);
    await waitFor(() => expect(screen.getByText('未配置<测试>')).toBeInTheDocument());
    expect(container.querySelector('.ag-row')).toBeNull();
  });
});
