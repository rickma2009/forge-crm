import { listRegisteredDemoIds } from './demoRegistry';
import { getPattern, getValidationSlice, listPatterns, listValidationSlices, resolvePatternId } from './patterns';

describe('Pattern Catalog', () => {
  it('TC-301/305: 提供 103 个分类项并保持两个既有资产的真实成熟度', () => {
    const patterns = listPatterns();
    expect(patterns).toHaveLength(103);
    expect(patterns.find((pattern) => pattern.id === 'EPM-PAGE-001')?.maturity).toBe('interaction-verified');
    expect(patterns.find((pattern) => pattern.id === 'EPM-SCENE-001')?.maturity).toBe('implementation-verified');
    expect(patterns.find((pattern) => pattern.id === 'EPM-PAGE-010')?.maturity).toBe('idea');
  });

  it.each(['应用壳层', 'EPM-PAGE-001', '系统与任务入口类', '多模块企业系统'])(
    'TC-302: 按名称、编号、分组或定义检索：%s',
    (query) => expect(listPatterns({ query: `  ${query}  ` }).map((pattern) => pattern.id)).toContain('EPM-PAGE-001'),
  );

  it('TC-302/303/318: 组合成熟度与 Demo 可用性筛选且无 Demo 项合法', () => {
    expect(listPatterns({ demoAvailability: 'none' })).toHaveLength(76);
    expect(listPatterns({ demoAvailability: 'available' })).toHaveLength(27);
    expect(listPatterns({ maturity: 'interaction-verified', demoAvailability: 'available' }).map((pattern) => pattern.id)).toEqual(['EPM-PAGE-001']);
    expect(listPatterns({ query: '不存在的分类项', maturity: 'idea' })).toEqual([]);
  });

  it('TC-306: coveredBy 关联 VAL-002 但不传播成熟度', () => {
    const pattern = getPattern('EPM-SPECIAL-002');
    expect(pattern?.maturity).toBe('idea');
    expect(pattern?.coveredBy).toContain('VAL-002');
    expect(getValidationSlice('VAL-002')?.primaryAssetId).toBe('EPM-SPECIAL-002');
  });

  it('NFR-305: 每个声明 Catalog Demo 的 manifest 条目都有显式 Adapter；候选验证可诚实地没有 Demo', () => {
    const registered = listRegisteredDemoIds();
    expect(registered).toHaveLength(3);
    for (const validation of listValidationSlices()) {
      if (validation.demoId) expect(registered).toContain(validation.demoId);
    }
    expect(getValidationSlice('VAL-010')).toMatchObject({ validationState: 'in-lab-candidate' });
  });

  it('空白查询返回完整目录，非法编号回退稳定首项', () => {
    expect(listPatterns({ query: '   ' })).toHaveLength(103);
    expect(resolvePatternId('unknown')).toBe('EPM-PAGE-001');
    expect(getPattern('EPM-SCENE-001')?.name).toBe('查询—新增—详情');
  });
});
