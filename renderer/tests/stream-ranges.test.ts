import {expect, test} from "bun:test"
import {concatenateImmutableArrays, readImmutableArrayEntry, sliceImmutableArray} from "../src/immutable-array.ts"
import {projectArray} from "../src/projected-collections.ts"

test("thousands of retained ranges concatenate without materializing their translated records", () => {
  let projected = 0
  const parts = Array.from({length: 5000}, (_, block) => projectArray(Object.freeze([{block, index: 0}, {block, index: 1}]), 0, 2,
    item => { projected++; return Object.freeze({...item, moved: true}) }))
  const joined = concatenateImmutableArrays(parts)
  expect(Array.isArray(joined)).toBe(true)
  expect(joined).toHaveLength(10000)
  expect(projected).toBe(0)
  expect(readImmutableArrayEntry(joined, 8001)).toMatchObject({block: 4000, index: 1, moved: true})
  expect(projected).toBe(1)
  expect(joined[8001]).toBe(joined[8001])
  expect(projected).toBe(1)
  expect(() => { (joined as unknown[])[0] = null }).toThrow()
})

test("slice and splice preserve old snapshots and flatten repeated head trims", () => {
  const original = Object.freeze(Array.from({length: 10000}, (_, index) => Object.freeze({index})))
  let current: readonly Readonly<{index: number}>[] = original
  for (let index = 0; index < 2000; index++) current = sliceImmutableArray(current, 1)
  expect(current).toHaveLength(8000)
  expect(current[0]).toBe(original[2000])
  const next = concatenateImmutableArrays([sliceImmutableArray(current, 1), [Object.freeze({index: 10000})]])
  expect(next).toHaveLength(8000)
  expect(next[0]).toBe(original[2001])
  expect(next.at(-1)?.index).toBe(10000)
  expect(original[0]?.index).toBe(0)
  expect(current[0]?.index).toBe(2000)
  expect(() => sliceImmutableArray(current, -1)).toThrow(RangeError)
})
