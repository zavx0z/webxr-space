import {describe, expect, test} from "bun:test"
import {Event, type HTMLInputElement} from "@zavx0z/dom"
import {
  createDocumentInteractionState,
  createDocumentRenderer,
  type RectDisplayItem
} from "@zavx0z/renderer"
import {createRoot} from "@zavx0z/react"
import {isCompiledTemplate} from "@zavx0z/template/compiled"
import {createDocument} from "./test-document.ts"
import {TextField} from "./text-field.tsx"

describe("compiled production TextField", () => {
  test("keeps controlled live state, exact input identity and standard events", () => {
    expect(isCompiledTemplate(TextField)).toBe(true)
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    const proposed: string[] = []
    root.render(TextField as any, {
      value: "Output",
      type: "search",
      placeholder: "Search",
      onInput: (value: string) => proposed.push(value)
    })
    const input = host.querySelector("input") as HTMLInputElement
    expect(input.className).toBe("")
    expect(input.value).toBe("Output")
    expect(input.type).toBe("search")
    input.value = "Preview"
    input.dispatchEvent(new Event("input", {bubbles: true}))
    expect(proposed).toEqual(["Preview"])

    root.render(TextField as any, {
      value: "Render",
      readOnly: true,
      style: "width: 196px"
    })
    expect(host.querySelector("input")).toBe(input)
    expect(input.value).toBe("Render")
    expect(input.readOnly).toBe(true)
    expect(input.getAttribute("style")).toBe("width: 196px")
    root.unmount()
  })

  test("resolves native hover/focus and exact 22px compact geometry", () => {
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    root.render(TextField as any, {value: "Output"})
    const input = host.querySelector("input") as HTMLInputElement
    const interactionState = createDocumentInteractionState(document)
    const renderer = createDocumentRenderer({
      document,
      root: host,
      viewport: {width: 240, height: 80},
      interactionState
    })
    const initial = renderer.flush()
    expect(initial.boxByNode.get(input)).toMatchObject({width: 160, height: 22})
    interactionState.setHoveredElement(input)
    expect(background(renderer.flush(), input).border.colors.top).toBe("rgb(89 89 89)")
    input.focus()
    expect(background(renderer.flush(), input).border.colors.top).toBe("rgb(113 168 255)")
    renderer.dispose()
    root.unmount()
  })
})

function background(
  frame: import("@zavx0z/renderer").RenderFrame,
  input: HTMLInputElement
): RectDisplayItem {
  const item = frame.displayList.find((candidate): candidate is RectDisplayItem =>
    candidate.kind === "rect" && candidate.node === input && candidate.key === "background"
  )
  if (!item) throw new Error("TextField background is missing")
  return item
}
