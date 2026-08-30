import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';

describe('Interaction Pattern Lab', () => {
  it('TC-301/304: 非法地址回退首项并准确表达 103 个分类项和成熟度', () => {
    window.history.replaceState({}, '', '/?pattern=UNKNOWN');
    render(<App />);
    expect(screen.getByRole('heading', { name: '应用壳层' })).toBeInTheDocument();
    expect(screen.getByText(/个分类项/)).toHaveTextContent('103 个分类项');
    expect(screen.getAllByText('interaction-verified').length).toBeGreaterThan(0);
    expect(screen.queryByText('已验证一次')).not.toBeInTheDocument();
    expect(window.location.search).toContain('pattern=EPM-PAGE-001');
  });

  it('TC-302/303: 搜索无结果可清空，成熟度和 Demo 可用性可组合筛选', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByRole('searchbox', { name: '搜索分类项' }), '绝无此分类');
    expect(screen.getByText('没有匹配的分类项')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '清空全部条件' }));
    await user.selectOptions(screen.getByRole('combobox', { name: '成熟度筛选' }), 'interaction-verified');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Demo 可用性筛选' }), 'available');
    expect(screen.getByRole('button', { name: /应用壳层，EPM-PAGE-001/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /查询—新增—详情/ })).not.toBeInTheDocument();
  });

  it('TC-303/318: 无 Demo 分类项默认显示说明且交互入口不可用', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.clear(screen.getByRole('searchbox', { name: '搜索分类项' }));
    await user.type(screen.getByRole('searchbox', { name: '搜索分类项' }), 'EPM-PAGE-002');
    await user.click(screen.getByRole('button', { name: /工作台，EPM-PAGE-002/ }));
    expect(screen.getByRole('heading', { name: '工作台' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '交互演示' })).toBeDisabled();
    expect(screen.getByText('尚无交互演示')).toBeInTheDocument();
    expect(screen.getByText(/形成候选卡/)).toBeInTheDocument();
  });

  it('TC-306: 覆盖关系可定位 VAL-002 且成熟度仍为 idea', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByRole('searchbox', { name: '搜索分类项' }), 'EPM-SPECIAL-002');
    await user.click(screen.getByRole('button', { name: /批量操作，EPM-SPECIAL-002/ }));
    expect(screen.getAllByText('idea').length).toBeGreaterThan(0);
    expect(screen.getByText('VAL-002')).toBeInTheDocument();
    expect(screen.getByText('批量分配与部分成功')).toBeInTheDocument();
  });

  it('历史 Demo 仍可打开并通过重置恢复预置状态', async () => {
    const user = userEvent.setup();
    window.history.replaceState({}, '', '/?pattern=EPM-PAGE-001');
    render(<App />);
    await user.click(screen.getByRole('tab', { name: '交互演示' }));
    const menuSearch = await screen.findByRole('searchbox', { name: '搜索案例菜单' });
    await user.type(menuSearch, '流程');
    await user.click(screen.getByRole('button', { name: '重置当前 Demo' }));
    expect(await screen.findByRole('searchbox', { name: '搜索案例菜单' })).toHaveValue('');
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('已恢复预置状态'));
  });

  it('桌面折叠导航进入 64px 分类入口状态', async () => {
    const user = userEvent.setup();
    render(<App />);
    const catalog = screen.getByRole('complementary', { name: '交互模式平台导航' });
    await user.click(screen.getByRole('button', { name: '折叠平台导航' }));
    expect(catalog).toHaveAttribute('data-collapsed', 'true');
    expect(screen.getByRole('button', { name: '展开平台导航' })).toBeInTheDocument();
  });
});
