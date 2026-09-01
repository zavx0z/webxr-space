import {describe, expect, test} from "bun:test"
import {createDocumentRenderer} from "@zavx0z/renderer"
import {createRoot} from "@zavx0z/react"
import {isCompiledTemplate} from "@zavx0z/template/compiled"
import {createDocument} from "./document.fixture.ts"
import {DividerFixture} from "./divider.fixture.tsx"
import {Divider} from "./divider.tsx"

describe("compiled production Divider", () => {
  test("keeps exact inset geometry through the adjacent consumer fixture", () => {
    expect(isCompiledTemplate(Divider)).toBe(true)
    expect(isCompiledTemplate(DividerFixture)).toBe(true)
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    root.render(DividerFixture as any, {variant: "inset", title: "Section"})
    const owner = host.querySelector("hr")!

    const renderer = createDocumentRenderer({document, root: host, viewport: {width: 200, height: 60}})
    expect(renderer.flush().boxByNode.get(owner)).toMatchObject({height: 1, margin: {left: 16}})

    root.render(DividerFixture as any, {variant: "middle"})
    expect(host.querySelector("hr")).toBe(owner)
    expect(owner.getAttribute("data-variant")).toBe("middle")
    expect(owner.className).toBe("")
    renderer.dispose()
    root.unmount()
  })
})
