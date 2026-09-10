import type {DOMRectInit, Element} from "@zavx0z/dom"
import type {CreateDocumentRendererOptions, RenderFrame} from "./types.ts"

/** Border geometry only: overflow clips, shadows, opacity and hit inflation do not alter it. */
export function readFrameClientRects(frame: RenderFrame, element: Element, project?: CreateDocumentRendererOptions["projectClientPoint"]): readonly Readonly<DOMRectInit>[] {
  const box = frame.boxByNode.get(element)
  if (box === undefined) return []
  const transform = box.transform
  const rects = box.fragments ?? [box]
  return rects.flatMap(rect => {
    const points = [
      {x: rect.x, y: rect.y},
      {x: rect.x + rect.width, y: rect.y},
      {x: rect.x + rect.width, y: rect.y + rect.height},
      {x: rect.x, y: rect.y + rect.height},
    ].map(point => ({x: point.x * transform.scaleX + transform.translateX, y: point.y * transform.scaleY + transform.translateY}))
    const projected = project === undefined ? points : points.map(project)
    if (projected.some(point => point === null)) return []
    const valid = projected as readonly Readonly<{x: number; y: number}>[]
    if (valid.some(point => !Number.isFinite(point.x) || !Number.isFinite(point.y))) throw new Error("Client geometry projection must be finite")
    const left = Math.min(...valid.map(point => point.x))
    const top = Math.min(...valid.map(point => point.y))
    const right = Math.max(...valid.map(point => point.x))
    const bottom = Math.max(...valid.map(point => point.y))
    return [{x: left, y: top, width: right - left, height: bottom - top}]
  })
}

/** Дробная объединённая border-box рамка до transforms и Browser projection. */
export function readFrameLayoutRect(frame: RenderFrame, element: Element): Readonly<DOMRectInit> | null {
  const box = frame.boxByNode.get(element)
  if (box === undefined) return null
  // Размер уже вычислен layout: восстановление через дальнюю грань теряет точность при переносе.
  if (box.fragments === undefined) return {x: box.x, y: box.y, width: box.width, height: box.height}
  const rects = box.fragments
  const left = Math.min(...rects.map(rect => rect.x))
  const top = Math.min(...rects.map(rect => rect.y))
  const right = Math.max(...rects.map(rect => rect.x + rect.width))
  const bottom = Math.max(...rects.map(rect => rect.y + rect.height))
  return {x: left, y: top, width: right - left, height: bottom - top}
}
