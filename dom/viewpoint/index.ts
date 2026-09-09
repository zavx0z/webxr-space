/**
Базовая камера пространственной сцены. Координаты — в мм, fov — в радианах, ось вверх — Z.

@packageDocumentation
*/
import type {Document} from "../src/document.ts"
import type {Element} from "../src/element.ts"
import {SpatialElement} from "../space/spatial-element.ts"

const numberAttribute = (
  element: Element,
  name: string,
  fallback: number,
): number => {
  const value = element.getAttribute(name)
  if (value === null) return fallback
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

const setNumberAttribute = (
  element: Element,
  name: string,
  value: number,
): void => {
  if (!Number.isFinite(value)) throw new TypeError(`${name} must be finite`)
  element.setAttribute(name, String(value))
}

const booleanAttribute = (
  element: Element,
  name: string,
  fallback: boolean,
): boolean => {
  const value = element.getAttribute(name)
  if (value === null) return fallback
  return value !== "false"
}

const viewPointPoseProperties = ["x", "y", "z", "targetX", "targetY", "targetZ", "fov", "near", "far"] as const

/**
Единственная камера semantic Space. Координаты и расстояния заданы в мм, ось вверх — Z.
Команды меняют этот же Element одной transaction; подключённый Browser сам запрашивает кадр.
Сохранённый обзор принадлежит элементу и не создаёт подписок или отдельного цикла кадров.
*/
export class ViewPointElement extends SpatialElement {
  override get spaceChildKind(): "viewpoint" { return "viewpoint" }

  #savedState: Float64Array | null = null

  constructor(ownerDocument: Document) {
    super(ownerDocument, "viewpoint")
  }

  get x(): number { return numberAttribute(this, "x", 10) }
  set x(value: number) { setNumberAttribute(this, "x", value) }
  get y(): number { return numberAttribute(this, "y", -10) }
  set y(value: number) { setNumberAttribute(this, "y", value) }
  get z(): number { return numberAttribute(this, "z", 10) }
  set z(value: number) { setNumberAttribute(this, "z", value) }
  get targetX(): number { return numberAttribute(this, "target-x", 0) }
  set targetX(value: number) { setNumberAttribute(this, "target-x", value) }
  get targetY(): number { return numberAttribute(this, "target-y", 0) }
  set targetY(value: number) { setNumberAttribute(this, "target-y", value) }
  get targetZ(): number { return numberAttribute(this, "target-z", 0) }
  set targetZ(value: number) { setNumberAttribute(this, "target-z", value) }
  get controls(): boolean { return booleanAttribute(this, "controls", false) }
  set controls(value: boolean) { this.setAttribute("controls", String(value)) }
  get fov(): number { return numberAttribute(this, "fov", 1) }
  set fov(value: number) { setNumberAttribute(this, "fov", value) }
  get near(): number { return numberAttribute(this, "near", 0.1) }
  set near(value: number) { setNumberAttribute(this, "near", value) }
  get far(): number { return numberAttribute(this, "far", 1000) }
  set far(value: number) { setNumberAttribute(this, "far", value) }

  /**
  Запоминает положение, цель, fov и near/far для {@link ViewPointElement.reset}.
  Повторный вызов заменяет прежний обзор без нового выделения памяти.
  Разрешение жестов `controls` остаётся состоянием приложения.
  */
  saveState(): void {
    const state = this.#savedState ??= new Float64Array(viewPointPoseProperties.length)
    for (let index = 0; index < viewPointPoseProperties.length; index++) {
      state[index] = this[viewPointPoseProperties[index]!]
    }
  }

  /**
  Возвращает последний сохранённый обзор без замены камеры и без изменения `controls`.

  @returns `true`, если обзор был сохранён; иначе ничего не меняет и возвращает `false`.
  */
  reset(): boolean {
    const state = this.#savedState
    if (state === null) return false
    this.ownerDocument!.transaction(() => {
      for (let index = 0; index < viewPointPoseProperties.length; index++) {
        this[viewPointPoseProperties[index]!] = state[index]!
      }
    })
    return true
  }

  /**
  Мгновенно устанавливает расстояние до цели, сохраняя направление от цели к камере.
  При новой цели камера поворачивается к ней; fov и near/far сохраняются.

  @param distance - Конечное расстояние в мм, строго больше нуля.
  @param target - Точка в мировых координатах Z-up, мм. Без аргумента сохраняется текущая цель.
  @throws RangeError При недопустимом расстоянии, нечисловых координатах или совпадении камеры с целью.
    Проверка выполняется до изменения Element.
  @example
  ```ts
  camera.saveState()
  camera.dollyTo(600, {x: 0, y: 0, z: 900})
  camera.reset()
  ```
  */
  dollyTo(distance: number, target?: Readonly<{x: number; y: number; z: number}>): void {
    const targetX = target?.x ?? this.targetX
    const targetY = target?.y ?? this.targetY
    const targetZ = target?.z ?? this.targetZ
    if (!Number.isFinite(distance) || distance <= 0 ||
      !Number.isFinite(targetX) || !Number.isFinite(targetY) || !Number.isFinite(targetZ)) {
      throw new RangeError("ViewPoint.dollyTo requires a positive finite distance and finite target coordinates")
    }
    const offsetX = this.x - targetX
    const offsetY = this.y - targetY
    const offsetZ = this.z - targetZ
    const length = Math.hypot(offsetX, offsetY, offsetZ)
    if (!Number.isFinite(length) || length === 0) {
      throw new RangeError("ViewPoint.dollyTo requires a finite direction from target to camera")
    }
    const x = targetX + offsetX / length * distance
    const y = targetY + offsetY / length * distance
    const z = targetZ + offsetZ / length * distance
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
      throw new RangeError("ViewPoint.dollyTo position exceeds finite coordinates")
    }
    this.ownerDocument!.transaction(() => {
      this.x = x
      this.y = y
      this.z = z
      this.targetX = targetX
      this.targetY = targetY
      this.targetZ = targetZ
    })
  }

  protected override validateChildInsertion(): void {
    throw new TypeError("ViewPoint cannot contain children")
  }
}
