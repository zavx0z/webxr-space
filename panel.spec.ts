import {describe, expect, test} from "bun:test"
import type {HTMLButtonElement} from "@zavx0z/dom"
import {createDocumentRenderer} from "@zavx0z/renderer"
import {createRoot} from "@zavx0z/react"
import {isCompiledTemplate} from "@zavx0z/template/compiled"
import {createDocument} from "./document.fixture.ts"
import {HiddenPanelFixture, PanelFixture} from "./panel.fixture.tsx"
import {Panel} from "./panel.tsx"

describe("compiled production Panel", () => {
  test("retains its header, actions and authored body through controlled disclosure", () => {
    expect(isCompiledTemplate(Panel)).toBe(true)
    expect(isCompiledTemplate(PanelFixture)).toBe(true)
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    root.render(PanelFixture as any, {})
    const panel = host.querySelector("[data-panel]")!
    const header = panel.querySelector("header")!
    const buttons = [...header.querySelectorAll("button")] as HTMLButtonElement[]
    const disclosure = buttons[0]!
    const action = buttons[1]!
    const icon = disclosure.querySelector("img")
    const body = document.getElementById(disclosure.getAttribute("aria-controls")!)!
    expect(body.textContent).toBe("Panel content")
    disclosure.click()
    expect(disclosure.getAttribute("aria-expanded")).toBe("false")
    expect(disclosure.querySelector("img")).toBe(icon)
    expect(body.hasAttribute("hidden")).toBe(true)
    expect(action.disabled).toBe(false)
    const renderer = createDocumentRenderer({document, root: host, viewport: {width: 320, height: 120}})
    expect(renderer.flush().boxByNode.get(header)?.height).toBe(26)
    renderer.dispose()
    root.unmount()
  })

  test("keeps native hidden separate from controlled expansion", () => {
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    root.render(HiddenPanelFixture as any, {})
    const panel = host.querySelector("[data-panel]")!
    expect(panel.hasAttribute("hidden")).toBe(true)
    root.unmount()
  })
})
