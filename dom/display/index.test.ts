import {expect, test} from "bun:test"
import {createDocument, UIEvent} from "../src/index.ts"
import {DisplayElement, publishDisplayMetrics, type DisplayMetrics} from "./index.ts"

test("display создаётся без регистрации в Space и сообщает только об изменении опубликованных размеров", async () => {
  const document = createDocument()
  const display = document.createElement("display")
  expect(display, "Тег display должен создавать DisplayElement без регистрации в Space").toBeInstanceOf(DisplayElement)
  expect(display.viewport, "До публикации область раскладки должна быть нулевой").toEqual({width: 0, height: 0})
  expect(display.pixelWidth, "До публикации ширина матрицы должна быть нулевой").toBe(0)
  expect(display.pixelHeight, "До публикации высота матрицы должна быть нулевой").toBe(0)
  expect(display.dpi, "До публикации плотность по обеим осям должна быть нулевой").toEqual({x: 0, y: 0})
  document.append(display)
  let events = 0
  display.addEventListener("resize", event => {
    expect(event, "Событие resize должно быть экземпляром UIEvent").toBeInstanceOf(UIEvent)
    expect(event.target, "Целью события resize должен быть изменившийся дисплей").toBe(display)
    events++
  })
  const initial = {width: 960, height: 480, pixelWidth: 960, pixelHeight: 480, dpi: {x: 96, y: 96}}
  publishDisplayMetrics(display, initial)
  publishDisplayMetrics(display, {...initial, dpi: {...initial.dpi}})
  await Promise.resolve()
  expect(events, "Повторная публикация одинаковых размеров должна вызвать только одно событие resize").toBe(1)
  publishDisplayMetrics(display, {width: 1920, height: 960, pixelWidth: 1920, pixelHeight: 960, dpi: {x: 192, y: 192}})
  await Promise.resolve()
  expect(events, "Изменение плотности и размеров матрицы должно вызвать второе событие resize").toBe(2)
  expect(display.viewport, "Опубликованное разрешение должно определять область раскладки 1920 × 960 CSS px").toEqual({width: 1920, height: 960})
  expect(display.pixelWidth, "После увеличения плотности ширина матрицы должна составлять 1920 пикселей").toBe(1920)
  publishDisplayMetrics(display, initial)
  display.remove()
  await Promise.resolve()
  expect(events, "Удалённый из документа дисплей не должен отправлять отложенное событие resize").toBe(2)
})


test("Физические width и height отражают миллиметры и отклоняют недопустимые размеры", () => {
  const element = createDocument().createElement("display")
  expect(element.width, "Без атрибута физическая ширина должна быть нулевой").toBe(0)
  expect(element.height, "Без атрибута физическая высота должна быть нулевой").toBe(0)
  element.width = 600
  element.height = 337.5
  expect(element.getAttribute("width"), "Физическая ширина должна записываться в атрибут без суффикса единицы").toBe("600")
  expect(element.getAttribute("height"), "Дробная высота в миллиметрах должна сохраняться в атрибуте").toBe("337.5")
  for (const dimension of ["width", "height"] as const) {
    element.setAttribute(dimension, "123.5")
    expect(element[dimension], `Свойство ${dimension} должно читать физический размер из атрибута`).toBe(123.5)
    for (const value of [0, -1, NaN, Infinity, -Infinity]) {
      expect(() => { element[dimension] = value }, `Недопустимый размер ${dimension}=${value} должен вызывать RangeError`).toThrow(RangeError)
      expect(element[dimension], `Отклонённая запись ${dimension} должна сохранять прежний размер`).toBe(123.5)
    }
    for (const value of ["0", "-1", "NaN", "Infinity", "", "600mm"]) {
      element.setAttribute(dimension, value)
      expect(() => element[dimension], `Недопустимый атрибут ${dimension}=${value} должен отклоняться при чтении`).toThrow(RangeError)
    }
    element.removeAttribute(dimension)
    expect(element[dimension], `Удаление атрибута ${dimension} должно возвращать нулевой неустановленный размер`).toBe(0)
  }
})

test("Вычисленная плотность доступна только для чтения и хранит отдельный неизменяемый снимок по осям", () => {
  const element = createDocument().createElement("display")
  const initial = element.dpi
  expect(Object.isFrozen(initial), "Нулевой снимок плотности должен быть неизменяемым").toBe(true)
  const input = {width: 1280, height: 720, pixelWidth: 1280, pixelHeight: 720, dpi: {x: 54.18666666666667, y: 60.96}}
  publishDisplayMetrics(element, input)
  const density = element.dpi
  expect(density, "Различные плотности по X и Y должны сохраняться без усреднения").toEqual(input.dpi)
  expect(density, "Публикация не должна сохранять изменяемый объект вызывающей стороны").not.toBe(input.dpi)
  expect(Object.isFrozen(density), "Вложенный снимок плотности должен быть заморожен").toBe(true)
  input.dpi.x = 1
  input.dpi.y = 2
  expect(element.dpi, "Изменение исходного объекта не должно менять опубликованную плотность").toEqual({x: 54.18666666666667, y: 60.96})
  expect(Reflect.set(density, "x", 1), "Запись во вложенный снимок плотности должна отклоняться").toBe(false)
  expect(Reflect.set(element, "dpi", {x: 1, y: 1}), "Свойство dpi не должно иметь setter").toBe(false)
  expect(initial, "Новый снимок не должен менять ранее выданный нулевой снимок").toEqual({x: 0, y: 0})

  if (false) {
    // @ts-expect-error Плотность вычисляется платформой и не имеет setter.
    element.dpi = {x: 96, y: 96}
    // @ts-expect-error Плотность по каждой оси является неизменяемым вычисленным фактом.
    element.dpi.x = 96
  }
})

test("Изменение плотности по любой оси вызывает resize после публикации, а одинаковые значения не повторяют событие", async () => {
  const document = createDocument()
  const display = document.createElement("display")
  document.append(display)
  let events = 0
  display.addEventListener("resize", () => events++)
  const value: DisplayMetrics = {width: 1280, height: 720, pixelWidth: 1280, pixelHeight: 720, dpi: {x: 96, y: 96}}
  publishDisplayMetrics(display, value)
  await Promise.resolve()
  display.width = 600
  display.height = 337.5
  await Promise.resolve()
  expect(events, "Авторские атрибуты сами по себе не должны отправлять событие до публикации вычисленных параметров").toBe(1)
  publishDisplayMetrics(display, {...value, dpi: {x: 72, y: 96}})
  await Promise.resolve()
  expect(events, "Изменение только плотности X должно вызвать resize").toBe(2)
  publishDisplayMetrics(display, {...value, dpi: {x: 72, y: 48}})
  await Promise.resolve()
  expect(events, "Изменение только плотности Y должно вызвать resize").toBe(3)
  publishDisplayMetrics(display, {...value, dpi: {x: 72, y: 48}})
  await Promise.resolve()
  expect(events, "Новый объект с одинаковой плотностью по обеим осям не должен повторять resize").toBe(3)
  expect(display.width, "Публикация вычисленных параметров не должна менять физическую ширину").toBe(600)
  expect(display.height, "Публикация вычисленных параметров не должна менять физическую высоту").toBe(337.5)
})

test("Несколько публикаций за микрозадачу доставляют resize только для последнего снимка", async () => {
  const document = createDocument()
  const display = document.createElement("display")
  document.append(display)
  const densities: DisplayMetrics["dpi"][] = []
  display.addEventListener("resize", () => densities.push(display.dpi))
  const value = {width: 1280, height: 720, pixelWidth: 1280, pixelHeight: 720, dpi: {x: 96, y: 96}}
  publishDisplayMetrics(display, value)
  publishDisplayMetrics(display, {...value, dpi: {x: 72, y: 60}})
  await Promise.resolve()
  expect(densities, "Устаревший снимок не должен доставлять отдельное событие resize").toEqual([{x: 72, y: 60}])
})
