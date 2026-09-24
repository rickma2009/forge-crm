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
