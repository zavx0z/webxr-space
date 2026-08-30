import {describe, expect, test} from "bun:test"
import {Event, type HTMLInputElement} from "@zavx0z/dom"
import {createDocumentRenderer} from "@zavx0z/renderer"
import {createRoot} from "@zavx0z/react"
import {isCompiledTemplate} from "@zavx0z/template/compiled"
import {ControlGroup} from "./control-group.tsx"
import {createDocument} from "./test-document.ts"

describe("compiled production ControlGroup", () => {
  test("composes TextField cells and retains keyed identities through reorder", () => {
    expect(isCompiledTemplate(ControlGroup)).toBe(true)
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    const proposals: string[] = []
    const first = [
      {key: "x", label: "X", value: "1", type: "number" as const},
      {key: "y", label: "Y", value: "2", type: "number" as const}
    ]
    root.render(ControlGroup as any, {
      items: first,
      onInput: (key: string, value: string) => proposals.push(`${key}:${value}`)
    })
    const initial = new Map([...host.querySelectorAll("label")].map(label => [
      label.getAttribute("data-control-key")!,
      label
    ]))
    const input = initial.get("x")!.querySelector("input") as HTMLInputElement
    input.value = "3"
    input.dispatchEvent(new Event("input", {bubbles: true}))
    expect(proposals).toEqual(["x:3"])

    root.render(ControlGroup as any, {items: [first[1]!, {...first[0]!, value: "3"}]})
    const reordered = [...host.querySelectorAll("label")]
    expect(reordered.map(label => label.getAttribute("data-control-key"))).toEqual(["y", "x"])
    expect(reordered[0]).toBe(initial.get("y"))
    expect(reordered[1]).toBe(initial.get("x"))
    expect(reordered[1]!.querySelector("input")).toBe(input)
    expect(input.value).toBe("3")
    root.unmount()
  })

  test("keeps one joined contour and class-free native focus ownership", () => {
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    root.render(ControlGroup as any, {items: [
      {key: "x", label: "X", value: "1"},
      {key: "y", label: "Y", value: "2"},
      {key: "z", label: "Z", value: "3"}
    ]})
    const owner = host.querySelector("div")!
    const renderer = createDocumentRenderer({
      document,
      root: host,
      viewport: {width: 400, height: 100}
    })
    const frame = renderer.flush()
    expect(owner.className).toBe("")
    expect([...owner.querySelectorAll("input")].every(input => input.className === "")).toBe(true)
    expect(frame.boxByNode.get(owner)?.height).toBe(28)
    const adoptedCss = (ControlGroup as any).styleSheets.map((sheet: any) => sheet.cssText).join("\n")
    expect(adoptedCss).toContain(":focus-within")
    expect(adoptedCss).not.toContain(".ui-")
    renderer.dispose()
    root.unmount()
  })
})
