import {layoutAdaptiveWithDiagnostics} from "@nodes/layout/adaptive"
import {layoutFixed} from "@nodes/layout/fixed"
import type {StorybookPolicy, StorybookPolicyId} from "./layout-storybook-types.ts"

const fixed: StorybookPolicy = {
  id: "fixed",
  label: "Фиксированная",
  description: "Публичная политика фиксированных портов: источники выходят справа (EAST), цели принимают слева (WEST).",
  run(graph) {
    return {
      result: layoutFixed(graph),
      diagnostics: {kind: "fixed", candidateCount: 1},
    }
  },
}

const adaptive: StorybookPolicy = {
  id: "adaptive",
  label: "Адаптивная",
  description: "Публичная ограниченная политика: для каждого точного сокета выбирается одна сторона — левая (WEST) или правая (EAST).",
  run(graph) {
    const outcome = layoutAdaptiveWithDiagnostics(graph)
    return {result: outcome.result, diagnostics: outcome.diagnostics}
  },
}

/**
 * Dev-only registry. A policy is visible in the storybook only after its
 * independent public entrypoint exists; the storybook never selects an
 * implementation through a production runtime switch.
 */
export const STORYBOOK_POLICIES: readonly StorybookPolicy[] = [fixed, adaptive]

export function getStorybookPolicy(id: StorybookPolicyId): StorybookPolicy {
  const policy = STORYBOOK_POLICIES.find((candidate) => candidate.id === id)
  if (policy === undefined) throw new Error(`Неизвестная политика стенда: ${id}`)
  return policy
}
