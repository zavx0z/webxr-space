import {layoutFixed} from "@nodes/layout/fixed"
import {getFixtureFamily} from "../../layout-fixtures.ts"
import {createLayoutDomCase} from "../layout-case.ts"
import type {LayoutDomCaseProvider} from "../layout-provider.ts"

const fixtures = getFixtureFamily("fixed-baseline")

export const fixedLayoutDomProvider: LayoutDomCaseProvider = Object.freeze({
  ids: Object.freeze(fixtures.map(({id}) => id)),
  createCases(ids) {
    return Object.freeze(fixtures.filter(({id}) => ids.includes(id)).map((fixture) => createLayoutDomCase({
      id: fixture.id,
      label: fixture.label,
      policy: "fixed",
      result: layoutFixed(fixture.graph),
    })))
  },
  source(ids) {
    return [
      'import {layoutFixed} from "@nodes/layout/fixed"',
      'import {getStorybookFixture} from "../layout-fixtures.ts"',
      "",
      ...ids.flatMap((id) => [
        `const ${identifier(id)}Graph = getStorybookFixture(${JSON.stringify(id)}).graph`,
        `const ${identifier(id)}Result = layoutFixed(${identifier(id)}Graph)`,
      ]),
    ].join("\n")
  },
})

function identifier(value: string): string { return value.replaceAll(/[^a-z0-9]+/giu, "_") }
