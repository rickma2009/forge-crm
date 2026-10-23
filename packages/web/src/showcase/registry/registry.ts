import registryData from './showcase-registry.data.json';
import { validateShowcaseRegistry } from '../../../../../scripts/showcase-registry-validation.mjs';
import type { PageRendererKey, ShowcaseRegistry } from './types';

export const showcaseRendererKeys: ReadonlySet<PageRendererKey> = new Set(['purchasing', 'sales-management-prototype', 'personal-agent', 'resource-catalog', 'resource-menu', 'customer-directory', 'dictionary-admin', 'list-view-admin', 'sales-order-prototype', 'personal-workbench', 'master-detail-workbench', 'bom-scenario', 'interaction-index', 'access-users', 'access-roles', 'access-permissions', 'organization-units', 'employee-directory', 'product-directory', 'competitor-directory', 'opportunity-analytics', 'opportunity-directory', 'opportunity-stage-admin', 'quotation-directory', 'item-directory', 'bom-directory', 'inbound-order-directory', 'inventory-balance-directory', 'legal-entity-admin', 'warehouse-admin', 'approval-center', 'workflow-settings', 'system-code-rules', 'system-parameters', 'description']);
export const showcaseIconKeys = new Set([
  'portal', 'overview', 'foundation', 'palette', 'text', 'layout', 'icons', 'components', 'action',
  'form', 'table', 'feedback', 'pages', 'list', 'filter', 'detail', 'split', 'workbench',
  'interaction', 'state', 'scenario', 'settings', 'user', 'users', 'info', 'role', 'lock', 'menu', 'log', 'resource', 'data', 'mail', 'message', 'search',
]);

export const showcaseRegistry = registryData as ShowcaseRegistry;
export { validateShowcaseRegistry };
