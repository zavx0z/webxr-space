import {expect, test} from "bun:test"
import {createDocument, Event} from "../../src/index.ts"
import {HUDElement} from "../index.ts"

test("HUD создаётся без регистрации фабрик и отражает расстояние в атрибуте", () => {
  const document = createDocument()
  const hud = document.createElement("hud")
  expect(hud, "Тег hud должен создавать базовый HUDElement").toBeInstanceOf(HUDElement)
  expect(hud.ownerDocument, "HUD должен принадлежать создавшему его документу").toBe(document)
  expect(hud.distance, "Расстояние до HUD по умолчанию должно составлять 1000 мм").toBe(1000)
  hud.distance = 600
  expect(hud.getAttribute("distance"), "Запись distance должна обновлять атрибут").toBe("600")
  hud.setAttribute("distance", "750")
  expect(hud.distance, "Свойство distance должно читать значение атрибута").toBe(750)
  for (const value of [NaN, Infinity, -Infinity]) {
    expect(() => { hud.distance = value }, `Расстояние ${value} должно отклоняться`).toThrow(TypeError)
    expect(hud.distance, "Отклонённая запись должна сохранять прежнее расстояние").toBe(750)
  }
  hud.removeAttribute("distance")
  expect(hud.distance, "Удаление атрибута должно восстанавливать расстояние по умолчанию").toBe(1000)
})

test("Space принимает один HUD и отклоняет второй до изменения дерева", () => {
  const document = createDocument()
  const space = document.createElement("space")
  const hud = document.createElement("hud")
  space.append(document.createElement("viewpoint"), hud)
  document.append(space)
  expect(hud.parentElement, "HUD должен быть дочерним элементом общего Space").toBe(space)
  expect(() => space.append(document.createElement("hud")), "Второй HUD в той же сцене должен отклоняться").toThrow("at most one HUD")
  expect(space.querySelectorAll("hud").length, "После отклонения в сцене должен остаться один HUD").toBe(1)
})

test("Перенос интерфейса из Display в HUD сохраняет узел, фокус и обработчики", () => {
  const document = createDocument()
  const space = document.createElement("space")
  const hud = document.createElement("hud")
  const display = document.createElement("display")
  const button = document.createElement("button")
  let clicks = 0
  button.addEventListener("click", () => clicks++)
  display.append(button)
  space.append(document.createElement("viewpoint"), display, hud)
  document.append(space)
  button.focus()
  hud.append(button)
  button.dispatchEvent(new Event("click", {bubbles: true}))
  expect(hud.firstElementChild, "HUD должен получить исходный узел кнопки").toBe(button)
  expect(button.ownerDocument, "Перенос не должен менять документ кнопки").toBe(document)
  expect(document.activeElement, "Перенос в HUD должен сохранять фокус").toBe(button)
  expect(clicks, "Обработчик кнопки должен сохраняться после переноса").toBe(1)
})
