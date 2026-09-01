import {describe, expect, test} from "bun:test"
import {Event, type HTMLInputElement} from "@zavx0z/dom"
import {createRoot} from "@zavx0z/react"
import {isCompiledTemplate} from "@zavx0z/template/compiled"
import {createDocument} from "../document.fixture.ts"
import {VectorField} from "./vector-field.tsx"

describe("compiled production VectorField", () => {
  test("composes VectorControl and applies integer projection", () => {
    expect(isCompiledTemplate(VectorField)).toBe(true)
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    const values: Array<readonly number[]> = []
    root.render(VectorField as any, {id: "location", label: "Location", value: [1, 2, 3], numberKind: "integer", onChange: (value: readonly number[]) => values.push(value)})
    const input = host.querySelector('[data-control-key="X"] input') as HTMLInputElement
    input.value = "4.6"
    input.dispatchEvent(new Event("input", {bubbles: true}))
    expect(values).toEqual([[5, 2, 3]])
    root.unmount()
  })
})
