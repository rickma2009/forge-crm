/** Router- and business-independent page tab operations. */
export interface RouteTab {
  path: string;
  title: string;
  closable?: boolean;
  refreshKey?: number;
}

export type TabAction = 'refresh' | 'close' | 'close-others' | 'close-right' | 'close-all';

export function applyTabAction(tabs: readonly RouteTab[], activePath: string, targetPath: string, action: TabAction) {
  const index = tabs.findIndex((tab) => tab.path === targetPath);
  const unchanged = { tabs: [...tabs], activePath };
  if (index < 0) return unchanged;
  if (action === 'refresh') return {
    tabs: tabs.map((tab) => tab.path === targetPath ? { ...tab, refreshKey: (tab.refreshKey ?? 0) + 1 } : tab),
    activePath: targetPath,
  };
  const remaining = tabs.filter((tab, position) => {
    if (tab.closable === false) return true;
    if (action === 'close') return tab.path !== targetPath;
    if (action === 'close-others') return tab.path === targetPath;
    if (action === 'close-right') return position <= index;
    return false;
  });
  // A host must retain at least one landing page, even if none was marked fixed.
  if (!remaining.length) return unchanged;
  let nextPath = activePath;
  if (action === 'close-all') nextPath = remaining[0].path;
  else if (action === 'close-others') nextPath = targetPath;
  else if (!remaining.some((tab) => tab.path === activePath)) {
    nextPath = action === 'close-right' ? targetPath : remaining[Math.min(index, remaining.length - 1)].path;
  }
  return { tabs: remaining, activePath: nextPath };
}

export function canApplyTabAction(tabs: readonly RouteTab[], activePath: string, targetPath: string, action: TabAction) {
  if (!tabs.some((tab) => tab.path === targetPath)) return false;
  const next = applyTabAction(tabs, activePath, targetPath, action);
  return action === 'refresh' || next.tabs.length !== tabs.length || next.activePath !== activePath;
}
