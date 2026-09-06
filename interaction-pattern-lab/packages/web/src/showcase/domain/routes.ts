export type RootRoute = { kind: 'catalog' } | { kind: 'showcase'; path: string };

export function parseRootRoute(hash: string): RootRoute {
  if (hash !== '#/showcase' && hash !== '#/showcase/' && !hash.startsWith('#/showcase/')) return { kind: 'catalog' };
  const rawPath = hash.slice(1).split('?')[0];
  const path = rawPath === '/showcase' || rawPath === '/showcase/' ? '/showcase/overview' : rawPath;
  return { kind: 'showcase', path };
}
