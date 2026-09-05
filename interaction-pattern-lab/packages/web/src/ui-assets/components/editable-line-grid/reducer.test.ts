import { describe, expect, it } from 'vitest';
import * as lineReducer from './reducer';
import type { LineMutation, LineRecord } from './types';

interface ExampleLine extends LineRecord {
  description: string;
  quantityMinorUnits: number;
  amountMinorUnits: number;
}

const allocateIds = (...ids: string[]) => {
  const remaining = [...ids];
  return () => {
    const next = remaining.shift();
    if (!next) throw new Error('test allocator exhausted');
    return next;
  };
};

const persisted: ExampleLine = {
  rowId: 'line-100',
  persistedState: 'persisted',
  description: '已有行',
  quantityMinorUnits: 200,
  amountMinorUnits: 199,
};

const draft: ExampleLine = {
  rowId: 'line-draft',
  persistedState: 'draft',
  description: '草稿行',
  quantityMinorUnits: 100,
  amountMinorUnits: 25,
};

const lineShape = (row: ExampleLine) => ({
  rowId: row.rowId,
  persistedState: row.persistedState,
  description: row.description,
  quantityMinorUnits: row.quantityMinorUnits,
  amountMinorUnits: row.amountMinorUnits,
});

describe('TASK-1006 editable line reducer', () => {
  it.each([
    {
      name: 'append-empty makes an allocated draft row dirty',
      initialRows: [],
      mutation: { type: 'append-empty', payload: { description: '', quantityMinorUnits: 0, amountMinorUnits: 0 } },
      allocator: ['line-201'],
      expectedRows: [{ rowId: 'line-201', persistedState: 'draft', description: '', quantityMinorUnits: 0, amountMinorUnits: 0 }],
      expectedSelection: [],
      expectedDirty: true,
      expectedRevision: 1,
    },
    {
      name: 'append-candidate keeps caller supplied candidate values under an allocated draft identity',
      initialRows: [persisted],
      mutation: { type: 'append-candidate', payload: { description: '候选行', quantityMinorUnits: 300, amountMinorUnits: 450 } },
      allocator: ['line-202'],
      expectedRows: [persisted, { rowId: 'line-202', persistedState: 'draft', description: '候选行', quantityMinorUnits: 300, amountMinorUnits: 450 }],
      expectedSelection: [],
      expectedDirty: true,
      expectedRevision: 1,
    },
    {
      name: 'copy allocates a new draft identity without changing the source values',
      initialRows: [persisted],
      mutation: { type: 'copy', payload: { rowId: 'line-100' } },
      allocator: ['line-203'],
      expectedRows: [persisted, { rowId: 'line-203', persistedState: 'draft', description: '已有行', quantityMinorUnits: 200, amountMinorUnits: 199 }],
      expectedSelection: [],
      expectedDirty: true,
      expectedRevision: 1,
    },
    {
      name: 'update changes only the requested editable values',
      initialRows: [persisted],
      mutation: { type: 'update', payload: { rowId: 'line-100', changes: { description: '已修改行', amountMinorUnits: 250 } } },
      allocator: [],
      expectedRows: [{ rowId: 'line-100', persistedState: 'persisted', description: '已修改行', quantityMinorUnits: 200, amountMinorUnits: 250 }],
      expectedSelection: [],
      expectedDirty: true,
      expectedRevision: 1,
    },
    {
      name: 'select changes only selection and leaves a clean document clean',
      initialRows: [persisted],
      mutation: { type: 'select', payload: { rowId: 'line-100', selected: true } },
      allocator: [],
      expectedRows: [persisted],
      expectedSelection: ['line-100'],
      expectedDirty: false,
      expectedRevision: 0,
    },
    {
      name: 'remove-draft physically removes the draft row and its selection',
      initialRows: [persisted, draft],
      mutation: { type: 'remove-draft', payload: { rowId: 'line-draft' } },
      allocator: [],
      expectedRows: [persisted],
      expectedSelection: [],
      expectedDirty: true,
      expectedRevision: 1,
    },
  ] satisfies Array<{
    name: string;
    initialRows: ExampleLine[];
    mutation: LineMutation<ExampleLine>;
    allocator: string[];
    expectedRows: ExampleLine[];
    expectedSelection: string[];
    expectedDirty: boolean;
    expectedRevision: number;
  }>)('$name', ({ initialRows, mutation, allocator, expectedRows, expectedSelection, expectedDirty, expectedRevision }) => {
    const initial = lineReducer.createEditableLineState(initialRows, new Set(mutation.type === 'remove-draft' ? ['line-draft'] : []));
    const result = lineReducer.reduceEditableLines(initial, mutation, allocateIds(...allocator));

    expect(result.outcome).toEqual({ kind: 'applied' });
    expect(result.state.rows.map(lineShape)).toEqual(expectedRows.map(lineShape));
    expect([...result.state.selection]).toEqual(expectedSelection);
    expect(result.state.dirty).toBe(expectedDirty);
    expect(result.state.revision).toBe(expectedRevision);
  });

  it('marks a persisted row for deletion and undo restores its exact snapshot at its original index', () => {
    const before = lineReducer.createEditableLineState([
      { ...persisted, rowId: 'line-first', description: '第一行' },
      persisted,
      { ...persisted, rowId: 'line-last', description: '最后一行' },
    ]);
    const deleted = lineReducer.reduceEditableLines(before, { type: 'mark-delete', payload: { rowId: 'line-100' } }, allocateIds());

    expect(deleted.state.rows.map(lineShape)).toEqual([
      { rowId: 'line-first', persistedState: 'persisted', description: '第一行', quantityMinorUnits: 200, amountMinorUnits: 199 },
      { rowId: 'line-100', persistedState: 'marked-for-deletion', description: '已有行', quantityMinorUnits: 200, amountMinorUnits: 199 },
      { rowId: 'line-last', persistedState: 'persisted', description: '最后一行', quantityMinorUnits: 200, amountMinorUnits: 199 },
    ]);
    expect(deleted.outcome).toMatchObject({ kind: 'marked-delete', undoToken: { rowId: 'line-100', index: 1, revision: 1, snapshot: persisted } });
    expect(deleted.state.dirty).toBe(true);
    if (deleted.outcome.kind !== 'marked-delete') throw new Error('expected deletion undo token');

    const restored = lineReducer.reduceEditableLines(deleted.state, { type: 'undo-delete', payload: deleted.outcome.undoToken }, allocateIds());

    expect(restored.outcome).toEqual({ kind: 'undone-delete', rowId: 'line-100' });
    expect(restored.state.rows.map(lineShape)).toEqual(([
      { rowId: 'line-first', persistedState: 'persisted', description: '第一行', quantityMinorUnits: 200, amountMinorUnits: 199 },
      persisted,
      { rowId: 'line-last', persistedState: 'persisted', description: '最后一行', quantityMinorUnits: 200, amountMinorUnits: 199 },
    ] satisfies ExampleLine[]).map(lineShape));
    expect(restored.state.rows[1]).toEqual(persisted);
    expect(restored.state.dirty).toBe(true);
    expect(restored.state.revision).toBe(2);
  });

  it('returns a stale-undo conflict and never restores a deletion after an intervening mutation', () => {
    const initial = lineReducer.createEditableLineState([persisted, draft]);
    const deleted = lineReducer.reduceEditableLines(initial, { type: 'mark-delete', payload: { rowId: 'line-100' } }, allocateIds());
    if (deleted.outcome.kind !== 'marked-delete') throw new Error('expected deletion undo token');
    const changed = lineReducer.reduceEditableLines(deleted.state, { type: 'update', payload: { rowId: 'line-draft', changes: { amountMinorUnits: 99 } } }, allocateIds());
    const staleUndo = lineReducer.reduceEditableLines(changed.state, { type: 'undo-delete', payload: deleted.outcome.undoToken }, allocateIds());

    expect(staleUndo.outcome).toEqual({ kind: 'stale-undo', rowId: 'line-100', expectedRevision: 1, actualRevision: 2 });
    expect(staleUndo.state.rows.map(lineShape)).toEqual([
      { rowId: 'line-100', persistedState: 'marked-for-deletion', description: '已有行', quantityMinorUnits: 200, amountMinorUnits: 199 },
      { rowId: 'line-draft', persistedState: 'draft', description: '草稿行', quantityMinorUnits: 100, amountMinorUnits: 99 },
    ]);
    expect(staleUndo.state.revision).toBe(2);
  });

  it('uses integer minor units and excludes marked-for-deletion rows from its deterministic summary', () => {
    const summary = lineReducer.summarizeLineMinorUnits([
      persisted,
      { ...draft, rowId: 'line-deleted', persistedState: 'marked-for-deletion', amountMinorUnits: 500 },
      { ...draft, rowId: 'line-202', amountMinorUnits: 25 },
    ], (row) => row.amountMinorUnits);

    expect(summary).toEqual({ activeRowCount: 2, deletedRowCount: 1, totalMinorUnits: 224 });
    expect(() => lineReducer.summarizeLineMinorUnits([persisted], () => 1.5)).toThrow('minor-unit value must be a safe integer');
  });

  it('keeps dirty-state transitions explicit across selection and content mutations', () => {
    const clean = lineReducer.createEditableLineState([persisted]);
    const selected = lineReducer.reduceEditableLines(clean, { type: 'select', payload: { rowId: 'line-100', selected: true } }, allocateIds());
    const appended = lineReducer.reduceEditableLines(selected.state, { type: 'append-empty', payload: { description: '', quantityMinorUnits: 0, amountMinorUnits: 0 } }, allocateIds('line-204'));
    const deleted = lineReducer.reduceEditableLines(appended.state, { type: 'mark-delete', payload: { rowId: 'line-100' } }, allocateIds());
    if (deleted.outcome.kind !== 'marked-delete') throw new Error('expected deletion undo token');
    const undone = lineReducer.reduceEditableLines(deleted.state, { type: 'undo-delete', payload: deleted.outcome.undoToken }, allocateIds());

    expect(clean.dirty).toBe(false);
    expect(selected.state.dirty).toBe(false);
    expect(appended.state.dirty).toBe(true);
    expect(deleted.state.dirty).toBe(true);
    expect(undone.state.dirty).toBe(true);
    expect([...undone.state.selection]).toEqual([]);
  });
});
