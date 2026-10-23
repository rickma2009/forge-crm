import ExcelJS from 'exceljs';

export type CommodityBar = { date: string; open: number | null; high: number | null; low: number | null; close: number; sourceRow: Record<string, unknown> };
export type FxRate = { date: string; rate: number };

function numeric(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const result = Number(value);
  return Number.isFinite(result) ? result : null;
}

function text(value: ExcelJS.CellValue): string {
  if (value && typeof value === 'object' && 'text' in value) return String(value.text ?? '').trim();
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value ?? '').trim();
}

export async function parseWorldBankMonthlyWorkbook(bytes: Buffer): Promise<Map<string, CommodityBar[]>> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(bytes);
  const sheet = workbook.getWorksheet('Monthly Prices');
  if (!sheet) throw new Error('世界银行工作簿缺少 Monthly Prices 工作表');

  const names = { COPPER: /\bcopper\b/i, ALUMINUM: /\baluminum\b/i, GOLD: /\bgold\b/i, SILVER: /\bsilver\b/i };
  const columns: Record<string, number> = {};
  let headerRow = 0;
  let bestMatches = 0;
  for (let rowNo = 1; rowNo <= Math.min(sheet.rowCount, 12); rowNo++) {
    const row = sheet.getRow(rowNo);
    let matches = 0;
    for (const [code, pattern] of Object.entries(names)) {
      for (let col = 1; col <= row.cellCount; col++) {
        if (pattern.test(text(row.getCell(col).value))) {
          columns[code] = col;
          matches++;
          break;
        }
      }
    }
    if (matches > bestMatches) { bestMatches = matches; headerRow = rowNo; }
  }
  if (bestMatches < 4 || !headerRow) throw new Error('世界银行月度工作簿未包含铜、铝、金、银完整价格列');

  const result = new Map<string, CommodityBar[]>(Object.keys(names).map(code => [code, []]));
  for (let rowNo = headerRow + 1; rowNo <= sheet.rowCount; rowNo++) {
    const row = sheet.getRow(rowNo);
    const sourceDate = text(row.getCell(1).value);
    const match = /^(\d{4})M(\d{1,2})$/i.exec(sourceDate);
    if (!match) continue;
    const date = `${match[1]}-${match[2].padStart(2, '0')}-01`;
    for (const code of Object.keys(names)) {
      const close = numeric(row.getCell(columns[code]).value);
      if (close === null || close <= 0) continue;
      result.get(code)!.push({ date, open: null, high: null, low: null, close, sourceRow: { period: sourceDate, commodity: code, value: close } });
    }
  }
  if ([...result.values()].every(rows => rows.length === 0)) throw new Error('世界银行月度工作簿没有可用商品价格记录');
  return result;
}

export function parseFxSeries(raw: unknown): FxRate[] {
  if (!Array.isArray(raw)) throw new Error('汇率接口返回格式无效');
  const rows: FxRate[] = [];
  for (const value of raw) {
    if (!value || typeof value !== 'object') continue;
    const row = value as Record<string, unknown>;
    const rate = numeric(row.rate);
    if (row.base !== 'USD' || row.quote !== 'CNY' || typeof row.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(row.date) || rate === null || rate <= 0) continue;
    rows.push({ date: row.date, rate });
  }
  return rows.sort((a, b) => a.date.localeCompare(b.date));
}

export function monthStart(date: string): string { return `${date.slice(0, 7)}-01`; }
export function shiftMonth(date: string, delta: number): string {
  const value = new Date(`${monthStart(date)}T00:00:00.000Z`);
  value.setUTCMonth(value.getUTCMonth() + delta);
  return value.toISOString().slice(0, 10);
}
export function monthEnd(date: string): string {
  const value = new Date(`${monthStart(date)}T00:00:00.000Z`);
  value.setUTCMonth(value.getUTCMonth() + 1);
  value.setUTCDate(0);
  return value.toISOString().slice(0, 10);
}
export function dateAsUtcDate(date: string): Date { return new Date(`${date}T00:00:00.000Z`); }
