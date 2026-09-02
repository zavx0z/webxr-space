import {describe, expect, test} from "bun:test"
import {
  InstancedRoundedRect,
  ROUNDED_RECT_INSTANCE_RECORD_BYTE_LENGTH,
  RoundedRectInstanceLayer,
} from "./instanced-rounded-rect"

const record = (value: number): Float32Array => {
  const data = new Float32Array(ROUNDED_RECT_INSTANCE_RECORD_BYTE_LENGTH / 4)
  data[0] = value
  return data
}

describe("InstancedRoundedRect", () => {
  test("shares one unit quad and stable InstanceLayer across draw runs", () => {
    const layer = new RoundedRectInstanceLayer({initialCapacity: 0, maxCapacity: 8})
    const first = layer.instances.allocate(record(1))
    const second = layer.instances.allocate(record(2))
    const leftRun = new InstancedRoundedRect(layer, 0, 1)
    const rightRun = new InstancedRoundedRect(layer, 1, 1)

    expect(leftRun.geometry).toBe(rightRun.geometry)
    expect(leftRun.layer).toBe(rightRun.layer)
    expect(leftRun.renderLayer).toBe("ui")
    expect(leftRun.frustumCulled).toBeFalse()
    expect(layer.instances.handleAt(0)).toBe(first)
    expect(layer.instances.handleAt(1)).toBe(second)
    expect(layer.geometry.attributes.roundedRectRecords).toBe(layer.instances.recordAttribute)
    expect(layer.geometry.attributes.roundedRectOrder).toBe(layer.instances.orderAttribute)
    expect(layer.geometry.attributes.position?.count).toBe(4)
    expect(layer.geometry.index?.count).toBe(6)
  })

  test("validates draw ranges against the live dense order", () => {
    const layer = new RoundedRectInstanceLayer({initialCapacity: 2, maxCapacity: 2})
    layer.instances.allocate(record(1))
    const run = new InstancedRoundedRect(layer)

    expect(run).toMatchObject({firstInstance: 0, count: 1})
    expect(() => run.setRange(-1, 1)).toThrow("non-negative integer")
    expect(() => run.setRange(0, 2)).toThrow("exceeds layer count")
    layer.instances.allocate(record(2))
    expect(run.setRange(1, 1)).toBe(run)
  })
})
