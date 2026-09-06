import type { LineCandidate, LineColumn, SummaryItem } from '../../components/editable-line-grid/EditableLineGrid';
import type { FieldSchema } from '../../components/schema-form/types';
import type { DocumentScenario } from '../../templates/master-detail-document/types';
import type { SalesOrderAdapter } from './adapter';

export type SalesOrderSimulation = 'success' | 'validation' | 'rejected' | 'partial' | 'pending-success';

export interface SalesOrderHeader {
  customer: string;
  orderDate: string;
  currency: string;
  priceList: string;
  settlementTerms: string;
  shippingAddress: string;
  saveMode: 'draft' | 'submit';
  simulatedOutcome: SalesOrderSimulation;
}

export interface SalesOrderLine {
  rowId: string;
  persistedState: 'draft' | 'persisted' | 'marked-for-deletion';
  productName: string;
  productCode: string;
  quantity: number;
  unitPriceMinorUnits: number;
  taxRate: number;
  requestedDeliveryDate: string;
  warehouse: string;
}

export const salesOrderTraceability = {
  directSourceRefs: ['REQSRC-029', 'REQSRC-030'],
  assetRefs: ['UID-001', 'EPM-PAGE-012', 'EPM-PAGE-013', 'EPM-ACT-010', 'EPM-ACT-011', 'EPM-ACT-012', 'EPM-ACT-013'],
  qaStatus: 'recorded',
  qaRef: '.specify/specs/010-master-detail-document-assets/implementation-evidence.md',
} as const;

const headerSchema: FieldSchema<SalesOrderHeader>[] = [
  { id: 'customer', kind: 'text', label: '客户', groupId: 'general', requiredWhen: { type: 'always', value: true } },
  { id: 'orderDate', kind: 'date', label: '订单日期', groupId: 'general', requiredWhen: { type: 'always', value: true } },
  { id: 'currency', kind: 'select', label: '币种', groupId: 'general', options: [{ value: 'CNY', label: 'CNY 人民币' }, { value: 'USD', label: 'USD 美元' }] },
  { id: 'priceList', kind: 'select', label: '价格表', groupId: 'commercial', options: [{ value: 'standard-2026', label: '标准价目表（2026）' }] },
  { id: 'settlementTerms', kind: 'select', label: '结算条款', groupId: 'commercial', options: [{ value: 'monthly-30', label: '月结30天' }, { value: 'prepay', label: '款到发货' }] },
  { id: 'shippingAddress', kind: 'text', label: '发货地址', groupId: 'commercial', requiredWhen: { type: 'always', value: true } },
  { id: 'saveMode', kind: 'select', label: '保存方式', groupId: 'simulation', options: [{ value: 'draft', label: '暂存草稿' }, { value: 'submit', label: '保存并提交' }] },
  { id: 'simulatedOutcome', kind: 'select', label: '模拟结果', groupId: 'simulation', options: [{ value: 'success', label: '成功' }, { value: 'validation', label: '校验失败' }, { value: 'rejected', label: '业务拒绝' }, { value: 'partial', label: '部分成功' }] },
];

const lineColumns: LineColumn<SalesOrderLine>[] = [
  { id: 'productName', label: '产品', editable: true, getValue: (line) => line.productName },
  { id: 'productCode', label: '产品编码', editable: true, getValue: (line) => line.productCode },
  { id: 'quantity', label: '数量', editable: true, inputType: 'number', getValue: (line) => line.quantity },
  { id: 'unitPriceMinorUnits', label: '含税单价', editable: true, inputType: 'number', getValue: (line) => line.unitPriceMinorUnits, format: (value) => money(Number(value)) },
  { id: 'taxRate', label: '税率', editable: true, inputType: 'number', getValue: (line) => line.taxRate, format: (value) => `${value}%` },
  { id: 'requestedDeliveryDate', label: '要求交付日期', editable: true, inputType: 'date', getValue: (line) => line.requestedDeliveryDate },
  { id: 'warehouse', label: '仓库', editable: true, getValue: (line) => line.warehouse },
];

const candidates: LineCandidate<SalesOrderLine>[] = [{
  id: 'PRD-5001', label: 'PRD-5001 滚珠丝杠副',
  values: { productName: '滚珠丝杠副', productCode: 'PRD-5001', quantity: 1, unitPriceMinorUnits: 236000, taxRate: 13, requestedDeliveryDate: '2026-09-20', warehouse: '广州成品仓' },
}];

export function createSalesOrderScenario(adapter: SalesOrderAdapter): DocumentScenario<SalesOrderHeader, SalesOrderLine> & { candidates: LineCandidate<SalesOrderLine>[]; traceability: typeof salesOrderTraceability } {
  return {
    scenarioId: 'sales-order-enterprise-assets',
    title: '新建销售订单',
    mode: 'edit',
    headerGroups: [{ id: 'general', label: '订单基本信息' }, { id: 'commercial', label: '商务信息' }, { id: 'simulation', label: '模拟保存控制' }],
    headerSchema,
    initialState: {
      header: { customer: '广州精工设备有限公司', orderDate: '2026-09-05', currency: 'CNY', priceList: 'standard-2026', settlementTerms: 'monthly-30', shippingAddress: '广东省广州市番禺区南村镇万博二路79号', saveMode: 'draft', simulatedOutcome: 'success' },
      lines: [
        { rowId: 'sales-line-1', persistedState: 'persisted', productName: '精密主轴组件', productCode: 'PRD-1001', quantity: 2, unitPriceMinorUnits: 2850000, taxRate: 13, requestedDeliveryDate: '2026-09-20', warehouse: '广州成品仓' },
        { rowId: 'sales-line-2', persistedState: 'persisted', productName: '伺服驱动器', productCode: 'PRD-2003', quantity: 4, unitPriceMinorUnits: 820000, taxRate: 13, requestedDeliveryDate: '2026-09-18', warehouse: '广州成品仓' },
        { rowId: 'sales-line-3', persistedState: 'persisted', productName: '直线导轨', productCode: 'PRD-3005', quantity: 10, unitPriceMinorUnits: 128000, taxRate: 13, requestedDeliveryDate: '2026-09-15', warehouse: '广州成品仓' },
        { rowId: 'sales-line-4', persistedState: 'persisted', productName: '气动夹爪', productCode: 'PRD-4002', quantity: 6, unitPriceMinorUnits: 175000, taxRate: 13, requestedDeliveryDate: '2026-09-20', warehouse: '广州成品仓' },
      ],
      businessStatus: '草稿',
    },
    lineColumns,
    emptyLine: { productName: '', productCode: '', quantity: 1, unitPriceMinorUnits: 0, taxRate: 13, requestedDeliveryDate: '2026-09-20', warehouse: '广州成品仓' },
    allocateLineId: adapter.allocateLineId,
    validate: ({ header }) => ({
      headerErrors: header.customer.trim()
        ? []
        : [{ id: 'sales-order-customer-required', fieldId: 'customer', message: '客户不能为空。' }],
      lineErrors: [],
    }),
    save: adapter.save,
    summary: (lines) => summaryFor(lines),
    relatedEntries: ['来源：REQSRC-029、REQSRC-030；资产：UID-001、EPM-PAGE-012、EPM-PAGE-013。', '所有结果为确定性模拟，不会写入订单、库存、价格、BOM 或审批系统。'],
    candidates,
    traceability: salesOrderTraceability,
  };
}

function summaryFor(lines: SalesOrderLine[]): SummaryItem[] {
  const active = lines.filter((line) => line.persistedState !== 'marked-for-deletion');
  const subtotal = active.reduce((total, line) => total + line.quantity * line.unitPriceMinorUnits, 0);
  const tax = active.reduce((total, line) => total + Math.trunc(line.quantity * line.unitPriceMinorUnits * line.taxRate / 100), 0);
  return [{ id: 'subtotal', label: '未税金额', value: money(subtotal) }, { id: 'tax', label: '税额', value: money(tax) }, { id: 'total', label: '含税合计', value: money(subtotal + tax) }];
}

function money(minorUnits: number) {
  return `¥${(minorUnits / 100).toLocaleString('zh-CN', { maximumFractionDigits: 2 })}`;
}
