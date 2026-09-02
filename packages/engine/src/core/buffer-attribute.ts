/** Typed arrays accepted by retained geometry and instance buffers. */
export type TypedArray =
  | Float32Array
  | Uint32Array
  | Uint16Array
  | Uint8Array
  | Int32Array
  | Int16Array
  | Int8Array

/**
 * A half-open dirty interval in typed-array elements.
 *
 * `offset` and `count` intentionally use elements rather than bytes so a
 * producer can mark the exact values it changed without knowing the backing
 * scalar width. Renderer converts the range to WebGPU-aligned byte writes.
 */
export interface BufferAttributeUpdateRange {
  readonly offset: number
  readonly count: number
}

const MAX_PARTIAL_UPDATE_RANGES = 64

function assertItemSize(itemSize: number): void {
  if (!Number.isInteger(itemSize) || itemSize <= 0) {
    throw new RangeError(`BufferAttribute itemSize must be a positive integer, received ${itemSize}`)
  }
}

function assertArrayLength(array: TypedArray, itemSize: number): void {
  if (array.length % itemSize !== 0) {
    throw new RangeError(
      `BufferAttribute array length ${array.length} must be divisible by itemSize ${itemSize}`,
    )
  }
}

/**
 * Retained typed-array data with an explicit partial-upload lifecycle.
 *
 * Direct writes to {@link array} are allocation-free. Afterwards a producer
 * calls {@link addUpdateRange} for the changed elements. The renderer consumes
 * and clears those ranges only after every corresponding queue write succeeds.
 * Assigning `needsUpdate = true` remains the full-buffer compatibility path.
 */
export class BufferAttribute {
  public readonly isBufferAttribute: true = true
  public readonly itemSize: number
  public readonly normalized: boolean

  private _array: TypedArray
  private _fullUpdateRequired = false
  private _updateRanges: BufferAttributeUpdateRange[] = []
  private _version = 0
  private _updateBaseVersion = 0

  public constructor(array: TypedArray, itemSize: number, normalized = false) {
    assertItemSize(itemSize)
    assertArrayLength(array, itemSize)
    this._array = array
    this.itemSize = itemSize
    this.normalized = normalized
  }

  /** The live CPU storage. Replacing it schedules one full upload. */
  public get array(): TypedArray {
    return this._array
  }

  public set array(array: TypedArray) {
    assertArrayLength(array, this.itemSize)
    this._array = array
    this.needsUpdate = true
  }

  /** Number of complete records in the attribute. */
  public get count(): number {
    return this._array.length / this.itemSize
  }

  /** True while either a full upload or one or more bounded writes are pending. */
  public get needsUpdate(): boolean {
    return this._fullUpdateRequired || this._updateRanges.length > 0
  }

  /**
   * Compatibility lifecycle: `true` supersedes partial ranges with one full
   * upload, while `false` acknowledges and clears every pending update.
   */
  public set needsUpdate(value: boolean) {
    if (value) {
      if (!this.needsUpdate) this._updateBaseVersion = this._version
      this._version += 1
      this._fullUpdateRequired = true
      this._updateRanges = []
      return
    }
    this.clearUpdateRanges()
  }

  public get fullUpdateRequired(): boolean {
    return this._fullUpdateRequired
  }

  /**
   * Monotonic producer revision used by each renderer cache independently.
   * Clearing acknowledged dirty ranges never changes this value.
   */
  public get version(): number {
    return this._version
  }

  /** Oldest cache revision that the pending partial ranges can update. */
  public get updateBaseVersion(): number {
    return this._updateBaseVersion
  }

  /** Sorted, non-overlapping and non-adjacent pending element ranges. */
  public get updateRanges(): readonly BufferAttributeUpdateRange[] {
    return this._updateRanges
  }

  /**
   * Adds one changed element interval and coalesces overlap or adjacency.
   * A pending full upload already covers the interval and is left unchanged.
   */
  public addUpdateRange(offset: number, count: number): this {
    if (!Number.isInteger(offset) || offset < 0) {
      throw new RangeError(`BufferAttribute update offset must be a non-negative integer, received ${offset}`)
    }
    if (!Number.isInteger(count) || count <= 0) {
      throw new RangeError(`BufferAttribute update count must be a positive integer, received ${count}`)
    }
    if (offset + count > this._array.length) {
      throw new RangeError(
        `BufferAttribute update range [${offset}, ${offset + count}) exceeds array length ${this._array.length}`,
      )
    }
    if (!this.needsUpdate) this._updateBaseVersion = this._version
    this._version += 1
    if (this._fullUpdateRequired) return this

    const ranges = this._updateRanges
    let low = 0
    let high = ranges.length
    while (low < high) {
      const middle = (low + high) >>> 1
      const range = ranges[middle]!
      if (range.offset + range.count < offset) low = middle + 1
      else high = middle
    }

    const first = low
    let start = offset
    let end = offset + count
    while (low < ranges.length && ranges[low]!.offset <= end) {
      const range = ranges[low]!
      start = Math.min(start, range.offset)
      end = Math.max(end, range.offset + range.count)
      low += 1
    }
    ranges.splice(first, low - first, {offset: start, count: end - start})
    if (ranges.length > MAX_PARTIAL_UPDATE_RANGES) {
      this._fullUpdateRequired = true
      this._updateRanges = []
    }
    return this
  }

  /** Acknowledges all pending uploads. Renderer calls this after successful writes. */
  public clearUpdateRanges(): this {
    this._fullUpdateRequired = false
    this._updateRanges = []
    this._updateBaseVersion = this._version
    return this
  }
}

/** Float32 convenience attribute used by positions and other numeric data. */
export class Float32BufferAttribute extends BufferAttribute {
  public constructor(array: number[] | Float32Array, itemSize: number, normalized = false) {
    super(new Float32Array(array), itemSize, normalized)
  }
}
