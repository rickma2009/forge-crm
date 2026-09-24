import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IconChevronDown, IconChevronRight, IconShieldCheck } from '@tabler/icons-react';
import type { RolePermissionCatalog, RoleTreeNode } from '@interaction-pattern-lab/contracts';
import type { EnterpriseGateway } from './gateway';
import { RoleDialog } from './RoleWorkspace';

type Node = { id: string; label: string; code: string; page: boolean; own: string[]; children: Node[] };
type Props = { systemCode: string; role: RoleTreeNode; canManage: boolean; gateway: EnterpriseGateway; onDirty: (value: boolean) => void; onSaved: () => Promise<void> };
const message = (e: unknown) => e instanceof Error ? e.message : '权限加载失败，请重试';
const allIds = (node: Node): string[] => [...new Set([...node.own, ...node.children.flatMap(allIds)])];

function buildTree(catalog: RolePermissionCatalog): Node[] {
  const used = new Set<string>();
  const nodes = new Map<string, Node>();
  for (const p of catalog.pages) {
    const own = [...p.permissionIds]; own.forEach((id) => used.add(id));
    const children: Node[] = p.actions.map((a) => { a.permissionIds.forEach((id) => used.add(id)); return { id: 'action:' + a.id, label: a.label, code: '', page: false, own: a.permissionIds, children: [] }; });
    // Keep page entry and individual operations independently editable.
    if (own.length && children.length) { children.unshift({ id: 'entry:' + p.id, label: '页面访问', code: '', page: false, own, children: [] }); }
    nodes.set(p.id, { id: p.id, label: p.pageName, code: p.pageCode, page: ['PAGE', 'SUBPAGE'].includes(p.pageType), own: children.length ? [] : own, children });
  }
  const roots: Node[] = [];
  for (const p of catalog.pages) {
    // Bad legacy parents must not hide grants or recurse forever.
    const visited = new Set([p.id]); let parent = p.parentId; let cyclic = false;
    while (parent) { if (visited.has(parent)) { cyclic = true; break; } visited.add(parent); parent = catalog.pages.find((row) => row.id === parent)?.parentId ?? null; }
    const node = nodes.get(p.id)!;
    if (!cyclic && p.parentId && nodes.has(p.parentId)) nodes.get(p.parentId)!.children.push(node); else roots.push(node);
  }
  const unlinked = catalog.permissions.filter((p) => !used.has(p.id));
  if (unlinked.length) roots.push({ id: 'service-permissions', label: '系统服务权限', code: '', page: false, own: [], children: unlinked.map((p) => ({ id: 'permission:' + p.id, label: p.permissionName, code: p.permissionCode, page: false, own: [p.id], children: [] })) });
  return roots;
}

export function RolePermissionTree({ systemCode, role, canManage, gateway, onDirty, onSaved }: Props) {
  const [catalog, setCatalog] = useState<RolePermissionCatalog | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set()); const [original, setOriginal] = useState<Set<string>>(new Set());
  const [version, setVersion] = useState(role.version); const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const [dataPage, setDataPage] = useState<string | null>(null); const request = useRef(0);
  const editable = canManage && !role.isSystem;
  const load = useCallback(async () => {
    const seq = ++request.current; setLoading(true); setError('');
    try {
      const [data, assigned] = await Promise.all([gateway.rolePermissionCatalog(systemCode), gateway.accessRolePermissions(systemCode, role.id)]);
      if (seq !== request.current) return;
      setCatalog(data); setSelected(new Set(assigned.permissionIds)); setOriginal(new Set(assigned.permissionIds)); setVersion(assigned.roleVersion);
      setExpanded(new Set(data.pages.filter((p) => p.pageType === 'SYSTEM' || p.pageType === 'MODULE').map((p) => p.id)));
    } catch (e) { if (seq === request.current) setError(message(e)); }
    finally { if (seq === request.current) setLoading(false); }
  }, [gateway, systemCode, role.id]);
  useEffect(() => { void load(); return () => { request.current++; }; }, [load]);
  const changes = useMemo(() => [...new Set([...original, ...selected])].filter((id) => original.has(id) !== selected.has(id)), [original, selected]);
  useEffect(() => { onDirty(changes.length > 0); }, [changes, onDirty]);
  const tree = useMemo(() => catalog ? buildTree(catalog) : [], [catalog]);
  const permissions = new Map(catalog?.permissions.map((p) => [p.id, p]) ?? []);
  const grantable = new Set(catalog?.grantablePermissionIds ?? []);
  const toggle = (ids: string[], checked: boolean) => {
    setNotice(''); setSelected((previous) => { const next = new Set(previous); for (const id of ids) { if (!checked) next.delete(id); else if (grantable.has(id) && permissions.get(id)?.status === 'ACTIVE') next.add(id); } return next; });
  };
  const save = async () => {
    if (!editable || saving || loading || !changes.length) return;
    if (!window.confirm('确认权限变更：\n' + changes.map((id) => (selected.has(id) ? '新增 ' : '移除 ') + (permissions.get(id)?.permissionName ?? id)).join('\n'))) return;
    setSaving(true); setError(''); setNotice('');
    try { await gateway.replaceAccessRolePermissions(systemCode, role.id, { roleVersion: version, permissionIds: [...selected] }); await load(); await onSaved(); setNotice('权限已保存'); }
    catch (e) { setError(message(e)); } finally { setSaving(false); }
  };
  const branchIds = (nodes: Node[]): string[] => nodes.flatMap((n) => n.children.length ? [n.id, ...branchIds(n.children)] : []);
  const renderNodes = (nodes: Node[], depth = 0) => nodes.map((node) => {
    const ids = allIds(node); const checked = ids.length > 0 && ids.every((id) => selected.has(id)); const partial = !checked && ids.some((id) => selected.has(id));
    const disabled = !editable || saving || loading || !ids.some((id) => selected.has(id) || grantable.has(id) && permissions.get(id)?.status === 'ACTIVE');
    const open = expanded.has(node.id); const actions = node.children.filter((n) => n.id.startsWith('action:'));
    return <li key={node.id}><div className={'br-permission-row' + (node.children.length ? ' is-branch' : '')} style={{ paddingLeft: depth * 28 }}>
      {node.children.length ? <button type="button" className="br-permission-expander" aria-label={(open ? '收起 ' : '展开 ') + node.label} aria-expanded={open} onClick={() => setExpanded((current) => { const next = new Set(current); if (next.has(node.id)) next.delete(node.id); else next.add(node.id); return next; })}>{open ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}</button> : <span className="br-permission-expander" />}
      <input type="checkbox" aria-label={(node.children.length || node.page ? '选择资源 ' : '权限 ') + node.label} disabled={disabled} checked={checked} ref={(el) => { if (el) el.indeterminate = partial; }} onChange={(e) => toggle(ids, e.target.checked)} />
      <span className="br-permission-label">{node.label}</span>{actions.length > 0 && <span className="br-permission-count">{actions.filter((a) => a.own.length && a.own.every((id) => selected.has(id))).length}/{actions.length} 操作</span>}
      {!ids.length && !node.children.length && <span className="br-permission-count">尚未关联权限</span>}
      {node.code && !node.page && !node.children.length && <code className="br-permission-code">{node.code}</code>}
      {node.page && <button type="button" className="br-data-link" onClick={() => setDataPage(node.label)}><IconShieldCheck size={17} />数据权限</button>}
    </div>{open && node.children.length > 0 && <ul>{renderNodes(node.children, depth + 1)}</ul>}</li>;
  });
  return <section aria-label="功能权限树" className="br-permission-panel">
    <div className="br-toolbar br-permission-toolbar"><strong>功能权限树</strong><span className="br-permission-count">{catalog?.pages.length ?? 0} 资源</span><div className="br-permission-actions"><button type="button" disabled={loading} onClick={() => setExpanded(new Set(branchIds(tree)))}>全部展开</button><button type="button" disabled={loading} onClick={() => setExpanded(new Set())}>全部收起</button>{editable && <button type="button" className={changes.length ? 'is-primary' : ''} disabled={saving || loading || !changes.length} onClick={() => void save()}>{saving ? '保存中…' : '保存' + (changes.length ? '（' + changes.length + '）' : '')}</button>}</div></div>
    {role.isSystem && <p className="br-note">系统内置角色受保护，权限在此只读。</p>}
    {error && <div role="alert" className="enterprise-alert">{error}<button type="button" disabled={saving || loading} onClick={() => { if (!changes.length || window.confirm('放弃修改并重新载入？')) void load(); }}>重新载入</button></div>}
    {notice && <p role="status" className="br-success">{notice}</p>}
    {loading ? <p className="br-empty">加载权限中…</p> : !tree.length ? <p className="br-empty">暂无资源权限</p> : <ul className="br-permission-tree">{renderNodes(tree)}</ul>}
    {dataPage && <RoleDialog title={'数据权限 · ' + dataPage} onClose={() => setDataPage(null)}><div className="modal-body"><p>数据权限将在后续阶段设置，本次仅配置功能权限。</p><p className="br-note">现有数据策略保持不变。关闭此窗口不会修改任何授权。</p></div><footer><button type="button" onClick={() => setDataPage(null)}>关闭</button></footer></RoleDialog>}
  </section>;
}
