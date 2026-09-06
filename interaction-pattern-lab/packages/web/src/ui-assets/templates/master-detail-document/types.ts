import type { AsyncOutcomeValue } from '../../components/async-state/AsyncOutcome';
import type { LineColumn, LineError, SummaryItem } from '../../components/editable-line-grid/EditableLineGrid';
import type { FieldError, FormMode } from '../../components/schema-form/types';
import type { EditableLineState, LineIdAllocator, LineMutation, LineRecord } from '../../components/editable-line-grid/types';
import type { FormGroup } from '../../components/schema-form/SchemaForm';
import type { FieldSchema } from '../../components/schema-form/types';

export interface DocumentState<THeader, TLine extends LineRecord> {
  mode: FormMode;
  phase: 'clean' | 'dirty' | 'saving' | 'confirm-leave';
  header: THeader;
  lines: EditableLineState<TLine>;
  businessStatus: string;
  headerErrors: FieldError<THeader>[];
  lineErrors: LineError[];
  outcome: AsyncOutcomeValue | null;
  activeSaveRequestId: number | null;
  nextSaveRequestId: number;
}

export type DocumentSaveOutcome<THeader> =
  | Extract<AsyncOutcomeValue, { kind: 'success' | 'business-rejected' | 'partial-success' }>
  | { kind: 'validation-failed'; headerErrors: FieldError<THeader>[]; lineErrors: LineError[] };

export type DocumentAction<THeader, TLine extends LineRecord> =
  | { type: 'change-header'; header: THeader }
  | { type: 'mutate-lines'; mutation: LineMutation<TLine>; allocateId: LineIdAllocator }
  | { type: 'begin-save' }
  | { type: 'resolve-save'; outcome: DocumentSaveOutcome<THeader>; saveRequestId: number }
  | { type: 'request-leave' }
  | { type: 'cancel-leave' }
  | { type: 'continue-leave' }
  | { type: 'set-mode'; mode: FormMode }
  | { type: 'set-business-status'; businessStatus: string };

export type DocumentOutcome =
  | { kind: 'applied' }
  | { kind: 'ignored'; reason: 'already-saving' | 'saving' | 'view-mode' | 'stale-save' }
  | { kind: 'leave-confirmed' };

export interface DocumentResult<THeader, TLine extends LineRecord> {
  state: DocumentState<THeader, TLine>;
  outcome: DocumentOutcome;
}

export interface DocumentSaveCommand<THeader, TLine extends LineRecord> {
  header: THeader;
  lines: TLine[];
}

export interface DocumentScenario<THeader, TLine extends LineRecord> {
  scenarioId: string;
  title: string;
  mode: FormMode;
  headerGroups: FormGroup[];
  headerSchema: FieldSchema<THeader>[];
  initialState: Pick<DocumentState<THeader, TLine>, 'header' | 'businessStatus'> & { lines: TLine[] };
  lineColumns: LineColumn<TLine>[];
  emptyLine: Omit<TLine, keyof LineRecord>;
  allocateLineId: LineIdAllocator;
  validate: (state: Pick<DocumentState<THeader, TLine>, 'header' | 'lines'>) => { headerErrors: FieldError<THeader>[]; lineErrors: LineError[] };
  save: (command: DocumentSaveCommand<THeader, TLine>) => Promise<DocumentSaveOutcome<THeader>>;
  summary: (lines: TLine[]) => SummaryItem[];
  relatedEntries: string[];
}
