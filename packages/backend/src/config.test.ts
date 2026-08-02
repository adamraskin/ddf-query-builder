import { afterEach, describe, expect, it, vi } from 'vitest';

describe('config', () => {
  afterEach(() => {
    vi.resetModules();
    delete process.env.DDF_CLIENT_ID;
    delete process.env.DDF_CLIENT_SECRET;
    delete process.env.DDF_TOKEN_URL;
    delete process.env.DDF_TOKEN_SCOPE;
    delete process.env.DDF_GRANT_TYPE;
  });

  it('loads DDF auth settings from environment variables', async () => {
    process.env.DDF_CLIENT_ID = 'test-client-id';
    process.env.DDF_CLIENT_SECRET = 'test-client-secret';
    process.env.DDF_TOKEN_URL = 'https://identity.example.test/connect/token';
    process.env.DDF_TOKEN_SCOPE = 'DDFApi_Read';
    process.env.DDF_GRANT_TYPE = 'client_credentials';

    const { config } = await import('./config');

    expect(config.ddf.clientId).toBe('test-client-id');
    expect(config.ddf.clientSecret).toBe('test-client-secret');
    expect(config.ddf.tokenUrl).toBe('https://identity.example.test/connect/token');
    expect(config.ddf.tokenScope).toBe('DDFApi_Read');
    expect(config.ddf.grantType).toBe('client_credentials');
  });
});
