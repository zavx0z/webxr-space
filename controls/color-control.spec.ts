import {describe, expect, test} from "bun:test"
import {
  Event,
  getPopoverVisibilityState,
  type Element,
  type HTMLButtonElement,
  type HTMLElement,
  type HTMLInputElement,
  type ToggleEvent
} from "@zavx0z/dom"
import {createDocumentRenderer, type RectDisplayItem} from "@zavx0z/renderer"
import {createRoot} from "@zavx0z/react"
import {isCompiledTemplate} from "@zavx0z/template/compiled"
import {
  ColorControl,
  colorControlHsvaToValue,
  colorControlValueToHsva,
  formatColorControlValue,
  normalizeColorControlValue,
  parseColorControlValue,
  type ColorControlValue
} from "./color-control.tsx"
import {createDocument} from "../document.fixture.ts"

describe("compiled production ColorControl", () => {
  test("composes Button, TextControl and SliderControl with retained channel identities", () => {
    expect(isCompiledTemplate(ColorControl)).toBe(true)
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    const proposals: ColorControlValue[] = []
    const value = {r: 0.1, g: 0.2, b: 0.3, a: 1}
    root.render(ColorControl as any, {
      value,
      presentation: "open",
      onInput: (next: ColorControlValue) => proposals.push(next)
    })
    expect((host.querySelector('[aria-label="Color editor"]') as HTMLElement)
      [getPopoverVisibilityState]()).toBe("showing")
    const valueChannel = host.querySelector('[data-color-channel="v"]')!
    const number = valueChannel.querySelector('input[type="number"]') as HTMLInputElement
    const range = valueChannel.querySelector('input[type="range"]') as HTMLInputElement
    const hsva = colorControlValueToHsva(value)
    number.value = "0.4"
    number.dispatchEvent(new Event("input", {bubbles: true}))
    range.valueAsNumber = 0.6
    range.dispatchEvent(new Event("input", {bubbles: true}))
    expect(proposals[0]).toEqual(colorControlHsvaToValue({...hsva, v: 0.4}))
    expect(proposals[1]).toEqual(colorControlHsvaToValue({...hsva, v: 0.6}))

    root.render(ColorControl as any, {value: {...value, b: 0.6}, presentation: "expanded"})
    expect(host.querySelector('[data-color-channel="v"]')).toBe(valueChannel)
    expect(valueChannel.querySelector('input[type="number"]')).toBe(number)
    expect(valueChannel.querySelector('input[type="range"]')).toBe(range)
    expect(number.valueAsNumber).toBeCloseTo(0.6, 12)
    expect(host.querySelectorAll('[aria-hidden="true"] span')).toHaveLength(32)
    expect(host.querySelector("fieldset")!.className).toBe("")
    root.unmount()
  })

  test("owns immutable RGBA, HSVA and exact RGB(A) hex conversion", () => {
    expect(normalizeColorControlValue({r: 1.2, g: -1, b: 0.5, a: 0.25})).toEqual({r: 1, g: 0, b: 0.5, a: 0.25})
    const exact = {r: 51 / 255, g: 102 / 255, b: 153 / 255, a: 128 / 255}
    expect(formatColorControlValue(exact)).toBe("#33669980")
    expect(formatColorControlValue(exact, false)).toBe("#336699")
    expect(parseColorControlValue("#33669980")).toEqual(exact)
    expect(parseColorControlValue("336699")).toEqual({...exact, a: 1})
    expect(parseColorControlValue("#123")).toBeNull()
    const rgba = Object.freeze({r: 0.2, g: 0.4, b: 0.8, a: 0.35})
    const hsva = colorControlValueToHsva(rgba)
    const roundTrip = colorControlHsvaToValue(hsva)
    expect(Object.isFrozen(hsva)).toBe(true)
    expect(Object.isFrozen(roundTrip)).toBe(true)
    expect(roundTrip.r).toBeCloseTo(rgba.r)
    expect(roundTrip.g).toBeCloseTo(rgba.g)
    expect(roundTrip.b).toBeCloseTo(rgba.b)
    expect(roundTrip.a).toBe(rgba.a)
  })

  test("publishes valid hex edits and ignores incomplete text", () => {
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    const proposals: ColorControlValue[] = []
    root.render(ColorControl as any, {
      value: {r: 0, g: 0, b: 0, a: 1},
      presentation: "open",
      onInput: (value: ColorControlValue) => proposals.push(value)
    })
    const hex = host.querySelector('[aria-label="Hex color"]') as HTMLInputElement
    hex.value = "#33669980"
    hex.dispatchEvent(new Event("input", {bubbles: true}))
    hex.value = "#336"
    hex.dispatchEvent(new Event("input", {bubbles: true}))
    expect(proposals).toEqual([parseColorControlValue("#33669980")!])
    root.unmount()
  })

  test("keeps the controlled open proposal and exact compact owner width", () => {
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    const opens: boolean[] = []
    root.render(ColorControl as any, {
      value: {r: 1, g: 0, b: 0, a: 1},
      presentation: "closed",
      onOpenChange: (open: boolean) => opens.push(open)
    })
    const fieldset = host.querySelector("fieldset")!
    const trigger = host.querySelector("button") as HTMLButtonElement
    trigger.click()
    expect(opens).toEqual([true])
    expect(trigger.getAttribute("aria-expanded")).toBe("false")
    const renderer = createDocumentRenderer({
      document,
      root: host,
      viewport: {width: 340, height: 280}
    })
    expect(renderer.flush().boxByNode.get(fieldset)?.width).toBe(280)
    renderer.dispose()
    root.unmount()
  })

  test("keeps the flexible swatch and fixed Hex field inside the exact 280px editor", () => {
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    root.render(ColorControl as any, {
      value: {r: 0.2, g: 0.4, b: 0.8, a: 0.5},
      presentation: "open"
    })
    const editor = host.querySelector('[aria-label="Color editor"]') as HTMLElement
    const swatch = editor.querySelector("[data-color-swatch]")!
    const hex = editor.querySelector('[aria-label="Hex color"]') as HTMLInputElement
    const renderer = createDocumentRenderer({
      document,
      root: host,
      viewport: {width: 340, height: 320}
    })
    const frame = renderer.flush()
    const editorBox = frame.boxByNode.get(editor)!
    const swatchBox = frame.boxByNode.get(swatch)!
    const hexBox = frame.boxByNode.get(hex)!
    const contentRight = editorBox.contentX + editorBox.contentWidth
    expect(editorBox.width).toBe(280)
    expect(swatchBox.x).toBeGreaterThanOrEqual(editorBox.contentX)
    expect(swatchBox.x + swatchBox.width).toBeLessThanOrEqual(hexBox.x)
    expect(hexBox.x + hexBox.width).toBeLessThanOrEqual(contentRight)
    expect(hexBox.width).toBe(92)
    renderer.dispose()
    root.unmount()
  })

  test("anchors open outside flow and reports native dismissals with exact focus return", async () => {
    const document = createDocument()
    const surface = document.createElement("section")
    const host = document.createElement("main")
    const outside = document.createElement("button")
    document.appendChild(surface)
    surface.append(host, outside)
    surface.setAttribute("style", "display:flex; flex-direction:column; width:420px; height:420px")
    outside.setAttribute("style", "width:80px; height:22px")
    const root = createRoot(host)
    const opens: boolean[] = []
    const value = {r: 0.2, g: 0.55, b: 0.8, a: 1}
    const props = {
      value,
      onOpenChange: (open: boolean) => opens.push(open)
    }
    root.render(ColorControl as any, {...props, presentation: "closed"})
    const fieldset = host.querySelector("fieldset")!
    const trigger = host.querySelector("button") as HTMLButtonElement
    const editor = host.querySelector('[aria-label="Color editor"]') as HTMLElement
    expect(editor.popover).toBe("auto")
    expect(editor[getPopoverVisibilityState]()).toBe("hidden")

    const renderer = createDocumentRenderer({
      document,
      root: surface,
      viewport: {width: 420, height: 420}
    })
    const closed = renderer.flush()
    const closedHeight = closed.boxByNode.get(fieldset)?.height
    const openingSources: (Element | null)[] = []
    editor.addEventListener("beforetoggle", event => {
      const toggle = event as ToggleEvent
      if (toggle.newState === "open") openingSources.push(toggle.source)
    })
    trigger.focus()
    root.render(ColorControl as any, {...props, presentation: "open"})
    expect(editor[getPopoverVisibilityState]()).toBe("showing")
    expect(openingSources).toEqual([trigger])
    const opened = renderer.flush()
    expect(opened.boxByNode.get(fieldset)?.height).toBe(closedHeight)
    expect(opened.boxByNode.get(editor)).toMatchObject({
      x: opened.boxByNode.get(trigger)?.x,
      y: (opened.boxByNode.get(trigger)?.y ?? 0) +
        (opened.boxByNode.get(trigger)?.height ?? 0) + 4,
      width: 280
    })
    await nextTask()

    const hex = editor.querySelector('[aria-label="Hex color"]') as HTMLInputElement
    hex.focus()
    expect(document.lightDismissPopovers(outside)).toBe(true)
    expect(editor[getPopoverVisibilityState]()).toBe("hidden")
    expect(document.activeElement).toBe(trigger)
    await nextTask()
    expect(opens).toEqual([false])

    root.render(ColorControl as any, {...props, presentation: "closed"})
    root.render(ColorControl as any, {...props, presentation: "open"})
    await nextTask()
    hex.focus()
    expect(document.dismissTopmostAutoPopover()).toBe(true)
    expect(editor[getPopoverVisibilityState]()).toBe("hidden")
    expect(document.activeElement).toBe(trigger)
    await nextTask()
    expect(opens).toEqual([false, false])

    root.render(ColorControl as any, {...props, presentation: "expanded"})
    const expanded = renderer.flush()
    expect(editor.popover).toBeNull()
    expect(expanded.boxByNode.get(fieldset)?.height).toBeGreaterThan(closedHeight ?? 0)
    expect(expanded.boxByNode.has(editor)).toBe(true)
    renderer.dispose()
    root.unmount()
  })

  test("projects checker theme channels as valid exact display colors", async () => {
    const source = await Bun.file(new URL("./color-control.tsx", import.meta.url)).text()
    expect(source).toContain("background: rgb(var(--surface-550))")
    expect(source).toContain("background: rgb(var(--surface-750))")
    expect(source).not.toContain("background: var(--surface-550)")
    expect(source).not.toContain("background: var(--surface-750)")

    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    root.render(ColorControl as any, {
      value: {r: 0.2, g: 0.4, b: 0.8, a: 0.5},
      presentation: "open"
    })
    const cells = Array.from(host.querySelectorAll('[aria-hidden="true"] span'))
    const light = cells.find(cell => !cell.hasAttribute("data-dark"))!
    const dark = cells.find(cell => cell.getAttribute("data-dark") === "true")!
    const renderer = createDocumentRenderer({
      document,
      root: host,
      viewport: {width: 340, height: 320}
    })
    const frame = renderer.flush()
    expect(background(frame, light).color).toBe("rgb(89 89 89)")
    expect(background(frame, dark).color).toBe("rgb(48 48 48)")
    renderer.dispose()
    root.unmount()
  })
})

function nextTask(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0))
}

function background(
  frame: import("@zavx0z/renderer").RenderFrame,
  element: Element
): RectDisplayItem {
  const item = frame.displayList.find((candidate): candidate is RectDisplayItem =>
    candidate.kind === "rect" && candidate.node === element && candidate.key === "background"
  )
  if (!item) throw new Error("Color checker background is missing")
  return item
}
