import { TreeWorkspace } from '../common/TreeWorkspace';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import type { RoleTreeNode, RoleWrite } from '@interaction-pattern-lab/contracts';
import type { EnterpriseGateway } from './gateway';
import './role-workspace.css';
import { type TreeNodeAction } from '../common/useTreeNodeMenu';
import { RoleUserPanel } from './RoleUserPanel';
import { RolePermissionTree } from './RolePermissionTree';
import { IconPlus, IconPencil } from '@tabler/icons-react';

const TABS = ['用户管理', '功能与数据权限'];
const errorText = (e: unknown) => e instanceof Error ? e.message : '请求失败，请重试';
const flatten = (nodes: RoleTreeNode[], depth = 0): Array<RoleTreeNode & { depth: number }> => nodes.flatMap((n) => [{ ...n, depth }, ...flatten(n.children, depth + 1)]);
const dateText = (value: string | null) => value ? dateInput(value) : '长期有效';
const dateInput = (value: string | null | undefined) => value ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value)) : '';
type Props = { systemCode: string; allowedActions: string[]; gateway: EnterpriseGateway };

export function RoleManagementPage(props: Props) {
  // A scope change unmounts pending editors and prevents stale cross-application state.
  return <RoleWorkspace key={props.systemCode} {...props} />;
}

function RoleWorkspace({ systemCode, allowedActions, gateway }: Props) {
  const [tree, setTree] = useState<RoleTreeNode[]>([]); const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState(0);
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState<{ role: RoleTreeNode | null; parentId: string | null } | null>(null);
  const [moving, setMoving] = useState<RoleTreeNode | null>(null);
  const [dirty, setDirty] = useState(false);
  const [moveTarget, setMoveTarget] = useState('');
  const request = useRef(0); const canManage = allowedActions.includes('manage');
  const rows = useMemo(() => flatten(tree), [tree]); const selected = rows.find((r) => r.id === selectedId) ?? null;
  const load = useCallback(async () => {
    const id = ++request.current; setLoading(true); setError('');
    try { const next = await gateway.roleTree(systemCode); if (id !== request.current) return; setTree(next); setSelectedId((current) => flatten(next).some((r) => r.id === current) ? current : null); }
    catch (e) { if (id === request.current) setError(errorText(e)); }
    finally { if (id === request.current) setLoading(false); }
  }, [gateway, systemCode]);
  useEffect(() => { void load(); return () => { request.current++; }; }, [load]);
  useEffect(() => { const guard = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } }; window.addEventListener('beforeunload', guard); return () => window.removeEventListener('beforeunload', guard); }, [dirty]);
  const leave = () => !dirty || window.confirm('当前权限修改尚未保存，确定放弃吗？');
  const run = async (action: () => Promise<unknown>) => { if (busy) return; setBusy(true); setError(''); try { await action(); await load(); } catch (e) { setError(errorText(e)); } finally { setBusy(false); } };
  const choose = (id: string) => { if (id === selectedId || !leave()) return; setDirty(false); setSelectedId(id); setTab(0);  };
  const remove = (role: RoleTreeNode) => {  if (window.confirm('删除角色「' + role.roleName + '」？有引用时会拒绝，历史记录保留。')) void run(() => gateway.deleteRole(systemCode, role.id, role.version)); };
  const nodeActions = (role: RoleTreeNode): TreeNodeAction[] => !canManage ? [] : [
    { key: 'create', label: '新建角色', disabled: busy, run: () => setEditor({ role: null, parentId: role.parentId }) },
    { key: 'child', label: '新建子角色', disabled: busy, run: () => setEditor({ role: null, parentId: role.id }) },
    ...(!role.isSystem ? [
      { key: 'edit', label: '编辑', disabled: busy, run: () => setEditor({ role, parentId: role.parentId }) },
      { key: 'move', label: '移动 / 排序', disabled: busy, run: () => { if (leave()) { setMoveTarget(''); setMoving(role); } } },
      { key: 'delete', label: '删除', danger: true, disabled: busy, run: () => { if (leave()) remove(role); } },
    ] : []),
  ];
  return <div className="enterprise-page business-role-workspace">
    {error && <div role="alert" className="enterprise-alert">{error}<button type="button" onClick={() => void load()}>重试</button></div>}
    <TreeWorkspace title="角色" collapseLabel="折叠角色面板" expandLabel="展开角色面板" nodes={rows.map((r) => ({ id: r.id, parentId: r.parentId, label: r.roleName, searchText: r.roleCode }))} selectedId={selectedId} onSelect={choose} onRefresh={() => void load()} loading={loading} onCreate={canManage ? () => setEditor({ role: null, parentId: null }) : undefined} createLabel="新建角色" actions={(n) => nodeActions(rows.find((r) => r.id === n.id)!)} rowProps={(n) => ({ draggable: canManage && !rows.find((r) => r.id === n.id)!.isSystem && !busy, onDragStart: (e) => e.dataTransfer.setData('text/plain', n.id), onDragOver: (e) => { if (canManage) e.preventDefault(); }, onDrop: (e) => { e.preventDefault(); const source = rows.find((r) => r.id === e.dataTransfer.getData('text/plain')); if (source && source.id !== n.id && !source.isSystem && canManage && leave()) { setMoveTarget(n.id); setMoving(source); setSelectedId(source.id); } } })}>
      <section className="br-detail">{!selected ? <div className="br-empty-detail">← 选择左侧角色查看详情</div> : <>
        <header className="br-header"><div className="br-avatar">{selected.roleName.slice(0, 1)}</div><div className="br-header-info"><h2>{selected.roleName}</h2><div className="br-meta"><code>{selected.roleCode}</code>{selected.roleAbbrName && <span>{selected.roleAbbrName}</span>}<span className={'br-status ' + (selected.isEnabled ? 'on' : 'off')}>{selected.isEnabled ? '启用' : '停用'}</span>{selected.isSystem && <span>系统内置 · 受保护</span>}{selected.effectiveDateBegin && <span>{dateText(selected.effectiveDateBegin)} — {dateText(selected.effectiveDateEnd)}</span>}</div></div><div className="br-header-actions">{canManage && <>{!selected.isSystem && <button type="button" disabled={busy} onClick={() => setEditor({ role: selected, parentId: selected.parentId })}><IconPencil size={16} />编辑</button>}<button type="button" onClick={() => setEditor({ role: null, parentId: selected.id })}><IconPlus size={16} />子角色</button></>}</div></header>
        <div role="tablist" aria-label="角色配置" className="br-tabs">{TABS.map((name, i) => <button key={name} type="button" role="tab" id={'role-tab-' + i} aria-selected={tab === i} aria-controls="role-tab-panel" onClick={() => { if (tab !== i && leave()) { setDirty(false); setTab(i); } }}>{name}</button>)}</div>
        <div role="tabpanel" id="role-tab-panel" aria-labelledby={'role-tab-' + tab} className="br-content" key={selected.id + ':' + tab}>
          {tab === 0 ? <RoleUserPanel systemCode={systemCode} role={selected} canManage={canManage} gateway={gateway} /> : <RolePermissionTree systemCode={systemCode} role={selected} canManage={canManage} gateway={gateway} onDirty={setDirty} onSaved={load} />}
        </div></>}
      </section>
    </TreeWorkspace>
    {editor && <RoleEditor key={editor.role?.id ?? 'new'} {...editor} systemCode={systemCode} gateway={gateway} onClose={() => setEditor(null)} onSaved={async () => { setEditor(null); await load(); }} />}
    {moving && <MoveEditor key={moving.id + moveTarget} role={moving} rows={rows} initialTarget={moveTarget} onClose={() => setMoving(null)} onSave={async (targetId, position) => { await gateway.moveRole(systemCode, moving.id, { version: moving.version, targetId, position }); setMoving(null); await load(); }} />}
  </div>;
}

export function RoleDialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { const previous = document.activeElement as HTMLElement | null; ref.current?.focus(); return () => { previous?.focus(); }; }, []);
  return <div className="enterprise-modal-backdrop br-dialog-backdrop"><div className="enterprise-modal br-dialog" ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } if (e.key === 'Tab') { const items = Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]') ?? []); const first = items[0]; const last = items.at(-1); if (e.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { e.preventDefault(); last?.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); } } }}><header><h2>{title}</h2><button type="button" aria-label="关闭弹窗" onClick={onClose}>×</button></header>{children}</div></div>;
}

function RoleEditor({ role, parentId, systemCode, gateway, onClose, onSaved }: { role: RoleTreeNode | null; parentId: string | null; systemCode: string; gateway: EnterpriseGateway; onClose: () => void; onSaved: () => Promise<void> }) {
  const [draft, setDraft] = useState({ roleCode: role?.roleCode ?? '', roleName: role?.roleName ?? '', roleAbbrName: role?.roleAbbrName ?? '', description: role?.description ?? '', isEnabled: role?.isEnabled ?? true, begin: dateInput(role?.effectiveDateBegin), end: dateInput(role?.effectiveDateEnd) });
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [dirty, setDirty] = useState(false);
  const set = (key: string, value: string | boolean) => { setDirty(true); setDraft((current) => ({ ...current, [key]: value })); };
  const close = () => { if (!busy && (!dirty || window.confirm('放弃未保存的角色修改？'))) onClose(); };
  const submit = async (e: FormEvent) => { e.preventDefault(); if (busy) return; setBusy(true); setError(''); try {
    if (!draft.roleName.trim()) throw new Error('请输入角色名称');
    if (draft.begin && draft.end && draft.end <= draft.begin) throw new Error('有效期结束必须晚于开始');
    const common = { roleName: draft.roleName.trim(), roleAbbrName: draft.roleAbbrName.trim() || null, description: draft.description.trim() || null, isEnabled: draft.isEnabled, parentId, sortNo: role?.sortNo ?? 0, effectiveDateBegin: draft.begin ? new Date(draft.begin + 'T00:00:00+08:00').toISOString() : null, effectiveDateEnd: draft.end ? new Date(draft.end + 'T00:00:00+08:00').toISOString() : null };
    if (role) await gateway.updateRole(systemCode, role.id, { ...common, version: role.version }); else await gateway.createRole(systemCode, { ...common, roleCode: draft.roleCode.trim() } satisfies RoleWrite);
    setDirty(false); await onSaved();
  } catch (e) { setError(errorText(e)); } finally { setBusy(false); } };
  return <RoleDialog title={role ? '编辑角色' : parentId ? '新建子角色' : '新建角色'} onClose={close}><form onSubmit={submit}><div className="modal-body form-grid">{error && <div className="enterprise-alert span-2" role="alert">{error}</div>}
    <label>角色编码<span className="br-required">*</span><input required disabled={!!role || busy} pattern="[a-z][a-z0-9.-]*" maxLength={64} value={draft.roleCode} onChange={(e) => set('roleCode', e.target.value)} /></label><label>角色名称<span className="br-required">*</span><input required maxLength={128} value={draft.roleName} onChange={(e) => set('roleName', e.target.value)} /></label><label>角色简称<input maxLength={64} value={draft.roleAbbrName} onChange={(e) => set('roleAbbrName', e.target.value)} /></label><label>是否启用<select value={String(draft.isEnabled)} onChange={(e) => set('isEnabled', e.target.value === 'true')}><option value="true">启用</option><option value="false">停用</option></select></label><label>有效期开始<input type="date" value={draft.begin} onChange={(e) => set('begin', e.target.value)} /></label><label>有效期结束（不含当日）<input type="date" value={draft.end} onChange={(e) => set('end', e.target.value)} /></label><label className="span-2">备注<textarea maxLength={512} rows={3} value={draft.description} onChange={(e) => set('description', e.target.value)} /></label><p className="span-2 br-note">日期按北京时间计算。角色树不继承权限；普通角色不能设置绕过授权。</p></div><footer><button type="button" disabled={busy} onClick={close}>取消</button><button type="submit" className="is-primary" disabled={busy}>{busy ? '保存中…' : '保存'}</button></footer></form></RoleDialog>;
}

function MoveEditor({ role, rows, initialTarget, onClose, onSave }: { role: RoleTreeNode; rows: RoleTreeNode[]; initialTarget: string; onClose: () => void; onSave: (id: string, position: 'before' | 'after' | 'child') => Promise<void> }) {
  const [target, setTarget] = useState(initialTarget); const [position, setPosition] = useState<'before' | 'after' | 'child'>('child'); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  return <RoleDialog title={'移动角色 · ' + role.roleName} onClose={() => { if (!busy) onClose(); }}><form onSubmit={(e) => { e.preventDefault(); setBusy(true); void onSave(target, position).catch((e) => setError(errorText(e))).finally(() => setBusy(false)); }}><div className="modal-body">{error && <div role="alert" className="enterprise-alert">{error}</div>}<label>目标角色<select required value={target} onChange={(e) => setTarget(e.target.value)}><option value="">请选择</option>{rows.filter((r) => r.id !== role.id).map((r) => <option value={r.id} key={r.id}>{r.roleName}</option>)}</select></label><label>放置位置<select value={position} onChange={(e) => setPosition(e.target.value as typeof position)}><option value="child">作为子角色</option><option value="before">目标之前</option><option value="after">目标之后</option></select></label><p className="br-note">只调整组织方式，不改变任何成员或权限。</p></div><footer><button type="button" disabled={busy} onClick={onClose}>取消</button><button type="submit" className="is-primary" disabled={busy || !target}>确认移动</button></footer></form></RoleDialog>;
}
