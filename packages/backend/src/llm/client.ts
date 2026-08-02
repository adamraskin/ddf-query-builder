import { ChatOpenAI } from '@langchain/openai';
import { config } from '../config';

/**
 * LM Studio exposes an OpenAI-compatible /v1/chat/completions endpoint once
 * you start its local server (Developer tab -> "Start Server" in LM Studio,
 * or `lms server start`). We talk to it exactly like the OpenAI SDK, just
 * pointed at a different baseURL with a throwaway API key.
 */
export function createLmStudioClient(overrides: { temperature?: number } = {}): ChatOpenAI {
  return new ChatOpenAI({
    model: config.lmStudio.model,
    apiKey: config.lmStudio.apiKey,
    temperature: overrides.temperature ?? 0,
    configuration: {
      baseURL: config.lmStudio.baseUrl,
    },
  });
}

/** A minimal, fast call used at startup to confirm LM Studio is reachable. */
export async function verifyLmStudioConnection(): Promise<{ ok: boolean; message: string }> {
  try {
    const client = createLmStudioClient();
    const response = await client.invoke('Reply with the single word: pong');
    const text = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
    return { ok: true, message: `LM Studio reachable. Response: ${text.slice(0, 100)}` };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      message: `Could not reach LM Studio at ${config.lmStudio.baseUrl}. Is the local server running? (${message})`,
    };
  }
}
