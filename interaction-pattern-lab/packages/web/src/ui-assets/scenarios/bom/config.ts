import type { LineCandidate, LineColumn, SummaryItem } from '../../components/editable-line-grid/EditableLineGrid';
import type { FieldSchema } from '../../components/schema-form/types';
import type { DocumentScenario } from '../../templates/master-detail-document/types';
import type { BomAdapter } from './adapter';

export interface BomHeader {
  assemblyName: string;
  revision: string;
  effectiveDate: string;
}

export interface BomLine {
  rowId: string;
  persistedState: 'draft' | 'persisted' | 'marked-for-deletion';
  itemName: string;
  materialCode: string;
  quantity: number;
  unit: string;
  hierarchyLevel: 1 | 2 | 3;
  differenceCue: '一致' | '替代候选待复核' | '数量差异';
}

export const bomTraceability = {
  directSourceRefs: ['REQSRC-029', 'REQSRC-030'],
  extractionRefs: ['UID-001'],
  assetRefs: ['EPM-PAGE-012', 'EPM-PAGE-013', 'EPM-ACT-043', 'EPM-ACT-044'],
  qaStatus: 'not-run',
} as const;

export const bomExtension = {
  budget: { maxDepth: 3, maxRows: 6 },
  hierarchyPreview: [
    { id: 'assembly', label: '精密传动装配', level: 1, differenceCue: '一致' },
    { id: 'drive', label: '传动子装配', level: 2, differenceCue: '替代候选待复核' },
    { id: 'screw', label: '滚珠丝杠副', level: 3, differenceCue: '一致' },
  ],
  candidateReview: { id: 'MAT-AX-07', label: '滚珠丝杠副' },
} as const;

const headerSchema: FieldSchema<BomHeader>[] = [
  { id: 'assemblyName', kind: 'text', label: '装配名称', groupId: 'definition', requiredWhen: { type: 'always', value: true } },
  { id: 'revision', kind: 'text', label: '版本', groupId: 'definition', requiredWhen: { type: 'always', value: true } },
  { id: 'effectiveDate', kind: 'date', label: '生效日期', groupId: 'definition', requiredWhen: { type: 'always', value: true } },
];

const lineColumns: LineColumn<BomLine>[] = [
  { id: 'itemName', label: '物料层级', editable: true, getValue: (line) => line.itemName, format: (value, line) => `${'　'.repeat(line.hierarchyLevel - 1)}${value}` },
  { id: 'materialCode', label: '物料编码', editable: true, getValue: (line) => line.materialCode },
  { id: 'quantity', label: '数量', editable: true, inputType: 'number', getValue: (line) => line.quantity },
  { id: 'unit', label: '单位', editable: true, getValue: (line) => line.unit },
  { id: 'differenceCue', label: '差异提示', editable: true, getValue: (line) => line.differenceCue, format: (value) => `差异：${value}` },
];

const candidates: LineCandidate<BomLine>[] = [{
  id: 'MAT-AX-07',
  label: 'MAT-AX-07 滚珠丝杠副',
  values: { itemName: '滚珠丝杠副', materialCode: 'MAT-AX-07', quantity: 1, unit: '件', hierarchyLevel: 3, differenceCue: '替代候选待复核' },
}];

export function createBomScenario(adapter: BomAdapter): DocumentScenario<BomHeader, BomLine> & { traceability: typeof bomTraceability; extension: typeof bomExtension } {
  return {
    scenarioId: 'bom-enterprise-assets',
    title: '装配清单复核',
    mode: 'edit',
    headerGroups: [{ id: 'definition', label: '装配定义' }],
    headerSchema,
    initialState: {
      header: { assemblyName: '精密传动装配', revision: 'R02', effectiveDate: '2026-09-05' },
      lines: [
        { rowId: 'bom-line-1', persistedState: 'persisted', itemName: '精密传动装配', materialCode: 'ASM-100', quantity: 1, unit: '套', hierarchyLevel: 1, differenceCue: '一致' },
        { rowId: 'bom-line-2', persistedState: 'persisted', itemName: '传动子装配', materialCode: 'SUB-210', quantity: 1, unit: '套', hierarchyLevel: 2, differenceCue: '替代候选待复核' },
        { rowId: 'bom-line-3', persistedState: 'persisted', itemName: '伺服驱动器', materialCode: 'MAT-DR-03', quantity: 1, unit: '台', hierarchyLevel: 3, differenceCue: '数量差异' },
        { rowId: 'bom-line-4', persistedState: 'persisted', itemName: '直线导轨', materialCode: 'MAT-GD-05', quantity: 2, unit: '件', hierarchyLevel: 3, differenceCue: '一致' },
      ],
      businessStatus: '草稿',
    },
    lineColumns,
    candidates,
    emptyLine: { itemName: '', materialCode: '', quantity: 1, unit: '件', hierarchyLevel: 3, differenceCue: '一致' },
    allocateLineId: adapter.allocateLineId,
    validate: () => ({ headerErrors: [], lineErrors: [] }),
    save: adapter.save,
    summary: summaryFor,
    relatedEntries: ['层级、候选匹配与差异提示是本场景扩展，不属于通用模板。', '所有候选与保存结果均为确定性内存演示，不会写入任何业务系统。'],
    traceability: bomTraceability,
    extension: bomExtension,
  };
}

function summaryFor(lines: BomLine[]): SummaryItem[] {
  const active = lines.filter((line) => line.persistedState !== 'marked-for-deletion');
  return [{ id: 'rows', label: '当前行数', value: `${active.length} / ${bomExtension.budget.maxRows}` }];
}
