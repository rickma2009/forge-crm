import { TreeWorkspace } from '../common/TreeWorkspace';
import { type TreeNodeAction } from '../common/useTreeNodeMenu';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { organizationUnitWriteSchema, type OrganizationUnit, type OrganizationUnitWrite } from '@forge-crm/contracts';
import type { EnterpriseGateway } from './gateway';
import { DialogSubmitError, useDialogSubmit } from './useDialogSubmit';
import './organization-workspace.css';

const TYPE_LABEL = { COMPANY: '公司', DIVISION: '事业部', DEPARTMENT: '部门', TEAM: '团队' } as const;
const todayDate = () => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`; };
const errorText = (reason: unknown) => reason instanceof Error ? reason.message : '服务暂时不可用';

export function OrganizationUnitsPage({ systemCode, canManage, gateway }: { systemCode: string; canManage: boolean; gateway: EnterpriseGateway }) {
  const nodeActions = (item: OrganizationUnit): TreeNodeAction[] => !canManage ? [] : [
    { key: 'create', label: '新建组织', run: () => setEditing({ parentId: item.parentId }) },
    { key: 'child', label: '新增子组织', run: () => setEditing({ parentId: item.id }) },
    { key: 'edit', label: '编辑', run: () => setEditing({ item }) },
  ];
  const [items, setItems] = useState<OrganizationUnit[]>([]); const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ item?: OrganizationUnit; parentId?: string | null } | null>(null); const [error, setError] = useState('');
  const load = async () => { try { setError(''); const next = (await gateway.organizationUnits(systemCode, new URLSearchParams())).items; setItems(next); setSelectedId((current) => current && next.some((item) => item.id === current) ? current : next[0]?.id ?? null); } catch (reason) { setError(errorText(reason)); } };
  useEffect(() => { void load(); }, [systemCode]);
  const byId = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const selected = items.find((item) => item.id === selectedId) ?? null;
  const fields = selected ? [['组织编码', selected.unitCode], ['组织名称', selected.unitName], ['组织类型', TYPE_LABEL[selected.unitType]], ['上级组织', selected.parentId ? byId.get(selected.parentId)?.unitName ?? '—' : '(根组织)'], ['当前状态', selected.status === 'ACTIVE' ? '启用' : '停用'], ['显示序号', String(selected.sortNo)], ['生效日期', selected.effectiveAt.slice(0, 10)], ['失效日期', selected.expiresAt?.slice(0, 10) ?? '长期有效'], ['更新时间', new Date(selected.updatedAt).toLocaleString()], ['备注', selected.remark || '—']] : [];
  return <div className="enterprise-page">
    {error && <div className="enterprise-alert" role="alert">{error}<button onClick={() => setError('')}>×</button></div>}
    <TreeWorkspace title="组织" nodes={items.map((i) => ({ id: i.id, parentId: i.parentId, label: i.unitName, searchText: i.unitCode }))} selectedId={selectedId} onSelect={setSelectedId} onRefresh={() => void load()} onCreate={canManage ? () => setEditing({ parentId: null }) : undefined} createLabel="新建组织" actions={(n) => nodeActions(items.find((i) => i.id === n.id)!)}><main className="organization-detail-panel">{selected ? <><header><div className="organization-detail-icon">组</div><div><h2>{selected.unitName}</h2><code>{selected.unitCode}</code></div>{canManage && <div className="organization-detail-actions"><button type="button" onClick={() => setEditing({ item: selected })}>✎ 编辑</button><button className="is-primary" type="button" onClick={() => setEditing({ parentId: selected.id })}>＋ 新建下级</button></div>}</header><section><h3>基本信息</h3><div className="resource-info-grid">{fields.map(([key, value]) => <div key={key}><small>{key}</small><span>{value}</span></div>)}</div></section></> : <div className="resource-empty">▤<span>从左侧选择一个组织</span></div>}</main></TreeWorkspace>
    {editing && <OrganizationUnitModal items={items} editing={editing} onClose={() => setEditing(null)} onSave={async (input) => { if (editing.item) await gateway.updateOrganizationUnit(systemCode, editing.item.id, { ...input, version: editing.item.version }); else await gateway.createOrganizationUnit(systemCode, input); setEditing(null); await load(); }} />}
  </div>;
}

function OrganizationUnitModal({ items, editing, onClose, onSave }: { items: OrganizationUnit[]; editing: { item?: OrganizationUnit; parentId?: string | null }; onClose: () => void; onSave: (input: OrganizationUnitWrite) => Promise<void> }) {
  const item = editing.item;
  const [parentId, setParentId] = useState(item?.parentId ?? editing.parentId ?? '');
  const [unitCode, setUnitCode] = useState(item?.unitCode ?? '');
  const [unitName, setUnitName] = useState(item?.unitName ?? '');
  const [unitType, setUnitType] = useState<OrganizationUnitWrite['unitType']>(item?.unitType ?? 'DEPARTMENT');
  const [sortNo, setSortNo] = useState(String(item?.sortNo ?? 10));
  const [status, setStatus] = useState<OrganizationUnitWrite['status']>(item?.status ?? 'ACTIVE');
  const [effectiveAt, setEffectiveAt] = useState(item?.effectiveAt.slice(0, 10) ?? todayDate());
  const [expiresAt, setExpiresAt] = useState(item?.expiresAt?.slice(0, 10) ?? '');
  const [remark, setRemark] = useState(item?.remark ?? '');
  const { error, saving, submit: save } = useDialogSubmit();
  const submit = (event: FormEvent) => {
    event.preventDefault();
    void save(async () => {
      const parsed = organizationUnitWriteSchema.safeParse({ parentId: parentId || null, unitCode, unitName, unitType, sortNo: sortNo === '' ? Number.NaN : Number(sortNo), status,
        effectiveAt: effectiveAt ? `${effectiveAt}T00:00:00.000Z` : '', expiresAt: expiresAt ? `${expiresAt}T00:00:00.000Z` : null, remark: remark || null });
      if (!parsed.success) {
        const labels: Record<string, string> = { parentId: '上级组织', unitCode: '组织编码', unitName: '组织名称', unitType: '组织类型', sortNo: '显示序号', status: '当前状态', effectiveAt: '生效日期', expiresAt: '失效日期', remark: '备注' };
        const hints: Record<string, string> = { parentId: '请选择有效的上级组织', unitCode: '以小写字母开头，最多 64 个字符', unitName: '请输入 1～128 个字符', unitType: '请选择组织类型', sortNo: '请输入 0～9999 之间的整数', status: '请选择当前状态', effectiveAt: '请选择有效的生效日期', expiresAt: '请选择有效的失效日期', remark: '备注最多 500 个字符' };
        throw new Error(parsed.error.issues.map(issue => { const field = String(issue.path[0]); return `${labels[field] ?? '表单'}：${/[\u4e00-\u9fff]/.test(issue.message) ? issue.message : hints[field] ?? '请检查输入'}`; }).join('\n'));
      }
      await onSave(parsed.data);
    });
  };
  return <div className="enterprise-modal-backdrop"><form className="enterprise-modal" role="dialog" aria-modal="true" aria-label={item ? '编辑组织' : '新增组织'} noValidate onSubmit={submit}>
    <header><h2>{item ? '编辑组织' : '新增组织'}</h2><button type="button" disabled={saving} onClick={onClose}>×</button></header>
    <div className="modal-body form-grid"><DialogSubmitError error={error} />
      <label>上级组织<select aria-label="上级组织" value={parentId ?? ''} onChange={(event) => setParentId(event.target.value)}><option value="">无（根组织）</option>{items.filter((candidate) => candidate.id !== item?.id).map((candidate) => <option key={candidate.id} value={candidate.id}>{'　'.repeat(candidate.depth)}{candidate.unitName}</option>)}</select></label>
      <label>组织类型<select value={unitType} onChange={(event) => setUnitType(event.target.value as OrganizationUnitWrite['unitType'])}>{Object.entries(TYPE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label>组织编码<input required maxLength={64} disabled={Boolean(item)} pattern={'[a-z][a-z0-9.\\-]*'} aria-describedby="organization-code-help" value={unitCode} onChange={(event) => setUnitCode(event.target.value)} /></label>
      <label>组织名称<input required maxLength={128} value={unitName} onChange={(event) => setUnitName(event.target.value)} /></label>
      <small id="organization-code-help" className="span-2">编码以小写字母开头，可含小写字母、数字、点和连字符，例如 sales-team。</small>
      <label>显示序号<input type="number" min="0" max="9999" step="1" value={sortNo} onChange={(event) => setSortNo(event.target.value)} /></label>
      <label>当前状态<select value={status} onChange={(event) => setStatus(event.target.value as OrganizationUnitWrite['status'])}><option value="ACTIVE">启用</option><option value="DISABLED">停用</option></select></label>
      <label>生效日期<input required type="date" value={effectiveAt} onChange={(event) => setEffectiveAt(event.target.value)} /></label>
      <label>失效日期<input type="date" min={effectiveAt} value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} /></label>
      <label className="span-2">备注<textarea maxLength={500} value={remark} onChange={(event) => setRemark(event.target.value)} /></label>
    </div><footer><button type="button" disabled={saving} onClick={onClose}>取消</button><button className="is-primary" disabled={saving}>{saving ? '保存中…' : '保存'}</button></footer>
  </form></div>;
}
