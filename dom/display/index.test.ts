import {expect, test} from "bun:test"
import {createDocument, UIEvent} from "../src/index.ts"
import {DisplayElement, publishDisplayMetrics} from "./index.ts"

test("display создаётся без регистрации в Space и сообщает только об изменении опубликованных размеров", async () => {
  const document = createDocument()
  const display = document.createElement("display")
  expect(display, "Тег display должен создавать DisplayElement без регистрации в Space").toBeInstanceOf(DisplayElement)
  document.append(display)
  let events = 0
  display.addEventListener("resize", event => {
    expect(event, "Событие resize должно быть экземпляром UIEvent").toBeInstanceOf(UIEvent)
    expect(event.target, "Целью события resize должен быть изменившийся дисплей").toBe(display)
    events++
  })
  const initial = {width: 960, height: 480, pixelWidth: 960, pixelHeight: 480, dpi: 96}
  publishDisplayMetrics(display, initial)
  publishDisplayMetrics(display, {...initial})
  await Promise.resolve()
  expect(events, "Повторная публикация одинаковых размеров должна вызвать только одно событие resize").toBe(1)
  publishDisplayMetrics(display, {...initial, pixelWidth: 1920, pixelHeight: 960, dpi: 192})
  await Promise.resolve()
  expect(events, "Изменение плотности и размеров матрицы должно вызвать второе событие resize").toBe(2)
  expect(display.viewport, "Изменение плотности пикселей должно сохранить область раскладки 960 × 480 CSS px").toEqual({width: 960, height: 480})
  expect(display.pixelWidth, "После увеличения плотности ширина матрицы должна составлять 1920 пикселей").toBe(1920)
  publishDisplayMetrics(display, initial)
  display.remove()
  await Promise.resolve()
  expect(events, "Удалённый из документа дисплей не должен отправлять отложенное событие resize").toBe(2)
})


test("dpi отражает числовой атрибут, по умолчанию равен 96 и отклоняет недопустимые значения", () => {
  const element = createDocument().createElement("display")
  expect(element.dpi, "Без атрибута плотность дисплея должна составлять 96 пикселей на дюйм").toBe(96)
  element.dpi = 6.35
  expect(element.getAttribute("dpi"), "Запись свойства dpi должна обновлять одноимённый атрибут").toBe("6.35")
  element.setAttribute("dpi", "192")
  expect(element.dpi, "Свойство dpi должно читать числовое значение из атрибута").toBe(192)
  for (const value of [0, -1, NaN, Infinity]) {
    expect(() => { element.dpi = value }, `Запись недопустимой плотности ${value} должна вызывать RangeError`).toThrow(RangeError)
    expect(element.dpi, `Отклонённая запись плотности ${value} должна сохранять прежнее значение 192`).toBe(192)
  }
  element.removeAttribute("dpi")
  expect(element.dpi, "Удаление атрибута dpi должно восстановить плотность 96 пикселей на дюйм").toBe(96)
  element.setAttribute("dpi", "96dpi")
  expect(() => element.dpi, "Чтение атрибута dpi с единицей измерения вместо числа должно вызывать RangeError").toThrow(RangeError)
})
