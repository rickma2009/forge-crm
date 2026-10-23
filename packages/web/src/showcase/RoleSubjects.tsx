import { DeclarativeDataGrid } from '../common/data-grid/DeclarativeDataGrid';
import { RowActionButton } from '../common/RowActionButton';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { AccessUser } from '@forge-crm/contracts';
import type { EnterpriseGateway, RoleSubjectBinding, RoleSubjectCatalog, SubjectKind, SubjectMember } from './gateway';

const message = (e: unknown) => e instanceof Error ? e.message : '操作失败，请重试';
const date = (v: string | null) => v ? new Date(v).toLocaleString('zh-CN') : '长期有效';
const state = (r: { status: string; effectiveAt: string; expiresAt: string | null }) => r.status !== 'ACTIVE' || r.expiresAt && new Date(r.expiresAt).getTime() <= Date.now() ? '已结束' : new Date(r.effectiveAt).getTime() > Date.now() ? '待生效' : '有效';
type Props = { systemCode: string; roleId: string; kind: SubjectKind; editable: boolean; gateway: EnterpriseGateway };

export function RoleSubjects({ systemCode, roleId, kind, editable, gateway }: Props) {
  const [catalog, setCatalog] = useState<RoleSubjectCatalog | null>(null);
  const [rows, setRows] = useState<RoleSubjectBinding[]>([]);
  const [sourceId, setSourceId] = useState('');
  const [descendants, setDescendants] = useState(false);
  const [begin, setBegin] = useState(''); const [end, setEnd] = useState('');
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const [manage, setManage] = useState(false); const [groupForm, setGroupForm] = useState(false);
  const [groupCode, setGroupCode] = useState(''); const [groupName, setGroupName] = useState('');
  const request = useRef(0);
  const title = kind === 'group' ? '群组' : '组织';
  const load = useCallback(async () => {
    const seq = ++request.current;
    try {
      const [next, bindings] = await Promise.all([gateway.roleSubjectCatalog(systemCode), gateway.roleSubjectBindings(systemCode, roleId)]);
      if (seq !== request.current) return;
      setCatalog(next); setRows(bindings); setError('');
    } catch (e) { if (seq === request.current) setError(message(e)); }
  }, [gateway, systemCode, roleId]);
  useEffect(() => { void load(); return () => { request.current++; }; }, [load]);
  const run = async (work: () => Promise<void>) => {
    if (busy) return;
    setBusy(true); setError('');
    try { await work(); await load(); } catch (e) { setError(message(e)); } finally { setBusy(false); }
  };
  const shown = rows.filter((r) => kind === 'group' ? r.groupId : r.orgUnitId);
  const chosenGroup = catalog?.groups.find((g) => g.id === sourceId);
  const bind = () => {
    if (!sourceId || !window.confirm('将当前角色动态绑定到所选' + title + '？成员变化会影响授权，不会复制成永久个人角色。')) return;
    void run(() => gateway.bindRoleSubjects(systemCode, roleId, { kind, subjectIds: [sourceId], includeDescendants: kind === 'organization' && descendants, effectiveAt: begin ? new Date(begin).toISOString() : new Date().toISOString(), expiresAt: end ? new Date(end).toISOString() : null }));
  };
  return <section>
    <p className="br-note">{catalog?.admissionRule || '动态授权只追加符合当前应用准入条件的用户权限。'}来源维护需受保护管理员权限；组织包含后代须显式选择。</p>
    {error && <div className="enterprise-alert" role="alert">{error}</div>}
    <div className="br-toolbar">
      <label>选择{title}<select value={sourceId} disabled={busy} onChange={(e) => { setSourceId(e.target.value); setManage(false); }}><option value="">请选择</option>{kind === 'group' ? catalog?.groups.map((g) => <option key={g.id} value={g.id}>{g.groupName} · {g.groupCode} · {g.memberCount} 人{g.status !== 'ACTIVE' ? '（停用）' : ''}</option>) : catalog?.organizations.map((o) => <option key={o.id} value={o.id}>{o.unitName} · {o.unitCode}</option>)}</select></label>
      {sourceId && <button type="button" disabled={busy} onClick={() => setManage(!manage)}>{manage ? '收起来源成员' : '查看 / 维护来源成员'}</button>}
      {editable && kind === 'group' && <><button type="button" disabled={busy} onClick={() => setGroupForm(!groupForm)}>新建群组</button>{chosenGroup && <button type="button" disabled={busy} onClick={() => { if (window.confirm('确认' + (chosenGroup.status === 'ACTIVE' ? '停用' : '启用') + '群组？此变更影响该群组在当前应用中的所有动态角色绑定。')) void run(() => gateway.saveUserGroup(systemCode, { id: chosenGroup.id, version: chosenGroup.version, groupCode: chosenGroup.groupCode, groupName: chosenGroup.groupName, description: chosenGroup.description, status: chosenGroup.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE' })); }}> {chosenGroup.status === 'ACTIVE' ? '停用群组' : '启用群组'}</button>}</>}
      <button type="button" disabled={busy} onClick={() => void load()}>刷新动态绑定</button>
    </div>
    {editable && groupForm && <form className="br-toolbar" onSubmit={(e) => { e.preventDefault(); void run(async () => { await gateway.saveUserGroup(systemCode, { groupCode, groupName }); setGroupForm(false); setGroupCode(''); setGroupName(''); }); }}><label>群组编码<input required pattern="[a-z][a-z0-9.-]*" maxLength={64} value={groupCode} onChange={(e) => setGroupCode(e.target.value)} /></label><label>群组名称<input required maxLength={128} value={groupName} onChange={(e) => setGroupName(e.target.value)} /></label><button type="submit" disabled={busy}>保存群组</button><button type="button" disabled={busy} onClick={() => setGroupForm(false)}>取消</button></form>}
    {editable && <div className="br-toolbar"><label>开始时间（留空立即，本机时区）<input type="datetime-local" value={begin} onChange={(e) => setBegin(e.target.value)} /></label><label>结束时间（可留空，本机时区）<input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} /></label>{kind === 'organization' && <label><input type="checkbox" checked={descendants} onChange={(e) => setDescendants(e.target.checked)} />包含后代组织</label>}<button type="button" className="is-primary" disabled={busy || !sourceId || chosenGroup?.status === 'DISABLED'} onClick={bind}>绑定{title}</button></div>}
    {manage && sourceId && <SubjectMembers key={kind + sourceId} systemCode={systemCode} kind={kind} sourceId={sourceId} editable={editable} gateway={gateway} />}
    <div className="enterprise-table-wrap"><DeclarativeDataGrid><thead><tr><th>{title}编码</th><th>{title}名称</th><th>包含后代</th><th>有效期</th><th>状态</th>{editable && <th>操作</th>}</tr></thead><tbody>{shown.map((r) => <tr key={r.id}><td>{r.group?.groupCode ?? r.organization?.unitCode}</td><td>{r.group?.groupName ?? r.organization?.unitName}</td><td>{r.includeDescendants ? '是' : '否'}</td><td>{date(r.effectiveAt)} → {date(r.expiresAt)}</td><td>{state(r)}</td>{editable && <td>{state(r) !== '已结束' && <RowActionButton type="button" disabled={busy} onClick={() => { if (window.confirm('结束此动态绑定？历史保留，受影响用户下次请求重新计算权限。')) void run(() => gateway.endRoleSubjects(systemCode, roleId, [{ id: r.id, version: r.version }])); }} label="结束绑定" />}</td>}</tr>)}{!shown.length && <tr><td colSpan={editable ? 6 : 5} className="br-empty">暂无动态绑定</td></tr>}</tbody></DeclarativeDataGrid></div>
  </section>;
}

function SubjectMembers({ systemCode, kind, sourceId, editable, gateway }: Omit<Props, 'roleId'> & { sourceId: string }) {
  const [members, setMembers] = useState<SubjectMember[]>([]); const [users, setUsers] = useState<AccessUser[]>([]);
  const [query, setQuery] = useState(''); const [page, setPage] = useState(1); const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set()); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const seq = useRef(0);
  const load = useCallback(async () => { const id = ++seq.current; try { const data = await gateway.roleSubjectMembers(systemCode, kind, sourceId); if (id === seq.current) setMembers(data); } catch (e) { if (id === seq.current) setError(message(e)); } }, [gateway, systemCode, kind, sourceId]);
  useEffect(() => { void load(); return () => { seq.current++; }; }, [load]);
  const search = async (targetPage: number) => { try { const data = await gateway.accessUsers(systemCode, new URLSearchParams({ keyword: query, status: 'ACTIVE', page: String(targetPage), pageSize: '20' })); setUsers(data.items); setPage(targetPage); setTotal(data.pagination.total); } catch (e) { setError(message(e)); } };
  const mutate = async (fn: () => Promise<void>) => { if (busy) return; setBusy(true); setError(''); try { await fn(); setSelected(new Set()); await load(); } catch (e) { setError(message(e)); } finally { setBusy(false); } };
  return <section className="br-note"><h3>来源成员</h3><p>维护来源事实会影响此来源关联的所有角色；未获得应用准入的账号不会因此自动进入系统。</p>{error && <div role="alert" className="enterprise-alert">{error}</div>}
    {editable && <><div className="br-toolbar"><input aria-label="查询来源候选用户" value={query} placeholder="账号 / 姓名" onChange={(e) => setQuery(e.target.value)} /><button type="button" disabled={busy} onClick={() => void search(1)}>查询候选用户</button><button type="button" disabled={busy || page <= 1} onClick={() => void search(page - 1)}>上一页</button><span>第 {page} 页 / 共 {total} 人，已选 {selected.size}</span><button type="button" disabled={busy || page * 20 >= total} onClick={() => void search(page + 1)}>下一页</button></div><div className="br-picker-list">{users.map((u) => <label key={u.id}><input type="checkbox" checked={selected.has(u.id)} disabled={busy || members.some((m) => m.userId === u.id && state(m) !== '已结束')} onChange={(e) => setSelected((current) => { const next = new Set(current); if (e.target.checked) next.add(u.id); else next.delete(u.id); return next; })} />{u.displayName} · {u.account}</label>)}</div><button type="button" disabled={busy || !selected.size || selected.size > 100} onClick={() => { if (window.confirm('确认将所选用户加入来源？将影响其当前应用内动态角色权限。')) void mutate(() => gateway.addSubjectMembers(systemCode, kind, sourceId, { userIds: [...selected], effectiveAt: new Date().toISOString(), expiresAt: null })); }}>加入来源（{selected.size}）</button></>}
    <div className="enterprise-table-wrap"><DeclarativeDataGrid><thead><tr><th>账号</th><th>姓名</th><th>应用准入</th><th>有效期</th><th>状态</th>{editable && <th>操作</th>}</tr></thead><tbody>{members.map((m) => <tr key={m.id}><td>{m.user.account}</td><td>{m.user.displayName}</td><td>{m.eligible ? '已具备' : '尚未具备'}</td><td>{date(m.effectiveAt)} → {date(m.expiresAt)}</td><td>{state(m)}</td>{editable && <td>{state(m) !== '已结束' && <RowActionButton type="button" disabled={busy} onClick={() => { if (window.confirm('结束此来源成员关系？将重新计算该账号相关动态角色权限。')) void mutate(() => gateway.endSubjectMembers(systemCode, kind, sourceId, [{ id: m.id, version: m.version }])); }} label="结束关系" />}</td>}</tr>)}{!members.length && <tr><td colSpan={editable ? 6 : 5}>暂无来源成员</td></tr>}</tbody></DeclarativeDataGrid></div>
  </section>;
}
