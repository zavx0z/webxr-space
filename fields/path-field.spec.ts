import {describe, expect, test} from "bun:test"
import {Event, type HTMLInputElement} from "@zavx0z/dom"
import {createRoot} from "@zavx0z/react"
import {isCompiledTemplate} from "@zavx0z/template/compiled"
import {createDocument} from "../document.fixture.ts"
import {PathField} from "./path-field.tsx"

describe("compiled production PathField", () => {
  test("composes PathControl and reports direct path proposals", () => {
    expect(isCompiledTemplate(PathField)).toBe(true)
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    const values: string[] = []
    root.render(PathField as any, {id: "path", label: "Path", value: "/a", onChange: (value: string) => values.push(value)})
    const input = host.querySelector("input") as HTMLInputElement
    input.value = "/b"
    input.dispatchEvent(new Event("input", {bubbles: true}))
    expect(values).toEqual(["/b"])
    root.unmount()
  })
})
