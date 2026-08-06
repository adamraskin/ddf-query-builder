import { getDdfAccessToken } from '../../ddf/ddf-token';
import { config } from '../../config';

/**
 * Shared by the live LLM-reliability suite and the field-coverage suite:
 * both need to know whether real DDF calls are possible, and both need to
 * make them without hammering the (QA) API.
 */

export function isDdfConfigured(): boolean {
  return Boolean(config.ddf.clientId && config.ddf.clientSecret && config.ddf.tokenUrl);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface DdfFetchResult {
  status: number;
  ok: boolean;
  bodySnippet?: string;
}

export async function fetchDdfStatus(url: string): Promise<DdfFetchResult> {
  const accessToken = await getDdfAccessToken();
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });

  if (!response.ok) {
    const bodySnippet = (await response.text()).slice(0, 300);
    return { status: response.status, ok: false, bodySnippet };
  }

  return { status: response.status, ok: true };
}
