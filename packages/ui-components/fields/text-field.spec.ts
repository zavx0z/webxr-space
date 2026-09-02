import {describe, expect, test} from "bun:test"
import {Event, type HTMLInputElement} from "@zavx0z/dom"
import {createDocumentRenderer} from "@zavx0z/renderer"
import {createRoot} from "@zavx0z/react"
import {isCompiledTemplate} from "@zavx0z/template/compiled"
import {createDocument} from "../document.fixture.ts"
import {TextFieldFixture} from "./text-field.fixture.tsx"
import {TextField} from "./text-field.tsx"

describe("compiled production TextField", () => {
  test("keeps one controlled text-entry mechanism with an optional label", () => {
    expect(isCompiledTemplate(TextField)).toBe(true)
    expect(isCompiledTemplate(TextFieldFixture)).toBe(true)
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    const values: string[] = []
    root.render(TextField as any, {value: "Alpha", onInput: (value: string) => values.push(value)})
    const input = host.querySelector("input") as HTMLInputElement
    input.value = "Beta"
    input.dispatchEvent(new Event("input", {bubbles: true}))
    expect(values).toEqual(["Beta"])
    const renderer = createDocumentRenderer({document, root: host, viewport: {width: 240, height: 80}})
    expect(renderer.flush().boxByNode.get(input)).toMatchObject({width: 160, height: 22})
    root.render(TextField as any, {label: "Name", value: "Beta", readOnly: true})
    expect(host.querySelector("input")).toBe(input)
    expect(input.readOnly).toBe(true)
    expect(host.querySelector("span")?.textContent).toBe("Name")
    renderer.dispose()
    root.render(TextFieldFixture as any, {})
    expect(host.textContent).toContain("Name")
    root.unmount()
  })
})
