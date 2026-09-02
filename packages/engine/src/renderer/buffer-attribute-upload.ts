import type {BufferAttribute} from "../core/buffer-attribute"

export interface BufferAttributeUploadRange {
  readonly byteOffset: number
  readonly byteLength: number
}

/** Deterministic CPU plan for one cached GPU attribute buffer. */
export interface BufferAttributeUploadPlan {
  readonly sourceVersion: number
  readonly sourceByteLength: number
  readonly requiredCapacity: number
  readonly reallocate: boolean
  readonly ranges: readonly BufferAttributeUploadRange[]
}

export type BufferAttributeRangeWriter = (
  destinationByteOffset: number,
  source: Uint8Array,
) => void

function alignDown4(value: number): number {
  return value - value % 4
}

function alignUp4(value: number): number {
  return Math.ceil(value / 4) * 4
}

function appendCoalesced(
  ranges: BufferAttributeUploadRange[],
  byteOffset: number,
  byteEnd: number,
): void {
  const last = ranges.at(-1)
  if (last && byteOffset <= last.byteOffset + last.byteLength) {
    ranges[ranges.length - 1] = {
      byteOffset: last.byteOffset,
      byteLength: Math.max(last.byteOffset + last.byteLength, byteEnd) - last.byteOffset,
    }
    return
  }
  ranges.push({byteOffset, byteLength: byteEnd - byteOffset})
}

/**
 * Converts element-dirty ranges to the smallest legal WebGPU byte writes.
 *
 * WebGPU queue writes require four-byte aligned destinations and sizes. A
 * sub-four-byte producer interval is therefore expanded only to its enclosing
 * four-byte words. Reallocation and a cache that missed an acknowledged
 * revision always produce one complete upload.
 */
export function planBufferAttributeUpload(
  attribute: BufferAttribute,
  currentCapacity: number,
  synchronizedVersion?: number,
): BufferAttributeUploadPlan {
  if (!Number.isInteger(currentCapacity) || currentCapacity < 0) {
    throw new RangeError(`GPU buffer capacity must be a non-negative integer, received ${currentCapacity}`)
  }
  if (
    synchronizedVersion !== undefined
    && (!Number.isInteger(synchronizedVersion) || synchronizedVersion < 0)
  ) {
    throw new RangeError(
      `Synchronized BufferAttribute version must be a non-negative integer, received ${synchronizedVersion}`,
    )
  }

  const sourceByteLength = attribute.array.byteLength
  const requiredCapacity = Math.max(4, alignUp4(sourceByteLength))
  const reallocate = currentCapacity < requiredCapacity
  const sourceVersion = attribute.version
  const revisionChanged = synchronizedVersion !== sourceVersion
  const missedPendingHistory = synchronizedVersion !== undefined
    && (
      synchronizedVersion < attribute.updateBaseVersion
      || synchronizedVersion > sourceVersion
    )
  const fullUpload = reallocate
    || synchronizedVersion === undefined
    || attribute.fullUpdateRequired
    || missedPendingHistory
    || (revisionChanged && !attribute.needsUpdate)
  const ranges: BufferAttributeUploadRange[] = []

  if (sourceByteLength > 0 && fullUpload) {
    ranges.push({byteOffset: 0, byteLength: alignUp4(sourceByteLength)})
  } else if (revisionChanged && attribute.needsUpdate) {
    const bytesPerElement = attribute.array.BYTES_PER_ELEMENT
    for (const range of attribute.updateRanges) {
      const byteOffset = alignDown4(range.offset * bytesPerElement)
      const byteEnd = alignUp4((range.offset + range.count) * bytesPerElement)
      appendCoalesced(ranges, byteOffset, byteEnd)
    }
  }

  return {
    sourceVersion,
    sourceByteLength,
    requiredCapacity,
    reallocate,
    ranges,
  }
}

function readUploadRange(
  attribute: BufferAttribute,
  range: BufferAttributeUploadRange,
): Uint8Array {
  const array = attribute.array
  const source = new Uint8Array(array.buffer, array.byteOffset, array.byteLength)
  const availableEnd = Math.min(source.byteLength, range.byteOffset + range.byteLength)

  if (availableEnd === range.byteOffset + range.byteLength) {
    return source.subarray(range.byteOffset, availableEnd)
  }

  const padded = new Uint8Array(range.byteLength)
  if (availableEnd > range.byteOffset) {
    padded.set(source.subarray(range.byteOffset, availableEnd))
  }
  return padded
}

/**
 * Applies a previously computed upload plan to a queue-like seam.
 * Dirty state is acknowledged only after every write has succeeded.
 */
export function applyBufferAttributeUploadPlan(
  attribute: BufferAttribute,
  plan: BufferAttributeUploadPlan,
  write: BufferAttributeRangeWriter,
): void {
  if (attribute.array.byteLength !== plan.sourceByteLength) {
    throw new Error("BufferAttribute storage changed after its upload plan was created")
  }
  if (attribute.version !== plan.sourceVersion) {
    throw new Error("BufferAttribute changed after its upload plan was created")
  }

  for (const range of plan.ranges) {
    if (attribute.version !== plan.sourceVersion) {
      throw new Error("BufferAttribute changed while its upload plan was being applied")
    }
    write(range.byteOffset, readUploadRange(attribute, range))
  }
  if (attribute.version !== plan.sourceVersion) {
    throw new Error("BufferAttribute changed while its upload plan was being applied")
  }
  attribute.clearUpdateRanges()
}
