import {BufferAttribute} from "./buffer-attribute"

const MAX_TYPED_ARRAY_BYTES = 0xffff_ffff

/** Canonical, non-transferable identity for one live slot in an {@link InstanceLayer}. */
export interface InstanceHandle {
  readonly slot: number
  readonly generation: number
}

export interface InstanceLayerOptions {
  /** Fixed opaque record stride. Must remain four-byte aligned for WebGPU. */
  readonly recordByteLength: number
  /** Eager CPU capacity. Growth doubles geometrically from this value. */
  readonly initialCapacity?: number
  /** Required owner bound. Allocation fails rather than silently exceeding it. */
  readonly maxCapacity: number
}

function assertPositiveInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new RangeError(`${label} must be a positive integer, received ${value}`)
  }
}

function assertNonNegativeInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`${label} must be a non-negative integer, received ${value}`)
  }
}

function asBytes(record: ArrayBufferView): Uint8Array {
  if (!ArrayBuffer.isView(record)) {
    throw new TypeError("Instance record must be an ArrayBuffer view")
  }
  if (record instanceof Uint8Array) return record
  return new Uint8Array(record.buffer, record.byteOffset, record.byteLength)
}

/**
 * Dynamic retained owner for packed per-instance data.
 *
 * Stable physical slots are separate from dense presentation order. Removing
 * an item only shifts `orderAttribute`; records never move and no per-item
 * `Mesh` is allocated. Handles carry a generation so a released slot cannot be
 * mutated through stale identity after free-list reuse.
 *
 * The record bytes are deliberately opaque to Engine. A Renderer adapter owns
 * the future shader/storage layout and consumes `recordAttribute`,
 * `orderAttribute`, and `count` without importing DOM or product semantics.
 */
export class InstanceLayer {
  public readonly isInstanceLayer: true = true
  public readonly recordByteLength: number
  public readonly maxCapacity: number
  public readonly recordAttribute: BufferAttribute
  public readonly orderAttribute: BufferAttribute

  private _count = 0
  private _nextSlot = 0
  private _ownershipVersion = 0
  private _generations: Uint32Array
  private _alive: Uint8Array
  private _orderIndexBySlot: Int32Array
  private _reorderMarks: Uint32Array
  private _reorderEpoch = 0
  private readonly _freeSlots: number[] = []
  private _handles: Array<InstanceHandle | undefined>

  public constructor(options: InstanceLayerOptions) {
    assertPositiveInteger(options.recordByteLength, "InstanceLayer recordByteLength")
    if (options.recordByteLength % 4 !== 0) {
      throw new RangeError("InstanceLayer recordByteLength must be a multiple of four bytes")
    }

    const hardMaxCapacity = Math.min(
      Math.floor(MAX_TYPED_ARRAY_BYTES / options.recordByteLength),
      Math.floor(MAX_TYPED_ARRAY_BYTES / Uint32Array.BYTES_PER_ELEMENT),
    )
    const maxCapacity = options.maxCapacity
    assertPositiveInteger(maxCapacity, "InstanceLayer maxCapacity")
    const initialCapacity = options.initialCapacity ?? Math.min(16, maxCapacity)
    assertNonNegativeInteger(initialCapacity, "InstanceLayer initialCapacity")
    if (maxCapacity > hardMaxCapacity) {
      throw new RangeError(
        `InstanceLayer maxCapacity ${maxCapacity} exceeds the typed-array bound ${hardMaxCapacity}`,
      )
    }
    if (initialCapacity > maxCapacity) {
      throw new RangeError(
        `InstanceLayer initialCapacity ${initialCapacity} exceeds maxCapacity ${maxCapacity}`,
      )
    }

    this.recordByteLength = options.recordByteLength
    this.maxCapacity = maxCapacity
    this.recordAttribute = new BufferAttribute(
      new Uint8Array(initialCapacity * options.recordByteLength),
      options.recordByteLength,
    )
    this.orderAttribute = new BufferAttribute(new Uint32Array(initialCapacity), 1)
    this._generations = new Uint32Array(initialCapacity)
    this._alive = new Uint8Array(initialCapacity)
    this._orderIndexBySlot = new Int32Array(initialCapacity)
    this._orderIndexBySlot.fill(-1)
    this._reorderMarks = new Uint32Array(initialCapacity)
    this._handles = new Array(initialCapacity)
  }

  public get count(): number {
    return this._count
  }

  public get capacity(): number {
    return this.recordAttribute.count
  }

  /** Lifecycle revision. Paint order and record edits do not change it. */
  public get ownershipVersion(): number {
    return this._ownershipVersion
  }

  public get records(): Uint8Array {
    return this.recordAttribute.array as Uint8Array
  }

  public get order(): Uint32Array {
    return this.orderAttribute.array as Uint32Array
  }

  /** Ensures capacity without changing any handle, slot, record or order. */
  public reserve(minimumCapacity: number): this {
    if (!Number.isInteger(minimumCapacity) || minimumCapacity < 0) {
      throw new RangeError(`InstanceLayer reserve capacity must be a non-negative integer, received ${minimumCapacity}`)
    }
    if (minimumCapacity <= this.capacity) return this
    if (minimumCapacity > this.maxCapacity) {
      throw new RangeError(
        `InstanceLayer capacity ${minimumCapacity} exceeds maxCapacity ${this.maxCapacity}`,
      )
    }

    let nextCapacity = this.capacity
    while (nextCapacity < minimumCapacity) {
      nextCapacity = Math.min(this.maxCapacity, Math.max(1, nextCapacity * 2))
    }

    const nextRecords = new Uint8Array(nextCapacity * this.recordByteLength)
    nextRecords.set(this.records)
    const nextOrder = new Uint32Array(nextCapacity)
    nextOrder.set(this.order)
    const nextGenerations = new Uint32Array(nextCapacity)
    nextGenerations.set(this._generations)
    const nextAlive = new Uint8Array(nextCapacity)
    nextAlive.set(this._alive)
    const nextOrderIndices = new Int32Array(nextCapacity)
    nextOrderIndices.fill(-1)
    nextOrderIndices.set(this._orderIndexBySlot)
    const nextReorderMarks = new Uint32Array(nextCapacity)
    nextReorderMarks.set(this._reorderMarks)

    this.recordAttribute.array = nextRecords
    this.orderAttribute.array = nextOrder
    this._generations = nextGenerations
    this._alive = nextAlive
    this._orderIndexBySlot = nextOrderIndices
    this._reorderMarks = nextReorderMarks
    this._handles.length = nextCapacity
    return this
  }

  /** Allocates one stable slot and inserts it into dense presentation order. */
  public allocate(record: ArrayBufferView, orderIndex = this._count): InstanceHandle {
    const bytes = asBytes(record)
    this.assertCompleteRecord(bytes)
    this.assertInsertionIndex(orderIndex)

    let slot = this._freeSlots.pop()
    if (slot === undefined) {
      this.reserve(this._nextSlot + 1)
      slot = this._nextSlot
      this._nextSlot += 1
    }

    if (this._generations[slot] === 0) this._generations[slot] = 1
    this._alive[slot] = 1
    const handle = Object.freeze({slot, generation: this._generations[slot]!})
    this._handles[slot] = handle

    const recordOffset = slot * this.recordByteLength
    this.records.set(bytes, recordOffset)
    this.recordAttribute.addUpdateRange(recordOffset, this.recordByteLength)
    this.insertOrderSlot(slot, orderIndex)
    this._ownershipVersion += 1
    return handle
  }

  public has(handle: InstanceHandle): boolean {
    const slot = handle?.slot
    return Number.isInteger(slot)
      && slot >= 0
      && slot < this._nextSlot
      && this._alive[slot] === 1
      && this._generations[slot] === handle.generation
      && this._handles[slot] === handle
  }

  /** Replaces the complete opaque record without changing identity or order. */
  public setRecord(handle: InstanceHandle, record: ArrayBufferView): this {
    const slot = this.requireSlot(handle)
    const bytes = asBytes(record)
    this.assertCompleteRecord(bytes)
    const recordOffset = slot * this.recordByteLength
    this.records.set(bytes, recordOffset)
    this.recordAttribute.addUpdateRange(recordOffset, this.recordByteLength)
    return this
  }

  /** Updates a bounded byte interval inside one opaque record. */
  public updateRecord(handle: InstanceHandle, byteOffset: number, data: ArrayBufferView): this {
    const slot = this.requireSlot(handle)
    if (!Number.isInteger(byteOffset) || byteOffset < 0) {
      throw new RangeError(`Instance record byteOffset must be a non-negative integer, received ${byteOffset}`)
    }
    const bytes = asBytes(data)
    if (byteOffset + bytes.byteLength > this.recordByteLength) {
      throw new RangeError(
        `Instance record update [${byteOffset}, ${byteOffset + bytes.byteLength}) exceeds stride ${this.recordByteLength}`,
      )
    }
    if (bytes.byteLength === 0) return this

    const destination = slot * this.recordByteLength + byteOffset
    this.records.set(bytes, destination)
    this.recordAttribute.addUpdateRange(destination, bytes.byteLength)
    return this
  }

  /** Copies one record into caller-owned storage, allocating only when omitted. */
  public readRecord(handle: InstanceHandle, target = new Uint8Array(this.recordByteLength)): Uint8Array {
    const slot = this.requireSlot(handle)
    if (target.byteLength < this.recordByteLength) {
      throw new RangeError(
        `Instance record target has ${target.byteLength} bytes, expected at least ${this.recordByteLength}`,
      )
    }
    const start = slot * this.recordByteLength
    target.set(this.records.subarray(start, start + this.recordByteLength), 0)
    return target
  }

  /** Returns the stable handle at one dense presentation index. */
  public handleAt(orderIndex: number): InstanceHandle {
    this.assertOrderIndex(orderIndex)
    const slot = this.order[orderIndex]!
    return this._handles[slot]!
  }

  /** Returns the canonical live handle for one physical slot, or null. */
  public handleForSlot(slot: number): InstanceHandle | null {
    if (
      !Number.isInteger(slot)
      || slot < 0
      || slot >= this._nextSlot
      || this._alive[slot] !== 1
    ) return null
    return this._handles[slot] ?? null
  }

  /** Returns the current dense presentation index for one canonical live handle in O(1). */
  public orderIndexOf(handle: InstanceHandle): number {
    const slot = this.requireSlot(handle)
    return this._orderIndexBySlot[slot]!
  }

  /** Moves presentation order without moving the physical record. */
  public move(handle: InstanceHandle, orderIndex: number): this {
    const slot = this.requireSlot(handle)
    this.assertOrderIndex(orderIndex)
    const previousIndex = this._orderIndexBySlot[slot]!
    return this.moveRange(previousIndex, 1, orderIndex)
  }

  /**
   * Moves one consecutive dense-order block in O(the affected interval).
   *
   * `toIndex` is the block's final start index in the resulting order, not an
   * insertion index in an intermediate post-removal array. The complete source
   * and destination ranges are validated before mutation. Physical records,
   * canonical handles, generations and {@link ownershipVersion} never change.
   * One exact interval covering the rotated range becomes upload-dirty.
   */
  public moveRange(firstIndex: number, count: number, toIndex: number): this {
    if (!Number.isInteger(firstIndex) || firstIndex < 0) {
      throw new RangeError(
        `InstanceLayer moveRange firstIndex must be a non-negative integer, received ${firstIndex}`,
      )
    }
    if (!Number.isInteger(count) || count <= 0) {
      throw new RangeError(
        `InstanceLayer moveRange count must be a positive integer, received ${count}`,
      )
    }
    if (firstIndex + count > this._count) {
      throw new RangeError(
        `InstanceLayer moveRange source [${firstIndex}, ${firstIndex + count}) exceeds count ${this._count}`,
      )
    }
    if (!Number.isInteger(toIndex) || toIndex < 0 || toIndex + count > this._count) {
      throw new RangeError(
        `InstanceLayer moveRange final range [${toIndex}, ${toIndex + count}) exceeds count ${this._count}`,
      )
    }
    if (firstIndex === toIndex) return this

    const dirtyStart = Math.min(firstIndex, toIndex)
    const dirtyEnd = Math.max(firstIndex, toIndex) + count
    if (firstIndex < toIndex) {
      this.reverseOrder(firstIndex, firstIndex + count)
      this.reverseOrder(firstIndex + count, dirtyEnd)
      this.reverseOrder(firstIndex, dirtyEnd)
    } else {
      this.reverseOrder(toIndex, firstIndex)
      this.reverseOrder(firstIndex, firstIndex + count)
      this.reverseOrder(toIndex, firstIndex + count)
    }
    for (let orderIndex = dirtyStart; orderIndex < dirtyEnd; orderIndex += 1) {
      this._orderIndexBySlot[this.order[orderIndex]!] = orderIndex
    }
    this.orderAttribute.addUpdateRange(dirtyStart, dirtyEnd - dirtyStart)
    return this
  }

  /**
   * Atomically replaces the complete dense presentation order in O(n).
   *
   * The supplied list must contain every canonical live handle exactly once.
   * Validation completes before storage changes, so stale, foreign, duplicate
   * or incomplete input leaves the previous order and dirty state untouched.
   */
  public setOrder(handles: readonly InstanceHandle[]): this {
    if (!Array.isArray(handles)) {
      throw new TypeError("InstanceLayer order must be an array of canonical handles")
    }
    if (handles.length !== this._count) {
      throw new RangeError(
        `InstanceLayer order contains ${handles.length} handles, expected ${this._count}`,
      )
    }

    if (this._reorderEpoch === 0xffff_ffff) {
      this._reorderMarks.fill(0)
      this._reorderEpoch = 1
    } else {
      this._reorderEpoch += 1
    }
    for (const handle of handles) {
      if (!this.has(handle)) {
        throw new Error(`InstanceLayer order contains a stale or foreign handle`)
      }
      if (this._reorderMarks[handle.slot] === this._reorderEpoch) {
        throw new Error(`InstanceLayer order contains duplicate slot ${handle.slot}`)
      }
      this._reorderMarks[handle.slot] = this._reorderEpoch
    }

    let firstChanged = this._count
    let lastChanged = -1
    for (let orderIndex = 0; orderIndex < handles.length; orderIndex += 1) {
      const slot = handles[orderIndex]!.slot
      if (this.order[orderIndex] !== slot) {
        firstChanged = Math.min(firstChanged, orderIndex)
        lastChanged = orderIndex
        this.order[orderIndex] = slot
      }
      this._orderIndexBySlot[slot] = orderIndex
    }
    if (lastChanged >= firstChanged) {
      this.orderAttribute.addUpdateRange(firstChanged, lastChanged - firstChanged + 1)
    }
    return this
  }

  /** Releases one slot, invalidates its handle and keeps remaining order dense. */
  public remove(handle: InstanceHandle): void {
    const slot = this.requireSlot(handle)
    const orderIndex = this._orderIndexBySlot[slot]!
    const previousCount = this._count

    for (let index = orderIndex; index < previousCount - 1; index++) {
      const shiftedSlot = this.order[index + 1]!
      this.order[index] = shiftedSlot
      this._orderIndexBySlot[shiftedSlot] = index
    }
    this.order[previousCount - 1] = 0
    this._count -= 1
    this.orderAttribute.addUpdateRange(orderIndex, previousCount - orderIndex)

    this._alive[slot] = 0
    this._orderIndexBySlot[slot] = -1
    this._handles[slot] = undefined
    if (this._generations[slot] === 0xffff_ffff) {
      this._generations[slot] = 0
    } else {
      this._generations[slot] = this._generations[slot]! + 1
      this._freeSlots.push(slot)
    }
    this._ownershipVersion += 1
  }

  /** Releases every live item while preserving allocated capacity for reuse. */
  public clear(): void {
    const previousCount = this._count
    if (previousCount === 0) return

    for (let orderIndex = 0; orderIndex < previousCount; orderIndex++) {
      const slot = this.order[orderIndex]!
      this.order[orderIndex] = 0
      this._alive[slot] = 0
      this._orderIndexBySlot[slot] = -1
      this._handles[slot] = undefined
      if (this._generations[slot] === 0xffff_ffff) {
        this._generations[slot] = 0
      } else {
        this._generations[slot] = this._generations[slot]! + 1
        this._freeSlots.push(slot)
      }
    }
    this._count = 0
    this.orderAttribute.addUpdateRange(0, previousCount)
    this._ownershipVersion += 1
  }

  private insertOrderSlot(slot: number, orderIndex: number): void {
    for (let index = this._count; index > orderIndex; index--) {
      const shiftedSlot = this.order[index - 1]!
      this.order[index] = shiftedSlot
      this._orderIndexBySlot[shiftedSlot] = index
    }
    this.order[orderIndex] = slot
    this._orderIndexBySlot[slot] = orderIndex
    this._count += 1
    this.orderAttribute.addUpdateRange(orderIndex, this._count - orderIndex)
  }

  private reverseOrder(start: number, end: number): void {
    for (let left = start, right = end - 1; left < right; left += 1, right -= 1) {
      const value = this.order[left]!
      this.order[left] = this.order[right]!
      this.order[right] = value
    }
  }

  private requireSlot(handle: InstanceHandle): number {
    if (!this.has(handle)) {
      throw new Error(`InstanceLayer handle ${handle?.slot}:${handle?.generation} is stale or invalid`)
    }
    return handle.slot
  }

  private assertCompleteRecord(bytes: Uint8Array): void {
    if (bytes.byteLength !== this.recordByteLength) {
      throw new RangeError(
        `Instance record has ${bytes.byteLength} bytes, expected ${this.recordByteLength}`,
      )
    }
  }

  private assertInsertionIndex(orderIndex: number): void {
    if (!Number.isInteger(orderIndex) || orderIndex < 0 || orderIndex > this._count) {
      throw new RangeError(`Instance insertion index ${orderIndex} is outside [0, ${this._count}]`)
    }
  }

  private assertOrderIndex(orderIndex: number): void {
    if (!Number.isInteger(orderIndex) || orderIndex < 0 || orderIndex >= this._count) {
      throw new RangeError(`Instance order index ${orderIndex} is outside [0, ${this._count})`)
    }
  }
}
