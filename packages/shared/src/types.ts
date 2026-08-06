/** Base shared interfaces; domain types live in ddf-metadata.ts and ddf-schema.ts. */

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
