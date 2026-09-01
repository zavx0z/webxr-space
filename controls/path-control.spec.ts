import {describe, expect, test} from "bun:test"
import {
  Event,
  readDocumentCompiledStyleSheets,
  type HTMLButtonElement,
  type HTMLInputElement,
  type Node
} from "@zavx0z/dom"
import {
  createDocumentInteractionState,
  createDocumentRenderer,
  type RenderFrame
} from "@zavx0z/renderer"
import {createRoot, type ComponentRoot} from "@zavx0z/react"
import {isCompiledTemplate} from "@zavx0z/template/compiled"
import {PathControl} from "./path-control.tsx"
import {createDocument} from "../document.fixture.ts"

describe("compiled production PathControl", () => {
  test("composes PathControl from TextControl and IconButton with stable events", () => {
    expect(isCompiledTemplate(PathControl)).toBe(true)
    const mounted = mount()
    const inputs: string[] = []
    const changes: string[] = []
    let browses = 0
    const onBrowse = () => { browses += 1 }
    mounted.root.render(PathControl as any, {
      value: "/out",
      placeholder: "Choose a path",
      title: "Output path",
      browseTitle: "Browse output",
      onInput: (value: string) => inputs.push(value),
      onChange: (value: string) => changes.push(value),
      onBrowse
    })
    const owner = mounted.host.querySelector("div") as import("@zavx0z/dom").HTMLElement
    const input = owner.querySelector("input") as HTMLInputElement
    const browse = owner.querySelector("button") as HTMLButtonElement
    const browseImage = browse.querySelector("img")

    expect(owner.className).toBe("")
    expect(input.className).toBe("")
    expect(browse.className).toBe("")
    expect(browse.title).toBe("Browse output")
    expect(browseImage?.getAttribute("src")).toContain("svg")
    input.value = "/render"
    input.dispatchEvent(new Event("input", {bubbles: true}))
    input.dispatchEvent(new Event("change", {bubbles: true}))
    browse.click()
    expect(inputs).toEqual(["/render"])
    expect(changes).toEqual(["/render"])
    expect(browses).toBe(1)

    mounted.root.render(PathControl as any, {
      value: "/render",
      density: "compact",
      readOnly: true,
      onBrowse
    })
    expect(mounted.host.querySelector("div")).toBe(owner)
    expect(owner.querySelector("input")).toBe(input)
    expect(owner.querySelector("button")).toBe(browse)
    expect(browse.querySelector("img")).toBe(browseImage)
    expect(input.value).toBe("/render")
    browse.click()
    expect(browses).toBe(1)

    mounted.root.render(PathControl as any, {value: "/render"})
    expect(owner.querySelector("button")).toBe(browse)
    const hiddenRenderer = createDocumentRenderer({
      document: mounted.document,
      root: mounted.host,
      viewport: {width: 380, height: 80}
    })
    expect(hiddenRenderer.flush().boxByNode.has(browse)).toBe(false)
    hiddenRenderer.dispose()
    mounted.root.unmount()
  })

  test("preserves PathControl geometry, native states and one outer emboss", () => {
    const mounted = mount()
    mounted.root.render(PathControl as any, {value: "/out", onBrowse() {}})
    const owner = mounted.host.querySelector("div")!
    const input = owner.querySelector("input") as HTMLInputElement
    const browse = owner.querySelector("button") as HTMLButtonElement
    const interactionState = createDocumentInteractionState(mounted.document)
    const renderer = createDocumentRenderer({
      document: mounted.document,
      root: mounted.host,
      viewport: {width: 380, height: 80},
      interactionState
    })
    let frame = renderer.flush()
    expect(frame.boxByNode.get(owner)).toMatchObject({width: 320, height: 28})
    expect(frame.boxByNode.get(input)).toMatchObject({width: 288, height: 26})
    expect(frame.boxByNode.get(browse)).toMatchObject({width: 30, height: 26})
    expect(shadow(frame, owner)).toBeDefined()
    expect(shadow(frame, input)).toBeUndefined()
    expect(shadow(frame, browse)).toBeUndefined()
    expect(rect(frame, browse)?.color).toBe("rgb(84 84 84)")

    interactionState.setHoveredElement(browse)
    expect(rect(renderer.flush(), browse)?.color).toBe("rgb(101 101 101)")
    interactionState.setActiveElement(browse)
    expect(rect(renderer.flush(), browse)?.color).toBe("rgb(71 114 179)")
    interactionState.setHoveredElement(null)
    interactionState.setActiveElement(null)
    input.focus()
    expect(rect(renderer.flush(), input)?.color).toBe("rgb(34 34 34)")

    mounted.root.render(PathControl as any, {value: "/out", density: "compact", onBrowse() {}})
    frame = renderer.flush()
    expect(frame.boxByNode.get(owner)).toMatchObject({width: 220, height: 24})
    expect(frame.boxByNode.get(input)).toMatchObject({width: 188, height: 22})
    expect(frame.boxByNode.get(browse)?.height).toBe(22)
    renderer.dispose()
    mounted.root.unmount()
  })

  test("keeps its class-free native pseudo sheet and caller style last", () => {
    const mounted = mount()
    mounted.root.render(PathControl as any, {
      value: "/out",
      style: "width: 340px; background: #123456"
    })
    const path = mounted.host.querySelector("div")!
    expect(path.getAttribute("style")).toBe("width: 340px; background: #123456")
    const adoptedCss = readDocumentCompiledStyleSheets(mounted.document).styleSheets
      .map(styleSheet => styleSheet.cssText)
      .join("\n")
    for (const pseudo of [":hover", ":active", ":focus", ":disabled"]) {
      expect(adoptedCss).toContain(pseudo)
    }
    mounted.root.unmount()
  })
})

function mount(): Readonly<{
  document: ReturnType<typeof createDocument>
  host: import("@zavx0z/dom").HTMLElement
  root: ComponentRoot
}> {
  const document = createDocument()
  const host = document.createElement("main")
  document.appendChild(host)
  return {document, host, root: createRoot(host)}
}

function rect(frame: RenderFrame, node: Node) {
  return frame.displayList.find(item =>
    item.kind === "rect" && item.node === node && item.key === "background"
  ) as Extract<RenderFrame["displayList"][number], {kind: "rect"}> | undefined
}

function shadow(frame: RenderFrame, node: Node) {
  return frame.displayList.find(item =>
    item.kind === "rect" && item.node === node && item.key === "shadow"
  )
}
