import { DeclarativeDataGrid } from '../../../common/data-grid/DeclarativeDataGrid';
import { useLayoutEffect, useState } from 'react';
import type { DeletedLineUndoToken, LineMutation, LineMutationPermission, LineRecord, LineValues } from './types';

export type EditableLineGridMode = 'create' | 'view' | 'edit';

export interface LineColumn<TLine extends LineRecord> {
  id: keyof LineValues<TLine> & string;
  label: string;
  editable?: boolean;
  inputType?: 'text' | 'number' | 'date';
  getValue: (row: TLine) => unknown;
  format?: (value: unknown, row: TLine) => string;
  parse?: (value: string, row: TLine) => unknown;
}

export interface LineCandidate<TLine extends LineRecord> {
  id: string;
  label: string;
  values: LineValues<TLine>;
}

export interface LineError {
  id: string;
  rowId: string;
  fieldId: string;
  message: string;
}

export interface SummaryItem {
  id: string;
  label: string;
  value: string;
}

export interface EditableLineGridProps<TLine extends LineRecord> {
  ariaLabel: string;
  rows: TLine[];
  columns: LineColumn<TLine>[];
  selection: Set<string>;
  errors: LineError[];
  summary: SummaryItem[];
  mode: EditableLineGridMode;
  dirty: boolean;
  emptyLine: LineValues<TLine>;
  candidates?: LineCandidate<TLine>[];
  undoTokens?: Record<string, DeletedLineUndoToken<TLine>>;
  mutationPolicy?: (mutation: LineMutation<TLine>) => LineMutationPermission;
  onMutation: (mutation: LineMutation<TLine>) => void;
}

interface EditingCell {
  rowId: string;
  columnId: string;
  value: string;
}

export function EditableLineGrid<TLine extends LineRecord>({
  ariaLabel,
  rows,
  columns,
  selection,
  errors,
  summary,
  mode,
  dirty,
  emptyLine,
  candidates = [],
  undoTokens = {},
  mutationPolicy,
  onMutation,
}: EditableLineGridProps<TLine>) {
  const [candidateId, setCandidateId] = useState('');
  const [editing, setEditing] = useState<EditingCell | null>(null);
  const [focusTarget, setFocusTarget] = useState<{ id: string } | null>(null);
  const editableColumns = columns.filter((column) => column.editable && mode !== 'view');
  const permissionFor = (mutation: LineMutation<TLine>): LineMutationPermission => mutationPolicy?.(mutation) ?? { allowed: true };
  const appendEmptyPermission = permissionFor({ type: 'append-empty', payload: emptyLine });
  const candidatePermissions = candidates.map((candidate) => ({
    id: candidate.id,
    permission: permissionFor({ type: 'append-candidate', payload: candidate.values }),
  }));
  const selectedCandidatePermission = candidatePermissions.find((candidate) => candidate.id === candidateId)?.permission ?? { allowed: true as const };
  const allCandidatesBlocked = candidates.length > 0 && candidatePermissions.every((candidate) => !candidate.permission.allowed);
  const copyPermissions = rows
    .filter((row) => row.persistedState !== 'marked-for-deletion')
    .map((row) => permissionFor({ type: 'copy', payload: { rowId: row.rowId } }));
  const blockedReason = [appendEmptyPermission, ...candidatePermissions.map((candidate) => candidate.permission), ...copyPermissions]
    .find((permission) => !permission.allowed)?.reason;

  useLayoutEffect(() => {
    if (!focusTarget) return;
    document.getElementById(focusTarget.id)?.focus();
  }, [focusTarget]);

  const rowLabel = (row: TLine) => String(columns[0]?.getValue(row) ?? row.rowId);
  const editControlId = (rowId: string, columnId: string) => `editable-line-grid-edit-${rowId}-${columnId}`;
  const errorTargetId = (rowId: string, columnId: string) => `editable-line-grid-error-target-${rowId}-${columnId}`;
  const actionControlId = (rowId: string) => `editable-line-grid-actions-${rowId}`;

  const canEdit = (row: TLine, column: LineColumn<TLine>) => column.editable && mode !== 'view' && row.persistedState !== 'marked-for-deletion';
  const unavailableReason = (row: TLine, column: LineColumn<TLine>) => {
    if (row.persistedState === 'marked-for-deletion') return '该行已标记删除。';
    if (mode === 'view') return '当前为查看模式。';
    if (!column.editable) return '字段未配置为可编辑。';
    return '当前不可编辑。';
  };

  const beginEdit = (row: TLine, column: LineColumn<TLine>) => {
    if (!canEdit(row, column)) return;
    const value = String(column.getValue(row) ?? '');
    setEditing({ rowId: row.rowId, columnId: column.id, value });
    setFocusTarget({ id: editControlId(row.rowId, column.id) });
  };

  const commitEdit = (row: TLine, column: LineColumn<TLine>, value: string) => {
    const parsed = column.parse
      ? column.parse(value, row)
      : column.inputType === 'number'
        ? Number(value)
        : value;
    onMutation({ type: 'update', payload: { rowId: row.rowId, changes: { [column.id]: parsed } as Partial<LineValues<TLine>> } });
    setEditing(null);
  };

  const moveToNextCell = (rowId: string, columnId: string) => {
    const row = rows.find((candidate) => candidate.rowId === rowId);
    if (!row) return;
    const index = editableColumns.findIndex((column) => column.id === columnId);
    const next = editableColumns[index + 1];
    if (next) beginEdit(row, next);
    else setFocusTarget({ id: actionControlId(rowId) });
  };

  const activateError = (error: LineError) => {
    const row = rows.find((candidate) => candidate.rowId === error.rowId);
    const column = columns.find((candidate) => candidate.id === error.fieldId);
    if (!row || !column) return;
    if (canEdit(row, column)) beginEdit(row, column);
    else setFocusTarget({ id: errorTargetId(row.rowId, column.id) });
  };

  const addCandidate = () => {
    const candidate = candidates.find((entry) => entry.id === candidateId);
    if (!candidate) return;
    onMutation({ type: 'append-candidate', payload: candidate.values });
    setCandidateId('');
  };

  return <section aria-label={ariaLabel}>
    <style>{`.editable-line-grid-focusable:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }`}</style>
    <div>
      <button className="editable-line-grid-focusable" type="button" disabled={mode === 'view' || !appendEmptyPermission.allowed} onClick={() => onMutation({ type: 'append-empty', payload: emptyLine })}>新增空行</button>
      {candidates.length > 0 && <>
        <label>候选行 <select className="editable-line-grid-focusable" disabled={mode === 'view' || allCandidatesBlocked} value={candidateId} onChange={(event) => setCandidateId(event.target.value)}>
          <option value="">请选择候选项</option>
          {candidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.label}</option>)}
        </select></label>
        <button className="editable-line-grid-focusable" type="button" disabled={mode === 'view' || !candidateId || !selectedCandidatePermission.allowed} onClick={addCandidate}>添加候选行</button>
      </>}
      {blockedReason && <p role="status" aria-label="行项目操作说明">{blockedReason}</p>}
      {dirty && <p role="status">存在未保存的行变更</p>}
    </div>

    {errors.length > 0 && <section aria-label="行校验摘要" role="region">
      <h2>行校验摘要</h2>
      <ul>{errors.map((error) => {
        const row = rows.find((candidate) => candidate.rowId === error.rowId);
        const label = row ? rowLabel(row) : error.rowId;
        const column = columns.find((candidate) => candidate.id === error.fieldId);
        const targetId = row && column
          ? canEdit(row, column) ? editControlId(row.rowId, column.id) : errorTargetId(row.rowId, column.id)
          : undefined;
        return <li key={error.id}><button className="editable-line-grid-focusable" type="button" aria-controls={targetId} onClick={() => activateError(error)}>{label}：{error.message}</button></li>;
      })}</ul>
    </section>}

    <DeclarativeDataGrid aria-label={ariaLabel}>
      <thead><tr>
        <th scope="col">选择</th>
        {columns.map((column) => <th scope="col" key={column.id}>{column.label}</th>)}
        <th scope="col">状态</th>
        <th scope="col">操作</th>
      </tr></thead>
      <tbody>{rows.map((row) => {
        const label = rowLabel(row);
        const marked = row.persistedState === 'marked-for-deletion';
        const copyPermission = permissionFor({ type: 'copy', payload: { rowId: row.rowId } });
        return <tr key={row.rowId} tabIndex={marked ? -1 : 0} aria-label={`${label} ${stateLabel(row.persistedState)}`} onKeyDown={(event) => {
          if (event.key !== 'Enter' || event.target !== event.currentTarget) return;
          const column = editableColumns[0];
          if (column) {
            event.preventDefault();
            beginEdit(row, column);
          }
        }}>
          <td><input className="editable-line-grid-focusable" type="checkbox" aria-label={`选择${label}`} checked={selection.has(row.rowId)} disabled={marked || mode === 'view'} onChange={(event) => onMutation({ type: 'select', payload: { rowId: row.rowId, selected: event.target.checked } })} /></td>
          {columns.map((column) => {
            const isEditing = editing?.rowId === row.rowId && editing.columnId === column.id;
            const value = column.getValue(row);
            const display = column.format ? column.format(value, row) : String(value ?? '');
            const error = errors.find((entry) => entry.rowId === row.rowId && entry.fieldId === column.id);
            const editable = canEdit(row, column);
            return <td key={column.id}>{isEditing
              ? <input className="editable-line-grid-focusable" id={editControlId(row.rowId, column.id)} aria-label={`${label} ${column.label}`} type={column.inputType ?? 'text'} value={editing.value} aria-invalid={Boolean(error)} onChange={(event) => setEditing({ ...editing, value: event.target.value })} onBlur={() => commitEdit(row, column, editing.value)} onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.preventDefault();
                  setEditing(null);
                  setFocusTarget({ id: editControlId(row.rowId, column.id) });
                  return;
                }
                if (event.key === 'Enter' || event.key === 'Tab') {
                  event.preventDefault();
                  commitEdit(row, column, editing.value);
                  if (event.key === 'Tab') moveToNextCell(row.rowId, column.id);
                }
              }} />
              : editable
                ? <button className="editable-line-grid-focusable" id={editControlId(row.rowId, column.id)} type="button" aria-label={`编辑${label}的${column.label}`} onClick={() => beginEdit(row, column)}>{display}</button>
                : <span id={error ? errorTargetId(row.rowId, column.id) : undefined} tabIndex={error ? -1 : undefined} role={error ? 'note' : undefined} aria-label={error ? `${label} ${column.label} 当前不可编辑：${unavailableReason(row, column)}` : undefined}>{display}{error && <>（当前不可编辑：{unavailableReason(row, column)}）</>}</span>}
              {error && <p role="alert">{error.message}</p>}
            </td>;
          })}
          <td>{stateLabel(row.persistedState)}</td>
          <td aria-label={`${label} 操作`} data-fixed-actions="true" style={{ position: 'sticky', right: 0, background: 'var(--surface, white)' }}>
            {row.persistedState === 'marked-for-deletion'
              ? <button className="editable-line-grid-focusable" id={actionControlId(row.rowId)} type="button" onClick={() => {
                const token = undoTokens[row.rowId];
                if (token) onMutation({ type: 'undo-delete', payload: token });
              }}>撤销删除{label}</button>
              : <>
                <button className="editable-line-grid-focusable" id={actionControlId(row.rowId)} type="button" disabled={mode === 'view' || !copyPermission.allowed} onClick={() => onMutation({ type: 'copy', payload: { rowId: row.rowId } })}>复制{label}</button>
                <button className="editable-line-grid-focusable" type="button" disabled={mode === 'view'} onClick={() => onMutation({ type: row.persistedState === 'draft' ? 'remove-draft' : 'mark-delete', payload: { rowId: row.rowId } })}>删除{label}</button>
              </>}
          </td>
        </tr>;
      })}</tbody>
      {summary.length > 0 && <tfoot><tr><th colSpan={columns.length + 2} scope="row">汇总</th><td>{summary.map((item) => <span key={item.id}>{item.label}：{item.value}</span>)}</td></tr></tfoot>}
    </DeclarativeDataGrid>
  </section>;
}

function stateLabel(state: LineRecord['persistedState']) {
  if (state === 'draft') return '草稿';
  if (state === 'marked-for-deletion') return '已标记删除';
  return '已保存';
}
