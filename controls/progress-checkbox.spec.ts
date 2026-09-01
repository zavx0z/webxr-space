import {describe, expect, test} from "bun:test"
import type {HTMLInputElement} from "@zavx0z/dom"
import {createRoot} from "@zavx0z/react"
import {isCompiledTemplate} from "@zavx0z/template/compiled"
import {createDocument} from "../document.fixture.ts"
import {ProgressCheckbox} from "./progress-checkbox.tsx"

describe("compiled production ProgressCheckbox", () => {
  test("implements progress state by composing Checkbox", () => {
    expect(isCompiledTemplate(ProgressCheckbox)).toBe(true)
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    root.render(ProgressCheckbox as any, {checked: false, indeterminate: true})
    const input = host.querySelector("input") as HTMLInputElement
    expect(input.indeterminate).toBe(true)
    expect(input.getAttribute("aria-checked")).toBe("mixed")
    expect(input.className).toBe("")
    expect(root.stats().mounts).toBe(2)
    root.unmount()
  })
})
