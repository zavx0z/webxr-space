import { Matrix4, Vector3 } from "../math"

const LOOK_AT_EPSILON = 1e-6

/**
Параметры для создания точки обзора.
*/
export interface ViewPointParameters {
  /**
  Область Canvas в CSS px для aspect и zoom с неподвижной точкой под указателем.
  Browser обновляет эти данные при изменении размера; Engine не читает native DOM.
  */
  viewport?: ViewPointClientViewport

  /**
  Угол обзора (field of view) в радианах.
  @default 1 (≈57°)
  */
  fov?: number

  /**
  Ближняя плоскость отсечения. Объекты ближе этой distance не отображаются.
  Значение должно быть больше нуля.
  @default 0.1
  */
  near?: number

  /**
  Дальняя плоскость отсечения. Объекты дальше этой distance не отображаются.
  Значение должно быть больше `near`.
  @default 1000
  */
  far?: number

  /**
  Начальная позиция камеры в мм.
  @default { x: 10, y: -10, z: 10 }
  */
  position?: { x: number; y: number; z: number }

  /**
  Точка фокуса в мм.
  @default { x: 0, y: 0, z: 0 }
  */
  target?: { x: number; y: number; z: number }
}

export type ViewPointClientViewport = Readonly<{
  left: number
  top: number
  width: number
  height: number
}>

/**
Камера в правой системе Z-up с расстояниями в миллиметрах.

Orbit меняет азимут вокруг Z и наклон с ограничением у полюсов. Мировой up
не хранится как изменяемое состояние, горизонт не переворачивается.
Browser владеет событиями и передаёт сюда уже выбранные команды камеры.
Матрицы используют правую систему с глубиной clip space [0, 1].
*/
export class ViewPoint {
  public fov: number
  public aspect: number
  public near: number
  public far: number

  public position: Vector3
  public viewMatrix: Matrix4 = new Matrix4()
  public projectionMatrix: Matrix4 = new Matrix4()

  private viewport: ViewPointClientViewport | null
  private target: Vector3

  /**
  Создаёт камеру в фиксированной правой системе Z-up.

  @param parameters - Position и target в мм, fov в радианах, viewport в CSS px.
  @throws Error Если fov или near не положительны либо far не превышает near.
  @example
  ```ts
  const camera = new ViewPoint({position: {x: 0, y: -1000, z: 500}})
  ```
  */
  constructor(parameters: ViewPointParameters) {
    this.viewport = parameters.viewport === undefined
      ? null
      : viewPointClientViewport(parameters.viewport)
    this.fov = parameters.fov ?? 1 // примерно 57 градусов
    this.near = parameters.near ?? 0.1
    this.far = parameters.far ?? 1000

    if (this.fov <= 0) throw new Error("Угол обзора (fov) должен быть больше нуля.")
    if (this.near <= 0) throw new Error("Ближняя плоскость отсечения (near) должна быть больше нуля.")
    if (this.far <= this.near) throw new Error("Дальняя плоскость отсечения (far) должна быть больше ближней (near).")

    this.aspect = this.viewport === null
      ? 1
      : this.viewport.width / this.viewport.height

    this.target = parameters.target
      ? new Vector3(parameters.target.x, parameters.target.y, parameters.target.z)
      : new Vector3(0, 0, 0)
    this.position = parameters.position
      ? new Vector3(parameters.position.x, parameters.position.y, parameters.position.z)
      : new Vector3(10, -10, 10)

    this.updateProjectionMatrix()
    this.update()
  }

  /**
  Возвращает текущую точку фокуса камеры.

  Нужна внешним слоям, которые хотят привязывать UI-объекты
  к экранной окружности вокруг наблюдаемого объекта.
  */
  public getTarget(): Vector3 {
    return this.target
  }

  public setAspectRatio(aspect: number): void {
    if (aspect <= 0) return
    this.aspect = aspect
    this.updateProjectionMatrix()
  }

  /** Обновляет границы Canvas в CSS px и соотношение сторон проекции. */
  public setViewport(viewport: ViewPointClientViewport): void {
    this.viewport = viewPointClientViewport(viewport)
    this.setAspectRatio(this.viewport.width / this.viewport.height)
  }

  public updateProjectionMatrix(): void {
    this.projectionMatrix.makePerspective(this.fov, this.aspect, this.near, this.far)
  }

  /**
  Обновляет матрицу вида на основе положения, цели и неизменной мировой оси Z.
  */
  public update = () => {
    this.sanitizePose()
    this.viewMatrix.makeLookAt(this.position, this.target)
  }

  /**
  Вращает положение камеры вокруг цели: азимут вокруг Z и наклон до полюсов.

  Горизонт сохраняется. Команда не регистрирует события и не меняет мировые оси.
  @param deltaX - Конечное горизонтальное смещение указателя в CSS px.
  @param deltaY - Конечное вертикальное смещение в CSS px; наклон ограничен у полюсов.
  @throws RangeError При нечисловой или бесконечной дельте.
  */
  public orbit(deltaX: number, deltaY: number): void {
    finiteControlDelta(deltaX, "orbit deltaX")
    finiteControlDelta(deltaY, "orbit deltaY")
    this.handleRotation(deltaX, deltaY)
    this.update()
  }

  /** Сдвигает камеру и цель в плоскости экрана; дельты заданы в CSS px. */
  public pan(deltaX: number, deltaY: number): void {
    finiteControlDelta(deltaX, "pan deltaX")
    finiteControlDelta(deltaY, "pan deltaY")
    this.handlePan(deltaX, deltaY)
    this.update()
  }

  /** Меняет расстояние до цели; anchor в CSS px сохраняет точку под указателем. */
  public zoom(delta: number, anchor?: {clientX: number; clientY: number}): void {
    finiteControlDelta(delta, "zoom delta")
    if (anchor !== undefined) {
      finiteControlDelta(anchor.clientX, "zoom anchor clientX")
      finiteControlDelta(anchor.clientY, "zoom anchor clientY")
    }
    this.handleZoom(delta, anchor)
    this.update()
  }

  private handleRotation(deltaX: number, deltaY: number) {
    const offset = new Vector3().subVectors(this.position, this.target)
    const radius = Math.max(offset.length(), LOOK_AT_EPSILON)
    const azimuth = Math.atan2(offset.y, offset.x) - deltaX * 0.005
    const polar = Math.max(1e-4, Math.min(Math.PI - 1e-4,
      Math.acos(Math.max(-1, Math.min(1, offset.z / radius))) - deltaY * 0.005,
    ))
    const horizontalRadius = radius * Math.sin(polar)
    this.position.set(
      this.target.x + horizontalRadius * Math.cos(azimuth),
      this.target.y + horizontalRadius * Math.sin(azimuth),
      this.target.z + radius * Math.cos(polar),
    )
  }

  private handlePan(deltaX: number, deltaY: number) {
    const offset = new Vector3().subVectors(this.position, this.target)
    const panSpeed = 0.001 * offset.length()

    const te = this.viewMatrix.elements
    // Вектор "вправо" камеры находится в первой строке матрицы вида (в column-major это te[0], te[4], te[8])
    const panRight = new Vector3(te[0], te[4], te[8])
    // Вектор "вверх" камеры находится во второй строке матрицы вида (te[1], te[5], te[9])
    const panUp = new Vector3(te[1], te[5], te[9])

    const panDelta = new Vector3()
      .add(panRight.multiplyScalar(deltaX * panSpeed))
      .add(panUp.multiplyScalar(-deltaY * panSpeed))

    // При панорамировании сдвигаем и позицию, и цель
    this.position.add(panDelta)
    this.target.add(panDelta)
  }

  private handleZoom(delta: number, anchor?: {clientX: number; clientY: number}) {
    const anchorBefore = anchor === undefined ? null : this.targetPlanePointForClient(anchor.clientX, anchor.clientY)
    const offset = new Vector3().subVectors(this.position, this.target)
    const currentRadius = offset.length()
    const scale = Math.pow(0.95, delta * 0.05)
    const scaledRadius = currentRadius * scale
    const scaledDelta = currentRadius - scaledRadius
    const minZoomDistance = Math.max(0.001, Math.min(0.1, this.near * 0.02))
    const minimumRadiusDelta = Math.max(0.01, this.near * 0.2 * Math.abs(delta) * 0.01)
    const radiusDelta = Math.sign(scaledDelta) * Math.max(Math.abs(scaledDelta), minimumRadiusDelta)
    const newRadius = Math.max(minZoomDistance, currentRadius - radiusDelta)

    offset.normalize().multiplyScalar(newRadius)

    this.position.copy(this.target).add(offset)
    this.update()
    if (anchorBefore !== null && anchor !== undefined) {
      const anchorAfter = this.targetPlanePointForClient(anchor.clientX, anchor.clientY)
      if (anchorAfter !== null) {
        const correction = anchorBefore.sub(anchorAfter)
        if (isFiniteVector(correction)) {
          this.position.add(correction)
          this.target.add(correction)
          this.update()
        }
      }
    }
  }

  private targetPlanePointForClient(clientX: number, clientY: number): Vector3 | null {
    const rect = this.viewport
    if (rect === null) return null
    const width = rect.width
    const height = rect.height
    if (width <= 0 || height <= 0) return null

    this.update()
    const ndcX = ((clientX - rect.left) / width) * 2 - 1
    const ndcY = 1 - ((clientY - rect.top) / height) * 2
    const inverseViewProjection = new Matrix4()
      .multiplyMatrices(this.projectionMatrix, this.viewMatrix)
      .invert()
    const nearPoint = new Vector3(ndcX, ndcY, 0).applyMatrix4(inverseViewProjection)
    const farPoint = new Vector3(ndcX, ndcY, 1).applyMatrix4(inverseViewProjection)
    if (!isFiniteVector(nearPoint) || !isFiniteVector(farPoint)) return null

    const direction = farPoint.sub(nearPoint).normalize()
    const normal = new Vector3().subVectors(this.position, this.target).normalize()
    const denominator = direction.dot(normal)
    if (Math.abs(denominator) < LOOK_AT_EPSILON) return null
    const distance = this.target.clone().sub(nearPoint).dot(normal) / denominator
    if (!Number.isFinite(distance) || distance < 0) return null
    return nearPoint.add(direction.multiplyScalar(distance))
  }

  private sanitizePose(): void {
    const back = new Vector3().subVectors(this.position, this.target)
    if (!isFiniteVector(back) || back.length() < LOOK_AT_EPSILON) {
      const distance = Math.max(this.near * 2, LOOK_AT_EPSILON)
      this.position.copy(this.target).add(new Vector3(0, -distance, 0))
    }
  }
}

function isFiniteVector(v: Vector3): boolean {
  return Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z)
}

function finiteControlDelta(value: number, label: string): number {
  if (!Number.isFinite(value)) throw new RangeError(`ViewPoint ${label} must be finite`)
  return value
}

function viewPointClientViewport(value: ViewPointClientViewport): ViewPointClientViewport {
  if (value === null || typeof value !== "object") {
    throw new TypeError("ViewPoint viewport is required")
  }
  const left = finiteViewportValue(value.left, "left")
  const top = finiteViewportValue(value.top, "top")
  const width = positiveViewportValue(value.width, "width")
  const height = positiveViewportValue(value.height, "height")
  return Object.freeze({left, top, width, height})
}

function finiteViewportValue(value: number, label: string): number {
  if (!Number.isFinite(value)) throw new RangeError(`ViewPoint viewport ${label} must be finite`)
  return value
}

function positiveViewportValue(value: number, label: string): number {
  finiteViewportValue(value, label)
  if (value <= 0) throw new RangeError(`ViewPoint viewport ${label} must be positive`)
  return value
}
