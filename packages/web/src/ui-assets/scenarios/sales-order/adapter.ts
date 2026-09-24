export {};
import type { DocumentSaveCommand, DocumentSaveOutcome } from '../../templates/master-detail-document/types';
import type { SalesOrderHeader, SalesOrderLine, SalesOrderSimulation } from './config';

export interface SalesOrderAdapter {
  allocateLineId: () => string;
  save: (command: DocumentSaveCommand<SalesOrderHeader, SalesOrderLine>) => Promise<DocumentSaveOutcome<SalesOrderHeader>>;
}

export function createSalesOrderAdapter(initialSimulation?: SalesOrderSimulation): SalesOrderAdapter {
  let nextLineId = 1;
  return {
    allocateLineId: () => `sales-order-draft-${nextLineId++}`,
    save: async (command) => {
      const simulation = initialSimulation ?? command.header.simulatedOutcome;
      if (simulation === 'pending-success') return new Promise<DocumentSaveOutcome<SalesOrderHeader>>(() => undefined);
      if (simulation === 'validation' && !command.header.customer.trim()) return {
        kind: 'validation-failed',
        headerErrors: [{ id: 'sales-order-customer-required', fieldId: 'customer', message: '客户不能为空。' }],
        lineErrors: [],
      };
      if (simulation === 'rejected') return { kind: 'business-rejected', reason: '模拟信用额度不足。' };
      if (simulation === 'partial') return {
        kind: 'partial-success', total: 3, succeeded: 2,
        failed: [{ id: 'line-3', reason: '模拟库存不足。' }], unprocessed: 0,
      };
      return command.header.saveMode === 'submit'
        ? { kind: 'success', message: '订单已保存并提交（模拟）。', nextStatus: '已提交' }
        : { kind: 'success', message: '草稿已暂存（模拟）。', nextStatus: '草稿' };
    },
  };
}
