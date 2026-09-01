import {describe, expect, test} from "bun:test"
import {
  InstancedStrokedPath,
  STROKED_PATH_SEGMENT_OFFSETS,
  STROKED_PATH_SEGMENT_RECORD_BYTE_LENGTH,
  STROKED_PATH_STYLE_OFFSETS,
  STROKED_PATH_STYLE_RECORD_BYTE_LENGTH,
  StrokedPathInstanceLayer,
} from "./instanced-stroked-path"

function styleRecord(value: number): Float32Array {
  const record = new Float32Array(STROKED_PATH_STYLE_RECORD_BYTE_LENGTH / 4)
  record.set([value, 0.2, 0.3, 1], STROKED_PATH_STYLE_OFFSETS.color)
  record.set([2.2, 1, 0.05, 0], STROKED_PATH_STYLE_OFFSETS.params)
  return record
}

function segmentRecord(
  style: Readonly<{slot: number; generation: number}>,
  endpoints: readonly [number, number, number, number],
): Uint8Array {
  const buffer = new ArrayBuffer(STROKED_PATH_SEGMENT_RECORD_BYTE_LENGTH)
  new Float32Array(buffer).set(endpoints, STROKED_PATH_SEGMENT_OFFSETS.endpoints)
  const words = new Uint32Array(buffer)
  words[STROKED_PATH_SEGMENT_OFFSETS.styleSlot] = style.slot
  words[STROKED_PATH_SEGMENT_OFFSETS.styleGeneration] = style.generation
  return new Uint8Array(buffer)
}

describe("InstancedStrokedPath", () => {
  test("shares one unit quad and independent stable style/segment slots across runs", () => {
    const layer = new StrokedPathInstanceLayer({
      initialStyleCapacity: 2,
      maxStyleCapacity: 2,
      initialSegmentCapacity: 3,
      maxSegmentCapacity: 3,
    })
    const ordinary = layer.styles.allocate(styleRecord(1))
    const selected = layer.styles.allocate(styleRecord(2))
    const first = layer.segments.allocate(segmentRecord(ordinary, [0, 0, 10, 0]))
    const second = layer.segments.allocate(segmentRecord(ordinary, [10, 0, 10, 10]))
    const third = layer.segments.allocate(segmentRecord(selected, [10, 10, 20, 10]))
    const ordinaryRun = new InstancedStrokedPath(layer, 0, 2)
    const selectedRun = new InstancedStrokedPath(layer, 2, 1)

    expect(ordinaryRun.geometry).toBe(selectedRun.geometry)
    expect(ordinaryRun.layer).toBe(selectedRun.layer)
    expect(ordinaryRun.renderLayer).toBe("ui")
    expect(ordinaryRun.frustumCulled).toBeFalse()
    expect(layer.styles.handleAt(0)).toBe(ordinary)
    expect(layer.styles.handleAt(1)).toBe(selected)
    expect(layer.segments.handleAt(0)).toBe(first)
    expect(layer.segments.handleAt(1)).toBe(second)
    expect(layer.segments.handleAt(2)).toBe(third)
    expect(layer.geometry.attributes.strokedPathStyleRecords).toBe(layer.styles.recordAttribute)
    expect(layer.geometry.attributes.strokedPathSegmentRecords).toBe(layer.segments.recordAttribute)
    expect(layer.geometry.attributes.strokedPathSegmentOrder).toBe(layer.segments.orderAttribute)
    expect(layer.geometry.attributes.position?.count).toBe(4)
    expect(layer.geometry.index?.count).toBe(6)

    const words = new Uint32Array(layer.segments.readRecord(third).buffer)
    expect(words[STROKED_PATH_SEGMENT_OFFSETS.styleSlot]).toBe(selected.slot)
    expect(words[STROKED_PATH_SEGMENT_OFFSETS.styleGeneration]).toBe(selected.generation)
  })

  test("tracks style-only and route-only partial record updates", () => {
    const layer = new StrokedPathInstanceLayer({
      initialStyleCapacity: 1,
      maxStyleCapacity: 1,
      initialSegmentCapacity: 1,
      maxSegmentCapacity: 1,
    })
    const style = layer.styles.allocate(styleRecord(1))
    const segment = layer.segments.allocate(segmentRecord(style, [0, 0, 10, 0]))
    layer.styles.recordAttribute.clearUpdateRanges()
    layer.segments.recordAttribute.clearUpdateRanges()

    layer.styles.updateRecord(
      style,
      STROKED_PATH_STYLE_OFFSETS.params * Uint32Array.BYTES_PER_ELEMENT,
      new Float32Array([3.4]),
    )
    layer.segments.updateRecord(
      segment,
      STROKED_PATH_SEGMENT_OFFSETS.endpoints * Uint32Array.BYTES_PER_ELEMENT,
      new Float32Array([0, 0, 12, 4]),
    )

    expect(layer.styles.recordAttribute.updateRanges).toEqual([{offset: 16, count: 4}])
    expect(layer.segments.recordAttribute.updateRanges).toEqual([{offset: 0, count: 16}])
  })

  test("keeps segment style references physical when dense style order changes", () => {
    const layer = new StrokedPathInstanceLayer({maxStyleCapacity: 2, maxSegmentCapacity: 1})
    const first = layer.styles.allocate(styleRecord(1))
    const second = layer.styles.allocate(styleRecord(2))
    const segment = layer.segments.allocate(segmentRecord(second, [0, 0, 10, 0]))

    layer.styles.move(second, 0)
    layer.validatePackedRecords()

    expect(layer.styles.handleAt(0)).toBe(second)
    expect(layer.styles.handleAt(1)).toBe(first)
    expect(
      new Uint32Array(layer.segments.readRecord(segment).buffer)[
        STROKED_PATH_SEGMENT_OFFSETS.styleSlot
      ],
    ).toBe(second.slot)
  })

  test("validates draw ranges against live dense segment order", () => {
    const layer = new StrokedPathInstanceLayer({maxStyleCapacity: 1, maxSegmentCapacity: 2})
    const style = layer.styles.allocate(styleRecord(1))
    layer.segments.allocate(segmentRecord(style, [0, 0, 10, 0]))
    const run = new InstancedStrokedPath(layer)

    expect(run).toMatchObject({firstInstance: 0, count: 1})
    expect(() => run.setRange(-1, 1)).toThrow("non-negative integer")
    expect(() => run.setRange(0, 2)).toThrow("exceeds segment count")
    layer.segments.allocate(segmentRecord(style, [10, 0, 20, 0]))
    expect(run.setRange(1, 1)).toBe(run)
  })

  test("validates physical style references only when ownership revisions change", () => {
    const layer = new StrokedPathInstanceLayer({maxStyleCapacity: 2, maxSegmentCapacity: 2})
    const style = layer.styles.allocate(styleRecord(1))
    const segment = layer.segments.allocate(segmentRecord(style, [0, 0, 10, 0]))

    expect(() => layer.validatePackedRecords()).not.toThrow()
    layer.styles.updateRecord(style, 0, new Float32Array([0.5]))
    expect(() => layer.validatePackedRecords()).not.toThrow()

    layer.styles.remove(style)
    const replacement = layer.styles.allocate(styleRecord(2))
    expect(replacement.slot).toBe(style.slot)
    expect(replacement.generation).toBe(style.generation + 1)
    expect(() => layer.validatePackedRecords()).toThrow(
      `segment slot ${segment.slot} references stale style ${style.slot}:${style.generation}`,
    )
  })

  test("rejects non-finite records and translucent styles before submission", () => {
    const layer = new StrokedPathInstanceLayer({maxStyleCapacity: 2, maxSegmentCapacity: 1})
    const translucentRecord = styleRecord(1)
    translucentRecord[STROKED_PATH_STYLE_OFFSETS.color + 3] = 0.5
    const translucent = layer.styles.allocate(translucentRecord)
    layer.segments.allocate(segmentRecord(translucent, [0, 0, 10, 0]))
    expect(() => layer.validatePackedRecords()).toThrow("must be fully opaque")

    layer.styles.setRecord(translucent, styleRecord(1))
    const segment = layer.segments.handleAt(0)
    layer.segments.setRecord(segment, segmentRecord(translucent, [0, 0, Number.NaN, 0]))
    expect(() => layer.validatePackedRecords()).toThrow("non-finite endpoint")
  })
})
