import { useCallback, useEffect, useState } from 'react';
import type { EnterpriseGateway, RoleViews as ViewData } from './gateway';

export function RoleViews({ systemCode, roleId, editable, gateway, onDirty, onSaved }: { systemCode: string; roleId: string; editable: boolean; gateway: EnterpriseGateway; onDirty: (value: boolean) => void; onSaved: () => Promise<void> }) {
  const [data, setData] = useState<ViewData | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setBusy(true);
    try { const result = await gateway.roleViews(systemCode, roleId); setData(result); setSelected(new Set(result.items.filter((v) => v.assigned).map((v) => v.id))); onDirty(false); setError(''); }
    catch (e) { setError(e instanceof Error ? e.message : '读取视图失败'); }
    finally { setBusy(false); }
  }, [gateway, systemCode, roleId, onDirty]);
  useEffect(() => { void load(); }, [load]);
  const changes = data?.items.filter((v) => v.assigned !== selected.has(v.id)) ?? [];
  const save = async () => {
    if (!data || busy || !changes.length || !window.confirm('确认视图授权变更：\n' + changes.map((v) => (selected.has(v.id) ? '新增 ' : '移除 ') + v.viewName).join('\n'))) return;
    setBusy(true);
    try { await gateway.saveRoleViews(systemCode, roleId, { version: data.version, viewIds: [...selected] }); await load(); await onSaved(); }
    catch (e) { setError(e instanceof Error ? e.message : '保存视图失败'); }
    finally { setBusy(false); }
  };
  return <><div className="br-toolbar"><input aria-label="搜索视图" placeholder="资源 / 视图名称" value={query} onChange={(e) => setQuery(e.target.value)} />{editable && <button type="button" className="is-primary" disabled={busy || !changes.length} onClick={() => void save()}>保存视图{changes.length ? `（${changes.length}）` : ''}</button>}<button type="button" disabled={busy} onClick={() => { if (!changes.length || window.confirm('放弃未保存的视图修改？')) void load(); }}>重新载入</button><span>共 {data?.items.length ?? 0} 个视图</span></div>
    <p className="br-note">只影响展示视图，不授予数据访问或导出操作。仅能分配自己有效拥有的视图；移除后保留历史，个人视图不能绕过此限制。</p>
    {error && <div role="alert" className="enterprise-alert">{error}</div>}
    <div className="enterprise-table-wrap"><table><thead><tr><th>授权</th><th>视图名称</th><th>资源</th><th>操作</th><th>状态</th><th>显示列</th></tr></thead><tbody>{data?.items.filter((v) => (v.viewName + v.pageCode).toLowerCase().includes(query.toLowerCase())).map((v) => <tr key={v.id}><td><input type="checkbox" aria-label={'授权视图 ' + v.viewName} checked={selected.has(v.id)} disabled={!editable || busy || !v.grantable && !selected.has(v.id)} onChange={(e) => { const next = new Set(selected); if (e.target.checked) next.add(v.id); else next.delete(v.id); setSelected(next); onDirty(true); }} /></td><td>{v.viewName}{!v.grantable && <small> · 不可新增授权</small>}</td><td>{v.pageCode}</td><td>{v.actionCode}</td><td>{v.status === 'ACTIVE' ? '启用' : '停用'}</td><td><details><summary>查看列配置</summary>{v.config.columns.map((c) => <div key={c.key}>{c.key} · {c.visible ? '显示' : '隐藏'}</div>)}</details></td></tr>)}{!data?.items.length && <tr><td colSpan={6} className="br-empty">{busy ? '加载中…' : '本应用暂无已登记视图'}</td></tr>}</tbody></table></div></>;
}
