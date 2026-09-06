import { render, screen } from '@testing-library/react';
import { RootApp } from './RootApp';
import { vi } from 'vitest';

describe('parallel lab roots', () => {
  it('TC-414: keeps the approved catalog as the default root', () => {
    window.history.replaceState({}, '', '/?pattern=EPM-PAGE-001');
    render(<RootApp />);
    expect(screen.getByRole('heading', { name: '应用壳层' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '进入演示门户' })).toHaveAttribute('href', '#/showcase/overview');
  });

  it('TC-403: selects the database-backed showcase only for its hash namespace', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({ code: 'UNAUTHENTICATED', message: '请先登录', requestId: 'test-request' }) }));
    window.location.hash = '#/showcase/overview';
    render(<RootApp />);
    expect(await screen.findByRole('heading', { name: '登录演示门户' })).toBeInTheDocument();
    vi.unstubAllGlobals();
  });
});
