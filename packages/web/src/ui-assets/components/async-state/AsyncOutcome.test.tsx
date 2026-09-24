import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AsyncOutcome } from './AsyncOutcome';

describe('TASK-1007 AsyncOutcome', () => {
  it('keeps simulated success, validation failure, and business rejection as distinct outcome regions', () => {
    const { rerender } = render(<AsyncOutcome outcome={{ kind: 'success', message: '草稿已保存。', nextStatus: '草稿' }} />);
    expect(screen.getByRole('status')).toHaveTextContent('模拟操作已完成：草稿已保存。');
    expect(screen.getByRole('status')).toHaveTextContent('当前状态：草稿');

    rerender(<AsyncOutcome outcome={{ kind: 'validation-failed', errors: [{ id: 'header-title', message: '请填写单据标题。' }] }} />);
    expect(screen.getByRole('alert')).toHaveTextContent('校验未通过');
    expect(screen.getByRole('alert')).toHaveTextContent('请填写单据标题。');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    rerender(<AsyncOutcome outcome={{ kind: 'business-rejected', reason: '当前状态不允许提交。' }} />);
    expect(screen.getByRole('alert')).toHaveTextContent('业务拒绝：当前状态不允许提交。');
  });

  it('shows reconciled partial-success counts and never calls an inconsistent result a success', () => {
    const { rerender } = render(<AsyncOutcome outcome={{
      kind: 'partial-success',
      total: 5,
      succeeded: 2,
      failed: [{ id: 'line-a', reason: '库存不足。' }],
      unprocessed: 2,
    }} />);

    expect(screen.getByRole('alert')).toHaveTextContent('部分完成');
    expect(screen.getByRole('alert')).toHaveTextContent('成功 2，失败 1，未处理 2，共 5。');
    expect(screen.getByText('line-a：库存不足。')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    rerender(<AsyncOutcome outcome={{
      kind: 'partial-success',
      total: 5,
      succeeded: 2,
      failed: [{ id: 'line-a', reason: '库存不足。' }],
      unprocessed: 1,
    }} />);
    expect(screen.getByRole('alert')).toHaveTextContent('结果计数不一致');
    expect(screen.getByRole('alert')).not.toHaveTextContent('模拟操作已完成');
  });
});
