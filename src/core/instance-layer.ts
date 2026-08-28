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
  private _generations: Uint32Array
  private _alive: Uint8Array
  private _orderIndexBySlot: Int32Array
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
    this._handles = new Array(initialCapacity)
  }

  public get count(): number {
    return this._count
  }

  public get capacity(): number {
    return this.recordAttribute.count
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

    this.recordAttribute.array = nextRecords
    this.orderAttribute.array = nextOrder
    this._generations = nextGenerations
    this._alive = nextAlive
    this._orderIndexBySlot = nextOrderIndices
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

  /** Moves presentation order without moving the physical record. */
  public move(handle: InstanceHandle, orderIndex: number): this {
    const slot = this.requireSlot(handle)
    this.assertOrderIndex(orderIndex)
    const previousIndex = this._orderIndexBySlot[slot]!
    if (previousIndex === orderIndex) return this

    if (previousIndex < orderIndex) {
      for (let index = previousIndex; index < orderIndex; index++) {
        const shiftedSlot = this.order[index + 1]!
        this.order[index] = shiftedSlot
        this._orderIndexBySlot[shiftedSlot] = index
      }
    } else {
      for (let index = previousIndex; index > orderIndex; index--) {
        const shiftedSlot = this.order[index - 1]!
        this.order[index] = shiftedSlot
        this._orderIndexBySlot[shiftedSlot] = index
      }
    }
    this.order[orderIndex] = slot
    this._orderIndexBySlot[slot] = orderIndex
    this.orderAttribute.addUpdateRange(
      Math.min(previousIndex, orderIndex),
      Math.abs(previousIndex - orderIndex) + 1,
    )
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
