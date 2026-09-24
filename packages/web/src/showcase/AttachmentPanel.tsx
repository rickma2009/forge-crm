import { RowActionButton } from '../common/RowActionButton';
import { useEffect, useState, type FormEvent } from 'react';
import type { AttachmentMeta } from '@interaction-pattern-lab/contracts';
import type { EnterpriseGateway } from './gateway';

export function AttachmentPanel({ systemCode, ownerType, ownerId, allowedActions, gateway }: {
  systemCode: string; ownerType: 'PRODUCT'; ownerId: string; allowedActions: string[]; gateway: EnterpriseGateway;
}) {
  const [rows, setRows] = useState<AttachmentMeta[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [fileVersion, setFileVersion] = useState('');
  const load = async () => {
    try { setRows(await gateway.attachments(systemCode, ownerType, ownerId)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : '附件加载失败'); }
  };
  useEffect(() => { void load(); }, [systemCode, ownerId]);
  const perform = async (action: () => Promise<unknown>) => {
    setBusy(true); setError('');
    try { await action(); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : '附件操作失败'); }
    finally { setBusy(false); }
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (!file || busy) return;
    await perform(async () => {
      await gateway.uploadAttachment(systemCode, { ownerType, ownerId, file, description, fileVersion });
      setOpen(false); setFile(null); setDescription(''); setFileVersion('');
    });
  };
  return <section className="enterprise-card table-card">
    <div className="table-toolbar"><strong>产品附件</strong>{allowedActions.includes('attachment-upload') && <button className="is-primary" disabled={busy} onClick={() => setOpen(true)}>上传附件</button>}</div>
    {error && <p role="alert" className="enterprise-alert">{error}</p>}
    <div className="enterprise-table-wrap"><table><thead><tr><th>序号</th><th>文件名</th><th>类型</th><th>版本</th><th>说明</th><th>大小</th><th>首次上传时间</th><th>最后修改时间</th><th>状态</th><th>操作</th></tr></thead><tbody>
      {rows.map((row, index) => <tr key={row.id}><td>{index + 1}</td><td>{row.originalName}</td><td>{row.attachmentType}</td><td>{row.fileVersion || '—'}</td><td>{row.description || '—'}</td><td>{Math.ceil(row.fileSize / 1024)} KB</td><td>{new Date(row.createdAt).toLocaleString('zh-CN')}</td><td>{new Date(row.updatedAt).toLocaleString('zh-CN')}</td><td>{row.status === 'ACTIVE' ? '有效' : row.status === 'DELETE_FAILED' ? '删除失败' : '删除中'}</td><td>
        {row.status === 'ACTIVE' && allowedActions.includes('attachment-download') && <a href={`/api/systems/${encodeURIComponent(systemCode)}/attachments/${row.id}/download`}>下载</a>}
        {row.status === 'ACTIVE' && allowedActions.includes('attachment-update') && <RowActionButton disabled={busy} onClick={() => void perform(async () => { const nextDescription = window.prompt('附件说明', row.description || ''); if (nextDescription === null) return; const nextVersion = window.prompt('文件版本', row.fileVersion || ''); if (nextVersion === null) return; await gateway.updateAttachment(systemCode, row.id, { version: row.version, description: nextDescription || null, fileVersion: nextVersion || null }); })} label="编辑说明" />}
        {allowedActions.includes('attachment-delete') && <RowActionButton disabled={busy} onClick={() => { if (window.confirm(`${row.status === 'DELETE_FAILED' ? '重试删除' : '删除附件'}“${row.originalName}”？`)) void perform(() => gateway.deleteAttachment(systemCode, row.id, row.version)); }} label={row.status === 'DELETE_FAILED' ? '重试删除' : '删除'} />}
      </td></tr>)}
      {!rows.length && <tr><td className="empty-cell" colSpan={10}>暂无附件</td></tr>}
    </tbody></table></div>
    {open && <div className="enterprise-modal-backdrop"><form role="dialog" aria-modal="true" aria-label="上传附件" className="enterprise-modal" onSubmit={submit}><header><h2>上传附件</h2></header><div className="modal-body"><label>文件<input required type="file" onChange={(event) => setFile(event.target.files?.[0] || null)} /></label><label>文件版本<input value={fileVersion} onChange={(event) => setFileVersion(event.target.value)} /></label><label>附件说明<textarea value={description} onChange={(event) => setDescription(event.target.value)} /></label></div><footer><button type="button" disabled={busy} onClick={() => setOpen(false)}>取消</button><button className="is-primary" disabled={busy || !file} type="submit">{busy ? '上传中…' : '上传'}</button></footer></form></div>}
  </section>;
}
