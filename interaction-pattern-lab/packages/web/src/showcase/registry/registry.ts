import registryData from './showcase-registry.data.json';
import { validateShowcaseRegistry } from '../../../../../scripts/showcase-registry-validation.mjs';
import type { PageRendererKey, ShowcaseRegistry } from './types';

export const showcaseRendererKeys: ReadonlySet<PageRendererKey> = new Set(['overview', 'resource-catalog', 'customer-directory', 'dictionary-admin', 'list-view-admin', 'sales-order-prototype', 'personal-workbench', 'master-detail-workbench', 'bom-scenario', 'description']);
export const showcaseIconKeys = new Set([
  'portal', 'overview', 'foundation', 'palette', 'text', 'layout', 'icons', 'components', 'action',
  'form', 'table', 'feedback', 'pages', 'list', 'filter', 'detail', 'split', 'workbench',
  'interaction', 'state', 'scenario', 'settings', 'user', 'role', 'lock', 'menu', 'log', 'resource', 'data',
]);

export const showcaseRegistry = registryData as ShowcaseRegistry;
export { validateShowcaseRegistry };
