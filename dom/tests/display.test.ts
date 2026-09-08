import {expect, test} from "bun:test"
import {createDocument, DisplayElement, publishDisplayMetrics, UIEvent} from "../src/index.ts"

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
  const initial = {width: 960, height: 480, pixelWidth: 960, pixelHeight: 480, resolution: 96}
  publishDisplayMetrics(display, initial)
  publishDisplayMetrics(display, {...initial})
  await Promise.resolve()
  expect(events).toBe(1)
  publishDisplayMetrics(display, {...initial, pixelWidth: 1920, pixelHeight: 960, resolution: 192})
  await Promise.resolve()
  expect(events).toBe(2)
  expect(display.viewport).toEqual({width: 960, height: 480})
  expect(display.pixelWidth).toBe(1920)
  publishDisplayMetrics(display, initial)
  display.remove()
  await Promise.resolve()
  expect(events).toBe(2)
})
