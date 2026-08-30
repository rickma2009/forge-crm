import scenarioContract from './bulk-assignment.scenarios.json';
import { bulkAssignmentReducer, createBulkAssignmentState, getFilteredItems } from './BulkAssignmentModel';

function reduce(scenarioId: string, actions: Parameters<typeof bulkAssignmentReducer>[1][]) {
  return actions.reduce(bulkAssignmentReducer, createBulkAssignmentState(scenarioId));
}

describe('VAL-002 Bulk Assignment Module', () => {
  it('TC-307/308/309: 当前页、全部查询结果和查询变化具有明确选择语义', () => {
    let state = createBulkAssignmentState('partial-success');
    state = bulkAssignmentReducer(state, { type: 'select-page' });
    expect(state.selection.scope).toBe('page');
    expect(state.selection.ids).toHaveLength(5);
    state = bulkAssignmentReducer(state, { type: 'select-all-results' });
    expect(state.selection.scope).toBe('query');
    expect(state.selection.ids).toHaveLength(12);
    state = bulkAssignmentReducer(state, { type: 'change-query', query: '北区' });
    expect(state.selection.ids).toEqual([]);
    expect(state.statusMessage).toMatch(/范围变化/);
    expect(getFilteredItems(state)).toHaveLength(4);
  });

  it('TC-310/EDGE-301: 预检查逐项给出一个主结果且汇总守恒', () => {
    const state = reduce('partial-success', [
      { type: 'select-page' },
      { type: 'set-owner', ownerId: 'owner-lin' },
      { type: 'precheck' },
    ]);
    expect(state.precheck).toHaveLength(5);
    expect(state.precheck.filter((item) => item.status === 'executable')).toHaveLength(3);
    expect(state.precheck.filter((item) => item.status === 'rejected')).toHaveLength(2);
    expect(state.precheck.find((item) => item.itemId === 'WI-002')?.reasonCode).toBe('RECORD_LOCKED');
  });

  it('TC-311/313: 取消零变更，确认后结果分别统计成功、失败与未处理', () => {
    const prepared = reduce('partial-success', [
      { type: 'select-page' },
      { type: 'set-owner', ownerId: 'owner-lin' },
      { type: 'precheck' },
      { type: 'open-confirmation' },
    ]);
    const cancelled = bulkAssignmentReducer(prepared, { type: 'cancel-confirmation' });
    expect(cancelled.items).toEqual(prepared.items);
    const result = bulkAssignmentReducer(prepared, { type: 'execute' });
    expect(result.result).toMatchObject({ outcome: 'partial-success', successCount: 2, failureCount: 3, unprocessedCount: 0 });
    expect(result.items.find((item) => item.id === 'WI-001')?.ownerId).toBe('owner-lin');
    expect(result.items.find((item) => item.id === 'WI-003')?.ownerId).toBe('owner-chen');
  });

  it('TC-314: 系统失败零变更并保留上下文，重试产生确定性结果', () => {
    const prepared = reduce('system-failure-first', [
      { type: 'select-page' },
      { type: 'set-owner', ownerId: 'owner-lin' },
      { type: 'precheck' },
      { type: 'open-confirmation' },
    ]);
    const failed = bulkAssignmentReducer(prepared, { type: 'execute' });
    expect(failed.result?.outcome).toBe('system-failure');
    expect(failed.items).toEqual(prepared.items);
    expect(failed.selection).toEqual(prepared.selection);
    expect(failed.targetOwnerId).toBe('owner-lin');
    const retried = bulkAssignmentReducer(failed, { type: 'retry' });
    expect(retried.result?.outcome).toBe('partial-success');
  });

  it('TC-317: 技术栈中立场景契约包含动作、可观察结果、失败代码和键盘路径', () => {
    expect(scenarioContract.version).toBe(1);
    expect(scenarioContract.scenarios.map((scenario) => scenario.id)).toEqual(['partial-success', 'all-success', 'system-failure-first', 'empty']);
    expect(scenarioContract.failureCodes).toEqual(expect.arrayContaining(['RECORD_LOCKED', 'STATE_INCOMPATIBLE', 'CONCURRENT_CHANGE', 'SYSTEM_UNAVAILABLE']));
    expect(scenarioContract.keyboardPath).toEqual(expect.arrayContaining(['Tab', 'Space', 'Enter', 'Escape']));
  });
});
