import type { DdfStructuredQuery } from '@ddf/shared';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

export interface QuerySuccess {
  ok: true;
  data: { query: DdfStructuredQuery; url: string };
}

export interface QueryFailure {
  ok: false;
  error: { code: string; message: string; details?: unknown };
}

export interface RunUrlSuccess {
  ok: true;
  data: { status: number; contentType: string | null; body: string };
}

export interface RunUrlFailure {
  ok: false;
  error: { code: string; message: string; details?: unknown };
}

export type QueryResponse = QuerySuccess | QueryFailure;
export type RunUrlResponse = RunUrlSuccess | RunUrlFailure;

export async function submitQuery(prompt: string): Promise<QueryResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    const body = (await res.json()) as QueryResponse;
    return body;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      error: {
        code: 'NETWORK_ERROR',
        message: `Could not reach the backend at ${API_BASE_URL}. Is it running? (${message})`,
      },
    };
  }
}

export async function runGeneratedUrl(url: string): Promise<RunUrlResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/run-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    const body = (await res.json()) as RunUrlResponse;
    return body;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      error: {
        code: 'NETWORK_ERROR',
        message: `Could not reach the backend at ${API_BASE_URL}. Is it running? (${message})`,
      },
    };
  }
}
