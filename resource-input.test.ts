import {describe, expect, test} from "bun:test"
import {
  Event,
  createDocument,
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
import {PathInput, pathInputCss} from "./path-input.tsx"
import {ReferenceInput, referenceInputCss} from "./reference-input.tsx"

describe("compiled production resource inputs", () => {
  test("composes PathInput from TextField and IconButton with stable events", () => {
    expect(isCompiledTemplate(PathInput)).toBe(true)
    const mounted = mount()
    const inputs: string[] = []
    const changes: string[] = []
    let browses = 0
    const onBrowse = () => { browses += 1 }
    mounted.root.render(PathInput as any, {
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

    mounted.root.render(PathInput as any, {
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

    mounted.root.render(PathInput as any, {value: "/render"})
    expect(owner.querySelector("button")).toBe(browse)
    const hiddenRenderer = createDocumentRenderer({
      document: mounted.document,
      root: mounted.host,
      viewport: {width: 380, height: 80},
      styleSheets: [pathInputCss]
    })
    expect(hiddenRenderer.flush().boxByNode.has(browse)).toBe(false)
    hiddenRenderer.dispose()
    mounted.root.unmount()
  })

  test("preserves PathInput geometry, native states and one outer emboss", () => {
    const mounted = mount()
    mounted.root.render(PathInput as any, {value: "/out", onBrowse() {}})
    const owner = mounted.host.querySelector("div")!
    const input = owner.querySelector("input") as HTMLInputElement
    const browse = owner.querySelector("button") as HTMLButtonElement
    const interactionState = createDocumentInteractionState(mounted.document)
    const renderer = createDocumentRenderer({
      document: mounted.document,
      root: mounted.host,
      viewport: {width: 380, height: 80},
      interactionState,
      styleSheets: [pathInputCss]
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

    mounted.root.render(PathInput as any, {value: "/out", density: "compact", onBrowse() {}})
    frame = renderer.flush()
    expect(frame.boxByNode.get(owner)).toMatchObject({width: 220, height: 24})
    expect(frame.boxByNode.get(input)).toMatchObject({width: 188, height: 22})
    expect(frame.boxByNode.get(browse)?.height).toBe(22)
    renderer.dispose()
    mounted.root.unmount()
  })

  test("composes ReferenceInput actions with stable identities and click intent", () => {
    expect(isCompiledTemplate(ReferenceInput)).toBe(true)
    const mounted = mount()
    const actions: string[] = []
    const onActivate = () => actions.push("activate")
    const onPick = () => actions.push("pick")
    const onClear = () => actions.push("clear")
    mounted.root.render(ReferenceInput as any, {
      value: {id: "mat", label: "Material", kind: "Material"},
      onActivate,
      onPick,
      onClear
    })
    const owner = mounted.host.querySelector("div")!
    const buttons = [...owner.querySelectorAll("button")] as HTMLButtonElement[]
    const valueText = buttons[0]!.querySelector("span")!.firstChild
    const pickImage = buttons[1]!.querySelector("img")
    const clearImage = buttons[2]!.querySelector("img")
    expect(buttons).toHaveLength(3)
    expect(buttons.every(button => button.className === "")).toBe(true)
    expect(buttons[0]!.textContent).toBe("Material")
    expect(pickImage?.getAttribute("src")).toContain("svg")
    expect(clearImage?.getAttribute("src")).toContain("svg")
    for (const button of buttons) button.click()
    expect(actions).toEqual(["activate", "pick", "clear"])

    mounted.root.render(ReferenceInput as any, {
      value: {id: "mat", label: "Material", kind: "Material"},
      readOnly: true,
      onActivate,
      onPick,
      onClear
    })
    for (const button of buttons) button.click()
    expect(actions).toEqual(["activate", "pick", "clear"])

    mounted.root.render(ReferenceInput as any, {
      value: null,
      placeholder: "Not assigned",
      density: "compact",
      onActivate,
      onPick,
      onClear
    })
    const updated = [...owner.querySelectorAll("button")] as HTMLButtonElement[]
    expect(mounted.host.querySelector("div")).toBe(owner)
    expect(updated[0]).toBe(buttons[0])
    expect(updated[1]).toBe(buttons[1])
    expect(updated[2]).toBe(buttons[2])
    expect(updated[0]!.querySelector("span")!.firstChild).toBe(valueText)
    expect(updated[1]!.querySelector("img")).toBe(pickImage)
    expect(updated[2]!.querySelector("img")).toBe(clearImage)
    expect(updated[0]!.textContent).toBe("Not assigned")
    const hiddenRenderer = createDocumentRenderer({
      document: mounted.document,
      root: mounted.host,
      viewport: {width: 320, height: 80},
      styleSheets: [referenceInputCss]
    })
    const hiddenFrame = hiddenRenderer.flush()
    expect(hiddenFrame.boxByNode.has(updated[1]!)).toBe(true)
    expect(hiddenFrame.boxByNode.has(updated[2]!)).toBe(false)
    hiddenRenderer.dispose()
    updated[2]!.click()
    expect(actions).toEqual(["activate", "pick", "clear"])
    mounted.root.unmount()
  })

  test("preserves ReferenceInput geometry and removes nested emboss islands", () => {
    const mounted = mount()
    mounted.root.render(ReferenceInput as any, {
      value: {id: "mat", label: "Material"},
      onActivate() {},
      onPick() {},
      onClear() {}
    })
    const owner = mounted.host.querySelector("div")!
    const buttons = [...owner.querySelectorAll("button")]
    const renderer = createDocumentRenderer({
      document: mounted.document,
      root: mounted.host,
      viewport: {width: 320, height: 80},
      styleSheets: [referenceInputCss]
    })
    let frame = renderer.flush()
    expect(frame.boxByNode.get(owner)).toMatchObject({width: 260, height: 28})
    expect(frame.boxByNode.get(buttons[0]!)).toMatchObject({width: 202, height: 26})
    expect(frame.boxByNode.get(buttons[1]!)).toMatchObject({width: 28, height: 26})
    expect(frame.boxByNode.get(buttons[2]!)).toMatchObject({width: 28, height: 26})
    expect(shadow(frame, owner)).toBeDefined()
    for (const button of buttons) expect(shadow(frame, button)).toBeUndefined()

    mounted.root.render(ReferenceInput as any, {
      value: {id: "mat", label: "Material"},
      density: "compact",
      onActivate() {},
      onPick() {},
      onClear() {}
    })
    frame = renderer.flush()
    expect(frame.boxByNode.get(owner)).toMatchObject({width: 190, height: 24})
    expect(frame.boxByNode.get(buttons[0]!)).toMatchObject({width: 132, height: 22})
    expect(buttons.every(button => frame.boxByNode.get(button)?.height === 22)).toBe(true)
    renderer.dispose()
    mounted.root.unmount()
  })

  test("keeps class-free native pseudo sheets and caller style last", () => {
    expect(pathInputCss).not.toContain(".ui-")
    expect(referenceInputCss).not.toContain(".ui-")

    const mounted = mount()
    mounted.root.render(PathInput as any, {
      value: "/out",
      style: {width: 340, background: "#123456"}
    })
    const path = mounted.host.querySelector("div")!
    expect(path.getAttribute("style")).toBe("width: 340px; background: #123456")
    mounted.root.render(ReferenceInput as any, {
      value: null,
      style: {width: 280, background: "#234567"}
    })
    const reference = mounted.host.querySelector("div")!
    expect(reference.getAttribute("style")).toBe("width: 280px; background: #234567")
    const adoptedCss = readDocumentCompiledStyleSheets(mounted.document).styleSheets
      .map(styleSheet => styleSheet.cssText)
      .join("\n")
    for (const pseudo of [":hover", ":active", ":focus", ":disabled"]) {
      expect(`${pathInputCss}\n${adoptedCss}`).toContain(pseudo)
      expect(`${referenceInputCss}\n${adoptedCss}`).toContain(pseudo)
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
