import { createEditableLineState, reduceEditableLines } from '../../components/editable-line-grid/reducer';
import type { LineRecord } from '../../components/editable-line-grid/types';
import type { DocumentAction, DocumentResult, DocumentSaveOutcome, DocumentState } from './types';

export function createDocumentState<THeader, TLine extends LineRecord>(input: {
  mode: DocumentState<THeader, TLine>['mode'];
  header: THeader;
  lines: TLine[];
  businessStatus: string;
}): DocumentState<THeader, TLine> {
  return {
    ...input,
    phase: 'clean',
    lines: createEditableLineState(input.lines),
    headerErrors: [],
    lineErrors: [],
    outcome: null,
    activeSaveRequestId: null,
    nextSaveRequestId: 1,
  };
}

export function reduceDocument<THeader, TLine extends LineRecord>(
  state: DocumentState<THeader, TLine>,
  action: DocumentAction<THeader, TLine>,
): DocumentResult<THeader, TLine> {
  switch (action.type) {
    case 'change-header':
      if (state.mode === 'view') return ignored(state, 'view-mode');
      if (state.phase === 'saving') return ignored(state, 'saving');
      return applied({ ...state, header: action.header, phase: 'dirty', outcome: null });
    case 'mutate-lines': {
      if (state.mode === 'view') return ignored(state, 'view-mode');
      if (state.phase === 'saving') return ignored(state, 'saving');
      const result = reduceEditableLines(state.lines, action.mutation, action.allocateId);
      if (result.outcome.kind === 'ignored') return { state, outcome: { kind: 'applied' } };
      return applied({ ...state, lines: result.state, phase: result.state.dirty ? 'dirty' : state.phase, outcome: null });
    }
    case 'begin-save':
      if (state.mode === 'view') return ignored(state, 'view-mode');
      if (state.phase === 'saving') return { state, outcome: { kind: 'ignored', reason: 'already-saving' } };
      return applied({
        ...state,
        phase: 'saving',
        headerErrors: [],
        lineErrors: [],
        outcome: null,
        activeSaveRequestId: state.nextSaveRequestId,
        nextSaveRequestId: state.nextSaveRequestId + 1,
      });
    case 'resolve-save':
      if (state.phase !== 'saving' || state.activeSaveRequestId === null || (action.saveRequestId !== undefined && action.saveRequestId !== state.activeSaveRequestId)) {
        return ignored(state, 'stale-save');
      }
      return resolveSave(state, action.outcome);
    case 'request-leave':
      if (state.phase === 'saving') return ignored(state, 'saving');
      if (state.phase === 'clean') return { state, outcome: { kind: 'leave-confirmed' } };
      if (state.phase === 'confirm-leave') return { state, outcome: { kind: 'applied' } };
      return applied({ ...state, phase: 'confirm-leave' });
    case 'cancel-leave':
      return applied({ ...state, phase: 'dirty' });
    case 'continue-leave':
      return { state, outcome: { kind: 'leave-confirmed' } };
    case 'set-mode':
      if (state.phase === 'saving') return ignored(state, 'saving');
      return applied({ ...state, mode: action.mode });
    case 'set-business-status':
      return applied({ ...state, businessStatus: action.businessStatus });
  }
}

function resolveSave<THeader, TLine extends LineRecord>(
  state: DocumentState<THeader, TLine>,
  outcome: DocumentSaveOutcome<THeader>,
): DocumentResult<THeader, TLine> {
  if (outcome.kind === 'validation-failed') {
    return applied({
      ...state,
      phase: 'dirty',
      headerErrors: outcome.headerErrors,
      lineErrors: outcome.lineErrors,
      outcome: { kind: 'validation-failed', errors: [...outcome.headerErrors, ...outcome.lineErrors].map((error) => ({ id: error.id, message: error.message })) },
      activeSaveRequestId: null,
    });
  }

  const saved = outcome.kind === 'success';
  return applied({
    ...state,
    phase: saved ? 'clean' : 'dirty',
    lines: saved ? { ...state.lines, dirty: false } : state.lines,
    outcome,
    activeSaveRequestId: null,
  });
}

function applied<THeader, TLine extends LineRecord>(state: DocumentState<THeader, TLine>): DocumentResult<THeader, TLine> {
  return { state, outcome: { kind: 'applied' } };
}

function ignored<THeader, TLine extends LineRecord>(
  state: DocumentState<THeader, TLine>,
  reason: Extract<DocumentResult<THeader, TLine>['outcome'], { kind: 'ignored' }>['reason'],
): DocumentResult<THeader, TLine> {
  return { state, outcome: { kind: 'ignored', reason } };
}
