export const CHANNEL = 'forge-approval-preview';
const params = new URLSearchParams(location.search);
const candidate = params.get('hostOrigin');
const origins = ['http://localhost:5173', 'http://127.0.0.1:5173'];
export const embedded = params.get('embedded') === '1' && window.parent !== window && origins.includes(candidate);
export const hostOrigin = embedded ? candidate : null;
export function allowedRoute(value) {
  return typeof value === 'string' && (/^(todo|done|started|cc|definitions|monitor|new)$/.test(value) || /^definition\/(expense|leave|quote|sales|payment|incident)$/.test(value) || /^(instance|document|new)\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value));
}
export function tellHost(type, payload) {
  if (embedded) window.parent.postMessage({channel:CHANNEL,version:1,type,...payload},hostOrigin);
}
export function fromHost(event) {
  const d=event.data;
  return embedded&&event.source===window.parent&&event.origin===hostOrigin&&d?.channel===CHANNEL&&d?.version===1&&d?.type==='route'&&allowedRoute(d.route)&&Number.isInteger(d.refreshKey)&&d.refreshKey>=0 ? d:null;
}
