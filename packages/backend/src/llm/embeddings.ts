import type { EmbeddingsInterface } from '@langchain/core/embeddings';
import { config } from '../config';

/**
 * Deliberately NOT @langchain/openai's OpenAIEmbeddings. That class omits
 * encoding_format from its request, so the underlying openai SDK defaults
 * to requesting encoding_format: "base64" and unconditionally base64-decodes
 * the response. LM Studio ignores that request param and returns plain
 * JSON floats regardless — the SDK then silently misinterprets those
 * floats as base64, corrupting every embedding into an all-zero vector
 * (confirmed: the raw HTTP response has real numbers; OpenAIEmbeddings
 * returns all zeros for the same request). Explicitly requesting
 * encoding_format: "float" avoids that decode path entirely.
 */
class LmStudioEmbeddings implements EmbeddingsInterface {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  async embedQuery(text: string): Promise<number[]> {
    const [embedding] = await this.embed([text]);
    return embedding;
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    return this.embed(texts);
  }

  private async embed(input: string[], retriesLeft = 1): Promise<number[][]> {
    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ model: this.model, input, encoding_format: 'float' }),
    });

    if (!response.ok) {
      const bodyText = await response.text();
      // LM Studio's embedding model has been observed to fail its very
      // first request (a bare 500, no useful error body) while it loads
      // the model into memory — confirmed via LM Studio's own logs: the
      // identical request succeeds immediately once the model is warm.
      // One retry after a short delay turns that into a non-issue instead
      // of surfacing a spurious failure on every cold start.
      if (retriesLeft > 0) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        return this.embed(input, retriesLeft - 1);
      }
      throw new Error(`Embedding request failed (${response.status}): ${bodyText}`);
    }

    const body = (await response.json()) as { data: { embedding: number[] }[] };
    return body.data.map((d) => d.embedding);
  }
}

/**
 * LM Studio's /v1/embeddings endpoint requires a model actually loaded as
 * an embedding model — a chat model (see client.ts) can't serve it. Returns
 * null when no embedding model is configured, so callers can degrade
 * gracefully instead of failing.
 */
export function createLmStudioEmbeddings(): EmbeddingsInterface | null {
  if (!config.lmStudio.embeddingModel) return null;

  return new LmStudioEmbeddings(config.lmStudio.baseUrl, config.lmStudio.apiKey, config.lmStudio.embeddingModel);
}
