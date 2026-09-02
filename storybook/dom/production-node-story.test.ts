import {describe, expect, test} from "bun:test"
import {
  Event,
  HTMLButtonElement,
  createDocument,
  type HTMLInputElement,
} from "@zavx0z/dom"
import {createDocumentRenderer} from "@zavx0z/renderer"
import catalog from "../../.storybook/catalog.json"
import {
  NODE_COMPARISON_REFERENCE,
  createProductionNodeStory,
} from "./production-node-story.tsx"

describe("public component Storybook projection", () => {
  test("keeps all 145 @nodes/ui leaves on the two final story factories", () => {
    const variants = catalog.categories.flatMap(category => category.subjects.flatMap(subject => subject.variants))
    expect(variants).toHaveLength(145)
    expect(variants.filter(variant => variant.module.path.endsWith("/production-node-story.tsx"))).toHaveLength(144)
    expect(variants.filter(variant => variant.module.path.endsWith("/node-tree-story.ts"))).toHaveLength(1)
    expect(new Set(variants.map(variant => variant.route)).size).toBe(145)
  })

  test("materializes every historical production route through one component root", () => {
    const routes = catalog.categories.flatMap(category => category.subjects.flatMap(subject =>
      subject.variants.filter(variant => variant.module.path.endsWith("/production-node-story.tsx"))
        .map(variant => variant.route)))
    for (const route of routes) {
      const story = createProductionNodeStory(createDocument(), route)
      expect(story.element.querySelector(`[data-production-story-route="${route}"]`)).not.toBeNull()
      expect(story.element.querySelectorAll('[data-production-story-route]')).toHaveLength(1)
      story.dispose()
    }
  })

  test("maps historical semantic Field routes to current interaction components", () => {
    const cases = [
      ["ui/parameter/integer/input", "number"],
      ["ui/parameter/boolean/input", "switch"],
      ["ui/parameter/enum/input", "select"],
      ["ui/parameter/rotation/input", "vector"],
      ["ui/parameter/readonly/input", "output"],
    ] as const
    for (const [route, expected] of cases) {
      const story = createProductionNodeStory(createDocument(), route)
      expect(story.element.querySelector('[data-parameter-id]')?.getAttribute("data-field-kind")).toBe(expected)
      story.dispose()
    }
  })

  test("preserves nested Frames, collapse, preview, selection and exact semantic Links", () => {
    const story = createProductionNodeStory(createDocument(), "ui/node-editor/preview/open")
    const outer = story.element.querySelector('[data-frame-id="shader-frame"]')!
    const inner = story.element.querySelector('[data-frame-id="texture-frame"]')!
    const node = story.element.querySelector('[data-node-id="noise"]')!
    const link = story.element.querySelector('[data-link-id="noise-output"]')!
    expect(inner.getAttribute("data-parent-frame-id")).toBe("shader-frame")
    expect(node.getAttribute("data-frame-id")).toBe("texture-frame")
    expect(link.localName).toBe("vector-path")
    expect(link.childNodes).toEqual([])
    expect(story.element.querySelector('[data-node-preview]')?.hasAttribute("hidden")).toBeFalse()

    const collapse = node.querySelector('[data-action="collapse-node"]')
    if (!(collapse instanceof HTMLButtonElement)) throw new Error("Collapse button is missing")
    collapse.dispatchEvent(new Event("click", {bubbles: true}))
    expect(story.element.querySelector('[data-node-id="noise"]')?.getAttribute("data-collapsed")).toBe("true")

    node.dispatchEvent(new Event("click", {bubbles: true}))
    expect(story.element.querySelector('[data-node-editor]')?.getAttribute("data-selection-id")).toBe("noise")
    expect(outer.ownerDocument).toBe(inner.ownerDocument)
    story.dispose()
  })

  test("keeps exact equal-scale comparison provenance and component source", () => {
    const document = createDocument()
    const story = createProductionNodeStory(document, "ui/comparison/reference/default")
    const root = story.element.querySelector('[data-production-owner="comparison"]')!
    expect(root.getAttribute("data-production-owner")).toBe("comparison")
    expect(story.element.querySelector('[data-source-rect]')?.getAttribute("data-source-rect")).toBe("0 0 192 328")
    expect(story.element.querySelector('[data-live-scale]')?.getAttribute("data-live-scale")).toBe("1")
    const node = story.element.querySelector('[data-node-id="comparison-noise"]')!
    expect(node.getAttribute("data-category")).toBe("")
    expect(node.querySelector('[data-socket-id="noise-fac-output"]')?.getAttribute("data-socket-side")).toBe("right")
    expect(node.querySelector('[data-socket-id="noise-color-output"]')?.getAttribute("data-socket-kind")).toBe("color")
    const output = node.querySelector('[data-socket-id="noise-fac-output"]')!
    const renderer = createDocumentRenderer({document, root: story.element, viewport: {width: 500, height: 500}})
    const frame = renderer.flush()
    const nodeBox = frame.boxByNode.get(node)!
    const glyphBox = frame.boxByNode.get(output.querySelector('[data-socket-glyph]')!)!
    const labelBox = frame.boxByNode.get(output.querySelector('[data-socket-label]')!)!
    expect(glyphBox.x).toBeGreaterThan(labelBox.x)
    const outputSockets = node.querySelectorAll('[data-socket-side="right"]')
    expect(outputSockets).toHaveLength(2)
    for (const outputSocket of outputSockets) {
      const outputGlyph = frame.boxByNode.get(outputSocket.querySelector('[data-socket-glyph]')!)!
      expect(Math.abs(nodeBox.x + nodeBox.width -
        (outputGlyph.x + outputGlyph.width / 2))).toBeLessThanOrEqual(1)
    }
    const inputSockets = node.querySelectorAll('[data-socket-side="left"]')
    expect(inputSockets).toHaveLength(6)
    for (const input of inputSockets) {
      const inputGlyph = frame.boxByNode.get(input.querySelector('[data-socket-glyph]')!)!
      expect(Math.abs(nodeBox.x - (inputGlyph.x + inputGlyph.width / 2))).toBeLessThanOrEqual(1)
    }
    const dimensions = node.querySelector('[data-parameter-id="noise-dimensions"]')!
    expect(dimensions.getAttribute("data-label-hidden")).toBe("true")
    expect(dimensions.querySelector('[data-parameter-label]')?.hasAttribute("hidden")).toBeTrue()
    const normalize = node.querySelector('[data-parameter-id="noise-normalize"]')!
    expect(normalize.getAttribute("data-leading-checkbox")).toBe("true")
    expect(node.querySelector('[data-parameter-id="noise-normalize"] input')?.getAttribute("type")).toBe("checkbox")
    expect(normalize.querySelectorAll('[data-parameter-label]')).toHaveLength(2)
    expect(node.querySelector('[data-parameter-id="noise-basis"]')).toBeNull()
    const scale = node.querySelector('[data-parameter-id="noise-scale"]')!
    expect(scale.getAttribute("data-inset-number-row")).toBe("true")
    expect(scale.querySelector('[data-parameter-label]')?.hasAttribute("hidden")).toBeTrue()
    expect(scale.querySelector('[data-number-field]')?.textContent).toContain("Scale")
    expect(scale.querySelector('[data-number-fill]')?.hasAttribute("hidden")).toBeTrue()
    expect(scale.querySelector("input")?.getAttribute("value")).toBeNull()
    expect((scale.querySelector("input") as HTMLInputElement).value).toBe("5.000")
    const roughness = node.querySelector('[data-parameter-id="noise-roughness"]')!
    expect(roughness.querySelector('[data-number-fill]')?.hasAttribute("hidden")).toBeFalse()
    const vector = node.querySelector('[data-parameter-id="noise-vector"]')!
    const dimensionsBox = frame.boxByNode.get(dimensions)!
    const normalizeBox = frame.boxByNode.get(normalize)!
    const vectorBox = frame.boxByNode.get(vector)!
    const scaleBox = frame.boxByNode.get(scale)!
    const liveBox = frame.boxByNode.get(story.element.querySelector("[data-live-owner]")!)!
    const headerBox = frame.boxByNode.get(node.querySelector("header")!)!
    const bodyBox = frame.boxByNode.get(node.querySelector("section")!)!
    expect({
      x: nodeBox.x - liveBox.x,
      y: nodeBox.y - liveBox.y,
      width: nodeBox.width,
      height: nodeBox.height,
    }).toEqual({x: 17, y: 17, width: 160, height: 294})
    expect({height: headerBox.height, bodyHeight: bodyBox.height}).toEqual({
      height: 22,
      bodyHeight: 272,
    })
    const dimensionsSelectBox = frame.boxByNode.get(dimensions.querySelector("select")!)!
    expect({
      x: dimensionsSelectBox.x - liveBox.x,
      y: dimensionsSelectBox.y - liveBox.y,
      width: dimensionsSelectBox.width,
      height: dimensionsSelectBox.height,
    }).toEqual({x: 29, y: 102, width: 137, height: 22})
    const normalizeCheckboxBox = frame.boxByNode.get(normalize.querySelector("input")!)!
    expect({
      x: normalizeCheckboxBox.x - liveBox.x,
      y: normalizeCheckboxBox.y - liveBox.y,
      width: normalizeCheckboxBox.width,
      height: normalizeCheckboxBox.height,
    }).toEqual({x: 29, y: 135, width: 16, height: 16})
    const vectorGlyphBox = frame.boxByNode.get(vector.querySelector("[data-socket-glyph]")!)!
    expect({
      x: vectorGlyphBox.x + vectorGlyphBox.width / 2 - liveBox.x,
      y: vectorGlyphBox.y + vectorGlyphBox.height / 2 - liveBox.y,
      width: vectorGlyphBox.width,
      height: vectorGlyphBox.height,
    }).toEqual({x: 17, y: 168, width: 12, height: 12})
    const numberRows = [
      ["scale", 183],
      ["detail", 208],
      ["roughness", 233],
      ["lacunarity", 258],
      ["distortion", 283],
    ] as const
    for (const [id, y] of numberRows) {
      const field = node.querySelector(`[data-parameter-id="noise-${id}"] [data-number-field]`)!
      const fieldBox = frame.boxByNode.get(field)!
      expect({
        x: fieldBox.x - liveBox.x,
        y: fieldBox.y - liveBox.y,
        width: fieldBox.width,
        height: fieldBox.height,
      }).toEqual({x: 29, y, width: 137, height: 22})
    }
    expect(normalizeBox.y - (dimensionsBox.y + dimensionsBox.height)).toBe(8)
    expect(scaleBox.y - (vectorBox.y + vectorBox.height)).toBe(4)
    expect(NODE_COMPARISON_REFERENCE.liveViewport).toEqual({width: 192, height: 328, scale: 1})
    const source = story.source()
    expect(source.typescript).toContain('from "@nodes/ui"')
    expect(source.typescript).toContain("createRoot(container).render")
    expect(source.html).toContain("data-comparison-scale")
    renderer.dispose()
    story.dispose()
  })
})
