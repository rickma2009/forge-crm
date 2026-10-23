import { parseAnalysisResult, snapshotHash, mockAnalysis } from './analysis-domain';

describe('AI analysis evidence and snapshots', () => {
  const sources = [{ id: 'F1', kind: 'follow-up', title: '跟进', content: { text: '客户要求十月交付' } }];
  it('rejects a fabricated source instead of presenting it as evidence', () => {
    const result = mockAnalysis(sources);
    result.sections[0].items[0] = { text: '十月交付', kind: 'FACT', sourceIds: ['invented'] };
    expect(() => parseAnalysisResult(result, sources)).toThrow('引用');
  });
  it('requires evidence for facts and preserves all six sections', () => {
    const result = mockAnalysis(sources);
    expect(parseAnalysisResult(result, sources).sections).toHaveLength(6);
    result.sections[0].items[0] = { text: '没有依据的事实', kind: 'FACT', sourceIds: [] };
    expect(() => parseAnalysisResult(result, sources)).toThrow();
  });
  it('detects a changed follow-up but ignores object property ordering', () => {
    expect(snapshotHash({ a: 1, b: 2 })).toBe(snapshotHash({ b: 2, a: 1 }));
    expect(snapshotHash(sources)).not.toBe(snapshotHash([{ ...sources[0], content: { text: '延期' } }]));
  });
  it('rejects historical analysis as the only fact source', () => {
    const history = { id: 'H1', kind: 'historical-analysis', title: '历史判断', content: { text: '预计可按期交付' } };
    const result = mockAnalysis([...sources, history]);
    result.sections[0].items[0] = { text: '可按期交付', kind: 'FACT', sourceIds: ['H1'] };
    expect(() => parseAnalysisResult(result, [...sources, history])).toThrow('历史分析不能作为独立事实依据');
    result.sections[0].items[0].sourceIds = ['H1', 'F1'];
    expect(parseAnalysisResult(result, [...sources, history]).sections).toHaveLength(6);
  });
  it('validates reference structure without claiming semantic verification', () => {
    const result = mockAnalysis(sources);
    // F1 says the customer requested October delivery; it does not prove actual delivery.
    const unsupportedText = '客户已收到全部货物并完成验收';
    result.sections[0].items[0] = { text: unsupportedText, kind: 'FACT', sourceIds: ['F1'] };
    expect(parseAnalysisResult(result, sources).sections[0].items[0].text).toBe(unsupportedText);
    // This documents the current boundary, not approval to save without human review.
  });
});
