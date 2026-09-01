import {describe, expect, test} from "bun:test"
import {createDocumentRenderer} from "@zavx0z/renderer"
import {createRoot} from "@zavx0z/react"
import {isCompiledTemplate} from "@zavx0z/template/compiled"
import {StatusBar, statusBarText} from "./status-bar.tsx"
import {createDocument} from "./document.fixture.ts"

describe("compiled production StatusBar", () => {
  test("retains keyed status items and the exact passive lower-chrome contour", () => {
    expect(isCompiledTemplate(StatusBar)).toBe(true)
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    const end = [
      {id: "vertices", text: "Verts:8"},
      {id: "faces", text: "Faces:6"},
      {id: "version", text: "5.2.0", highlighted: true}
    ]
    root.render(StatusBar as any, {start: [{id: "mode", text: "Ready"}], end})
    const owner = host.querySelector("footer")!
    const version = host.querySelector('[data-status-item="version"]')!
    const vertices = host.querySelector('[data-status-item="vertices"]')!
    expect(statusBarText(end)).toBe("Verts:8 | Faces:6 | 5.2.0")
    expect(owner.getAttribute("role")).toBe("status")
    expect(version.getAttribute("data-highlighted")).toBe("true")

    root.render(StatusBar as any, {end: [end[2]!, end[0]!, end[1]!]})
    expect(host.querySelector('[data-status-item="version"]')).toBe(version)
    expect(host.querySelector('[data-status-item="vertices"]')).toBe(vertices)
    expect([...host.querySelectorAll("[data-status-item]")].map(item => item.getAttribute("data-status-item")))
      .toEqual(["version", "vertices", "faces"])

    const renderer = createDocumentRenderer({document, root: host, viewport: {width: 500, height: 80}})
    expect(renderer.flush().boxByNode.get(owner)).toMatchObject({width: 500, height: 24})
    expect(owner.className).toBe("")
    renderer.dispose()
    root.unmount()
  })
})
