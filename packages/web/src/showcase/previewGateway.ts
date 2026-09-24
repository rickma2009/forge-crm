import type { NavigationNode, NavigationResponse, SessionUser } from '@forge-crm/contracts';
import { effectiveCapabilities, resolvePageAccess } from './domain/access';
import { projectVisibleNavigation } from './domain/navigation';
import { GatewayError, type NavigationGateway } from './gateway';
import { showcaseRegistry } from './registry/registry';
import type { ShowcaseNavigationNode } from './registry/types';

class PreviewNavigationGateway implements NavigationGateway {
  async session(): Promise<SessionUser> {
    return { account: 'prototype', displayName: '原型评审员' };
  }

  async login(): Promise<SessionUser> {
    return this.session();
  }

  async logout(): Promise<void> {}

  async navigation(systemCode: string): Promise<NavigationResponse> {
    if (systemCode !== 'demo-portal') throw new GatewayError(403, 'FORBIDDEN', '原型预览仅支持演示门户');
    return {
      systemCode,
      items: projectVisibleNavigation('admin', showcaseRegistry).items.map((node) => this.node(node)),
      permissionVersion: 'preview-sales-order-20260905'.padEnd(64, '0'),
    };
  }

  async assertPage(systemCode: string, routePath: string): Promise<void> {
    if (systemCode !== 'demo-portal') throw new GatewayError(403, 'FORBIDDEN', '原型预览仅支持演示门户');
    const access = resolvePageAccess(routePath, 'admin', showcaseRegistry);
    if (access.kind === 'forbidden') throw new GatewayError(403, 'FORBIDDEN', '无权访问');
    if (access.kind === 'not-found') throw new GatewayError(404, 'NOT_FOUND', '页面不存在');
  }

  async performResourceAction(): Promise<unknown> {
    return {};
  }

  private node(node: ShowcaseNavigationNode): NavigationNode {
    const page = node.pageId ? showcaseRegistry.pages.find((candidate) => candidate.id === node.pageId) : undefined;
    const capabilities = effectiveCapabilities('admin', showcaseRegistry);
    return {
      menuCode: node.id.replace(/^nav-/, ''),
      label: node.label,
      nodeType: page ? 'PAGE' : 'GROUP',
      routePath: page?.path ?? null,
      iconKey: node.iconKey,
      sortNo: 10,
      ...(page ? { allowedActions: [
        { actionCode: 'view', label: '查看', actionType: 'VIEW', sortNo: 10 },
        ...(page.operations ?? []).filter((operation) => capabilities.has(operation.capability)).map((operation, index) => ({ actionCode: operation.capability.split('.').at(-1)!, label: operation.label, actionType: 'CUSTOM' as const, sortNo: 20 + index })),
      ] } : {}),
      children: (node.children ?? []).map((child) => this.node(child)),
    };
  }
}

export const previewNavigationGateway = new PreviewNavigationGateway();
