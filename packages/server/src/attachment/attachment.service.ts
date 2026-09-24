import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { attachmentOwnerTypeSchema, attachmentUpdateSchema } from '@forge-crm/contracts';
import { DatabaseService } from '../database/database.service';
import { ApiException } from '../http/api-exceptions';
import { RUNTIME_CONFIG, type RuntimeConfig } from '../config/runtime-config';
import { FileStorage, storageKey } from './file-storage';
import type { SysAttachment } from '../generated/prisma/client';

type Upload = { originalname: string; mimetype: string; size: number; buffer: Buffer };

@Injectable()
export class AttachmentService {
  constructor(
    private readonly db: DatabaseService,
    private readonly files: FileStorage,
    @Inject(RUNTIME_CONFIG) private readonly config: RuntimeConfig,
  ) {}

  private async scope(code: string) {
    const app = await this.db.sysApplication.findFirst({ where: { applicationCode: code, status: 'ACTIVE' } });
    if (!app) throw new ApiException('NOT_FOUND', 404, '系统不存在');
    return app;
  }

  private async owner(app: { tenantId: string }, type: string, id: string) {
    attachmentOwnerTypeSchema.parse(type);
    if (!await this.db.mdItem.findFirst({ where: { id, tenantId: app.tenantId, itemType: 'PRODUCT' } })) {
      throw new ApiException('NOT_FOUND', 404, '附件归属对象不存在');
    }
  }

  private dto(row: SysAttachment) {
    return {
      id: row.id, ownerType: row.ownerType, ownerId: row.ownerId, originalName: row.originalName,
      attachmentType: row.attachmentType, mimeType: row.mimeType, fileSize: Number(row.fileSize),
      description: row.description, fileVersion: row.fileVersion, status: row.status, version: row.version,
      createdBy: row.createdBy, updatedBy: row.updatedBy,
      createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
    };
  }

  async list(code: string, type: string, ownerId: string) {
    const app = await this.scope(code);
    await this.owner(app, type, ownerId);
    return (await this.db.sysAttachment.findMany({ where: { applicationId: app.id, ownerType: type, ownerId }, orderBy: { createdAt: 'desc' } })).map((row) => this.dto(row));
  }

  async upload(code: string, actor: string, type: string, ownerId: string, file?: Upload, description?: string, fileVersion?: string) {
    const app = await this.scope(code);
    await this.owner(app, type, ownerId);
    if (!file?.size) throw new ApiException('BAD_REQUEST', 400, '请选择非空文件');
    if (file.size > this.config.attachmentMaxBytes) throw new ApiException('BAD_REQUEST', 400, '附件超过大小限制');
    const id = randomUUID();
    const key = storageKey(type, ownerId, id, file.originalname);
    await this.files.put(key, file.buffer);
    try {
      const row = await this.db.$transaction(async (tx) => {
        const created = await tx.sysAttachment.create({ data: {
          id, tenantId: app.tenantId, applicationId: app.id, ownerType: type, ownerId,
          originalName: file.originalname.slice(0, 255), attachmentType: this.type(file.mimetype, file.originalname),
          mimeType: file.mimetype.slice(0, 128), fileSize: file.size, storageKey: key,
          description: description?.trim().slice(0, 1000) || null,
          fileVersion: fileVersion?.trim().slice(0, 64) || null, createdBy: actor, updatedBy: actor,
        } });
        await tx.sysAuditLog.create({ data: {
          requestId: randomUUID(), tenantId: app.tenantId, applicationId: app.id, actorUserId: actor,
          actionCode: 'attachment.upload', resourceType: 'attachment', resourceId: id,
          afterSnapshot: { ownerType: type, ownerId, originalName: created.originalName, fileSize: file.size },
        } });
        return created;
      });
      return this.dto(row);
    } catch (error) {
      await this.files.remove(key).catch(() => undefined);
      throw error;
    }
  }

  async update(code: string, actor: string, id: string, raw: unknown) {
    const app = await this.scope(code);
    const input = attachmentUpdateSchema.parse(raw);
    return this.db.$transaction(async (tx) => {
      const changed = await tx.sysAttachment.updateMany({
        where: { id, applicationId: app.id, version: input.version, status: 'ACTIVE' },
        data: { description: input.description, fileVersion: input.fileVersion, updatedBy: actor, version: { increment: 1 } },
      });
      if (!changed.count) throw new ApiException('BAD_REQUEST', 409, '附件不存在或已被修改');
      const row = await tx.sysAttachment.findUniqueOrThrow({ where: { id } });
      await tx.sysAuditLog.create({ data: {
        requestId: randomUUID(), tenantId: app.tenantId, applicationId: app.id, actorUserId: actor,
        actionCode: 'attachment.update', resourceType: 'attachment', resourceId: id,
        afterSnapshot: { description: row.description, fileVersion: row.fileVersion, version: row.version },
      } });
      return this.dto(row);
    });
  }

  async download(code: string, id: string) {
    const app = await this.scope(code);
    const row = await this.db.sysAttachment.findFirst({ where: { id, applicationId: app.id, status: 'ACTIVE' } });
    if (!row) throw new ApiException('NOT_FOUND', 404, '附件不存在');
    await this.owner(app, row.ownerType, row.ownerId);
    return { row, path: this.files.path(row.storageKey) };
  }

  async remove(code: string, actor: string, id: string, version: number) {
    const app = await this.scope(code);
    const row = await this.db.sysAttachment.findFirst({ where: { id, applicationId: app.id } });
    if (!row || (row.version !== version && row.status !== 'DELETE_FAILED')) throw new ApiException('BAD_REQUEST', 409, '附件不存在或已被修改');
    await this.owner(app, row.ownerType, row.ownerId);
    if (row.status !== 'DELETE_PENDING') {
      await this.db.sysAttachment.update({ where: { id }, data: { status: 'DELETE_PENDING', updatedBy: actor, version: { increment: 1 } } });
    }
    try {
      await this.files.remove(row.storageKey);
      await this.db.$transaction(async (tx) => {
        await tx.sysAttachment.delete({ where: { id } });
        await tx.sysAuditLog.create({ data: {
          requestId: randomUUID(), tenantId: app.tenantId, applicationId: app.id, actorUserId: actor,
          actionCode: 'attachment.delete', resourceType: 'attachment', resourceId: id,
          afterSnapshot: { ownerType: row.ownerType, ownerId: row.ownerId, originalName: row.originalName },
        } });
      });
      return { deleted: true };
    } catch {
      await this.db.sysAttachment.updateMany({ where: { id }, data: { status: 'DELETE_FAILED', updatedBy: actor } });
      throw new ApiException('SERVICE_UNAVAILABLE', 503, '附件删除失败，可稍后重试');
    }
  }

  private type(mime: string, name: string) {
    const normalized = name.toLowerCase();
    if (mime === 'application/pdf' && normalized.endsWith('.pdf')) return 'PDF';
    if (['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'].includes(mime) && /\.xlsx?$/.test(normalized)) return 'EXCEL';
    if (mime.startsWith('image/') && /\.(png|jpe?g|gif|webp)$/.test(normalized)) return 'IMAGE';
    return 'OTHER';
  }
}
