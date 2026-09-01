import {describe, expect, test} from "bun:test"
import {Event, type HTMLInputElement} from "@zavx0z/dom"
import {createDocumentRenderer} from "@zavx0z/renderer"
import {createRoot} from "@zavx0z/react"
import {isCompiledTemplate} from "@zavx0z/template/compiled"
import {createDocument} from "../document.fixture.ts"
import {VectorFieldFixture} from "./vector-field.fixture.tsx"
import {VectorField} from "./vector-field.tsx"

describe("compiled production VectorField", () => {
  test("reports immutable axis proposals without data-kind rounding", () => {
    expect(isCompiledTemplate(VectorField)).toBe(true)
    expect(isCompiledTemplate(VectorFieldFixture)).toBe(true)
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    const values: Array<readonly number[]> = []
    root.render(VectorField as any, {label: "Location", value: [1, 2, 3], onInput: (value: readonly number[]) => values.push(value)})
    const input = host.querySelector("input") as HTMLInputElement
    input.valueAsNumber = 4.6
    input.dispatchEvent(new Event("input", {bubbles: true}))
    expect(values).toEqual([[4.6, 2, 3]])
    root.render(VectorFieldFixture as any, {})
    expect(host.textContent).toContain("Location")
    root.render(VectorField as any, {value: [1, 2, 3]})
    const group = host.querySelector("[data-field-group]")!
    const inputs = [...group.querySelectorAll("input")]
    const renderer = createDocumentRenderer({document, root: host, viewport: {width: 360, height: 80}})
    const frame = renderer.flush()
    expect(frame.boxByNode.get(group)?.width).toBe(360)
    expect(inputs.every(item => (frame.boxByNode.get(item)?.width ?? 0) > 0)).toBe(true)
    renderer.dispose()
    root.unmount()
  })
})
