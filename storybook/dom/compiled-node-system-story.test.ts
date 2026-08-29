import {describe, expect, test} from "bun:test"

// Owner-local acceptance for the compiled NodeSystem story.
import {Event, HTMLInputElement, createDocument} from "@zavx0z/dom"
import {createDocumentRenderer} from "@zavx0z/renderer"
import {nodeSystemCss} from "@nodes/ui/node-system"
import {createCompiledNodeSystemStory} from "./compiled-node-system-story.tsx"

describe("compiled general Node system Storybook route", () => {
  test("mounts real Core/Editor state through the compiled public owner", async () => {
    const document = createDocument()
    const story = createCompiledNodeSystemStory(document)
    const root = story.element.querySelector('[data-node-system]')!
    const firstNode = story.element.querySelector('[data-node-id="procedural-field"]')!
    const firstSocket = story.element.querySelector('[data-socket-id="field-output"]')!
    const input = story.element.querySelector(
      '[data-parameter-id="normalize"] input[type="checkbox"]',
    ) as HTMLInputElement
    const before = story.props as Readonly<{revision: number; topologyRevision: number}>

    expect(root.getAttribute("aria-label")).toBe("General compiled node system")
    expect(story.element.querySelectorAll("article")).toHaveLength(3)
    expect(story.element.querySelectorAll('[data-link-id]')).toHaveLength(2)
    expect(input.checked).toBeTrue()
    expect(before).toMatchObject({revision: 0, topologyRevision: 0})

    input.checked = false
    input.dispatchEvent(new Event("change", {bubbles: true}))
    const after = story.props as Readonly<{revision: number; topologyRevision: number}>
    expect(after).toMatchObject({revision: 1, topologyRevision: 0})
    expect(story.element.querySelector('[data-node-id="procedural-field"]')).toBe(firstNode)
    expect(story.element.querySelector('[data-socket-id="field-output"]')).toBe(firstSocket)
    expect(story.element.querySelector(
      '[data-parameter-id="normalize"] input[type="checkbox"]',
    )).toBe(input)

    const source = story.source()
    expect(source.typescript).toContain('from "@nodes/core"')
    expect(source.typescript).toContain('from "@nodes/editor"')
    expect(source.typescript).toContain('from "@nodes/ui/node-system"')
    expect(source.typescript).toContain('from "@zavx0z/react"')
    expect(source.css).toContain("[data-z-")
    expect(source.html).toContain("data-node-system")
    expect(source.html).toContain("top: 243.5px")
    expect(source.html).toContain("top: 207.5px")

    const renderer = createDocumentRenderer({
      document,
      root: story.element,
      viewport: {width: 1000, height: 520},
      styleSheets: [nodeSystemCss],
    })
    const frame = renderer.flush()
    const fieldSocket = story.element.querySelector('[data-socket-id="field-output"]')!
    const surfaceSocket = story.element.querySelector('[data-socket-id="surface-input"]')!
    const surfaceLink = story.element.querySelector('[data-link-id="surface-link"]')!
    const firstSegment = surfaceLink.children[0]!
    const lastSegment = surfaceLink.children[2]!
    const fieldBox = frame.boxByNode.get(fieldSocket)!
    const surfaceBox = frame.boxByNode.get(surfaceSocket)!
    const firstBox = frame.boxByNode.get(firstSegment)!
    const lastBox = frame.boxByNode.get(lastSegment)!
    const geometryOutput = frame.boxByNode.get(story.element.querySelector('[data-socket-id="geometry-output"]')!)!
    const geometryInput = frame.boxByNode.get(story.element.querySelector('[data-socket-id="geometry-input"]')!)!
    const geometryLink = story.element.querySelector('[data-link-id="geometry-link"]')!
    const geometryFirst = frame.boxByNode.get(geometryLink.children[0]!)!
    const geometryLast = frame.boxByNode.get(geometryLink.children[2]!)!
    expect(Math.abs(
      geometryFirst.y + geometryFirst.height / 2 - geometryOutput.y - geometryOutput.height / 2,
    )).toBeLessThanOrEqual(0.5)
    expect(Math.abs(
      geometryLast.y + geometryLast.height / 2 - geometryInput.y - geometryInput.height / 2,
    )).toBeLessThanOrEqual(0.5)
    expect(Math.abs(
      firstBox.y + firstBox.height / 2 - fieldBox.y - fieldBox.height / 2,
    )).toBeLessThanOrEqual(0.5)
    expect(Math.abs(
      lastBox.y + lastBox.height / 2 - surfaceBox.y - surfaceBox.height / 2,
    )).toBeLessThanOrEqual(0.5)
    renderer.dispose()
    story.dispose()
  })
})
