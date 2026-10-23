import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RowActionButton } from './RowActionButton';

describe('RowActionButton semantic icons', () => {
  it('uses distinct global icons for task lifecycle actions', () => {
    render(<>
      <RowActionButton label="开始" />
      <RowActionButton label="暂停" />
      <RowActionButton label="暂挂" />
      <RowActionButton label="等待回复" />
      <RowActionButton label="完成" />
      <RowActionButton label="备注" />
      <RowActionButton label="关注" />
      <RowActionButton label="忽略" />
      <RowActionButton label="恢复" />
      <RowActionButton label="重新打开" />
      <RowActionButton label="持续观察" />
      <RowActionButton label="关闭事件" />
      <RowActionButton label="标记无关" />
      <RowActionButton label="标记误报" />
    </>);
    const expected: Record<string,string> = { 开始:'start',暂停:'pause',暂挂:'hold',等待回复:'reply',完成:'complete',备注:'note',关注:'star',忽略:'ignore',恢复:'resume',重新打开:'reopen',持续观察:'observe',关闭事件:'archive',标记无关:'irrelevant',标记误报:'false-positive' };
    for (const [label, icon] of Object.entries(expected)) expect(screen.getByRole('button',{name:label})).toHaveAttribute('data-row-action-icon',icon);
    expect(new Set(Object.values(expected)).size).toBe(Object.keys(expected).length);
  });

  it('uses the filled attention icon for an active attention action', () => {
    render(<RowActionButton label="取消关注" aria-pressed={true} />);
    expect(screen.getByRole('button',{name:'取消关注'})).toHaveAttribute('data-row-action-icon','star-filled');
  });
});
