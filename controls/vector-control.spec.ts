import {describe, expect, test} from "bun:test"
import {Event, type HTMLInputElement} from "@zavx0z/dom"
import {createRoot} from "@zavx0z/react"
import {isCompiledTemplate} from "@zavx0z/template/compiled"
import {createDocument} from "../document.fixture.ts"
import {VectorControl} from "./vector-control.tsx"

describe("compiled production VectorControl", () => {
  test("VectorControl is a ControlGroup composition with stable axis cells", () => {
    expect(isCompiledTemplate(VectorControl)).toBe(true)
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    const proposals: Array<readonly number[]> = []
    root.render(VectorControl as any, {
      value: [1, 2, 3],
      onInput: (value: readonly number[]) => proposals.push(value)
    })
    const x = host.querySelector('[data-control-key="X"]')!
    const input = x.querySelector("input") as HTMLInputElement
    input.value = "4"
    input.dispatchEvent(new Event("input", {bubbles: true}))
    expect(proposals).toEqual([[4, 2, 3]])

    root.render(VectorControl as any, {value: [4, 2, 3]})
    expect(host.querySelector('[data-control-key="X"]')).toBe(x)
    expect(x.querySelector("input")).toBe(input)
    expect(input.value).toBe("4")
    expect(host.querySelectorAll("label")).toHaveLength(3)
    root.unmount()
  })

})
