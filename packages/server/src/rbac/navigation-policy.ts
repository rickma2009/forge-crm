import { createHash } from 'node:crypto';
import type { NavigationNode, NavigationResponse } from '@forge-crm/contracts';

export interface AuthorizationRow {
  menuId: string;
  menuCode: string;
  menuName: string;
  nodeType: 'GROUP' | 'PAGE';
  parentId: string | null;
  routePath: string | null;
  iconKey: string;
  sortNo: number;
  menuGranted: boolean;
  actionCode: string | null;
  actionName: string | null;
  actionType: string | null;
  actionSortNo: number | null;
  actionGranted: boolean;
}

interface MutableNode extends NavigationNode {
  id: string;
  parentId: string | null;
}

export function buildAuthorizedNavigation(systemCode: string, rows: AuthorizationRow[]): NavigationResponse {
  const byId = new Map<string, MutableNode>();
  const visiblePageIds = new Set<string>();

  for (const row of rows) {
    let node = byId.get(row.menuId);
    if (!node) {
      node = {
        id: row.menuId,
        parentId: row.parentId,
        menuCode: row.menuCode,
        label: row.menuName,
        nodeType: row.nodeType,
        routePath: row.routePath,
        iconKey: row.iconKey,
        sortNo: row.sortNo,
        allowedActions: [],
        children: [],
      };
      byId.set(row.menuId, node);
    }
    if (row.nodeType === 'PAGE' && row.menuGranted) visiblePageIds.add(row.menuId);
    if (row.nodeType === 'PAGE' && row.menuGranted && row.actionGranted && row.actionCode && row.actionName && row.actionType && row.actionSortNo !== null) {
      if (!node.allowedActions?.some((action) => action.actionCode === row.actionCode)) {
        node.allowedActions?.push({ actionCode: row.actionCode, label: row.actionName, actionType: row.actionType, sortNo: row.actionSortNo });
      }
    }
  }

  const visibleIds = new Set(visiblePageIds);
  for (const pageId of visiblePageIds) {
    let parentId = byId.get(pageId)?.parentId ?? null;
    const seen = new Set<string>();
    while (parentId) {
      if (seen.has(parentId)) throw new Error('MENU_PARENT_CYCLE');
      seen.add(parentId);
      const parent = byId.get(parentId);
      if (!parent || parent.nodeType !== 'GROUP') break;
      visibleIds.add(parentId);
      parentId = parent.parentId;
    }
  }

  const roots: MutableNode[] = [];
  for (const node of byId.values()) {
    if (!visibleIds.has(node.id)) continue;
    node.allowedActions?.sort((left, right) => left.sortNo - right.sortNo || left.actionCode.localeCompare(right.actionCode));
    if (node.nodeType === 'GROUP') delete node.allowedActions;
    const parent = node.parentId ? byId.get(node.parentId) : undefined;
    if (parent && visibleIds.has(parent.id)) parent.children.push(node);
    else roots.push(node);
  }

  const sortTree = (nodes: MutableNode[]): void => {
    nodes.sort((left, right) => left.sortNo - right.sortNo || left.menuCode.localeCompare(right.menuCode));
    for (const node of nodes) sortTree(node.children as MutableNode[]);
  };
  sortTree(roots);

  const strip = (node: MutableNode): NavigationNode => ({
    menuCode: node.menuCode,
    label: node.label,
    nodeType: node.nodeType,
    routePath: node.routePath,
    iconKey: node.iconKey,
    sortNo: node.sortNo,
    ...(node.nodeType === 'PAGE' ? { allowedActions: node.allowedActions ?? [] } : {}),
    children: (node.children as MutableNode[]).map(strip),
  });
  const items = roots.map(strip);
  const normalized = JSON.stringify({ systemCode, items });

  return {
    systemCode,
    items,
    permissionVersion: createHash('sha256').update(normalized).digest('hex'),
  };
}
