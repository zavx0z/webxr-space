import {describe, expect, test} from "bun:test"
import {Event, type HTMLSelectElement} from "@zavx0z/dom"
import {createRoot} from "@zavx0z/react"
import {isCompiledTemplate} from "@zavx0z/template/compiled"
import {createDocument} from "../document.fixture.ts"
import {EnumField} from "./enum-field.tsx"

describe("compiled production EnumField", () => {
  test("maps value-keyed options into EnumControl", () => {
    expect(isCompiledTemplate(EnumField)).toBe(true)
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    const values: string[] = []
    root.render(EnumField as any, {id: "mode", label: "Mode", value: "a", options: [{value: "a", label: "Alpha"}, {value: "b", label: "Beta"}], onChange: (value: string) => values.push(value)})
    const select = host.querySelector("select") as HTMLSelectElement
    select.value = "b"
    select.dispatchEvent(new Event("change", {bubbles: true}))
    expect(values).toEqual(["b"])
    root.unmount()
  })
})
