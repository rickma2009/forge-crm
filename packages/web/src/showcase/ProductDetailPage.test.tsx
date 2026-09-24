import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { GatewayError, type EnterpriseGateway } from './gateway';
import { ProductDetailPage } from './ProductDetailPage';

const product = {
  id: '66666666-6666-4666-8666-666666666666', version: 2,
  createdAt: '2026-09-23T00:00:00.000Z', updatedAt: '2026-09-23T00:00:00.000Z',
  productCode: 'P001', productName: '控制板', model: 'M1', productLine: 'TV',
  unit: 'PCS', status: 'ACTIVE' as const, remark: '演示产品',
};

function gateway(overrides: Partial<EnterpriseGateway> = {}) {
  return {
    productDetail: vi.fn().mockResolvedValue(product),
    updateProduct: vi.fn().mockResolvedValue(product),
    deleteProduct: vi.fn().mockResolvedValue(undefined),
    attachments: vi.fn().mockResolvedValue([]),
    ...overrides,
  } as unknown as EnterpriseGateway;
}

describe('ProductDetailPage', () => {
  it('matches the customer detail header, tabs and read-only field layout', async () => {
    const { container } = render(<ProductDetailPage systemCode="demo-portal" productId={product.id} allowedActions={['update', 'price-view', 'price-manage', 'attachment-view']} gateway={gateway()} onBack={() => undefined} />);
    expect(await screen.findByRole('heading', { name: product.productName })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '返回产品列表' })).toHaveTextContent('←');
    expect(screen.getByText('产品编码：')).toHaveTextContent(product.productCode);
    expect(container.querySelector('.product-object-header .status-pill')).toHaveTextContent('启用');
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['产品信息', '产品定价', '附件']);
    expect(screen.getByRole('tab', { name: '产品信息' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('textbox', { name: '产品编码' })).toBeDisabled();
    expect(screen.getByRole('textbox', { name: '产品名称' })).toBeDisabled();
  });

  it('shows blocking reference counts when deletion is rejected', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const api = gateway({ deleteProduct: vi.fn().mockRejectedValue(new GatewayError(409, 'BAD_REQUEST', '产品已被业务或附件引用，不能删除', { quotations: 2, prices: 1 })) });
    render(<ProductDetailPage systemCode="demo-portal" productId={product.id} allowedActions={['delete']} gateway={api} onBack={() => undefined} />);
    await userEvent.click(await screen.findByRole('button', { name: '删除' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('报价单 2 条、定价 1 条'));
    vi.restoreAllMocks();
  });
});
