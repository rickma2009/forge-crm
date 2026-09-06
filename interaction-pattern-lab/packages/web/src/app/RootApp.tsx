import { useEffect, useState } from 'react';
import { parseRootRoute } from '../showcase/domain/routes';
import { ShowcaseApp } from '../showcase/ShowcaseApp';
import { previewNavigationGateway } from '../showcase/previewGateway';
import { App } from './App';

export function RootApp() {
  const [route, setRoute] = useState(() => parseRootRoute(window.location.hash));

  useEffect(() => {
    const update = () => setRoute(parseRootRoute(window.location.hash));
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);

  const previewHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const previewKey = new URLSearchParams(window.location.search).get('preview');
  const preview = previewHost && ['sales-order', 'workbench'].includes(previewKey ?? '');
  return route.kind === 'showcase' ? <ShowcaseApp gateway={preview ? previewNavigationGateway : undefined} /> : <App />;
}
