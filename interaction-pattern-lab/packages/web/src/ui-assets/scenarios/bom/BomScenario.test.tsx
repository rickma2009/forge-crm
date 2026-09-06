import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { showcaseRegistry, showcaseRendererKeys } from '../../../showcase/registry/registry';
import { BomScenario } from './BomScenario';

describe('TASK-1010 BOM scenario', () => {
  it('mounts the same master-detail template with visible hierarchy, difference cues, and a bounded demo', () => {
    render(<BomScenario />);

    expect(screen.getByRole('heading', { name: '装配清单复核' })).toBeInTheDocument();
    expect(screen.getByRole('table', { name: '装配清单复核行项目' })).toBeInTheDocument();
    expect(screen.getByRole('tree', { name: '层级预览' })).toBeInTheDocument();
    expect(screen.getByRole('treeitem', { name: /传动子装配/ })).toHaveAttribute('aria-level', '2');
    expect(screen.getAllByText('差异：替代候选待复核').length).toBeGreaterThan(0);
    expect(screen.getByText('演示深度 3 层；行预算 6 行（当前 4 行）。')).toBeInTheDocument();
  });

  it('adds a controlled candidate through the reused grid and reviews the matching cue by keyboard', async () => {
    const user = userEvent.setup();
    render(<BomScenario />);

    await user.selectOptions(screen.getByRole('combobox', { name: '候选行' }), 'MAT-AX-07');
    await user.click(screen.getByRole('button', { name: '添加候选行' }));
    expect(screen.getByRole('row', { name: /滚珠丝杠副 草稿/ })).toBeInTheDocument();

    const review = screen.getByRole('button', { name: '复核候选 MAT-AX-07' });
    review.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('status', { name: '候选复核结果' })).toHaveTextContent('已复核 MAT-AX-07：可作为替代候选，尚未写入任何业务系统。');
  });

  it('TC-EDGE-1005: enforces the six-active-row demo budget for empty, candidate, and copy mutations', async () => {
    const user = userEvent.setup();
    render(<BomScenario />);

    await user.selectOptions(screen.getByRole('combobox', { name: '候选行' }), 'MAT-AX-07');
    await user.click(screen.getByRole('button', { name: '添加候选行' }));
    await user.click(screen.getByRole('button', { name: '新增空行' }));

    expect(screen.getByText('当前行数：6 / 6')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: '行项目操作说明' })).toHaveTextContent('已达到本场景行预算（6 行）；新增空行、添加候选行和复制行已停用。');
    const appendEmpty = screen.getByRole('button', { name: '新增空行' });
    const appendCandidate = screen.getByRole('button', { name: '添加候选行' });
    const copy = screen.getByRole('button', { name: /复制精密传动装配/ });
    expect(appendEmpty).toBeDisabled();
    expect(appendCandidate).toBeDisabled();
    expect(screen.getByRole('combobox', { name: '候选行' })).toBeDisabled();
    expect(copy).toBeDisabled();

    await user.click(appendEmpty);
    await user.click(appendCandidate);
    await user.click(copy);
    expect(screen.getByText('当前行数：6 / 6')).toBeInTheDocument();
    expect(screen.queryByText('当前行数：7 / 6')).not.toBeInTheDocument();
  });

  it('registers the BOM route with implementation traceability and an honest unrun QA state', () => {
    expect(showcaseRegistry.pages.find((page) => page.id === 'scenario-bom')).toMatchObject({
      path: '/showcase/scenarios/bom',
      coverage: 'interactive-slice',
      rendererKey: 'bom-scenario',
      traceability: {
        directSourceRefs: ['REQSRC-029', 'REQSRC-030'],
        extractionRefs: ['UID-001'],
        assetRefs: ['EPM-PAGE-012', 'EPM-PAGE-013', 'EPM-ACT-043', 'EPM-ACT-044'],
        implementationRefs: ['packages/web/src/ui-assets/scenarios/bom/BomScenario.tsx'],
        qaRefs: [],
        qaStatus: 'not-run',
      },
    });
    expect(showcaseRendererKeys.has('bom-scenario')).toBe(true);
  });
});
