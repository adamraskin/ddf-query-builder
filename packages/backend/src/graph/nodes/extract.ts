import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { buildSystemPrompt, buildUserPrompt, DdfStructuredQueryShape } from '@ddf/shared';
import { createLmStudioClient } from '../../llm/client';
import { GraphState } from '../state';

/**
 * Milestone 5 — Extract Node.
 *
 * Sends the natural-language query + generated system prompt to LM Studio
 * and asks for structured output matching the loose query shape. Handles
 * the three documented failure modes: invalid JSON, empty output, and
 * malformed/incomplete responses. Any failure is recorded on state.error
 * rather than thrown, so the graph can end gracefully.
 */
export async function extractNode(state: GraphState): Promise<Partial<GraphState>> {
  if (!state.input || state.input.trim().length === 0) {
    return { error: 'Empty query: please describe what you are looking for.' };
  }

  const client = createLmStudioClient();
  const structuredClient = client.withStructuredOutput(DdfStructuredQueryShape, {
    method: 'jsonSchema',
    name: 'ddf_structured_query',
  });

  try {
    const result = await structuredClient.invoke([
      new SystemMessage(buildSystemPrompt()),
      new HumanMessage(buildUserPrompt(state.input)),
    ]);

    if (!result || typeof result !== 'object') {
      return { error: 'The model returned an empty or malformed response.' };
    }

    return { rawOutput: result };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // withStructuredOutput throws on invalid/non-JSON model output.
    return { error: `Failed to extract structured data from the model response: ${message}` };
  }
}
