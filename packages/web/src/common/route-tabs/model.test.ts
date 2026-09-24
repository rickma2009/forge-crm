import { applyTabAction, canApplyTabAction, type RouteTab } from './model';

const tabs: RouteTab[] = [
  { path: '/', title: '首页', closable: false },
  { path: '/a', title: 'A' }, { path: '/b', title: 'B' }, { path: '/c', title: 'C' },
];
describe('common tab operations', () => {
  it.each([
    ['close', '/b', '/b', ['/', '/a', '/c'], '/c'],
    ['close', '/c', '/c', ['/', '/a', '/b'], '/b'],
    ['close', '/b', '/a', ['/', '/b', '/c'], '/b'],
    ['close-others', '/c', '/a', ['/', '/a'], '/a'],
    ['close-right', '/c', '/a', ['/', '/a'], '/a'],
    ['close-right', '/', '/a', ['/', '/a'], '/'],
    ['close-all', '/b', '/b', ['/'], '/'],
  ] as const)('%s from %s on %s synchronizes navigation', (action, active, target, paths, next) => {
    const result = applyTabAction(tabs, active, target, action);
    expect(result.tabs.map((tab) => tab.path)).toEqual(paths);
    expect(result.activePath).toBe(next);
    expect(tabs).toHaveLength(4);
  });
  it('protects fixed tabs even to the right and ignores stale targets', () => {
    const fixed = { path: '/fixed', title: '固定', closable: false };
    expect(applyTabAction([...tabs, fixed], '/fixed', '/a', 'close-right').tabs).toContain(fixed);
    expect(applyTabAction(tabs, '/a', '/missing', 'close-all')).toEqual({ tabs, activePath: '/a' });
    expect(canApplyTabAction(tabs, '/', '/', 'close')).toBe(false);
    expect(canApplyTabAction(tabs, '/c', '/c', 'close-right')).toBe(false);
    expect(canApplyTabAction([tabs[0]], '/', '/', 'close-all')).toBe(false);
  });
  it('refreshes and activates only the target without mutating input', () => {
    const result = applyTabAction(tabs, '/c', '/a', 'refresh');
    expect(result.activePath).toBe('/a');
    expect(result.tabs[1].refreshKey).toBe(1);
    expect(result.tabs[2]).toBe(tabs[2]);
    expect(tabs[1].refreshKey).toBeUndefined();
  });
});
