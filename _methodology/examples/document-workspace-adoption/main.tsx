import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { DocumentWorkspace } from './DocumentWorkspace';
import './host.css';

type Row = { id: number; name: string; quantity: number };
const initial = { note: '合成演练，不生成库存流水', rows: [{ id: 1, name: '示例耗材', quantity: 2 }] as Row[] };
function Demo() {
  const [status, setStatus] = useState('DRAFT'), [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(initial), [draft, setDraft] = useState(initial);
  const [nextId, setNextId] = useState(2), [notice, setNotice] = useState('未触发操作');
  const data = editing ? draft : saved;
  const canEdit = status === 'DRAFT';
  return <main><h1>单据容器独立接入</h1>
    <p>仅演示布局及宿主状态；无库存、审批接口或真实保存。</p>
    <label>演练状态<select disabled={editing} value={status} onChange={event => setStatus(event.target.value)}><option value="DRAFT">草稿</option><option value="SUBMITTED">已提交审核</option><option value="POSTED">已审核</option></select></label>
    <DocumentWorkspace title="DEMO-001" backLabel="返回领用列表" onBack={() => setNotice('返回回调：宿主负责离开保护')}
      fields={[{ label: '法人', value: '示例组织' }, { label: '状态', value: status === 'DRAFT' ? '草稿' : status === 'SUBMITTED' ? '已提交审核' : '已审核' }]}
      actions={editing ? <><button onClick={() => { setEditing(false); setNotice('已取消，本地草稿未保存'); }}>取消</button><button onClick={() => { setSaved(draft); setEditing(false); setNotice('已保存到本次页面内存'); }}>保存</button></> : <button disabled={!canEdit} onClick={() => { setDraft({ ...saved, rows: saved.rows.map(row => ({ ...row })) }); setEditing(true); }}>编辑</button>}>
      <div className="document-fields demo-fields"><label>单号<input value="DEMO-001" readOnly /></label><label>备注<input value={data.note} readOnly={!editing} onChange={event => setDraft({ ...draft, note: event.target.value })} /></label></div>
      <section aria-labelledby="line-title"><div className="demo-heading"><h2 id="line-title">领用明细</h2>{editing && <button onClick={() => { setDraft({ ...draft, rows: [...draft.rows, { id: nextId, name: `示例耗材 ${nextId}`, quantity: 1 }] }); setNextId(nextId + 1); }}>新增行</button>}</div>
        <div className="demo-grid-scroll" role="region" aria-label="领用明细表格" tabIndex={0}><table className="document-grid"><thead><tr><th>行号</th><th>物料名称</th><th>数量</th>{editing && <th>操作</th>}</tr></thead><tbody>{data.rows.map((row, index) => <tr key={row.id}><td>{index + 1}</td><td>{row.name}</td><td>{editing ? <input aria-label={`第 ${index + 1} 行数量`} type="number" min="1" step="1" value={row.quantity} onChange={event => { const quantity = Number(event.target.value); if (Number.isSafeInteger(quantity) && quantity > 0) setDraft({ ...draft, rows: draft.rows.map(item => item.id === row.id ? { ...item, quantity } : item) }); }} /> : row.quantity}</td>{editing && <td className="document-line-actions"><button aria-label={`删除第 ${index + 1} 行`} title="删除行" onClick={() => setDraft({ ...draft, rows: draft.rows.filter(item => item.id !== row.id) })}>×</button></td>}</tr>)}</tbody></table></div>
      </section>
    </DocumentWorkspace><output aria-live="polite">{notice}</output>
  </main>;
}
createRoot(document.getElementById('root')!).render(<Demo />);
