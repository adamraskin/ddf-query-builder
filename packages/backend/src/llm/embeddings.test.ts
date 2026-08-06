import { afterEach, describe, expect, it, vi } from 'vitest';

// config.ts reads process.env once at import time (via `required()` and
// direct reads), so each test that needs a specific LM_STUDIO_EMBEDDING_MODEL
// value must reset the module registry and re-import fresh — mutating
// process.env after config.ts has already loaded does nothing (same pattern
// as config.test.ts).
async function freshCreateLmStudioEmbeddings() {
  vi.resetModules();
  const mod = await import('./embeddings');
  return mod.createLmStudioEmbeddings;
}

function okResponse(embeddings: number[][]) {
  return {
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue({ data: embeddings.map((embedding) => ({ embedding })) }),
    text: vi.fn(),
  };
}

function errorResponse(status: number, bodyText: string) {
  return {
    ok: false,
    status,
    json: vi.fn(),
    text: vi.fn().mockResolvedValue(bodyText),
  };
}

describe('createLmStudioEmbeddings', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    delete process.env.LM_STUDIO_EMBEDDING_MODEL;
  });

  it('returns null when no embedding model is configured', async () => {
    // Deliberately '' rather than delete: config.ts loads dotenv fresh on
    // every re-import (see freshCreateLmStudioEmbeddings), and dotenv only
    // fills in variables that are truly absent from process.env — a
    // deleted key would just get silently repopulated from the real
    // packages/backend/.env on this machine, defeating the test.
    process.env.LM_STUDIO_EMBEDDING_MODEL = '';
    const createLmStudioEmbeddings = await freshCreateLmStudioEmbeddings();
    expect(createLmStudioEmbeddings()).toBeNull();
  });

  it('requests encoding_format: "float" explicitly (regression: base64 default silently corrupts LM Studio vectors into zeros)', async () => {
    process.env.LM_STUDIO_EMBEDDING_MODEL = 'test-embed-model';
    const createLmStudioEmbeddings = await freshCreateLmStudioEmbeddings();
    const fetchMock = vi.fn().mockResolvedValue(okResponse([[1, 2, 3]]));
    vi.stubGlobal('fetch', fetchMock);

    await createLmStudioEmbeddings()!.embedQuery('hello');

    const [, requestInit] = fetchMock.mock.calls[0];
    expect(JSON.parse(requestInit.body).encoding_format).toBe('float');
  });

  it('embedQuery returns the single embedding, embedDocuments returns one per input', async () => {
    process.env.LM_STUDIO_EMBEDDING_MODEL = 'test-embed-model';
    const createLmStudioEmbeddings = await freshCreateLmStudioEmbeddings();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(okResponse([[1, 0]]))
      .mockResolvedValueOnce(okResponse([[0, 1], [1, 1]]));
    vi.stubGlobal('fetch', fetchMock);

    const embeddings = createLmStudioEmbeddings()!;
    expect(await embeddings.embedQuery('a')).toEqual([1, 0]);
    expect(await embeddings.embedDocuments(['b', 'c'])).toEqual([[0, 1], [1, 1]]);
  });

  it('regression: retries once after a 500 (LM Studio cold-start failure), succeeding on the second attempt', async () => {
    vi.useFakeTimers();
    process.env.LM_STUDIO_EMBEDDING_MODEL = 'test-embed-model';
    const createLmStudioEmbeddings = await freshCreateLmStudioEmbeddings();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(errorResponse(500, '<html>Internal Server Error</html>'))
      .mockResolvedValueOnce(okResponse([[1, 2, 3]]));
    vi.stubGlobal('fetch', fetchMock);

    const resultPromise = createLmStudioEmbeddings()!.embedQuery('hello');
    await vi.advanceTimersByTimeAsync(1500);

    expect(await resultPromise).toEqual([1, 2, 3]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws with the response status and body when the retry also fails', async () => {
    vi.useFakeTimers();
    process.env.LM_STUDIO_EMBEDDING_MODEL = 'test-embed-model';
    const createLmStudioEmbeddings = await freshCreateLmStudioEmbeddings();
    const fetchMock = vi.fn().mockResolvedValue(errorResponse(500, '<html>Internal Server Error</html>'));
    vi.stubGlobal('fetch', fetchMock);

    const resultPromise = createLmStudioEmbeddings()!.embedQuery('hello');
    // Attach the rejection assertion before advancing timers so the
    // eventual rejection is never briefly unhandled.
    const assertion = expect(resultPromise).rejects.toThrow(/Embedding request failed \(500\)/);
    await vi.advanceTimersByTimeAsync(1500);
    await assertion;

    expect(fetchMock).toHaveBeenCalledTimes(2); // original attempt + one retry, no more
  });
});
