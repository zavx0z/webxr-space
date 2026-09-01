import {describe, expect, test} from "bun:test"
import {Event, type HTMLInputElement} from "@zavx0z/dom"
import {createRoot} from "@zavx0z/react"
import {isCompiledTemplate} from "@zavx0z/template/compiled"
import {createDocument} from "../document.fixture.ts"
import {MatrixControl} from "./matrix-control.tsx"

describe("compiled production MatrixControl", () => {
  test("retains both keyed rows and nested cells", () => {
    expect(isCompiledTemplate(MatrixControl)).toBe(true)
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    const proposals: Array<readonly (readonly number[])[]> = []
    root.render(MatrixControl as any, {value: [[1, 2], [3, 4]], onChange: (value: readonly (readonly number[])[]) => proposals.push(value)})
    const rows = [...host.querySelectorAll("div")].filter(element => element.querySelectorAll("label").length === 2)
    const row0 = rows[0]!
    const cell00 = row0.querySelector('[data-control-key="0"]')!
    const input00 = cell00.querySelector("input") as HTMLInputElement
    input00.value = "8"
    input00.dispatchEvent(new Event("change", {bubbles: true}))
    expect(proposals).toEqual([[[8, 2], [3, 4]]])
    root.render(MatrixControl as any, {value: [[8, 2], [3, 4]]})
    const nextRows = [...host.querySelectorAll("div")].filter(element => element.querySelectorAll("label").length === 2)
    expect(nextRows[0]).toBe(row0)
    expect(nextRows[0]!.querySelector('[data-control-key="0"]')).toBe(cell00)
    expect(input00.value).toBe("8")
    root.unmount()
  })
})
