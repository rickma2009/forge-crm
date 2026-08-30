export type FailureCode = 'RECORD_LOCKED' | 'STATE_INCOMPATIBLE' | 'OWNER_UNAVAILABLE' | 'CONCURRENT_CHANGE' | 'SYSTEM_UNAVAILABLE';
export type ScenarioId = 'partial-success' | 'all-success' | 'system-failure-first' | 'loading' | 'empty';

export interface WorkItem {
  id: string;
  title: string;
  region: string;
  status: string;
  ownerId: string;
  precheckRejection?: FailureCode;
  executionFailure?: FailureCode;
}

export interface PrecheckItem {
  itemId: string;
  status: 'executable' | 'rejected';
  reasonCode?: FailureCode;
}

export interface ExecutionDetail {
  itemId: string;
  status: 'success' | 'failed' | 'unprocessed';
  reasonCode?: FailureCode;
}

export interface ExecutionResult {
  outcome: 'all-success' | 'partial-success' | 'system-failure';
  successCount: number;
  failureCount: number;
  unprocessedCount: number;
  details: ExecutionDetail[];
  reasonCode?: FailureCode;
}

export interface BulkAssignmentState {
  scenarioId: ScenarioId;
  loading: boolean;
  query: string;
  page: number;
  pageSize: number;
  items: WorkItem[];
  selection: { scope: 'none' | 'page' | 'query' | 'failed'; ids: string[] };
  targetOwnerId: string;
  precheck: PrecheckItem[];
  confirmationOpen: boolean;
  result: ExecutionResult | null;
  executionAttempt: number;
  statusMessage: string;
}

export type BulkAssignmentAction =
  | { type: 'set-scenario'; scenarioId: ScenarioId }
  | { type: 'change-query'; query: string }
  | { type: 'select-page' }
  | { type: 'select-all-results' }
  | { type: 'clear-selection' }
  | { type: 'select-failed' }
  | { type: 'set-owner'; ownerId: string }
  | { type: 'precheck' }
  | { type: 'open-confirmation' }
  | { type: 'cancel-confirmation' }
  | { type: 'execute' }
  | { type: 'retry' }
  | { type: 'reset' };

const baseItems: WorkItem[] = [
  { id: 'WI-001', title: '合同资料复核', region: '北区', status: '待处理', ownerId: 'owner-chen' },
  { id: 'WI-002', title: '价格例外核验', region: '东区', status: '处理中', ownerId: 'owner-wu', precheckRejection: 'RECORD_LOCKED' },
  { id: 'WI-003', title: '客户归属确认', region: '南区', status: '待处理', ownerId: 'owner-chen', executionFailure: 'CONCURRENT_CHANGE' },
  { id: 'WI-004', title: '交付状态复核', region: '北区', status: '已关闭', ownerId: 'owner-zhao', precheckRejection: 'STATE_INCOMPATIBLE' },
  { id: 'WI-005', title: '开票信息补齐', region: '西区', status: '待处理', ownerId: 'owner-wu' },
  { id: 'WI-006', title: '联系人信息核对', region: '东区', status: '待处理', ownerId: 'owner-zhao' },
  { id: 'WI-007', title: '回款计划确认', region: '北区', status: '待处理', ownerId: 'owner-chen' },
  { id: 'WI-008', title: '项目成员调整', region: '南区', status: '处理中', ownerId: 'owner-wu' },
  { id: 'WI-009', title: '服务等级复核', region: '东区', status: '待处理', ownerId: 'owner-zhao' },
  { id: 'WI-010', title: '报价有效期确认', region: '北区', status: '待处理', ownerId: 'owner-chen' },
  { id: 'WI-011', title: '审批材料补齐', region: '西区', status: '待处理', ownerId: 'owner-wu' },
  { id: 'WI-012', title: '负责人交接确认', region: '南区', status: '待处理', ownerId: 'owner-zhao' },
];

function freshItems(scenarioId: ScenarioId): WorkItem[] {
  return baseItems.map((item) => scenarioId === 'all-success'
    ? { ...item, precheckRejection: undefined, executionFailure: undefined }
    : { ...item });
}

export function createBulkAssignmentState(scenarioId: string = 'partial-success'): BulkAssignmentState {
  const safeScenario = (['partial-success', 'all-success', 'system-failure-first', 'loading', 'empty'].includes(scenarioId) ? scenarioId : 'partial-success') as ScenarioId;
  return {
    scenarioId: safeScenario,
    loading: safeScenario === 'loading',
    query: safeScenario === 'empty' ? '无匹配工作项' : '',
    page: 1,
    pageSize: 5,
    items: safeScenario === 'loading' ? [] : freshItems(safeScenario),
    selection: { scope: 'none', ids: [] },
    targetOwnerId: '',
    precheck: [],
    confirmationOpen: false,
    result: null,
    executionAttempt: 0,
    statusMessage: '',
  };
}

export function getFilteredItems(state: BulkAssignmentState): WorkItem[] {
  const query = state.query.trim().toLocaleLowerCase('zh-CN');
  if (!query) return state.items;
  return state.items.filter((item) => [item.id, item.title, item.region, item.status].join(' ').toLocaleLowerCase('zh-CN').includes(query));
}

export function getCurrentPageItems(state: BulkAssignmentState): WorkItem[] {
  const start = (state.page - 1) * state.pageSize;
  return getFilteredItems(state).slice(start, start + state.pageSize);
}

function runPrecheck(state: BulkAssignmentState): PrecheckItem[] {
  return state.selection.ids.map((itemId) => {
    const item = state.items.find((candidate) => candidate.id === itemId);
    const reasonCode = state.targetOwnerId === 'owner-disabled' ? 'OWNER_UNAVAILABLE' : item?.precheckRejection;
    return reasonCode ? { itemId, status: 'rejected', reasonCode } : { itemId, status: 'executable' };
  });
}

function executePrepared(state: BulkAssignmentState): BulkAssignmentState {
  if (state.scenarioId === 'system-failure-first' && state.executionAttempt === 0) {
    return {
      ...state,
      confirmationOpen: false,
      executionAttempt: 1,
      result: { outcome: 'system-failure', successCount: 0, failureCount: 0, unprocessedCount: state.selection.ids.length, details: state.selection.ids.map((itemId) => ({ itemId, status: 'unprocessed' })), reasonCode: 'SYSTEM_UNAVAILABLE' },
      statusMessage: '系统失败，本次零变更；已保留选择和负责人，可重试。',
    };
  }

  const details: ExecutionDetail[] = state.selection.ids.map((itemId) => {
    const precheck = state.precheck.find((item) => item.itemId === itemId);
    const item = state.items.find((candidate) => candidate.id === itemId);
    if (!precheck) return { itemId, status: 'unprocessed' };
    if (precheck.status === 'rejected') return { itemId, status: 'failed', reasonCode: precheck.reasonCode };
    if (item?.executionFailure) return { itemId, status: 'failed', reasonCode: item.executionFailure };
    return { itemId, status: 'success' };
  });
  const successIds = new Set(details.filter((item) => item.status === 'success').map((item) => item.itemId));
  const successCount = successIds.size;
  const failureCount = details.filter((item) => item.status === 'failed').length;
  const unprocessedCount = details.filter((item) => item.status === 'unprocessed').length;
  return {
    ...state,
    items: state.items.map((item) => successIds.has(item.id) ? { ...item, ownerId: state.targetOwnerId } : item),
    confirmationOpen: false,
    executionAttempt: state.executionAttempt + 1,
    result: { outcome: failureCount === 0 && unprocessedCount === 0 ? 'all-success' : 'partial-success', successCount, failureCount, unprocessedCount, details },
    statusMessage: failureCount === 0 && unprocessedCount === 0 ? `已成功分配 ${successCount} 条工作项。` : `部分成功：成功 ${successCount}，失败 ${failureCount}，未处理 ${unprocessedCount}。`,
  };
}

export function bulkAssignmentReducer(state: BulkAssignmentState, action: BulkAssignmentAction): BulkAssignmentState {
  switch (action.type) {
    case 'set-scenario':
      return createBulkAssignmentState(action.scenarioId);
    case 'change-query':
      return { ...state, query: action.query, page: 1, selection: { scope: 'none', ids: [] }, precheck: [], result: null, confirmationOpen: false, statusMessage: '查询范围变化，原选择已清除。' };
    case 'select-page':
      return { ...state, selection: { scope: 'page', ids: getCurrentPageItems(state).map((item) => item.id) }, precheck: [], result: null, statusMessage: `已选择当前页 ${getCurrentPageItems(state).length} 条。` };
    case 'select-all-results':
      return { ...state, selection: { scope: 'query', ids: getFilteredItems(state).map((item) => item.id) }, precheck: [], result: null, statusMessage: `已选择当前查询全部 ${getFilteredItems(state).length} 条。` };
    case 'clear-selection':
      return { ...state, selection: { scope: 'none', ids: [] }, precheck: [], result: null, confirmationOpen: false, statusMessage: '已清除选择。' };
    case 'select-failed': {
      const ids = state.result?.details.filter((item) => item.status === 'failed').map((item) => item.itemId) ?? [];
      return { ...state, selection: { scope: ids.length ? 'failed' : 'none', ids }, precheck: [], confirmationOpen: false, statusMessage: ids.length ? `已重新选择失败项 ${ids.length} 条。` : '当前没有可重新选择的失败项。' };
    }
    case 'set-owner':
      return { ...state, targetOwnerId: action.ownerId, precheck: [], result: null, confirmationOpen: false };
    case 'precheck':
      return { ...state, precheck: runPrecheck(state), result: null, statusMessage: '预检查完成。' };
    case 'open-confirmation':
      return state.precheck.length ? { ...state, confirmationOpen: true } : state;
    case 'cancel-confirmation':
      return { ...state, confirmationOpen: false, statusMessage: '已取消执行，记录未发生变化。' };
    case 'execute':
    case 'retry':
      return executePrepared(state);
    case 'reset':
      return createBulkAssignmentState(state.scenarioId);
  }
}
