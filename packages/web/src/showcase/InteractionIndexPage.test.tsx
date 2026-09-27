import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { StyleSceneDetail, StyleSceneList, StyleSceneSummary, StyleSceneTaxonomy } from '@forge-crm/contracts';
import type { EnterpriseGateway } from './gateway';
import { InteractionIndexPage } from './InteractionIndexPage';

const scene = (overrides: Partial<StyleSceneSummary> = {}): StyleSceneSummary => ({
  id: '00000000-0000-4000-8000-000000000026', assetCode: 'EPM-PAGE-001', category: 'PAGE', subCategory: '系统与任务入口类',
  sceneName: '应用壳层', description: '导航、顶栏、内容区、账户区', maturity: 'interaction-verified', status: 'DONE', pagePath: null, note: null,
  doneAt: null, sortNo: 10, version: 1, ...overrides,
});
const detail = (overrides: Partial<StyleSceneDetail> = {}): StyleSceneDetail => ({
  ...scene(), definition: ['多模块企业系统', '菜单可见性不能代替授权'],
  definitionRef: { path: '_methodology/08-企业管理系统交互模式分类方法.md', section: '系统与任务入口类' },
  artifacts: ['packages/web/src/showcase/ShowcaseApp.tsx'], evidence: ['slice-003'], evidenceCards: [], nextEvidence: '独立项目验证', ...overrides,
});
const taxonomy: StyleSceneTaxonomy = { types: [
  { category: 'PAGE', count: 2, groups: [{ subCategory: '系统与任务入口类', count: 1 }, { subCategory: '目录类', count: 1 }] },
  { category: 'SPECIAL', count: 1, groups: [] },
] };
const list = (items: StyleSceneSummary[] = [scene()], page = 1, total = items.length): StyleSceneList => ({ items, pagination: { page, pageSize: 20, total, totalPages: Math.ceil(total / 20) } });

function gateway(overrides: Partial<EnterpriseGateway> = {}): EnterpriseGateway {
  return {
    styleSceneTaxonomy: vi.fn().mockResolvedValue(taxonomy),
    styleScenes: vi.fn().mockResolvedValue(list()),
    styleSceneDetail: vi.fn().mockResolvedValue(detail()),
    ...overrides,
  } as unknown as EnterpriseGateway;
}

describe('database-backed interaction catalog', () => {
  it('renders a counted two-level tree, filters the grid, and resets every directory filter', async () => {
    const api = gateway();
    render(<InteractionIndexPage systemCode="demo-portal" gateway={api} />);
    expect(await screen.findByRole('treeitem', { name: 'PAGE（2）' })).toHaveAttribute('aria-level', '1');
    expect(screen.getByRole('treeitem', { name: '系统与任务入口类（1）' })).toHaveAttribute('aria-level', '2');
    expect(screen.getByRole('treeitem', { name: 'SPECIAL（1）' })).not.toHaveAttribute('aria-expanded');
    expect(await screen.findByRole('button', { name: 'EPM-PAGE-001' })).toBeInTheDocument();
    for (const heading of ['序号', '案例编码', '案例名称', '类型', '分组', '成熟度', '当前状态']) expect(screen.getByRole('columnheader', { name: heading })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('treeitem', { name: '系统与任务入口类（1）' }));
    await waitFor(() => expect(api.styleScenes).toHaveBeenLastCalledWith('demo-portal', expect.any(URLSearchParams)));
    expect((api.styleScenes as ReturnType<typeof vi.fn>).mock.calls.at(-1)?.[1].toString()).toContain('subCategory=%E7%B3%BB%E7%BB%9F%E4%B8%8E%E4%BB%BB%E5%8A%A1%E5%85%A5%E5%8F%A3%E7%B1%BB');

    fireEvent.change(screen.getByLabelText('关键词'), { target: { value: '壳层' } });
    fireEvent.change(screen.getByLabelText('成熟度'), { target: { value: 'released' } });
    fireEvent.click(screen.getByRole('button', { name: '查询' }));
    await waitFor(() => expect((api.styleScenes as ReturnType<typeof vi.fn>).mock.calls.at(-1)?.[1].toString()).toContain('keyword=%E5%A3%B3%E5%B1%82'));
    fireEvent.click(screen.getByRole('button', { name: '重置' }));
    expect(screen.getByLabelText('关键词')).toHaveValue('');
    expect(screen.getByLabelText('成熟度')).toHaveValue('');
    expect(screen.getByRole('treeitem', { name: '系统与任务入口类（1）' })).toHaveAttribute('aria-selected', 'false');
    await waitFor(() => expect(screen.getByRole('button', { name: 'EPM-PAGE-001' })).toBeEnabled());

    fireEvent.click(screen.getByRole('treeitem', { name: 'SPECIAL（1）' }));
    await waitFor(() => expect((api.styleScenes as ReturnType<typeof vi.fn>).mock.calls.at(-1)?.[1].toString()).toContain('category=SPECIAL'));
  });

  it('replaces the directory with detail and restores query, tree, and page on return', async () => {
    const api = gateway({ styleScenes: vi.fn().mockImplementation(async (_system, query: URLSearchParams) => list([scene()], Number(query.get('page') ?? 1), 41)) });
    render(<InteractionIndexPage systemCode="demo-portal" gateway={api} />);
    await screen.findByRole('button', { name: 'EPM-PAGE-001' });
    fireEvent.change(screen.getByLabelText('关键词'), { target: { value: '应用' } });
    fireEvent.click(screen.getByRole('button', { name: '查询' }));
    fireEvent.click(screen.getByRole('treeitem', { name: 'PAGE（2）' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '下一页' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: '下一页' }));
    await waitFor(() => expect(screen.getByText('第 2 / 3 页')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'EPM-PAGE-001' }));
    expect(await screen.findByRole('heading', { name: '应用壳层', level: 1 })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('_methodology/08-企业管理系统交互模式分类方法.md')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '返回交互案例目录' }));
    expect(screen.getByLabelText('关键词')).toHaveValue('应用');
    expect(screen.getByRole('treeitem', { name: 'PAGE（2）' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('第 2 / 3 页')).toBeInTheDocument();
  });

  it('renders historical null detail fields as placeholders', async () => {
    const historical = scene({ id: '00000000-0000-4000-8000-000000000099', assetCode: null, maturity: null, sceneName: '历史场景' });
    const api = gateway({ styleScenes: vi.fn().mockResolvedValue(list([historical])), styleSceneDetail: vi.fn().mockResolvedValue(detail({ ...historical, definition: [], definitionRef: null, artifacts: [], evidence: [], evidenceCards: [], nextEvidence: null })) });
    render(<InteractionIndexPage systemCode="demo-portal" gateway={api} />);
    expect(await screen.findByRole('button', { name: '历史场景' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '查看 历史场景' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '历史场景' }));
    expect(await screen.findByRole('heading', { name: '历史场景', level: 1 })).toBeInTheDocument();
    expect(screen.getAllByText('暂无').length).toBeGreaterThan(0);
  });

  it('shows retryable API errors and never falls back to a bundled asset', async () => {
    const styleScenes = vi.fn().mockRejectedValueOnce(new Error('数据库不可用')).mockResolvedValueOnce(list([]));
    const api = gateway({ styleScenes });
    render(<InteractionIndexPage systemCode="demo-portal" gateway={api} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('数据库不可用');
    expect(screen.queryByText('应用壳层')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '重试列表' }));
    await waitFor(() => expect(styleScenes).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('没有匹配的交互案例，请调整筛选条件。')).toBeInTheDocument();
  });

  it('ignores an older list response that resolves after a newer query', async () => {
    let resolveOld!: (value: StyleSceneList) => void;
    let resolveNew!: (value: StyleSceneList) => void;
    const styleScenes = vi.fn()
      .mockImplementationOnce(() => new Promise<StyleSceneList>((resolve) => { resolveOld = resolve; }))
      .mockImplementationOnce(() => new Promise<StyleSceneList>((resolve) => { resolveNew = resolve; }));
    render(<InteractionIndexPage systemCode="demo-portal" gateway={gateway({ styleScenes })} />);
    await screen.findByRole('treeitem', { name: 'PAGE（2）' });
    fireEvent.click(screen.getByRole('treeitem', { name: 'PAGE（2）' }));
    resolveNew(list([scene({ assetCode: 'NEW-RESULT', sceneName: '新结果' })]));
    expect(await screen.findByText('新结果')).toBeInTheDocument();
    resolveOld(list([scene({ assetCode: 'OLD-RESULT', sceneName: '旧结果' })]));
    await waitFor(() => expect(screen.queryByText('旧结果')).not.toBeInTheDocument());
  });
});
