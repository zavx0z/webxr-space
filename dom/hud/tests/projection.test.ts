import {expect, test} from "bun:test"
import type {TrueTypeFont} from "../../../engine/src/index.ts"
import {attachFixture, createFakeRuntime, createFakeRuntimeState} from "../../../browser/tests/experience.fixture.ts"

test("Изменение расстояния HUD сохраняет проекцию и фокус, удаление освобождает регистрацию", async () => {
  const state = createFakeRuntimeState()
  const canvas = {
    getContext: () => null,
    getBoundingClientRect: () => ({width: 800, height: 600, left: 0, top: 0}),
  } as unknown as HTMLCanvasElement
  const root = await attachFixture({canvas, font: {} as TrueTypeFont}, options => Promise.resolve(createFakeRuntime(options, state)))
  try {
    const hud = root.document.createElement("hud")
    const button = root.document.createElement("button")
    hud.append(button)
    root.space.append(hud)
    const overlay = state.overlays.get(hud)!
    const projection = root.getProjection(hud)
    expect(projection.kind, "Для базового HUD должна создаваться проекция hud").toBe("hud")
    expect(overlay.overlay.distance, "Начальная дистанция проекции должна составлять 1000 мм").toBe(1000)
    button.focus()
    hud.distance = 600
    hud.id = "renamed-hud"
    expect(state.overlays.get(hud), "Изменение расстояния и id не должно заменять проекцию").toBe(overlay)
    expect(root.getProjection(hud), "Публичный объект проекции должен сохраняться").toBe(projection)
    expect(overlay.overlay.distance, "Проекция должна получать новое расстояние 600 мм").toBe(600)
    expect(root.document.activeElement, "Обновление HUD должно сохранять фокус кнопки").toBe(button)
    expect(state.nativeOwner, "HUD должен оставаться владельцем нативного ввода").toBe(hud)
    hud.remove()
    expect(state.overlays.has(hud), "Удаление HUD должно освобождать регистрацию проекции").toBe(false)
    expect(projection.readFrame(), "Удалённая проекция не должна возвращать кадр").toBeNull()
  } finally {
    root.unmount()
  }
})
