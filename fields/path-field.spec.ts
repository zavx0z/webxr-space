import {describe, expect, test} from "bun:test"
import {Event, type HTMLButtonElement, type HTMLInputElement} from "@zavx0z/dom"
import {createDocumentRenderer} from "@zavx0z/renderer"
import {createRoot} from "@zavx0z/react"
import {isCompiledTemplate} from "@zavx0z/template/compiled"
import {createDocument} from "../document.fixture.ts"
import {PathFieldFixture} from "./path-field.fixture.tsx"
import {PathField} from "./path-field.tsx"

describe("compiled production PathField", () => {
  test("keeps joined text and browse interactions with optional label", () => {
    expect(isCompiledTemplate(PathField)).toBe(true)
    expect(isCompiledTemplate(PathFieldFixture)).toBe(true)
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    const values: string[] = []
    let browses = 0
    root.render(PathField as any, {value: "/out", onInput: (value: string) => values.push(value), onBrowse: () => { browses += 1 }})
    const input = host.querySelector("input") as HTMLInputElement
    const browse = host.querySelector("button") as HTMLButtonElement
    input.value = "/render"
    input.dispatchEvent(new Event("input", {bubbles: true}))
    browse.click()
    expect(values).toEqual(["/render"])
    expect(browses).toBe(1)
    const renderer = createDocumentRenderer({document, root: host, viewport: {width: 380, height: 80}})
    expect(renderer.flush().boxByNode.get(input)?.height).toBe(26)
    root.render(PathField as any, {label: "Path", value: "/render", readOnly: true, onBrowse: () => { browses += 1 }})
    expect(host.querySelector("input")).toBe(input)
    browse.click()
    expect(browses).toBe(1)
    renderer.dispose()
    root.render(PathFieldFixture as any, {})
    expect(host.textContent).toContain("Path")
    root.unmount()
  })
})
