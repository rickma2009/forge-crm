import { Injectable, Inject } from '@nestjs/common';
import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, resolve, sep } from 'node:path';
import { RUNTIME_CONFIG, type RuntimeConfig } from '../config/runtime-config';
export function safeFileName(input: string): string { return [...basename(input).normalize('NFKC')].filter((character) => character.charCodeAt(0) >= 32).join('').replace(/[\\/:*?"<>|\s]+/g, '_').replace(/^\.+/, '').slice(0, 180) || 'file'; }
export function storageKey(ownerType: string, ownerId: string, id: string, name: string, now = new Date()): string { return `${ownerType.toLowerCase()}/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${ownerId}/${id}/${safeFileName(name)}`; }
@Injectable() export class FileStorage {
  constructor(@Inject(RUNTIME_CONFIG) private readonly config: RuntimeConfig) {}
  path(key: string) { const root = resolve(this.config.attachmentStorageRoot), target = resolve(root, key); if (!target.startsWith(root + sep)) throw new Error('ATTACHMENT_PATH_ESCAPE'); return target; }
  async put(key: string, buffer: Buffer) { const target = this.path(key), temp = this.path(`.tmp/${crypto.randomUUID()}`); await mkdir(dirname(temp), { recursive: true }); await mkdir(dirname(target), { recursive: true }); await writeFile(temp, buffer, { flag: 'wx' }); await rename(temp, target); }
  async remove(key: string) { await rm(this.path(key), { force: true }); }
}
