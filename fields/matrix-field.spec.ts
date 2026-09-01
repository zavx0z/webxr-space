import {describe, expect, test} from "bun:test"
import {Event, type HTMLInputElement} from "@zavx0z/dom"
import {createRoot} from "@zavx0z/react"
import {isCompiledTemplate} from "@zavx0z/template/compiled"
import {createDocument} from "../document.fixture.ts"
import {MatrixField} from "./matrix-field.tsx"

describe("compiled production MatrixField", () => {
  test("composes MatrixControl and reports immutable matrix proposals", () => {
    expect(isCompiledTemplate(MatrixField)).toBe(true)
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    const values: Array<readonly (readonly number[])[]> = []
    root.render(MatrixField as any, {id: "matrix", label: "Matrix", value: [[1, 0], [0, 1]], onChange: (value: readonly (readonly number[])[]) => values.push(value)})
    const input = host.querySelector('[data-control-key="0"] input') as HTMLInputElement
    input.value = "2"
    input.dispatchEvent(new Event("input", {bubbles: true}))
    expect(values).toEqual([[[2, 0], [0, 1]]])
    root.unmount()
  })
})
