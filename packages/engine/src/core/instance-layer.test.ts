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
    expect(firstLayer.handleForSlot(first.slot)).toBe(first)
    expect(firstLayer.handleForSlot(-1)).toBeNull()
    expect(firstLayer.orderIndexOf(first)).toBe(0)
    expect(() => firstLayer.orderIndexOf(copied)).toThrow("stale or invalid")
    expect(() => firstLayer.orderIndexOf(foreign)).toThrow("stale or invalid")
  })

  test("exposes only the canonical live generation for a physical slot", () => {
    const layer = new InstanceLayer({recordByteLength: 8, initialCapacity: 1, maxCapacity: 1})
    const first = layer.allocate(record(1, 2))
    expect(layer.handleForSlot(first.slot)).toBe(first)

    layer.remove(first)
    expect(layer.handleForSlot(first.slot)).toBeNull()
    expect(() => layer.orderIndexOf(first)).toThrow("stale or invalid")
    const second = layer.allocate(record(3, 4))
    expect(second.slot).toBe(first.slot)
    expect(second.generation).toBe(first.generation + 1)
    expect(layer.handleForSlot(second.slot)).toBe(second)
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

  test("replaces a complete dense order once without moving physical records", () => {
    const layer = new InstanceLayer({recordByteLength: 8, initialCapacity: 5, maxCapacity: 5})
    const handles = [0, 1, 2, 3, 4].map(value => layer.allocate(record(value, value)))
    const ownershipVersion = layer.ownershipVersion
    layer.orderAttribute.clearUpdateRanges()

    layer.setOrder([handles[0]!, handles[1]!, handles[3]!, handles[4]!, handles[2]!])

    expect(Array.from({length: 5}, (_, index) => layer.handleAt(index))).toEqual([
      handles[0]!, handles[1]!, handles[3]!, handles[4]!, handles[2]!,
    ])
    expect(layer.orderAttribute.updateRanges).toEqual([{offset: 2, count: 3}])
    expect(layer.ownershipVersion).toBe(ownershipVersion)
    expect(new Uint32Array(layer.readRecord(handles[2]!).buffer)).toEqual(record(2, 2))

    layer.orderAttribute.clearUpdateRanges()
    layer.setOrder([handles[0]!, handles[1]!, handles[3]!, handles[4]!, handles[2]!])
    expect(layer.orderAttribute.needsUpdate).toBeFalse()
  })

  test("keeps bulk reorder atomic for stale, foreign, duplicate and incomplete input", () => {
    const layer = new InstanceLayer({recordByteLength: 8, initialCapacity: 3, maxCapacity: 3})
    const handles = [0, 1, 2].map(value => layer.allocate(record(value, value)))
    const foreignLayer = new InstanceLayer({recordByteLength: 8, initialCapacity: 1, maxCapacity: 1})
    const foreign = foreignLayer.allocate(record(9, 9))
    layer.orderAttribute.clearUpdateRanges()
    const original = Array.from({length: 3}, (_, index) => layer.handleAt(index))

    expect(() => layer.setOrder([handles[0]!, handles[1]!])).toThrow("expected 3")
    expect(() => layer.setOrder([handles[0]!, handles[0]!, handles[2]!])).toThrow("duplicate")
    expect(() => layer.setOrder([handles[0]!, foreign, handles[2]!])).toThrow("stale or foreign")
    layer.remove(handles[1]!)
    expect(() => layer.setOrder([handles[0]!, handles[1]!])).toThrow("stale or foreign")

    expect(layer.handleAt(0)).toBe(original[0]!)
    expect(layer.handleAt(1)).toBe(original[2]!)
  })

  test("increments ownership only for allocation and release lifecycle", () => {
    const layer = new InstanceLayer({recordByteLength: 8, initialCapacity: 2, maxCapacity: 2})
    expect(layer.ownershipVersion).toBe(0)
    const first = layer.allocate(record(1, 1))
    const second = layer.allocate(record(2, 2))
    expect(layer.ownershipVersion).toBe(2)

    layer.setRecord(first, record(3, 3))
    layer.move(first, 1)
    layer.setOrder([second, first])
    expect(layer.ownershipVersion).toBe(2)
    layer.remove(first)
    expect(layer.ownershipVersion).toBe(3)
    layer.clear()
    expect(layer.ownershipVersion).toBe(4)
  })

  test("moves one middle item paint-last in a ten-thousand-item order with one range", () => {
    const count = 10_000
    const layer = new InstanceLayer({recordByteLength: 8, initialCapacity: count, maxCapacity: count})
    const handles = Array.from({length: count}, (_, value) => layer.allocate(record(value, value)))
    const selectedIndex = count / 2
    const selected = handles[selectedIndex]!
    const next = [
      ...handles.slice(0, selectedIndex),
      ...handles.slice(selectedIndex + 1),
      selected,
    ]
    const ownershipVersion = layer.ownershipVersion
    layer.orderAttribute.clearUpdateRanges()

    layer.setOrder(next)

    expect(layer.handleAt(count - 1)).toBe(selected)
    expect(layer.orderAttribute.updateRanges).toEqual([{
      offset: selectedIndex,
      count: count - selectedIndex,
    }])
    expect(layer.ownershipVersion).toBe(ownershipVersion)
  })

  test("moves one fifteen-record path block across a 30,720-record order", () => {
    const total = 30_720
    const blockCount = 15
    const middle = total / 2
    const end = total - blockCount
    const layer = new InstanceLayer({recordByteLength: 8, initialCapacity: total, maxCapacity: total})
    const handles = Array.from({length: total}, (_, value) => layer.allocate(record(value, value)))
    const block = handles.slice(middle, middle + blockCount)
    const blockRecords = block.map(handle => layer.readRecord(handle))
    const ownershipVersion = layer.ownershipVersion
    layer.orderAttribute.clearUpdateRanges()
    expect(layer.orderIndexOf(block[0]!)).toBe(middle)
    expect(layer.orderIndexOf(block.at(-1)!)).toBe(middle + blockCount - 1)

    layer.moveRange(middle, blockCount, end)

    expect(Array.from({length: blockCount}, (_, offset) => layer.handleAt(end + offset)))
      .toEqual(block)
    expect(layer.orderAttribute.updateRanges).toEqual([{
      offset: middle,
      count: total - middle,
    }])
    expect(layer.ownershipVersion).toBe(ownershipVersion)
    expect(layer.orderIndexOf(block[0]!)).toBe(end)
    expect(layer.orderIndexOf(block.at(-1)!)).toBe(end + blockCount - 1)
    for (let index = 0; index < blockCount; index += 1) {
      const handle = block[index]!
      expect(layer.handleForSlot(handle.slot)).toBe(handle)
      expect(layer.readRecord(handle)).toEqual(blockRecords[index]!)
    }

    layer.orderAttribute.clearUpdateRanges()
    layer.moveRange(end, blockCount, middle)
    expect(Array.from({length: blockCount}, (_, offset) => layer.handleAt(middle + offset)))
      .toEqual(block)
    expect(layer.orderAttribute.updateRanges).toEqual([{
      offset: middle,
      count: total - middle,
    }])
    expect(layer.ownershipVersion).toBe(ownershipVersion)
    expect(layer.orderIndexOf(block[0]!)).toBe(middle)
    expect(layer.orderIndexOf(block.at(-1)!)).toBe(middle + blockCount - 1)

    layer.orderAttribute.clearUpdateRanges()
    layer.moveRange(middle, blockCount, middle)
    expect(layer.orderAttribute.needsUpdate).toBeFalse()
    expect(layer.ownershipVersion).toBe(ownershipVersion)
  })

  test("keeps moveRange atomic for invalid source and final bounds", () => {
    const layer = new InstanceLayer({recordByteLength: 8, initialCapacity: 5, maxCapacity: 5})
    const handles = [0, 1, 2, 3, 4].map(value => layer.allocate(record(value, value)))
    const ownershipVersion = layer.ownershipVersion
    const order = Array.from({length: 5}, (_, index) => layer.handleAt(index))
    layer.orderAttribute.clearUpdateRanges()

    expect(() => layer.moveRange(-1, 1, 0)).toThrow("firstIndex")
    expect(() => layer.moveRange(0, 0, 0)).toThrow("positive integer")
    expect(() => layer.moveRange(4, 2, 0)).toThrow("source")
    expect(() => layer.moveRange(0, 2, 4)).toThrow("final range")
    expect(() => layer.moveRange(0.5, 1, 0)).toThrow("firstIndex")
    expect(() => layer.moveRange(0, 1, 0.5)).toThrow("final range")

    expect(Array.from({length: 5}, (_, index) => layer.handleAt(index))).toEqual(order)
    expect(layer.orderAttribute.needsUpdate).toBeFalse()
    expect(layer.ownershipVersion).toBe(ownershipVersion)
    for (const handle of handles) expect(layer.handleForSlot(handle.slot)).toBe(handle)
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
