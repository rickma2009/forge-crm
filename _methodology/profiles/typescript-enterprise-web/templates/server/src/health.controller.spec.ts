import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('returns a process liveness result without requiring external systems', () => {
    const controller = new HealthController();
    expect(controller.live()).toEqual({ status: 'ok', service: '{{project_slug}}-server' });
  });

  it('fails closed when database readiness is not configured', async () => {
    const previous = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    const controller = new HealthController();
    await expect(controller.ready()).rejects.toMatchObject({ response: { status: 'not-ready' } });
    if (previous === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previous;
  });
});
