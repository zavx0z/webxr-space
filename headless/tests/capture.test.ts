import {afterAll, expect, test} from "bun:test"
import {mkdir} from "node:fs/promises"
import {resolve} from "node:path"
import {createHeadless} from "../index.ts"
import {imageFromRgba} from "../image.ts"

const headless = createHeadless({width: 320, height: 180, styleSheetSources: []})
const {TextBox, InlineText} = await import("../fixtures/elements.tsx")
const directory = resolve(import.meta.dir, "../results/capture")
afterAll(() => headless.dispose())

test("[HEADLESS-CAPTURE] снимок обрезается по смещённому DOM-элементу, обновление текста сохраняет элемент и меняет пиксели", async () => {
  await mkdir(directory, {recursive: true})
  const element = await headless.render(TextBox, {text: "Headless DOM capture"})
  expect(element.localName).toBe("article")
  expect(element.textContent).toBe("Headless DOM capture")
  const bounds = element.getBoundingClientRect()
  expect({x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height}).toEqual({
    x: 40, y: 40, width: 240, height: 100,
  })
  const labelled = await headless.capture(element)
  await Bun.write(resolve(directory, "labelled.png"), labelled.png)
  const updated = await headless.render(TextBox, {text: ""})
  expect(updated).toBe(element)
  expect(updated.isConnected).toBe(true)
  expect(updated.textContent).toBe("")
  const empty = await headless.capture(updated)
  await Bun.write(resolve(directory, "empty.png"), empty.png)
  for (const frame of [labelled, empty]) {
    expect([frame.width, frame.height, frame.rgba.length]).toEqual([240, 100, 240 * 100 * 4])
    const metadata = await new Bun.Image(frame.png).metadata()
    expect([metadata.width, metadata.height]).toEqual([240, 100])
  }

  const difference = new Uint8Array(labelled.rgba.length)
  let changedInside = 0
  let changedBorder = 0
  for (let y = 0; y < labelled.height; y += 1) {
    for (let x = 0; x < labelled.width; x += 1) {
      const offset = (y * labelled.width + x) * 4
      const changed = labelled.rgba.subarray(offset, offset + 4).some((value, channel) => value !== empty.rgba[offset + channel])
      difference[offset] = changed ? 255 : 0
      difference[offset + 3] = 255
      if (!changed) continue
      if (x > 0 && x < labelled.width - 1 && y > 0 && y < labelled.height - 1) changedInside += 1
      else changedBorder += 1
    }
  }
  await imageFromRgba(difference, labelled.width, labelled.height).png().write(resolve(directory, "difference.png"))
  expect(changedInside, "Текст должен изменить пиксели внутри снимка").toBeGreaterThan(20)
  expect(changedBorder, "Обновление текста должно сохранить края снимка").toBe(0)
}, 65000)

test("[HEADLESS-SCREENSHOT] снимок другого DOM-корня округляет дробные границы наружу", async () => {
  await mkdir(directory, {recursive: true})
  const element = await headless.render(InlineText, {text: "Дробные границы"})
  expect(element.localName).toBe("span")
  expect(element.textContent).toBe("Дробные границы")
  const bounds = element.getBoundingClientRect()
  expect({x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height}).toEqual({
    x: 21.25, y: 11.5, width: 137.5, height: 24.25,
  })
  const png = await headless.screenshot(element)
  await Bun.write(resolve(directory, "fractional.png"), png)
  const metadata = await new Bun.Image(png).metadata()
  expect([metadata.width, metadata.height]).toEqual([138, 25])
}, 25000)

test("[HEADLESS-SCREENSHOT-IMAGE] формат image возвращает готовый Bun.Image", async () => {
  const element = await headless.render(TextBox, {text: "Готовое изображение"})
  const image = await headless.screenshot(element, "image")
  const metadata = await image.metadata()

  expect(image).toBeInstanceOf(Bun.Image)
  expect([metadata.width, metadata.height]).toEqual([240, 100])
}, 25000)
