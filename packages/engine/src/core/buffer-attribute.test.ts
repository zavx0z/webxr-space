import {describe, expect, test} from "bun:test"
import {BufferAttribute} from "./buffer-attribute"

describe("BufferAttribute dirty ranges", () => {
  test("validates and coalesces overlapping or adjacent element intervals", () => {
    const attribute = new BufferAttribute(new Float32Array(32), 4)

    attribute.addUpdateRange(12, 4)
    attribute.addUpdateRange(4, 4)
    attribute.addUpdateRange(7, 6)
    attribute.addUpdateRange(24, 2)

    expect(attribute.needsUpdate).toBe(true)
    expect(attribute.version).toBe(4)
    expect(attribute.updateBaseVersion).toBe(0)
    expect(attribute.fullUpdateRequired).toBe(false)
    expect(attribute.updateRanges).toEqual([
      {offset: 4, count: 12},
      {offset: 24, count: 2},
    ])

    expect(() => attribute.addUpdateRange(-1, 1)).toThrow(RangeError)
    expect(() => attribute.addUpdateRange(0, 0)).toThrow(RangeError)
    expect(() => attribute.addUpdateRange(31, 2)).toThrow(RangeError)
  })

  test("keeps the full-update compatibility flag and explicit acknowledge lifecycle", () => {
    const attribute = new BufferAttribute(new Uint32Array(8), 2)
    attribute.addUpdateRange(2, 2)
    attribute.needsUpdate = true

    expect(attribute.fullUpdateRequired).toBe(true)
    expect(attribute.updateRanges).toEqual([])

    attribute.addUpdateRange(6, 2)
    expect(attribute.updateRanges).toEqual([])
    expect(attribute.version).toBe(3)

    attribute.needsUpdate = false
    expect(attribute.needsUpdate).toBe(false)
    expect(attribute.version).toBe(3)
    expect(attribute.updateBaseVersion).toBe(3)
  })

  test("marks replacement storage for a full upload and derives its new count", () => {
    const attribute = new BufferAttribute(new Uint8Array(8), 4)
    attribute.array = new Uint8Array(16)

    expect(attribute.count).toBe(4)
    expect(attribute.version).toBe(1)
    expect(attribute.fullUpdateRequired).toBe(true)
    expect(() => {
      attribute.array = new Uint8Array(15)
    }).toThrow(RangeError)
  })

  test("promotes excessively fragmented mutations to one bounded full upload", () => {
    const attribute = new BufferAttribute(new Uint8Array(130), 1)

    for (let index = 0; index < 65; index++) {
      attribute.addUpdateRange(index * 2, 1)
    }

    expect(attribute.version).toBe(65)
    expect(attribute.fullUpdateRequired).toBe(true)
    expect(attribute.updateRanges).toEqual([])
  })
})
