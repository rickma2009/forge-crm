import { businessListObjects, businessListDefaultConfig, type BusinessListObject } from '@interaction-pattern-lab/contracts';
import type { Prisma } from '../generated/prisma/client';

/** Explicit idempotent bootstrap. Never overwrites administrator configuration. */
export async function initializeBusinessListViews(db: Pick<Prisma.TransactionClient, 'sysApplication' | 'uiSystemListView'>, systemCodes: readonly string[]) {
  const applications = await db.sysApplication.findMany({ where: { applicationCode: { in: [...systemCodes] }, status: 'ACTIVE' }, select: { id: true, applicationCode: true } });
  let checked = 0;
  for (const application of applications) {
    for (const pageCode of Object.keys(businessListObjects) as BusinessListObject[]) {
      const systemCode = application.applicationCode;
      await db.uiSystemListView.upsert({
        where: { systemCode_pageCode_actionCode_viewCode: { systemCode, pageCode, actionCode: 'view', viewCode: 'object-default' } },
        update: {},
        create: { applicationId: application.id, systemCode, pageCode, actionCode: 'view', viewCode: 'object-default', viewName: `${businessListObjects[pageCode].name}默认视图`, isDefault: true, allowPersonalOverride: true, priority: 100, status: 'ACTIVE', config: businessListDefaultConfig(pageCode), createdBy: 'system:list-view-bootstrap', updatedBy: 'system:list-view-bootstrap' },
      });
      checked++;
    }
  }
  return { applications: applications.length, views: checked };
}
