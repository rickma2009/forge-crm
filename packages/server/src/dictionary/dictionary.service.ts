import { HttpStatus, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { dictionaryImportRequestSchema, dictionaryValueUpdateSchema, dictionaryValueWriteSchema } from '@forge-crm/contracts';
import { z } from 'zod';
import { DatabaseService } from '../database/database.service';
import { ApiException } from '../http/api-exceptions';

const dictionaryInput = z.strictObject({
  dictCode: z.string().regex(/^[a-z][a-z0-9_]*$/).max(64),
  dictName: z.string().trim().min(1).max(128),
  groupCode: z.string().trim().max(64).optional(),
  parentId: z.string().uuid().optional(),
  description: z.string().trim().max(512).optional(),
  sortNo: z.number().int().min(0).max(9999).default(0),
  status: z.enum(['ACTIVE', 'DISABLED']).default('ACTIVE'),
  itemsEditable: z.boolean().default(true),
});
const dictionaryUpdate = dictionaryInput.omit({ dictCode: true }).partial().extend({ version: z.number().int().positive() });
const itemInput = dictionaryValueWriteSchema.extend({
  dictionaryId: z.string().uuid(),
});

const itemCodeFor = (dictCode: string, value: string): string => {
  const digest = createHash('sha256').update(`${dictCode}:${value}`).digest('hex').slice(0, 20);
  return `v_${digest}`;
};

@Injectable()
export class DictionaryService {
  constructor(private readonly db: DatabaseService) {}

  async list(systemCode: string, includeDisabled = false) {
    const dictionaries = await this.db.sysDictionary.findMany({
      where: { systemCode, ...(includeDisabled ? {} : { status: 'ACTIVE' }) },
      include: { items: { where: includeDisabled ? {} : { status: 'ACTIVE' }, orderBy: [{ sortNo: 'asc' }, { itemCode: 'asc' }] } },
      orderBy: [{ sortNo: 'asc' }, { dictCode: 'asc' }],
    });
    return dictionaries.map((dictionary) => ({
      id: dictionary.id, dictCode: dictionary.dictCode, dictName: dictionary.dictName,
      groupCode: dictionary.groupCode, parentId: dictionary.parentId, description: dictionary.description, sortNo: dictionary.sortNo,
      status: dictionary.status, itemsEditable: dictionary.itemsEditable, version: dictionary.version,
      items: dictionary.items.map((item) => ({ id: item.id, parentItemId: item.parentItemId, itemCode: item.itemCode, itemValue: item.itemValue, itemName: item.itemName, colorKey: item.colorKey, description: item.description, sortNo: item.sortNo, status: item.status, version: item.version })),
    }));
  }

  async createDictionary(systemCode: string, actor: string, raw: unknown) {
    const input = dictionaryInput.parse(raw);
    try {
      return await this.db.sysDictionary.create({ data: { systemCode, ...input, groupCode: input.groupCode || null, parentId: input.parentId || null, description: input.description || null, createdBy: actor, updatedBy: actor } });
    } catch { throw new ApiException('BAD_REQUEST', HttpStatus.CONFLICT, '字典编码已存在'); }
  }

  async updateDictionary(systemCode: string, id: string, actor: string, raw: unknown) {
    const input = dictionaryUpdate.parse(raw);
    const { version, ...data } = input;
    const result = await this.db.sysDictionary.updateMany({ where: { id, systemCode, version }, data: { ...data, updatedBy: actor, version: { increment: 1 } } });
    if (!result.count) throw new ApiException('BAD_REQUEST', HttpStatus.CONFLICT, '字典不存在或已被其他用户修改');
    return this.db.sysDictionary.findUniqueOrThrow({ where: { id } });
  }

  async createItem(systemCode: string, actor: string, raw: unknown) {
    const input = itemInput.parse(raw);
    const dictionary = await this.db.sysDictionary.findFirst({ where: { id: input.dictionaryId, systemCode } });
    if (!dictionary) throw new ApiException('NOT_FOUND', HttpStatus.NOT_FOUND, '字典不存在');
    if (dictionary.status !== 'ACTIVE') throw new ApiException('BAD_REQUEST', HttpStatus.CONFLICT, '停用字典不能新增字典值');
    if (!dictionary.itemsEditable) throw new ApiException('FORBIDDEN', HttpStatus.FORBIDDEN, '该字典为初始化固定值，不允许维护');
    try {
      return await this.db.sysDictionaryItem.create({ data: { ...input, itemCode: itemCodeFor(dictionary.dictCode, input.itemValue), colorKey: input.colorKey || null, description: input.description || null, createdBy: actor, updatedBy: actor } });
    } catch { throw new ApiException('BAD_REQUEST', HttpStatus.CONFLICT, '数据字典值已存在'); }
  }

  async updateItem(systemCode: string, id: string, actor: string, raw: unknown) {
    const input = dictionaryValueUpdateSchema.parse(raw);
    const existing = await this.db.sysDictionaryItem.findFirst({ where: { id, dictionary: { systemCode } }, include: { dictionary: true } });
    if (!existing) throw new ApiException('NOT_FOUND', HttpStatus.NOT_FOUND, '字典项不存在');
    if (existing.dictionary.status !== 'ACTIVE') throw new ApiException('BAD_REQUEST', HttpStatus.CONFLICT, '停用字典不能修改字典值');
    if (!existing.dictionary.itemsEditable) throw new ApiException('FORBIDDEN', HttpStatus.FORBIDDEN, '该字典为初始化固定值，不允许维护');
    if (['employee_post', 'employee_job_title'].includes(existing.dictionary.dictCode) && input.itemValue && input.itemValue !== existing.itemValue) throw new ApiException('BAD_REQUEST', HttpStatus.CONFLICT, '岗位和职位编码已用于员工资料，不能修改；可调整名称或状态');
    const { version, ...data } = input;
    const result = await this.db.sysDictionaryItem.updateMany({ where: { id, version }, data: { ...data, ...(data.itemValue ? { itemCode: itemCodeFor(existing.dictionary.dictCode, data.itemValue) } : {}), updatedBy: actor, version: { increment: 1 } } });
    if (!result.count) throw new ApiException('BAD_REQUEST', HttpStatus.CONFLICT, '字典项已被其他用户修改');
    return this.db.sysDictionaryItem.findUniqueOrThrow({ where: { id } });
  }

  async importItems(systemCode: string, dictionaryId: string, actor: string, raw: unknown) {
    const parsed = dictionaryImportRequestSchema.safeParse(raw);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const index = typeof issue?.path[1] === 'number' ? issue.path[1] : null;
      const rowNumber = index === null ? null : (raw as { rows?: Array<{ rowNumber?: number }> })?.rows?.[index]?.rowNumber;
      throw new ApiException('BAD_REQUEST', HttpStatus.BAD_REQUEST, `${rowNumber ? `第 ${rowNumber} 行` : '导入数据'}：${issue?.message ?? '格式错误'}`);
    }
    const dictionary = await this.db.sysDictionary.findFirst({ where: { id: dictionaryId, systemCode } });
    if (!dictionary) throw new ApiException('NOT_FOUND', HttpStatus.NOT_FOUND, '字典不存在');
    if (dictionary.status !== 'ACTIVE') throw new ApiException('BAD_REQUEST', HttpStatus.CONFLICT, '停用字典不能导入字典值');
    if (!dictionary.itemsEditable) throw new ApiException('FORBIDDEN', HttpStatus.FORBIDDEN, '该字典为初始化固定值，不允许维护');

    const firstRowByValue = new Map<string, number>();
    for (const row of parsed.data.rows) {
      const prior = firstRowByValue.get(row.itemValue);
      if (prior) throw new ApiException('BAD_REQUEST', HttpStatus.CONFLICT, `第 ${row.rowNumber} 行：数据字典值与第 ${prior} 行重复`);
      firstRowByValue.set(row.itemValue, row.rowNumber);
    }
    const duplicate = await this.db.sysDictionaryItem.findFirst({ where: { dictionaryId, itemValue: { in: [...firstRowByValue.keys()] } }, select: { itemValue: true } });
    if (duplicate) {
      const rowNumber = firstRowByValue.get(duplicate.itemValue);
      throw new ApiException('BAD_REQUEST', HttpStatus.CONFLICT, `第 ${rowNumber} 行：数据字典值已存在`);
    }

    await this.db.$transaction(async (transaction) => {
      await transaction.sysDictionaryItem.createMany({
        data: parsed.data.rows.map((row) => ({
          dictionaryId,
          itemValue: row.itemValue,
          itemName: row.itemName,
          sortNo: row.sortNo,
          status: row.status,
          itemCode: itemCodeFor(dictionary.dictCode, row.itemValue),
          colorKey: row.colorKey || null,
          description: row.description || null,
          createdBy: actor,
          updatedBy: actor,
        })),
      });
    });
    return { imported: parsed.data.rows.length };
  }

  async assertActiveValues(systemCode: string, values: Record<string, string | undefined>) {
    for (const [dictCode, value] of Object.entries(values)) {
      if (!value) continue;
      const item = await this.db.sysDictionaryItem.findFirst({ where: { itemValue: value, status: 'ACTIVE', dictionary: { systemCode, dictCode, status: 'ACTIVE' } }, select: { id: true } });
      if (!item) throw new ApiException('BAD_REQUEST', HttpStatus.BAD_REQUEST, `${dictCode} 的取值无效或已停用`);
    }
  }
}
