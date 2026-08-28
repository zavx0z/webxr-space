import {describe, expect, test} from "bun:test"
import {Event, createDocument, type HTMLInputElement} from "@zavx0z/dom"
import {createRoot} from "@zavx0z/react"
import {isCompiledTemplate} from "@zavx0z/template/compiled"
import {MatrixInput, matrixInputCss} from "./matrix-input.tsx"
import {VectorInput, vectorInputCss} from "./vector-input.tsx"

describe("compiled vector and matrix compositions", () => {
  test("VectorInput is a ControlGroup composition with stable axis cells", () => {
    expect(isCompiledTemplate(VectorInput)).toBe(true)
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    const proposals: Array<readonly number[]> = []
    root.render(VectorInput as any, {
      value: [1, 2, 3],
      onInput: (value: readonly number[]) => proposals.push(value)
    })
    const x = host.querySelector('[data-control-key="X"]')!
    const input = x.querySelector("input") as HTMLInputElement
    input.value = "4"
    input.dispatchEvent(new Event("input", {bubbles: true}))
    expect(proposals).toEqual([[4, 2, 3]])

    root.render(VectorInput as any, {value: [4, 2, 3]})
    expect(host.querySelector('[data-control-key="X"]')).toBe(x)
    expect(x.querySelector("input")).toBe(input)
    expect(input.value).toBe("4")
    expect(host.querySelectorAll("label")).toHaveLength(3)
    expect(vectorInputCss).not.toContain(".ui-")
    root.unmount()
  })

  test("MatrixInput retains both keyed rows and nested cells", () => {
    expect(isCompiledTemplate(MatrixInput)).toBe(true)
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    const initial = [[1, 2], [3, 4]] as const
    const proposals: Array<readonly (readonly number[])[]> = []
    root.render(MatrixInput as any, {
      value: initial,
      onChange: (value: readonly (readonly number[])[]) => proposals.push(value)
    })
    const rows = [...host.querySelectorAll("div")].filter(element => element.querySelectorAll("label").length === 2)
    const row0 = rows[0]!
    const cell00 = row0.querySelector('[data-control-key="0"]')!
    const input00 = cell00.querySelector("input") as HTMLInputElement
    input00.value = "8"
    input00.dispatchEvent(new Event("change", {bubbles: true}))
    expect(proposals).toEqual([[[8, 2], [3, 4]]])

    root.render(MatrixInput as any, {value: [[8, 2], [3, 4]]})
    const nextRows = [...host.querySelectorAll("div")].filter(element => element.querySelectorAll("label").length === 2)
    expect(nextRows[0]).toBe(row0)
    expect(nextRows[0]!.querySelector('[data-control-key="0"]')).toBe(cell00)
    expect(input00.value).toBe("8")
    expect(matrixInputCss).not.toContain(".ui-")
    root.unmount()
  })
})
