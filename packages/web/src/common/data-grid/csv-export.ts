/** Pure CSV encoding; callers own authorization, formatting, row loading and download. */
export const csvCell = (value: unknown) => {
  let text = String(value ?? '');
  if (/^[=+@\-\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
};
export const createCsvBlob = (rows: readonly (readonly unknown[])[]): Blob => new Blob(['\uFEFF', rows.map(row => row.map(csvCell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
