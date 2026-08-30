import { useEffect, useReducer, useRef } from 'react';
import scenarios from './bulk-assignment.scenarios.json';
import { bulkAssignmentReducer, createBulkAssignmentState, getCurrentPageItems, getFilteredItems, type FailureCode, type ScenarioId } from './BulkAssignmentModel';

const ownerNames: Record<string, string> = {
  'owner-chen': '陈宁', 'owner-wu': '吴桐', 'owner-zhao': '赵敏', 'owner-lin': '林晓', 'owner-disabled': '周远（不可用）',
};

const failureLabels: Record<FailureCode, string> = {
  RECORD_LOCKED: '记录正在被其他人处理',
  STATE_INCOMPATIBLE: '当前状态不允许重新分配',
  OWNER_UNAVAILABLE: '目标负责人不可用',
  CONCURRENT_CHANGE: '执行时记录已发生变化',
  SYSTEM_UNAVAILABLE: '模拟服务暂不可用',
};

export function BulkAssignmentDemo() {
  const [state, dispatch] = useReducer(bulkAssignmentReducer, undefined, () => createBulkAssignmentState('partial-success'));
  const confirmTriggerRef = useRef<HTMLButtonElement>(null);
  const filteredItems = getFilteredItems(state);
  const pageItems = getCurrentPageItems(state);
  const executableCount = state.precheck.filter((item) => item.status === 'executable').length;
  const rejectedCount = state.precheck.filter((item) => item.status === 'rejected').length;

  useEffect(() => {
    if (!state.confirmationOpen) return undefined;
    const cancelOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        dispatch({ type: 'cancel-confirmation' });
        window.setTimeout(() => confirmTriggerRef.current?.focus(), 0);
      }
    };
    window.addEventListener('keydown', cancelOnEscape);
    return () => window.removeEventListener('keydown', cancelOnEscape);
  }, [state.confirmationOpen]);

  const cancelConfirmation = () => {
    dispatch({ type: 'cancel-confirmation' });
    window.setTimeout(() => confirmTriggerRef.current?.focus(), 0);
  };

  return <div className="demo-bulk">
    <header className="demo-bulk-header">
      <div><p className="demo-eyebrow">VAL-002 · DETERMINISTIC DEMO</p><h2>批量分配与部分成功</h2><p>演示数据只存在当前挂载周期；权限、锁定与失败均为交互样例。</p></div>
      <label><span>演示场景</span><select aria-label="演示场景" value={state.scenarioId} onChange={(event) => dispatch({ type: 'set-scenario', scenarioId: event.target.value as ScenarioId })}>
        {scenarios.scenarios.map((scenario) => <option value={scenario.id} key={scenario.id}>{scenario.label}</option>)}
      </select></label>
    </header>

    <section className="demo-bulk-toolbar" aria-label="查询和批量命令">
      <label><span>工作项查询</span><input type="search" aria-label="查询工作项" placeholder="编号、标题、区域或状态" value={state.query} onChange={(event) => dispatch({ type: 'change-query', query: event.target.value })} /></label>
      <div className="demo-bulk-scope-actions">
        <button type="button" onClick={() => dispatch({ type: 'select-page' })} disabled={pageItems.length === 0}>选择当前页</button>
        <button type="button" onClick={() => dispatch({ type: 'select-all-results' })} disabled={filteredItems.length === 0}>选择当前查询全部 {filteredItems.length} 条</button>
        <button type="button" onClick={() => dispatch({ type: 'clear-selection' })} disabled={state.selection.ids.length === 0}>清除选择</button>
      </div>
      <div className="demo-bulk-selection" role="status" aria-live="polite">
        <strong>{state.selection.scope === 'query' ? `全部查询结果 ${state.selection.ids.length} 条` : state.selection.scope === 'page' ? `当前页 ${state.selection.ids.length} 条` : '尚未选择'}</strong>
        <span>{state.statusMessage}</span>
      </div>
    </section>

    <section className="demo-bulk-table-panel">
      <div className="demo-bulk-table-meta"><strong>工作项</strong><span>共 {filteredItems.length} 条，当前页 {pageItems.length} 条</span></div>
      <div className="demo-table-scroll"><table><thead><tr><th scope="col">选择</th><th scope="col">编号</th><th scope="col">工作项</th><th scope="col">区域</th><th scope="col">状态</th><th scope="col">当前负责人</th></tr></thead><tbody>
        {pageItems.map((item) => <tr key={item.id}><td><input type="checkbox" aria-label={`选择 ${item.id}`} checked={state.selection.ids.includes(item.id)} readOnly /></td><td><code>{item.id}</code></td><td>{item.title}</td><td>{item.region}</td><td>{item.status}</td><td>{ownerNames[item.ownerId]}</td></tr>)}
      </tbody></table>{pageItems.length === 0 && <div className="demo-bulk-empty"><strong>没有匹配的工作项</strong><p>修改查询或切换演示场景。</p></div>}</div>
    </section>

    <section className="demo-bulk-action-panel" aria-labelledby="bulk-action-title">
      <div><p className="demo-eyebrow">BULK COMMAND</p><h3 id="bulk-action-title">分配负责人</h3></div>
      <label><span>目标负责人</span><select aria-label="目标负责人" value={state.targetOwnerId} onChange={(event) => dispatch({ type: 'set-owner', ownerId: event.target.value })}>
        <option value="">请选择负责人</option><option value="owner-lin">林晓</option><option value="owner-disabled">周远（不可用）</option>
      </select></label>
      <button type="button" onClick={() => dispatch({ type: 'precheck' })} disabled={!state.targetOwnerId || state.selection.ids.length === 0}>执行预检查</button>
      <button ref={confirmTriggerRef} className="demo-primary-button" type="button" onClick={() => dispatch({ type: 'open-confirmation' })} disabled={state.precheck.length === 0}>确认执行批量分配</button>
    </section>

    {state.precheck.length > 0 && <section className="demo-bulk-precheck" aria-labelledby="precheck-title"><div className="demo-bulk-result-heading"><div><p className="demo-eyebrow">PRECHECK</p><h3 id="precheck-title">预检查结果</h3></div><div className="demo-bulk-counts"><strong>可执行 {executableCount}</strong><strong>拒绝 {rejectedCount}</strong></div></div><ul>
      {state.precheck.map((check) => <li key={check.itemId} className={check.status === 'rejected' ? 'is-failed' : 'is-success'}><code>{check.itemId}</code><span>{check.status === 'executable' ? '可执行' : failureLabels[check.reasonCode!]}</span>{check.reasonCode && <code>{check.reasonCode}</code>}</li>)}
    </ul></section>}

    {state.result && <ExecutionResultPanel result={state.result} onRetry={() => dispatch({ type: 'retry' })} />}

    {state.confirmationOpen && <div className="demo-bulk-dialog-backdrop"><div role="dialog" aria-modal="true" aria-labelledby="confirm-title" className="demo-bulk-dialog">
      <p className="demo-eyebrow">CONFIRM SNAPSHOT</p><h3 id="confirm-title">确认批量分配</h3><p>将预检查快照中的 {state.selection.ids.length} 条工作项分配给 <strong>{ownerNames[state.targetOwnerId]}</strong>。拒绝项不会进入执行。</p>
      <dl><div><dt>选择范围</dt><dd>{state.selection.scope === 'query' ? '当前查询全部结果' : '当前页'}</dd></div><div><dt>可执行 / 拒绝</dt><dd>{executableCount} / {rejectedCount}</dd></div></dl>
      <div className="demo-bulk-dialog-actions"><button type="button" onClick={cancelConfirmation}>取消</button><button type="button" className="demo-primary-button" onClick={() => dispatch({ type: 'execute' })}>执行分配</button></div>
    </div></div>}
  </div>;
}

function ExecutionResultPanel({ result, onRetry }: { result: NonNullable<ReturnType<typeof createBulkAssignmentState>['result']>; onRetry: () => void }) {
  const title = result.outcome === 'all-success' ? '全部成功' : result.outcome === 'system-failure' ? '系统失败 · 零变更' : '部分成功';
  return <section className={`demo-bulk-result is-${result.outcome}`} aria-labelledby="execution-result-title"><div className="demo-bulk-result-heading"><div><p className="demo-eyebrow">EXECUTION RESULT</p><h3 id="execution-result-title">{title}</h3></div><div className="demo-bulk-counts"><strong>成功 {result.successCount}</strong><strong>失败 {result.failureCount}</strong><strong>未处理 {result.unprocessedCount}</strong></div></div>
    {result.reasonCode && <p><code>{result.reasonCode}</code>：{failureLabels[result.reasonCode]}。本次没有记录发生变化。</p>}
    <ul>{result.details.map((detail) => <li key={detail.itemId} className={`is-${detail.status}`}><code>{detail.itemId}</code><span>{detail.status === 'success' ? '负责人已更新' : detail.status === 'unprocessed' ? '未处理' : failureLabels[detail.reasonCode!]}</span>{detail.reasonCode && <code>{detail.reasonCode}</code>}</li>)}</ul>
    {result.outcome === 'system-failure' && <button type="button" onClick={onRetry}>重试本次执行</button>}
  </section>;
}
