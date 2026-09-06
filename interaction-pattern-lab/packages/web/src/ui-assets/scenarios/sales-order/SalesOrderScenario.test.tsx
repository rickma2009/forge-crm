import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { SalesOrderScenario } from './SalesOrderScenario';
import { salesOrderTraceability } from './config';

describe('TASK-1009 sales-order scenario', () => {
  it('renders REQSRC-traceable header fields, controlled product candidates, and deterministic integer totals', async () => {
    const user = userEvent.setup();
    render(<SalesOrderScenario />);

    expect(screen.getByRole('heading', { name: '新建销售订单' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '客户' })).toHaveValue('广州精工设备有限公司');
    expect(screen.getByRole('table', { name: '新建销售订单行项目' })).toBeInTheDocument();
    expect(screen.getByText('含税合计：¥127,803')).toBeInTheDocument();
    expect(salesOrderTraceability).toEqual({
      directSourceRefs: ['REQSRC-029', 'REQSRC-030'],
      assetRefs: ['UID-001', 'EPM-PAGE-012', 'EPM-PAGE-013', 'EPM-ACT-010', 'EPM-ACT-011', 'EPM-ACT-012', 'EPM-ACT-013'],
      qaStatus: 'recorded',
      qaRef: '.specify/specs/010-master-detail-document-assets/implementation-evidence.md',
    });
    for (const reference of [...salesOrderTraceability.directSourceRefs, ...salesOrderTraceability.assetRefs]) {
      expect(screen.getAllByText(new RegExp(reference)).length).toBeGreaterThan(0);
    }
    expect(screen.getAllByText(/QA：recorded/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/implementation-evidence\.md/).length).toBeGreaterThan(0);

    await user.selectOptions(screen.getByRole('combobox', { name: '候选行' }), 'PRD-5001');
    await user.click(screen.getByRole('button', { name: '添加候选行' }));
    expect(screen.getByRole('row', { name: /滚珠丝杠副 草稿/ })).toBeInTheDocument();
    expect(screen.getByText('含税合计：¥130,469.8')).toBeInTheDocument();
  });

  it('uses the shared grid for copy, line field update, persisted deletion, and deterministic undo', async () => {
    const user = userEvent.setup();
    render(<SalesOrderScenario />);

    await user.click(screen.getByRole('button', { name: '复制精密主轴组件' }));
    expect(screen.getByRole('row', { name: /精密主轴组件 草稿/ })).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: '编辑精密主轴组件的数量' })[0]!);
    const quantity = screen.getByRole('spinbutton', { name: '精密主轴组件 数量' });
    await user.clear(quantity);
    await user.type(quantity, '3');
    await user.keyboard('{Enter}');
    await waitFor(() => expect(screen.getByText(/^含税合计：/)).toHaveTextContent('含税合计：¥224,418'));

    await user.click(screen.getByRole('button', { name: '删除伺服驱动器' }));
    expect(screen.getByRole('row', { name: /伺服驱动器 已标记删除/ })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '撤销删除伺服驱动器' }));
    expect(screen.getByRole('row', { name: /伺服驱动器 已保存/ })).toBeInTheDocument();
  });

  it('updates quantity, minor-unit price, tax rate, and requested delivery with deterministic tax totals', async () => {
    const user = userEvent.setup();
    render(<SalesOrderScenario />);

    await user.click(screen.getByRole('button', { name: '编辑精密主轴组件的数量' }));
    let input = screen.getByRole('spinbutton', { name: '精密主轴组件 数量' });
    await user.clear(input);
    await user.type(input, '3');
    await user.keyboard('{Enter}');

    await user.click(screen.getByRole('button', { name: '编辑精密主轴组件的含税单价' }));
    input = screen.getByRole('spinbutton', { name: '精密主轴组件 含税单价' });
    await user.clear(input);
    await user.type(input, '3000000');
    await user.keyboard('{Enter}');

    await user.click(screen.getByRole('button', { name: '编辑精密主轴组件的税率' }));
    input = screen.getByRole('spinbutton', { name: '精密主轴组件 税率' });
    await user.clear(input);
    await user.type(input, '10');
    await user.keyboard('{Enter}');

    await user.click(screen.getByRole('button', { name: '编辑精密主轴组件的要求交付日期' }));
    const requestedDelivery = screen.getByLabelText('精密主轴组件 要求交付日期');
    await user.clear(requestedDelivery);
    await user.type(requestedDelivery, '2026-10-01');
    await user.keyboard('{Enter}');

    expect(screen.getByRole('button', { name: '编辑精密主轴组件的要求交付日期' })).toHaveTextContent('2026-10-01');
    expect(screen.getByText('税额：¥16,293')).toBeInTheDocument();
    expect(screen.getByText('含税合计：¥162,393')).toBeInTheDocument();
  });

  it('validates the current customer value, preserves the error context, and succeeds after correction', async () => {
    const user = userEvent.setup();
    render(<SalesOrderScenario initialOutcome="validation" />);

    const customer = screen.getByRole('textbox', { name: '客户' });
    await user.clear(customer);
    await user.click(screen.getByRole('button', { name: '保存模拟单据' }));
    expect(screen.getByRole('alert', { name: '校验失败' })).toHaveTextContent('客户不能为空。');
    expect(customer).toHaveValue('');

    await user.type(customer, '可修正客户');
    await user.click(screen.getByRole('button', { name: '保存模拟单据' }));
    expect(screen.getByRole('status', { name: '模拟操作结果' })).toHaveTextContent('草稿已暂存（模拟）。');
  });

  it('keeps simulated business rejection distinct', async () => {
    const user = userEvent.setup();
    render(<SalesOrderScenario initialOutcome="rejected" />);
    await user.click(screen.getByRole('button', { name: '保存模拟单据' }));
    expect(screen.getByRole('alert', { name: '业务拒绝' })).toHaveTextContent('模拟信用额度不足。');
  });

  it('keeps simulated partial success distinct', async () => {
    const user = userEvent.setup();
    render(<SalesOrderScenario initialOutcome="partial" />);
    await user.click(screen.getByRole('button', { name: '保存模拟单据' }));
    expect(screen.getByRole('alert', { name: '部分完成' })).toHaveTextContent('成功 2，失败 1，未处理 0，共 3。');
  });

  it('keeps draft save and submit feedback distinct without changing business status', async () => {
    const user = userEvent.setup();
    render(<SalesOrderScenario />);
    await user.selectOptions(screen.getByRole('combobox', { name: '保存方式' }), 'draft');
    await user.click(screen.getByRole('button', { name: '保存模拟单据' }));
    expect(screen.getByRole('status', { name: '模拟操作结果' })).toHaveTextContent('草稿已暂存（模拟）。');

    await user.selectOptions(screen.getByRole('combobox', { name: '保存方式' }), 'submit');
    await user.click(screen.getByRole('button', { name: '保存模拟单据' }));
    expect(screen.getByRole('status', { name: '模拟操作结果' })).toHaveTextContent('订单已保存并提交（模拟）。');
    expect(screen.getByText('业务状态：草稿')).toBeInTheDocument();
  });

  it('keeps dirty input when leave confirmation is cancelled and never implies persistence', async () => {
    const user = userEvent.setup();
    render(<SalesOrderScenario />);
    const customer = screen.getByRole('textbox', { name: '客户' });
    await user.clear(customer);
    await user.type(customer, '仅本次会话客户');
    await user.click(screen.getByRole('button', { name: '离开单据' }));
    await user.click(screen.getByRole('button', { name: '继续编辑' }));

    expect(customer).toHaveValue('仅本次会话客户');
    expect(screen.getByText(/不会写入业务系统/)).toBeInTheDocument();
  });

  it('blocks a second submit while the deterministic adapter is pending', async () => {
    const user = userEvent.setup();
    render(<SalesOrderScenario initialOutcome="pending-success" />);
    const save = screen.getByRole('button', { name: '保存模拟单据' });
    await user.click(save);
    await user.click(save);

    expect(save).toBeDisabled();
  });
});
