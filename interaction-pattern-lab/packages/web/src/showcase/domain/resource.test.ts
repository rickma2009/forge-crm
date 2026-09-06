import { describe, expect, it } from 'vitest';
import { initialResourceState, reduceResourceAction } from './resource';

describe('deterministic resource demo', () => {
  it('TC-410/412: applies permitted maintenance and export without remote effects', () => {
    const maintained = reduceResourceAction(initialResourceState, { type: 'maintain', permitted: true });
    expect(maintained.items[0].status).toBe('已维护');
    expect(maintained.feedback).toBe('资源维护演示已完成');
    const exported = reduceResourceAction(maintained, { type: 'export', permitted: true });
    expect(exported.exportCount).toBe(1);
    expect(exported.feedback).toBe('资源清单导出演示已完成');
  });

  it('TC-EDGE-405/406: denial and configured failure are zero-change failures', () => {
    const denied = reduceResourceAction(initialResourceState, { type: 'maintain', permitted: false });
    expect(denied.items).toEqual(initialResourceState.items);
    expect(denied.feedback).toBe('当前身份只有查看权限，不能维护资源');
    const failed = reduceResourceAction(initialResourceState, { type: 'maintain', permitted: true, fail: true });
    expect(failed.items).toEqual(initialResourceState.items);
    expect(failed.feedback).toBe('资源维护演示失败，请重试或重置');
  });

  it('TC-403: reset restores a fresh deterministic initial state', () => {
    const changed = reduceResourceAction(initialResourceState, { type: 'export', permitted: true });
    expect(reduceResourceAction(changed, { type: 'reset' })).toEqual(initialResourceState);
  });
});
