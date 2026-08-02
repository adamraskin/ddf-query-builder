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

Example 4 (no "or" support, soft preference, unrelated concept — none of these become filters)
User: "residential homes in Ottawa or Gatineau, waterfront preferred, near good schools, under 600k"
Output:
{
  "filters": [
    { "field": "PropertyType", "operator": "eq", "value": "Residential" },
    { "field": "ListPrice", "operator": "lt", "value": 600000 }
  ],
  "orderBy": [],
  "pagination": { "top": null, "skip": null, "count": null },
  "unsupported": [
    "city is Ottawa or Gatineau (this system can't express \\"or\\"; no city filter was applied)",
    "waterfront preferred (soft preference, not filtered)",
    "near good schools"
  ]
}
Note what did NOT happen: no City filter was invented to fake the "or" (that would silently match nothing), Waterfront was not set to true or false for a soft preference, and "near good schools" was not searched for inside the City field.

Example 5 (nothing mentioned about pool/waterfront/garage — none of them appear in filters)
User: "recently renovated houses with a finished basement in Gatineau"
Output:
{
  "filters": [
    { "field": "City", "operator": "eq", "value": "Gatineau" }
  ],
  "orderBy": [],
  "pagination": { "top": null, "skip": null, "count": null },
  "unsupported": ["recently renovated", "finished basement"]
}
Note what did NOT happen: Pool, Waterfront, and Garage were never mentioned, so none of them appear in "filters" — not even as "eq false".

Example 6 (property style not in the PropertyType allowed values)
User: "waterfront cottage-style property, 2 to 3 bedrooms"
Output:
{
  "filters": [
    { "field": "PropertyType", "operator": "eq", "value": "Residential" },
    { "field": "Waterfront", "operator": "eq", "value": true },
    { "field": "BedroomsTotal", "operator": "gte", "value": 2 },
    { "field": "BedroomsTotal", "operator": "lte", "value": 3 }
  ],
  "orderBy": [],
  "pagination": { "top": null, "skip": null, "count": null },
  "unsupported": ["cottage-style"]
}
Note what did NOT happen: PropertyType was NOT set to "Cottage" — that value doesn't exist in the allowed list. "Residential" was used as the closest real match, and "cottage-style" was noted in "unsupported" instead of being invented as a new enum value.
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
- Never add a filter for a boolean field (Pool, Waterfront, Garage) just because the user didn't mention it. Not mentioned means the field is absent from "filters" entirely — never "eq false". Only include a boolean filter when the user actually states something about that specific thing.
- This system can only combine filters with AND — there is no "or". If the user asks for one field to match one of several alternatives (e.g. "in Ottawa or Gatineau"), you cannot express that as a filter. Do not fake it by adding multiple "contains" or "eq" conditions on the same field — that produces an impossible AND (e.g. a city can never equal both "Ottawa" and "Gatineau" at once) and silently returns zero results. Instead, leave that field out of "filters" entirely and describe the "or" requirement in "unsupported".
- Only use "contains" on the "City" field to match part of a city name. Never use it to search the City field for unrelated concepts like neighborhoods, amenities, walkability, or school quality — those are not city names. If a concept doesn't fit a real field, put it in "unsupported" instead of forcing it into an unrelated one.
- Distinguish hard requirements from soft preferences. Words like "preferred", "ideally", "ok to have", "nice to have", "not required", or "no X needed" describe a soft preference, not a hard requirement — do not turn these into a filter (not "eq true", not "eq false"). Add a short note to "unsupported" instead, e.g. "waterfront preferred (soft, not filtered)".
- If the user doesn't specify a sort order, leave "orderBy" as an empty array. Only add an "orderBy" entry when the user explicitly asks for one (e.g. "cheapest first", "sorted by X", "highest to lowest"). A request about how many results to return ("first 5", "top 8", "give me 3") is about pagination, not sorting — do not infer a sort order from it.
- If the user doesn't specify pagination (how many results, which page, whether to include a count), set "top", "skip", and "count" to null. Do not invent a page size or offset — leave them null and the correct default is applied downstream.
- For any field with an "Allowed values" list (like PropertyType), you may ONLY use one of those exact values — never invent a new one. If the user describes a property style that isn't in that list (e.g. "cottage", "bungalow", "townhouse"), do not make up a new value for it. Either use the closest real allowed value if one clearly fits (e.g. "cottage" -> "Residential"), or omit that field entirely — and either way, add the specific style descriptor to "unsupported" so it isn't silently lost (e.g. "cottage-style").
- Never fabricate values the user did not provide or imply.

## Examples
${FEW_SHOT_EXAMPLES}`;
}

export function buildUserPrompt(naturalLanguageQuery: string): string {
  return naturalLanguageQuery.trim();
}