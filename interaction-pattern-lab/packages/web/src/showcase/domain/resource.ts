export interface ResourceItem {
  id: string;
  name: string;
  category: string;
  status: '可用' | '已维护';
}

export interface ResourceState {
  items: ResourceItem[];
  exportCount: number;
  feedback: string;
}

export type ResourceAction =
  | { type: 'maintain' | 'export'; permitted: boolean; fail?: boolean }
  | { type: 'reset' };

export const initialResourceState: ResourceState = {
  items: [
    { id: 'RES-001', name: '列表页骨架', category: '页面模板', status: '可用' },
    { id: 'RES-002', name: '状态反馈组', category: '基础组件', status: '可用' },
    { id: 'RES-003', name: '分组导航', category: '交互模式', status: '可用' },
  ],
  exportCount: 0,
  feedback: '',
};

export function reduceResourceAction(state: ResourceState, action: ResourceAction): ResourceState {
  if (action.type === 'reset') return structuredClone(initialResourceState);
  const operation = action.type === 'maintain' ? '资源维护' : '资源清单导出';
  if (!action.permitted) {
    return { ...state, feedback: `当前身份只有查看权限，不能${action.type === 'maintain' ? '维护资源' : '导出清单'}` };
  }
  if (action.fail) return { ...state, feedback: `${operation}演示失败，请重试或重置` };
  if (action.type === 'maintain') {
    return {
      ...state,
      items: state.items.map((item, index) => index === 0 ? { ...item, status: '已维护' } : item),
      feedback: '资源维护演示已完成',
    };
  }
  return { ...state, exportCount: state.exportCount + 1, feedback: '资源清单导出演示已完成' };
}
