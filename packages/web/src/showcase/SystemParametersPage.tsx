import { DeclarativeDataGrid } from '../common/data-grid/DeclarativeDataGrid';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { IconRefresh } from '@tabler/icons-react';
import type { ParameterList, SystemParameter } from '@forge-crm/contracts';
import { RecordQueryBar } from '../common/RecordQueryBar';
import { RowActionButton } from '../common/RowActionButton';
import type { EnterpriseGateway } from './gateway';
import './system-parameters.css';

type GuardRegistration = (guard: (() => boolean) | null) => void;
type Gateway = Pick<EnterpriseGateway, 'parameters' | 'updateParameter'>;
const message = (error: unknown) => error instanceof Error ? error.message : '操作失败，请稍后重试';

export function SystemParametersPage({ systemCode, allowedActions, gateway, registerGuard }: { systemCode: string; allowedActions: string[]; gateway: Gateway; registerGuard?: GuardRegistration }) {
  const [keyword, setKeyword] = useState(''), [status, setStatus] = useState('');
  const [query, setQuery] = useState({ keyword: '', status: '', page: 1 }), [reload, setReload] = useState(0);
  const [result, setResult] = useState<ParameterList | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [editing, setEditing] = useState<SystemParameter | null>(null), [notice, setNotice] = useState('');
  const canManage = allowedActions.includes('manage');
  useEffect(() => {
    let active = true; setLoading(true); setError('');
    const params = new URLSearchParams({ page: String(query.page), pageSize: '20', ...(query.keyword ? { keyword: query.keyword } : {}), ...(query.status ? { status: query.status } : {}) });
    void gateway.parameters(systemCode, params).then((data) => { if (active) setResult(data); }).catch((reason) => { if (active) { setError(message(reason)); setResult(null); } }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [gateway, systemCode, query, reload]);
  useEffect(() => { if (!canManage) setEditing(null); }, [canManage]);
  const reset = () => { setKeyword(''); setStatus(''); setQuery({ keyword: '', status: '', page: 1 }); };
  return <div className="enterprise-page system-parameters-page">
    <RecordQueryBar onQuery={() => setQuery({ keyword: keyword.trim(), status, page: 1 })} onReset={reset}>
      <label>参数搜索<input value={keyword} maxLength={128} placeholder="参数编码 / 参数名称" onChange={(event) => setKeyword(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') setQuery({ keyword: keyword.trim(), status, page: 1 }); }} /></label>
      <label>当前状态<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">全部</option><option value="ACTIVE">可用</option><option value="DISABLED">停用</option></select></label>
    </RecordQueryBar>
    {notice && <div className="enterprise-alert parameter-success" role="status">{notice}</div>}
    {error && <div className="enterprise-alert" role="alert">{error}</div>}
    <section className="enterprise-card table-card" aria-label="参数设置" aria-busy={loading}>
      <div className="table-toolbar"><strong>参数设置</strong><div className="parameter-toolbar-actions"><span>{result ? `共 ${result.pagination.total} 条` : ''}</span><button type="button" aria-label="刷新参数" title="刷新参数" disabled={loading} onClick={() => setReload((value) => value + 1)}><IconRefresh size={16} /></button></div></div>
      <div className="enterprise-table-wrap"><DeclarativeDataGrid><thead><tr>{canManage && <th>操作</th>}<th>参数编码</th><th>参数名称</th><th>参数值</th><th>使用说明</th><th>显示序号</th><th>当前状态</th></tr></thead><tbody>
        {loading ? <tr><td colSpan={canManage ? 7 : 6}>正在加载…</td></tr> : result?.items.length ? result.items.map((row) => <tr key={row.id}>
          {canManage && <td><RowActionButton label={`编辑${row.parameterName}`} onClick={() => setEditing(row)} /></td>}
          <td>{canManage ? <button type="button" className="record-detail-link" onClick={() => setEditing(row)}>{row.parameterCode}</button> : row.parameterCode}</td><td>{row.parameterName}</td><td className="parameter-value">{row.value || '未设置'}</td><td className="parameter-note">{row.usageNote}</td><td>{row.sortNo}</td><td>{row.status === 'ACTIVE' ? '可用' : '停用'}</td>
        </tr>) : <tr><td colSpan={canManage ? 7 : 6}>{error ? '加载失败，请刷新重试' : '暂无符合条件的参数'}</td></tr>}
      </tbody></DeclarativeDataGrid></div>
      {result && <div className="parameter-pagination"><button type="button" disabled={loading || query.page <= 1} onClick={() => setQuery({ ...query, page: query.page - 1 })}>上一页</button><span>第 {query.page} / {Math.max(1, result.pagination.totalPages)} 页</span><button type="button" disabled={loading || query.page >= result.pagination.totalPages} onClick={() => setQuery({ ...query, page: query.page + 1 })}>下一页</button></div>}
    </section>
    {editing && canManage && <ParameterEditor registerGuard={registerGuard} key={`${systemCode}:${editing.id}`} row={editing} systemCode={systemCode} gateway={gateway} onClose={() => setEditing(null)} onSaved={(savedNotice) => { setEditing(null); setNotice(savedNotice || '参数已保存'); setReload((value) => value + 1); }} />}
  </div>;
}

function ParameterEditor({ row, systemCode, gateway, onClose, onSaved, registerGuard }: { registerGuard?: GuardRegistration; row: SystemParameter; systemCode: string; gateway: Gateway; onClose: () => void; onSaved: (notice: string | null) => void }) {
  const [value, setValue] = useState(row.value ?? ''), [status, setStatus] = useState(row.status);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const form = useRef<HTMLFormElement>(null), dirty = value !== (row.value ?? '') || status !== row.status;
  const closeRef = useRef(() => {});
  closeRef.current = () => { if (!busy) onClose(); };
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    form.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current(); }
      if (event.key === 'Tab') {
        const nodes = Array.from(form.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),[tabindex="0"]') ?? []);
        const first = nodes[0], last = nodes[nodes.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); previous?.focus(); };
  }, []);
  useEffect(() => {
    registerGuard?.(() => !busy && (!dirty || window.confirm('放弃未保存的参数修改？')));
    return () => registerGuard?.(null);
  }, [registerGuard, dirty, busy]);
  useEffect(() => {
    const protect = (event: BeforeUnloadEvent) => { if (dirty || busy) event.preventDefault(); };
    window.addEventListener('beforeunload', protect); return () => window.removeEventListener('beforeunload', protect);
  }, [dirty, busy]);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (busy) return; setBusy(true); setError('');
    try { const result = await gateway.updateParameter(systemCode, row.id, { value: value || null, status, version: row.version }); onSaved(result.notice); }
    catch (reason) { setError(message(reason)); setBusy(false); }
  };
  return <div className="enterprise-modal-backdrop"><form ref={form} className="enterprise-modal parameter-editor" role="dialog" aria-modal="true" aria-labelledby="parameter-editor-title" onSubmit={(event) => { void submit(event); }}>
    <header><h2 id="parameter-editor-title">编辑{row.parameterName}</h2><button type="button" aria-label="关闭参数编辑" disabled={busy} onClick={() => closeRef.current()}>×</button></header>
    <div className="modal-body">
      <p>{row.usageNote}</p><p>参数编码：{row.parameterCode}</p>
      {error && <div className="enterprise-alert" role="alert">{error}</div>}
      <label className="parameter-field">参数值<input type="text" value={value} maxLength={1000} disabled={busy} placeholder="请输入参数值" onChange={(event) => setValue(event.target.value)} /></label>
      <label className="parameter-field">当前状态<select value={status} disabled={busy} onChange={(event) => setStatus(event.target.value as SystemParameter['status'])}><option value="ACTIVE">可用</option><option value="DISABLED">停用</option></select></label>
    </div>
    <footer><button type="button" disabled={busy} onClick={() => closeRef.current()}>取消</button><button type="submit" className="is-primary" disabled={busy} aria-busy={busy}>{busy ? '保存中…' : '保存'}</button></footer>
  </form></div>;
}
