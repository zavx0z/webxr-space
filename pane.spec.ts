import {describe, expect, test} from "bun:test"
import {createRoot} from "@zavx0z/react"
import {isCompiledTemplate} from "@zavx0z/template/compiled"
import {createDocument} from "./document.fixture.ts"
import {PaneComposition} from "./pane.fixture.tsx"
import {Pane} from "./pane.tsx"

describe("compiled production Pane", () => {
  test("retains one authored child slot through its adjacent consumer fixture", () => {
    expect(isCompiledTemplate(Pane)).toBe(true)
    expect(isCompiledTemplate(PaneComposition)).toBe(true)
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)

    root.render(PaneComposition as any, {label: "First"})
    const owner = host.querySelector("section")!
    const child = owner.querySelector('[data-pane-child="true"]')!
    const text = child.firstChild

    root.render(PaneComposition as any, {label: "Second"})
    expect(host.querySelector("section")).toBe(owner)
    expect(owner.querySelector('[data-pane-child="true"]')).toBe(child)
    expect(child.firstChild).toBe(text)
    expect(child.textContent).toBe("Second")
    root.unmount()
  })
})
