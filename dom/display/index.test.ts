import {expect, test} from "bun:test"
import {createDocument, UIEvent} from "../src/index.ts"
import {DisplayElement, publishDisplayMetrics} from "./index.ts"

test("display is native without Space registration and publishes only changed committed dimensions", async () => {
  const document = createDocument()
  const display = document.createElement("display")
  expect(display).toBeInstanceOf(DisplayElement)
  document.append(display)
  let events = 0
  display.addEventListener("resize", event => {
    expect(event).toBeInstanceOf(UIEvent)
    expect(event.target).toBe(display)
    events++
  })
  const initial = {width: 960, height: 480, pixelWidth: 960, pixelHeight: 480, dpi: 96}
  publishDisplayMetrics(display, initial)
  publishDisplayMetrics(display, {...initial})
  await Promise.resolve()
  expect(events).toBe(1)
  publishDisplayMetrics(display, {...initial, pixelWidth: 1920, pixelHeight: 960, dpi: 192})
  await Promise.resolve()
  expect(events).toBe(2)
  expect(display.viewport).toEqual({width: 960, height: 480})
  expect(display.pixelWidth).toBe(1920)
  publishDisplayMetrics(display, initial)
  display.remove()
  await Promise.resolve()
  expect(events).toBe(2)
})


test("dpi reflects a numeric attribute, defaults to 96, and rejects invalid values", () => {
  const element = createDocument().createElement("display")
  expect(element.dpi).toBe(96)
  element.dpi = 6.35
  expect(element.getAttribute("dpi")).toBe("6.35")
  element.setAttribute("dpi", "192")
  expect(element.dpi).toBe(192)
  for (const value of [0, -1, NaN, Infinity]) {
    expect(() => { element.dpi = value }).toThrow(RangeError)
    expect(element.dpi).toBe(192)
  }
  element.removeAttribute("dpi")
  expect(element.dpi).toBe(96)
  element.setAttribute("dpi", "96dpi")
  expect(() => element.dpi).toThrow(RangeError)
})
