import {describe, expect, test} from "bun:test"

// Owner-local acceptance for the active external UI story factory.
import {createDocument, type HTMLElement} from "@zavx0z/dom"
import {createDocumentRenderer} from "@zavx0z/renderer"
import {SOCKET_KINDS} from "@nodes/ui/socket"
import {
  nodesDomStoryCss,
  nodesProductionPreviewCss,
} from "./production-node-css.ts"
import {
  createProductionNodeStory,
  NODE_COMPARISON_REFERENCE,
} from "./production-node-story.ts"

const parameterKinds = [
  "text",
  "number",
  "integer",
  "boolean",
  "enum",
  "color",
  "vector",
  "rotation",
  "matrix",
  "reference",
  "collection",
  "path",
  "readonly",
] as const

describe("production Node Storybook adapters", () => {
  test("materializes every declared production @nodes/ui leaf through its exact owner factory", async () => {
    const catalog = await Bun.file(new URL("../../.storybook/catalog.json", import.meta.url)).json() as Readonly<{
      categories: readonly Readonly<{
        subjects: readonly Readonly<{
          variants: readonly Readonly<{
            route: string
            module: Readonly<{path: string; export: string}>
          }>[]
        }>[]
      }>[]
    }>
    const routes = catalog.categories.flatMap(({subjects}) => subjects.flatMap(({variants}) => variants
      .filter(({module}) => module.path.endsWith("/production-node-story.ts") && module.export === "createProductionNodeStory")
      .map(({route}) => route)))

    expect(routes).toHaveLength(144)
    for (const route of routes) {
      const document = createDocument()
      const story = createProductionNodeStory(document, route)
      expect(story.element.ownerDocument, route).toBe(document)
      expect(story.source().html.length, route).toBeGreaterThan(0)
      expect(story.source().typescript, route).toContain("@nodes/ui/")
      story.dispose()
    }
  })

  test("renders a rich production NodeEditor instead of graph rectangles", () => {
    const story = createProductionNodeStory(createDocument(), "ui/node-editor/scene/default")

    expect(story.element.className).toContain("node-editor")
    expect(story.element.querySelectorAll(".node-article")).toHaveLength(2)
    expect(story.element.querySelectorAll(".node-parameter").length).toBeGreaterThan(3)
    expect(story.element.querySelectorAll("[data-field-id]").length).toBeGreaterThan(3)
    expect(story.element.querySelectorAll(".node-socket").length).toBeGreaterThan(3)
    expect(story.element.querySelectorAll(".node-link")).toHaveLength(1)
    expect(story.source().typescript).toContain('from "@nodes/ui/node-editor"')
    expect(Object.keys(story.source()).sort()).toEqual(["html", "typescript"])
    const styleSheets = (story.componentRoot.readStyleSheets() as {
      styleSheets: readonly Readonly<{source?: Readonly<{kind?: string; moduleId?: string}>}>[]
    }).styleSheets
    expect(styleSheets.length).toBeGreaterThan(0)
    expect(styleSheets.every(sheet => sheet.source?.kind === "authored-css")).toBeTrue()
    expect(styleSheets.some(sheet => sheet.source?.moduleId === "@ui/components/field.tsx")).toBeTrue()
    story.dispose()
  })

  test("uses exact Parameter plus Field for every catalog kind", () => {
    for (const kind of parameterKinds) {
      const story = createProductionNodeStory(createDocument(), `ui/parameter/${kind}/both`)
      const parameter = story.element.querySelector(".node-parameter")
      const field = story.element.querySelector("[data-field-id]")

      expect(parameter?.getAttribute("data-field-kind"), kind).toBe(kind)
      expect(field?.getAttribute("data-field-kind"), kind).toBe(kind)
      expect(field?.className, kind).toBe("")
      expect(story.element.querySelectorAll(".node-socket"), kind).toHaveLength(2)
      expect(story.source().typescript, kind).toContain('from "@nodes/ui/parameter"')
      story.dispose()
    }
  })

  test("uses all production Socket presets and independent directions", () => {
    for (const kind of SOCKET_KINDS) {
      for (const direction of ["input", "output", "bidirectional"] as const) {
        const story = createProductionNodeStory(createDocument(), `ui/socket/${kind}/${direction}`)
        const socket = story.element.querySelector(".node-socket")

        expect(socket?.getAttribute("data-socket-kind")).toBe(kind)
        expect(socket?.getAttribute("data-direction")).toBe(direction)
        expect(socket?.getAttribute("data-side")).toBe(direction === "output" ? "right" : "left")
        expect(story.source().typescript).toContain('from "@nodes/ui/socket"')
        story.dispose()
      }
    }
  })

  test("uses production Frame, Link and accepted-reference compositions", () => {
    const frame = createProductionNodeStory(createDocument(), "ui/frame/nested/default")
    const link = createProductionNodeStory(createDocument(), "ui/link/orthogonal/selected")
    const comparison = createProductionNodeStory(createDocument(), "ui/comparison/reference/default")
    const referenceStage = comparison.element.querySelector(".nodes-production-story__reference-stage") as HTMLElement | null

    expect(frame.element.querySelector(".graph-canvas__frame")?.getAttribute("aria-selected")).toBe("true")
    expect(frame.element.querySelectorAll(".node-article")).toHaveLength(2)
    expect(link.element.querySelectorAll(".node-article")).toHaveLength(2)
    expect(link.element.querySelectorAll(".node-link__segment")).toHaveLength(3)
    expect(link.element.querySelectorAll(".node-link__hit")).toHaveLength(3)
    expect(link.source().typescript).toContain('from "@nodes/ui/link"')
    expect(link.source().typescript).toContain('const scene = document.createElement("section")')
    expect(comparison.element.querySelector("img")?.getAttribute("src"))
      .toContain(encodeURIComponent("variant:@nodes/ui/comparison/reference/default"))
    expect(comparison.element.querySelectorAll(".node-article")).toHaveLength(1)
    expect(comparison.element.getAttribute("data-comparison-scope")).toBe("noise-texture-node")
    expect(comparison.element.getAttribute("data-comparison-scale")).toBe("1")
    expect(referenceStage?.getAttribute("data-source-rect"))
      .toBe("498 558 228 385")
    expect(referenceStage?.getAttribute("data-source-dpr"))
      .toBe("2")
    expect(referenceStage?.scrollLeft).toBe(498)
    expect(referenceStage?.scrollTop).toBe(558)
    expect(comparison.element.querySelector(".nodes-production-story__live-stage")?.getAttribute("data-live-owner"))
      .toBe("@nodes/ui/node")
    expect(comparison.element.querySelector("img")?.getAttribute("width")).toBe("1920")
    expect(comparison.element.querySelector("img")?.getAttribute("height")).toBe("1200")
    expect(comparison.element.querySelector(".node-article")?.getAttribute("style"))
      .toContain("left: 6px; top: 0px; width: 216px")
    expect([...comparison.element.querySelectorAll("[data-field-id]")]
      .map((field) => field.getAttribute("data-field-id")))
      .toEqual([
        "noise-dimensions",
        "noise-basis",
        "noise-normalize",
        "noise-vector",
        "noise-scale",
        "noise-detail",
        "noise-roughness",
        "noise-lacunarity",
        "noise-distortion",
      ])
    expect([...comparison.element.querySelectorAll(".node-socket")]
      .map((socket) => socket.getAttribute("data-socket-id")))
      .toEqual([
        "noise-factor-output",
        "noise-color-output",
        "noise-vector-input",
        "noise-scale-input",
        "noise-detail-input",
        "noise-roughness-input",
        "noise-lacunarity-input",
        "noise-distortion-input",
      ])
    expect(NODE_COMPARISON_REFERENCE).toEqual({
      id: "accepted-node-editor-4-5-5",
      scope: "noise-texture-node",
      sourceViewport: {width: 1920, height: 1200, dpr: 2},
      sourceRect: {x: 498, y: 558, width: 228, height: 385},
      liveViewport: {width: 228, height: 385, scale: 1},
    })
    expect(comparison.source().typescript).toContain('from "@nodes/ui/node"')
    expect(comparison.source().typescript).toContain('const comparison = document.createElement("section")')
    expect(comparison.source().typescript).toContain('comparison.setAttribute("data-comparison-scale", "1")')
    expect(comparison.source().typescript).toContain('referenceStage.setAttribute("data-source-rect"')

    frame.dispose()
    link.dispose()
    comparison.dispose()
  })

  test("keeps the immutable reference crop and live viewport at one common CSS scale", async () => {
    const css = await Bun.file(new URL("../../dom.css", import.meta.url)).text()
    const referenceCss = css.match(/\.nodes-production-story__reference \{(?<body>[\s\S]*?)\n\}/u)?.groups?.body ?? ""
    expect(referenceCss).toContain("left: 0")
    expect(referenceCss).toContain("top: 0")
    expect(css).toContain(`width: ${NODE_COMPARISON_REFERENCE.sourceViewport.width}px`)
    expect(css).toContain(`height: ${NODE_COMPARISON_REFERENCE.sourceViewport.height}px`)
    expect(css).toContain(`width: ${NODE_COMPARISON_REFERENCE.liveViewport.width}px`)
    expect(css).toContain(`height: ${NODE_COMPARISON_REFERENCE.liveViewport.height}px`)
    expect(referenceCss).not.toBe("")
    expect(referenceCss).not.toContain("object-fit")
    expect(referenceCss).not.toContain("transform")
  })

  test("projects the accepted source crop through standard scroll and overflow clip", () => {
    const document = createDocument()
    const stage = document.createElement("div")
    const reference = document.createElement("img")
    stage.className = "nodes-production-story__comparison-stage nodes-production-story__reference-stage"
    reference.className = "nodes-production-story__reference"
    reference.src = "/accepted-reference.png"
    reference.width = NODE_COMPARISON_REFERENCE.sourceViewport.width
    reference.height = NODE_COMPARISON_REFERENCE.sourceViewport.height
    stage.appendChild(reference)
    stage.scrollLeft = NODE_COMPARISON_REFERENCE.sourceRect.x
    stage.scrollTop = NODE_COMPARISON_REFERENCE.sourceRect.y
    document.appendChild(stage)

    const renderer = createDocumentRenderer({
      document,
      root: stage,
      viewport: {
        width: NODE_COMPARISON_REFERENCE.liveViewport.width,
        height: NODE_COMPARISON_REFERENCE.liveViewport.height,
      },
      styleSheets: [nodesProductionPreviewCss],
    })
    const frame = renderer.flush()
    const image = frame.displayList.find((item) => item.kind === "image" && item.node === reference)
    expect(frame.boxByNode.get(stage)).toMatchObject({width: 228, height: 385})
    expect(frame.scrolls.get(stage)).toMatchObject({
      requestedScrollLeft: 498,
      requestedScrollTop: 558,
      scrollLeft: 498,
      scrollTop: 558,
    })
    expect(image).toMatchObject({x: -498, y: -558, width: 1920, height: 1200})
    expect(image?.clips[0]).toMatchObject({width: 228, height: 385, clipX: true, clipY: true})
    renderer.dispose()
  })

  test("keeps production Node geometry comparable to the accepted compact subject", () => {
    const document = createDocument()
    const story = createProductionNodeStory(document, "ui/comparison/reference/default")
    document.appendChild(story.element)
    const renderer = createDocumentRenderer({
      document,
      root: story.element,
      viewport: {width: 500, height: 500},
      styleSheets: [nodesDomStoryCss],
    })
    const frame = renderer.flush()
    const article = story.element.querySelector(".node-article")!
    const header = story.element.querySelector(".node-article__header")!
    const body = story.element.querySelector(".node-article__body")!
    const rightSockets = story.element.querySelector(".node-article__sockets--right")!
    const properties = story.element.querySelector(".node-article__properties")!
    const dimensions = story.element.querySelector('[data-field-id="noise-dimensions"]')!
    const dimensionsLabel = dimensions.querySelector("span")!
    const vector = story.element.querySelector('[data-field-id="noise-vector"]')!
    const vectorControl = vector.querySelector('[role="group"]')!
    const socket = story.element.querySelector('[data-socket-id="noise-factor-output"]')!
    const articleBox = frame.boxByNode.get(article)!
    const headerBox = frame.boxByNode.get(header)!
    const bodyBox = frame.boxByNode.get(body)!

    expect(articleBox).toMatchObject({width: 216})
    expect(articleBox.height).toBeLessThanOrEqual(285)
    expect(header.getAttribute("style")).toBe("background: #79461d")
    expect(headerBox).toMatchObject({width: 214, height: 24})
    expect(bodyBox.width).toBe(214)
    expect(bodyBox.height).toBeLessThanOrEqual(260)
    expect(frame.boxByNode.get(rightSockets)!.y).toBeLessThan(frame.boxByNode.get(properties)!.y)
    expect(frame.boxByNode.has(dimensionsLabel)).toBeFalse()
    expect(frame.boxByNode.has(vectorControl)).toBeFalse()
    expect(frame.boxByNode.get(socket)).toMatchObject({width: 10, height: 10})
    expect(frame.displayList.filter((item) => item.kind === "text").map((item) => item.text))
      .toEqual(expect.arrayContaining(["Fac", "Color", "3D", "fBM", "Normalize", "Vector"]))

    renderer.dispose()
    story.dispose()
  })

  test("imports exact public owners without private visual replicas", async () => {
    const source = await Bun.file(new URL("./production-node-story.ts", import.meta.url)).text()
    for (const owner of ["node-editor", "node", "parameter", "socket", "link"]) {
      expect(source).toContain(`from \"@nodes/ui/${owner}\"`)
    }
    for (const forbidden of [
      "@zavx0z/storybook",
      "createNodeWorkbench",
      "createGraphCanvas",
      "createParameterSocket",
      "../../ui/storybook/dom/remaining-dom-story",
    ]) expect(source).not.toContain(forbidden)
  })
})
