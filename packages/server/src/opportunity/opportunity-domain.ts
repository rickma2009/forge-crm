import { ApiException } from '../http/api-exceptions';

export function calculateExpectedAmount(quantity: number, unitPrice: number): number {
  return Math.round((quantity * unitPrice + Number.EPSILON) * 100) / 100;
}

export function ensureStageTemplate(templateId: string, stage: { templateId: string; status: string }): void {
  if (stage.templateId !== templateId) throw new ApiException('BAD_REQUEST', 400, '商机阶段不属于所选模板');
  if (stage.status !== 'ACTIVE') throw new ApiException('BAD_REQUEST', 400, '商机阶段已停用');
}

export function ensureAnalysisCompetitors(ids: string[]): void {
  if (new Set(ids).size !== ids.length) throw new ApiException('BAD_REQUEST', 400, '主要竞争对手不能重复');
}

/** Business lifecycle is independent of enable/disable and the sales stage. Dates use China calendar days. */
export function opportunityLifecycle(input: { businessStatus?: string; signedDate?: string | null; lostDate?: string | null; expectedSignDate?: string | null }, today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())) {
  const businessStatus = input.businessStatus ?? 'INITIAL';
  const signedDate = businessStatus === 'SIGNED' ? input.signedDate ?? null : null;
  const lostDate = businessStatus === 'LOST' ? input.lostDate ?? null : null;
  if (businessStatus === 'SIGNED' && (!signedDate || signedDate >= today)) throw new ApiException('BAD_REQUEST', 400, '已签约商机必须填写早于今天的签约日期');
  if (businessStatus === 'LOST' && (!lostDate || lostDate > today)) throw new ApiException('BAD_REQUEST', 400, '已丢单商机必须填写不晚于今天的丢单日期');
  if (businessStatus !== 'SIGNED' && input.expectedSignDate && input.expectedSignDate <= today) throw new ApiException('BAD_REQUEST', 400, '未签约商机的预签日期必须晚于今天');
  return { businessStatus, signedDate, lostDate };
}
