export type IndexedPaintBounds = Readonly<{index: number; minX: number; minY: number; maxX: number; maxY: number}>

/** Immutable interval index over painted bounds, including glyph ink and shadow fringes. */
export class PaintVisibilityIndex {
  readonly #ordered: readonly IndexedPaintBounds[]
  readonly #maximumBottom: Float64Array
  readonly #unbounded: readonly number[]

  constructor(bounds: readonly IndexedPaintBounds[]) {
    this.#unbounded = bounds.filter(value => ![value.minX, value.minY, value.maxX, value.maxY].every(Number.isFinite)).map(value => value.index)
    this.#ordered = bounds.filter(value => [value.minX, value.minY, value.maxX, value.maxY].every(Number.isFinite))
      .sort((left, right) => left.minY - right.minY)
    this.#maximumBottom = new Float64Array(this.#ordered.length)
    let maximum = -Infinity
    for (let index = 0; index < this.#ordered.length; index++) {
      maximum = Math.max(maximum, this.#ordered[index]!.maxY)
      this.#maximumBottom[index] = maximum
    }
  }

  query(bounds: Readonly<{minX: number; minY: number; maxX: number; maxY: number}>): number[] {
    if (bounds.minX > bounds.maxX || bounds.minY > bounds.maxY) return []
    let low = 0
    let high = this.#ordered.length
    while (low < high) {
      const middle = (low + high) >>> 1
      if (this.#maximumBottom[middle]! < bounds.minY) low = middle + 1
      else high = middle
    }
    const result = [...this.#unbounded]
    for (let index = low; index < this.#ordered.length; index++) {
      const value = this.#ordered[index]!
      if (value.minY > bounds.maxY) break
      if (value.maxY >= bounds.minY && value.minX <= bounds.maxX && value.maxX >= bounds.minX) result.push(value.index)
    }
    return result
  }
}
