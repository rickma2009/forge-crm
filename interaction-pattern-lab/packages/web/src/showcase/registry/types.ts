export type ShowcaseRoleId = 'admin' | 'viewer';
export type PageCoverage = 'interactive-slice' | 'description-only';
export type PageRendererKey = 'overview' | 'resource-catalog' | 'customer-directory' | 'dictionary-admin' | 'list-view-admin' | 'sales-order-prototype' | 'personal-workbench' | 'master-detail-workbench' | 'description';

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
