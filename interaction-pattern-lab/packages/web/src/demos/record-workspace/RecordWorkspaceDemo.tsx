import { useMemo, useState } from 'react';

interface DemoRecord {
  id: string;
  name: string;
  type: string;
  status: string;
  updatedAt: string;
}

type WorkspacePage = { id: string; label: string; kind: 'list' | 'create' | 'detail'; recordId?: string };

const demoRecords: DemoRecord[] = [
  { id: 'PAT-001', name: '示例记录 A', type: '标准对象', status: '启用', updatedAt: '预置时间 A' },
  { id: 'PAT-002', name: '示例记录 B', type: '协作对象', status: '草稿', updatedAt: '预置时间 B' },
  { id: 'PAT-003', name: '示例记录 C', type: '标准对象', status: '停用', updatedAt: '预置时间 C' },
];

export function RecordWorkspaceDemo() {
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [pages, setPages] = useState<WorkspacePage[]>([{ id: 'list', label: '记录列表', kind: 'list' }]);
  const [activePageId, setActivePageId] = useState('list');

  const filteredRecords = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('zh-CN');
    if (!normalized) return demoRecords;
    return demoRecords.filter((record) => `${record.id} ${record.name} ${record.type} ${record.status}`
      .toLocaleLowerCase('zh-CN').includes(normalized));
  }, [query]);

  const openPage = (page: WorkspacePage) => {
    setPages((current) => current.some((item) => item.id === page.id) ? current : [...current, page]);
    setActivePageId(page.id);
  };

  const closePage = (pageId: string) => {
    setPages((current) => {
      const index = current.findIndex((page) => page.id === pageId);
      const next = current.filter((page) => page.id !== pageId);
      if (activePageId === pageId) setActivePageId(next[Math.max(0, index - 1)]?.id ?? 'list');
      return next;
    });
  };

  const activePage = pages.find((page) => page.id === activePageId) ?? pages[0];
  const activeRecord = demoRecords.find((record) => record.id === activePage.recordId);

  return (
    <div className="demo-record-workspace">
      <div className="demo-record-tabs" role="tablist" aria-label="案例工作区页签">
        {pages.map((page) => (
          <div className={`demo-record-tab${page.id === activePageId ? ' is-active' : ''}`} key={page.id}>
            <button type="button" role="tab" aria-selected={page.id === activePageId} onClick={() => setActivePageId(page.id)}>{page.label}</button>
            {page.id !== 'list' && <button type="button" className="demo-tab-close" aria-label={`关闭页签 ${page.label}`} onClick={() => closePage(page.id)}>×</button>}
          </div>
        ))}
      </div>

      {activePage.kind === 'list' && (
        <section className="demo-record-page">
          <header className="demo-page-heading">
            <div><p className="demo-eyebrow">RECORD WORKSPACE</p><h2>记录列表</h2><p>去业务化数据，仅用于观察列表操作与页面身份。</p></div>
            <button className="demo-primary-button" type="button" onClick={() => openPage({ id: 'create', label: '新建记录', kind: 'create' })}>新建记录</button>
          </header>
          <form className="demo-query-panel" onSubmit={(event) => { event.preventDefault(); setQuery(input); }}>
            <label><span>关键词</span><input type="search" aria-label="查询示例记录" placeholder="编号、名称或状态" value={input} onChange={(event) => setInput(event.target.value)} /></label>
            <div className="demo-query-actions">
              <button className="demo-primary-button" type="submit">查询</button>
              <button type="button" onClick={() => { setInput(''); setQuery(''); }}>重置查询</button>
            </div>
          </form>
          <div className="demo-table-panel">
            <div className="demo-table-meta"><strong>记录</strong><span>共 {filteredRecords.length} 项</span></div>
            <div className="demo-table-scroll">
              <table>
                <thead><tr><th>编号</th><th>名称</th><th>类型</th><th>状态</th><th>更新时间</th><th>操作</th></tr></thead>
                <tbody>
                  {filteredRecords.map((record) => (
                    <tr key={record.id}>
                      <td><code>{record.id}</code></td><td>{record.name}</td><td>{record.type}</td><td><span className={`demo-status is-${record.status}`}>{record.status}</span></td><td>{record.updatedAt}</td>
                      <td><button className="demo-text-button" type="button" aria-label={`查看 ${record.name}`} onClick={() => openPage({ id: `detail-${record.id}`, label: record.name, kind: 'detail', recordId: record.id })}>查看</button></td>
                    </tr>
                  ))}
                  {filteredRecords.length === 0 && <tr><td className="demo-table-empty" colSpan={6}>没有匹配的示例记录，请重置查询。</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {activePage.kind === 'create' && (
        <section className="demo-record-page">
          <header className="demo-page-heading"><div><p className="demo-eyebrow">CREATE STATE</p><h2>新建记录</h2><p>表单仅演示结构，不保存或提交数据。</p></div></header>
          <div className="demo-form-panel">
            <h3>基本信息</h3>
            <div className="demo-form-grid">
              <label><span>记录名称</span><input placeholder="输入用于当前 Demo 的名称" /></label>
              <label><span>记录类型</span><select defaultValue=""><option value="" disabled>请选择</option><option>标准对象</option><option>协作对象</option></select></label>
              <label className="is-wide"><span>说明</span><textarea rows={4} placeholder="仅保留在当前页面生命周期" /></label>
            </div>
            <div className="demo-safe-note" role="note">此 Demo 不接入保存接口，关闭或重置后输入会被清除。</div>
          </div>
        </section>
      )}

      {activePage.kind === 'detail' && activeRecord && (
        <section className="demo-record-page">
          <header className="demo-page-heading"><div><p className="demo-eyebrow">DETAIL STATE · {activeRecord.id}</p><h2>{activeRecord.name}</h2><p>列表、详情使用一致的字段语言。</p></div><span className={`demo-status is-${activeRecord.status}`}>{activeRecord.status}</span></header>
          <div className="demo-detail-panel">
            <h3>基本信息</h3>
            <dl><div><dt>记录编号</dt><dd><code>{activeRecord.id}</code></dd></div><div><dt>记录类型</dt><dd>{activeRecord.type}</dd></div><div><dt>当前状态</dt><dd>{activeRecord.status}</dd></div><div><dt>更新时间</dt><dd>{activeRecord.updatedAt}</dd></div></dl>
          </div>
        </section>
      )}
    </div>
  );
}
