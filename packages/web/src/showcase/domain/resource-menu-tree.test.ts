import { describe, expect, it } from 'vitest';
import { moveResourceNode, visibleResourceIds, type ResourceTreeItem } from './resource-menu-tree';

const rows: ResourceTreeItem[] = [
  { id: 'root', parentId: null, sortNo: 10 },
  { id: 'module-a', parentId: 'root', sortNo: 10 },
  { id: 'page-a', parentId: 'module-a', sortNo: 10 },
  { id: 'module-b', parentId: 'root', sortNo: 20 },
];

describe('resource menu tree behavior', () => {
  it('moves a node between siblings and normalizes the affected order', () => {
    expect(moveResourceNode(rows, 'module-b', 'module-a', 'before')).toEqual([
      { id: 'root', parentId: null, sortNo: 10 },
      { id: 'module-a', parentId: 'root', sortNo: 20 },
      { id: 'page-a', parentId: 'module-a', sortNo: 10 },
      { id: 'module-b', parentId: 'root', sortNo: 10 },
    ]);
  });

  it('rejects a move under its own descendant', () => {
    expect(() => moveResourceNode(rows, 'module-a', 'page-a', 'child')).toThrow('不能移动到自身或其子节点下');
  });

  it('hides every descendant when a parent is collapsed', () => {
    expect(visibleResourceIds(rows, new Set(['root']))).toEqual(['root', 'module-a', 'module-b']);
  });
});
