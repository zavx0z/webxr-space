import {describe, expect, test} from "bun:test"

// Owner-local acceptance for the active external UI story factory.
import {createDocument} from "@zavx0z/dom"
import {SOCKET_KINDS} from "@nodes/ui/socket"
import {createProductionNodeStory} from "./production-node-story.ts"

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
  test("renders a rich production NodeEditor instead of graph rectangles", () => {
    const story = createProductionNodeStory(createDocument(), "ui/node-editor/scene/default")

    expect(story.element.className).toContain("node-editor")
    expect(story.element.querySelectorAll(".node-article")).toHaveLength(2)
    expect(story.element.querySelectorAll(".node-parameter").length).toBeGreaterThan(3)
    expect(story.element.querySelectorAll("[data-field-id]").length).toBeGreaterThan(3)
    expect(story.element.querySelectorAll(".node-socket").length).toBeGreaterThan(3)
    expect(story.element.querySelectorAll(".node-link")).toHaveLength(1)
    expect(story.source().typescript).toContain('from "@nodes/ui/node-editor"')
    expect(story.source().css).toContain(".node-article__header")
    expect(story.source().css).toContain("[data-field-id]")
    expect(story.source().css).not.toContain(".ui-field")
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
    expect(comparison.source().typescript).toContain('from "@nodes/ui/node"')
    expect(comparison.source().typescript).toContain('const comparison = document.createElement("section")')

    frame.dispose()
    link.dispose()
    comparison.dispose()
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
