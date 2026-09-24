import { HttpStatus, Injectable } from '@nestjs/common';
import { styleSceneUpdateSchema, styleSceneWriteSchema } from '@interaction-pattern-lab/contracts';
import { z } from 'zod';
import { DatabaseService } from '../database/database.service';
import { ApiException } from '../http/api-exceptions';

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  keyword: z.string().trim().max(255).optional(),
  category: z.string().max(64).optional(),
  status: z.enum(['DONE', 'WIP', 'TODO']).optional(),
});

@Injectable()
export class StyleSceneService {
  constructor(private readonly db: DatabaseService) {}

  async list(systemCode: string, raw: Record<string, unknown>) {
    const query = querySchema.parse(raw);
    const where = {
      systemCode,
      ...(query.keyword ? { OR: [
        { sceneName: { contains: query.keyword, mode: 'insensitive' as const } },
        { description: { contains: query.keyword, mode: 'insensitive' as const } },
      ] } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const [items, total] = await Promise.all([
      this.db.styleScene.findMany({ where, orderBy: [{ sortNo: 'asc' }, { createdAt: 'asc' }], skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
      this.db.styleScene.count({ where }),
    ]);
    return { items: items.map((row) => this.serialize(row)), pagination: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) } };
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
}
