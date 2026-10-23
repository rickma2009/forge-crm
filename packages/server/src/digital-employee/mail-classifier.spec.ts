import { classifyMail } from './mail-classifier';

describe('mail classifier',()=>{
  it('routes RFQ mail to sales quotation work',()=>expect(classifyMail('客户 RFQ 请在周五前报价').label).toBe('询价与报价'));
  it('prioritizes quality complaints',()=>expect(classifyMail('客户投诉批次不良，请提供 8D').risk).toBe('HIGH'));
  it('does not treat a generic account anomaly notice as a product-quality issue',()=>expect(classifyMail('如发现帐号异常，请及时修改密码').label).toBe('一般邮件'));
  it('still recognizes contextual production anomalies',()=>expect(classifyMail('检验发现该批次产品异常').label).toBe('质量与客诉'));
  it('prioritizes the subject business intent over unrelated boilerplate',()=>expect(classifyMail('京东已收到您的订单\n如对商品质量有疑问请联系客服').label).toBe('订单处理'));
  it('recognizes English order notifications from their subject',()=>expect(classifyMail('Order Notification (1001)\nPrice details follow').label).toBe('订单处理'));
  it('does not match an embedded 8d token as an 8D quality request',()=>expect(classifyMail('Electronic statement\nhttps://example.test/token/a8d31').label).toBe('财务与对账'));
  it('keeps unmatched messages as low-risk general mail',()=>expect(classifyMail('节日问候').risk).toBe('LOW'));
});
