type TouchCameraSurface = Pick<
  HTMLCanvasElement,
  "addEventListener" | "removeEventListener"
> & Readonly<{
  style?: {touchAction: string}
}>

/** Claims and restores the native touch surface owned by one Experience. */
export const claimTouchCameraSurface = (
  canvas: TouchCameraSurface,
): (() => void) => {
  const previousTouchAction = canvas.style?.touchAction ?? null
  if (canvas.style !== undefined) canvas.style.touchAction = "none"
  const onGestureStart = (event: Event): void => {
    if (event.cancelable) event.preventDefault()
  }
  canvas.addEventListener("gesturestart", onGestureStart, {passive: false})
  let released = false
  return () => {
    if (released) return
    released = true
    canvas.removeEventListener("gesturestart", onGestureStart)
    if (canvas.style !== undefined && previousTouchAction !== null) {
      canvas.style.touchAction = previousTouchAction
    }
  }
}
