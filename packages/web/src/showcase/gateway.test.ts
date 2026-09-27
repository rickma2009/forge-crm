import { afterEach, describe, expect, it, vi } from 'vitest';
import { httpNavigationGateway } from './gateway';

const summary = {
  id: '00000000-0000-4000-8000-000000000026', assetCode: 'EPM-PAGE-001', category: 'PAGE', subCategory: '目录类',
  sceneName: '查询列表', description: '标准查询列表', maturity: 'released', status: 'DONE', pagePath: null, note: null,
  doneAt: null, sortNo: 10, version: 1,
};
const detail = { ...summary, definition: ['单行查询'], definitionRef: null, artifacts: [], evidence: [], evidenceCards: [], nextEvidence: null };

function response(body: unknown): Response {
  return { ok: true, status: 200, json: vi.fn().mockResolvedValue(body) } as unknown as Response;
}

describe('interaction catalog gateway', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('requests and validates taxonomy, filtered summaries, and encoded detail', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(response({ types: [{ category: 'PAGE', count: 1, groups: [{ subCategory: '目录类', count: 1 }] }] }))
      .mockResolvedValueOnce(response({ items: [summary], pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 } }))
      .mockResolvedValueOnce(response(detail));
    vi.stubGlobal('fetch', fetch);
    const query = new URLSearchParams({ category: 'PAGE', subCategory: '目录类', page: '1' });

    await expect(httpNavigationGateway.styleSceneTaxonomy('demo/portal')).resolves.toMatchObject({ types: [{ category: 'PAGE', count: 1 }] });
    await expect(httpNavigationGateway.styleScenes('demo/portal', query)).resolves.toMatchObject({ items: [{ assetCode: 'EPM-PAGE-001' }] });
    await expect(httpNavigationGateway.styleSceneDetail('demo/portal', 'id/26')).resolves.toMatchObject({ definition: ['单行查询'] });

    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      '/api/systems/demo%2Fportal/style-scenes/taxonomy',
      '/api/systems/demo%2Fportal/style-scenes?category=PAGE&subCategory=%E7%9B%AE%E5%BD%95%E7%B1%BB&page=1',
      '/api/systems/demo%2Fportal/style-scenes/id%2F26',
    ]);
  });

  it('rejects malformed taxonomy and detail payloads', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(response({ types: [], unexpected: true }))
      .mockResolvedValueOnce(response({ ...detail, evidenceCards: [{ evidenceId: 'broken' }] }));
    vi.stubGlobal('fetch', fetch);
    await expect(httpNavigationGateway.styleSceneTaxonomy('demo-portal')).rejects.toThrow();
    await expect(httpNavigationGateway.styleSceneDetail('demo-portal', summary.id)).rejects.toThrow();
  });
});
