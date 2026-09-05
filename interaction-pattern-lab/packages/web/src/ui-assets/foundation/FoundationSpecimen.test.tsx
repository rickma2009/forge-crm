import { cleanup, render, screen, within } from '@testing-library/react';
import type { NavigationNode, NavigationResponse, SessionUser } from '@interaction-pattern-lab/contracts';
import { afterEach, describe, expect, it } from 'vitest';
import userEvent from '@testing-library/user-event';
import { ShowcaseApp } from '../../showcase/ShowcaseApp';
import type { NavigationGateway } from '../../showcase/gateway';
import { showcaseRegistry } from '../../showcase/registry/registry';
import type { ShowcaseNavigationNode } from '../../showcase/registry/types';
import { foundationManifest } from './foundation-manifest';

const requiredFoundationRouteIds = ['foundation-colors', 'foundation-typography', 'foundation-spacing', 'foundation-icons'];
const foundationPageIds = new Set(requiredFoundationRouteIds);
const foundationPages = showcaseRegistry.pages.filter((page) => foundationPageIds.has(page.id));
const expectedConsumerIdsByRoute: Record<string, Record<string, string[]>> = {
  'foundation-colors': {
    'surface.canvas': ['foundation-colors', 'foundation-typography', 'foundation-spacing', 'foundation-icons'],
    'surface.default': ['foundation-colors', 'foundation-typography', 'foundation-spacing', 'foundation-icons'],
    'action.primary': ['foundation-colors', 'foundation-typography', 'foundation-spacing', 'foundation-icons'],
    'status.success': ['foundation-colors', 'foundation-typography', 'foundation-spacing', 'foundation-icons'],
    'status.success.wash': ['foundation-colors', 'foundation-typography', 'foundation-spacing', 'foundation-icons'],
    'status.warning': ['foundation-colors', 'foundation-typography', 'foundation-spacing', 'foundation-icons'],
    'status.warning.wash': ['foundation-colors', 'foundation-typography', 'foundation-spacing', 'foundation-icons'],
    'theme.dark': ['foundation-colors'],
    'data-viz.palette': ['foundation-colors'],
  },
  'foundation-typography': {
    'type.family.enterprise': ['foundation-colors', 'foundation-typography', 'foundation-spacing', 'foundation-icons'],
    'type.meta.label': ['foundation-colors', 'foundation-typography', 'foundation-spacing', 'foundation-icons'],
    'type.body.compact': ['foundation-colors', 'foundation-typography', 'foundation-spacing', 'foundation-icons'],
    'type.heading.page': ['foundation-colors', 'foundation-typography', 'foundation-spacing', 'foundation-icons'],
    'type.scale.responsive': ['foundation-typography'],
  },
  'foundation-spacing': {
    'density.control.compact': ['foundation-spacing'],
    'space.inline.default': ['foundation-colors', 'foundation-typography', 'foundation-spacing', 'foundation-icons'],
    'space.section.default': ['foundation-colors', 'foundation-typography', 'foundation-spacing', 'foundation-icons'],
    'focus.visible': ['foundation-spacing'],
    'grid.virtualization': ['foundation-spacing'],
  },
  'foundation-icons': {
    'icon.size.control': ['foundation-icons'],
    'icon.meaning.decorative': ['foundation-icons'],
    'state.async.pending': ['foundation-icons'],
    'state.async.failure': ['foundation-icons'],
    'icon.illustration.system': ['foundation-icons'],
  },
};

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
  it('TC-1003: renders exactly the four manifest-backed routes with route-owned tokens, consumers, and gaps', async () => {
    expect(foundationManifest.map((specimen) => specimen.routeId)).toEqual(requiredFoundationRouteIds);
    expect(foundationPages.map((page) => page.id)).toEqual(requiredFoundationRouteIds);

    for (const page of foundationPages) {
      cleanup();
      window.location.hash = `#${page.path}`;
      render(<ShowcaseApp gateway={new FoundationGateway()} />);

      expect(await screen.findByRole('heading', { name: page.title })).toBeInTheDocument();
      const tokens = screen.getAllByTestId('foundation-token');
      expect(tokens.length).toBeGreaterThan(0);
      expect(tokens.map((token) => within(token).getByTestId('foundation-token-id').textContent)).toEqual(foundationManifest.find((specimen) => specimen.routeId === page.id)?.tokens.map((token) => token.id));
      for (const token of tokens) {
        const tokenId = within(token).getByTestId('foundation-token-id').textContent ?? '';
        const consumers = within(token).getByTestId('foundation-token-consumers');
        expect(tokenId).not.toMatch(/^\s*$/);
        expect(within(token).getByTestId('foundation-token-source')).not.toHaveTextContent(/^\s*$/);
        expect(consumers.textContent?.split('；')).toEqual(expectedConsumerIdsByRoute[page.id]?.[tokenId]);
        expect(consumers).not.toHaveTextContent(/EPM-PAGE-/);
        expect(within(token).getByTestId('foundation-token-coverage')).toHaveTextContent(/已实现|缺口/);
      }
      expect(screen.getByRole('heading', { name: '明确缺口' })).toBeInTheDocument();
      expect(screen.getAllByTestId('foundation-gap').map((gap) => gap.querySelector('code')?.textContent)).toEqual(foundationManifest.find((specimen) => specimen.routeId === page.id)?.tokens.filter((token) => token.coverage === 'gap').map((token) => token.id));
    }
  });

  it('TC-1003: reaches the spacing focus specimen by keyboard navigation', async () => {
    window.location.hash = '#/showcase/foundations/spacing';
    render(<ShowcaseApp gateway={new FoundationGateway()} />);
    const user = userEvent.setup();

    expect(await screen.findByRole('heading', { name: '间距与布局' })).toBeInTheDocument();
    const focusSpecimen = screen.getByRole('button', { name: '焦点样本' });
    for (let tabCount = 0; tabCount < 64 && document.activeElement !== focusSpecimen; tabCount += 1) await user.tab();
    expect(focusSpecimen).toHaveFocus();
  });
});
