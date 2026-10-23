export type RootRoute = { kind: 'showcase'; path: string };

export const interactionIndexPath = '/showcase/style-scenes';
export const retiredInteractionIndexPath = '/showcase/interaction-index';

export function parseRootRoute(hash: string): RootRoute {
  if (hash !== '#/showcase' && hash !== '#/showcase/' && !hash.startsWith('#/showcase/')) return { kind: 'showcase', path: '/showcase/workbench' };
  const rawPath = hash.slice(1).split('?')[0];
  const path = rawPath === '/showcase' || rawPath === '/showcase/'
    ? '/showcase/workbench'
    : rawPath === retiredInteractionIndexPath ? interactionIndexPath : rawPath;
  return { kind: 'showcase', path };
}

/** The template selection belongs to the catalog route, not business-page links. */
export function stripInteractionSelection(url: URL, targetPath: string): void {
  if (targetPath === interactionIndexPath) return;
  url.searchParams.delete('interactionTemplate');
  url.searchParams.delete('interactionCategory');
}

export function showcaseHref(targetPath: string, currentHref = window.location.href): string {
  const url = new URL(currentHref);
  stripInteractionSelection(url, targetPath);
  url.hash = targetPath;
  return `${url.pathname}${url.search}${url.hash}`;
}
