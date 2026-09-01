import {
  STROKED_PATH_SEGMENT_OFFSETS,
  STROKED_PATH_SEGMENT_RECORD_BYTE_LENGTH,
  STROKED_PATH_STYLE_OFFSETS,
  STROKED_PATH_STYLE_RECORD_BYTE_LENGTH,
  StrokedPathInstanceLayer,
} from "../src/core/instanced-stroked-path"
import type {InstanceHandle} from "../src/core/instance-layer"

const CASES = [512, 2_048, 10_000] as const

type Percentiles = Readonly<{
  p50Ms: number
  p95Ms: number
  p99Ms: number
}>

const results = CASES.map(segmentCount => benchmarkCase(segmentCount))
console.log(JSON.stringify({
  runtime: `Bun ${Bun.version}`,
  platform: `${process.platform} ${process.arch}`,
  cases: results,
}, null, 2))

function benchmarkCase(segmentCount: number) {
  Bun.gc(true)
  const memoryBefore = process.memoryUsage()
  const initialStartedAt = performance.now()
  const layer = new StrokedPathInstanceLayer({
    initialStyleCapacity: segmentCount,
    maxStyleCapacity: segmentCount,
    initialSegmentCapacity: segmentCount,
    maxSegmentCapacity: segmentCount,
  })
  const styleTemplate = new Float32Array(STROKED_PATH_STYLE_RECORD_BYTE_LENGTH / 4)
  styleTemplate.set([0.3, 0.6, 0.9, 1], STROKED_PATH_STYLE_OFFSETS.color)
  styleTemplate.set([2.2, 1, 0, 0], STROKED_PATH_STYLE_OFFSETS.params)
  const segmentBytes = new Uint8Array(STROKED_PATH_SEGMENT_RECORD_BYTE_LENGTH)
  const segmentFloats = new Float32Array(segmentBytes.buffer)
  const segmentWords = new Uint32Array(segmentBytes.buffer)
  const styleHandles: InstanceHandle[] = new Array(segmentCount)
  const segmentHandles: InstanceHandle[] = new Array(segmentCount)
  for (let index = 0; index < segmentCount; index += 1) {
    const style = layer.styles.allocate(styleTemplate)
    styleHandles[index] = style
    segmentFloats.set([index, 0, index + 1, index & 1], STROKED_PATH_SEGMENT_OFFSETS.endpoints)
    segmentWords[STROKED_PATH_SEGMENT_OFFSETS.styleSlot] = style.slot
    segmentWords[STROKED_PATH_SEGMENT_OFFSETS.styleGeneration] = style.generation
    segmentHandles[index] = layer.segments.allocate(segmentBytes)
  }
  layer.validatePackedRecords()
  const initialMaterializationMs = performance.now() - initialStartedAt
  Bun.gc(true)
  const memoryAfter = process.memoryUsage()

  const selectedBlockSegments = Math.min(15, segmentCount)
  const selectedIndex = Math.floor((segmentCount - selectedBlockSegments) / 2)
  const selectedEndIndex = segmentCount - selectedBlockSegments
  const selectedStyle = styleHandles[selectedIndex]!
  const selectedSegment = segmentHandles[selectedIndex]!
  const iterations = segmentCount >= 10_000 ? 80 : 120
  let selectedLastActive = false
  const reorder = measure(iterations, () => {
    layer.segments.orderAttribute.clearUpdateRanges()
    layer.segments.moveRange(
      selectedLastActive ? selectedEndIndex : selectedIndex,
      selectedBlockSegments,
      selectedLastActive ? selectedIndex : selectedEndIndex,
    )
    selectedLastActive = !selectedLastActive
  })

  const widthValue = new Float32Array(1)
  const widthBytes = new Uint8Array(widthValue.buffer)
  let selectedWidth = false
  const styleUpdate = measure(iterations, () => {
    layer.styles.recordAttribute.clearUpdateRanges()
    widthValue[0] = selectedWidth ? 2.2 : 3.4
    selectedWidth = !selectedWidth
    layer.styles.updateRecord(
      selectedStyle,
      STROKED_PATH_STYLE_OFFSETS.params * Uint32Array.BYTES_PER_ELEMENT,
      widthBytes,
    )
    layer.validatePackedRecords()
  })

  const endpointValue = new Float32Array(4)
  const endpointBytes = new Uint8Array(endpointValue.buffer)
  let endpointShift = false
  const endpointUpdate = measure(iterations, () => {
    layer.segments.recordAttribute.clearUpdateRanges()
    endpointValue.set([
      selectedIndex,
      0,
      selectedIndex + 1,
      endpointShift ? 1 : 2,
    ])
    endpointShift = !endpointShift
    layer.segments.updateRecord(
      selectedSegment,
      STROKED_PATH_SEGMENT_OFFSETS.endpoints * Uint32Array.BYTES_PER_ELEMENT,
      endpointBytes,
    )
    layer.validatePackedRecords()
  })

  const stableFrame = measure(iterations, () => layer.validatePackedRecords())

  if (selectedLastActive) {
    layer.segments.moveRange(selectedEndIndex, selectedBlockSegments, selectedIndex)
  }
  layer.segments.orderAttribute.clearUpdateRanges()
  layer.segments.moveRange(selectedIndex, selectedBlockSegments, selectedEndIndex)
  const reorderUploadBytes = attributeRangeBytes(
    layer.segments.orderAttribute.updateRanges,
    Uint32Array.BYTES_PER_ELEMENT,
  )
  layer.styles.recordAttribute.clearUpdateRanges()
  layer.styles.updateRecord(
    selectedStyle,
    STROKED_PATH_STYLE_OFFSETS.params * Uint32Array.BYTES_PER_ELEMENT,
    widthBytes,
  )
  const styleUploadBytes = attributeRangeBytes(layer.styles.recordAttribute.updateRanges, 1)
  layer.segments.recordAttribute.clearUpdateRanges()
  layer.segments.updateRecord(selectedSegment, 0, endpointBytes)
  const endpointUploadBytes = attributeRangeBytes(layer.segments.recordAttribute.updateRanges, 1)

  return {
    segmentCount,
    styleCount: segmentCount,
    selectedBlockSegments,
    initialMaterializationMs,
    cpu: {reorder, styleUpdate, endpointUpdate, stableFrame},
    retainedCpuStorageBytes:
      layer.styles.recordAttribute.array.byteLength
      + layer.styles.orderAttribute.array.byteLength
      + layer.segments.recordAttribute.array.byteLength
      + layer.segments.orderAttribute.array.byteLength,
    heapUsedDeltaBytes: memoryAfter.heapUsed - memoryBefore.heapUsed,
    rssDeltaBytes: memoryAfter.rss - memoryBefore.rss,
    uploads: {
      selectedMiddleToLastOrderBytes: reorderUploadBytes,
      selectedStyleWidthBytes: styleUploadBytes,
      oneEndpointRecordBytes: endpointUploadBytes,
    },
    drawCallsPerRun: 1,
  }
}

function measure(iterations: number, action: () => void): Percentiles {
  for (let index = 0; index < 12; index += 1) action()
  const samples = new Float64Array(iterations)
  for (let index = 0; index < iterations; index += 1) {
    const startedAt = performance.now()
    action()
    samples[index] = performance.now() - startedAt
  }
  samples.sort()
  return {
    p50Ms: percentile(samples, 0.5),
    p95Ms: percentile(samples, 0.95),
    p99Ms: percentile(samples, 0.99),
  }
}

function percentile(samples: Float64Array, quantile: number): number {
  return samples[Math.min(samples.length - 1, Math.ceil(samples.length * quantile) - 1)]!
}

function attributeRangeBytes(
  ranges: readonly Readonly<{offset: number; count: number}>[],
  bytesPerElement: number,
): number {
  return ranges.reduce((total, range) => total + range.count * bytesPerElement, 0)
}
