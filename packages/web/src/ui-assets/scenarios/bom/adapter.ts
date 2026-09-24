import type { DocumentSaveCommand, DocumentSaveOutcome } from '../../templates/master-detail-document/types';
import type { BomHeader, BomLine } from './config';

export interface BomAdapter {
  allocateLineId: () => string;
  save: (command: DocumentSaveCommand<BomHeader, BomLine>) => Promise<DocumentSaveOutcome<BomHeader>>;
}

export function createBomAdapter(): BomAdapter {
  let nextLineId = 1;
  return {
    allocateLineId: () => `bom-draft-${nextLineId++}`,
    save: async () => ({ kind: 'success', message: '装配清单已暂存（模拟）。', nextStatus: '草稿' }),
  };
}
