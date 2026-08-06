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

  it('regression: leaves DDF OAuth credentials undefined (not empty strings) when unset, so callers can detect missing config', async () => {
    delete process.env.DDF_CLIENT_ID;
    delete process.env.DDF_CLIENT_SECRET;
    delete process.env.DDF_TOKEN_URL;

    const { config } = await import('./config');

    expect(config.ddf.clientId).toBeUndefined();
    expect(config.ddf.clientSecret).toBeUndefined();
    expect(config.ddf.tokenUrl).toBeUndefined();
    // tokenScope/grantType have real, safe defaults (not secrets) so those still resolve.
    expect(config.ddf.tokenScope).toBe('DDFApi_Read');
    expect(config.ddf.grantType).toBe('client_credentials');
  });

  it('regression: ddfBaseUrl falls back to the real DDF endpoint, not an empty string', async () => {
    delete process.env.DDF_BASE_URL;
    const { config } = await import('./config');
    expect(config.ddfBaseUrl).toBe('https://ddfapi.realtor.ca/odata/v1/Property');
  });
});
