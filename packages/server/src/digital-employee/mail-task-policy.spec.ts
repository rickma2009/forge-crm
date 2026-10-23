import { deMailAutomationConfigSchema, deTaskSchema } from '@forge-crm/contracts';
import { mailTaskAlert, resolveMailTaskPolicy, belongsToMailbox } from './mail-automation.service';

describe('mail digital employee task policy', () => {
  it('never includes another connection solely because tasks share a scene',()=>{expect(belongsToMailbox({evidence:['mail:qq:21']},'gmail')).toBe(false);expect(belongsToMailbox({evidence:['mail:qq:21']},'qq')).toBe(true);expect(belongsToMailbox({evidence:[]},'qq')).toBe(false);});
  const config = deMailAutomationConfigSchema.parse({});

  it('routes quality complaints to their own urgent queue and evidence rule', () => {
    expect(resolveMailTaskPolicy(config, '质量与客诉')).toMatchObject({
      queue: '质量与售后队列',
      priority: 'URGENT',
      responseMinutes: 30,
      completionRule: 'QUALITY_RECORD_AND_REPLY',
    });
  });

  it('falls back to the general mail policy for an unknown classification', () => {
    expect(resolveMailTaskPolicy(config, '未知分类')).toMatchObject({
      queue: '综合队列',
      priority: 'LOW',
      completionRule: 'NOTE_OR_REPLY',
    });
  });

  it('uses the email waiting-reply reminder instead of the normal resolution clock', () => {
    const task = deTaskSchema.parse({ id:'MAIL-1',title:'[一般邮件] 回复',employee:'邮件数字员工',domain:'协同',object:'a@example.com',risk:'LOW',status:'WAITING_EXTERNAL',due:'待回复',owner:'张三',trigger:'收到邮件',output:'回复',action:'等待',finding:'已回复',evidence:[],plan:[],requiresApproval:false,pausedAt:'2026-10-01T00:00:00.000Z' });
    expect(mailTaskAlert(task,config,new Date('2026-10-04T00:01:00.000Z'))).toBe('OVERDUE');
  });
});
