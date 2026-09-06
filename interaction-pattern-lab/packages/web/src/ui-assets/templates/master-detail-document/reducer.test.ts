import { describe, expect, it } from 'vitest';
import { createDocumentState, reduceDocument } from './reducer';
import type { DocumentState } from './types';

interface Header {
  title: string;
}

interface Line {
  rowId: string;
  persistedState: 'draft' | 'persisted' | 'marked-for-deletion';
  quantity: number;
}

const initial = (): DocumentState<Header, Line> => createDocumentState({
  mode: 'edit',
  header: { title: '初始标题' },
  lines: [{ rowId: 'line-1', persistedState: 'persisted', quantity: 1 }],
  businessStatus: '草稿',
});

describe('TASK-1008 MasterDetailDocument reducer', () => {
  it('prevents a duplicate save while preserving the first saving state', () => {
    const saving = reduceDocument(initial(), { type: 'begin-save' }).state;
    const duplicate = reduceDocument(saving, { type: 'begin-save' });

    expect(duplicate.outcome).toEqual({ kind: 'ignored', reason: 'already-saving' });
    expect(duplicate.state).toBe(saving);
  });

  it('keeps user input and business status after a failed save, while a success feedback does not transition business status', () => {
    const changed = reduceDocument(initial(), { type: 'change-header', header: { title: '保留输入' } }).state;
    const rejected = reduceDocument(reduceDocument(changed, { type: 'begin-save' }).state, {
      type: 'resolve-save',
      outcome: { kind: 'business-rejected', reason: '额度不足。' },
    }).state;

    expect(rejected.header.title).toBe('保留输入');
    expect(rejected.phase).toBe('dirty');
    expect(rejected.businessStatus).toBe('草稿');

    const saved = reduceDocument(reduceDocument(changed, { type: 'begin-save' }).state, {
      type: 'resolve-save',
      outcome: { kind: 'success', message: '模拟保存完成。', nextStatus: '已提交' },
    }).state;

    expect(saved.phase).toBe('clean');
    expect(saved.businessStatus).toBe('草稿');
    expect(saved.outcome).toEqual({ kind: 'success', message: '模拟保存完成。', nextStatus: '已提交' });
  });

  it('keeps validation errors navigable and makes dirty leave confirmation cancelable', () => {
    const changed = reduceDocument(initial(), { type: 'change-header', header: { title: '' } }).state;
    const validationFailed = reduceDocument(reduceDocument(changed, { type: 'begin-save' }).state, {
      type: 'resolve-save',
      outcome: {
        kind: 'validation-failed',
        headerErrors: [{ id: 'title-required', fieldId: 'title', message: '标题必填。' }],
        lineErrors: [{ id: 'line-quantity', rowId: 'line-1', fieldId: 'quantity', message: '数量必须大于零。' }],
      },
    }).state;
    expect(validationFailed.headerErrors).toHaveLength(1);
    expect(validationFailed.lineErrors).toHaveLength(1);

    const confirming = reduceDocument(validationFailed, { type: 'request-leave' }).state;
    expect(confirming.phase).toBe('confirm-leave');
    expect(confirming.header.title).toBe('');
    expect(reduceDocument(confirming, { type: 'cancel-leave' }).state.phase).toBe('dirty');
  });

  it('allows clean documents to leave immediately and only changes business status through an explicit action', () => {
    const cleanLeave = reduceDocument(initial(), { type: 'request-leave' });
    expect(cleanLeave.outcome).toEqual({ kind: 'leave-confirmed' });

    const changedStatus = reduceDocument(initial(), { type: 'set-business-status', businessStatus: '已提交' }).state;
    expect(changedStatus.businessStatus).toBe('已提交');
  });
});
