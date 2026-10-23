import { configuredStageTemplate } from './configured-stage-template';

const scope = { id: 'app-id', tenantId: 'tenant-id' };
const template = { id: 'template-id', templateCode: 'public', templateName: '公共', status: 'ACTIVE' };
function fixture(value: string | null, result: typeof template | null = template) {
  const db = {
    sysParameter: { findFirst: jest.fn().mockResolvedValue({ value }) },
    sdOppTemplate: { findFirst: jest.fn().mockResolvedValue(result) },
  };
  return db;
}
describe('configured opportunity stage template', () => {
  it('resolves the active template code in the same application', async () => {
    const db = fixture(' public ');
    await expect(configuredStageTemplate(db as never, scope)).resolves.toEqual(template);
    expect(db.sdOppTemplate.findFirst).toHaveBeenCalledWith({ where: { applicationId: scope.id, tenantId: scope.tenantId, templateCode: 'public', status: 'ACTIVE' } });
  });
  it('treats empty, invalid, or disabled values as no default', async () => {
    const empty = fixture(' '), invalid = fixture('missing', null);
    await expect(configuredStageTemplate(empty as never, scope)).resolves.toBeNull();
    expect(empty.sdOppTemplate.findFirst).not.toHaveBeenCalled();
    await expect(configuredStageTemplate(invalid as never, scope)).resolves.toBeNull();
  });
});
