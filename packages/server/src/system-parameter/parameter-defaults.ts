import type { Prisma } from '../generated/prisma/client';

export const parameterDefaults = [
  { parameterCode: 'DEFAULT_LEGAL_ENTITY', parameterName: '默认法人记录', usageNote: '手工填写默认法人编码；保存时不校验，调用时找不到可用法人则无默认值。', sortNo: 10 },
  { parameterCode: 'DEFAULT_WAREHOUSE', parameterName: '默认仓库', usageNote: '手工填写默认仓库编码；保存时不校验，调用时按默认法人查找可用仓库，找不到则无默认值。', sortNo: 20 },
  { parameterCode: 'OPPORTUNITY_STAGE_TEMPLATE', parameterName: '本系统使用的商机阶段模板', usageNote: '填写商机阶段模板编码；新增商机和商机分析调用时解析可用模板，找不到则无默认值。当前 public 对应“公共”。', sortNo: 30 },
] as const;

export async function initializeParameters(tx: Prisma.TransactionClient, systemCodes: string[]) {
  const apps = await tx.sysApplication.findMany({ where: { applicationCode: { in: systemCodes }, status: 'ACTIVE' } });
  for (const app of apps) for (const definition of parameterDefaults) {
    await tx.sysParameter.upsert({
      where: { tenantId_applicationId_parameterCode: { tenantId: app.tenantId, applicationId: app.id, parameterCode: definition.parameterCode } },
      create: { ...definition, tenantId: app.tenantId, applicationId: app.id, value: definition.parameterCode === 'OPPORTUNITY_STAGE_TEMPLATE' && app.applicationCode === 'demo-portal' ? 'public' : null, createdBy: 'system-initializer', updatedBy: 'system-initializer' }, update: {},
    });
  }
  return { applications: apps.length, parameters: apps.length * parameterDefaults.length };
}
