import { ApiException } from '../http/api-exceptions';

export function assertRoleParent(rows: Array<{ id: string; parentId: string | null }>, id: string | null, parentId: string | null): void {
  const parents = new Map(rows.map((row) => [row.id, row.parentId]));
  const seen = new Set<string>(id ? [id] : []);
  let cursor = parentId;
  while (cursor) {
    if (seen.has(cursor)) throw new ApiException('BAD_REQUEST', 409, '不能把角色移动到自身或下级角色');
    if (!parents.has(cursor)) throw new ApiException('BAD_REQUEST', 400, '上级角色不存在或不属于当前应用');
    seen.add(cursor);
    cursor = parents.get(cursor) ?? null;
  }
}

export function assertRolePeriod(begin: Date | null, end: Date | null): void {
  if (begin && end && begin >= end) throw new ApiException('BAD_REQUEST', 400, '有效期结束必须晚于开始');
}
