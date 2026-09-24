import { useCallback, useEffect, useState } from 'react';
import { applyTabAction, type RouteTab, type TabAction } from './model';

export function useRouteTabs({ home, current, activePath, onNavigate }: {
  home: RouteTab;
  /** Supply only a route whose access check has succeeded. */
  current: RouteTab | null;
  activePath: string;
  onNavigate: (path: string) => void;
}) {
  const [tabs, setTabs] = useState<RouteTab[]>(() => [{ ...home, closable: false }]);
  const currentPath = current?.path;
  const currentTitle = current?.title;
  useEffect(() => {
    if (!currentPath || !currentTitle) return;
    setTabs((previous) => {
      const existing = previous.find((tab) => tab.path === currentPath);
      if (!existing) return [...previous, { path: currentPath, title: currentTitle }];
      if (existing.closable === false || existing.title === currentTitle) return previous;
      return previous.map((tab) => tab.path === currentPath ? { ...tab, title: currentTitle } : tab);
    });
  }, [currentPath, currentTitle]);
  const execute = useCallback((action: TabAction, targetPath: string) => {
    const next = applyTabAction(tabs, activePath, targetPath, action);
    setTabs(next.tabs);
    if (next.activePath !== activePath) onNavigate(next.activePath);
  }, [tabs, activePath, onNavigate]);
  return { tabs, execute, refreshKey: tabs.find((tab) => tab.path === activePath)?.refreshKey ?? 0 };
}
