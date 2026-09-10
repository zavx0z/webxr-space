/** @jsxImportSource @immersive/headless */
import {afterAll, expect, test} from "bun:test"
import {mkdir, rm} from "node:fs/promises"
import {resolve} from "node:path"
import {PNG} from "pngjs"
import {createHeadless} from "@immersive/headless"

const headless = createHeadless({width: 320, height: 180})
const {DiagramNode} = await import("../index.tsx")
const {Typography} = await import("@zavx0z/ui/typography")
afterAll(() => headless.dispose())

/**
 Снимки с текстом и без него доказывают, что PNG содержит результат production-композиции.
 Изображения остаются в results/render-diagram после проверки, включая её падение.
 Красные пиксели difference.png показывают изменение кадра при добавлении описания.
 Размер PNG совпадает с border-box ноды, расположенной с ненулевым смещением в Canvas.
 */
test("[DIAGRAM-NATIVE-PNG] настоящий DiagramNode рендерится через Canvas-адаптер, а описание меняет пиксели PNG", async () => {
  const directory = resolve(import.meta.dir, "../results/render-diagram")
  await mkdir(directory, {recursive: true})
  for (const name of ["labelled", "empty", "difference"]) {
    await rm(resolve(directory, `${name}.png`), {force: true})
  }
  const render = async (name: string, description: string) => {
    const path = resolve(directory, `${name}.png`)
    const element = await headless.render(
      <DiagramNode
        id="native-diagram"
        description={description}
        rect={{x: 40, y: 40, width: 240, height: 100}}
      />
    )
    expect(element.localName, "render должен вернуть внешний article компонента").toBe("article")
    expect(element.textContent, "Возвращённый элемент должен содержать переданное описание").toBe(description)
    const png = await headless.screenshot(element)
    await Bun.write(path, png)
    const image = PNG.sync.read(png)
    expect([image.width, image.height], "PNG должен совпадать с границами компонента 240 × 100 без внешних полей").toEqual([240, 100])
    return {image, element}
  }
  const first = await render("labelled", "DiagramNode · Bun WebGPU")
  const second = await render("empty", "")
  expect(second.element, "Обновление props должно сохранить внешний элемент компонента").toBe(first.element)
  const labelled = first.image
  const empty = second.image
  const difference = new PNG({width: labelled.width, height: labelled.height})
  let changedInside = 0
  let changedBorder = 0
  for (let y = 0; y < labelled.height; y += 1) {
    for (let x = 0; x < labelled.width; x += 1) {
      const offset = (y * labelled.width + x) * 4
      const changed = labelled.data.subarray(offset, offset + 4).some((value, channel) => value !== empty.data[offset + channel])
      difference.data[offset] = changed ? 255 : 0
      difference.data[offset + 3] = 255
      if (!changed) continue
      if (x > 0 && x < labelled.width - 1 && y > 0 && y < labelled.height - 1) changedInside += 1
      else changedBorder += 1
    }
  }
  await Bun.write(resolve(directory, "difference.png"), PNG.sync.write(difference))
  expect(changedInside, "Описание должно изменить видимые пиксели внутри настоящей ноды").toBeGreaterThan(20)
  expect(changedBorder, "Изменение описания не должно менять рамку обрезанного снимка").toBe(0)
}, 65000)

test("[HEADLESS-PACKAGE] тот же host принимает Typography из UI и возвращает его span", async () => {
  const element = await headless.render(
    <Typography
      text="Компонент из другого пакета"
    />
  )
  expect(element.localName, "Headless должен возвращать внешний элемент переданного компонента").toBe("span")
  expect(element.textContent, "Props другого пакета должны доходить до живого DOM").toBe("Компонент из другого пакета")
  const png = await headless.screenshot(element)
  await Bun.write(resolve(import.meta.dir, "../results/render-diagram/typography.png"), png)
  const image = PNG.sync.read(png)
  const bounds = element.getBoundingClientRect()
  expect([image.width, image.height], "Снимок другого компонента должен совпадать с его границами").toEqual([
    Math.ceil(bounds.right) - Math.floor(bounds.x),
    Math.ceil(bounds.bottom) - Math.floor(bounds.y),
  ])
}, 25000)
