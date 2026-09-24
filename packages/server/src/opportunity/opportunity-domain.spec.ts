import { calculateExpectedAmount, ensureAnalysisCompetitors, ensureStageTemplate } from './opportunity-domain';

describe('opportunity domain rules', () => {
  it('calculates expected amount to two decimals', () => {
    expect(calculateExpectedAmount(3, 12.345)).toBe(37.04);
  });

  it('rejects a stage outside the selected template', () => {
    expect(() => ensureStageTemplate('template-a', { templateId: 'template-b', status: 'ACTIVE' })).toThrow('商机阶段不属于所选模板');
  });

  it('rejects disabled stages and duplicate competitors', () => {
    expect(() => ensureStageTemplate('template-a', { templateId: 'template-a', status: 'DISABLED' })).toThrow('商机阶段已停用');
    expect(() => ensureAnalysisCompetitors(['a', 'a'])).toThrow('主要竞争对手不能重复');
  });
});
