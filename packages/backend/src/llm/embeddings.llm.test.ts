import { describe, it, expect } from 'vitest';
import { config } from '../config';
import { createLmStudioEmbeddings } from './embeddings';
import { cosineSimilarity } from '../semantic/cosine-similarity';

/**
 * Regression coverage for a real bug: @langchain/openai's OpenAIEmbeddings
 * omits encoding_format from its request, so the underlying openai SDK
 * defaults to requesting "base64" and unconditionally base64-decodes the
 * response. LM Studio ignores that request param and returns plain JSON
 * floats regardless, so the SDK silently mis-decoded every embedding into
 * an all-zero vector — no error, no thrown exception, just 0.0 similarity
 * for every listing. None of the mocked unit tests (cosine-similarity,
 * rank-listings, the /run-url route tests) could ever catch this, since
 * they all stub the embeddings client — only a real call to the real
 * server exercises the actual request/response wiring.
 *
 * Opt-in only (`npm run test:llm`): needs LM Studio reachable AND an
 * embedding model configured (LM_STUDIO_EMBEDDING_MODEL).
 */

async function isLmStudioReachable(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${config.lmStudio.baseUrl}/models`, {
      headers: { Authorization: `Bearer ${config.lmStudio.apiKey}` },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}

const reachable = await isLmStudioReachable();
const embeddingConfigured = Boolean(config.lmStudio.embeddingModel);

if (!reachable || !embeddingConfigured) {
  // eslint-disable-next-line no-console
  console.warn(
    `\n[embeddings.llm.test] Skipping: ${
      !reachable ? `LM Studio not reachable at ${config.lmStudio.baseUrl}` : 'LM_STUDIO_EMBEDDING_MODEL not set'
    }.\n`,
  );
}

function magnitude(vector: number[]): number {
  return Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
}

describe.skipIf(!reachable || !embeddingConfigured)(`LM Studio embeddings (model: ${config.lmStudio.embeddingModel})`, () => {
  it('regression: embedQuery returns a real, non-zero vector', async () => {
    const embeddings = createLmStudioEmbeddings();
    if (!embeddings) throw new Error('expected an embeddings client');

    const vector = await embeddings.embedQuery('quiet, walkable street');
    expect(vector.length).toBeGreaterThan(0);
    expect(magnitude(vector)).toBeGreaterThan(0);
  });

  it('regression: embedDocuments returns real, non-zero vectors for every input', async () => {
    const embeddings = createLmStudioEmbeddings();
    if (!embeddings) throw new Error('expected an embeddings client');

    const vectors = await embeddings.embedDocuments(['walkable street', 'loud highway-adjacent unit']);
    expect(vectors).toHaveLength(2);
    for (const vector of vectors) {
      expect(magnitude(vector)).toBeGreaterThan(0);
    }
  });

  it('semantically similar text scores meaningfully higher than dissimilar text', async () => {
    const embeddings = createLmStudioEmbeddings();
    if (!embeddings) throw new Error('expected an embeddings client');

    const query = await embeddings.embedQuery('walkable, quiet street');
    const [close, far] = await embeddings.embedDocuments([
      'A quiet, walkable street close to downtown.',
      'Loud highway-adjacent commercial unit.',
    ]);

    const simClose = cosineSimilarity(query, close);
    const simFar = cosineSimilarity(query, far);

    expect(simClose).toBeGreaterThan(simFar);
    expect(simClose).toBeGreaterThan(0.3); // not just "less bad", genuinely similar
  });
});
