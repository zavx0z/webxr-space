import {describe, expect, test} from "bun:test"
import {Event, type HTMLInputElement} from "@zavx0z/dom"
import {createDocumentRenderer} from "@zavx0z/renderer"
import {createRoot} from "@zavx0z/react"
import {isCompiledTemplate} from "@zavx0z/template/compiled"
import {createDocument} from "../document.fixture.ts"
import {SliderControl} from "./slider-control.tsx"

describe("compiled production SliderControl", () => {
  test("keeps range live properties and native pseudo geometry", () => {
    expect(isCompiledTemplate(SliderControl)).toBe(true)
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    const proposals: number[] = []
    root.render(SliderControl as any, {value: 0.5, min: 0, max: 1, step: 0.1, onInput: (value: number) => proposals.push(value)})
    const input = host.querySelector("input") as HTMLInputElement
    input.valueAsNumber = 0.7
    input.dispatchEvent(new Event("input", {bubbles: true}))
    expect(proposals[0]).toBeCloseTo(0.7, 12)
    const renderer = createDocumentRenderer({document, root: host, viewport: {width: 240, height: 80}})
    expect(renderer.flush().boxByNode.get(input)).toMatchObject({width: 180, height: 28})
    const cssText = (SliderControl as any).styleSheets.map((sheet: any) => sheet.cssText).join("\n")
    expect(cssText).toContain(":active")
    expect(cssText).not.toContain(".ui-")
    renderer.dispose()
    root.unmount()
  })
})
