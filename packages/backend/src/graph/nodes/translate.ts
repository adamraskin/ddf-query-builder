import { translateToUrl } from '@ddf/shared';
import { config } from '../../config';
import { GraphState } from '../state';

/**
 * Milestone 6 — Translate Node.
 *
 * Thin wrapper around the deterministic translator (Milestone 3). By the
 * time we get here, structuredQuery is guaranteed valid by the Validate
 * node, so this step cannot itself produce a validation error — only a
 * config error (e.g. bad base URL), which is treated as unrecoverable.
 */
export function translateNode(state: GraphState): Partial<GraphState> {
  if (state.error || !state.structuredQuery) {
    return {};
  }

  try {
    const url = translateToUrl(state.structuredQuery, { baseUrl: config.ddfBaseUrl });
    return { url };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: `Failed to translate query into a DDF URL: ${message}` };
  }
}
