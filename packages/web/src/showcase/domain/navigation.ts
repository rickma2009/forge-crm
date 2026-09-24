import { effectiveCapabilities } from './access';
import type { ShowcaseNavigationNode, ShowcaseRegistry, ShowcaseRoleId } from '../registry/types';

export interface VisibleNavigation {
  items: ShowcaseNavigationNode[];
}

export interface FilteredNavigation {
  items: ShowcaseNavigationNode[];
}

function projectNode(node: ShowcaseNavigationNode, canViewPage: (pageId: string) => boolean): ShowcaseNavigationNode | null {
  if (node.pageId) return canViewPage(node.pageId) ? { ...node } : null;
  const children = (node.children ?? [])
    .map((child) => projectNode(child, canViewPage))
    .filter((child): child is ShowcaseNavigationNode => child !== null);
  return children.length > 0 ? { ...node, children } : null;
}

export function projectVisibleNavigation(identity: ShowcaseRoleId | null, registry: ShowcaseRegistry): VisibleNavigation {
  const capabilities = effectiveCapabilities(identity, registry);
  const pageById = new Map(registry.pages.map((page) => [page.id, page]));
  const canViewPage = (pageId: string) => {
    const page = pageById.get(pageId);
    return Boolean(page && capabilities.has(page.viewCapability));
  };
  const items = registry.navigation.items
    .map((node) => projectNode(node, canViewPage))
    .filter((node): node is ShowcaseNavigationNode => node !== null);
  return { items };
}

function matches(node: ShowcaseNavigationNode, query: string) {
  return [node.label, ...(node.keywords ?? [])].some((value) => value.toLocaleLowerCase().includes(query));
}

function filterNode(node: ShowcaseNavigationNode, query: string): ShowcaseNavigationNode | null {
  if (matches(node, query)) return { ...node };
  const children = (node.children ?? [])
    .map((child) => filterNode(child, query))
    .filter((child): child is ShowcaseNavigationNode => child !== null);
  return children.length > 0 ? { ...node, children } : null;
}

export function filterNavigation(navigation: VisibleNavigation, rawQuery: string): FilteredNavigation {
  const query = rawQuery.trim().toLocaleLowerCase();
  if (!query) return { items: navigation.items };
  const items = navigation.items
    .map((node) => filterNode(node, query))
    .filter((node): node is ShowcaseNavigationNode => node !== null);
  return { items };
}
