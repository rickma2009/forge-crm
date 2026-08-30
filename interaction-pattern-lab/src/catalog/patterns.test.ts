import { getPattern, listPatterns, resolvePatternId } from './patterns';

describe('Pattern Catalog', () => {
  it('提供两个稳定、已验证一次的种子模式', () => {
    const patterns = listPatterns();
    expect(patterns.map((pattern) => pattern.id)).toEqual(['EPM-PAGE-001', 'EPM-SCENE-001']);
    expect(patterns.every((pattern) => pattern.validationStatus === 'validated-once')).toBe(true);
  });

  it.each(['导航', 'EPM-PAGE-001', '页面结构', '侧栏'])(
    '按名称、编号、分类或关键词检索：%s',
    (query) => expect(listPatterns(`  ${query}  `).map((pattern) => pattern.id)).toContain('EPM-PAGE-001'),
  );

  it('空白查询返回完整目录，非法模式回退稳定首项', () => {
    expect(listPatterns('   ')).toHaveLength(2);
    expect(resolvePatternId('unknown')).toBe('EPM-PAGE-001');
    expect(getPattern('EPM-SCENE-001')?.name).toBe('记录管理工作区');
  });
});
