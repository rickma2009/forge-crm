export type RootRoute = { kind: 'showcase'; path: string };

export function parseRootRoute(hash: string): RootRoute {
  if (hash !== '#/showcase' && hash !== '#/showcase/' && !hash.startsWith('#/showcase/')) return { kind: 'showcase', path: '/showcase/customers' };
  const rawPath = hash.slice(1).split('?')[0];
  const path = rawPath === '/showcase' || rawPath === '/showcase/' ? '/showcase/customers' : rawPath;
  return { kind: 'showcase', path };
}
