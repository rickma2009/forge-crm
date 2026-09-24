import { render, screen } from '@testing-library/react';
import { RootApp } from './RootApp';
import { vi, afterEach, beforeEach } from 'vitest';

describe('CRM is the only application root', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({ code: 'UNAUTHENTICATED', message: '请先登录', requestId: 'test-request' }) }));
  });
  afterEach(() => { vi.unstubAllGlobals(); window.history.replaceState({}, '', '/'); });
  it.each(['/', '/?pattern=EPM-PAGE-001', '/?pattern=EPM-ACT-001#old-catalog'])('opens CRM instead of the removed catalog from %s', async (url) => {
    window.history.replaceState({}, '', url);
    render(<RootApp />);
    expect(await screen.findByRole('heading', { name: '登录演示门户' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: '分类项目录' })).not.toBeInTheDocument();
    expect(window.location.search).not.toContain('pattern=');
    expect(window.location.hash).toBe('#/showcase/customers');
  });
  it('preserves the actual CRM role route while stripping an obsolete pattern parameter', async () => {
    window.history.replaceState({}, '', '/?pattern=EPM-PAGE-001#/showcase/system/roles');
    render(<RootApp />);
    expect(await screen.findByRole('heading', { name: '登录演示门户' })).toBeInTheDocument();
    expect(window.location.hash).toBe('#/showcase/system/roles');
    expect(window.location.search).toBe('');
  });
  it('preserves unrelated query and business deep-link parameters', async () => {
    window.history.replaceState({}, '', '/?pattern=EPM-PAGE-001&keep=1#/showcase/system/roles?view=members');
    render(<RootApp />);
    expect(await screen.findByRole('heading', { name: '登录演示门户' })).toBeInTheDocument();
    expect(window.location.search).toBe('?keep=1');
    expect(window.location.hash).toBe('#/showcase/system/roles?view=members');
  });
});
