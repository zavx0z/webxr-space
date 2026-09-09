import {expect, test} from "bun:test"
import {createDocument} from "../../src/index.ts"
import {SpaceElement} from "../index.ts"
import {ViewPointElement} from "../../viewpoint/index.ts"
import {createSpaceElementFactories} from "../../../space/src/factories.ts"

test("Space и ViewPoint создаются без регистрации фабрик", () => {
  const document = createDocument()
  const space = document.createElement("space")
  const camera = document.createElement("viewpoint")
  expect(space, "Тег space должен создавать базовый SpaceElement").toBeInstanceOf(SpaceElement)
  expect(camera, "Тег viewpoint должен создавать базовый ViewPointElement").toBeInstanceOf(ViewPointElement)
  space.append(camera, document.createElement("display"))
  document.append(space)
  expect(space.frameloop, "По умолчанию кадр должен запрашиваться по изменениям").toBe("demand")
  expect(space.background, "По умолчанию фон должен быть чёрным").toBe("#000000")
  space.frameloop = "always"
  expect(space.getAttribute("frameloop"), "Режим кадров должен отражаться в атрибуте").toBe("always")
  expect(() => space.append(document.createElement("viewpoint")), "Вторая камера должна отклоняться").toThrow("exactly one ViewPoint")
  expect(space.children.length, "Отклонённая камера не должна менять дерево").toBe(2)
})

test("Space принимает пространственные объекты и один HUD, сохраняя проверки структуры", () => {
  const document = createDocument({elementFactories: createSpaceElementFactories()})
  const space = document.createElement("space")
  space.append(document.createElement("xr-group"), document.createElement("hud"))
  expect(space.children.length, "Объект и HUD должны принадлежать той же сцене").toBe(2)
  expect(() => space.append(document.createElement("div")), "Обычный HTML должен находиться внутри Display или HUD").toThrow("only spatial elements")
  expect(() => space.append(document.createElement("xr-material")), "Ресурс материала не должен становиться корнем сцены").toThrow("does not accept")
  expect(() => space.append(document.createElement("hud")), "Второй HUD должен отклоняться").toThrow("at most one HUD")
})
