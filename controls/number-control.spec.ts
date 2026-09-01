import {describe, expect, test} from "bun:test"
import {
  Event,
  KeyboardEvent,
  type HTMLInputElement
} from "@zavx0z/dom"
import {
  createDocumentInteractionController,
  createDocumentRenderer
} from "@zavx0z/renderer"
import {createRoot} from "@zavx0z/react"
import {isCompiledTemplate} from "@zavx0z/template/compiled"
import {
  NumberControl,
  numberControlFillPercentage,
  normalizeNumberControlValue,
  resolveNumberControlSoftRange,
  scrubNumberControlValue,
  snapLinearNumberControlValue,
  stepNumberControlValue
} from "./number-control.tsx"
import {createDocument} from "../document.fixture.ts"

describe("compiled production NumberControl", () => {
  test("keeps one continuous scalar input identity and proposes controlled edits", () => {
    expect(isCompiledTemplate(NumberControl)).toBe(true)
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    const proposed: number[] = []
    const committed: number[] = []
    root.render(NumberControl as any, {
      value: 1,
      min: 0,
      max: 2,
      softMin: 0.5,
      softMax: 1.5,
      step: 0.1,
      onInput: (value: number) => proposed.push(value),
      onChange: (value: number) => committed.push(value)
    })
    const owner = host.querySelector("div")!
    const input = owner.querySelector("input") as HTMLInputElement
    const fill = owner.querySelector("[data-number-fill]")!
    const edgeZones = [...owner.querySelectorAll("button")]
    expect(owner.className).toBe("")
    expect(edgeZones.map(button => button.getAttribute("aria-label"))).toEqual(["Decrease", "Increase"])
    expect(fill.getAttribute("style")).toContain("width: 50%")

    input.valueAsNumber = 1.4
    input.dispatchEvent(new Event("input", {bubbles: true}))
    expect(proposed).toEqual([1.4])
    expect(committed).toEqual([])

    input.focus()
    input.dispatchEvent(new KeyboardEvent("keydown", {key: "Escape", bubbles: true, cancelable: true}))
    expect(proposed.at(-1)).toBe(1)

    root.render(NumberControl as any, {value: 1.25, min: 0, max: 2, step: 0.25})
    expect(host.querySelector("div")).toBe(owner)
    expect(owner.querySelector("input")).toBe(input)
    expect(owner.querySelector("[data-number-fill]")).toBe(fill)
    expect(owner.querySelectorAll("button")[0]).toBe(edgeZones[0])
    expect(owner.querySelectorAll("button")[1]).toBe(edgeZones[1])
    expect(input.valueAsNumber).toBe(1.25)
    expect(fill.getAttribute("style")).toContain("width: 62.5%")
    root.unmount()
  })

  test("keeps pointer scrub routed to the semantic input outside its hit box", () => {
    const document = createDocument()
    const host = document.createElement("main")
    host.setAttribute("style", "display:flex; width:260px; height:30px")
    document.appendChild(host)
    const root = createRoot(host)
    const proposed: number[] = []
    const committed: number[] = []
    root.render(NumberControl as any, {
      value: 1,
      min: 0,
      max: 2,
      softMin: 0,
      softMax: 2,
      step: 0.1,
      onInput: (value: number) => proposed.push(value),
      onChange: (value: number) => committed.push(value)
    })
    const outside = document.createElement("button")
    outside.setAttribute("style", "width:100px; height:22px")
    host.appendChild(outside)
    const input = host.querySelector("input")!
    const renderer = createDocumentRenderer({document, root: host, viewport: {width: 260, height: 30}})
    const frame = renderer.flush()
    const inputBox = frame.boxByNode.get(input)!
    const outsideBox = frame.boxByNode.get(outside)!
    const interaction = createDocumentInteractionController({document})
    const captureEvents: string[] = []
    input.addEventListener("gotpointercapture", () => captureEvents.push("got"))
    input.addEventListener("lostpointercapture", () => captureEvents.push("lost"))
    interaction.pointerDown(frame, {
      clientX: inputBox.x + inputBox.width / 2,
      clientY: inputBox.y + inputBox.height / 2,
      pointerId: 12
    })
    expect(interaction.pointerMove(frame, {
      clientX: outsideBox.x + outsideBox.width / 2,
      clientY: outsideBox.y + outsideBox.height / 2,
      pointerId: 12
    })).toBe(input)
    expect(interaction.pointerUp(frame, {
      clientX: outsideBox.x + outsideBox.width / 2,
      clientY: outsideBox.y + outsideBox.height / 2,
      pointerId: 12
    })).toBe(input)
    expect(proposed.length).toBeGreaterThan(0)
    expect(committed).toEqual([proposed.at(-1)!])
    expect(captureEvents).toEqual(["got", "lost"])
    expect(input.hasPointerCapture(12)).toBe(false)

    interaction.pointerDown(frame, {
      clientX: inputBox.x + 2,
      clientY: inputBox.y + inputBox.height / 2,
      pointerId: 13
    })
    interaction.pointerUp(frame, {
      clientX: inputBox.x + 2,
      clientY: inputBox.y + inputBox.height / 2,
      pointerId: 13
    })
    expect(proposed.at(-1)).toBe(0.9)
    expect(committed.at(-1)).toBe(0.9)
    expect(captureEvents).toEqual(["got", "lost"])
    interaction.dispose()
    renderer.dispose()
    root.unmount()
  })

  test("keeps hard normalization separate from pointer-only soft bounds", () => {
    const options = {min: 0, max: 20, softMin: 0, softMax: 10, step: 0.1} as const
    expect(normalizeNumberControlValue(15, options)).toBe(15)
    expect(resolveNumberControlSoftRange(5, options)).toEqual({min: 0, max: 10})
    expect(resolveNumberControlSoftRange(50, {step: 0.01})).toEqual({min: -50, max: 150})
    expect(resolveNumberControlSoftRange(50, {min: 0, max: 100, softMin: 80, softMax: 20})).toEqual({min: 20, max: 80})
    expect(stepNumberControlValue(15, -1, options)).toBe(14.9)
    expect(stepNumberControlValue(15, 1, options)).toBe(10)
    expect(numberControlFillPercentage(5, 0, 10)).toBe(50)
    expect(numberControlFillPercentage(-5, 0, 10)).toBe(0)
    expect(numberControlFillPercentage(15, 0, 10)).toBe(100)
    expect(numberControlFillPercentage(5, undefined, 10)).toBeNull()
    expect(numberControlFillPercentage(5, 10, 10)).toBeNull()
  })

  test("maps frozen soft-range scrub through Shift precision and Ctrl snap", () => {
    const options = {min: 0, max: 20, softMin: 0, softMax: 10, step: 0.1} as const
    expect(scrubNumberControlValue(5, 50, 50, options)).toBe(6)
    expect(scrubNumberControlValue(5, 50, 50, options, true)).toBe(5.1)
    expect(scrubNumberControlValue(9, 100, 100, options)).toBe(10)
    expect(snapLinearNumberControlValue(0.44, {min: 0, max: 1})).toBe(0.4)
    expect(snapLinearNumberControlValue(6.34, {min: 0, max: 10}, true)).toBe(6.3)
    expect(snapLinearNumberControlValue(-0.05, {min: -1, max: 1})).toBe(-0.1)
  })

  test("renders one continuous 120x22 scalar contour", () => {
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    root.render(NumberControl as any, {value: 1, min: 0, max: 2})
    const owner = host.querySelector("div")!
    const renderer = createDocumentRenderer({
      document,
      root: host,
      viewport: {width: 180, height: 60}
    })
    const frame = renderer.flush()
    expect(frame.boxByNode.get(owner)).toMatchObject({width: 120, height: 22})
    const fill = owner.querySelector("[data-number-fill]")!
    expect(frame.boxByNode.get(fill)?.width).toBeCloseTo(59, 6)
    const edgeZones = [...owner.querySelectorAll("button")]
    expect(edgeZones).toHaveLength(2)
    expect(edgeZones.map(button => frame.boxByNode.get(button)?.width)).toEqual([16, 16])
    renderer.dispose()
    root.unmount()
  })

})
