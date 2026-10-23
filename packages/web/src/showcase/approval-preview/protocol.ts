/** A local prototype bridge, never a business authorization protocol. */
export const approvalPreviewPath = '/showcase/approval-center';
export const approvalPreviewOrigin = 'http://127.0.0.1:5174';
export const approvalChannel = 'forge-approval-preview';
export function previewEnabled(hostname: string, development: boolean) {
  return development && (hostname === 'localhost' || hostname === '127.0.0.1');
}
export function validApprovalRoute(value: unknown): value is string {
  return typeof value === 'string' && (/^(todo|done|started|cc|definitions|monitor|new)$/.test(value)
    || /^definition\/(expense|leave|quote|sales|payment|incident)$/.test(value)
    || /^(instance|document|new)\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value));
}
export function approvalRoute(path: string): string | null {
  if (path === approvalPreviewPath) return 'todo';
  if (!path.startsWith(approvalPreviewPath + '/')) return null;
  const route = path.slice(approvalPreviewPath.length + 1);
  return validApprovalRoute(route) ? route : null;
}
export function approvalHostPath(route: string) { return route === 'todo' ? approvalPreviewPath : `${approvalPreviewPath}/${route}`; }
export type PreviewMessage = { channel: typeof approvalChannel; version: 1; type: 'navigate'; route: string }
  | { channel: typeof approvalChannel; version: 1; type: 'state'; route: string; title: string; count: number; dirty: boolean };
export function parsePreviewMessage(event: Pick<MessageEvent, 'origin' | 'source' | 'data'>, frame: Window | null): PreviewMessage | null {
  if (!frame || event.source !== frame || event.origin !== approvalPreviewOrigin) return null;
  const d = event.data;
  if (!d || typeof d !== 'object' || d.channel !== approvalChannel || d.version !== 1 || !validApprovalRoute(d.route)) return null;
  if (d.type === 'navigate') return d;
  if (d.type !== 'state' || typeof d.title !== 'string' || !d.title.trim() || d.title.length > 100 || typeof d.dirty !== 'boolean' || !Number.isInteger(d.count) || d.count < 0 || d.count > 100000) return null;
  return d;
}
