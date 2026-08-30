import {describe, expect, test} from "bun:test"
import {
  createDocument,
  MouseEvent,
} from "@zavx0z/dom"
import {
  createDocumentRenderer,
  hitTest,
  type DisplayItem,
  type RenderFrame,
} from "@zavx0z/renderer"
import {graphCanvasCss} from "../../dom/graph-canvas.ts"
import {socketPreset} from "../../dom/socket.ts"
import {
  createGraphStory,
  graphStoryDefaultProps,
} from "./graph-story.ts"

describe("package-owned GraphCanvas DOM story", () => {
  test("publishes the selected orthogonal Link with live production source", () => {
    const story = createGraphStory(createDocument())
    const source = story.source()
    const link = story.linkRefs("process-output")!

    expect(story.props).toEqual(graphStoryDefaultProps)
    expect(story.selection).toEqual({kind: "link", id: "process-output"})
    expect(link.element.getAttribute("aria-selected")).toBe("true")
    expect(story.nodeRefs("process")?.element.getAttribute("aria-selected")).toBe("false")
    expect(story.refs.scene.getAttribute("style")).toBe(
      "transform: translate(14px, 10px) scale(1.04); transform-origin: 0 0",
    )
    expect(source.html).toContain('<section class="graph-canvas"')
    expect(source.html).toContain('data-link-id="process-output"')
    expect(source.html).toContain('data-segment-index="1"')
    expect(Object.keys(source).sort()).toEqual(["html", "typescript"])
    expect(story.componentRoot.readStyleSheets()).toEqual({revision: 0, styleSheets: []})
    expect(source.typescript).toContain('from "../../dom/graph-canvas.ts"')
    expect(source.typescript).toContain('"translateX": 14')
    expect(source.typescript).toContain("links: current.links.map")
    expect(Object.isFrozen(source)).toBeTrue()
  })

  test("updates transform args without replacing GraphCanvas identities", () => {
    const story = createGraphStory(createDocument())
    const refs = story.refs
    const frame = story.frameRefs("pipeline")!
    const link = story.linkRefs("process-output")!
    const segment = link.segmentRefs(1)!
    const node = story.nodeRefs("process")!
    const source = story.source()

    story.update({
      ...story.props,
      scene: {translateX: -22, translateY: 38, scale: 1.32},
    })

    expect(story.refs).toBe(refs)
    expect(story.frameRefs("pipeline")).toBe(frame)
    expect(story.linkRefs("process-output")).toBe(link)
    expect(story.linkRefs("process-output")?.segmentRefs(1)).toBe(segment)
    expect(story.nodeRefs("process")).toBe(node)
    expect(story.refs.scene.getAttribute("style")).toBe(
      "transform: translate(-22px, 38px) scale(1.32); transform-origin: 0 0",
    )
    expect(story.source()).not.toBe(source)
    expect(story.source().html).toContain("translate(-22px, 38px) scale(1.32)")
    expect(story.source().typescript).toContain('"translateY": 38')
    expect(story.source().typescript).toContain('"scale": 1.32')
  })

  test("controls one Frame, Link or Node selection through standard clicks", () => {
    const document = createDocument()
    const host = document.createElement("div")
    const story = createGraphStory(document)
    const frameLabel = story.frameRefs("pipeline")!.label
    const inputSegment = story.linkRefs("input-process")!.segmentRefs(0)!.element
    const output = story.nodeRefs("output")!.element
    const fabricated: string[] = []
    document.appendChild(host)
    host.appendChild(story.element)
    for (const type of ["input", "change", "selectionchange"]) {
      host.addEventListener(type, (event) => fabricated.push(event.type))
    }

    output.dispatchEvent(new MouseEvent("click", {bubbles: true, cancelable: true}))
    expect(story.selection).toEqual({kind: "node", id: "output"})
    expect(output.getAttribute("aria-selected")).toBe("true")
    expect(story.linkRefs("process-output")?.element.getAttribute("aria-selected")).toBe("false")

    inputSegment.dispatchEvent(new MouseEvent("click", {bubbles: true, cancelable: true}))
    expect(story.selection).toEqual({kind: "link", id: "input-process"})
    expect(story.linkRefs("input-process")?.element.getAttribute("aria-selected")).toBe("true")
    expect(output.getAttribute("aria-selected")).toBe("false")

    frameLabel.dispatchEvent(new MouseEvent("click", {bubbles: true, cancelable: true}))
    expect(story.selection).toEqual({kind: "frame", id: "pipeline"})
    expect(story.frameRefs("pipeline")?.element.getAttribute("aria-selected")).toBe("true")
    expect(story.linkRefs("input-process")?.element.getAttribute("aria-selected")).toBe("false")
    expect(fabricated).toEqual([])

    const cancel = (event: import("@zavx0z/dom").Event): void => event.preventDefault()
    host.addEventListener("click", cancel, {capture: true})
    output.dispatchEvent(new MouseEvent("click", {bubbles: true, cancelable: true}))
    expect(story.selection).toEqual({kind: "frame", id: "pipeline"})
  })

  test("renders live selection, transform and semantic hits through the document renderer", () => {
    const document = createDocument()
    const story = createGraphStory(document)
    document.appendChild(story.element)
    const renderer = createDocumentRenderer({
      document,
      root: story.element,
      viewport: {width: 900, height: 560},
      styleSheets: [graphCanvasCss],
    })
    const first = renderer.flush()
    const selectedLinkSegment = story.linkRefs("process-output")!.segmentRefs(1)!.element
    const input = story.nodeRefs("input")!.element

    expect(background(first, selectedLinkSegment).color).toBe(socketPreset("custom").color)
    expect(story.selection).toEqual({kind: "link", id: "process-output"})
    input.dispatchEvent(new MouseEvent("click", {bubbles: true, cancelable: true}))
    const selectedNode = renderer.flush()
    expect(story.selection).toEqual({kind: "node", id: "input"})
    expect(background(selectedNode, selectedLinkSegment).color).toBe(socketPreset("custom").color)
    expect(background(selectedNode, input).border.colors.top).toBe("#171717")
    const selectedShadow = selectedNode.displayList.find((candidate): candidate is Extract<DisplayItem, {kind: "rect"}> =>
      candidate.kind === "rect" && candidate.node === input && candidate.key === "shadow"
    )
    expect(selectedShadow?.color).toBe("#5b466b")

    story.update({
      ...story.props,
      scene: {translateX: 48, translateY: 24, scale: 1.25},
    })
    const transformed = renderer.flush()
    const inputBox = transformed.boxByNode.get(input)!
    const transform = transformed.hits.get(input)!.transform
    const x = (inputBox.x + inputBox.width / 2) * transform.scaleX + transform.translateX
    const y = (inputBox.y + inputBox.height / 2) * transform.scaleY + transform.translateY
    expect(transform.scaleX).toBe(1.25)
    const hit = hitTest(transformed, x, y)
    expect(hit).not.toBeNull()
    expect(input.contains(hit!.node)).toBeTrue()
    expect(renderer.flush()).toBe(transformed)
    renderer.dispose()
  })

  test("disposes story behavior without removing consumer DOM", () => {
    const document = createDocument()
    const host = document.createElement("div")
    const story = createGraphStory(document)
    const output = story.nodeRefs("output")!.element
    document.appendChild(host)
    host.appendChild(story.element)
    const props = story.props

    story.dispose()
    story.dispose()
    output.dispatchEvent(new MouseEvent("click", {bubbles: true, cancelable: true}))
    expect(story.element.parentNode).toBe(host)
    expect(story.props).toBe(props)
    expect(story.selection).toEqual({kind: "link", id: "process-output"})
    expect(() => story.update({...story.props, title: "Disposed"}))
      .toThrow("GraphStory controller is disposed")
  })

  test("keeps the Graph story private and free of retained UI owners", async () => {
    const source = await Bun.file(new URL("./graph-story.ts", import.meta.url)).text()
    const requirements = await Bun.file(new URL("../../requirements.md", import.meta.url)).text()
    const manifest = await Bun.file(new URL("../../package.json", import.meta.url)).json() as {
      exports: Record<string, string>
    }

    expect(source).toContain('from "@zavx0z/dom"')
    expect(source).toContain('from "../../../../.storybook/runtime.ts"')
    expect(source).toContain('from "../../dom/graph-canvas.ts"')
    for (const forbidden of [
      "@engine/core",
      "@zavx0z/storybook",
      "@layout/core",
      "@ui/elements",
      "@ui/components",
      "@zavx0z/renderer",
      "UiSurface",
      "Object3D",
      "createDocumentRenderer",
    ]) expect(source).not.toContain(forbidden)
    expect(manifest.exports["./storybook/dom/graph-story"]).toBeUndefined()
    expect(Object.values(manifest.exports)).not.toContain("./storybook/dom/graph-story.ts")
    expect(requirements).toContain("NODES-UI-DOM-GRAPH-002")
  })
})

function background(frame: RenderFrame, node: unknown): Extract<DisplayItem, {kind: "rect"}> {
  const item = frame.displayList.find((candidate): candidate is Extract<DisplayItem, {kind: "rect"}> =>
    candidate.kind === "rect" && candidate.node === node && candidate.key === "background"
  )
  if (!item) throw new Error("Expected background display item")
  return item
}
