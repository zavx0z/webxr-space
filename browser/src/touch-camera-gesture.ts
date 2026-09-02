import type {ViewPoint} from "@zavx0z/engine"

export type TouchCameraPoint = Readonly<{
  pointerId: number
  clientX: number
  clientY: number
}>

type TouchCameraTarget = Pick<ViewPoint, "orbit" | "pan" | "zoom">

/** Applies the former ViewPoint touch law after Browser has routed ownership. */
export const applyTouchCameraGesture = (
  target: TouchCameraTarget,
  before: readonly TouchCameraPoint[],
  after: readonly TouchCameraPoint[],
): boolean => {
  if (before.length !== after.length || before.length === 0 || before.length > 2) return false
  if (!before.every((point, index) => point.pointerId === after[index]?.pointerId)) return false

  if (before.length === 1) {
    target.orbit(
      after[0]!.clientX - before[0]!.clientX,
      after[0]!.clientY - before[0]!.clientY,
    )
    return true
  }

  const previous = touchPair(before[0]!, before[1]!)
  const current = touchPair(after[0]!, after[1]!)
  target.zoom(current.distance - previous.distance, {
    clientX: current.clientX,
    clientY: current.clientY,
  })
  target.pan(
    -(current.clientX - previous.clientX),
    -(current.clientY - previous.clientY),
  )
  return true
}

const touchPair = (
  first: TouchCameraPoint,
  second: TouchCameraPoint,
): Readonly<{clientX: number; clientY: number; distance: number}> => {
  const deltaX = first.clientX - second.clientX
  const deltaY = first.clientY - second.clientY
  return {
    clientX: (first.clientX + second.clientX) / 2,
    clientY: (first.clientY + second.clientY) / 2,
    distance: Math.hypot(deltaX, deltaY),
  }
}
