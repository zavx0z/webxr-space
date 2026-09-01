import {describe, expect, test} from "bun:test"
import {createRoot} from "@zavx0z/react"
import {isCompiledTemplate} from "@zavx0z/template/compiled"
import {createDocument} from "../document.fixture.ts"
import {ColorField} from "./color-field.tsx"

describe("compiled production ColorField", () => {
  test("composes the expanded ColorControl with direct props", () => {
    expect(isCompiledTemplate(ColorField)).toBe(true)
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    root.render(ColorField as any, {id: "color", label: "Color", value: {r: 1, g: 0, b: 0, a: 1}})
    expect(host.querySelector('[data-field-kind="color"] fieldset')).not.toBeNull()
    expect(host.querySelector('[aria-label="Color editor"]')).not.toBeNull()
    root.unmount()
  })
})
