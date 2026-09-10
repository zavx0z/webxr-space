/** @jsxImportSource @immersive/headless */
import {describe, expect, test} from "bun:test"
import {mkdir, rm} from "node:fs/promises"
import {resolve} from "node:path"
import {PNG} from "pngjs"
import {createHeadless} from "@immersive/headless"
import {DiagramNode, type DiagramNodeProps} from "../index.tsx"

/**
 Каждый вариант describe задаёт props настоящего компонента.
 Обычный test использует импортированный компонент; PNG сохраняется по границам элемента в results/story.
 */
describe.each([
  {
    name: "Прямоугольник",
    props: {
      id: "rectangle",
      description: "Описание занимает всю ноду",
      rect: {x: 40, y: 20, width: 240, height: 100},
      shape: "rectangle",
    },
    expectedSize: {width: 240, height: 100},
  },
  {
    name: "Овал",
    props: {
      id: "oval",
      description: "Описание занимает всю ноду",
      rect: {x: 40, y: 20, width: 240, height: 100},
      shape: "oval",
    },
    expectedSize: {width: 240, height: 100},
  },
  {
    name: "Круг",
    props: {
      id: "circle",
      description: "Описание занимает всю ноду",
      rect: {x: 40, y: 20, width: 240, height: 100},
      shape: "circle",
    },
    expectedSize: {width: 240, height: 240},
  },
] satisfies { name: string, props: DiagramNodeProps, expectedSize: { width: number, height: number } }[])(
  "$name",
  ({props, expectedSize}) => {
    test(
      "[DIAGRAM-STORY] DiagramNode отображает вариант и сохраняет его PNG",
      async () => {
        const headless = createHeadless({width: 320, height: 280})
        try {
          const directory = resolve(import.meta.dir, "../results/story")
          const path = resolve(directory, `${props.shape}.png`)
          await mkdir(directory, {recursive: true})
          await rm(path, {force: true})

          const element = await headless.render(
            <DiagramNode
              id={props.id}
              description={props.description}
              rect={props.rect}
              shape={props.shape}
            />
          )
          const png = await headless.screenshot(element)
          await Bun.write(path, png)

          expect(element.localName, "Headless должен вернуть внешний article компонента").toBe("article")
          expect(element.getAttribute("data-node-shape"), "Нода должна получить форму выбранного варианта").toBe(props.shape)
          expect(element.textContent, "Вариант должен отображать переданное описание").toBe(props.description)
          const bounds = element.getBoundingClientRect()
          expect({
            width: bounds.width,
            height: bounds.height
          }, "Размеры варианта должны соответствовать его форме").toEqual(expectedSize)
          const image = PNG.sync.read(png)
          expect({
            width: image.width,
            height: image.height
          }, "PNG должен сохраняться по границам компонента без внешних полей").toEqual(expectedSize)
        } finally {
          await headless.dispose()
        }
      },
      25000,
    )
  },
)
