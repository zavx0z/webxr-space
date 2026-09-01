import {describe, expect, test} from "bun:test"
import {Event, type HTMLInputElement} from "@zavx0z/dom"
import {createDocumentRenderer} from "@zavx0z/renderer"
import {createRoot} from "@zavx0z/react"
import {isCompiledTemplate} from "@zavx0z/template/compiled"
import {createDocument} from "../document.fixture.ts"
import {MatrixFieldFixture} from "./matrix-field.fixture.tsx"
import {MatrixField} from "./matrix-field.tsx"

describe("compiled production MatrixField", () => {
  test("retains rows and reports immutable cell proposals", () => {
    expect(isCompiledTemplate(MatrixField)).toBe(true)
    expect(isCompiledTemplate(MatrixFieldFixture)).toBe(true)
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    const values: Array<readonly (readonly number[])[]> = []
    root.render(MatrixField as any, {label: "Matrix", value: [[1, 0], [0, 1]], onInput: (value: readonly (readonly number[])[]) => values.push(value)})
    const input = host.querySelector("input") as HTMLInputElement
    input.valueAsNumber = 2
    input.dispatchEvent(new Event("input", {bubbles: true}))
    expect(values).toEqual([[[2, 0], [0, 1]]])
    root.render(MatrixFieldFixture as any, {})
    expect(host.textContent).toContain("Matrix")
    root.render(MatrixField as any, {value: [[1, 0], [0, 1]]})
    const renderer = createDocumentRenderer({document, root: host, viewport: {width: 480, height: 120}})
    let frame = renderer.flush()
    let groups = [...host.querySelectorAll("[data-field-group]")]
    let inputs = [...host.querySelectorAll("input")]
    expect(groups.map(group => frame.boxByNode.get(group)?.width)).toEqual([480, 480])
    expect(inputs.every(item => (frame.boxByNode.get(item)?.width ?? 0) > 0)).toBe(true)

    root.render(MatrixField as any, {label: "Matrix", value: [[1, 0], [0, 1]]})
    frame = renderer.flush()
    groups = [...host.querySelectorAll("[data-field-group]")]
    inputs = [...host.querySelectorAll("input")]
    expect(groups.map(group => frame.boxByNode.get(group)?.width)).toEqual([284, 284])
    expect(inputs.every(item => (frame.boxByNode.get(item)?.width ?? 0) > 0)).toBe(true)
    renderer.dispose()
    root.unmount()
  })
})
