import { StateGraph, END, START } from '@langchain/langgraph';
import { GraphStateAnnotation } from './state';
import { extractNode } from './nodes/extract';
import { validateNode } from './nodes/validate';
import { translateNode } from './nodes/translate';

/**
 * Extract -> Validate -> Translate, in a straight line. No conditional
 * branching beyond "did an earlier node already fail" — each node is a
 * no-op if state.error is already set.
 */
export function buildQueryGraph() {
  const graph = new StateGraph(GraphStateAnnotation)
    .addNode('extract', extractNode)
    .addNode('validate', validateNode)
    .addNode('translate', translateNode)
    .addEdge(START, 'extract')
    .addEdge('extract', 'validate')
    .addEdge('validate', 'translate')
    .addEdge('translate', END);

  return graph.compile();
}

export type QueryGraph = ReturnType<typeof buildQueryGraph>;
