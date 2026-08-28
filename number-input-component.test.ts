import {describe, expect, test} from "bun:test"
import {
  Event,
  KeyboardEvent,
  PointerEvent,
  createDocument,
  type HTMLInputElement
} from "@zavx0z/dom"
import {createDocumentRenderer} from "@zavx0z/renderer"
import {createRoot} from "@zavx0z/react"
import {isCompiledTemplate} from "@zavx0z/template/compiled"
import {buttonComponentCss} from "./button-component.tsx"
import {NumberInput, numberInputComponentCss} from "./number-input-component.tsx"
import {IntegerInput} from "./integer-input-component.tsx"

describe("compiled production NumberInput", () => {
  test("composes Button, keeps keyed identities and proposes controlled edits", () => {
    expect(isCompiledTemplate(NumberInput)).toBe(true)
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    const proposed: number[] = []
    root.render(NumberInput as any, {
      value: 1,
      min: 0,
      max: 2,
      softMin: 0.5,
      softMax: 1.5,
      step: 0.1,
      onInput: (value: number) => proposed.push(value)
    })
    const owner = host.querySelector("div")!
    const input = owner.querySelector("input") as HTMLInputElement
    const buttons = [...owner.querySelectorAll("button")] as import("@zavx0z/dom").HTMLButtonElement[]
    expect(owner.className).toBe("")
    expect(buttons).toHaveLength(2)
    expect(buttons.every(button => button.className === "")).toBe(true)

    buttons[0]!.click()
    buttons[1]!.click()
    input.valueAsNumber = 1.4
    input.dispatchEvent(new Event("input", {bubbles: true}))
    input.dispatchEvent(new PointerEvent("pointerdown", {clientX: 100, bubbles: true}))
    input.dispatchEvent(new PointerEvent("pointermove", {clientX: 120, shiftKey: true, bubbles: true}))
    input.dispatchEvent(new PointerEvent("pointermove", {clientX: 123, ctrlKey: true, bubbles: true}))
    input.dispatchEvent(new PointerEvent("pointerup", {clientX: 123, bubbles: true}))
    expect(proposed).toEqual([0.9, 1.1, 1.4, 1.05, 1.5])

    input.focus()
    input.dispatchEvent(new KeyboardEvent("keydown", {key: "Escape", bubbles: true, cancelable: true}))
    expect(proposed.at(-1)).toBe(1)

    root.render(NumberInput as any, {value: 1.25, min: 0, max: 2, step: 0.25})
    expect(host.querySelector("div")).toBe(owner)
    expect(owner.querySelector("input")).toBe(input)
    expect(owner.querySelectorAll("button")[0]).toBe(buttons[0])
    expect(owner.querySelectorAll("button")[1]).toBe(buttons[1])
    expect(input.valueAsNumber).toBe(1.25)
    root.unmount()
  })

  test("renders one joined 120x22 contour instead of emboss islands", () => {
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    root.render(NumberInput as any, {value: 1})
    const owner = host.querySelector("div")!
    const renderer = createDocumentRenderer({
      document,
      root: host,
      viewport: {width: 180, height: 60},
      styleSheets: [buttonComponentCss, numberInputComponentCss]
    })
    const frame = renderer.flush()
    expect(frame.boxByNode.get(owner)).toMatchObject({width: 120, height: 22})
    const buttons = [...owner.querySelectorAll("button")]
    for (const button of buttons) {
      const rect = frame.displayList.find(item =>
        item.kind === "rect" && item.node === button && item.key === "background"
      )
      expect(rect?.kind === "rect" ? rect.shadow : null).toBeNull()
    }
    renderer.dispose()
    root.unmount()
  })

  test("composes IntegerInput from NumberInput and rounds every proposal", () => {
    expect(isCompiledTemplate(IntegerInput)).toBe(true)
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    const proposed: number[] = []
    root.render(IntegerInput as any, {
      value: 4.6,
      step: 1,
      onInput: (value: number) => proposed.push(value)
    })
    const input = host.querySelector("input") as HTMLInputElement
    expect(input.valueAsNumber).toBe(5)
    input.valueAsNumber = 6.7
    input.dispatchEvent(new Event("input", {bubbles: true}))
    expect(proposed).toEqual([7])
    expect(root.stats().mounts).toBe(6)
    root.unmount()
  })
})
