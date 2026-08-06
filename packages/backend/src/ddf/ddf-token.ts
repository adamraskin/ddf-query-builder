import { config } from '../config';

/**
 * DDF API OAuth token acquisition, used by the /run-url execution feature.
 * Config presence is checked explicitly and throws a clear, typed error
 * instead of silently sending an empty client_id/client_secret to CREA's
 * identity endpoint. The token is cached in memory until shortly before it
 * expires, so /run-url doesn't request a fresh token on every call.
 */

export class DdfConfigError extends Error {}

export class DdfTokenError extends Error {
  details?: unknown;
  constructor(message: string, details?: unknown) {
    super(message);
    this.details = details;
  }
}

interface CachedToken {
  accessToken: string;
  expiresAt: number; // epoch ms
}

let cached: CachedToken | null = null;

/** Refresh this long before actual expiry, to avoid using a token that expires mid-request. */
const SAFETY_MARGIN_MS = 60_000;
const DEFAULT_TTL_SECONDS = 300;

export async function getDdfAccessToken(): Promise<string> {
  const { clientId, clientSecret, tokenUrl, tokenScope, grantType } = config.ddf;

  if (!clientId || !clientSecret || !tokenUrl) {
    throw new DdfConfigError(
      'DDF OAuth is not configured. Set DDF_CLIENT_ID, DDF_CLIENT_SECRET, and DDF_TOKEN_URL to use /run-url.',
    );
  }

  if (cached && cached.expiresAt > Date.now()) {
    return cached.accessToken;
  }

  const tokenResponse = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: grantType,
      client_id: clientId,
      client_secret: clientSecret,
      scope: tokenScope,
    }),
  });

  if (!tokenResponse.ok) {
    const errorBody = await tokenResponse.text();
    throw new DdfTokenError('Could not obtain a DDF access token.', errorBody);
  }

  const tokenData = (await tokenResponse.json()) as {
    access_token?: string;
    expires_in?: number;
  };

  if (!tokenData.access_token) {
    throw new DdfTokenError('DDF access token was not returned.');
  }

  const ttlMs = (tokenData.expires_in ?? DEFAULT_TTL_SECONDS) * 1000;
  cached = {
    accessToken: tokenData.access_token,
    expiresAt: Date.now() + Math.max(ttlMs - SAFETY_MARGIN_MS, 0),
  };

  return cached.accessToken;
}

/** Exposed for tests only, so each test can start from a clean cache. */
export function _resetDdfTokenCacheForTests(): void {
  cached = null;
}
