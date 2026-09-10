/** @jsxImportSource @immersive/headless */
import {afterAll, describe, expect, test} from "bun:test"
import {mkdir, rm} from "node:fs/promises"
import {resolve} from "node:path"
import {createHeadless} from "@immersive/headless"
import type {DiagramNodeProps} from "../index.tsx"

const headless = createHeadless({width: 320, height: 180})
afterAll(() => headless.dispose())

/** describe задаёт props, вложенный test — компонент и его импорт. PNG сохраняется до проверок результата. */
describe.each([
  {
    name: "Выбранная круглая нода",
    image: "selected-circle.png",
    props: {
      id: "props-node",
      description: "Проверка props",
      rect: {x: 24, y: 20, width: 120, height: 80},
      shape: "circle",
      selected: true,
      title: "Подсказка ноды",
    },
    expectedSize: {width: 120, height: 120},
  },
] satisfies {
  name: string,
  image: string,
  props: DiagramNodeProps,
  expectedSize: { width: number, height: number }
}[])(
  "$name",
  ({props, image, expectedSize}) => {
    test.each([
      {
        name: "DiagramNode",
        load: async () => (await import("../index.tsx")).DiagramNode,
      },
    ])(
      "[DIAGRAM-PROPS] $name: props применяются к элементу компонента",
      async ({load}) => {
        const Component = await load()
        const directory = resolve(import.meta.dir, "../results/props")
        const path = resolve(directory, image)
        await mkdir(directory, {recursive: true})
        await rm(path, {force: true})

        const element = await headless.render(
          <Component
            id={props.id}
            description={props.description}
            rect={props.rect}
            shape={props.shape}
            selected={props.selected}
            title={props.title}
          />
        )
        await Bun.write(path, await headless.screenshot(element))

        expect(element.localName, "Headless должен вернуть внешний article ноды").toBe("article")
        expect(element.getAttribute("data-node-id"), "Идентификатор должен попасть в data-node-id").toBe(props.id)
        expect(element.getAttribute("data-node-shape"), "Форма должна попасть в data-node-shape").toBe(props.shape)
        expect(element.getAttribute("aria-label"), "Описание должно стать доступным именем ноды").toBe(props.description)
        expect(element.textContent, "Описание должно отображаться внутри компонента").toBe(props.description)
        expect(element.getAttribute("aria-selected"), "Выбранная нода должна иметь aria-selected=true").toBe("true")
        expect(element.firstElementChild?.getAttribute("title"), "Подсказка должна передаваться в Pane").toBe(props.title)

        const bounds = element.getBoundingClientRect()
        expect({x: bounds.x, y: bounds.y}, "Положение должно соответствовать rect").toEqual({
          x: props.rect.x,
          y: props.rect.y
        })
        expect({
          width: bounds.width,
          height: bounds.height
        }, "У круга высота должна совпадать с шириной, независимо от rect.height").toEqual(expectedSize)
      },
      25000,
    )
  },
)
