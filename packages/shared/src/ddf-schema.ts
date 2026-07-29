import { z } from 'zod';
import { DDF_FIELD_KEYS, DDF_OPERATORS, getFieldMetadata, isOperatorValidForField } from './ddf-metadata';

/**
 * the structured output contract. This is the only thing the LLM is allowed to produce,
 * and the only thing the translator accepts.
 *
 * Finalized before the translator was built, per the plan's #1 risk
 * mitigation: changing this later ripples through prompts, validation,
 * translator logic, and tests.
 */

const FieldEnum = z.enum(DDF_FIELD_KEYS);
const OperatorEnum = z.enum(DDF_OPERATORS);

/**
 * The bare shape, with no cross-field refinement. Used when asking the LLM
 * for structured output — some providers/local models handle refined
 * (superRefine) zod schemas poorly when converted to JSON Schema, so we
 * keep the schema we *request* simple, and validate strictly afterward
 * with DdfFilterSchema in the Validate node (Milestone 6).
 */
export const DdfFilterShape = z.object({
  field: FieldEnum,
  operator: OperatorEnum,
  value: z.union([z.string(), z.number(), z.boolean()]),
});

export const DdfFilterSchema = DdfFilterShape.superRefine((filter, ctx) => {
    const meta = getFieldMetadata(filter.field);
    if (!meta) {
      // Unreachable given the enum, but kept for defense in depth.
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Unknown field: ${filter.field}` });
      return;
    }

    if (!isOperatorValidForField(filter.field, filter.operator)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Operator "${filter.operator}" is not valid for field "${filter.field}". Allowed: ${meta.operators.join(', ')}`,
        path: ['operator'],
      });
    }

    const actualType = typeof filter.value;
    const expected = meta.dataType;
    const typeOk =
      (expected === 'string' && actualType === 'string') ||
      (expected === 'number' && actualType === 'number') ||
      (expected === 'boolean' && actualType === 'boolean');

    if (!typeOk) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Field "${filter.field}" expects a ${expected} value, got ${actualType}`,
        path: ['value'],
      });
    }

    if (meta.allowedValues && expected === 'string') {
      const allowed = meta.allowedValues as readonly string[];
      if (!allowed.includes(filter.value as string)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Value "${filter.value}" is not one of the allowed values for "${filter.field}": ${allowed.join(', ')}`,
          path: ['value'],
        });
      }
    }
  });

export const DdfOrderBySchema = z.object({
  field: FieldEnum,
  direction: z.enum(['asc', 'desc']),
});

export const DdfPaginationSchema = z
  .object({
    top: z.number().int().positive().max(200).nullable().optional(),
    skip: z.number().int().nonnegative().nullable().optional(),
    count: z.boolean().nullable().optional(),
  })
  .transform(
    (p): { top?: number; skip?: number; count?: boolean } => ({
      top: p.top ?? undefined,
      skip: p.skip ?? undefined,
      count: p.count ?? undefined,
    }),
  );

/** Loose version handed to the LLM as its structured-output target (Extract node). */
export const DdfStructuredQueryShape = z.object({
  filters: z.array(DdfFilterShape).default([]),
  orderBy: z.array(DdfOrderBySchema).default([]),
  pagination: DdfPaginationSchema.default({}),
  /**
   * Anything the model recognized as an intended filter but could not map
   * to a known field/operator/value. Surfaced to the user instead of
   * silently dropped or silently hallucinated (Risk #4).
   */
  unsupported: z.array(z.string()).default([]),
});

/** Strict version used by the Validate node: same shape, but each filter is fully checked. */
export const DdfStructuredQuerySchema = z.object({
  filters: z.array(DdfFilterSchema).default([]),
  orderBy: z.array(DdfOrderBySchema).default([]),
  pagination: DdfPaginationSchema.default({}),
  unsupported: z.array(z.string()).default([]),
});

export type DdfFilter = z.infer<typeof DdfFilterSchema>;
export type DdfOrderBy = z.infer<typeof DdfOrderBySchema>;
export type DdfPagination = z.infer<typeof DdfPaginationSchema>;
export type DdfStructuredQuery = z.infer<typeof DdfStructuredQuerySchema>;

/** JSON Schema (not Zod) for providers that want a raw schema, e.g. for structured-output APIs. */
export function ddfStructuredQueryJsonSchema() {
  return {
    name: 'ddf_structured_query',
    schema: {
      type: 'object',
      properties: {
        filters: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              field: { type: 'string', enum: DDF_FIELD_KEYS },
              operator: { type: 'string', enum: DDF_OPERATORS },
              value: { type: ['string', 'number', 'boolean'] },
            },
            required: ['field', 'operator', 'value'],
            additionalProperties: false,
          },
        },
        orderBy: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              field: { type: 'string', enum: DDF_FIELD_KEYS },
              direction: { type: 'string', enum: ['asc', 'desc'] },
            },
            required: ['field', 'direction'],
            additionalProperties: false,
          },
        },
        pagination: {
          type: 'object',
          properties: {
            top: { type: 'number' },
            skip: { type: 'number' },
            count: { type: 'boolean' },
          },
          additionalProperties: false,
        },
        unsupported: {
          type: 'array',
          items: { type: 'string' },
        },
      },
      required: ['filters'],
      additionalProperties: false,
    },
  } as const;
}
