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

const initial = (mode: 'create' | 'view' | 'edit' = 'edit'): DocumentState<Header, Line> => createDocumentState({
  mode,
  header: { title: '初始标题' },
  lines: [{ rowId: 'line-1', persistedState: 'persisted', quantity: 1 }],
  businessStatus: '草稿',
});

describe('TASK-1008 MasterDetailDocument reducer', () => {
  it('freezes header and line mutations while saving and prevents duplicate save', () => {
    const saving = reduceDocument(initial(), { type: 'begin-save' }).state;
    const duplicate = reduceDocument(saving, { type: 'begin-save' });
    const headerChange = reduceDocument(saving, { type: 'change-header', header: { title: '不应进入保存快照' } });
    const lineChange = reduceDocument(saving, {
      type: 'mutate-lines',
      mutation: { type: 'update', payload: { rowId: 'line-1', changes: { quantity: 99 } } },
      allocateId: () => 'unused',
    });

    expect(duplicate.outcome).toEqual({ kind: 'ignored', reason: 'already-saving' });
    expect(duplicate.state).toBe(saving);
    expect(headerChange.state).toBe(saving);
    expect(lineChange.state).toBe(saving);
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

  it('establishes a clean line baseline after save so a pure selection stays clean', () => {
    const changedLines = reduceDocument(initial(), {
      type: 'mutate-lines',
      mutation: { type: 'update', payload: { rowId: 'line-1', changes: { quantity: 2 } } },
      allocateId: () => 'unused',
    }).state;
    const saved = reduceDocument(reduceDocument(changedLines, { type: 'begin-save' }).state, {
      type: 'resolve-save',
      outcome: { kind: 'success', message: '模拟保存完成。' },
    }).state;
    const selected = reduceDocument(saved, {
      type: 'mutate-lines',
      mutation: { type: 'select', payload: { rowId: 'line-1', selected: true } },
      allocateId: () => 'unused',
    }).state;

    expect(saved.lines.dirty).toBe(false);
    expect(selected.phase).toBe('clean');
    expect(selected.lines.selection.has('line-1')).toBe(true);
  });

  it('enforces create, view, and edit modes in the pure reducer', () => {
    const createChanged = reduceDocument(initial('create'), { type: 'change-header', header: { title: '创建中标题' } });
    const editChanged = reduceDocument(initial('edit'), { type: 'change-header', header: { title: '编辑中标题' } });
    const viewHeader = reduceDocument(initial('view'), { type: 'change-header', header: { title: '查看模式不得修改' } });
    const viewLines = reduceDocument(initial('view'), {
      type: 'mutate-lines',
      mutation: { type: 'update', payload: { rowId: 'line-1', changes: { quantity: 9 } } },
      allocateId: () => 'unused',
    });
    const viewSave = reduceDocument(initial('view'), { type: 'begin-save' });

    expect(createChanged.state.header.title).toBe('创建中标题');
    expect(editChanged.state.header.title).toBe('编辑中标题');
    expect(viewHeader.state.header.title).toBe('初始标题');
    expect(viewLines.state.lines.rows[0]?.quantity).toBe(1);
    expect(viewSave.state.phase).toBe('clean');
  });

  it('does not let an outcome from a different save request settle the active snapshot', () => {
    const saving = reduceDocument(initial(), { type: 'begin-save' }).state;
    const stale = reduceDocument(saving, {
      type: 'resolve-save',
      saveRequestId: 99,
      outcome: { kind: 'success', message: '过期保存不应生效。' },
    } as never);

    expect(stale.state).toBe(saving);
    expect(stale.state.phase).toBe('saving');
  });

  it('changes mode through the reducer before applying the new mode protections', () => {
    const viewed = reduceDocument(initial('edit'), { type: 'set-mode', mode: 'view' } as never).state;
    const blocked = reduceDocument(viewed, { type: 'change-header', header: { title: '查看模式不得修改' } });
    const created = reduceDocument(viewed, { type: 'set-mode', mode: 'create' } as never).state;
    const editable = reduceDocument(created, { type: 'change-header', header: { title: '创建模式可修改' } }).state;

    expect(viewed.mode).toBe('view');
    expect(blocked.state).toBe(viewed);
    expect(editable.header.title).toBe('创建模式可修改');
  });
});
