import {describe, expect, test} from "bun:test"
import {InstanceLayer} from "./instance-layer"

function record(a: number, b: number): Uint32Array {
  return new Uint32Array([a, b])
}

describe("InstanceLayer", () => {
  test("reuses stable slots with a new generation and rejects stale handles", () => {
    const layer = new InstanceLayer({recordByteLength: 8, initialCapacity: 2, maxCapacity: 2})
    const first = layer.allocate(record(1, 2))
    const second = layer.allocate(record(3, 4))
    layer.remove(first)
    const reused = layer.allocate(record(5, 6))

    expect(reused.slot).toBe(first.slot)
    expect(reused.generation).toBe(first.generation + 1)
    expect(layer.has(first)).toBe(false)
    expect(layer.has(second)).toBe(true)
    expect(() => layer.setRecord(first, record(7, 8))).toThrow("stale or invalid")
    expect([...layer.readRecord(reused)]).toEqual([...new Uint8Array(record(5, 6).buffer)])
  })

  test("rejects copied and foreign handles even when slot and generation match", () => {
    const firstLayer = new InstanceLayer({recordByteLength: 8, initialCapacity: 1, maxCapacity: 1})
    const secondLayer = new InstanceLayer({recordByteLength: 8, initialCapacity: 1, maxCapacity: 1})
    const first = firstLayer.allocate(record(1, 2))
    const foreign = secondLayer.allocate(record(3, 4))
    const copied = {slot: first.slot, generation: first.generation}

    expect(firstLayer.has(copied)).toBe(false)
    expect(firstLayer.has(foreign)).toBe(false)
    expect(() => firstLayer.setRecord(copied, record(5, 6))).toThrow("stale or invalid")
    expect(firstLayer.handleAt(0)).toBe(first)
  })

  test("grows geometrically while preserving records, handles and order", () => {
    const layer = new InstanceLayer({recordByteLength: 8, initialCapacity: 2, maxCapacity: 8})
    const first = layer.allocate(record(10, 11))
    const second = layer.allocate(record(20, 21))
    layer.recordAttribute.clearUpdateRanges()
    layer.orderAttribute.clearUpdateRanges()

    const third = layer.allocate(record(30, 31))

    expect(layer.capacity).toBe(4)
    expect(layer.recordAttribute.fullUpdateRequired).toBe(true)
    expect(layer.orderAttribute.fullUpdateRequired).toBe(true)
    expect(layer.handleAt(0)).toBe(first)
    expect(layer.handleAt(1)).toBe(second)
    expect(layer.handleAt(2)).toBe(third)
    expect(new Uint32Array(layer.readRecord(first).buffer)).toEqual(record(10, 11))
  })

  test("keeps physical slots separate from mutable dense order", () => {
    const layer = new InstanceLayer({recordByteLength: 8, initialCapacity: 4, maxCapacity: 4})
    const first = layer.allocate(record(1, 1))
    const second = layer.allocate(record(2, 2))
    const third = layer.allocate(record(3, 3))
    layer.orderAttribute.clearUpdateRanges()

    layer.move(third, 0)

    expect(layer.handleAt(0)).toBe(third)
    expect(layer.handleAt(1)).toBe(first)
    expect(layer.handleAt(2)).toBe(second)
    expect(layer.orderAttribute.updateRanges).toEqual([{offset: 0, count: 3}])

    layer.orderAttribute.clearUpdateRanges()
    layer.remove(first)
    expect(layer.count).toBe(2)
    expect(layer.handleAt(0)).toBe(third)
    expect(layer.handleAt(1)).toBe(second)
    expect(layer.orderAttribute.updateRanges).toEqual([{offset: 1, count: 2}])
  })

  test("tracks the exact byte interval changed inside one opaque record", () => {
    const layer = new InstanceLayer({recordByteLength: 16, initialCapacity: 2, maxCapacity: 2})
    const handle = layer.allocate(new Uint8Array(16))
    layer.recordAttribute.clearUpdateRanges()

    layer.updateRecord(handle, 5, new Uint8Array([7, 8]))
    layer.updateRecord(handle, 7, new Uint8Array([9]))

    expect(layer.recordAttribute.updateRanges).toEqual([{offset: 5, count: 3}])
    expect(() => layer.updateRecord(handle, 15, new Uint16Array([1]))).toThrow(RangeError)
  })

  test("fails at the explicit owner capacity bound", () => {
    const layer = new InstanceLayer({recordByteLength: 4, initialCapacity: 1, maxCapacity: 2})
    layer.allocate(new Uint32Array([1]))
    layer.allocate(new Uint32Array([2]))

    expect(() => layer.allocate(new Uint32Array([3]))).toThrow("exceeds maxCapacity")
  })

  test("keeps allocation atomic when record or order validation fails", () => {
    const layer = new InstanceLayer({recordByteLength: 8, initialCapacity: 1, maxCapacity: 1})

    expect(() => layer.allocate(new Uint32Array([1]))).toThrow("expected 8")
    expect(() => layer.allocate(record(1, 2), 1)).toThrow("outside [0, 0]")
    expect(layer.count).toBe(0)
    expect(layer.recordAttribute.needsUpdate).toBe(false)
    expect(layer.orderAttribute.needsUpdate).toBe(false)

    const first = layer.allocate(record(3, 4))
    expect(first).toMatchObject({slot: 0, generation: 1})
  })

  test("requires an explicit bound and supports lazy zero-capacity storage", () => {
    expect(() => new InstanceLayer({recordByteLength: 4} as never)).toThrow(
      "maxCapacity must be a positive integer",
    )

    const bounded = new InstanceLayer({recordByteLength: 4, maxCapacity: 2})
    expect(bounded.capacity).toBe(2)

    const lazy = new InstanceLayer({recordByteLength: 4, initialCapacity: 0, maxCapacity: 2})
    expect(lazy.capacity).toBe(0)
    lazy.allocate(new Uint32Array([1]))
    expect(lazy.capacity).toBe(1)
  })
})
