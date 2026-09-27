export type RootRoute = { kind: 'showcase'; path: string };

export const interactionIndexPath = '/showcase/style-scenes';
export const retiredInteractionIndexPath = '/showcase/interaction-index';

export function parseRootRoute(hash: string): RootRoute {
  if (hash !== '#/showcase' && hash !== '#/showcase/' && !hash.startsWith('#/showcase/')) return { kind: 'showcase', path: '/showcase/customers' };
  const rawPath = hash.slice(1).split('?')[0];
  const path = rawPath === '/showcase' || rawPath === '/showcase/'
    ? '/showcase/customers'
    : rawPath === retiredInteractionIndexPath ? interactionIndexPath : rawPath;
  return { kind: 'showcase', path };
}
