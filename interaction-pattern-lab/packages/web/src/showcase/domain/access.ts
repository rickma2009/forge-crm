import type { ShowcasePage, ShowcaseRegistry, ShowcaseRoleId } from '../registry/types';

export type PageAccess =
  | { kind: 'allowed'; mode: 'read-write' | 'read-only'; page: ShowcasePage }
  | { kind: 'forbidden' }
  | { kind: 'not-found' };

export function normalizeDemoIdentity(input: string, registry: ShowcaseRegistry): ShowcaseRoleId | null {
  const normalized = input.trim().toLowerCase();
  return registry.roles.some((role) => role.id === normalized) ? normalized as ShowcaseRoleId : null;
}

export function effectiveCapabilities(identity: ShowcaseRoleId | null, registry: ShowcaseRegistry): Set<string> {
  const role = registry.roles.find((candidate) => candidate.id === identity);
  if (!role) return new Set();
  return role.grantMode === 'all-registered'
    ? new Set(registry.capabilities)
    : new Set(role.capabilities ?? []);
}

export function resolvePageAccess(path: string, identity: ShowcaseRoleId | null, registry: ShowcaseRegistry): PageAccess {
  const page = registry.pages.find((candidate) => candidate.path === path);
  if (!page) return { kind: 'not-found' };
  const capabilities = effectiveCapabilities(identity, registry);
  if (!capabilities.has(page.viewCapability)) return { kind: 'forbidden' };
  const operations = page.operations ?? [];
  const canUseEveryOperation = operations.length > 0 && operations.every((operation) => capabilities.has(operation.capability));
  return { kind: 'allowed', mode: canUseEveryOperation ? 'read-write' : 'read-only', page };
}
