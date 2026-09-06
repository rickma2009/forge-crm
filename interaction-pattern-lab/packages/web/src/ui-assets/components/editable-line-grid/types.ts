export type PersistedState = 'draft' | 'persisted' | 'marked-for-deletion';

export interface LineRecord {
  rowId: string;
  persistedState: PersistedState;
}

export type LineValues<TLine extends LineRecord> = Omit<TLine, keyof LineRecord>;

export type LineIdAllocator = () => string;

export interface DeletedLineUndoToken<TLine extends LineRecord> {
  rowId: string;
  index: number;
  snapshot: TLine;
  revision: number;
}

export interface EditableLineState<TLine extends LineRecord> {
  rows: TLine[];
  selection: Set<string>;
  pendingDeletions: Record<string, DeletedLineUndoToken<TLine>>;
  dirty: boolean;
  revision: number;
}

export type LineMutation<TLine extends LineRecord> =
  | { type: 'append-empty'; payload: LineValues<TLine> }
  | { type: 'append-candidate'; payload: LineValues<TLine> }
  | { type: 'copy'; payload: { rowId: string } }
  | { type: 'update'; payload: { rowId: string; changes: Partial<LineValues<TLine>> } }
  | { type: 'select'; payload: { rowId: string; selected: boolean } }
  | { type: 'remove-draft'; payload: { rowId: string } }
  | { type: 'mark-delete'; payload: { rowId: string } }
  | { type: 'undo-delete'; payload: DeletedLineUndoToken<TLine> };

export type LineMutationPermission =
  | { allowed: true }
  | { allowed: false; reason: string };

export type LineMutationPolicy<TLine extends LineRecord> = (input: {
  rows: TLine[];
  mutation: LineMutation<TLine>;
}) => LineMutationPermission;

export type LineMutationOutcome<TLine extends LineRecord> =
  | { kind: 'applied' }
  | { kind: 'marked-delete'; undoToken: DeletedLineUndoToken<TLine> }
  | { kind: 'undone-delete'; rowId: string }
  | { kind: 'stale-undo'; rowId: string; expectedRevision: number; actualRevision: number }
  | { kind: 'ignored'; reason: 'missing-row' | 'invalid-state' | 'duplicate-row-id' | 'invalid-row-id' };

export interface EditableLineResult<TLine extends LineRecord> {
  state: EditableLineState<TLine>;
  outcome: LineMutationOutcome<TLine>;
}

export interface LineMinorUnitSummary {
  activeRowCount: number;
  deletedRowCount: number;
  totalMinorUnits: number;
}
