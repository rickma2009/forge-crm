import { loadRuntimeConfig } from './runtime-config';

describe('runtime configuration', () => {
  const original = process.env;
  beforeEach(() => { process.env = { ...original, DATABASE_URL: 'postgresql://local', SYSTEM_CODES: 'demo-portal,secondary-demo', APP_ORIGINS: 'http://localhost:5173', SESSION_SIGNING_KEY: '0123456789abcdef0123456789abcdef' }; });
  afterAll(() => { process.env = original; });

  it('loads a unique, validated system allowlist', () => {
    expect([...loadRuntimeConfig().systemCodes]).toEqual(['demo-portal', 'secondary-demo']);
  });

  it('fails closed for duplicate or malformed systems', () => {
    process.env.SYSTEM_CODES = 'demo-portal,demo-portal';
    expect(loadRuntimeConfig).toThrow('SYSTEM_CODES_DUPLICATE');
    process.env.SYSTEM_CODES = 'Demo Portal';
    expect(loadRuntimeConfig).toThrow();
  });
});
