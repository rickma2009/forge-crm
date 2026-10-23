import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { loadInteractionCatalog, seedInteractionCatalog } from './style-scene.seed';

const projectRoot = resolve(process.cwd(), '../..');

function temporaryRegistry(mutate: (source: Record<string, unknown>) => void): string {
  const root = mkdtempSync(join(tmpdir(), 'forge-crm-scenes-'));
  const directory = join(root, '_methodology/patterns');
  mkdirSync(directory, { recursive: true });
  const source = JSON.parse(readFileSync(join(projectRoot, '_methodology/patterns/index.json'), 'utf8')) as Record<string, unknown>;
  mutate(source);
  writeFileSync(join(directory, 'index.json'), JSON.stringify(source));
  return root;
}

describe('interaction catalog seed adapter', () => {
  it('loads and maps all 113 methodology assets including component demos', () => {
    const rows = loadInteractionCatalog(projectRoot);
    expect(rows).toHaveLength(113);
    expect(rows[0]).toMatchObject({
      assetCode: 'EPM-PAGE-001', category: 'PAGE', subCategory: '系统与任务入口类', sceneName: '应用壳层',
      description: '多模块企业系统；导航、顶栏、内容区、账户区；菜单可见性不能代替授权',
      maturity: 'interaction-verified', status: 'DONE', sortNo: 10,
      definitionJson: ['多模块企业系统', '导航、顶栏、内容区、账户区', '菜单可见性不能代替授权'],
      definitionRefJson: { path: '_methodology/08-企业管理系统交互模式分类方法.md', section: '系统与任务入口类' },
    });
    expect(rows[0].artifactsJson).toContain('_methodology/patterns/enterprise-two-level-navigation-shell.md');
    expect(rows[0].evidenceJson).toContain('mcrm:003-enterprise-navigation-shell');
    expect(rows[0].evidenceCardsJson).toEqual([]);
    expect(rows[0].nextEvidence).toBe('在第二个独立真实项目采用并复核边界');
    expect(rows.find((row) => row.assetCode === 'EPM-COMPONENT-003')).toMatchObject({
      category: 'COMPONENT', subCategory: '树与层级', sceneName: '树形工作区', pagePath: '/showcase/items',
    });
    expect(rows.find((row) => row.assetCode === 'EPM-PAGE-014')?.pagePath).toBe('/showcase/items');
  });

  it('rejects duplicate asset ids', () => {
    const root = temporaryRegistry((source) => {
      const assets = source.assets as unknown[];
      assets.push(structuredClone(assets[0]));
    });
    expect(() => loadInteractionCatalog(root)).toThrow('INTERACTION_ASSET_DUPLICATE:EPM-PAGE-001');
  });

  it('rejects asset ids longer than the database contract', () => {
    const root = temporaryRegistry((source) => {
      (source.assets as Array<{ assetId: string }>)[0].assetId = 'A'.repeat(33);
    });
    expect(() => loadInteractionCatalog(root)).toThrow();
  });

  it('upserts by system and asset code without touching historical rows', async () => {
    const upsert = jest.fn().mockResolvedValue({ id: 'asset-row' });
    const database = { styleScene: { upsert } };
    await expect(seedInteractionCatalog(database as never, 'demo-portal', projectRoot)).resolves.toBe(113);
    expect(upsert).toHaveBeenCalledTimes(113);
    expect(upsert.mock.calls[0][0].where).toEqual({ systemCode_assetCode: { systemCode: 'demo-portal', assetCode: 'EPM-PAGE-001' } });
    expect(upsert.mock.calls[0][0].update).not.toHaveProperty('id');
    expect(upsert.mock.calls[0][0].create).toMatchObject({ systemCode: 'demo-portal', assetCode: 'EPM-PAGE-001', createdBy: 'seed', updatedBy: 'seed' });
  });
});
