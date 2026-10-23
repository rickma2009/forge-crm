export const digitalEmployeePreviewPath = '/showcase/digital-employee';
export const digitalEmployeePreviewOrigin = 'http://127.0.0.1:5175';
export function digitalEmployeePreviewEnabled(hostname: string, development: boolean) {
  return development && (hostname === 'localhost' || hostname === '127.0.0.1');
}
