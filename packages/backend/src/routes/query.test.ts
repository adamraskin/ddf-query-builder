import { afterEach, describe, it, expect, vi } from 'vitest';
import request from 'supertest';

const invokeMock = vi.fn();

vi.mock('../graph/build-graph', () => ({
  buildQueryGraph: vi.fn(() => ({ invoke: invokeMock })),
}));

const { createApp } = await import('../app');

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
  });

  it('requests an access token and sends it as a bearer header', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ access_token: 'test-token' }),
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
});

describe('GET /health', () => {
  it('returns ok:true', async () => {
    const app = createApp();
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
