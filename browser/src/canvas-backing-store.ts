/** Browser-owned conversion from logical CSS size to physical canvas pixels. */
export const resizeCanvasBackingStore = (
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  pixelRatio: number,
): boolean => {
  const nextWidth = Math.max(1, Math.floor(width * pixelRatio))
  const nextHeight = Math.max(1, Math.floor(height * pixelRatio))
  if (canvas.width === nextWidth && canvas.height === nextHeight) return false
  canvas.width = nextWidth
  canvas.height = nextHeight
  return true
}
