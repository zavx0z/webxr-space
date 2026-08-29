import {describe, expect, test} from "bun:test"
import {createDocument, MouseEvent} from "@zavx0z/dom"
import {createDocumentRenderer} from "@zavx0z/renderer"
import {REMAINING_DOM_ROUTES} from "./remaining-route-catalog.ts"
import {createRemainingDomProps} from "./remaining-dom-data.ts"
import {createRemainingDomStory} from "./remaining-dom-story.ts"

describe("final remaining Node DOM route composition", () => {
  test("covers the exact remaining 32 route nodes", () => {
    expect(REMAINING_DOM_ROUTES).toHaveLength(32)
    expect(new Set(REMAINING_DOM_ROUTES).size).toBe(32)
    for (const route of REMAINING_DOM_ROUTES) {
      const story = createRemainingDomStory(createDocument(), route)
      expect(story.element.className, route || "root").toBe("node-workbench")
      expect(story.props.title.length, route || "root").toBeGreaterThan(0)
      expect(story.source().typescript, route || "root").toContain("createNodeWorkbench")
      story.dispose()
    }
  })

  test("preserves exact linked/unlinked and collapsed NodeEditor route data", () => {
    expect(createRemainingDomProps("ui/node-editor/scene/rotation-linked").graph.links.map(({id}) => id))
      .toContain("scalar-transform-rotation")
    expect(createRemainingDomProps("ui/node-editor/scene/translation-unlinked").graph.links.map(({id}) => id))
      .toEqual(["transform-shader", "asset-matrix", "matrix-shader"])
    expect(createRemainingDomProps("ui/node-editor/scene/color-unlinked").graph.links.map(({id}) => id))
      .toEqual(["scalar-transform", "asset-matrix", "matrix-shader"])
    expect(createRemainingDomProps("ui/node-editor/collapsed/default").graph.nodes.find(({id}) => id === "collapsed")?.height).toBe(34)
    expect(createRemainingDomProps("ui/node-editor/collapsed/selected").graph.nodes.filter(({selected}) => selected).map(({id}) => id))
      .toEqual(["collapsed"])
  })

  test("owns real Frame, Link, popup and accepted comparison compositions", () => {
    const frame = createRemainingDomProps("ui/frame/nested/default")
    expect(frame.graph.frames.map(({id}) => id)).toEqual(["catalog-frame", "data-frame"])
    expect(frame.graph.frames.find(({id}) => id === "data-frame")?.selected).toBeTrue()
    const link = createRemainingDomProps("ui/link/orthogonal")
    expect(link.graph.links).toHaveLength(2)
    expect(link.graph.links.every(({segments}) => segments.every(({x1, y1, x2, y2}) => x1 === x2 || y1 === y2))).toBeTrue()
    const popup = createRemainingDomProps("ui/node-editor/popup/select-open")
    expect(popup.popup.visible).toBeTrue()
    expect(popup.popup.items.find(({selected}) => selected)?.id).toBe("multiply")
    const comparison = createRemainingDomProps("ui/comparison/reference/default")
    expect(comparison.images[0]?.src)
      .toContain(encodeURIComponent("variant:@nodes/ui/comparison/reference/default"))
    expect(comparison.graph.nodes.map(({id}) => id)).toEqual(["comparison-noise"])
    expect(comparison.parameters.parameters.map(({label}) => label)).toEqual([
      "Vector", "Scale", "Detail", "Roughness", "Lacunarity", "Distortion",
    ])
  })

  test("controls Graph and popup selections through standard click events", () => {
    const graph = createRemainingDomStory(createDocument(), "ui/frame/nested/default")
    const inner = graph.controller.graph.frameRefs("data-frame")!
    const node = graph.controller.graph.nodeRefs("frame-node")!
    expect(graph.props.graph.frames.find(({id}) => id === "data-frame")?.selected).toBeTrue()
    node.element.dispatchEvent(new MouseEvent("click", {bubbles: true, cancelable: true}))
    expect(graph.props.graph.nodes.find(({id}) => id === "frame-node")?.selected).toBeTrue()
    expect(graph.controller.graph.frameRefs("data-frame")).toBe(inner)

    const popup = createRemainingDomStory(createDocument(), "ui/node-editor/popup/select-open")
    popup.controller.refs.popupList.querySelector('[data-popup-item-id="power"]')!
      .dispatchEvent(new MouseEvent("click", {bubbles: true, cancelable: true}))
    expect(popup.props.popup.items.find(({selected}) => selected)?.id).toBe("power")
  })

  test("renders a representative final route and imports no retained owners", async () => {
    const document = createDocument()
    const story = createRemainingDomStory(document, "ui/frame/nested/default")
    document.appendChild(story.element)
    const renderer = createDocumentRenderer({
      document,
      root: story.element,
      viewport: {width: 1024, height: 700},
      styleSheets: [story.source().css],
    })
    const frame = renderer.flush()
    expect(frame.displayList.filter((item) => item.kind === "text").map((item) => item.text))
      .toEqual(expect.arrayContaining(["Frame · Вложенность", "Система компонентов нод", "Обработка данных", "Matrix"]))
    renderer.dispose()
    for (const file of ["./remaining-dom-story.ts", "./remaining-dom-data.ts"]) {
      const source = await Bun.file(new URL(file, import.meta.url)).text()
      for (const forbidden of ["@layout/core", "@ui/elements", "@ui/components", "@engine/core", "@nodes/ui/node", "@nodes/ui/node-editor", "UiSurface", "NodeEditor("]) expect(source).not.toContain(forbidden)
    }
  })
})
