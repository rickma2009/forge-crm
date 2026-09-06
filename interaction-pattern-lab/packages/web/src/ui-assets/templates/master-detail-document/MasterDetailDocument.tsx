import { useEffect, useState } from 'react';
import { AsyncOutcome } from '../../components/async-state/AsyncOutcome';
import { EditableLineGrid } from '../../components/editable-line-grid/EditableLineGrid';
import type { LineRecord } from '../../components/editable-line-grid/types';
import { SchemaForm, errorTargetId } from '../../components/schema-form/SchemaForm';
import { ValidationSummary } from '../../components/validation-summary/ValidationSummary';
import { createDocumentState, reduceDocument } from './reducer';
import type { DocumentScenario, DocumentState } from './types';

export function MasterDetailDocument<THeader, TLine extends LineRecord>({ scenario, onLeave }: {
  scenario: DocumentScenario<THeader, TLine>;
  onLeave?: () => void;
}) {
  const [state, setState] = useState<DocumentState<THeader, TLine>>(() => createDocumentState({
    mode: scenario.mode,
    header: scenario.initialState.header,
    lines: scenario.initialState.lines,
    businessStatus: scenario.initialState.businessStatus,
  }));

  useEffect(() => {
    setState((current) => reduceDocument(current, { type: 'set-mode', mode: scenario.mode }).state);
  }, [scenario.mode]);

  const apply = (action: Parameters<typeof reduceDocument<THeader, TLine>>[1]) => {
    const result = reduceDocument(state, action);
    setState(result.state);
    return result;
  };

  const save = async () => {
    if (state.mode === 'view') return;
    const start = reduceDocument(state, { type: 'begin-save' });
    if (start.outcome.kind === 'ignored') return;
    setState(start.state);
    const saveRequestId = start.state.activeSaveRequestId;
    if (saveRequestId === null) return;

    const validation = scenario.validate({ header: state.header, lines: state.lines });
    if (validation.headerErrors.length > 0 || validation.lineErrors.length > 0) {
      setState(reduceDocument(start.state, { type: 'resolve-save', saveRequestId, outcome: { kind: 'validation-failed', ...validation } }).state);
      return;
    }

    try {
      const outcome = await scenario.save({ header: state.header, lines: state.lines.rows });
      setState((current) => reduceDocument(current, { type: 'resolve-save', saveRequestId, outcome }).state);
    } catch {
      setState((current) => reduceDocument(current, {
        type: 'resolve-save', saveRequestId,
        outcome: { kind: 'business-rejected', reason: '模拟保存适配器未完成，请保留当前输入后重试。' },
      }).state);
    }
  };

  const requestLeave = () => {
    const result = apply({ type: 'request-leave' });
    if (result.outcome.kind === 'leave-confirmed') onLeave?.();
  };

  const confirmLeave = () => {
    const result = apply({ type: 'continue-leave' });
    if (result.outcome.kind === 'leave-confirmed') onLeave?.();
  };

  return <article aria-label={`${scenario.title}模板`}>
    <header>
      <h1>{scenario.title}</h1>
      <p>业务状态：{state.businessStatus}</p>
      <p>这是本地可验证模板；保存仅调用注入的模拟适配器，不会写入业务系统。</p>
    </header>

    <ValidationSummary errors={state.headerErrors.map((error) => ({ error, targetId: errorTargetId(error) }))} />
    <SchemaForm
      groups={scenario.headerGroups}
      schema={scenario.headerSchema}
      values={state.header}
      errors={state.headerErrors}
      mode={state.phase === 'saving' ? 'view' : state.mode}
      onChange={(header) => apply({ type: 'change-header', header })}
    />

    <section aria-label="单据行项目">
      <h2>单据行项目</h2>
      <EditableLineGrid
        ariaLabel={`${scenario.title}行项目`}
        rows={state.lines.rows}
        columns={scenario.lineColumns}
        selection={state.lines.selection}
        errors={state.lineErrors}
        summary={scenario.summary(state.lines.rows)}
        candidates={scenario.candidates}
        mode={state.phase === 'saving' ? 'view' : state.mode}
        dirty={state.phase === 'dirty' || state.phase === 'confirm-leave'}
        emptyLine={scenario.emptyLine}
        undoTokens={state.lines.pendingDeletions}
        onMutation={(mutation) => apply({ type: 'mutate-lines', mutation, allocateId: scenario.allocateLineId })}
      />
    </section>

    <AsyncOutcome outcome={state.outcome} />
    <section aria-label="相关记录">
      <h2>相关记录</h2>
      <ul>{scenario.relatedEntries.map((entry) => <li key={entry}>{entry}</li>)}</ul>
    </section>

    <footer data-fixed-document-actions="true" style={{ position: 'sticky', bottom: 0, background: 'var(--surface, white)' }}>
      {state.mode !== 'view' && <button data-fixed-document-actions="true" type="button" disabled={state.phase === 'saving'} onClick={save}>保存模拟单据</button>}
      <button type="button" disabled={state.phase === 'saving'} onClick={requestLeave}>离开单据</button>
    </footer>

    {state.phase === 'confirm-leave' && <section role="dialog" aria-modal="true" aria-label="确认离开">
      <h2>存在未保存变更</h2>
      <p>继续离开将放弃当前本地输入。</p>
      <button type="button" onClick={() => apply({ type: 'cancel-leave' })}>继续编辑</button>
      <button type="button" onClick={confirmLeave}>确认离开</button>
    </section>}
  </article>;
}
