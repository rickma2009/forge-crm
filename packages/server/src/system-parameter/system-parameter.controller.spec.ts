import type { AuthenticatedRequest } from '../auth/auth.types';
import { AuthorizationService } from '../rbac/authorization.service';
import { DatabaseService } from '../database/database.service';
import { SystemParameterController } from './system-parameter.controller';
import { SystemParameterService } from './system-parameter.service';

describe('parameter access boundary', () => {
  const user = { currentUser: { id: 'user', account: 'user', displayName: 'User' } } as AuthenticatedRequest;
  it('requires view and manage before accepting an update', async () => {
    const service = { update: jest.fn() };
    const auth = { assertAction: jest.fn().mockImplementation(async (_user, _code, _page, action) => { if (action === 'manage') throw new Error('FORBIDDEN'); }) };
    const controller = new SystemParameterController(service as unknown as SystemParameterService, auth as unknown as AuthorizationService);
    await expect(controller.update(user, 'demo-portal', 'id', {})).rejects.toThrow('FORBIDDEN');
    expect(service.update).not.toHaveBeenCalled();
    expect(auth.assertAction).toHaveBeenCalledWith('user', 'demo-portal', 'system-parameters', 'view');
  });
  it('does not translate infrastructure failure into an empty valid default', async () => {
    const db = { sysApplication: { findMany: jest.fn().mockRejectedValue(new Error('database down')) } };
    await expect(new SystemParameterService(db as unknown as DatabaseService).getValue('demo-portal', 'DEFAULT_LEGAL_ENTITY')).rejects.toThrow('database down');
  });
});
