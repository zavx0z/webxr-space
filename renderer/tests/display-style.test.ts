import {createDocumentInteractionState} from "../src/pseudo-state.ts"
import {expect, test} from "bun:test"
import {createDocument, DisplayElement, acquireDocumentAuthorStyleSheetOwner} from "@zavx0z/dom"
import {readDisplayStyle} from "../src/display-style.ts"
import {createDocumentRenderer} from "../src/renderer.ts"

function fixture(css: string) {
  const document = createDocument()
  const display = document.createElement("display")
  document.append(display)
  const styles = acquireDocumentAuthorStyleSheetOwner(document)
  styles.replace([{id: "test", cssText: `display {${css}}`}])
  return {document, display, styles}
}

test("native Display derives physical size and finite pixels using the common CSS cascade", () => {
  const {document, display} = fixture("width: 320mm; height: 180mm; resolution: 203.2dpi; translate: 0 0 900mm; rotate: x 90deg")
  expect(display).toBeInstanceOf(DisplayElement)
  const style = readDisplayStyle(document, display)
  expect(style.pixels).toEqual({width: 2560, height: 1440})
  expect(style.viewport.width * style.worldUnitsPerPixel).toBeCloseTo(320)
  expect(style.viewport.height * style.worldUnitsPerPixel).toBeCloseTo(180)
  expect(style.transform.position.z).toBeCloseTo(900)
  expect(style.transform.quaternion.x).toBeCloseTo(Math.SQRT1_2)
})

test("density changes pixels without changing layout, and physical units also work for UI children", () => {
  const {document, display, styles} = fixture("width: 254mm; height: 127mm; resolution: 10dpi; display: flex")
  const child = document.createElement("div")
  child.setAttribute("style", "width: 25.4mm; height: 1in; flex-shrink: 0")
  display.append(child)
  const before = readDisplayStyle(document, display)
  expect(before.pixels).toEqual({width: 100, height: 50})
  const renderer = createDocumentRenderer({document, root: display, viewport: before.viewport})
  const box = renderer.flush().boxByNode.get(child)!
  expect(box.width).toBeCloseTo(96)
  expect(box.height).toBeCloseTo(96)
  styles.replace([{id: "test", cssText: "display {width: 254mm; height: 127mm; resolution: 2dppx; display: flex}"}])
  const after = readDisplayStyle(document, display)
  expect(after.pixels).toEqual({width: 1920, height: 960})
  expect(after.viewport).toEqual(before.viewport)
  expect(renderer.flush().boxByNode.get(child)!.width).toBeCloseTo(box.width)
  renderer.dispose()
})

test("theme variables and caller style resolve through one cascade, with independent axis scale", () => {
  const {document, display} = fixture("--density: 80dpcm; width: calc(10cm + 220mm); height: 180mm; resolution: var(--density); scale: 2 3 1")
  const style = readDisplayStyle(document, display)
  expect(style.pixels).toEqual({width: 2560, height: 1440})
  expect(style.transform.scale).toEqual({x: 2, y: 3, z: 1})
  display.setAttribute("style", "resolution: 96dpi; translate: 10mm 20mm 30mm")
  expect(readDisplayStyle(document, display).resolution).toBe(96)
  const position = readDisplayStyle(document, display).transform.position
  expect(position.x).toBeCloseTo(10)
  expect(position.y).toBeCloseTo(20)
  expect(position.z).toBeCloseTo(30)
})


test("origin keyword order identifies the same pivot, while invalid physical contracts fail explicitly", () => {
  const {document, display} = fixture("width: 100mm; height: 50mm; scale: 2; transform-origin: top left")
  const first = readDisplayStyle(document, display)
  display.setAttribute("style", "transform-origin: left top")
  expect(readDisplayStyle(document, display)).toEqual(first)
  display.setAttribute("style", "box-sizing: content-box")
  expect(() => readDisplayStyle(document, display)).toThrow("border-box")
  display.setAttribute("style", "transform: translateX(10px)")
  expect(() => readDisplayStyle(document, display)).toThrow("individual translate")
})


test("spatial style follows the same hover state as UI paint", () => {
  const {document, display, styles} = fixture("width: 100mm; height: 50mm")
  styles.replace([{id: "test", cssText: "display {width: 100mm; height: 50mm} display:hover {translate: 10mm 0 0; resolution: 2dppx}"}])
  const interaction = createDocumentInteractionState(document)
  expect(readDisplayStyle(document, display, interaction).resolution).toBe(96)
  interaction.setHoveredElement(display)
  expect(readDisplayStyle(document, display, interaction).resolution).toBe(192)
  expect(readDisplayStyle(document, display, interaction).transform.position.x).toBeCloseTo(10)
})
