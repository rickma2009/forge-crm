import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TreeWorkspace } from './TreeWorkspace';
const nodes = [{ id: 'a', parentId: null, label: '总部', searchText: 'HQ' }, { id: 'b', parentId: 'a', label: '销售部' }, { id: 'c', parentId: null, label: '分公司' }];
describe('TreeWorkspace', () => {
  it('搜索保留祖先，统一展开收起与刷新', () => {
    const refresh = vi.fn(); render(<TreeWorkspace title="组织" nodes={nodes} onSelect={vi.fn()} onRefresh={refresh}><p>详情</p></TreeWorkspace>);
    fireEvent.click(screen.getByRole('button', { name: '组织树选项' }));
    fireEvent.click(screen.getByText('全部收起')); expect(screen.queryByRole('treeitem', { name: '销售部' })).toBeNull();
    fireEvent.change(screen.getByLabelText('搜索组织'), { target: { value: '销售' } });
    expect(screen.getByRole('treeitem', { name: '总部' })).toBeTruthy(); expect(screen.getByRole('treeitem', { name: '销售部' })).toBeTruthy(); expect(screen.queryByRole('treeitem', { name: '分公司' })).toBeNull();
    fireEvent.change(screen.getByLabelText('搜索组织'), { target: { value: '' } }); fireEvent.click(screen.getByText('全部展开')); expect(screen.getAllByRole('treeitem')).toHaveLength(3);
    fireEvent.click(screen.getByLabelText('刷新组织')); expect(refresh).toHaveBeenCalledOnce();
  });
  it('键盘选择、业务菜单、计数、调宽与收放不丢失右侧内容', () => {
    const select = vi.fn(), edit = vi.fn(); const { container } = render(<TreeWorkspace title="组织" nodes={nodes} selectedId="a" onSelect={select} onRefresh={vi.fn()} actions={() => [{ key: 'edit', label: '编辑', run: edit }]}><input aria-label="详情内容" defaultValue="未保存内容" /></TreeWorkspace>);
    const root = screen.getByRole('treeitem', { name: '总部' }); root.focus(); fireEvent.keyDown(root, { key: 'ArrowDown' }); expect(document.activeElement).toBe(screen.getByRole('treeitem', { name: '销售部' })); fireEvent.keyDown(document.activeElement!, { key: 'Enter' }); expect(select).toHaveBeenCalledWith('b');
    fireEvent.click(screen.getByLabelText('总部操作')); fireEvent.click(screen.getByRole('menuitem', { name: '编辑' })); expect(edit).toHaveBeenCalledOnce();
    expect((container.firstChild as HTMLElement).style.getPropertyValue('--tree-width')).toBe('282px');
    expect(screen.getByText('共 3 个节点')).toBeTruthy(); fireEvent.change(screen.getByLabelText('面板宽度'), { target: { value: '400' } }); expect((container.firstChild as HTMLElement).style.getPropertyValue('--tree-width')).toBe('400px');
    fireEvent.click(screen.getByLabelText('收起组织树')); expect(screen.queryByRole('tree')).toBeNull(); expect((screen.getByLabelText('详情内容') as HTMLInputElement).value).toBe('未保存内容'); fireEvent.click(screen.getByLabelText('展开组织树')); expect(screen.getAllByRole('treeitem')).toHaveLength(3);
  });
  it('只读树不显示写入入口，空树明确提示', () => { render(<TreeWorkspace title="分类" nodes={[]} onSelect={vi.fn()} onRefresh={vi.fn()}>内容</TreeWorkspace>); expect(screen.getByText('暂无节点')).toBeTruthy(); expect(screen.queryByText('新增')).toBeNull(); });
});
