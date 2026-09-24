import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { SystemParameterService } from '../system-parameter/system-parameter.service';

/** Opt-in business adapter: configuration stores text; this consumer resolves codes. */
@Injectable()
export class InventoryDefaultsService {
  constructor(private readonly db: DatabaseService, private readonly parameters: SystemParameterService) {}

  async getDefaults(systemCode: string): Promise<{ legalEntityId: string | null; warehouseId: string | null }> {
    const { tenantId, values } = await this.parameters.getValues(systemCode);
    const legalCode = values.DEFAULT_LEGAL_ENTITY, warehouseCode = values.DEFAULT_WAREHOUSE;
    if (!legalCode) return { legalEntityId: null, warehouseId: null };
    return this.db.$transaction(async (tx) => {
      const entity = await tx.orgLegalEntity.findFirst({ where: { tenantId, entityCode: legalCode, status: 'ACTIVE' } });
      if (!entity) return { legalEntityId: null, warehouseId: null };
      const warehouse = warehouseCode ? await tx.scmWarehouse.findFirst({ where: { tenantId, legalEntityId: entity.id, warehouseCode, status: 'ACTIVE' } }) : null;
      return { legalEntityId: entity.id, warehouseId: warehouse?.id ?? null };
    }, { isolationLevel: 'RepeatableRead' });
  }
}
