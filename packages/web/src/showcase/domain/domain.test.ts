import { describe, expect, it } from 'vitest';
import { effectiveCapabilities, normalizeDemoIdentity, resolvePageAccess } from './access';
import { filterNavigation, projectVisibleNavigation } from './navigation';
import { parseRootRoute } from './routes';
import { showcaseRegistry } from '../registry/registry';

describe('showcase identity and access', () => {
  it('TC-401/402: normalizes only the two registered demo identities', () => {
    expect(normalizeDemoIdentity(' Admin ', showcaseRegistry)).toBe('admin');
    expect(normalizeDemoIdentity('VIEWER', showcaseRegistry)).toBe('viewer');
    expect(normalizeDemoIdentity('', showcaseRegistry)).toBeNull();
    expect(normalizeDemoIdentity('operator', showcaseRegistry)).toBeNull();
  });

  it('TC-411/412: derives admin dynamically and viewer explicitly', () => {
    expect(effectiveCapabilities('admin', showcaseRegistry)).toEqual(new Set(showcaseRegistry.capabilities));
    expect(effectiveCapabilities('viewer', showcaseRegistry).has('showcase.resource.view')).toBe(true);
    expect(effectiveCapabilities('viewer', showcaseRegistry).has('showcase.resource.manage')).toBe(false);
    expect(effectiveCapabilities(null, showcaseRegistry)).toEqual(new Set());
  });

  it('TC-415: grants a newly registered capability to admin but not viewer', () => {
    const registry = structuredClone(showcaseRegistry);
    registry.capabilities.push('showcase.future.view');
    expect(effectiveCapabilities('admin', registry).has('showcase.future.view')).toBe(true);
    expect(effectiveCapabilities('viewer', registry).has('showcase.future.view')).toBe(false);
  });

  it('TC-413/415: separates writable, read-only, forbidden and not-found without leaking page data', () => {
    expect(resolvePageAccess('/showcase/system/resources', 'admin', showcaseRegistry)).toMatchObject({ kind: 'allowed', mode: 'read-write', page: { id: 'system-resources' } });
    expect(resolvePageAccess('/showcase/system/resources', 'viewer', showcaseRegistry)).toMatchObject({ kind: 'allowed', mode: 'read-only', page: { id: 'system-resources' } });
    expect(resolvePageAccess('/showcase/system/users', 'viewer', showcaseRegistry)).toEqual({ kind: 'forbidden' });
    expect(resolvePageAccess('/showcase/does-not-exist', 'admin', showcaseRegistry)).toEqual({ kind: 'not-found' });
  });
});

describe('showcase navigation projection and search', () => {
  it('TC-408/EDGE-402: removes inaccessible leaves before searching and preserves matching ancestors', () => {
    const visible = projectVisibleNavigation('viewer', showcaseRegistry);
    expect(visible.items.find((node) => node.id === 'nav-system')?.children?.map((node) => node.label)).toEqual(['资源目录', '法人管理', '仓库管理']);
    expect(filterNavigation(visible, '用户管理')).toEqual({ items: [] });

    const result = filterNavigation(visible, '资源');
    expect(result.items).toHaveLength(1);
    expect(result.items[0].label).toBe('系统管理');
    expect(result.items[0].children?.map((node) => node.label)).toEqual(['资源目录']);
  });

  it('TC-408: matches registered keywords while retaining the target page', () => {
    const result = filterNavigation(projectVisibleNavigation('admin', showcaseRegistry), '客户');
    expect(result.items.map((node) => node.label)).toEqual(['基本信息']);
  });
});

describe('single CRM root route', () => {
  it('normalizes retired locations into CRM without changing valid business routes', () => {
    expect(parseRootRoute('')).toEqual({ kind: 'showcase', path: '/showcase/customers' });
    expect(parseRootRoute('#section')).toEqual({ kind: 'showcase', path: '/showcase/customers' });
    expect(parseRootRoute('#/showcase-preview')).toEqual({ kind: 'showcase', path: '/showcase/customers' });
    expect(parseRootRoute('#/showcase')).toEqual({ kind: 'showcase', path: '/showcase/customers' });
    expect(parseRootRoute('#/showcase/')).toEqual({ kind: 'showcase', path: '/showcase/customers' });
    expect(parseRootRoute('#/showcase/system/users')).toEqual({ kind: 'showcase', path: '/showcase/system/users' });
  });
});
