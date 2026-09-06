import { HttpStatus, Injectable } from '@nestjs/common';
import { customerUpdateSchema, customerWriteSchema } from '@interaction-pattern-lab/contracts';
import { z } from 'zod';
import { DatabaseService } from '../database/database.service';
import { DictionaryService } from '../dictionary/dictionary.service';
import { ApiException } from '../http/api-exceptions';

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  keyword: z.string().trim().max(255).optional(),
  categoryValue: z.string().max(128).optional(),
  statusValue: z.string().max(128).optional(),
  industryValue: z.string().max(128).optional(),
  levelValue: z.string().max(128).optional(),
  salesOwnerKey: z.string().max(128).optional(),
  orderBy: z.enum(['customerCode', 'customerName', 'shortName', 'updatedAt']).default('updatedAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

const SALES_OPTIONS = [
  { key: 'sales-lin', name: '林晓' },
  { key: 'sales-zhou', name: '周然' },
  { key: 'sales-chen', name: '陈沐' },
  { key: 'sales-wang', name: '王屿' },
  { key: 'sales-li', name: '李澄' },
];

@Injectable()
export class CustomerService {
  constructor(private readonly db: DatabaseService, private readonly dictionaries: DictionaryService) {}

  async list(systemCode: string, raw: Record<string, unknown>) {
    const query = querySchema.parse(raw);
    const where = {
      systemCode,
      ...(query.keyword ? { OR: [
        { customerCode: { contains: query.keyword, mode: 'insensitive' as const } },
        { customerName: { contains: query.keyword, mode: 'insensitive' as const } },
        { shortName: { contains: query.keyword, mode: 'insensitive' as const } },
      ] } : {}),
      ...(query.categoryValue ? { categoryValue: query.categoryValue } : {}),
      ...(query.statusValue ? { statusValue: query.statusValue } : {}),
      ...(query.industryValue ? { industryValue: query.industryValue } : {}),
      ...(query.levelValue ? { levelValue: query.levelValue } : {}),
      ...(query.salesOwnerKey ? { salesOwnerKey: query.salesOwnerKey } : {}),
    };
    const [items, total] = await Promise.all([
      this.db.crmCustomer.findMany({ where, orderBy: { [query.orderBy]: query.order }, skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
      this.db.crmCustomer.count({ where }),
    ]);
    return { items: items.map(this.serialize), pagination: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) } };
  }

  async detail(systemCode: string, id: string) {
    const customer = await this.db.crmCustomer.findFirst({ where: { id, systemCode } });
    if (!customer) throw new ApiException('NOT_FOUND', HttpStatus.NOT_FOUND, '客户不存在');
    return this.serialize(customer);
  }

  async create(systemCode: string, actor: string, raw: unknown) {
    const input = customerWriteSchema.parse(raw);
    await this.validateReferences(systemCode, input);
    try {
      const customer = await this.db.$transaction(async (tx) => {
        const prefix = `C${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}`;
        const last = await tx.crmCustomer.findFirst({ where: { systemCode, customerCode: { startsWith: prefix } }, orderBy: { customerCode: 'desc' }, select: { customerCode: true } });
        const sequence = last ? Number(last.customerCode.slice(prefix.length)) + 1 : 1;
        const customerCode = `${prefix}${String(sequence).padStart(4, '0')}`;
        const sales = input.salesOwnerKey ? SALES_OPTIONS.find((option) => option.key === input.salesOwnerKey) : undefined;
        return tx.crmCustomer.create({ data: { systemCode, customerCode, ...this.toData(input), salesOwnerKey: sales?.key ?? null, salesOwnerName: sales?.name ?? null, createdBy: actor, updatedBy: actor } });
      }, { isolationLevel: 'Serializable' });
      return this.serialize(customer);
    } catch { throw new ApiException('BAD_REQUEST', HttpStatus.CONFLICT, '客户名称或本月客户编码已存在，请刷新后重试'); }
  }

  async update(systemCode: string, id: string, actor: string, raw: unknown) {
    const input = customerUpdateSchema.parse(raw);
    await this.validateReferences(systemCode, input);
    const { version, ...write } = input;
    const sales = write.salesOwnerKey ? SALES_OPTIONS.find((option) => option.key === write.salesOwnerKey) : undefined;
    try {
      const result = await this.db.crmCustomer.updateMany({ where: { id, systemCode, version }, data: { ...this.toData(write), salesOwnerKey: sales?.key ?? null, salesOwnerName: sales?.name ?? null, updatedBy: actor, version: { increment: 1 } } });
      if (!result.count) throw new ApiException('BAD_REQUEST', HttpStatus.CONFLICT, '客户不存在或已被其他用户修改');
      return this.detail(systemCode, id);
    } catch (error) {
      if (error instanceof ApiException) throw error;
      throw new ApiException('BAD_REQUEST', HttpStatus.CONFLICT, '客户名称已存在');
    }
  }

  sales(query = '') {
    const normalized = query.trim().toLocaleLowerCase('zh-CN');
    return SALES_OPTIONS.filter((option) => !normalized || `${option.key}${option.name}`.toLocaleLowerCase('zh-CN').includes(normalized)).slice(0, 20);
  }

  private async validateReferences(systemCode: string, input: { categoryValue: string; statusValue: string; industryValue?: string; levelValue?: string; salesOwnerKey?: string }) {
    await this.dictionaries.assertActiveValues(systemCode, { customer_category: input.categoryValue, customer_status: input.statusValue, customer_industry: input.industryValue, customer_level: input.levelValue });
    if (input.salesOwnerKey && !SALES_OPTIONS.some((option) => option.key === input.salesOwnerKey)) throw new ApiException('BAD_REQUEST', HttpStatus.BAD_REQUEST, '负责销售选项无效');
  }

  private toData(input: { customerName: string; shortName: string; categoryValue: string; address?: string; statusValue: string; industryValue?: string; levelValue?: string; remark?: string }) {
    return { customerName: input.customerName, shortName: input.shortName, categoryValue: input.categoryValue, address: input.address || null, statusValue: input.statusValue, industryValue: input.industryValue || null, levelValue: input.levelValue || null, remark: input.remark || null };
  }

  private serialize(customer: { id: string; customerCode: string; customerName: string; shortName: string; categoryValue: string; address: string | null; statusValue: string; industryValue: string | null; levelValue: string | null; salesOwnerKey: string | null; salesOwnerName: string | null; remark: string | null; version: number; createdAt: Date; updatedAt: Date }) {
    return { id: customer.id, customerCode: customer.customerCode, customerName: customer.customerName, shortName: customer.shortName, categoryValue: customer.categoryValue, address: customer.address, statusValue: customer.statusValue, industryValue: customer.industryValue, levelValue: customer.levelValue, salesOwnerKey: customer.salesOwnerKey, salesOwnerName: customer.salesOwnerName, remark: customer.remark, version: customer.version, createdAt: customer.createdAt.toISOString(), updatedAt: customer.updatedAt.toISOString() };
  }
}
