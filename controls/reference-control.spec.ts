import {describe, expect, test} from "bun:test"
import type {HTMLButtonElement, Node} from "@zavx0z/dom"
import {createDocumentRenderer, type RenderFrame} from "@zavx0z/renderer"
import {createRoot} from "@zavx0z/react"
import {isCompiledTemplate} from "@zavx0z/template/compiled"
import {createDocument} from "../document.fixture.ts"
import {uiIcons} from "../icons.ts"
import {ReferenceControl} from "./reference-control.tsx"

describe("compiled production ReferenceControl", () => {
  test("keeps actions and semantic identities through controlled updates", () => {
    expect(isCompiledTemplate(ReferenceControl)).toBe(true)
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    const actions: string[] = []
    const onActivate = () => actions.push("activate")
    const onPick = () => actions.push("pick")
    const onClear = () => actions.push("clear")
    root.render(ReferenceControl as any, {value: {id: "mat", label: "Material"}, onActivate, onPick, onClear})
    const owner = host.querySelector("div")!
    const buttons = [...owner.querySelectorAll("button")] as HTMLButtonElement[]
    const images = buttons.map(button => button.querySelector("img"))
    expect(images.map(image => image?.getAttribute("src"))).toEqual([uiIcons.resource, uiIcons.picker, uiIcons.close])
    for (const button of buttons) button.click()
    expect(actions).toEqual(["activate", "pick", "clear"])
    root.render(ReferenceControl as any, {value: null, placeholder: "Not assigned", onPick, onClear})
    expect(host.querySelector("div")).toBe(owner)
    expect([...owner.querySelectorAll("button")]).toEqual(buttons)
    expect(buttons.map(button => button.querySelector("img"))).toEqual(images)
    root.unmount()
  })

  test("preserves geometry and removes nested emboss islands", () => {
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    root.render(ReferenceControl as any, {value: {id: "mat", label: "Material"}, onActivate() {}, onPick() {}, onClear() {}})
    const owner = host.querySelector("div")!
    const buttons = [...owner.querySelectorAll("button")]
    const renderer = createDocumentRenderer({document, root: host, viewport: {width: 320, height: 80}})
    let frame = renderer.flush()
    expect(frame.boxByNode.get(owner)).toMatchObject({width: 260, height: 28})
    expect(frame.boxByNode.get(buttons[0]!)).toMatchObject({width: 202, height: 26})
    expect(shadow(frame, owner)).toBeDefined()
    for (const button of buttons) expect(shadow(frame, button)).toBeUndefined()
    root.render(ReferenceControl as any, {value: {id: "mat", label: "Material"}, density: "compact", onActivate() {}, onPick() {}, onClear() {}})
    frame = renderer.flush()
    expect(frame.boxByNode.get(owner)).toMatchObject({width: 190, height: 24})
    expect(buttons.every(button => frame.boxByNode.get(button)?.height === 22)).toBe(true)
    renderer.dispose()
    root.unmount()
  })
})

function shadow(frame: RenderFrame, node: Node) {
  return frame.displayList.find(item => item.kind === "rect" && item.node === node && item.key === "shadow")
}
