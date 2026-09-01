import {describe, expect, test} from "bun:test"
import {createDocumentRenderer} from "@zavx0z/renderer"
import {createRoot} from "@zavx0z/react"
import {isCompiledTemplate} from "@zavx0z/template/compiled"
import {createDocument} from "../document.fixture.ts"
import {ReadonlyControl} from "./readonly-control.tsx"

describe("compiled production ReadonlyControl", () => {
  test("retains its passive value and caller-owned style", () => {
    expect(isCompiledTemplate(ReadonlyControl)).toBe(true)
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    root.render(ReadonlyControl as any, {value: "Ready", style: "width: 180px"})
    const control = host.querySelector("div")!
    expect(control.textContent).toBe("Ready")
    expect(control.getAttribute("style")).toBe("width: 180px")
    const renderer = createDocumentRenderer({document, root: host, viewport: {width: 240, height: 80}})
    expect(renderer.flush().boxByNode.get(control)).toMatchObject({width: 180, height: 28})
    renderer.dispose()
    root.unmount()
  })
})
