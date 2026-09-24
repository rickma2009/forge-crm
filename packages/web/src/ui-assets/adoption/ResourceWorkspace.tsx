import { useState } from 'react';
import { NavigationShellDemo, type DemoGroup } from '../../demos/navigation-shell/NavigationShellDemo';
import { RecordWorkspaceDemo, type DemoRecord } from '../../demos/record-workspace/RecordWorkspaceDemo';
import { MasterDetailDocument } from '../templates/master-detail-document/MasterDetailDocument';
import type { DocumentScenario } from '../templates/master-detail-document/types';
import type { LineRecord } from '../components/editable-line-grid/types';
import './adoption.css';

interface Header { name: string }
interface ResourceLine extends LineRecord { label: string; quantity: number }
interface Resource extends DemoRecord { lines: ResourceLine[] }
const menu: DemoGroup[] = [{ id: 'resources', label: '资源管理', marker: 'R', children: [{ id: 'records', label: '资源目录', marker: 'L' }] }];
const initial: Resource[] = [
  { id: 'RES-001', name: '演练资源 A', type: '资源组合', status: '草稿', updatedAt: '初始版本', lines: [{ rowId: 'RES-001-1', persistedState: 'persisted', label: '资源明细 A', quantity: 1 }] },
  { id: 'RES-002', name: '演练资源 B', type: '资源组合', status: '草稿', updatedAt: '初始版本', lines: [] },
];

function scenarioFor(resource: Resource, saveResource: (resource: Resource) => void): DocumentScenario<Header, ResourceLine> {
  let sequence = 0;
  return {
    scenarioId: resource.id, title: `编辑 ${resource.id}`, mode: 'edit',
    presentation: { notice: '仅保存在当前演练页面；刷新恢复初始数据。', saveLabel: '保存资源', saveFailure: '保存未完成，请保留输入后重试。', outcomeLabel: '资源保存结果', outcomePrefix: '本地保存完成' },
    initialState: { header: { name: resource.name }, lines: resource.lines, businessStatus: resource.status },
    headerGroups: [{ id: 'basic', label: '资源信息' }],
    headerSchema: [{ id: 'name', label: '资源名称', kind: 'text', groupId: 'basic', requiredWhen: { type: 'always', value: true } }],
    lineColumns: [
      { id: 'label', label: '明细名称', editable: true, getValue: line => line.label },
      { id: 'quantity', label: '数量', editable: true, inputType: 'number', getValue: line => line.quantity },
    ],
    emptyLine: { label: '新资源明细', quantity: 1 },
    allocateLineId: () => {
      let id: string;
      do { id = `${resource.id}-new-${++sequence}`; } while (resource.lines.some(line => line.rowId === id));
      return id;
    },
    validate: ({ header, lines }) => ({
      headerErrors: header.name.trim() ? [] : [{ id: 'required-name', fieldId: 'name', message: '资源名称不能为空。' }],
      lineErrors: lines.rows.filter(line => line.persistedState !== 'marked-for-deletion' && (!line.label.trim() || !Number.isFinite(line.quantity) || line.quantity <= 0)).map(line => ({ id: `invalid-${line.rowId}`, rowId: line.rowId, fieldId: !line.label.trim() ? 'label' : 'quantity', message: '名称不能为空，数量须大于零。' })),
    }),
    save: async ({ header, lines }) => {
      saveResource({ ...resource, name: header.name.trim(), updatedAt: '本次会话已更新', lines: lines.filter(line => line.persistedState !== 'marked-for-deletion').map(line => ({ ...line, persistedState: 'persisted' })) });
      return { kind: 'success', message: '返回详情即可查看本次修改。' };
    },
    summary: lines => [{ id: 'count', label: '有效明细', value: String(lines.filter(line => line.persistedState !== 'marked-for-deletion').length) }],
    relatedEntries: ['资源字段与校验仅用于演练，不作为行业业务规范。'],
  };
}

export function ResourceWorkspace() {
  const [resources, setResources] = useState<Resource[]>(initial);
  const [editor, setEditor] = useState<DocumentScenario<Header, ResourceLine> | null>(null);
  const saveResource = (resource: Resource) => setResources(current => current.map(item => item.id === resource.id ? resource : item));
  return <div className="adoption-app">
    <NavigationShellDemo title="资源应用示范" groups={menu} activeId="records" showOverview={false}>
      <p className="adoption-notice">源码模板接入示范 · 会话内合成数据</p>
      <div hidden={editor !== null}>
        <RecordWorkspaceDemo records={resources} allowCreate={false}
          columns={[{ id: 'id', label: '资源编号', render: record => record.id }, { id: 'name', label: '资源名称', render: record => record.name }, { id: 'version', label: '更新状态', render: record => record.updatedAt }]}
          renderDetail={record => <>
            <p>明细数量：{resources.find(item => item.id === record.id)?.lines.length ?? 0}</p>
            <button type="button" onClick={() => { const resource = resources.find(item => item.id === record.id); if (resource) setEditor(scenarioFor(resource, saveResource)); }}>编辑资源</button>
          </>}
        />
      </div>
      {editor && <MasterDetailDocument key={editor.scenarioId} scenario={editor} onLeave={() => setEditor(null)} />}
    </NavigationShellDemo>
  </div>;
}
