export function formatInboundNumber(businessDate: string, sequence: number): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(businessDate)) throw new Error('业务日期格式错误');
  if (!Number.isInteger(sequence) || sequence < 1 || sequence > 99999) throw new Error('单据日流水必须在1到99999之间');
  return `RK${businessDate.replaceAll('-', '')}${String(sequence).padStart(5, '0')}`;
}

export function activeItemSetIsComplete(activeItemCount: number, itemCodes: string[]): boolean {
  return activeItemCount === new Set(itemCodes).size;
}

export function postingLineError(line: {
  batchManaged: boolean; batchNo: string; originalQty: string | null; actualQty: string; amount: string; reasonCode: string; remark: string | null;
}): string | null {
  if (line.batchManaged && !line.batchNo) return '批次管理物项必须填写批次';
  if (!line.batchManaged && line.batchNo) return '非批次管理物项不能填写批次';
  if (Number(line.actualQty) <= 0) return '实际入库数量必须大于零';
  if (Number(line.amount) < 0) return '入库金额不能小于零';
  if (line.originalQty !== null && Number(line.originalQty) !== Number(line.actualQty) && !line.reasonCode && !line.remark) return '原单数量与实际数量存在差异时必须填写原因或行备注';
  if (Number(line.amount) === 0 && !line.reasonCode && !line.remark) return '零金额入库必须填写原因或行备注';
  return null;
}
