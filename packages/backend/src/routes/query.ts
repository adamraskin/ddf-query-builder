import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { config } from '../config';
import { buildQueryGraph } from '../graph/build-graph';
import { getDdfAccessToken, DdfConfigError, DdfTokenError } from '../ddf/ddf-token';

/**
 * Milestone 6 — expose the graph through Express.
 *
 * POST /api/query
 * body: { "prompt": "3 bedroom houses in Ottawa under 500k" }
 *
 * Prompt -> JSON -> URL, in one call.
 */
const router = Router();
const graph = buildQueryGraph();

const RequestBodySchema = z.object({
  prompt: z.string().min(1, 'prompt is required'),
});

router.post('/query', async (req: Request, res: Response) => {
  const parsedBody = RequestBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    return res.status(400).json({
      ok: false,
      error: {
        code: 'INVALID_REQUEST',
        message: 'Request body must be { "prompt": string }.',
        details: parsedBody.error.issues,
      },
    });
  }

  try {
    const result = await graph.invoke({ input: parsedBody.data.prompt });

    if (result.error) {
      return res.status(422).json({
        ok: false,
        error: {
          code: 'EXTRACTION_FAILED',
          message: result.error,
          details: result.validationErrors,
        },
      });
    }

    return res.status(200).json({
      ok: true,
      data: {
        query: result.structuredQuery,
        url: result.url,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({
      ok: false,
      error: { code: 'INTERNAL_ERROR', message },
    });
  }
});

router.post('/run-url', async (req: Request, res: Response) => {
  const parsedBody = z.object({ url: z.string().url() }).safeParse(req.body);
  if (!parsedBody.success) {
    return res.status(400).json({
      ok: false,
      error: {
        code: 'INVALID_REQUEST',
        message: 'Request body must be { "url": string }.',
        details: parsedBody.error.issues,
      },
    });
  }

  // Only ever fetch DDF's own configured API with our token attached —
  // never an arbitrary caller-supplied destination. Without this check,
  // /run-url is effectively an open proxy: anyone who can POST here could
  // make this server fetch any URL while attaching a live DDF bearer
  // token in the Authorization header.
  const requestedOrigin = new URL(parsedBody.data.url).origin;
  const allowedOrigin = new URL(config.ddfBaseUrl).origin;
  if (requestedOrigin !== allowedOrigin) {
    return res.status(400).json({
      ok: false,
      error: {
        code: 'INVALID_REQUEST',
        message: `url must point at the configured DDF API (${allowedOrigin}), got ${requestedOrigin}.`,
      },
    });
  }

  try {
    const accessToken = await getDdfAccessToken();

    const response = await fetch(parsedBody.data.url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const body = await response.text();

    return res.status(200).json({
      ok: true,
      data: {
        status: response.status,
        contentType: response.headers.get('content-type'),
        body,
      },
    });
  } catch (err) {
    if (err instanceof DdfConfigError) {
      return res.status(503).json({
        ok: false,
        error: { code: 'DDF_NOT_CONFIGURED', message: err.message },
      });
    }
    if (err instanceof DdfTokenError) {
      return res.status(502).json({
        ok: false,
        error: { code: 'TOKEN_REQUEST_FAILED', message: err.message, details: err.details },
      });
    }
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({
      ok: false,
      error: { code: 'EXECUTION_FAILED', message },
    });
  }
});

export { router as queryRouter };
