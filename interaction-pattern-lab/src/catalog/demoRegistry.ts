import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

export type DemoComponent = LazyExoticComponent<ComponentType>;

const demoRegistry: Record<string, DemoComponent> = {
  'navigation-shell': lazy(() => import('../demos/navigation-shell/NavigationShellDemo')
    .then((module) => ({ default: module.NavigationShellDemo }))),
  'record-workspace': lazy(() => import('../demos/record-workspace/RecordWorkspaceDemo')
    .then((module) => ({ default: module.RecordWorkspaceDemo }))),
  'bulk-assignment-partial-success': lazy(() => import('../demos/bulk-assignment/BulkAssignmentDemo')
    .then((module) => ({ default: module.BulkAssignmentDemo }))),
};

export function getDemo(demoId: string | null | undefined): DemoComponent | null {
  return demoId ? demoRegistry[demoId] ?? null : null;
}

export function listRegisteredDemoIds(): string[] {
  return Object.keys(demoRegistry);
}
