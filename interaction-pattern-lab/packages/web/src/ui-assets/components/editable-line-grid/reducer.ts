import type {
  DeletedLineUndoToken,
  EditableLineResult,
  EditableLineState,
  LineIdAllocator,
  LineMinorUnitSummary,
  LineMutation,
  LineRecord,
  LineValues,
} from './types';

export function createEditableLineState<TLine extends LineRecord>(
  rows: TLine[],
  selection: Set<string> = new Set(),
): EditableLineState<TLine> {
  return { rows: [...rows], selection: new Set(selection), pendingDeletions: {}, dirty: false, revision: 0 };
}

export function reduceEditableLines<TLine extends LineRecord>(
  state: EditableLineState<TLine>,
  mutation: LineMutation<TLine>,
  allocateId: LineIdAllocator,
): EditableLineResult<TLine> {
  switch (mutation.type) {
    case 'append-empty':
    case 'append-candidate':
      return append(state, mutation.payload, allocateId);
    case 'copy':
      return copy(state, mutation.payload.rowId, allocateId);
    case 'update':
      return update(state, mutation.payload.rowId, mutation.payload.changes);
    case 'select':
      return select(state, mutation.payload.rowId, mutation.payload.selected);
    case 'remove-draft':
      return removeDraft(state, mutation.payload.rowId);
    case 'mark-delete':
      return markDelete(state, mutation.payload.rowId);
    case 'undo-delete':
      return undoDelete(state, mutation.payload);
  }
}

export function summarizeLineMinorUnits<TLine extends LineRecord>(
  rows: TLine[],
  readMinorUnits: (row: TLine) => number,
): LineMinorUnitSummary {
  let activeRowCount = 0;
  let deletedRowCount = 0;
  let totalMinorUnits = 0;

  for (const row of rows) {
    if (row.persistedState === 'marked-for-deletion') {
      deletedRowCount += 1;
      continue;
    }

    const value = readMinorUnits(row);
    if (!Number.isSafeInteger(value)) throw new RangeError('minor-unit value must be a safe integer');
    totalMinorUnits += value;
    if (!Number.isSafeInteger(totalMinorUnits)) throw new RangeError('minor-unit total must be a safe integer');
    activeRowCount += 1;
  }

  return { activeRowCount, deletedRowCount, totalMinorUnits };
}

function append<TLine extends LineRecord>(
  state: EditableLineState<TLine>,
  values: LineValues<TLine>,
  allocateId: LineIdAllocator,
): EditableLineResult<TLine> {
  const rowId = allocateFreshId(state, allocateId);
  if (!rowId) return ignored(state, 'invalid-row-id');
  const row = { ...withoutIdentity(values), rowId, persistedState: 'draft' } as TLine;
  return applied({ ...state, rows: [...state.rows, row], dirty: true, revision: state.revision + 1 });
}

function copy<TLine extends LineRecord>(
  state: EditableLineState<TLine>,
  sourceId: string,
  allocateId: LineIdAllocator,
): EditableLineResult<TLine> {
  const source = state.rows.find((row) => row.rowId === sourceId);
  if (!source) return ignored(state, 'missing-row');
  if (source.persistedState === 'marked-for-deletion') return ignored(state, 'invalid-state');

  const rowId = allocateFreshId(state, allocateId);
  if (!rowId) return ignored(state, 'invalid-row-id');
  const row = { ...withoutIdentity(source), rowId, persistedState: 'draft' } as TLine;
  return applied({ ...state, rows: [...state.rows, row], dirty: true, revision: state.revision + 1 });
}

function update<TLine extends LineRecord>(
  state: EditableLineState<TLine>,
  rowId: string,
  changes: Partial<LineValues<TLine>>,
): EditableLineResult<TLine> {
  const row = state.rows.find((candidate) => candidate.rowId === rowId);
  if (!row) return ignored(state, 'missing-row');
  if (row.persistedState === 'marked-for-deletion') return ignored(state, 'invalid-state');

  const nextRows = state.rows.map((candidate) => candidate.rowId === rowId
    ? { ...candidate, ...withoutIdentity(changes) } as TLine
    : candidate);
  return applied({ ...state, rows: nextRows, dirty: true, revision: state.revision + 1 });
}

function select<TLine extends LineRecord>(
  state: EditableLineState<TLine>,
  rowId: string,
  selected: boolean,
): EditableLineResult<TLine> {
  const row = state.rows.find((candidate) => candidate.rowId === rowId);
  if (!row) return ignored(state, 'missing-row');
  if (row.persistedState === 'marked-for-deletion') return ignored(state, 'invalid-state');

  const selection = new Set(state.selection);
  if (selected) selection.add(rowId);
  else selection.delete(rowId);
  return applied({ ...state, selection });
}

function removeDraft<TLine extends LineRecord>(state: EditableLineState<TLine>, rowId: string): EditableLineResult<TLine> {
  const row = state.rows.find((candidate) => candidate.rowId === rowId);
  if (!row) return ignored(state, 'missing-row');
  if (row.persistedState !== 'draft') return ignored(state, 'invalid-state');

  const selection = new Set(state.selection);
  selection.delete(rowId);
  return applied({ ...state, rows: state.rows.filter((candidate) => candidate.rowId !== rowId), selection, dirty: true, revision: state.revision + 1 });
}

function markDelete<TLine extends LineRecord>(state: EditableLineState<TLine>, rowId: string): EditableLineResult<TLine> {
  const index = state.rows.findIndex((candidate) => candidate.rowId === rowId);
  const row = state.rows[index];
  if (!row) return ignored(state, 'missing-row');
  if (row.persistedState !== 'persisted') return ignored(state, 'invalid-state');

  const revision = state.revision + 1;
  const undoToken: DeletedLineUndoToken<TLine> = { rowId, index, snapshot: { ...row }, revision };
  const selection = new Set(state.selection);
  selection.delete(rowId);
  return {
    state: {
      ...state,
      rows: state.rows.map((candidate) => candidate.rowId === rowId ? { ...candidate, persistedState: 'marked-for-deletion' } : candidate) as TLine[],
      selection,
      pendingDeletions: { ...state.pendingDeletions, [rowId]: undoToken },
      dirty: true,
      revision,
    },
    outcome: { kind: 'marked-delete', undoToken },
  };
}

function undoDelete<TLine extends LineRecord>(
  state: EditableLineState<TLine>,
  suppliedToken: DeletedLineUndoToken<TLine>,
): EditableLineResult<TLine> {
  const storedToken = state.pendingDeletions[suppliedToken.rowId];
  if (!storedToken || storedToken.revision !== suppliedToken.revision || state.revision !== suppliedToken.revision) {
    return {
      state,
      outcome: {
        kind: 'stale-undo',
        rowId: suppliedToken.rowId,
        expectedRevision: storedToken?.revision ?? suppliedToken.revision,
        actualRevision: state.revision,
      },
    };
  }

  const remainingRows = state.rows.filter((row) => row.rowId !== suppliedToken.rowId);
  const index = Math.min(Math.max(storedToken.index, 0), remainingRows.length);
  const pendingDeletions = { ...state.pendingDeletions };
  delete pendingDeletions[suppliedToken.rowId];
  return {
    state: {
      ...state,
      rows: [...remainingRows.slice(0, index), storedToken.snapshot, ...remainingRows.slice(index)],
      pendingDeletions,
      dirty: true,
      revision: state.revision + 1,
    },
    outcome: { kind: 'undone-delete', rowId: suppliedToken.rowId },
  };
}

function allocateFreshId<TLine extends LineRecord>(state: EditableLineState<TLine>, allocateId: LineIdAllocator): string | null {
  const rowId = allocateId();
  if (!rowId || !rowId.trim()) return null;
  return state.rows.some((row) => row.rowId === rowId) ? null : rowId;
}

function withoutIdentity<TLine extends object>(line: TLine): Omit<TLine, 'rowId' | 'persistedState'> {
  const { rowId: _rowId, persistedState: _persistedState, ...values } = line as TLine & LineRecord;
  return values;
}

function applied<TLine extends LineRecord>(state: EditableLineState<TLine>): EditableLineResult<TLine> {
  return { state, outcome: { kind: 'applied' } };
}

function ignored<TLine extends LineRecord>(
  state: EditableLineState<TLine>,
  reason: 'missing-row' | 'invalid-state' | 'duplicate-row-id' | 'invalid-row-id',
): EditableLineResult<TLine> {
  return { state, outcome: { kind: 'ignored', reason } };
}
