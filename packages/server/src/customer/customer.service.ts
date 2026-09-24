import { HttpStatus, Injectable } from '@nestjs/common';
import { customerContactUpdateSchema, customerContactWriteSchema, customerUpdateSchema, customerAddressUpdateSchema, customerAddressWriteSchema, customerWriteSchema } from '@forge-crm/contracts';
import { z } from 'zod';
import { DatabaseService } from '../database/database.service';
import { DictionaryService } from '../dictionary/dictionary.service';
import { ApiException } from '../http/api-exceptions';
import type { Prisma } from '../generated/prisma/client';
import type { RolePolicyService } from '../role-management/role-policy.service';
import { matchesPolicyWhere, redactFields } from '../role-management/data-policy';
import { CUSTOMER_POLICY_FIELDS } from '../role-management/customer-policy-catalog';

export type CustomerPolicyScope = Awaited<ReturnType<RolePolicyService['customerScope']>>;

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

  async list(systemCode: string, raw: Record<string, unknown>, scope?: CustomerPolicyScope) {
    const query = querySchema.parse(raw);
    const queryable = (field: string) => !scope?.fields.some((rule) => rule.field === field && (!rule.visible || rule.mask !== 'NONE'));
    for (const key of ['categoryValue', 'statusValue', 'industryValue', 'levelValue', 'salesOwnerKey'] as const) {
      if (query[key] && !queryable(key)) throw new ApiException('FORBIDDEN', 403, '不可使用隐藏或脱敏字段筛选数据');
    }
    if (raw.orderBy && !queryable(query.orderBy)) throw new ApiException('FORBIDDEN', 403, '不可使用隐藏或脱敏字段排序');
    const searchFields = ['customerCode', 'customerName', 'shortName'].filter(queryable);
    if (query.keyword && !searchFields.length) throw new ApiException('FORBIDDEN', 403, '当前没有可供搜索的明文字段');
    const where: Prisma.CrmCustomerWhereInput = {
      systemCode,
      ...(scope ? { AND: [scope.where as Prisma.CrmCustomerWhereInput] } : {}),
      ...(query.keyword ? { OR: searchFields.map((field) => ({ [field]: { contains: query.keyword, mode: 'insensitive' as const } })) } : {}),
      ...(query.categoryValue ? { categoryValue: query.categoryValue } : {}),
      ...(query.statusValue ? { statusValue: query.statusValue } : {}),
      ...(query.industryValue ? { industryValue: query.industryValue } : {}),
      ...(query.levelValue ? { levelValue: query.levelValue } : {}),
      ...(query.salesOwnerKey ? { salesOwnerKey: query.salesOwnerKey } : {}),
    };
    const [items, total] = await Promise.all([
      this.db.crmCustomer.findMany({ where, orderBy: { [queryable(query.orderBy) ? query.orderBy : 'id']: query.order }, skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
      this.db.crmCustomer.count({ where }),
    ]);
    return { items: items.map((row) => this.secured(row, scope)), pagination: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) } };
  }

  async detail(systemCode: string, id: string, scope?: CustomerPolicyScope) {
    const customer = await this.db.crmCustomer.findFirst({ where: { id, systemCode, ...(scope ? { AND: [scope.where as Prisma.CrmCustomerWhereInput] } : {}) } });
    if (!customer) throw new ApiException('NOT_FOUND', HttpStatus.NOT_FOUND, '客户不存在');
    const [contacts, addresses] = await Promise.all([
      this.db.crmCustomerContact.findMany({ where: { customerId: id, systemCode }, orderBy: [{ sortNo: 'asc' }, { createdAt: 'asc' }] }),
      this.db.crmCustomerAddress.findMany({ where: { customerId: id, systemCode }, orderBy: [{ isDefault: 'desc' }, { sortNo: 'asc' }, { createdAt: 'asc' }] }),
    ]);
    return { customer: this.secured(customer, scope), contacts: contacts.map(this.serializeContact), addresses: addresses.map(this.serializeAddress) };
  }

  async listContacts(systemCode: string, customerId: string) {
    await this.assertCustomer(systemCode, customerId);
    return this.db.crmCustomerContact.findMany({ where: { customerId, systemCode }, orderBy: [{ sortNo: 'asc' }, { createdAt: 'asc' }] }).then((rows) => rows.map(this.serializeContact));
  }
  async createContact(systemCode: string, customerId: string, actor: string, raw: unknown) {
    await this.assertCustomer(systemCode, customerId);
    const input = customerContactWriteSchema.parse(raw);
    await this.dictionaries.assertActiveValues(systemCode, { contact_project_role: input.decisionRole || undefined });
    const row = await this.db.crmCustomerContact.create({ data: { systemCode, customerId, ...this.contactData(input), createdBy: actor, updatedBy: actor } });
    return this.serializeContact(row);
  }
  async updateContact(systemCode: string, customerId: string, contactId: string, actor: string, raw: unknown) {
    await this.assertCustomer(systemCode, customerId);
    const input = customerContactUpdateSchema.parse(raw);
    const { version, ...write } = input;
    const existing = await this.db.crmCustomerContact.findFirst({ where: { id: contactId, customerId, systemCode, version } });
    if (!existing) throw new ApiException('BAD_REQUEST', HttpStatus.CONFLICT, '联系人不存在或已被修改');
    if ((write.decisionRole || null) !== (existing.decisionRole || null)) {
      await this.dictionaries.assertActiveValues(systemCode, { contact_project_role: write.decisionRole || undefined });
    }
    const result = await this.db.crmCustomerContact.updateMany({ where: { id: contactId, customerId, systemCode, version }, data: { ...this.contactData(write), updatedBy: actor, version: { increment: 1 } } });
    if (!result.count) throw new ApiException('BAD_REQUEST', HttpStatus.CONFLICT, '联系人不存在或已被修改');
    return this.db.crmCustomerContact.findFirstOrThrow({ where: { id: contactId, customerId, systemCode } }).then(this.serializeContact);
  }

  async listAddresses(systemCode: string, customerId: string) {
    await this.assertCustomer(systemCode, customerId);
    return this.db.crmCustomerAddress.findMany({ where: { customerId, systemCode }, orderBy: [{ isDefault: 'desc' }, { sortNo: 'asc' }, { createdAt: 'asc' }] }).then((rows) => rows.map(this.serializeAddress));
  }
  async createAddress(systemCode: string, customerId: string, actor: string, raw: unknown) {
    await this.assertCustomer(systemCode, customerId);
    const input = customerAddressWriteSchema.parse(raw);
    const row = await this.db.crmCustomerAddress.create({ data: { systemCode, customerId, ...this.addressData(input), createdBy: actor, updatedBy: actor } });
    return this.serializeAddress(row);
  }
  async updateAddress(systemCode: string, customerId: string, addressId: string, actor: string, raw: unknown) {
    await this.assertCustomer(systemCode, customerId);
    const input = customerAddressUpdateSchema.parse(raw);
    const { version, ...write } = input;
    const result = await this.db.crmCustomerAddress.updateMany({ where: { id: addressId, customerId, systemCode, version }, data: { ...this.addressData(write), updatedBy: actor, version: { increment: 1 } } });
    if (!result.count) throw new ApiException('BAD_REQUEST', HttpStatus.CONFLICT, '地址不存在或已被修改');
    return this.db.crmCustomerAddress.findFirstOrThrow({ where: { id: addressId, customerId, systemCode } }).then(this.serializeAddress);
  }

  private async assertCustomer(systemCode: string, customerId: string) {
    const exists = await this.db.crmCustomer.findFirst({ where: { id: customerId, systemCode } });
    if (!exists) throw new ApiException('NOT_FOUND', HttpStatus.NOT_FOUND, '客户不存在');
  }
  private contactData(input: { name: string; department?: string | null; position?: string | null; decisionRole?: string | null; mobile?: string | null; phone?: string | null; email?: string | null; status: string; remark?: string | null; sortNo: number }) {
    return { name: input.name, department: input.department || null, position: input.position || null, decisionRole: input.decisionRole || null, mobile: input.mobile || null, phone: input.phone || null, email: input.email || null, status: input.status, remark: input.remark || null, sortNo: input.sortNo };
  }
  private addressData(input: { addressType: string; recipient?: string | null; phone?: string | null; province?: string | null; city?: string | null; district?: string | null; detail: string; isDefault: boolean; status: string; remark?: string | null; sortNo: number }) {
    return { addressType: input.addressType, recipient: input.recipient || null, phone: input.phone || null, province: input.province || null, city: input.city || null, district: input.district || null, detail: input.detail, isDefault: input.isDefault, status: input.status, remark: input.remark || null, sortNo: input.sortNo };
  }
  private serializeContact(row: { id: string; customerId: string; name: string; department: string | null; position: string | null; decisionRole: string | null; mobile: string | null; phone: string | null; email: string | null; status: string; remark: string | null; sortNo: number; version: number; updatedAt: Date }) {
    return { id: row.id, customerId: row.customerId, name: row.name, department: row.department, position: row.position, decisionRole: row.decisionRole, mobile: row.mobile, phone: row.phone, email: row.email, status: row.status, remark: row.remark, sortNo: row.sortNo, version: row.version, updatedAt: row.updatedAt.toISOString() };
  }
  private serializeAddress(row: { id: string; customerId: string; addressType: string; recipient: string | null; phone: string | null; province: string | null; city: string | null; district: string | null; detail: string; isDefault: boolean; status: string; remark: string | null; sortNo: number; version: number; updatedAt: Date }) {
    return { id: row.id, customerId: row.customerId, addressType: row.addressType, recipient: row.recipient, phone: row.phone, province: row.province, city: row.city, district: row.district, detail: row.detail, isDefault: row.isDefault, status: row.status, remark: row.remark, sortNo: row.sortNo, version: row.version, updatedAt: row.updatedAt.toISOString() };
  }

  async create(systemCode: string, actor: string, raw: unknown, scope?: CustomerPolicyScope) {
    const input = customerWriteSchema.parse(raw);
    this.assertWritable(input, scope);
    await this.validateReferences(systemCode, input);
    try {
      const customer = await this.db.$transaction(async (tx) => {
        const prefix = `C${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}`;
        const last = await tx.crmCustomer.findFirst({ where: { systemCode, customerCode: { startsWith: prefix } }, orderBy: { customerCode: 'desc' }, select: { customerCode: true } });
        const sequence = last ? Number(last.customerCode.slice(prefix.length)) + 1 : 1;
        const customerCode = `${prefix}${String(sequence).padStart(4, '0')}`;
        const sales = input.salesOwnerKey ? SALES_OPTIONS.find((option) => option.key === input.salesOwnerKey) : undefined;
        const data = { systemCode, customerCode, ...this.toData(input), salesOwnerKey: sales?.key ?? null, salesOwnerName: sales?.name ?? null, createdBy: actor, updatedBy: actor };
        if (scope && !matchesPolicyWhere({ ...data, version: 1, createdAt: new Date(), updatedAt: new Date() }, scope.where)) throw new ApiException('FORBIDDEN', 403, '新客户不在可创建的数据范围内');
        return tx.crmCustomer.create({ data });
      }, { isolationLevel: 'Serializable' });
      return this.secured(customer, scope);
    } catch (error) { if (error instanceof ApiException) throw error; throw new ApiException('BAD_REQUEST', HttpStatus.CONFLICT, '客户名称或本月客户编码已存在，请刷新后重试'); }
  }

  async update(systemCode: string, id: string, actor: string, raw: unknown, scope?: CustomerPolicyScope) {
    const input = customerUpdateSchema.parse(raw);
    const existing = await this.db.crmCustomer.findFirst({ where: { id, systemCode, ...(scope ? { AND: [scope.where as Prisma.CrmCustomerWhereInput] } : {}) } });
    if (!existing) throw new ApiException('NOT_FOUND', HttpStatus.NOT_FOUND, '客户不存在');
    const { version, ...changes } = input;
    this.assertWritable(changes, scope);
    const write = customerWriteSchema.parse({ customerName: existing.customerName, shortName: existing.shortName, categoryValue: existing.categoryValue, statusValue: existing.statusValue, address: existing.address ?? '', industryValue: existing.industryValue ?? '', levelValue: existing.levelValue ?? '', salesOwnerKey: existing.salesOwnerKey ?? '', remark: existing.remark ?? '', ...changes });
    await this.validateReferences(systemCode, write);
    const sales = write.salesOwnerKey ? SALES_OPTIONS.find((option) => option.key === write.salesOwnerKey) : undefined;
    if (scope && !matchesPolicyWhere({ ...existing, ...this.toData(write), salesOwnerKey: sales?.key ?? null, salesOwnerName: sales?.name ?? null }, scope.where)) throw new ApiException('FORBIDDEN', 403, '修改后客户超出当前数据范围');
    try {
      const result = await this.db.crmCustomer.updateMany({ where: { id, systemCode, version, ...(scope ? { AND: [scope.where as Prisma.CrmCustomerWhereInput] } : {}) }, data: { ...this.toData(write), salesOwnerKey: sales?.key ?? null, salesOwnerName: sales?.name ?? null, updatedBy: actor, version: { increment: 1 } } });
      if (!result.count) throw new ApiException('BAD_REQUEST', HttpStatus.CONFLICT, '客户不存在或已被其他用户修改');
      return this.detail(systemCode, id, scope);
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

  private secured(customer: Parameters<CustomerService['serialize']>[0], scope?: CustomerPolicyScope) {
    const base = this.serialize(customer);
    if (!scope) return base;
    const redacted = redactFields(base, scope.fields, false);
    // Preserve the response contract with empty/null values, never the hidden original.
    const hidden = Object.fromEntries(Object.keys(base).filter((key) => !(key in redacted)).map((key) => [key, ['address', 'industryValue', 'levelValue', 'salesOwnerKey', 'salesOwnerName', 'remark'].includes(key) ? null : '']));
    const fieldAccess = Object.fromEntries(CUSTOMER_POLICY_FIELDS.map((field) => {
      const restrictions = scope.fields.filter((r) => r.field === field.code);
      return [field.code, { visible: restrictions.every((r) => r.visible), writable: field.writable && restrictions.every((r) => r.writable && r.visible && r.mask === 'NONE') }];
    }));
    return { ...base, ...redacted, ...hidden, fieldAccess };
  }

  private assertWritable(input: Record<string, unknown>, scope?: CustomerPolicyScope) {
    if (scope?.fields.some((f) => Object.hasOwn(input, f.field) && (!f.writable || !f.visible || f.mask !== 'NONE'))) throw new ApiException('FORBIDDEN', 403, '请求包含不可编辑、隐藏或脱敏字段');
  }

  async assertScopedCustomer(systemCode: string, id: string, scope?: CustomerPolicyScope) {
    const found = await this.db.crmCustomer.findFirst({ where: { id, systemCode, ...(scope ? { AND: [scope.where as Prisma.CrmCustomerWhereInput] } : {}) }, select: { id: true } });
    if (!found) throw new ApiException('NOT_FOUND', 404, '客户不存在');
  }
}
