import registryData from './showcase-registry.data.json';
import { validateShowcaseRegistry } from '../../../../../scripts/showcase-registry-validation.mjs';
import type { PageRendererKey, ShowcaseRegistry } from './types';

export const showcaseRendererKeys: ReadonlySet<PageRendererKey> = new Set(['resource-catalog', 'resource-menu', 'customer-directory', 'dictionary-admin', 'list-view-admin', 'sales-order-prototype', 'personal-workbench', 'master-detail-workbench', 'bom-scenario', 'interaction-index', 'access-users', 'access-roles', 'access-permissions', 'organization-units', 'employee-directory', 'product-directory', 'competitor-directory', 'opportunity-directory', 'opportunity-stage-admin', 'quotation-directory', 'item-directory', 'inbound-order-directory', 'inventory-balance-directory', 'legal-entity-admin', 'warehouse-admin', 'system-parameters', 'description']);
export const showcaseIconKeys = new Set([
  'portal', 'overview', 'foundation', 'palette', 'text', 'layout', 'icons', 'components', 'action',
  'form', 'table', 'feedback', 'pages', 'list', 'filter', 'detail', 'split', 'workbench',
  'interaction', 'state', 'scenario', 'settings', 'user', 'users', 'info', 'role', 'lock', 'menu', 'log', 'resource', 'data',
]);

export const showcaseRegistry = registryData as ShowcaseRegistry;
export { validateShowcaseRegistry };
