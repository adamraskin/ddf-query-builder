import 'dotenv/config';

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  logLevel: process.env.LOG_LEVEL ?? 'dev',
  lmStudio: {
    baseUrl: required('LM_STUDIO_BASE_URL', 'http://localhost:1234/v1'),
    apiKey: process.env.LM_STUDIO_API_KEY ?? 'lm-studio',
    model: required('LM_STUDIO_MODEL', 'local-model'),
  },
  ddfBaseUrl: required('DDF_BASE_URL', ''),
  ddf: {
    clientId: required('DDF_CLIENT_ID', ''),
    clientSecret: required('DDF_CLIENT_SECRET', ''),
    tokenUrl: required('DDF_TOKEN_URL', ''),
    tokenScope: required('DDF_TOKEN_SCOPE', 'DDFApi_Read'),
    grantType: required('DDF_GRANT_TYPE', 'client_credentials'),
  },
};
