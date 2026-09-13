import {afterAll, describe, expect, test} from "bun:test"
import {createHeadless, type Headless} from "@immersive/headless"
import {DiagramNode, type DiagramNodeProps} from "@nodes/node/diagram"

type Scenario = Readonly<{
  name: string
  props: DiagramNodeProps
  expected: Readonly<{
    size: Readonly<{
      width: number
      height: number
    }>
  }>
}>

describe.each([
  {
    name: "Прямоугольник",
    props: {
      id: "rectangle",
      description: "Описание занимает всю ноду",
      rect: {x: 40, y: 20, width: 240, height: 100},
      shape: "rectangle",
    },
    expected: {size: {width: 240, height: 100}},
  },
  {
    name: "Овал",
    props: {
      id: "oval",
      description: "Описание занимает всю ноду",
      rect: {x: 40, y: 20, width: 240, height: 100},
      shape: "oval",
    },
    expected: {size: {width: 240, height: 100}},
  },
  {
    name: "Круг",
    props: {
      id: "circle",
      description: "Описание занимает всю ноду",
      rect: {x: 40, y: 20, width: 240, height: 100},
      shape: "circle",
    },
    expected: {size: {width: 240, height: 240}},
  },
] satisfies Scenario[])("$name", async ({props, expected}) => {
    const headless: Headless = createHeadless({width: 320, height: 280})

    afterAll(() => headless.dispose())

    const element = await headless.render(
      <DiagramNode
        id={props.id}
        description={props.description}
        rect={props.rect}
        shape={props.shape}
      />
    )

    test("использует семантический article", () =>
      expect(element.localName, "Внешний элемент должен сохранять семантику article").toBe("article")
    )

    test("применяет форму варианта", () =>
      expect(element.getAttribute("data-node-shape"), "Атрибут data-node-shape должен отражать форму варианта").toBe(props.shape)
    )

    test("отображает описание варианта", () =>
      expect(element.textContent, "Компонент должен отображать переданное описание без подмены").toBe(props.description)
    )

    test("соблюдает размеры выбранной формы", () => {
      const bounds = element.getBoundingClientRect()
      expect({
        width: bounds.width,
        height: bounds.height
      }, "Границы должны соответствовать размерам выбранной формы").toEqual(expected.size)
    })

    test("снимок соответствует собственным границам", async () => {
      const image = await headless.screenshot(element, "image")
      const metadata = await image.metadata()
      expect(
        metadata,
        "Размер снимка должен совпадать с границами компонента",
      ).toMatchObject(expected.size)
    })
  },
)
