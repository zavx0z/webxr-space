import {describe, expect, test} from "bun:test"
import {createDocument, MouseEvent} from "@zavx0z/dom"
import {createDocumentRenderer} from "@zavx0z/renderer"
import {
  createLayoutPresentation,
  layoutPresentationCss,
  type LayoutPresentationProps,
} from "./layout-presentation.ts"

const props = (): LayoutPresentationProps => ({
  title: "Computed layout",
  showRoutes: true,
  showPorts: true,
  cases: [{
    id: "fixed-right",
    label: "Fixed · RIGHT",
    policy: "fixed",
    direction: "RIGHT",
    bounds: {x: 0, y: 0, width: 400, height: 220},
    nodes: [
      {id: "source", label: "Source", x: 12, y: 20, width: 120, height: 64},
      {id: "target", label: "Target", x: 250, y: 130, width: 120, height: 64},
    ],
    ports: [
      {id: "source/out", x: 132, y: 52, side: "EAST"},
      {id: "target/in", x: 250, y: 162, side: "WEST"},
    ],
    edges: [{id: "value", points: [{x: 132, y: 52}, {x: 190, y: 52}, {x: 190, y: 162}, {x: 250, y: 162}]}],
    diagnostics: [{id: "candidates", label: "Candidates", value: "1/1"}],
  }],
})

describe("production DOM Layout presentation", () => {
  test("creates semantic computed cases at exact result coordinates", () => {
    const controller = createLayoutPresentation(createDocument(), props())
    const refs = controller.caseRefs("fixed-right")!
    expect(controller.element.className).toBe("layout-dom")
    expect(refs.item.localName).toBe("article")
    expect(refs.status.localName).toBe("output")
    expect(refs.node("source")?.getAttribute("style")).toContain("left:12px")
    expect(refs.node("target")?.getAttribute("style")).toContain("top:130px")
    expect(refs.port("source/out")?.getAttribute("data-side")).toBe("EAST")
    expect(refs.edge("value")?.points).toHaveLength(4)
    expect(refs.diagnostics.localName).toBe("dl")
  })

  test("preserves keyed Case/Node/Edge identities through controlled updates", () => {
    const controller = createLayoutPresentation(createDocument(), props())
    const refs = controller.caseRefs("fixed-right")!
    const source = refs.node("source")
    const edge = refs.edge("value")!
    controller.update({...controller.props, showRoutes: false, showPorts: false, cases: [{
      ...controller.props.cases[0]!,
      nodes: [...controller.props.cases[0]!.nodes].reverse(),
      edges: [{...controller.props.cases[0]!.edges[0]!, points: [...controller.props.cases[0]!.edges[0]!.points, {x: 300, y: 190}]}],
    }]})
    expect(controller.caseRefs("fixed-right")).toBe(refs)
    expect(refs.node("source")).toBe(source)
    expect(refs.edge("value")?.group).toBe(edge.group)
    expect(refs.edge("value")?.points[0]).toBe(edge.points[0])
    expect(refs.edge("value")?.points).toHaveLength(5)
    expect(refs.edges.hasAttribute("hidden")).toBeTrue()
    expect(refs.ports.hasAttribute("hidden")).toBeTrue()
  })

  test("leaves toggle clicks native and props controlled", () => {
    const document = createDocument()
    const host = document.createElement("div")
    const controller = createLayoutPresentation(document, props())
    document.appendChild(host)
    host.appendChild(controller.element)
    const events: string[] = []
    host.addEventListener("click", ({type}) => events.push(type))
    controller.refs.routes.dispatchEvent(new MouseEvent("click", {bubbles: true, cancelable: true}))
    expect(events).toEqual(["click"])
    expect(controller.props.showRoutes).toBeTrue()
  })

  test("rejects malformed computed geometry before mutation", () => {
    const controller = createLayoutPresentation(createDocument(), props())
    const current = controller.props
    const refs = controller.caseRefs("fixed-right")
    expect(() => controller.update({...current, cases: [{...current.cases[0]!, nodes: [{...current.cases[0]!.nodes[0]!, x: Number.NaN}]}]}))
      .toThrow("Layout node source must be finite")
    expect(controller.props).toBe(current)
    expect(controller.caseRefs("fixed-right")).toBe(refs)
  })

  test("renders through the document renderer and remains package-private", async () => {
    const document = createDocument()
    const controller = createLayoutPresentation(document, props())
    document.appendChild(controller.element)
    const renderer = createDocumentRenderer({document, root: controller.element, viewport: {width: 900, height: 620}, styleSheets: [layoutPresentationCss]})
    const frame = renderer.flush()
    expect(frame.hits.get(controller.refs.routes)).toMatchObject({interactive: true, role: "button"})
    expect(frame.displayList.filter((item) => item.kind === "text").map((item) => item.text))
      .toEqual(expect.arrayContaining(["Computed layout", "Fixed · RIGHT", "Source", "Target", "Candidates", "1/1"]))
    renderer.dispose()
    const source = await Bun.file(new URL("./layout-presentation.ts", import.meta.url)).text()
    for (const forbidden of ["@layout/core", "@ui/elements", "@ui/components", "@engine/core", "@zavx0z/renderer", "layoutFixed(", "layoutAdaptive("]) expect(source).not.toContain(forbidden)
    const manifest = await Bun.file(new URL("../package.json", import.meta.url)).json() as {exports: Record<string, unknown>}
    expect(manifest.exports["./dom/layout-presentation"]).toBeUndefined()
  })
})
