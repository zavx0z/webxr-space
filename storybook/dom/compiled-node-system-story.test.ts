import {describe, expect, test} from "bun:test"

// Owner-local acceptance for the compiled NodeSystem story.
import {Event, HTMLInputElement, createDocument} from "@zavx0z/dom"
import {createDocumentRenderer} from "@zavx0z/renderer"
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
    expect(firstNode.querySelector('[data-parameter-id="seed"] [data-field-kind="integer"]')).not.toBeNull()
    expect(firstNode.querySelector('[data-parameter-id="scale"] [data-field-kind="number"]')).not.toBeNull()
    expect(firstNode.querySelector('[data-parameter-id="profile"] [data-field-kind="vector"]')).not.toBeNull()
    expect(firstNode.querySelector('[data-parameter-id="geometry"] [data-field-kind="readonly"]')).not.toBeNull()
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
    const styleSheets = (story.componentRoot.readStyleSheets() as {styleSheets: readonly unknown[]}).styleSheets
    expect(styleSheets.length).toBeGreaterThan(0)
    expect(source.html).toContain("data-node-system")
    expect(source.html).toContain('d="M 618 250')
    expect(source.html).toContain("674 210")

    const renderer = createDocumentRenderer({
      document,
      root: story.element,
      viewport: {width: 1000, height: 520},
    })
    const frame = renderer.flush()
    const fieldSocket = story.element.querySelector('[data-socket-id="field-output"]')!
    const surfaceSocket = story.element.querySelector('[data-socket-id="surface-input"]')!
    const surfaceLink = story.element.querySelector('[data-link-id="surface-link"]')!
    expect(surfaceLink.localName).toBe("vector-path")
    expect(surfaceLink.childNodes).toEqual([])
    const fieldBox = frame.boxByNode.get(fieldSocket)!
    const surfaceBox = frame.boxByNode.get(surfaceSocket)!
    const geometryOutput = frame.boxByNode.get(story.element.querySelector('[data-socket-id="geometry-output"]')!)!
    const geometryInput = frame.boxByNode.get(story.element.querySelector('[data-socket-id="geometry-input"]')!)!
    const geometryLink = story.element.querySelector('[data-link-id="geometry-link"]')!
    const surfacePath = frame.displayList.find((item) => item.kind === "path" && item.node === surfaceLink)
    const geometryPath = frame.displayList.find((item) => item.kind === "path" && item.node === geometryLink)
    expect(surfacePath?.kind).toBe("path")
    expect(geometryPath?.kind).toBe("path")
    if (surfacePath?.kind !== "path" || geometryPath?.kind !== "path") throw new Error("Expected compiled Link Paths")
    const surfaceFirst = surfacePath.geometry.cubics[0]!.from
    const surfaceLast = surfacePath.geometry.cubics.at(-1)!.to
    const geometryFirst = geometryPath.geometry.cubics[0]!.from
    const geometryLast = geometryPath.geometry.cubics.at(-1)!.to
    expect(Math.abs(
      geometryPath.y + geometryFirst.y - geometryOutput.y - geometryOutput.height / 2,
    )).toBeLessThanOrEqual(0.5)
    expect(Math.abs(
      geometryPath.y + geometryLast.y - geometryInput.y - geometryInput.height / 2,
    )).toBeLessThanOrEqual(0.5)
    expect(Math.abs(
      surfacePath.y + surfaceFirst.y - fieldBox.y - fieldBox.height / 2,
    )).toBeLessThanOrEqual(0.5)
    expect(Math.abs(
      surfacePath.y + surfaceLast.y - surfaceBox.y - surfaceBox.height / 2,
    )).toBeLessThanOrEqual(0.5)
    renderer.dispose()
    story.dispose()
  })
})
