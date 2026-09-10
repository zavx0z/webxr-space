/** @jsxImportSource @immersive/headless */
import {afterEach, beforeEach, describe, expect, test} from "bun:test"
import {mkdir, rm} from "node:fs/promises"
import {resolve} from "node:path"
import {createHeadless, type Headless} from "@immersive/headless"
import type {DiagramNodeProps} from "../contract/input.ts"

/**
 Каждый вариант describe задаёт props настоящего компонента.
 Параметризация test содержит runtime, который импортирует компонент и возвращает JSX для переданных props.
 Тест монтирует результат через headless и получает живой элемент. Headless владеет монтированием и его очисткой.
 beforeEach создаёт headless и подготавливает файл снимка, afterEach освобождает headless.
 PNG сохраняется по границам элемента в results/story.
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
    let headless: Headless
    const directory = resolve(import.meta.dir, "../results/story")
    const path = resolve(directory, `${props.shape}.png`)

    beforeEach(async () => {
      headless = createHeadless({width: 320, height: 280})
      await mkdir(directory, {recursive: true})
      await rm(path, {force: true})
    })

    afterEach(async () => {
      await headless?.dispose()
    })

    test.each([
      {
        runtime: async (props: DiagramNodeProps) => {
          const {DiagramNode} = await import("../index.tsx")
          return (
            <DiagramNode
              id={props.id}
              description={props.description}
              rect={props.rect}
              shape={props.shape}
            />
          )
        },
      },
    ])(
      "[DIAGRAM-STORY] DiagramNode отображает вариант и сохраняет его PNG",
      async ({runtime}) => {
        const element = await headless.render(await runtime(props))
        const png = await headless.screenshot(element)
        await Bun.write(path, png)

        expect(element.isConnected, "Headless должен смонтировать JSX, возвращённый runtime").toBe(true)
        expect(element.localName, "Headless должен вернуть внешний article компонента").toBe("article")
        expect(element.getAttribute("data-node-shape"), "Нода должна получить форму выбранного варианта").toBe(props.shape)
        expect(element.textContent, "Вариант должен отображать переданное описание").toBe(props.description)
        const bounds = element.getBoundingClientRect()
        expect({
          width: bounds.width,
          height: bounds.height
        }, "Размеры варианта должны соответствовать его форме").toEqual(expectedSize)
        const image = await new Bun.Image(png).metadata()
        expect({
          width: image.width,
          height: image.height
        }, "PNG должен сохраняться по границам компонента без внешних полей").toEqual(expectedSize)
      },
      25000,
    )
  },
)
