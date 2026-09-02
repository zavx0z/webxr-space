import {describe, expect, test} from "bun:test"
import type {HTMLButtonElement} from "@zavx0z/dom"
import {createDocumentRenderer} from "@zavx0z/renderer"
import {createRoot} from "@zavx0z/react"
import {isCompiledTemplate} from "@zavx0z/template/compiled"
import {createDocument} from "../document.fixture.ts"
import {SwitchFieldFixture} from "./switch-field.fixture.tsx"
import {SwitchField} from "./switch-field.tsx"

describe("compiled production SwitchField", () => {
  test("retains one switch and keeps readOnly distinct from disabled", () => {
    expect(isCompiledTemplate(SwitchField)).toBe(true)
    expect(isCompiledTemplate(SwitchFieldFixture)).toBe(true)
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    const proposed: boolean[] = []
    root.render(SwitchField as any, {checked: false, onChange: (value: boolean) => proposed.push(value)})
    const button = host.querySelector("button") as HTMLButtonElement
    const thumb = button.querySelector("span")!
    button.click()
    expect(proposed).toEqual([true])
    root.render(SwitchField as any, {label: "Active", checked: true, readOnly: true, onChange: (value: boolean) => proposed.push(value)})
    expect(host.querySelector("button")).toBe(button)
    expect(button.disabled).toBe(false)
    button.click()
    expect(proposed).toEqual([true])
    const renderer = createDocumentRenderer({document, root: host, viewport: {width: 240, height: 80}})
    expect(renderer.flush().boxByNode.get(thumb)?.transform.translateX).toBe(14)
    renderer.dispose()
    root.render(SwitchFieldFixture as any, {})
    expect(host.textContent).toContain("Active")
    root.unmount()
  })
})
