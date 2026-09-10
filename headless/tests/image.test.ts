import {expect, test} from "bun:test"
import {imageFromRgba} from "../image.ts"

test("[HEADLESS-IMAGE] нативный PNG сохраняет порядок строк, цвета и прозрачность RGBA", async () => {
  // Сверху: непрозрачный красный и полупрозрачный зелёный.
  // Снизу: прозрачный синий и непрозрачный белый.
  const rgba = new Uint8Array([
    255, 0, 0, 255, 0, 255, 0, 128,
    0, 0, 255, 0, 255, 255, 255, 255,
  ])
  // Независимый PNG-эталон этих четырёх пикселей, созданный до замены кодировщика.
  const reference = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAGElEQVR4AQXBAQEAAAjDIN7c5hNEciOlBz3iB3s97fKpAAAAAElFTkSuQmCC",
    "base64",
  )
  const png = await imageFromRgba(rgba, 2, 2).png().buffer()
  const metadata = await new Bun.Image(png).metadata()
  expect([metadata.width, metadata.height, metadata.format], "Изображение должно быть PNG размером 2 × 2").toEqual([2, 2, "png"])
  expect(png, "Нативное кодирование должно сохранить все четыре RGBA-пикселя эталона").toEqual(
    await new Bun.Image(reference).png().buffer(),
  )
})
