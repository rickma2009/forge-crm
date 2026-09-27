import { HttpStatus, Injectable } from '@nestjs/common';
import { interactionMaturitySchema, styleSceneDetailSchema, styleSceneSummarySchema, styleSceneUpdateSchema, styleSceneWriteSchema } from '@forge-crm/contracts';
import { z } from 'zod';
import { DatabaseService } from '../database/database.service';
import { ApiException } from '../http/api-exceptions';

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  keyword: z.string().trim().max(255).optional(),
  category: z.string().max(64).optional(),
  subCategory: z.string().max(64).optional(),
  maturity: interactionMaturitySchema.optional(),
  status: z.enum(['DONE', 'WIP', 'TODO']).optional(),
});

const summarySelect = {
  id: true, assetCode: true, category: true, subCategory: true, sceneName: true, description: true, maturity: true,
  status: true, pagePath: true, note: true, doneAt: true, sortNo: true, version: true, createdAt: true,
} as const;

@Injectable()
export class StyleSceneService {
  constructor(private readonly db: DatabaseService) {}

  async list(systemCode: string, raw: Record<string, unknown>) {
    const query = querySchema.parse(raw);
    const where = {
      systemCode,
      ...(query.keyword ? { OR: [
        { assetCode: { contains: query.keyword, mode: 'insensitive' as const } },
        { sceneName: { contains: query.keyword, mode: 'insensitive' as const } },
        { description: { contains: query.keyword, mode: 'insensitive' as const } },
      ] } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.subCategory ? { subCategory: query.subCategory } : {}),
      ...(query.maturity ? { maturity: query.maturity } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const [items, total] = await Promise.all([
      this.db.styleScene.findMany({ where, select: summarySelect, orderBy: [{ sortNo: 'asc' }, { assetCode: 'asc' }, { createdAt: 'asc' }], skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
      this.db.styleScene.count({ where }),
    ]);
    return { items: items.map((row) => this.serializeSummary(row)), pagination: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) } };
  }

  async taxonomy(systemCode: string) {
    const rows = await this.db.styleScene.groupBy({
      by: ['category', 'subCategory'], where: { systemCode }, _count: { _all: true }, _min: { sortNo: true },
    });
    const types = new Map<string, { category: string; count: number; firstSort: number; groups: Array<{ subCategory: string; count: number; firstSort: number }> }>();
    for (const row of rows) {
      const firstSort = row._min.sortNo ?? 0;
      const type = types.get(row.category) ?? { category: row.category, count: 0, firstSort, groups: [] };
      type.count += row._count._all;
      type.firstSort = Math.min(type.firstSort, firstSort);
      if (row.subCategory) type.groups.push({ subCategory: row.subCategory, count: row._count._all, firstSort });
      types.set(row.category, type);
    }
    return { types: [...types.values()].sort((a, b) => a.firstSort - b.firstSort || a.category.localeCompare(b.category)).map((type) => ({
      category: type.category, count: type.count,
      groups: type.groups.sort((a, b) => a.firstSort - b.firstSort || a.subCategory.localeCompare(b.subCategory)).map(({ subCategory, count }) => ({ subCategory, count })),
    })) };
  }

  async detail(systemCode: string, id: string) {
    const row = await this.db.styleScene.findFirst({ where: { id, systemCode } });
    if (!row) throw new ApiException('NOT_FOUND', HttpStatus.NOT_FOUND, '交互案例不存在');
    try {
      return styleSceneDetailSchema.parse({
        ...this.serializeSummary(row),
        definition: row.definitionJson ?? [],
        definitionRef: row.definitionRefJson ?? null,
        artifacts: row.artifactsJson ?? [],
        evidence: row.evidenceJson ?? [],
        evidenceCards: row.evidenceCardsJson ?? [],
        nextEvidence: row.nextEvidence,
      });
    } catch {
      throw new ApiException('DATA_INVALID', HttpStatus.INTERNAL_SERVER_ERROR, '交互案例结构化数据无效');
    }
  }

  async create(systemCode: string, actor: string, raw: unknown) {
    const input = styleSceneWriteSchema.parse(raw);
    const scene = await this.db.styleScene.create({ data: { systemCode, category: input.category, subCategory: input.subCategory || null, sceneName: input.sceneName, description: input.description || null, status: input.status, pagePath: input.pagePath || null, note: input.note || null, sortNo: input.sortNo, doneAt: input.doneAt ? new Date(input.doneAt) : null, createdBy: actor, updatedBy: actor } });
    return this.serialize(scene);
  }

  async update(systemCode: string, id: string, actor: string, raw: unknown) {
    const input = styleSceneUpdateSchema.parse(raw);
    const { version, ...write } = input;
    const result = await this.db.styleScene.updateMany({ where: { id, systemCode, version }, data: { ...this.toData(write), doneAt: write.doneAt ? new Date(write.doneAt) : null, updatedBy: actor, version: { increment: 1 } } });
    if (!result.count) throw new ApiException('BAD_REQUEST', HttpStatus.CONFLICT, '记录不存在或已被修改');
    const scene = await this.db.styleScene.findFirst({ where: { id, systemCode } });
    return this.serialize(scene!);
  }

  private toData(input: { category?: string; subCategory?: string; sceneName?: string; description?: string; status?: 'DONE' | 'WIP' | 'TODO'; pagePath?: string; note?: string; sortNo?: number }) {
    return {
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.subCategory !== undefined ? { subCategory: input.subCategory || null } : {}),
      ...(input.sceneName !== undefined ? { sceneName: input.sceneName } : {}),
      ...(input.description !== undefined ? { description: input.description || null } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.pagePath !== undefined ? { pagePath: input.pagePath || null } : {}),
      ...(input.note !== undefined ? { note: input.note || null } : {}),
      ...(input.sortNo !== undefined ? { sortNo: input.sortNo } : {}),
    };
  }

  private serialize(row: { id: string; category: string; subCategory: string | null; sceneName: string; description: string | null; status: 'DONE' | 'WIP' | 'TODO'; pagePath: string | null; note: string | null; doneAt: Date | null; sortNo: number; version: number }) {
    return { id: row.id, category: row.category, subCategory: row.subCategory, sceneName: row.sceneName, description: row.description, status: row.status, pagePath: row.pagePath, note: row.note, doneAt: row.doneAt ? row.doneAt.toISOString() : null, sortNo: row.sortNo, version: row.version };
  }

  private serializeSummary(row: { id: string; assetCode: string | null; category: string; subCategory: string | null; sceneName: string; description: string | null; maturity: string | null; status: 'DONE' | 'WIP' | 'TODO'; pagePath: string | null; note: string | null; doneAt: Date | null; sortNo: number; version: number }) {
    return styleSceneSummarySchema.parse({ ...this.serialize(row), assetCode: row.assetCode, maturity: row.maturity });
  }
}
