import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { Matrix4 } from "../math/matrix-4"
import { Vector3 } from "../math/vector-3"
import { ViewPoint } from "./view-point"

type EventTargetStub = {
  addEventListener: () => void
  removeEventListener: () => void
}

const createEventTargetStub = (): EventTargetStub => ({
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
})

const createElementStub = (): HTMLElement => ({
  ...createEventTargetStub(),
  clientWidth: 1280,
  clientHeight: 720,
  getBoundingClientRect: () => ({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: 1280,
    bottom: 720,
    width: 1280,
    height: 720,
    toJSON: () => ({}),
  }) as DOMRect,
  style: {},
} as unknown as HTMLElement)

const getRadius = (viewPoint: ViewPoint): number =>
  new Vector3().subVectors(viewPoint.position, viewPoint.getTarget()).length()

describe("ViewPoint zoom", () => {
  const originalDocument = globalThis.document

  beforeEach(() => {
    ;(globalThis as { document?: Document }).document = createEventTargetStub() as unknown as Document
  })

  afterEach(() => {
    if (originalDocument === undefined) delete (globalThis as { document?: Document }).document
    else (globalThis as { document?: Document }).document = originalDocument
  })

  test("не вязнет на малой глубине при zoom-in", () => {
    const viewPoint = new ViewPoint({
      element: createElementStub(),
      near: 1,
      position: { x: 0.2, y: 0, z: 0 },
      target: { x: 0, y: 0, z: 0 },
    })

    viewPoint.zoom(20)

    expect(getRadius(viewPoint)).toBeLessThan(0.18)
  })

  test("пускает камеру ближе старого жесткого минимума", () => {
    const viewPoint = new ViewPoint({
      element: createElementStub(),
      near: 1,
      position: { x: 0.2, y: 0, z: 0 },
      target: { x: 0, y: 0, z: 0 },
    })

    viewPoint.zoom(100)

    expect(getRadius(viewPoint)).toBeLessThan(0.1)
  })

  test("держит world-точку под курсором при zoom-to-cursor", () => {
    const viewPoint = new ViewPoint({
      element: createElementStub(),
      near: 1,
      position: { x: 0, y: -10, z: 0 },
      target: { x: 0, y: 0, z: 0 },
    })
    const privateViewPoint = viewPoint as unknown as {
      targetPlanePointForClient(clientX: number, clientY: number): Vector3 | null
    }
    const anchor = {clientX: 960, clientY: 360}
    const before = privateViewPoint.targetPlanePointForClient(anchor.clientX, anchor.clientY)
    expect(before).not.toBeNull()

    viewPoint.zoom(40, anchor)

    const after = privateViewPoint.targetPlanePointForClient(anchor.clientX, anchor.clientY)
    expect(after).not.toBeNull()
    expect(after!.distanceTo(before!)).toBeLessThan(0.001)
  })

  test("выравнивает горизонт по мировой оси Z для программной навигации", () => {
    const viewPoint = new ViewPoint({
      element: createElementStub(),
      near: 1,
      position: { x: 0.2, y: -0.2, z: 0.2 },
      target: { x: 0, y: 0, z: 0 },
    })

    viewPoint.orbit(0, 40)
    expect(viewPoint.getUp().z).toBeLessThan(0.999)

    viewPoint.alignUpToWorldZ()

    expect(viewPoint.getUp()).toEqual(new Vector3(0, 0, 1))
  })

  test("не отдаёт сингулярную viewMatrix, когда up параллелен направлению камеры", () => {
    const errors: unknown[] = []
    const originalError = console.error
    console.error = (...args: unknown[]) => {
      errors.push(args)
    }

    try {
      const viewPoint = new ViewPoint({
        element: createElementStub(),
        near: 1,
        position: { x: 0, y: -10, z: 0 },
        target: { x: 0, y: 0, z: 0 },
      })
      viewPoint.getUp().set(0, -1, 0)

      viewPoint.update()
      new Matrix4().copy(viewPoint.viewMatrix).invert()

      expect(Math.abs(viewPoint.viewMatrix.determinant())).toBeGreaterThan(0.99)
      expect(errors).toEqual([])
    } finally {
      console.error = originalError
    }
  })

  test("разводит position и target, если они совпали", () => {
    const viewPoint = new ViewPoint({
      element: createElementStub(),
      near: 1,
      position: { x: 0, y: -10, z: 0 },
      target: { x: 0, y: 0, z: 0 },
    })

    viewPoint.position.copy(viewPoint.getTarget())
    viewPoint.update()

    expect(getRadius(viewPoint)).toBeGreaterThan(0)
    expect(Math.abs(viewPoint.viewMatrix.determinant())).toBeGreaterThan(0.99)
  })

  test("даёт composition owner маршрутизировать orbit и pan без browser event", () => {
    const viewPoint = new ViewPoint({
      element: createElementStub(),
      near: 1,
      position: { x: 0, y: -10, z: 0 },
      target: { x: 0, y: 0, z: 0 },
    })
    viewPoint.dispose()
    const radius = getRadius(viewPoint)

    viewPoint.orbit(20, -10)
    const orbitPosition = viewPoint.position.clone()
    viewPoint.pan(12, -8)

    expect(getRadius(viewPoint)).toBeCloseTo(radius, 8)
    expect(viewPoint.position).not.toEqual(orbitPosition)
    expect(Math.abs(viewPoint.viewMatrix.determinant())).toBeGreaterThan(0.99)
  })

  test("отклоняет нечисловые routed camera deltas", () => {
    const viewPoint = new ViewPoint({
      element: createElementStub(),
      near: 1,
      position: { x: 0, y: -10, z: 0 },
      target: { x: 0, y: 0, z: 0 },
    })

    expect(() => viewPoint.orbit(Number.NaN, 0)).toThrow(RangeError)
    expect(() => viewPoint.pan(0, Number.POSITIVE_INFINITY)).toThrow(RangeError)
    expect(() => viewPoint.zoom(1, {clientX: Number.NaN, clientY: 0})).toThrow(RangeError)
  })
})
