import { lazy, type LazyExoticComponent, type ComponentType } from 'react';
import type { PatternDefinition } from './types';

type DemoComponent = LazyExoticComponent<ComponentType>;

const demoRegistry: Record<PatternDefinition['demoId'], DemoComponent> = {
  'navigation-shell': lazy(() => import('../demos/navigation-shell/NavigationShellDemo')
    .then((module) => ({ default: module.NavigationShellDemo }))),
  'record-workspace': lazy(() => import('../demos/record-workspace/RecordWorkspaceDemo')
    .then((module) => ({ default: module.RecordWorkspaceDemo }))),
};

export function getDemo(demoId: PatternDefinition['demoId']): DemoComponent {
  return demoRegistry[demoId];
}
