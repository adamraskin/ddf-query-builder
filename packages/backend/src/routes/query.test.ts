import { afterEach, describe, it, expect, vi } from 'vitest';
import request from 'supertest';

// Config is loaded once at import time, so DDF OAuth env vars must be set
// before importing the app — not inside individual tests. Previously this
// test had no explicit env setup and only passed if a local .env file
// happened to contain matching values, which isn't reproducible.
process.env.DDF_CLIENT_ID = 'test-client-id';
process.env.DDF_CLIENT_SECRET = 'test-client-secret';
process.env.DDF_TOKEN_URL = 'https://identity.crea.ca/connect/token';
process.env.DDF_BASE_URL = 'https://ddfapi.realtor.ca/odata/v1/Property';

const invokeMock = vi.fn();

vi.mock('../graph/build-graph', () => ({
  buildQueryGraph: vi.fn(() => ({ invoke: invokeMock })),
}));

const createLmStudioEmbeddingsMock = vi.fn();

vi.mock('../llm/embeddings', () => ({
  createLmStudioEmbeddings: () => createLmStudioEmbeddingsMock(),
}));

const { createApp } = await import('../app');
const { _resetDdfTokenCacheForTests } = await import('../ddf/ddf-token');

describe('POST /api/query', () => {
  it('rejects a missing prompt with 400', async () => {
    const app = createApp();
    const res = await request(app).post('/api/query').send({});
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe('INVALID_REQUEST');
  });

  it('returns 200 with query + url on success', async () => {
    invokeMock.mockResolvedValue({
      structuredQuery: {
        filters: [{ field: 'City', operator: 'eq', value: 'Ottawa' }],
        orderBy: [],
        pagination: {},
        unsupported: [],
      },
      url: 'https://ddfapi.realtor.ca/odata/v1/Property?$filter=City%20eq%20%27Ottawa%27',
    });

    const app = createApp();
    const res = await request(app).post('/api/query').send({ prompt: 'houses in Ottawa' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.url).toContain('ddfapi');
  });

  it('returns 422 when the graph reports an error', async () => {
    invokeMock.mockResolvedValue({
      error: 'The extracted query failed validation.',
      validationErrors: ['filters.0.field: Unknown field'],
    });

    const app = createApp();
    const res = await request(app).post('/api/query').send({ prompt: 'gibberish request' });
    expect(res.status).toBe(422);
    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe('EXTRACTION_FAILED');
  });
});

describe('POST /api/run-url', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    _resetDdfTokenCacheForTests();
    createLmStudioEmbeddingsMock.mockReset();
  });

  it('requests an access token and sends it as a bearer header', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ access_token: 'test-token', expires_in: 300 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: (name: string) => (name === 'content-type' ? 'application/json' : null) },
        text: vi.fn().mockResolvedValue('{"ok":true}'),
      });

    vi.stubGlobal('fetch', fetchMock);

    const app = createApp();
    const res = await request(app).post('/api/run-url').send({
      url: 'https://ddfapi.realtor.ca/odata/v1/Property?$top=5',
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const tokenCall = fetchMock.mock.calls[0];
    expect(tokenCall[0]).toBe('https://identity.crea.ca/connect/token');
    expect(tokenCall[1]).toMatchObject({
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('regression: rejects a URL whose origin is not the configured DDF API (SSRF guard)', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const app = createApp();
    const res = await request(app).post('/api/run-url').send({
      url: 'https://attacker.example.com/steal-token',
    });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    // Must never even attempt to fetch a token for a disallowed destination.
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('regression: reuses a cached token instead of requesting a new one for every call', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ access_token: 'cached-token', expires_in: 300 }),
      })
      .mockResolvedValue({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        text: vi.fn().mockResolvedValue('{"ok":true}'),
      });

    vi.stubGlobal('fetch', fetchMock);

    const app = createApp();
    await request(app).post('/api/run-url').send({ url: 'https://ddfapi.realtor.ca/odata/v1/Property?$top=5' });
    await request(app).post('/api/run-url').send({ url: 'https://ddfapi.realtor.ca/odata/v1/Property?$top=10' });

    // 1 token request + 2 data requests = 3, not 4 (no second token request).
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const tokenCalls = fetchMock.mock.calls.filter((c) => c[0] === 'https://identity.crea.ca/connect/token');
    expect(tokenCalls).toHaveLength(1);
  });

  function mockDdfFetch(bodyText: string) {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ access_token: 'test-token', expires_in: 300 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: (name: string) => (name === 'content-type' ? 'application/json' : null) },
        text: vi.fn().mockResolvedValue(bodyText),
      });
    vi.stubGlobal('fetch', fetchMock);
  }

  it('semantic ranking: re-ranks listings by PublicRemarks similarity when a prompt and an embedding model are provided', async () => {
    mockDdfFetch(
      JSON.stringify({
        value: [
          { ListingKey: 'far', PublicRemarks: 'far text' },
          { ListingKey: 'close', PublicRemarks: 'close text' },
        ],
      }),
    );
    createLmStudioEmbeddingsMock.mockReturnValue({
      embedQuery: vi.fn().mockResolvedValue([1, 0]),
      embedDocuments: vi.fn().mockResolvedValue([
        [0, 1], // far
        [0.9, 0.1], // close
      ]),
    });

    const app = createApp();
    const res = await request(app)
      .post('/api/run-url')
      .send({ url: 'https://ddfapi.realtor.ca/odata/v1/Property?$top=5', prompt: 'quiet street' });

    expect(res.status).toBe(200);
    expect(res.body.data.rankingUnavailable).toBeUndefined();
    expect(res.body.data.ranked.map((r: { listing: { ListingKey: string } }) => r.listing.ListingKey)).toEqual([
      'close',
      'far',
    ]);
    expect(res.body.data.status).toBe(200); // base response untouched
  });

  it('semantic ranking: skipped (with a note) when no embedding model is configured, base response unaffected', async () => {
    mockDdfFetch(JSON.stringify({ value: [{ ListingKey: '1', PublicRemarks: 'text' }] }));
    createLmStudioEmbeddingsMock.mockReturnValue(null);

    const app = createApp();
    const res = await request(app)
      .post('/api/run-url')
      .send({ url: 'https://ddfapi.realtor.ca/odata/v1/Property?$top=5', prompt: 'quiet street' });

    expect(res.status).toBe(200);
    expect(res.body.data.ranked).toBeUndefined();
    expect(res.body.data.rankingUnavailable).toContain('No embedding model configured');
    expect(res.body.data.status).toBe(200);
    expect(res.body.data.body).toContain('PublicRemarks');
  });

  it('semantic ranking: skipped silently-noted when the response body is not a listings payload', async () => {
    mockDdfFetch('{"error":"not found"}');
    createLmStudioEmbeddingsMock.mockReturnValue({
      embedQuery: vi.fn(),
      embedDocuments: vi.fn(),
    });

    const app = createApp();
    const res = await request(app)
      .post('/api/run-url')
      .send({ url: 'https://ddfapi.realtor.ca/odata/v1/Property?$top=5', prompt: 'quiet street' });

    expect(res.status).toBe(200);
    expect(res.body.data.ranked).toBeUndefined();
    expect(res.body.data.rankingUnavailable).toContain('not a recognizable DDF listings payload');
  });

  it('semantic ranking: not attempted at all when no prompt is sent', async () => {
    mockDdfFetch(JSON.stringify({ value: [{ ListingKey: '1', PublicRemarks: 'text' }] }));
    createLmStudioEmbeddingsMock.mockReturnValue({
      embedQuery: vi.fn(),
      embedDocuments: vi.fn(),
    });

    const app = createApp();
    const res = await request(app).post('/api/run-url').send({ url: 'https://ddfapi.realtor.ca/odata/v1/Property?$top=5' });

    expect(res.status).toBe(200);
    expect(res.body.data.ranked).toBeUndefined();
    expect(res.body.data.rankingUnavailable).toBeUndefined();
    expect(createLmStudioEmbeddingsMock).not.toHaveBeenCalled();
  });
});

describe('GET /health', () => {
  it('returns ok:true', async () => {
    const app = createApp();
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
