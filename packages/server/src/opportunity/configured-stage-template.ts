import type { Prisma } from '../generated/prisma/client';

type Scope = { id: string; tenantId: string };
type Reader = Pick<Prisma.TransactionClient, 'sysParameter' | 'sdOppTemplate'>;

/** Parameter values remain raw text; only the opportunity domain resolves a usable template. */
export async function configuredStageTemplate(db: Reader, scope: Scope) {
  const parameter = await db.sysParameter.findFirst({
    where: { applicationId: scope.id, tenantId: scope.tenantId, parameterCode: 'OPPORTUNITY_STAGE_TEMPLATE', status: 'ACTIVE' },
    select: { value: true },
  });
  const code = parameter?.value?.trim();
  if (!code) return null;
  return db.sdOppTemplate.findFirst({ where: { applicationId: scope.id, tenantId: scope.tenantId, templateCode: code, status: 'ACTIVE' } });
}
