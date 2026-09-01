import {describe, expect, test} from "bun:test"
import {createDocumentRenderer} from "@zavx0z/renderer"
import {createRoot} from "@zavx0z/react"
import {isCompiledTemplate} from "@zavx0z/template/compiled"
import {createDocument} from "../document.fixture.ts"
import {FieldGroup} from "./field-group.tsx"
import {FieldGroupFixture} from "./field-group.fixture.tsx"

describe("compiled production FieldGroup", () => {
  test("owns one joined contour and retains authored keyed Fields", () => {
    expect(isCompiledTemplate(FieldGroup)).toBe(true)
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    root.render(FieldGroupFixture as any, {})
    const group = host.querySelector("[data-field-group]")!
    const inputs = [...group.querySelectorAll("input")]
    const renderer = createDocumentRenderer({document, root: host, viewport: {width: 300, height: 80}})
    expect(renderer.flush().boxByNode.get(group)?.height).toBe(28)
    expect(group.hasAttribute("data-disabled")).toBe(false)
    root.render(FieldGroupFixture as any, {reverse: true})
    const reordered = [...group.querySelectorAll("input")]
    expect(reordered).toEqual([inputs[1]!, inputs[0]!])
    renderer.dispose()
    root.unmount()
  })
})
