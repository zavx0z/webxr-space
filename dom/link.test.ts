import {describe, expect, test} from "bun:test"
import {createDocument} from "@zavx0z/dom"
import {createDocumentRenderer, hitTest} from "@zavx0z/renderer"
import {createCubicLinkRoute, createLink, linkCss} from "./link.ts"

describe("typed DOM Link", () => {
  test("keeps one keyed semantic Path with the historical route law", () => {
    const controller = createLink(createDocument(), {
      id: "value-link",
      title: "Value",
      kind: "float",
      from: {nodeId: "source", socketId: "value-out"},
      to: {nodeId: "target", socketId: "value-in"},
      route: {kind: "orthogonal", points: [{x: 10, y: 20}, {x: 80, y: 20}, {x: 80, y: 90}]},
    })
    const element = controller.element
    const before = controller.projection
    expect(element.localName).toBe("vector-path")
    expect(element.childNodes).toEqual([])
    expect(element.getAttribute("style")).toBe("stroke: #9e9e9e")
    expect(element.getAttribute("data-socket-kind")).toBe("float")
    expect(element.getAttribute("d")).toContain(" C ")
    expect(element.d).toBe(controller.projection.d)
    expect(linkCss).toContain("stroke-width: 2.2px")
    expect(linkCss).toContain("pointer-hit-width: 16px")
    expect(linkCss).not.toContain("box-shadow")
    controller.update({...controller.definition, selected: true, route: {
      kind: "orthogonal",
      points: [{x: 12, y: 24}, {x: 82, y: 24}, {x: 82, y: 94}, {x: 120, y: 94}],
    }})
    expect(controller.element).toBe(element)
    expect(controller.projection).not.toBe(before)
    expect(controller.element.getAttribute("d")).toBe(controller.projection.d)
    expect(controller.element.getAttribute("aria-selected")).toBe("true")
  })

  test("renders one stroked Path hit owner and rejects diagonal geometry", () => {
    const document = createDocument()
    const controller = createLink(document, {
      id: "shader-link",
      title: "Shader",
      kind: "shader",
      route: {kind: "orthogonal", points: [{x: 0, y: 12}, {x: 100, y: 12}]},
    })
    document.appendChild(controller.element)
    const renderer = createDocumentRenderer({
      document,
      root: controller.element,
      viewport: {width: 140, height: 40},
      styleSheets: [linkCss],
    })
    const frame = renderer.flush()
    expect(frame.hits.get(controller.element)).toBeDefined()
    expect(hitTest(frame, 50, 19)?.node).toBe(controller.element)
    expect(hitTest(frame, 50, 22)).toBeNull()
    renderer.dispose()
    expect(() => controller.update({...controller.definition, route: {
      kind: "orthogonal",
      points: [{x: 0, y: 0}, {x: 10, y: 10}],
    }}))
      .toThrow("run 0 not axis-aligned")
  })

  test("keeps disabled opacity as a correctness fallback outside the opaque fast-path claim", () => {
    const document = createDocument()
    const controller = createLink(document, {
      id: "disabled-link",
      title: "Disabled",
      disabled: true,
      route: {kind: "orthogonal", points: [{x: 8, y: 8}, {x: 88, y: 8}]},
    })
    document.appendChild(controller.element)
    const renderer = createDocumentRenderer({
      document,
      root: controller.element,
      viewport: {width: 100, height: 24},
      styleSheets: [linkCss],
    })
    const item = renderer.flush().displayList.find((candidate) => candidate.kind === "path")
    expect(controller.element.getAttribute("aria-disabled")).toBe("true")
    expect(item?.kind).toBe("path")
    if (item?.kind !== "path") throw new Error("Expected disabled Link Path")
    expect(item.opacity).toBe(.45)
    expect(item.strokeWidth).toBe(2.2)
    renderer.dispose()
    controller.dispose()
  })

  test("renders a direct cubic self-loop through the same semantic owner", () => {
    const document = createDocument()
    const controller = createLink(document, {
      id: "self-loop",
      title: "Self loop",
      route: createCubicLinkRoute([{
        startPoint: {x: 40, y: 40},
        controlPoints: [{x: 90, y: -20}, {x: -10, y: -20}],
        endPoint: {x: 40, y: 40},
      }]),
    })
    document.appendChild(controller.element)
    const renderer = createDocumentRenderer({
      document,
      root: controller.element,
      viewport: {width: 100, height: 60},
      styleSheets: [linkCss],
    })
    const item = renderer.flush().displayList.find((candidate) => candidate.kind === "path")
    expect(item?.kind).toBe("path")
    if (item?.kind !== "path") throw new Error("Expected self-loop Path")
    expect(item.geometry.cubics).toHaveLength(1)
    expect(item.geometry.segments.length).toBeGreaterThan(1)
    expect(item.geometry.bounds.width).toBeGreaterThan(0)
    renderer.dispose()
    controller.dispose()
  })
})
