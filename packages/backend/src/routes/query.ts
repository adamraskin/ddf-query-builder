import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { buildQueryGraph } from '../graph/build-graph';

/**
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

export { router as queryRouter };
