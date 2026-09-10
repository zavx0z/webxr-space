import type {MarkerPlacement} from "./contracts.ts"

type Point = Readonly<{x: number; y: number}>
export type ArrowSize = Readonly<{length: number; width: number; offset: number}>

/** Общая геометрия Arrow и совместимого advanced API; не измеряет DOM и не меняет маршрут. */
export function arrowGeometry(placement: MarkerPlacement, size: ArrowSize, filled: boolean) {
  if (!Number.isFinite(size.length + size.width + size.offset) || size.length <= 0 || size.width <= 0 || size.offset < 0) throw new TypeError("Недопустимый размер маркера")
  const {x: dx, y: dy} = placement.direction
  const endpoint = placement.position
  if (![endpoint.x, endpoint.y, dx, dy].every(Number.isFinite) || Math.abs(Math.hypot(dx, dy) - 1) > 1e-6) throw new TypeError("Недопустимая привязка маркера")
  const point = (x: number, y: number): Point => ({x: x === 0 ? 0 : x, y: y === 0 ? 0 : y})
  const tip = point(endpoint.x - dx * size.offset, endpoint.y - dy * size.offset)
  const left = point(tip.x - dx * size.length - dy * size.width / 2, tip.y - dy * size.length + dx * size.width / 2)
  const right = point(tip.x - dx * size.length + dy * size.width / 2, tip.y - dy * size.length - dx * size.width / 2)
  const values = filled ? [tip, left, right, tip] : [left, tip, right]
  return {tip, points: [tip, left, right] as const, d: values.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")}
}
