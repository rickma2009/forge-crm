export interface ResourceTreeItem { id: string; parentId: string | null; sortNo: number }
export type ResourceDropPosition = 'before' | 'after' | 'child';

const descendantsOf = (items: ResourceTreeItem[], id: string): Set<string> => {
  const result = new Set<string>();
  const visit = (parentId: string) => items.filter((item) => item.parentId === parentId).forEach((item) => { if (!result.has(item.id)) { result.add(item.id); visit(item.id); } });
  visit(id);
  return result;
};

export function moveResourceNode<T extends ResourceTreeItem>(items: T[], sourceId: string, targetId: string, position: ResourceDropPosition): T[] {
  const source = items.find((item) => item.id === sourceId);
  const target = items.find((item) => item.id === targetId);
  if (!source || !target) throw new Error('资源节点不存在');
  if (sourceId === targetId || descendantsOf(items, sourceId).has(targetId)) throw new Error('不能移动到自身或其子节点下');
  const parentId = position === 'child' ? target.id : target.parentId;
  const oldParentId = source.parentId;
  const without = items.filter((item) => item.id !== sourceId);
  const targetSiblings = without.filter((item) => item.parentId === parentId).sort((a, b) => a.sortNo - b.sortNo || a.id.localeCompare(b.id));
  const targetIndex = position === 'child' ? targetSiblings.length : targetSiblings.findIndex((item) => item.id === targetId) + (position === 'after' ? 1 : 0);
  targetSiblings.splice(Math.max(0, targetIndex), 0, { ...source, parentId } as T);
  const orders = new Map<string, { parentId: string | null; sortNo: number }>();
  targetSiblings.forEach((item, index) => orders.set(item.id, { parentId, sortNo: (index + 1) * 10 }));
  if (oldParentId !== parentId) without.filter((item) => item.parentId === oldParentId).sort((a, b) => a.sortNo - b.sortNo || a.id.localeCompare(b.id)).forEach((item, index) => orders.set(item.id, { parentId: oldParentId, sortNo: (index + 1) * 10 }));
  return items.map((item) => ({ ...item, ...(orders.get(item.id) ?? {}) }));
}

export function visibleResourceIds(items: ResourceTreeItem[], expanded: Set<string>): string[] {
  const children = new Map<string | null, ResourceTreeItem[]>();
  items.forEach((item) => children.set(item.parentId, [...(children.get(item.parentId) ?? []), item]));
  const result: string[] = [];
  const visit = (parentId: string | null) => (children.get(parentId) ?? []).sort((a, b) => a.sortNo - b.sortNo || a.id.localeCompare(b.id)).forEach((item) => { result.push(item.id); if (expanded.has(item.id)) visit(item.id); });
  visit(null);
  return result;
}
