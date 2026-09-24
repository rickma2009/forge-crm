from pathlib import Path
p=Path('packages/web/src/showcase/EnterprisePages.tsx');s=p.read_text();s="import { useTreeNodeMenu, type TreeNodeAction } from '../common/useTreeNodeMenu';\n"+s
s=s.replace("views.find((view) => view.viewKey === selectedKey) ?? views[0]", "views.find((view) => view.viewKey === selectedKey)").replace("resolved.views.find((view) => view.viewKey === resolved.selectedViewKey) ?? resolved.views[0]", "resolved.views.find((view) => view.viewKey === resolved.selectedViewKey)")
s=s.replace("const [settingsOpen, setSettingsOpen] = useState(false);", "const [settingsOpen, setSettingsOpen] = useState(false);\n  const [viewNotice, setViewNotice] = useState('');")
s=s.replace("setViews(resolved.views); setSelectedKey", "setViewNotice(resolved.fallbackNotice ?? ''); setViews(resolved.views); setSelectedKey")
s=s.replace("} catch (reason) { setError(notice(reason)); }\n  };\n  useEffect(() => { void loadSetup();", "} catch (reason) { setViews([]); setSelectedKey(''); setCustomers([]); setTotal(0); setError(notice(reason)); }\n  };\n  useEffect(() => { void loadSetup();")
a=s.index('  const changeView = async');b=s.index('  const renderFilter',a)
s=s[:a]+'''  const changeView = async (key: string) => {
    try {
      await gateway.selectListView(systemCode, key);
      setSelectedKey(key); setPage(1); setViewNotice('');
      const next = views.find((view) => view.viewKey === key);
      const defaults = Object.fromEntries(Object.entries(next?.config.filters ?? {}).map(([field, value]) => [field, Array.isArray(value) ? value[0] ?? '' : value]));
      setKeyword(''); setAppliedKeyword(''); setFilters(defaults); setAppliedFilters(defaults); setQueryExpanded(false);
    } catch (reason) { setError(notice(reason)); }
  };
'''+s[b:]
s=s.replace('<section className="enterprise-card table-card"><div className="table-toolbar customer-list-toolbar"><button', '{viewNotice && <p role="status">{viewNotice}</p>}<section className="enterprise-card table-card"><div className="table-toolbar customer-list-toolbar"><button',1)
s=s.replace('<button type="button" onClick={() => setSettingsOpen(true)}>', '<button type="button" disabled={!selected?.allowPersonalOverride} onClick={() => setSettingsOpen(true)}>')
s=s.replace('<th className="operation-column">操作</th>{visibleColumns', "{allowedActions.includes('update') && <th className=\"operation-column\">操作</th>}{visibleColumns",1)
s=s.replace('colSpan={visibleColumns.length + 2}', "colSpan={visibleColumns.length + (allowedActions.includes('update') ? 2 : 1)}")
a=s.index('<td className="operation-column"><button type="button" aria-label={`查看客户');b=s.index('{visibleColumns.map',a)
s=s[:a]+'''{allowedActions.includes('update') && <td className="operation-column"><RowActionButton label="修改" aria-label={`修改客户 ${customer.customerCode}`} onClick={() => openCustomer(customer, 'edit')} /></td>}'''+s[b:]
s=s.replace('viewName: name, isDefault: false', 'viewName: name, isDefault: true')
s=s.replace('checked={column.visible} onChange=', "checked={column.visible} disabled={column.key === 'customerCode'} onChange=")
s=s.replace('另存为个人视图</button>', '保存并使用个人视图</button>')
# Tree: a real row containing separate expand, selection and action controls.
a=s.index('export function DictionaryAdminPage');s=s[:a]+s[a:].replace("  const [items, setItems]", "  const nodeMenu = useTreeNodeMenu();\n  const [newParentId, setNewParentId] = useState<string | null>(null);\n  const [items, setItems]",1)
a=s.index('  return <div className="enterprise-page dictionary-page"')
s=s[:a]+'''  const nodeActions = (dictionary: Dictionary): TreeNodeAction[] => !canManage ? [] : [
    { key: 'create', label: '新建字典类别', run: () => { setNewParentId(dictionary.parentId); setTypeEditor('new'); } },
    { key: 'child', label: '新增子节点', run: () => { setNewParentId(dictionary.id); setTypeEditor('new'); } },
    { key: 'edit', label: '编辑', run: () => setTypeEditor(dictionary) },
    { key: 'status', label: dictionary.status === 'ACTIVE' ? '停用' : '启用', run: () => void toggleDictionary(dictionary) },
  ];
'''+s[a:]
a=s.index('<nav aria-label="数据字典列表">');b=s.index('</nav>',a)+6
s=s[:a]+'''<nav aria-label="数据字典列表">{treeRows.map(({ dictionary, depth, hasChildren }) => <div key={dictionary.id} className="dictionary-tree-row" aria-current={dictionary.id === selectedId} style={{ '--dictionary-depth': depth } as React.CSSProperties} onContextMenu={(event) => nodeMenu.open(event, dictionary.dictName, nodeActions(dictionary))}>
<button type="button" className="dictionary-tree-toggle" aria-label={`${collapsed.has(dictionary.id) ? '展开' : '收起'} ${dictionary.dictName}`} disabled={!hasChildren} onClick={() => setCollapsed((current) => { const next = new Set(current); if (next.has(dictionary.id)) next.delete(dictionary.id); else next.add(dictionary.id); return next; })}>{hasChildren ? (collapsed.has(dictionary.id) ? '›' : '⌄') : '·'}</button>
<button type="button" className="dictionary-tree-select" onClick={() => setSelectedId(dictionary.id)}><span className="dictionary-tree-icon">{hasChildren ? 'G' : 'D'}</span><span className="dictionary-tree-label"><strong>{dictionary.dictName}</strong></span><i className={dictionary.status === 'ACTIVE' ? 'is-active' : ''}>{dictionary.status === 'ACTIVE' ? '启用' : '停用'}</i></button>{nodeMenu.button(dictionary.dictName, nodeActions(dictionary))}</div>)}</nav>'''+s[b:]
s=s.replace("onClick={() => setTypeEditor('new')}", "onClick={() => { setNewParentId(null); setTypeEditor('new'); }}")
s=s.replace('{typeEditor && <DictionaryTypeModal dictionaries={items}', '{nodeMenu.menu}{typeEditor && <DictionaryTypeModal initialParentId={newParentId} dictionaries={items}')
s=s.replace('function DictionaryTypeModal({ dictionaries, editing, onClose, onSave }: { dictionaries:', "function DictionaryTypeModal({ dictionaries, editing, initialParentId, onClose, onSave }: { initialParentId?: string | null; dictionaries:")
s=s.replace("useState(isEdit && editing.parentId ? editing.parentId : '')", "useState(isEdit ? editing.parentId ?? '' : initialParentId ?? '')")
s=s.replace('<button type="button" disabled={!canMaintainSelected} onClick={() => void toggle(item)}>{item.status === \'ACTIVE\' ? \'停用\' : \'启用\'}</button>', '<RowActionButton type="button" disabled={!canMaintainSelected} onClick={() => void toggle(item)} label={item.status === \'ACTIVE\' ? \'停用\' : \'启用\'} />')
p.write_text(s)
# Employee: identity opens readonly, edit remains an icon.
p=Path('packages/web/src/showcase/EmployeeDirectoryPage.tsx');s=p.read_text();s="import { RowActionButton } from '../common/RowActionButton';\n"+s;s=s.replace("const edit = async (item: Employee) =>", "const [viewOnly, setViewOnly] = useState(false);\n  const edit = async (item: Employee, readonly = false) =>").replace("{ if (!canManage) { setEditing", "{ setViewOnly(readonly || !canManage); if (!canManage) { setEditing")
s=s.replace('<th className="operation-column">操作</th>', '{canManage && <th className="operation-column">操作</th>}')
a=s.index('<td className="operation-column">');b=s.index('<td>{item.employeeName}',a)
s=s[:a]+'''{canManage && <td className="operation-column"><RowActionButton label="编辑" aria-label={`编辑员工 ${item.employeeName}`} onClick={() => void edit(item)} /></td>}<td><button type="button" className="customer-code-link" onClick={() => void edit(item, true)}>{item.employeeNo}</button></td>'''+s[b:]
s=s.replace('colSpan={12}', 'colSpan={canManage ? 12 : 11}').replace('readOnly={!canManage}', "readOnly={editing !== 'create' && (!canManage || viewOnly)}")
p.write_text(s)
