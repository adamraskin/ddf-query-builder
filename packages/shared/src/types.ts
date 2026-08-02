/**
 * Milestone 1 — base shared interfaces.
 * Kept intentionally small; the real domain types live in ddf-metadata.ts
 * and ddf-schema.ts once the DDF domain is defined (Milestone 2).
 */

export type DdfDataType = 'string' | 'number' | 'boolean';

export interface ApiError {
  message: string;
  code: string;
  details?: unknown;
}

export interface ApiSuccess<T> {
  ok: true;
  data: T;
}

export interface ApiFailure {
  ok: false;
  error: ApiError;
}

export type ApiResult<T> = ApiSuccess<T> | ApiFailure;
