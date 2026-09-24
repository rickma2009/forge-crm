import { ApiException } from '../http/api-exceptions';

export function expandOrganizationBindings(nodes: Array<{ id: string; parentId: string | null }>, userOrganizationIds: string[], bindings: Array<{ roleId: string; orgId: string; includeDescendants: boolean }>): string[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const ancestors = new Set<string>();
  for (const orgId of userOrganizationIds) {
    let cursor: string | null = orgId;
    const visited = new Set<string>();
    while (cursor && byId.has(cursor)) {
      if (visited.has(cursor)) throw new ApiException('SERVICE_UNAVAILABLE', 503, '组织树结构异常，动态授权已拒绝');
      visited.add(cursor); ancestors.add(cursor); cursor = byId.get(cursor)!.parentId;
    }
  }
  return [...new Set(bindings.filter((b) => byId.has(b.orgId) && (b.includeDescendants ? ancestors.has(b.orgId) : userOrganizationIds.includes(b.orgId))).map((b) => b.roleId))];
}
