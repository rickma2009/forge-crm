export type ShowcaseRoleId = 'admin' | 'viewer';
export type PageCoverage = 'interactive-slice' | 'description-only';
export type PageRendererKey = 'purchasing' | 'sales-management-prototype' | 'personal-agent' | 'resource-catalog' | 'resource-menu' | 'customer-directory' | 'dictionary-admin' | 'list-view-admin' | 'sales-order-prototype' | 'personal-workbench' | 'master-detail-workbench' | 'bom-scenario' | 'interaction-index' | 'access-users' | 'access-roles' | 'access-permissions' | 'organization-units' | 'employee-directory' | 'product-directory' | 'competitor-directory' | 'opportunity-analytics' | 'opportunity-directory' | 'opportunity-stage-admin' | 'quotation-directory' | 'item-directory' | 'bom-directory' | 'inbound-order-directory' | 'inventory-balance-directory' | 'legal-entity-admin' | 'warehouse-admin' | 'approval-center' | 'workflow-settings' | 'system-code-rules' | 'system-parameters' | 'description';

export interface ShowcaseOperation {
  id: string;
  label: string;
  capability: string;
}

export type ShowcaseQaStatus = 'not-run' | 'recorded';

export interface ShowcaseTraceability {
  directSourceRefs: string[];
  extractionRefs: string[];
  assetRefs: string[];
  implementationRefs: string[];
  qaRefs: string[];
  qaStatus: ShowcaseQaStatus;
}

export interface ShowcasePage {
  id: string;
  path: string;
  title: string;
  summary: string;
  coverage: PageCoverage;
  viewCapability: string;
  rendererKey: PageRendererKey;
  iconKey: string;
  sourceRefs: string[];
  traceability?: ShowcaseTraceability;
  operations?: ShowcaseOperation[];
}

export interface ShowcaseRole {
  id: ShowcaseRoleId;
  grantMode: 'all-registered' | 'explicit';
  capabilities?: string[];
}

export interface ShowcaseNavigationNode {
  id: string;
  label: string;
  iconKey: string;
  keywords?: string[];
  pageId?: string;
  routePath?: string | null;
  allowedActions?: string[];
  children?: ShowcaseNavigationNode[];
}

export interface ShowcaseRegistry {
  version: 1;
  system: { name: string; logoKey: string; defaultPageId: string };
  capabilities: string[];
  roles: ShowcaseRole[];
  pages: ShowcasePage[];
  navigation: { items: ShowcaseNavigationNode[] };
}
