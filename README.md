# DDF Natural Language Query Builder

Turn a plain-English real estate search ("3 bedroom houses in Ottawa under
500k") into a validated, structured filter set and a ready-to-use DDF
(RESO/OData) URL — via a local LLM through LM Studio and LangGraph.

## How it's built

```
Prompt  →  Extract (LM Studio)  →  Validate (Zod)  →  Translate (pure fn)  →  DDF URL
```

The deterministic pieces (DDF field/operator registry, JSON contract, URL
translator, prompt builder) are fully implemented, unit-tested, and have
zero dependency on the LLM. The LLM is a thin layer on top: it only has to
produce JSON matching a schema; every field, operator, and value it returns
is re-validated before anything is trusted.

```
packages/
  shared/     DDF metadata registry, Zod schema, translator, prompt builder
  backend/    Express + LangGraph (Extract → Validate → Translate), LM Studio client
  frontend/   Next.js UI (prompt box, extracted filters, generated URL)
```

## Prerequisites

- Node.js 20+
- [LM Studio](https://lmstudio.ai/) running locally with a model loaded and
  its local server started (Developer tab → "Start Server", default
  `http://localhost:1234/v1`). Any reasonably capable instruction-following
  model works; tool/function-calling support helps but isn't required —
  the backend falls back gracefully and reports extraction failures rather
  than crashing.

## Setup

```bash
npm install

cp packages/backend/.env.example packages/backend/.env
# edit packages/backend/.env if your LM Studio model name / port differs

cp packages/frontend/.env.local.example packages/frontend/.env.local
```

## Run

```bash
# terminal 1
npm run dev:backend     # http://localhost:4000

# terminal 2
npm run dev:frontend    # http://localhost:3000
```

Open http://localhost:3000, type a search, hit "Build query."

Sanity-check LM Studio connectivity any time via:

```bash
curl http://localhost:4000/health/llm
```

## Test

```bash
npm test                       # backend (mocks the LLM, no LM Studio needed)
npm test -w packages/shared    # translator + schema + prompt-builder tests
```

Current coverage: 43 tests in `shared` (translator: every field × every
valid operator, value formatting, multi-filter joins, orderBy, pagination;
schema: hallucinated-field/operator/type/enum rejection; prompt: no drift
against the metadata registry) and 17 tests in `backend` (extract/validate/
translate node behavior including error paths, and the `/api/query` route
contract).

## Adding a new field

Everything downstream — the JSON schema, the prompt, the translator — is
derived from one place: `packages/shared/src/ddf-metadata.ts`. Add an entry
to `DDF_FIELDS` with its display name, real DDF field name, data type, and
allowed operators, and it propagates automatically. No prompt or schema
edits required.

## Design decisions worth knowing about

- **Two schema variants** (`ddf-schema.ts`): a loose shape handed to the LLM
  as its structured-output target, and a strict refined schema used by the
  Validate node. Some local models handle heavily-refined JSON Schemas
  poorly, so we ask for the simple shape and enforce the real rules
  ourselves afterward.
- **Unsupported filters aren't dropped silently.** If the model recognizes
  an intent it can't map to a known field (e.g. "near a good school"), it's
  asked to report it in an `unsupported` array, which the UI surfaces as a
  "not mapped" ticket item instead of silently ignoring or hallucinating a
  field for it.
- **The graph is intentionally 3 nodes.** Extract → Validate → Translate,
  no branching beyond "an earlier node already failed, so no-op." Add nodes
  only when a concrete requirement shows up.
