import { createCsvBlob } from './csv-export';
export { csvCell, createCsvBlob } from './csv-export';

export async function loadAllGridRows<T>(load: (query: URLSearchParams) => Promise<{ items: T[]; pagination: { total: number } }>, query: URLSearchParams): Promise<T[]> {
  const rows: T[] = []; let expected: number | undefined;
  for (let page = 1; ; page++) {
    const params = new URLSearchParams(query); params.set('page', String(page)); params.set('pageSize', '100');
    const result = await load(params);
    const total = result.pagination?.total;
    if (!Number.isSafeInteger(total) || total < 0) throw new Error('导出分页总数无效，请重试');
    if (expected !== undefined && expected !== total) throw new Error('导出期间记录数量发生变化，请重试');
    expected = total;
    rows.push(...result.items);
    if (rows.length === expected) return rows;
    if (!result.items.length || rows.length > expected) throw new Error('导出结果不完整，请重试');
  }
}
export async function gridExport(format: 'csv' | 'xlsx', name: string, headers: string[], rows: unknown[][]): Promise<Blob> {
  if (format === 'csv') return createCsvBlob([headers, ...rows]);
  const { default: ExcelJS } = await import('exceljs');
  const book = new ExcelJS.Workbook(), sheet = book.addWorksheet(name.replace(/[\\/*?:[\]]/g, '').slice(0, 31) || '列表');
  sheet.addRow(headers); rows.forEach((row) => sheet.addRow(row));
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.getRow(1).font = { bold: true }; sheet.columns.forEach((column) => { column.width = 24; });
  const bytes = await book.xlsx.writeBuffer();
  return new Blob([new Uint8Array(bytes)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
