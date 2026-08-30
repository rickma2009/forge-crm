import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';

describe('Interaction Pattern Lab', () => {
  it('非法模式地址回退到稳定首项', () => {
    window.history.replaceState({}, '', '/?pattern=UNKNOWN');
    render(<App />);
    expect(screen.getByRole('heading', { name: '企业双层导航壳层' })).toBeInTheDocument();
    expect(window.location.search).toContain('pattern=EPM-PAGE-001');
  });

  it('搜索、清空并在同一上下文切换模式', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByRole('heading', { name: '企业双层导航壳层' })).toBeInTheDocument();
    await user.type(screen.getByRole('searchbox', { name: '搜索交互模式' }), '不存在');
    expect(screen.getByText('没有匹配的模式')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '清空搜索' }));
    await user.click(screen.getByRole('button', { name: /标准场景/ }));
    await user.click(screen.getByRole('button', { name: /记录管理工作区/ }));

    expect(screen.getByRole('heading', { name: '记录管理工作区' })).toBeInTheDocument();
    expect(window.location.search).toContain('pattern=EPM-SCENE-001');
    await waitFor(() => expect(screen.getByRole('heading', { name: '记录列表' })).toBeInTheDocument());
  });

  it('平台自身使用双层导航壳层组织分类和模式', async () => {
    const user = userEvent.setup();
    window.history.replaceState({}, '', '/?pattern=EPM-PAGE-001');
    render(<App />);

    expect(screen.getByRole('complementary', { name: '交互模式平台导航' })).toHaveAttribute('data-collapsed', 'false');
    expect(screen.getByRole('button', { name: /页面结构/ })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: /企业双层导航壳层/ })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: /标准场景/ })).toHaveAttribute('aria-expanded', 'false');

    await user.click(screen.getByRole('button', { name: /标准场景/ }));
    expect(screen.getByRole('button', { name: /记录管理工作区/ })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '折叠平台导航' }));
    expect(screen.getByRole('complementary', { name: '交互模式平台导航' })).toHaveAttribute('data-collapsed', 'true');
  });

  it('模式说明与当前原型保持一致且包含证据字段', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('tab', { name: '模式说明' }));

    expect(screen.getByText('适用边界')).toBeInTheDocument();
    expect(screen.getByText('不适用边界')).toBeInTheDocument();
    expect(screen.getByText('来源与验证')).toBeInTheDocument();
    expect(screen.queryByText('最佳实践')).not.toBeInTheDocument();
  });

  it('工作台重置通过重新挂载恢复 Demo 预置状态', async () => {
    const user = userEvent.setup();
    render(<App />);
    const menuSearch = await screen.findByRole('searchbox', { name: '搜索案例菜单' });
    await user.type(menuSearch, '流程');
    expect(menuSearch).toHaveValue('流程');
    await user.click(screen.getByRole('button', { name: '重置当前 Demo' }));
    expect(await screen.findByRole('searchbox', { name: '搜索案例菜单' })).toHaveValue('');
    expect(screen.getByRole('status')).toHaveTextContent('已恢复预置状态');
  });
});
