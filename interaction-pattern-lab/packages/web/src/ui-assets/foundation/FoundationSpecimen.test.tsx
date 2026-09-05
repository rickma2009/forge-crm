import { cleanup, render, screen, within } from '@testing-library/react';
import type { NavigationNode, NavigationResponse, SessionUser } from '@interaction-pattern-lab/contracts';
import { afterEach, describe, expect, it } from 'vitest';
import { ShowcaseApp } from '../../showcase/ShowcaseApp';
import type { NavigationGateway } from '../../showcase/gateway';
import { showcaseRegistry } from '../../showcase/registry/registry';
import type { ShowcaseNavigationNode } from '../../showcase/registry/types';

const foundationPageIds = new Set(['foundation-colors', 'foundation-typography', 'foundation-spacing', 'foundation-icons']);
const foundationPages = showcaseRegistry.pages.filter((page) => foundationPageIds.has(page.id));

class FoundationGateway implements NavigationGateway {
  async session(): Promise<SessionUser> { return { account: 'admin', displayName: '系统管理员' }; }
  async login(): Promise<SessionUser> { return this.session(); }
  async logout(): Promise<void> { /* specimen tests begin with an authenticated session */ }
  async navigation(): Promise<NavigationResponse> {
    return { systemCode: 'demo-portal', permissionVersion: 'foundation-test', items: showcaseRegistry.navigation.items.map((node) => this.toNode(node)) };
  }
  async assertPage(): Promise<void> { /* every registered specimen route is authorized for this fixture */ }
  async performResourceAction(): Promise<unknown> { return {}; }

  private toNode(node: ShowcaseNavigationNode): NavigationNode {
    const page = node.pageId ? showcaseRegistry.pages.find((candidate) => candidate.id === node.pageId) : undefined;
    return {
      menuCode: node.id,
      label: node.label,
      nodeType: page ? 'PAGE' : 'GROUP',
      routePath: page?.path ?? null,
      iconKey: node.iconKey,
      sortNo: 1,
      children: (node.children ?? []).map((child) => this.toNode(child)),
    };
  }
}

afterEach(cleanup);

describe('TASK-1003 foundation specimens', () => {
  it('TC-1003: renders semantic name, source, consumer, and coverage for every displayed token on all four foundation routes', async () => {
    for (const page of foundationPages) {
      cleanup();
      window.location.hash = `#${page.path}`;
      render(<ShowcaseApp gateway={new FoundationGateway()} />);

      expect(await screen.findByRole('heading', { name: page.title })).toBeInTheDocument();
      const tokens = screen.getAllByTestId('foundation-token');
      expect(tokens.length).toBeGreaterThan(0);
      for (const token of tokens) {
        expect(within(token).getByTestId('foundation-token-id')).not.toHaveTextContent(/^\s*$/);
        expect(within(token).getByTestId('foundation-token-source')).not.toHaveTextContent(/^\s*$/);
        expect(within(token).getByTestId('foundation-token-consumers')).not.toHaveTextContent(/^\s*$/);
        expect(within(token).getByTestId('foundation-token-coverage')).toHaveTextContent(/已实现|缺口/);
      }
    }
  });

  it('TC-1003: makes each unimplemented foundation area visible as an explicit gap', async () => {
    window.location.hash = '#/showcase/foundations/colors';
    render(<ShowcaseApp gateway={new FoundationGateway()} />);

    expect(await screen.findByRole('heading', { name: '颜色与主题' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '明确缺口' })).toBeInTheDocument();
    expect(screen.getAllByTestId('foundation-gap').length).toBeGreaterThan(0);
  });
});
