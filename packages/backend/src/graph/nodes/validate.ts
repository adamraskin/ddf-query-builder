import { DdfStructuredQuerySchema } from '@ddf/shared';
import { GraphState } from '../state';

/**
 * Re-validates the extracted output against the strict schema (field
 * exists, operator allowed for that field, value type matches, enum
 * values respected). This is where hallucinated fields/operators/values
 * from the LLM get caught before they ever reach the translator.
 */
export function validateNode(state: GraphState): Partial<GraphState> {
  if (state.error) {
    // Upstream node already failed; nothing to validate.
    return {};
  }

  const parsed = DdfStructuredQuerySchema.safeParse(state.rawOutput);

  if (!parsed.success) {
    const messages = parsed.error.issues.map((issue) => {
      const path = issue.path.join('.');
      return path ? `${path}: ${issue.message}` : issue.message;
    });
    return { validationErrors: messages, error: 'The extracted query failed validation.' };
  }

  return { structuredQuery: parsed.data, validationErrors: [] };
}
