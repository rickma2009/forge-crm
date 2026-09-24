import { execFile } from 'node:child_process';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';

type PrintableQuote = { quoteCode: string; title: string; customerName: string; contactName: string | null; quoteDate: string; validUntil: string; status: string; total: string; terms: string; remark?: string; lines: Array<{ productName: string; model: string | null; unit: string; quantity: string; unitPrice: string; discount: string; amount: string; delivery: string; remark?: string; suggestedPrice?: string }> };
const escape = (s: string) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
export function quotePrintHtml(q: PrintableQuote): string {
  const state = ({ DRAFT: '草稿 · 非正式报价', SUBMITTED: '已提交', ACCEPTED: '已接受', REJECTED: '已拒绝', EXPIRED: '已失效' } as Record<string, string>)[q.status] ?? '状态未知';
  const rows = q.lines.map((l, i) => `<tr><td>${i + 1}</td><td>${escape(l.productName)}<br><small>${escape(l.model ?? '')}</small></td><td>${escape(l.unit)}</td><td>${escape(l.quantity)}</td><td>${escape(l.unitPrice)}</td><td>${escape(l.discount)}%</td><td>${escape(l.amount)}</td><td>${escape(l.delivery)}</td></tr>`).join('');
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><title>${escape(q.quoteCode)}</title><style>
    @page{size:A4;margin:16mm 12mm 20mm;@bottom-center{content:counter(page) ' / ' counter(pages);font-size:9pt;color:#64748b}}
    body{font:11pt 'PingFang SC','Noto Sans CJK SC','Microsoft YaHei',sans-serif;color:#172554}h1{font-size:24pt;margin-bottom:4mm}.state{color:#b45309;font-size:14pt}.meta{display:grid;grid-template-columns:1fr 1fr;gap:3mm;margin:8mm 0}table{border-collapse:collapse;width:100%;font-size:9pt;table-layout:fixed}thead{display:table-header-group}tr{break-inside:avoid}th,td{padding:3mm 2mm;border-bottom:1px solid #cbd5e1;overflow-wrap:anywhere;vertical-align:top}th{background:#f1f5f9;text-align:left}td:nth-child(4),td:nth-child(5),td:nth-child(6),td:nth-child(7){text-align:right;font-variant-numeric:tabular-nums}.total{text-align:right;font-size:17pt;margin:8mm 0}.terms{white-space:pre-wrap;overflow-wrap:anywhere;font-size:10pt}small{color:#64748b}th:first-child{width:6mm}th:nth-child(2){width:35mm}th:nth-child(3){width:9mm}
  </style></head><body><h1>报价单</h1><div class="state">${escape(state)}</div><h2>${escape(q.title)}</h2><div class="meta"><span>报价单号：${escape(q.quoteCode)}</span><span>币种：CNY（含税）</span><span>客户：${escape(q.customerName)}</span><span>联系人：${escape(q.contactName ?? '—')}</span><span>报价日期：${escape(q.quoteDate)}</span><span>有效期至：${escape(q.validUntil)}</span></div><table><thead><tr><th>序号</th><th>产品 / 型号</th><th>单位</th><th>数量</th><th>成交单价</th><th>折扣</th><th>小计</th><th>交付说明</th></tr></thead><tbody>${rows}</tbody></table><div class="total">含税总额：¥ ${escape(q.total)}</div><h3>报价条款</h3><div class="terms">${escape(q.terms)}</div></body></html>`;
}

/** Render an escaped, network-free document using an explicitly local Chromium runtime. */
export async function renderQuotePdf(html: string): Promise<Buffer> {
  const dir = await mkdtemp(join(tmpdir(), 'sdd-quotation-pdf-'));
  try {
    const input = join(dir, 'quotation.html'), output = join(dir, 'quotation.pdf');
    await writeFile(input, html, 'utf8');
    const binary = process.env.QUOTATION_CHROME_BIN ?? (process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : '/usr/bin/chromium');
    await promisify(execFile)(binary, ['--headless', '--disable-gpu', '--disable-background-networking', '--no-first-run', '--no-default-browser-check', '--no-pdf-header-footer', `--user-data-dir=${join(dir, 'profile')}`, `--print-to-pdf=${output}`, pathToFileURL(input).href], { timeout: 45000, maxBuffer: 1024 * 1024 });
    const data = await readFile(output); if (data.subarray(0, 5).toString() !== '%PDF-') throw new Error('PDF_OUTPUT_INVALID'); return data;
  } finally { await rm(dir, { recursive: true, force: true }); }
}
