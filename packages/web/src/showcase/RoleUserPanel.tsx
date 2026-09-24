import { RowActionButton } from '../common/RowActionButton';
import { useCallback, useEffect, useRef, useState } from 'react';
import { IconPlus, IconTrash, IconSearch } from '@tabler/icons-react';
import type { AccessUser, RoleTreeNode } from '@forge-crm/contracts';
import type { AccessRoleMember, EnterpriseGateway } from './gateway';
import { RoleDialog } from './RoleWorkspace';

const message = (e: unknown) => e instanceof Error ? e.message : '请求失败，请重试';
const current = (m: AccessRoleMember) => m.status === 'ACTIVE' && (!m.expiresAt || new Date(m.expiresAt).getTime() > Date.now());
type Props = { systemCode: string; role: RoleTreeNode; canManage: boolean; gateway: EnterpriseGateway };

export function RoleUserPanel({ systemCode, role, canManage, gateway }: Props) {
  const [members, setMembers] = useState<AccessRoleMember[]>([]);
  const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false);
  const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const [add, setAdd] = useState(false); const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState(''); const [page, setPage] = useState(1); const [size, setSize] = useState(20);
  const request = useRef(0);
  const load = useCallback(async () => {
    const id = ++request.current; setLoading(true); setError('');
    try { const result = await gateway.accessRoleMembers(systemCode, role.id); if (id === request.current) { setMembers(result); setSelected(new Set()); } }
    catch (e) { if (id === request.current) setError(message(e)); }
    finally { if (id === request.current) setLoading(false); }
  }, [gateway, systemCode, role.id]);
  useEffect(() => { void load(); return () => { request.current++; }; }, [load]);
  const active = members.filter(current);
  const filtered = active.filter((m) => (m.user.displayName + ' ' + m.user.account).toLowerCase().includes(query.trim().toLowerCase()));
  const pages = Math.max(1, Math.ceil(filtered.length / size)); const shownPage = Math.min(page, pages);
  const shown = filtered.slice((shownPage - 1) * size, shownPage * size);
  const toggle = (ids: string[], checked: boolean) => setSelected((previous) => { const next = new Set(previous); ids.forEach((id) => checked ? next.add(id) : next.delete(id)); return next; });
  const remove = async (items: AccessRoleMember[]) => {
    if (busy || !items.length || !window.confirm('确认移除 ' + items.length + ' 个用户的此角色授权？其他角色不受影响，授权历史将保留。')) return;
    setBusy(true); setError(''); setNotice('');
    try { await gateway.batchRoleMembers(systemCode, role.id, { action: 'end', members: items.map((m) => ({ id: m.id, version: m.version })) }); await load(); setNotice('已移除 ' + items.length + ' 个用户的角色授权'); }
    catch (e) { setError(message(e)); } finally { setBusy(false); }
  };
  return <section aria-label="角色用户管理">
    <div className="br-toolbar br-member-toolbar">
      {canManage && <><button className="is-primary" type="button" disabled={loading || busy} onClick={() => setAdd(true)}><IconPlus size={17} />添加管理对象</button><button type="button" disabled={loading || busy || !selected.size} onClick={() => void remove(active.filter((m) => selected.has(m.id)))}><IconTrash size={16} />批量移除{selected.size ? '（' + selected.size + '）' : ''}</button></>}
      <label className="br-member-search"><IconSearch size={16} /><input aria-label="查询角色成员" placeholder="搜索姓名 / 账号" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); setSelected(new Set()); }} /></label>
      <span className="br-count">共 {filtered.length} 条</span>
    </div>
    {error && <div role="alert" className="enterprise-alert">{error}<button type="button" disabled={busy || loading} onClick={() => void load()}>重新载入</button></div>}
    {notice && <p role="status" className="br-success">{notice}</p>}
    <div className="enterprise-table-wrap br-members-table" aria-busy={loading}><table><thead><tr>
      <th className="br-check-column"><input type="checkbox" aria-label="选择本页全部用户" disabled={!canManage || busy || loading || !shown.length} checked={!!shown.length && shown.every((m) => selected.has(m.id))} ref={(node) => { if (node) node.indeterminate = shown.some((m) => selected.has(m.id)) && !shown.every((m) => selected.has(m.id)); }} onChange={(e) => toggle(shown.map((m) => m.id), e.target.checked)} /></th>
      <th>名称</th><th>类型</th><th>序号</th><th>操作</th>
    </tr></thead><tbody>{!loading && shown.map((m, index) => <tr key={m.id} className={selected.has(m.id) ? 'is-selected' : ''}>
      <td><input type="checkbox" aria-label={'选择成员 ' + m.user.account} disabled={!canManage || busy} checked={selected.has(m.id)} onChange={(e) => toggle([m.id], e.target.checked)} /></td>
      <td><span className="br-member-name">{m.user.displayName}</span><span className="br-member-account">{m.user.account}</span>{new Date(m.effectiveAt).getTime() > Date.now() && <small className="br-status off">待生效</small>}</td>
      <td><span className="br-status on">用户</span></td><td className="br-row-number">{(shownPage - 1) * size + index + 1}</td>
      <td>{canManage ? <RowActionButton type="button" className="br-danger" disabled={busy} onClick={() => void remove([m])} label="移除" /> : '—'}</td>
    </tr>)}{(loading || !shown.length) && <tr><td colSpan={5} className="br-empty">{loading ? '加载中…' : query ? '没有匹配的用户' : '暂无角色成员'}</td></tr>}</tbody></table></div>
    <footer className="br-pagination"><span>已选 {selected.size} 条</span><label>每页<select aria-label="每页用户数" value={size} onChange={(e) => { setSize(Number(e.target.value)); setPage(1); setSelected(new Set()); }}><option value={10}>10 条</option><option value={20}>20 条</option><option value={50}>50 条</option></select></label><button type="button" disabled={shownPage <= 1 || loading} onClick={() => setPage(shownPage - 1)}>上一页</button><span>第 {shownPage} / {pages} 页</span><button type="button" disabled={shownPage >= pages || loading} onClick={() => setPage(shownPage + 1)}>下一页</button></footer>
    {add && <UserPicker systemCode={systemCode} roleId={role.id} gateway={gateway} existing={new Set(active.map((m) => m.userId))} onClose={() => setAdd(false)} onSaved={async () => { setAdd(false); await load(); setNotice('角色用户添加成功'); }} />}
  </section>;
}

function UserPicker({ systemCode, roleId, gateway, existing, onClose, onSaved }: { systemCode: string; roleId: string; gateway: EnterpriseGateway; existing: Set<string>; onClose: () => void; onSaved: () => Promise<void> }) {
  const [users, setUsers] = useState<AccessUser[]>([]); const [query, setQuery] = useState(''); const [applied, setApplied] = useState('');
  const [page, setPage] = useState(1); const [total, setTotal] = useState(0); const [selected, setSelected] = useState<Map<string, AccessUser>>(new Map());
  const [error, setError] = useState(''); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [retry, setRetry] = useState(0);
  useEffect(() => { let live = true; setLoading(true); setError(''); void gateway.accessUsers(systemCode, new URLSearchParams({ page: String(page), pageSize: '20', keyword: applied, status: 'ACTIVE' })).then((data) => { if (live) { setUsers(data.items); setTotal(data.pagination.total); } }).catch((e) => { if (live) { setUsers([]); setError(message(e)); } }).finally(() => { if (live) setLoading(false); }); return () => { live = false; }; }, [systemCode, gateway, applied, page, retry]);
  const candidates = users.filter((u) => !existing.has(u.id));
  const toggle = (items: AccessUser[], checked: boolean) => setSelected((previous) => { const next = new Map(previous); items.forEach((u) => checked ? next.set(u.id, u) : next.delete(u.id)); return next; });
  const submit = async () => { if (busy || !selected.size || selected.size > 100) return; setBusy(true); setError(''); try { await gateway.batchRoleMembers(systemCode, roleId, { action: 'add', userIds: [...selected.keys()], effectiveAt: new Date().toISOString(), expiresAt: null }); await onSaved(); } catch (e) { setError(message(e)); } finally { setBusy(false); } };
  return <RoleDialog title="添加管理对象" onClose={() => { if (!busy) onClose(); }}><div className="modal-body"><form className="br-toolbar" onSubmit={(e) => { e.preventDefault(); setApplied(query); setPage(1); setRetry((n) => n + 1); }}><input aria-label="搜索候选用户" placeholder="账号 / 姓名" value={query} onChange={(e) => setQuery(e.target.value)} /><button type="submit" disabled={busy}>查询</button><button type="button" disabled={busy} onClick={() => { setQuery(''); setApplied(''); setPage(1); setRetry((n) => n + 1); }}>重置</button></form>
    {error && <div role="alert" className="enterprise-alert">{error}<button type="button" disabled={busy} onClick={() => setRetry((n) => n + 1)}>重试查询</button></div>}
    <div className="enterprise-table-wrap br-picker-table"><table><thead><tr><th><input type="checkbox" aria-label="选择本页候选用户" disabled={busy || loading || !candidates.length} checked={!!candidates.length && candidates.every((u) => selected.has(u.id))} ref={(node) => { if (node) node.indeterminate = candidates.some((u) => selected.has(u.id)) && !candidates.every((u) => selected.has(u.id)); }} onChange={(e) => toggle(candidates, e.target.checked)} /></th><th>账号</th><th>姓名</th><th>授权状态</th></tr></thead><tbody>{!loading && users.map((u) => <tr key={u.id}><td><input type="checkbox" aria-label={'添加用户 ' + u.displayName} disabled={busy || existing.has(u.id)} checked={existing.has(u.id) || selected.has(u.id)} onChange={(e) => toggle([u], e.target.checked)} /></td><td>{u.account}</td><td>{u.displayName}</td><td>{existing.has(u.id) ? '已添加' : '可添加'}</td></tr>)}{(loading || !users.length) && <tr><td colSpan={4}>{loading ? '加载中…' : '暂无匹配用户'}</td></tr>}</tbody></table></div>
    <div className="br-pagination"><span>共 {total} 人 · 已选 {selected.size} 人</span><button type="button" disabled={loading || busy || page <= 1} onClick={() => setPage(page - 1)}>上一页</button><span>第 {page} 页</span><button type="button" disabled={loading || busy || page * 20 >= total} onClick={() => setPage(page + 1)}>下一页</button></div><p className="br-note">添加后授予此角色权限，默认立即生效、长期有效。每次最多添加 100 人；已授权用户不可重复添加。</p>
  </div><footer><button type="button" disabled={busy} onClick={onClose}>取消</button><button type="button" className="is-primary" disabled={busy || !selected.size || selected.size > 100} onClick={() => void submit()}>{busy ? '添加中…' : '确认添加（' + selected.size + '）'}</button></footer></RoleDialog>;
}
