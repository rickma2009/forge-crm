import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Product, ProductList } from '@forge-crm/contracts';
import { ProductPickerDialog } from './ProductPickerDialog';

const product = (id: string, code: string, name: string): Product => ({
  id, productCode: code, productName: name, model: null, productLine: null, unit: '件', status: 'ACTIVE', remark: null,
  middleCategoryName: `${name}中类`, minorCategoryName: `${name}小类`, version: 1, createdAt: '2026-09-25T00:00:00.000Z', updatedAt: '2026-09-25T00:00:00.000Z',
});
const first = product('00000000-0000-4000-8000-000000000001', 'P1', '产品一');
const second = product('00000000-0000-4000-8000-000000000002', 'P2', '产品二');
const page = (items: Product[], current = 1, totalPages = 1): ProductList => ({ items, pagination: { page: current, pageSize: 20, total: totalPages * 20, totalPages } });

describe('ProductPickerDialog', () => {
  it('queries and confirms multiple products from the category table', async () => {
    const load = vi.fn().mockResolvedValue(page([first, second]));
    const confirm = vi.fn();
    render(<ProductPickerDialog mode="multiple" loadProducts={load} onConfirm={confirm} onClose={vi.fn()} />);
    expect(await screen.findByRole('columnheader', { name: '产品中类' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '产品小类' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('查询产品'), { target: { value: '控制板' } });
    fireEvent.click(screen.getByRole('button', { name: '查询' }));
    await waitFor(() => expect(load).toHaveBeenLastCalledWith(expect.objectContaining({ keyword: '控制板', page: 1, pageSize: 20 })));
    fireEvent.click(screen.getByRole('checkbox', { name: '选择当前页全部产品' }));
    fireEvent.click(screen.getByRole('button', { name: '确认' }));
    await waitFor(() => expect(confirm).toHaveBeenCalledWith([first, second]));
  });

  it('keeps cross-page selections in multiple mode', async () => {
    const load = vi.fn(({ page: current }: { page: number }) => Promise.resolve(current === 1 ? page([first], 1, 2) : page([second], 2, 2)));
    const confirm = vi.fn();
    render(<ProductPickerDialog mode="multiple" loadProducts={load} onConfirm={confirm} onClose={vi.fn()} />);
    fireEvent.click(await screen.findByRole('checkbox', { name: '选择产品 P1' }));
    fireEvent.click(screen.getByRole('button', { name: '下一页' }));
    fireEvent.click(await screen.findByRole('checkbox', { name: '选择产品 P2' }));
    fireEvent.click(screen.getByRole('button', { name: '确认' }));
    await waitFor(() => expect(confirm).toHaveBeenCalledWith([first, second]));
  });

  it('uses radio selection and returns only one product in single mode', async () => {
    const confirm = vi.fn();
    render(<ProductPickerDialog mode="single" loadProducts={vi.fn().mockResolvedValue(page([first, second]))} onConfirm={confirm} onClose={vi.fn()} />);
    const dialog = await screen.findByRole('dialog', { name: '选择产品' });
    fireEvent.click(await within(dialog).findByRole('radio', { name: '选择产品 P1' }));
    fireEvent.click(within(dialog).getByRole('radio', { name: '选择产品 P2' }));
    fireEvent.click(within(dialog).getByRole('button', { name: '确认' }));
    await waitFor(() => expect(confirm).toHaveBeenCalledWith([second]));
  });

  it('renders a compact single-line grid and exposes truncated values', async () => {
    render(<ProductPickerDialog mode="multiple" loadProducts={vi.fn().mockResolvedValue(page([first]))} onConfirm={vi.fn()} onClose={vi.fn()} />);
    const code = await screen.findByText('P1');
    const row = code.closest('[role="row"]')!;
    const cell = code.closest('[role="gridcell"]')!;
    expect(getComputedStyle(row).height).toBe('32px');
    expect(getComputedStyle(cell).whiteSpace).toBe('nowrap');
    expect(getComputedStyle(cell).textOverflow).toBe('ellipsis');
    expect(cell).toHaveAttribute('title', 'P1');
  });
});
