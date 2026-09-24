import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RolePolicyPanel } from './RolePolicyPanel';
import type { EnterpriseGateway } from './gateway';

describe('role data policy editor', () => {
  it('shows actual enrollment state and publishes a reviewed condition', async () => {
    const resource = { id: 'resource-1', resourceName: '客户', bindingKey: 'customer', enabled: false, version: 1, fields: [{ id: 'field-1', fieldCode: 'statusValue', fieldName: '状态', bindingKey: 'statusValue', fieldType: 'string', source: 'SYSTEM', status: 'ACTIVE', groupName: '基本字段' }] };
    const gateway = {
      policyCatalog: vi.fn(async () => ({ resources: [resource], availableBindings: [] })),
      rolePolicy: vi.fn(async () => ({ version: 0, roleVersion: 1, rules: [], fields: [], viewIds: [], history: [], readOnly: false, resource })),
      roleViews: vi.fn(async () => ({ version: 1, items: [] })),
      publishRolePolicy: vi.fn(async () => ({ version: 1, roleVersion: 2 })),
    } as unknown as EnterpriseGateway;
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<RolePolicyPanel systemCode="demo-portal" roleId="role-1" editable gateway={gateway} onDirty={vi.fn()} onSaved={vi.fn(async () => {})} />);
    expect(await screen.findByText(/未纳管/)).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: '应用启用客户模板' }));
    fireEvent.click(screen.getByRole('button', { name: '发布数据策略' }));
    await waitFor(() => expect(gateway.publishRolePolicy).toHaveBeenCalledWith('demo-portal', 'role-1', 'resource-1', 'read', expect.objectContaining({ version: 0, roleVersion: 1, rules: [expect.objectContaining({ effect: 'ALLOW' })] })));
  });
});
