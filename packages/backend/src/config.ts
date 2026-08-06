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
    /**
     * Optional: a model loaded in LM Studio specifically as an embedding
     * model (e.g. nomic-embed-text-v1.5), used for semantic ranking of
     * PublicRemarks. The chat model above cannot serve /v1/embeddings.
     * Genuinely optional — semantic ranking is skipped when unset.
     */
    embeddingModel: process.env.LM_STUDIO_EMBEDDING_MODEL,
  },
  ddfBaseUrl: required('DDF_BASE_URL', 'https://ddfapi.realtor.ca/odata/v1/Property'),
  /**
   * OAuth credentials for the /run-url execution feature. These are
   * genuinely optional here — no fallback, no forced throw at startup —
   * so the app still works for anyone just using the URL-builder feature
   * without DDF API credentials configured. The /run-url handler checks
   * for their presence itself and returns a clear error if they're
   * missing, instead of silently sending empty strings to CREA's identity
   * endpoint (required(name, '') would never actually throw, since '' is
   * not undefined — that was the bug).
   */
  ddf: {
    clientId: process.env.DDF_CLIENT_ID,
    clientSecret: process.env.DDF_CLIENT_SECRET,
    tokenUrl: process.env.DDF_TOKEN_URL,
    tokenScope: required('DDF_TOKEN_SCOPE', 'DDFApi_Read'),
    grantType: required('DDF_GRANT_TYPE', 'client_credentials'),
  },
};
