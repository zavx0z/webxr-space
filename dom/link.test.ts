import {describe, expect, test} from "bun:test"
import {createDocument} from "@zavx0z/dom"
import {createDocumentRenderer} from "@zavx0z/renderer"
import {createLink, linkCss} from "./link.ts"

describe("typed DOM Link", () => {
  test("keeps keyed route visuals and 16px hit corridors", () => {
    const controller = createLink(createDocument(), {
      id: "value-link",
      title: "Value",
      kind: "float",
      from: {nodeId: "source", socketId: "value-out"},
      to: {nodeId: "target", socketId: "value-in"},
      segments: [
        {x1: 10, y1: 20, x2: 80, y2: 20},
        {x1: 80, y1: 20, x2: 80, y2: 90},
      ],
    })
    const first = controller.refs.segment(0)!
    const second = controller.refs.segment(1)!
    expect(first.element.getAttribute("style")).toContain("background: #9e9e9e")
    expect(first.hit.getAttribute("style")).toContain("height: 16px")
    expect(second.hit.getAttribute("style")).toContain("width: 16px")
    controller.update({...controller.definition, selected: true, segments: [
      {x1: 12, y1: 24, x2: 82, y2: 24},
      {x1: 82, y1: 24, x2: 82, y2: 94},
      {x1: 82, y1: 94, x2: 120, y2: 94},
    ]})
    expect(controller.refs.segment(0)).toBe(first)
    expect(controller.refs.segment(1)).toBe(second)
    expect(controller.refs.segment(2)).not.toBeNull()
    expect(controller.element.getAttribute("aria-selected")).toBe("true")
  })

  test("renders both visual and hit children and rejects diagonal geometry", () => {
    const document = createDocument()
    const controller = createLink(document, {
      id: "shader-link",
      title: "Shader",
      kind: "shader",
      segments: [{x1: 0, y1: 12, x2: 100, y2: 12}],
    })
    document.appendChild(controller.element)
    const renderer = createDocumentRenderer({
      document,
      root: controller.element,
      viewport: {width: 140, height: 40},
      styleSheets: [linkCss],
    })
    const frame = renderer.flush()
    expect(frame.hits.get(controller.refs.segment(0)!.hit)).toBeDefined()
    renderer.dispose()
    expect(() => controller.update({...controller.definition, segments: [{x1: 0, y1: 0, x2: 10, y2: 10}]}))
      .toThrow("must be strictly axis-aligned")
  })
})
