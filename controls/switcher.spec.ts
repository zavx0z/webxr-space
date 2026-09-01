import {describe, expect, test} from "bun:test"
import type {HTMLButtonElement} from "@zavx0z/dom"
import {createDocumentRenderer} from "@zavx0z/renderer"
import {createRoot} from "@zavx0z/react"
import {isCompiledTemplate} from "@zavx0z/template/compiled"
import {createDocument} from "../document.fixture.ts"
import {Switcher} from "./switcher.tsx"

describe("compiled production Switcher", () => {
  test("uses one semantic switch button and retains its translated thumb", () => {
    expect(isCompiledTemplate(Switcher)).toBe(true)
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    const proposed: boolean[] = []
    root.render(Switcher as any, {
      checked: false,
      onChange: (checked: boolean) => proposed.push(checked)
    })
    const button = host.querySelector("button") as HTMLButtonElement
    const thumb = button.querySelector("span")!
    expect(button.className).toBe("")
    expect(thumb.className).toBe("")
    button.click()
    expect(proposed).toEqual([true])
    expect(button.getAttribute("role")).toBe("switch")
    expect(button.getAttribute("aria-checked")).toBe("false")

    root.render(Switcher as any, {checked: true})
    expect(host.querySelector("button")).toBe(button)
    expect(button.querySelector("span")).toBe(thumb)
    expect(button.getAttribute("aria-checked")).toBe("true")
    const renderer = createDocumentRenderer({document, root: host, viewport: {width: 80, height: 50}})
    const frame = renderer.flush()
    expect(frame.boxByNode.get(button)).toMatchObject({width: 32, height: 18})
    expect(frame.boxByNode.get(thumb)?.transform.translateX).toBe(14)
    renderer.dispose()
    root.unmount()
  })

  test("uses a class-free owner sheet", () => {
    const cssText = (Switcher as any).styleSheets.map((sheet: any) => sheet.cssText).join("\n")
    expect(cssText).not.toContain(".ui-")
  })
})
