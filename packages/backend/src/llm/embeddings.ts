import { OpenAIEmbeddings } from '@langchain/openai';
import { config } from '../config';

/**
 * LM Studio's /v1/embeddings endpoint requires a model actually loaded as
 * an embedding model — a chat model (see client.ts) can't serve it. Returns
 * null when no embedding model is configured, so callers can degrade
 * gracefully instead of failing.
 */
export function createLmStudioEmbeddings(): OpenAIEmbeddings | null {
  if (!config.lmStudio.embeddingModel) return null;

  return new OpenAIEmbeddings({
    model: config.lmStudio.embeddingModel,
    apiKey: config.lmStudio.apiKey,
    configuration: {
      baseURL: config.lmStudio.baseUrl,
    },
  });
}
