import { quotePrintHtml } from './quotation-pdf';

describe('quotation customer PDF whitelist', () => {
  it('escapes customer text and excludes internal notes and price provenance', () => {
    const html = quotePrintHtml({ quoteCode: 'Q001', title: '<script>bad()</script>', customerName: '客户甲', contactName: '张三', quoteDate: '2026-09-23', validUntil: '2026-10-23', status: 'DRAFT', total: '0.14', terms: '用户填写条款', remark: 'INTERNAL_SECRET', lines: [{ productName: '产品甲', model: 'A', unit: '件', quantity: '3', unitPrice: '0.05', discount: '10', amount: '0.14', delivery: '月底', remark: '', suggestedPrice: 'SECRET_SUGGESTED' }] });
    expect(html).toContain('客户甲'); expect(html).toContain('草稿'); expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>'); expect(html).not.toContain('INTERNAL_SECRET'); expect(html).not.toContain('SECRET_SUGGESTED');
    expect(html).toContain('0.14'); expect(html).toContain('用户填写条款');
  });
});
