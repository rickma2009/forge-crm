import { describe, expect, it, vi } from 'vitest';
import { createCsvBlob, csvCell, gridExport, loadAllGridRows } from './grid-export';
import ExcelJS from 'exceljs';
describe('grid export', () => {
  it.each([-1, 1.5, NaN, Infinity, undefined, null, '2'])('rejects invalid total %s before requesting another page', async total => {
    const load = vi.fn()
      .mockResolvedValueOnce({ items: [1], pagination: { total } })
      .mockRejectedValueOnce(new Error('Unexpected second page request'));
    await expect(loadAllGridRows(load, new URLSearchParams())).rejects.toThrow('导出分页总数无效');
    expect(load).toHaveBeenCalledOnce();
  });
  it('accepts a valid empty result without another request and leaves caller filters unchanged', async () => {
    const query = new URLSearchParams({ keyword: '不存在', page: '9', pageSize: '20' });
    const load = vi.fn(async () => ({ items: [], pagination: { total: 0 } }));
    expect(await loadAllGridRows(load, query)).toEqual([]);
    expect(load).toHaveBeenCalledOnce();
    expect(query.toString()).toBe('keyword=%E4%B8%8D%E5%AD%98%E5%9C%A8&page=9&pageSize=20');
  });
  it('shares UTF-8 BOM, CSV quoting and text prefix encoding without changing source values', async () => {
    const rows = [['名称', '内容'], ['中文,"引号"\n下一行', '\t=1+1'], [null, '\r=2+2'], [undefined, '=1+1'], ['普通文本', '800.00']];
    const before = JSON.stringify(rows);
    const bytes = (blob: Blob) => new Promise<ArrayBuffer>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result as ArrayBuffer); reader.onerror = reject; reader.readAsArrayBuffer(blob); });
    const direct = new Uint8Array(await bytes(createCsvBlob(rows)));
    const viaGrid = new Uint8Array(await bytes(await gridExport('csv', '测试', rows[0] as string[], rows.slice(1))));
    expect(direct).toEqual(viaGrid);
    expect([...direct.slice(0, 3)]).toEqual([239, 187, 191]);
    const text = new TextDecoder().decode(direct);
    expect(text).toContain('"中文,""引号""\n下一行","\'\t=1+1"\r\n');
    expect(text).toContain('"","\'\r=2+2"');
    expect(text).toContain('"普通文本","800.00"');
    expect(JSON.stringify(rows)).toBe(before);
  });
  it('collects every filtered server page with the same query and sort', async () => {
    const load = vi.fn(async (params: URLSearchParams) => ({ items: params.get('page') === '1' ? [1, 2] : [3], pagination: { total: 3 } }));
    expect(await loadAllGridRows(load, new URLSearchParams({ keyword: '板卡', orderBy: 'itemCode', order: 'asc', columnFilters: '{"status":"ACTIVE"}' }))).toEqual([1, 2, 3]);
    expect(load.mock.calls.every(([query]) => query.get('keyword') === '板卡' && query.get('columnFilters') === '{"status":"ACTIVE"}' && query.get('orderBy') === 'itemCode' && query.get('pageSize') === '100')).toBe(true);
  });
  it('never presents a partial export as successful', async () => {
    const load = vi.fn().mockResolvedValueOnce({ items: [1], pagination: { total: 2 } }).mockResolvedValueOnce({ items: [], pagination: { total: 2 } });
    await expect(loadAllGridRows(load, new URLSearchParams())).rejects.toThrow('不完整');
  });
  it('escapes CSV and keeps formula-like XLSX input as text', async () => {
    expect(csvCell('=1+1')).toBe('"\'=1+1"'); expect(csvCell('a"b')).toBe('"a""b"');
    const blob = await gridExport('xlsx', '客户', ['名称'], [['=1+1']]);
    const bytes = await new Promise<ArrayBuffer>((resolve) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result as ArrayBuffer); reader.readAsArrayBuffer(blob); });
    const book = new ExcelJS.Workbook(); await book.xlsx.load(bytes); expect(book.getWorksheet(1)?.getCell('A2').value).toBe('=1+1');
  });
});
