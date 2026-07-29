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
  ddfBaseUrl: required('DDF_BASE_URL', 'https://ddfapi.realtor.ca/odata/v1/Property'),
};
