import {layoutAdaptiveWithDiagnostics} from "@nodes/layout/adaptive"
import {STORYBOOK_FIXTURES} from "../../layout-fixtures.ts"
import {createLayoutDomCase, diagnostic} from "../layout-case.ts"
import type {LayoutDomCaseProvider} from "../layout-provider.ts"

const fixtures = STORYBOOK_FIXTURES.filter(({policyId}) => policyId === "adaptive")

export const adaptiveLayoutDomProvider: LayoutDomCaseProvider = Object.freeze({
  ids: Object.freeze(fixtures.map(({id}) => id)),
  createCases(ids) {
    return Object.freeze(fixtures.filter(({id}) => ids.includes(id)).map((fixture) => {
      const {result, diagnostics} = layoutAdaptiveWithDiagnostics(fixture.graph)
      return createLayoutDomCase({
        id: fixture.id,
        label: fixture.label,
        policy: "adaptive",
        result,
        diagnostics: [
          diagnostic("candidates", "Candidates", `${diagnostics.attemptedCandidates}/${diagnostics.candidateBudget}`),
          diagnostic("routable", "Routable", diagnostics.routableCandidates),
          diagnostic("selected-sides", "Selected sides", diagnostics.selectedSides.map(({portId, side}) => `${portId}:${side}`).join(", ")),
        ],
      })
    }))
  },
  source(ids) {
    return [
      'import {layoutAdaptiveWithDiagnostics} from "@nodes/layout/adaptive"',
      'import {getStorybookFixture} from "../layout-fixtures.ts"',
      "",
      ...ids.flatMap((id) => [
        `const ${identifier(id)}Graph = getStorybookFixture(${JSON.stringify(id)}).graph`,
        `const ${identifier(id)}Outcome = layoutAdaptiveWithDiagnostics(${identifier(id)}Graph)`,
      ]),
    ].join("\n")
  },
})

function identifier(value: string): string { return value.replaceAll(/[^a-z0-9]+/giu, "_") }
