import {expect, test} from "bun:test"
import {DisplayElement} from "./index.ts"
import type {Node as SemanticNode} from "../src/index.ts"
import {Quaternion, type TrueTypeFont} from "../../engine/src/index.ts"
import type {DocumentPlaneRuntime} from "../../browser/src/plane-runtime.ts"
import type {DocumentSpacePlaneRegistration, DocumentSpacePlaneUpdate} from "../../browser/src/space-runtime.ts"
import {attachFixture, createFakeRuntime, createFakeRuntimeState} from "../../browser/tests/experience.fixture.ts"

test("[BRW-ATTACH-005] нормализация ориентации Display не создаёт бесконечную перерисовку", async () => {
  const state = createFakeRuntimeState()
  let updates = 0
  const normalize = (plane: DocumentPlaneRuntime) => {
    const value = plane.plane.quaternion
    Object.assign(value, new Quaternion(value.x, value.y, value.z, value.w).normalize())
    return plane
  }
  const experience = await attachFixture({canvas: {getContext: () => null, getBoundingClientRect: () => ({width: 800, height: 600, left: 0, top: 0})} as unknown as HTMLCanvasElement, font: {} as TrueTypeFont}, async options => {
    const runtime = createFakeRuntime(options, state)
    const add = runtime.addPlane
    const update = runtime.updatePlane
    return Object.assign(runtime, {
      addPlane: (registration: DocumentSpacePlaneRegistration) => normalize(add(registration)),
      updatePlane(id: SemanticNode, value: DocumentSpacePlaneUpdate) {
        updates++
        return normalize(update(id, value))
      },
    })
  })
  const display = experience.document.createElement("display") as DisplayElement
  display.setAttribute("style", `
    width: 960px;
    height: 680px;
  `)
  display.id = "rotated"
  display.setAttribute("style", `
    width: 960px;
    height: 680px;
    rotate: x 90deg;
  `)
  experience.space.append(display)
  experience.render()
  experience.render()
  expect(updates, "Нормализация ориентации не должна повторно обновлять неизменную проекцию").toBe(0)
  expect(display.getAttribute("style"), "Нормализация проекции должна сохранять авторский CSS rotate").toContain("rotate: x 90deg")
  experience.unmount()
})


test("CSS-масштаб обновляет существующую проекцию без замены интерфейса и изменения области раскладки", async () => {
  const state = createFakeRuntimeState()
  const canvas = {getContext: () => null, getBoundingClientRect: () => ({width: 800, height: 600, left: 0, top: 0})} as unknown as HTMLCanvasElement
  const root = await attachFixture({canvas, font: {} as TrueTypeFont}, options => Promise.resolve(createFakeRuntime(options, state)))
  const display = root.document.createElement("display") as DisplayElement
  display.setAttribute("style", `
    width: 960px;
    height: 680px;
  `)
  display.setAttribute("style", `
    width: 1280px;
    height: 720px;
  `)
  const button = root.document.createElement("button")
  display.append(button)
  root.space.append(display)
  const held = state.planes.get(display)!
  button.focus()
  root.document.transaction(() => {
    display.setAttribute("style", `
    width: 1280px;
    height: 720px;
    scale: 2 3 -1;
  `)
  })
  expect(state.planes.get(display), "Изменение масштаба должно сохранять существующую проекцию").toBe(held)
  expect([held.plane.scale.x, held.plane.scale.y, held.plane.scale.z], "Масштаб проекции должен соответствовать CSS scale").toEqual([2, 3, -1])
  expect(held.viewport, "Масштабирование должно сохранять область раскладки 1280 × 720").toEqual({width: 1280, height: 720})
  expect(root.document.activeElement, "Масштабирование не должно сбрасывать фокус кнопки").toBe(button)
  root.document.transaction(() => {
    display.setAttribute("style", `
    width: 1280px;
    height: 720px;
    scale: 1 1 1;
  `)
  })
  expect([held.plane.scale.x, held.plane.scale.y, held.plane.scale.z], "Возврат единичного масштаба должен обновлять все оси проекции").toEqual([1, 1, 1])
  root.unmount()
})


test("Изменение CSS и dpi обновляет проекцию и матрицу, сохраняет фокус и вызывает resize", async () => {
  const state = createFakeRuntimeState()
  const canvas = {getContext: () => null, getBoundingClientRect: () => ({width: 800, height: 600, left: 0, top: 0})} as unknown as HTMLCanvasElement
  const root = await attachFixture({canvas, font: {} as TrueTypeFont}, options => Promise.resolve(createFakeRuntime(options, state)))
  const display = root.document.createElement("display")
  expect(display, "Созданный дисплей должен быть экземпляром DisplayElement").toBeInstanceOf(DisplayElement)
  display.setAttribute("style", `
    width: 254mm;
    height: 127mm;
    translate: 0 0 900mm;
    rotate: x 90deg;
  `)
  display.dpi = 10
  let resized = 0
  display.addEventListener("resize", () => resized++)
  const button = root.document.createElement("button")
  display.append(button)
  root.space.append(display)
  await Promise.resolve()
  expect(resized, "Первичная публикация размеров должна вызвать одно событие resize").toBe(1)
  expect(display.pixelWidth, "Начальная ширина матрицы должна составлять 100 пикселей").toBe(100)
  expect(display.pixelHeight, "Начальная высота матрицы должна составлять 50 пикселей").toBe(50)
  expect(display.viewport.width, "Ширина поверхности 254 мм должна давать 960 CSS px").toBeCloseTo(960)
  const held = state.planes.get(display)!
  expect(held.rasterSize, "Проекция должна получать матрицу 100 × 50 пикселей").toEqual({width: 100, height: 50})
  const handle = root.getProjection(display)
  expect(handle.kind, "Browser должен предоставлять проекцию типа display").toBe("display")
  button.focus()
  expect(state.nativeOwner, "Сфокусированный дисплей должен становиться владельцем нативного ввода").toBe(display)
  display.dpi = 192
  display.setAttribute("style", `
    width: 254mm;
    height: 127mm;
    translate: 20mm 0 900mm;
    rotate: x 90deg;
  `)
  await Promise.resolve()
  expect(resized, "Изменение плотности должно вызвать второе событие resize").toBe(2)
  expect(state.planes.get(display), "Изменение CSS и плотности должно сохранять существующую проекцию").toBe(held)
  expect(root.getProjection(display), "Изменение CSS и плотности должно сохранять публичный объект проекции").toBe(handle)
  expect(held.rasterSize, "При новой плотности проекция должна получать матрицу 1920 × 960").toEqual({width: 1920, height: 960})
  expect(root.document.activeElement, "Изменение CSS и плотности должно сохранять фокус кнопки").toBe(button)
  expect(held.plane.position.x, "Проекция должна учитывать смещение поверхности на 20 мм по X").toBeCloseTo(20)
  root.unmount()
})
