import {describe, expect, test} from "bun:test"
import {createDocument, MouseEvent} from "@zavx0z/dom"
import {layoutFixed} from "@nodes/layout/fixed"
import {getStorybookFixture} from "../layout-fixtures.ts"
import {LAYOUT_DOM_ROUTES, createLayoutDomStory} from "./layout-dom-story.ts"

describe("Layout DOM family story", () => {
  test("covers every existing Layout overview and leaf", async () => {
    expect(LAYOUT_DOM_ROUTES).toEqual([
      "layout",
      "layout/fixed",
      "layout/fixed/baseline",
      "layout/fixed/baseline/right",
      "layout/fixed/baseline/down",
      "layout/adaptive",
      "layout/adaptive/shared",
      "layout/adaptive/shared/right",
      "layout/adaptive/shared/down",
      "layout/adaptive/compound",
      "layout/adaptive/compound/right",
      "layout/adaptive/compound/down",
      "layout/dagre-layered",
      "layout/dagre-layered/default",
      "layout/dagre-layered/default/default",
      "layout/coffman-graham",
      "layout/coffman-graham/default",
      "layout/coffman-graham/default/default",
    ])
    for (const route of LAYOUT_DOM_ROUTES) {
      const story = await createLayoutDomStory(createDocument(), route)
      expect(story.element.className, route).toBe("layout-dom")
      expect(story.props.cases.length, route).toBeGreaterThan(0)
      expect(story.props.cases.every(({nodes, ports, edges}) => nodes.length > 0 && ports.length > 0 && edges.length > 0), route).toBeTrue()
      story.dispose()
    }
  })

  test("projects exact domain geometry and adaptive diagnostics", async () => {
    const fixed = await createLayoutDomStory(createDocument(), "layout/fixed/baseline/right")
    const expected = layoutFixed(getStorybookFixture("fixed-baseline-right").graph)
    expect(fixed.props.cases[0]).toMatchObject({
      id: "fixed-baseline-right",
      direction: expected.direction,
      bounds: expected.bounds,
      nodes: expected.nodes,
      ports: expected.ports,
    })
    const adaptive = await createLayoutDomStory(createDocument(), "layout/adaptive/shared/right")
    const diagnostics = Object.fromEntries(adaptive.props.cases[0]!.diagnostics.map(({id, value}) => [id, value]))
    expect(diagnostics.candidates).toMatch(/^\d+\/16$/)
    expect(diagnostics["selected-sides"]).toContain("source/shared:EAST")
    expect(adaptive.source().typescript).toContain('from "@nodes/layout/adaptive"')
    expect(adaptive.source().typescript).not.toContain("@nodes/layout/fixed")
  })

  test("aggregates four real policies only on the primary overview", async () => {
    const story = await createLayoutDomStory(createDocument(), "layout")
    expect(story.props.cases.map(({policy}) => policy)).toEqual([
      "fixed", "adaptive", "dagre-layered", "coffman-graham",
    ])
    expect(story.props.cases.find(({policy}) => policy === "coffman-graham")?.diagnostics)
      .toContainEqual({id: "crossings", label: "Crossing bridges", value: "192"})
    const source = story.source().typescript
    for (const owner of ["fixed", "adaptive", "top-down", "coffman-graham"]) expect(source).toContain(`@nodes/layout/${owner}`)
  })

  test("transports layered cubic chains into one semantic Path per edge without Node sampling", async () => {
    const dagre = await createLayoutDomStory(createDocument(), "layout/dagre-layered/default/default")
    const dagreCase = dagre.props.cases[0]!
    expect(dagreCase.edges).toHaveLength(20)
    expect(dagreCase.edges.reduce((total, edge) => total + edge.segmentCount, 0)).toBe(44)
    expect(dagreCase.edges.every(({d}) => d.startsWith("M ") && d.includes(" C "))).toBeTrue()
    expect(dagreCase.edges.every(({id}) => {
      const element = dagre.caseRefs(dagreCase.id)!.edge(id)
      return element?.localName === "vector-path" && element.childNodes.length === 0
    })).toBeTrue()

    const coffman = await createLayoutDomStory(createDocument(), "layout/coffman-graham/default/default")
    const coffmanCase = coffman.props.cases[0]!
    expect(coffmanCase.edges).toHaveLength(85)
    expect(coffmanCase.edges.reduce((total, edge) => total + edge.segmentCount, 0)).toBe(785)
    dagre.dispose()
    coffman.dispose()
  })

  test("controls route/port visibility with stable computed identities", async () => {
    const story = await createLayoutDomStory(createDocument(), "layout/fixed/baseline/right")
    const refs = story.caseRefs("fixed-baseline-right")!
    const node = refs.node("producer")
    story.element.querySelector('[data-action="toggle-routes"]')!
      .dispatchEvent(new MouseEvent("click", {bubbles: true, cancelable: true}))
    expect(story.props.showRoutes).toBeFalse()
    expect(story.caseRefs("fixed-baseline-right")).toBe(refs)
    expect(refs.node("producer")).toBe(node)
    expect(story.source().typescript).toContain("const showRoutes = false")
  })

  test("keeps exact policy loaders private and free of retained presentation owners", async () => {
    const routeSource = await Bun.file(new URL("./layout-dom-story.ts", import.meta.url)).text()
    expect(routeSource).toContain('import("./providers/fixed.ts")')
    expect(routeSource).toContain('import("./providers/adaptive.ts")')
    expect(routeSource).toContain('import("./providers/dagre-layered.ts")')
    expect(routeSource).toContain('import("./providers/coffman-graham.ts")')
    for (const forbidden of ["@layout/core", "@ui/elements", "@ui/components", "Pane(", "UiSurface"]) expect(routeSource).not.toContain(forbidden)
    const providers = ["fixed", "adaptive", "dagre-layered", "coffman-graham"]
    for (const provider of providers) {
      const source = await Bun.file(new URL(`./providers/${provider}.ts`, import.meta.url)).text()
      const expected = provider === "dagre-layered" ? "top-down" : provider
      expect(source).toContain(`from "@nodes/layout/${expected}"`)
      for (const other of ["fixed", "adaptive", "top-down", "coffman-graham"]) {
        if (other !== expected) expect(source).not.toContain(`from "@nodes/layout/${other}"`)
      }
    }
  })
})
