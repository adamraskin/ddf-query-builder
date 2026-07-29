import { DDF_FIELDS, DDF_OPERATORS, DdfFieldMetadata } from './ddf-metadata';

/**
 * The system prompt is generated entirely from the DDF metadata registry
 * (ddf-metadata.ts). Nothing about fields or operators is hardcoded here,
 * so adding/removing a field automatically updates the prompt (Risk #3:
 * prompt drift).
 */

function describeField(field: DdfFieldMetadata): string {
  const ops = field.operators.join(', ');
  const examples = field.examples.map((e) => JSON.stringify(e)).join(', ');
  const allowed = field.allowedValues ? ` Allowed values: ${field.allowedValues.join(', ')}.` : '';
  return `- "${field.key}" (${field.dataType}): ${field.description} Supported operators: ${ops}. Example values: ${examples}.${allowed}`;
}

function buildFieldSection(): string {
  return DDF_FIELDS.map(describeField).join('\n');
}

function buildOperatorSection(): string {
  const descriptions: Record<string, string> = {
    eq: 'equals',
    gt: 'greater than',
    gte: 'greater than or equal to',
    lt: 'less than',
    lte: 'less than or equal to',
    contains: 'text contains (substring match)',
  };
  return DDF_OPERATORS.map((op) => `- ${op}: ${descriptions[op]}`).join('\n');
}

const FEW_SHOT_EXAMPLES = `
Example 1
User: "3 bedroom houses in Ottawa under 500k"
Output:
{
  "filters": [
    { "field": "City", "operator": "eq", "value": "Ottawa" },
    { "field": "BedroomsTotal", "operator": "gte", "value": 3 },
    { "field": "ListPrice", "operator": "lt", "value": 500000 }
  ],
  "orderBy": [],
  "pagination": { "top": null, "skip": null, "count": null },
  "unsupported": []
}

Example 2
User: "waterfront condos with a pool, cheapest first"
Output:
{
  "filters": [
    { "field": "PropertyType", "operator": "eq", "value": "Condo" },
    { "field": "Waterfront", "operator": "eq", "value": true },
    { "field": "Pool", "operator": "eq", "value": true }
  ],
  "orderBy": [{ "field": "ListPrice", "direction": "asc" }],
  "pagination": { "top": null, "skip": null, "count": null },
  "unsupported": []
}

Example 3 (partially unsupported request)
User: "homes near a good school district with at least 2 bathrooms"
Output:
{
  "filters": [
    { "field": "BathroomsTotal", "operator": "gte", "value": 2 }
  ],
  "orderBy": [],
  "pagination": { "top": null, "skip": null, "count": null },
  "unsupported": ["near a good school district"]
}
`.trim();

export function buildSystemPrompt(): string {
  return `You are a query-extraction engine for a Canadian real estate search system (DDF).

Your job: read a natural-language real estate search request and translate it into a single JSON object matching the schema described below. You do not answer questions, you do not chat, and you never explain yourself — you only return the JSON object.

## Supported fields
${buildFieldSection()}

## Supported operators
${buildOperatorSection()}

## Output requirements
- Return ONLY a single JSON object. No markdown fences, no prose, no commentary.
- Only use fields from the "Supported fields" list above, using the exact field key shown (e.g. "BedroomsTotal", not "bedrooms").
- Only use operators listed as supported for that specific field.
- Match each field's data type exactly (numbers are numbers, not strings; booleans are true/false).
- If the user mentions a filter you cannot map to a supported field (e.g. "near a school", "recently renovated"), do NOT invent a field for it. Instead add a short phrase describing it to the "unsupported" array so it can be surfaced to the user.
- If the user doesn't specify a sort order, leave "orderBy" as an empty array.
- - If the user doesn't specify pagination (how many results, which page, whether to include a count), set "top", "skip", and "count" to null. Do not invent a page size or offset — leave them null and the correct default is applied downstream.
- Never fabricate values the user did not provide or imply.

## Examples
${FEW_SHOT_EXAMPLES}`;
}

export function buildUserPrompt(naturalLanguageQuery: string): string {
  return naturalLanguageQuery.trim();
}
