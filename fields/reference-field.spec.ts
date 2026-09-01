import {describe, expect, test} from "bun:test"
import type {HTMLButtonElement} from "@zavx0z/dom"
import {createDocumentRenderer} from "@zavx0z/renderer"
import {createRoot} from "@zavx0z/react"
import {isCompiledTemplate} from "@zavx0z/template/compiled"
import {createDocument} from "../document.fixture.ts"
import {ReferenceFieldFixture} from "./reference-field.fixture.tsx"
import {ReferenceField} from "./reference-field.tsx"

describe("compiled production ReferenceField", () => {
  test("keeps activation available while readOnly blocks replacement", () => {
    expect(isCompiledTemplate(ReferenceField)).toBe(true)
    expect(isCompiledTemplate(ReferenceFieldFixture)).toBe(true)
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    const actions: string[] = []
    root.render(ReferenceField as any, {label: "Target", value: {id: "a", label: "Alpha"}, readOnly: true, onActivate: () => actions.push("activate"), onPick: () => actions.push("pick"), onClear: () => actions.push("clear")})
    const buttons = [...host.querySelectorAll("button")] as HTMLButtonElement[]
    buttons[0]!.click()
    buttons[1]!.click()
    buttons[2]!.click()
    expect(actions).toEqual(["activate"])
    const renderer = createDocumentRenderer({document, root: host, viewport: {width: 420, height: 80}})
    expect(renderer.flush().boxByNode.get(buttons[0]!)?.height).toBe(26)
    renderer.dispose()
    root.render(ReferenceFieldFixture as any, {})
    expect(host.textContent).toContain("Target")
    root.unmount()
  })
})
