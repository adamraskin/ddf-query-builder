import { Annotation } from '@langchain/langgraph';
import { DdfStructuredQuery } from '@ddf/shared';

/** Three nodes only: Extract -> Validate -> Translate. */
export const GraphStateAnnotation = Annotation.Root({
  /** The user's original natural-language request. */
  input: Annotation<string>(),

  /** Raw JSON parsed from the LLM's response, before schema validation. */
  rawOutput: Annotation<unknown>({
    reducer: (_prev, next) => next,
    default: () => undefined,
  }),

  /** The validated, typed structured query. Undefined until validation succeeds. */
  structuredQuery: Annotation<DdfStructuredQuery | undefined>({
    reducer: (_prev, next) => next,
    default: () => undefined,
  }),

  /** Human-readable validation problems, if any. */
  validationErrors: Annotation<string[]>({
    reducer: (_prev, next) => next,
    default: () => [],
  }),

  /** The final translated DDF OData URL. */
  url: Annotation<string | undefined>({
    reducer: (_prev, next) => next,
    default: () => undefined,
  }),

  /** Set if extraction or translation hit an unrecoverable error. */
  error: Annotation<string | undefined>({
    reducer: (_prev, next) => next,
    default: () => undefined,
  }),
});

export type GraphState = typeof GraphStateAnnotation.State;
