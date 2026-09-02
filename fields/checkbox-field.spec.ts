import {describe, expect, test} from "bun:test"
import type {HTMLInputElement} from "@zavx0z/dom"
import {createDocumentRenderer} from "@zavx0z/renderer"
import {createRoot} from "@zavx0z/react"
import {isCompiledTemplate} from "@zavx0z/template/compiled"
import {createDocument} from "../document.fixture.ts"
import {CheckboxFieldFixture} from "./checkbox-field.fixture.tsx"
import {CheckboxField} from "./checkbox-field.tsx"

describe("compiled production CheckboxField", () => {
  test("owns checked and indeterminate state without a progress alias", () => {
    expect(isCompiledTemplate(CheckboxField)).toBe(true)
    expect(isCompiledTemplate(CheckboxFieldFixture)).toBe(true)
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    const proposed: boolean[] = []
    root.render(CheckboxField as any, {checked: false, indeterminate: true, onChange: (value: boolean) => proposed.push(value)})
    const input = host.querySelector("input") as HTMLInputElement
    expect(input.indeterminate).toBe(true)
    input.click()
    expect(proposed).toEqual([true])
    root.render(CheckboxField as any, {label: "Enabled", checked: false, readOnly: true, onChange: (value: boolean) => proposed.push(value)})
    input.click()
    expect(input.checked).toBe(false)
    expect(proposed).toEqual([true])
    const renderer = createDocumentRenderer({document, root: host, viewport: {width: 240, height: 80}})
    const frame = renderer.flush()
    expect(frame.boxByNode.get(input)).toMatchObject({width: 16, height: 16})
    expect(frame.boxByNode.get(input)?.border.radii).toEqual({
      topLeft: 3,
      topRight: 3,
      bottomRight: 3,
      bottomLeft: 3,
    })
    renderer.dispose()
    root.render(CheckboxFieldFixture as any, {})
    expect(host.textContent).toContain("Enabled")
    root.unmount()
  })
})
