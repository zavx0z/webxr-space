import type {GraphRect, GraphTransform, GraphViewport} from "./contracts.ts"

export const IDENTITY_TRANSFORM: GraphTransform = Object.freeze({x: 0, y: 0, scale: 1})

export function finite(value: number, label: string): number {
  if (!Number.isFinite(value)) throw new TypeError(`${label} must be finite`)
  return value
}

export function positive(value: number, label: string): number {
  finite(value, label)
  if (value <= 0) throw new RangeError(`${label} must be positive`)
  return value
}

export function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}

export function fitGraph(bounds: GraphRect, width: number, height: number, padding: number, minScale: number, maxScale: number): GraphTransform {
  const scale = clamp(Math.min(Math.max(1, width - padding * 2) / Math.max(1, bounds.width), Math.max(1, height - padding * 2) / Math.max(1, bounds.height)), minScale, maxScale)
  return Object.freeze({
    x: (width - bounds.width * scale) / 2 - bounds.x * scale,
    y: (height - bounds.height * scale) / 2 - bounds.y * scale,
    scale,
  })
}

export function intersects(viewport: GraphViewport | undefined, rect: GraphRect): boolean {
  if (viewport === undefined) return true
  const padding = viewport.overscan ?? 0
  return rect.x + rect.width >= viewport.x - padding && rect.x <= viewport.x + viewport.width + padding &&
    rect.y + rect.height >= viewport.y - padding && rect.y <= viewport.y + viewport.height + padding
}
