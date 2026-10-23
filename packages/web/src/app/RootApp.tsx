import { useEffect } from 'react';
import { parseRootRoute, stripInteractionSelection } from '../showcase/domain/routes';
import { ShowcaseApp } from '../showcase/ShowcaseApp';
import { previewNavigationGateway } from '../showcase/previewGateway';

export function RootApp() {
  useEffect(() => {
    const update = () => {
      const next = parseRootRoute(window.location.hash);
      const url = new URL(window.location.href);
      url.searchParams.delete('pattern');
      stripInteractionSelection(url, next.path);
      const businessDeepLink = url.hash.startsWith('#/showcase/') && url.hash !== '#/showcase/';
      if (!businessDeepLink) url.hash = '#' + next.path;
      if (url.href !== window.location.href) window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
    };
    update();
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);

  const previewHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const previewKey = new URLSearchParams(window.location.search).get('preview');
  const preview = previewHost && ['sales-order', 'workbench'].includes(previewKey ?? '');
  return <ShowcaseApp gateway={preview ? previewNavigationGateway : undefined} />;
}
