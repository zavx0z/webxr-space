import {BufferAttribute, BufferGeometry} from "./buffer-geometry"
import {InstanceLayer} from "./instance-layer"
import {Object3D} from "./object-3d"

/** Two storage-aligned vec4 values consumed by the stroked-path style ABI. */
export const STROKED_PATH_STYLE_RECORD_WORDS = 8
export const STROKED_PATH_STYLE_RECORD_BYTE_LENGTH =
  STROKED_PATH_STYLE_RECORD_WORDS * Uint32Array.BYTES_PER_ELEMENT

/** Two storage-aligned vec4 values consumed by the sampled-segment ABI. */
export const STROKED_PATH_SEGMENT_RECORD_WORDS = 8
export const STROKED_PATH_SEGMENT_RECORD_BYTE_LENGTH =
  STROKED_PATH_SEGMENT_RECORD_WORDS * Uint32Array.BYTES_PER_ELEMENT

/** Stable 32-bit word offsets for the renderer-owned style record. */
export const STROKED_PATH_STYLE_OFFSETS = Object.freeze({
  color: 0,
  params: 4,
} as const)

/** Stable 32-bit word offsets for the renderer-owned sampled-segment record. */
export const STROKED_PATH_SEGMENT_OFFSETS = Object.freeze({
  endpoints: 0,
  styleSlot: 4,
  styleGeneration: 5,
  reserved: 6,
} as const)

export interface StrokedPathInstanceLayerOptions {
  readonly initialStyleCapacity?: number
  readonly maxStyleCapacity: number
  readonly initialSegmentCapacity?: number
  readonly maxSegmentCapacity: number
}

/**
 * Shared retained storage for analytical stroked paths.
 *
 * Styles and sampled line segments use independent stable physical slots. A
 * segment stores the physical style slot at
 * {@link STROKED_PATH_SEGMENT_OFFSETS.styleSlot}; dense segment order controls
 * presentation without moving either record kind. Style order is deliberately
 * CPU-only because the GPU follows the explicit segment reference.
 *
 * The style record is `color: vec4<f32>` followed by
 * `params: vec4<f32>` (`width`, `opacity`, local `z`, reserved). The segment
 * record is `endpoints: vec4<f32>` (`fromX`, `fromY`, `toX`, `toY`) followed by
 * one `u32` style slot, its canonical `u32` generation and two reserved words.
 * Coordinates remain generic layer-local Engine coordinates; consumers own
 * any document-space mapping. This instanced fast path accepts only fully
 * opaque styles; continuous transparent joins require a scalar path owner.
 */
export class StrokedPathInstanceLayer {
  public readonly isStrokedPathInstanceLayer: true = true
  public readonly styles: InstanceLayer
  public readonly segments: InstanceLayer
  public readonly geometry: BufferGeometry
  private validatedStyleOwnershipVersion = -1
  private validatedStyleRecordVersion = -1
  private validatedSegmentRecordVersion = -1
  private styleFloats: Float32Array<ArrayBufferLike> = new Float32Array(0)
  private segmentFloats: Float32Array<ArrayBufferLike> = new Float32Array(0)
  private segmentWords: Uint32Array<ArrayBufferLike> = new Uint32Array(0)

  public constructor(options: StrokedPathInstanceLayerOptions) {
    this.styles = new InstanceLayer({
      recordByteLength: STROKED_PATH_STYLE_RECORD_BYTE_LENGTH,
      maxCapacity: options.maxStyleCapacity,
      ...(options.initialStyleCapacity === undefined
        ? {}
        : {initialCapacity: options.initialStyleCapacity}),
    })
    this.segments = new InstanceLayer({
      recordByteLength: STROKED_PATH_SEGMENT_RECORD_BYTE_LENGTH,
      maxCapacity: options.maxSegmentCapacity,
      ...(options.initialSegmentCapacity === undefined
        ? {}
        : {initialCapacity: options.initialSegmentCapacity}),
    })

    const geometry = new BufferGeometry()
    geometry.setAttribute("position", new BufferAttribute(new Float32Array([
      -0.5, 0.5, 0,
      0.5, 0.5, 0,
      -0.5, -0.5, 0,
      0.5, -0.5, 0,
    ]), 3))
    geometry.setIndex(new BufferAttribute(new Uint16Array([
      0, 2, 1,
      2, 3, 1,
    ]), 1))
    geometry.setAttribute("strokedPathStyleRecords", this.styles.recordAttribute)
    geometry.setAttribute("strokedPathSegmentRecords", this.segments.recordAttribute)
    geometry.setAttribute("strokedPathSegmentOrder", this.segments.orderAttribute)
    this.geometry = geometry
  }

  /**
   * Validates live segment references only when relevant layer revisions move.
   *
   * This is an upload-time resource gate rather than per-frame path planning.
   * It detects missing physical style slots before GPU submission while leaving
   * style-only color/width edits on their four-byte partial-upload path.
   */
  public validatePackedRecords(): void {
    const styleOwnershipVersion = this.styles.ownershipVersion
    const styleRecordVersion = this.styles.recordAttribute.version
    const segmentRecordVersion = this.segments.recordAttribute.version
    if (
      styleOwnershipVersion === this.validatedStyleOwnershipVersion
      && styleRecordVersion === this.validatedStyleRecordVersion
      && segmentRecordVersion === this.validatedSegmentRecordVersion
    ) return
    this.refreshRecordViews()

    const styleOwnershipChanged = styleOwnershipVersion !== this.validatedStyleOwnershipVersion
    const styleRecordsChanged = styleRecordVersion !== this.validatedStyleRecordVersion
    const styleRecordAttribute = this.styles.recordAttribute
    const requiresFullStyleValidation = styleOwnershipChanged
      || styleRecordAttribute.fullUpdateRequired
      || (styleRecordsChanged && styleRecordAttribute.updateRanges.length === 0)
    if (requiresFullStyleValidation) {
      for (let orderIndex = 0; orderIndex < this.styles.count; orderIndex += 1) {
        this.validateStyleSlot(this.styles.order[orderIndex]!)
      }
    } else if (styleRecordsChanged) {
      for (const range of styleRecordAttribute.updateRanges) {
        const first = Math.floor(range.offset / STROKED_PATH_STYLE_RECORD_BYTE_LENGTH)
        const last = Math.floor(
          (range.offset + range.count - 1) / STROKED_PATH_STYLE_RECORD_BYTE_LENGTH,
        )
        for (let slot = first; slot <= last; slot += 1) {
          if (this.styles.handleForSlot(slot) !== null) this.validateStyleSlot(slot)
        }
      }
    }

    const recordAttribute = this.segments.recordAttribute
    const requiresFullValidation = styleOwnershipChanged
      || recordAttribute.fullUpdateRequired
      || (
        segmentRecordVersion !== this.validatedSegmentRecordVersion
        && recordAttribute.updateRanges.length === 0
      )
    if (requiresFullValidation) {
      for (let orderIndex = 0; orderIndex < this.segments.count; orderIndex += 1) {
        this.validateSegmentSlot(this.segments.order[orderIndex]!)
      }
    } else if (segmentRecordVersion !== this.validatedSegmentRecordVersion) {
      for (const range of recordAttribute.updateRanges) {
        const first = Math.floor(range.offset / STROKED_PATH_SEGMENT_RECORD_BYTE_LENGTH)
        const last = Math.floor(
          (range.offset + range.count - 1) / STROKED_PATH_SEGMENT_RECORD_BYTE_LENGTH,
        )
        for (let slot = first; slot <= last; slot += 1) {
          if (this.segments.handleForSlot(slot) !== null) this.validateSegmentSlot(slot)
        }
      }
    }

    this.validatedStyleOwnershipVersion = styleOwnershipVersion
    this.validatedStyleRecordVersion = styleRecordVersion
    this.validatedSegmentRecordVersion = segmentRecordVersion
  }

  private validateStyleSlot(styleSlot: number): void {
    const offset = styleSlot * STROKED_PATH_STYLE_RECORD_WORDS
    for (let index = 0; index < 7; index += 1) {
      if (!Number.isFinite(this.styleFloats[offset + index])) {
        throw new RangeError(`StrokedPath style slot ${styleSlot} contains a non-finite value`)
      }
    }
    const alpha = this.styleFloats[offset + STROKED_PATH_STYLE_OFFSETS.color + 3]!
    const width = this.styleFloats[offset + STROKED_PATH_STYLE_OFFSETS.params]!
    const opacity = this.styleFloats[offset + STROKED_PATH_STYLE_OFFSETS.params + 1]!
    if (width <= 0) {
      throw new RangeError(`StrokedPath style slot ${styleSlot} width must be positive`)
    }
    if (alpha !== 1 || opacity !== 1) {
      throw new RangeError(
        `StrokedPath instanced style slot ${styleSlot} must be fully opaque`,
      )
    }
  }

  private validateSegmentSlot(segmentSlot: number): void {
    const wordOffset = segmentSlot * STROKED_PATH_SEGMENT_RECORD_WORDS
    for (let index = 0; index < 4; index += 1) {
      if (!Number.isFinite(this.segmentFloats[wordOffset + index])) {
        throw new RangeError(`StrokedPath segment slot ${segmentSlot} contains a non-finite endpoint`)
      }
    }
    if (
      this.segmentFloats[wordOffset] === this.segmentFloats[wordOffset + 2]
      && this.segmentFloats[wordOffset + 1] === this.segmentFloats[wordOffset + 3]
    ) {
      throw new RangeError(`StrokedPath segment slot ${segmentSlot} endpoints must be distinct`)
    }

    const styleSlot = this.segmentWords[wordOffset + STROKED_PATH_SEGMENT_OFFSETS.styleSlot]!
    const styleGeneration = this.segmentWords[
      wordOffset + STROKED_PATH_SEGMENT_OFFSETS.styleGeneration
    ]!
    const style = this.styles.handleForSlot(styleSlot)
    if (style === null || style.generation !== styleGeneration) {
      throw new Error(
        `StrokedPath segment slot ${segmentSlot} references stale style ${styleSlot}:${styleGeneration}`,
      )
    }
  }

  private refreshRecordViews(): void {
    const styleBytes = this.styles.records
    if (
      this.styleFloats.buffer !== styleBytes.buffer
      || this.styleFloats.byteOffset !== styleBytes.byteOffset
      || this.styleFloats.byteLength !== styleBytes.byteLength
    ) {
      this.styleFloats = new Float32Array(
        styleBytes.buffer,
        styleBytes.byteOffset,
        styleBytes.byteLength / Float32Array.BYTES_PER_ELEMENT,
      )
    }

    const segmentBytes = this.segments.records
    if (
      this.segmentFloats.buffer !== segmentBytes.buffer
      || this.segmentFloats.byteOffset !== segmentBytes.byteOffset
      || this.segmentFloats.byteLength !== segmentBytes.byteLength
    ) {
      this.segmentFloats = new Float32Array(
        segmentBytes.buffer,
        segmentBytes.byteOffset,
        segmentBytes.byteLength / Float32Array.BYTES_PER_ELEMENT,
      )
      this.segmentWords = new Uint32Array(
        segmentBytes.buffer,
        segmentBytes.byteOffset,
        segmentBytes.byteLength / Uint32Array.BYTES_PER_ELEMENT,
      )
    }
  }
}

/**
 * One draw-range view over a {@link StrokedPathInstanceLayer}.
 *
 * Several consecutive views may share one layer, unit quad and GPU storage.
 * Their inherited `Object3D.matrixWorld` is the one transform shared by every
 * segment in the run. Per-item transforms and consumer semantics are not part
 * of this Engine primitive.
 */
export class InstancedStrokedPath extends Object3D {
  public readonly isInstancedStrokedPath: true = true
  public readonly layer: StrokedPathInstanceLayer
  public firstInstance = 0
  public count = 0

  public constructor(
    layer: StrokedPathInstanceLayer,
    firstInstance = 0,
    count = layer.segments.count,
  ) {
    super()
    this.layer = layer
    this.renderLayer = "ui"
    this.frustumCulled = false
    this.setRange(firstInstance, count)
  }

  public get geometry(): BufferGeometry {
    return this.layer.geometry
  }

  public setRange(firstInstance: number, count: number): this {
    if (!Number.isInteger(firstInstance) || firstInstance < 0) {
      throw new RangeError(
        `InstancedStrokedPath firstInstance must be a non-negative integer, received ${firstInstance}`,
      )
    }
    if (!Number.isInteger(count) || count < 0) {
      throw new RangeError(
        `InstancedStrokedPath count must be a non-negative integer, received ${count}`,
      )
    }
    if (firstInstance + count > this.layer.segments.count) {
      throw new RangeError(
        `InstancedStrokedPath range [${firstInstance}, ${firstInstance + count}) exceeds segment count ${this.layer.segments.count}`,
      )
    }
    this.firstInstance = firstInstance
    this.count = count
    return this
  }
}
